// pages/api/case/start.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (xf) return String(xf).split(",")[0].trim();
  return req.socket?.remoteAddress || null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { meetingId, participantName, role, mode } = req.body || {};

    if (!meetingId || typeof meetingId !== "string") {
      return res.status(400).json({ error: "meetingId é obrigatório." });
    }

    const caseId = crypto.randomUUID();
    const casesDir = path.join(process.cwd(), "cases");
    if (!fs.existsSync(casesDir)) fs.mkdirSync(casesDir, { recursive: true });

    const payload = {
      serverEvidence: {
        caseId,
        meetingId, // ✅ aqui fica correto agora
        mode: mode || (role === "creator" ? "create" : "join"),
        role: role || null,
        participantName: participantName || null,
        createdAt: new Date().toISOString(),
        ip: getClientIp(req),
        userAgent: req.headers["user-agent"] || null,
        acceptLanguage: req.headers["accept-language"] || null,
        host: req.headers["host"] || null,
      },
      clientEvidence: [],
    };

    fs.writeFileSync(
      path.join(casesDir, `${caseId}.json`),
      JSON.stringify(payload, null, 2),
      "utf-8"
    );

    return res.status(200).json({ ok: true, caseId });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
