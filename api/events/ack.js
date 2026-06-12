import { json, readBody, requireSecret, ackEvents } from "../_lib.js";

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      json(res, 200, { ok: true });
      return;
    }

    if (req.method !== "POST") {
      json(res, 405, { ok: false, error: "method_not_allowed" });
      return;
    }

    if (!requireSecret(req, res)) {
      return;
    }

    const body = await readBody(req);
    await ackEvents(body.hostId || req.headers["x-tikfinity-dayz-host-id"] || "default", body.ids || []);
    json(res, 200, { ok: true, acked: body.ids || [] });
  } catch (error) {
    json(res, 500, { ok: false, error: error.message });
  }
}
