// pages/api/case/evidence.js
const fs = require("fs");
const path = require("path");

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { caseId, evidence } = req.body || {};
    if (!caseId || typeof caseId !== "string") {
      return res.status(400).json({ error: "caseId é obrigatório." });
    }
    if (!evidence || typeof evidence !== "object") {
      return res.status(400).json({ error: "evidence é obrigatório." });
    }

    const filePath = path.join(process.cwd(), "cases", `${caseId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Case não encontrado." });
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw);

    if (!Array.isArray(json.clientEvidence)) json.clientEvidence = [];

    json.clientEvidence.push({
      receivedAt: new Date().toISOString(),
      data: evidence,
    });

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf-8");

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
