import { json, readBody, requireSecret, pushEvent, listEvents } from "./_lib.js";

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      json(res, 200, { ok: true });
      return;
    }

    if (!requireSecret(req, res)) {
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const event = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        hostId: body.hostId || req.headers["x-tikfinity-dayz-host-id"] || "default",
        kind: body.kind || "gift",
        payload: body.payload || body,
        from: body.from || "bridge",
        sentAt: body.sentAt || new Date().toISOString()
      };

      await pushEvent(event.hostId, event);
      json(res, 200, { ok: true, eventId: event.id });
      return;
    }

    if (req.method === "GET") {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const hostId = url.searchParams.get("hostId") || req.headers["x-tikfinity-dayz-host-id"] || "default";
      const limit = Number(url.searchParams.get("limit") || 25);
      const events = await listEvents(hostId, Math.max(1, Math.min(limit, 100)));
      json(res, 200, { ok: true, events });
      return;
    }

    json(res, 405, { ok: false, error: "method_not_allowed" });
  } catch (error) {
    json(res, 500, { ok: false, error: error.message });
  }
}
