import { kv } from "@vercel/kv";
import { createClient } from "redis";

const memoryQueues = globalThis.__tikfinityDayzQueues || new Map();
globalThis.__tikfinityDayzQueues = memoryQueues;
let redisClientPromise = globalThis.__tikfinityDayzRedisClientPromise || null;

function hasKvStorage() {
  return Boolean(process.env.KV_REST_API_URL);
}

function hasRedisStorage() {
  return Boolean(process.env.REDIS_URL);
}

async function getRedisClient() {
  if (!redisClientPromise) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on("error", error => {
      console.error("Redis error", error);
    });
    redisClientPromise = client.connect().then(() => client);
    globalThis.__tikfinityDayzRedisClientPromise = redisClientPromise;
  }

  return redisClientPromise;
}

export function storageName() {
  if (hasKvStorage()) {
    return "vercel-kv";
  }

  if (hasRedisStorage()) {
    return "redis";
  }

  return "memory";
}

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "*");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.end(JSON.stringify(body, null, 2));
}

export async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1024 * 1024) {
      throw new Error("Request body too large");
    }
  }
  return body ? JSON.parse(body) : {};
}

export function requireSecret(req, res) {
  const expected = process.env.RELAY_SECRET || "";
  if (!expected) {
    return true;
  }

  const provided =
    req.headers["x-tikfinity-dayz-secret"] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
    "";

  if (provided !== expected) {
    json(res, 401, { ok: false, error: "invalid_secret" });
    return false;
  }

  return true;
}

export function keyFor(hostId) {
  return `queue:${hostId || process.env.RELAY_HOST_ID || "default"}`;
}

export async function pushEvent(hostId, event) {
  const key = keyFor(hostId);
  const item = JSON.stringify(event);

  if (hasKvStorage()) {
    await kv.rpush(key, item);
    return;
  }

  if (hasRedisStorage()) {
    const redis = await getRedisClient();
    await redis.rPush(key, item);
    return;
  }

  const queue = memoryQueues.get(key) || [];
  queue.push(item);
  memoryQueues.set(key, queue);
}

export async function listEvents(hostId, limit = 25) {
  const key = keyFor(hostId);

  if (hasKvStorage()) {
    const items = await kv.lrange(key, 0, Math.max(0, limit - 1));
    return items.map(item => (typeof item === "string" ? JSON.parse(item) : item));
  }

  if (hasRedisStorage()) {
    const redis = await getRedisClient();
    const items = await redis.lRange(key, 0, Math.max(0, limit - 1));
    return items.map(item => (typeof item === "string" ? JSON.parse(item) : item));
  }

  const queue = memoryQueues.get(key) || [];
  return queue.slice(0, limit).map(item => JSON.parse(item));
}

export async function ackEvents(hostId, ids = []) {
  const key = keyFor(hostId);
  const idSet = new Set(ids);

  if (hasKvStorage()) {
    const items = await kv.lrange(key, 0, -1);
    const kept = items.filter(item => {
      const event = typeof item === "string" ? JSON.parse(item) : item;
      return !idSet.has(event.id);
    });
    await kv.del(key);
    if (kept.length > 0) {
      await kv.rpush(key, ...kept.map(item => (typeof item === "string" ? item : JSON.stringify(item))));
    }
    return;
  }

  if (hasRedisStorage()) {
    const redis = await getRedisClient();
    const items = await redis.lRange(key, 0, -1);
    const kept = items.filter(item => {
      const event = typeof item === "string" ? JSON.parse(item) : item;
      return !idSet.has(event.id);
    });
    await redis.del(key);
    if (kept.length > 0) {
      await redis.rPush(key, kept.map(item => (typeof item === "string" ? item : JSON.stringify(item))));
    }
    return;
  }

  const queue = memoryQueues.get(key) || [];
  memoryQueues.set(
    key,
    queue.filter(item => !idSet.has(JSON.parse(item).id))
  );
}
