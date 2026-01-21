import jwt from "jsonwebtoken";

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { VIDEOSDK_API_KEY, VIDEOSDK_SECRET } = process.env;

  if (!VIDEOSDK_API_KEY || !VIDEOSDK_SECRET) {
    return res.status(500).json({ error: "Missing VIDEOSDK_API_KEY / VIDEOSDK_SECRET" });
  }

  const payload = {
    apikey: VIDEOSDK_API_KEY,
    permissions: ["allow_join"],
  };

  const token = jwt.sign(payload, VIDEOSDK_SECRET, { expiresIn: "10m" });
  return res.status(200).json({ token });
}
