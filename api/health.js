import { json, storageName } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    json(res, 200, { ok: true });
    return;
  }

  json(res, 200, {
    ok: true,
    name: "TikFinity DayZ Vercel Relay",
    storage: storageName(),
    hostId: process.env.RELAY_HOST_ID || "default"
  });
}
