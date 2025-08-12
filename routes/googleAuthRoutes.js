import express from "express";
import { createOAuth2Client, saveTokens, loadTokens, getAuthedOAuth2 } from "../lib/googleOAuth.js";

const router = express.Router();

function requireKey(req, res, next) {
  const k = req.headers["x-api-key"];
  if (!process.env.SYNC_API_KEY || k !== process.env.SYNC_API_KEY) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Start OAuth: returns consent URL (client opens it)
router.get("/google/auth", requireKey, (req, res) => {
  const client = createOAuth2Client();
  const scopeList = (process.env.GOOGLE_OAUTH_SCOPES || "https://www.googleapis.com/auth/adwords")
    .split(/\s+/)
    .filter(Boolean);

  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // ensure refresh_token on first grant
    scope: scopeList
  });
  res.json({ url });
});

// OAuth callback
router.get("/google/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code");

  try {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);
    await saveTokens(tokens, "default");

    // Optional: show a friendly HTML
    res.send("<html><body><h3>Google connected. You can close this tab.</h3></body></html>");
  } catch (e) {
    console.error("Google OAuth callback error:", e);
    res.status(500).send("Auth error");
  }
});

// Connection status
router.get("/google/status", requireKey, async (req, res) => {
  const row = await loadTokens("default");
  if (!row) return res.json({ connected: false });

  res.json({
    connected: true,
    scope: row.scope,
    expiry_date: row.expiry_date,
  });
});

// Example: quick token check/refresh
router.post("/google/refresh", requireKey, async (req, res) => {
  try {
    await getAuthedOAuth2("default");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
