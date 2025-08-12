import { google } from "googleapis";
import { pool } from "./db.js";

function redirectUri() {
  const dev = process.env.GOOGLE_REDIRECT_URI_DEV;
  const prod = process.env.GOOGLE_REDIRECT_URI;
  return process.env.NODE_ENV === "development" ? (dev || prod) : prod;
}

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri()
  );
}

export async function saveTokens(tokens, subject = "default") {
  // tokens: { access_token, refresh_token, scope, token_type, expiry_date }
  const expiry = tokens.expiry_date
    ? new Date(typeof tokens.expiry_date === "number" ? tokens.expiry_date : tokens.expiry_date)
    : null;

  await pool.query(
    `insert into google_oauth_tokens
       (subject, access_token, refresh_token, scope, token_type, expiry_date, raw_json, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7, now())
     on conflict (subject)
     do update set
       access_token = excluded.access_token,
       refresh_token = coalesce(excluded.refresh_token, google_oauth_tokens.refresh_token),
       scope = excluded.scope,
       token_type = excluded.token_type,
       expiry_date = excluded.expiry_date,
       raw_json = excluded.raw_json,
       updated_at = now()`,
    [
      subject,
      tokens.access_token || null,
      tokens.refresh_token || null,
      tokens.scope || null,
      tokens.token_type || null,
      expiry,
      JSON.stringify(tokens || {})
    ]
  );
}

export async function loadTokens(subject = "default") {
  const { rows } = await pool.query(
    `select access_token, refresh_token, scope, token_type, expiry_date, raw_json
       from google_oauth_tokens where subject = $1 limit 1`,
    [subject]
  );
  return rows[0] || null;
}

/**
 * Returns an OAuth2 client preloaded with tokens.
 * Automatically refreshes if expired and persists updated tokens.
 */
export async function getAuthedOAuth2(subject = "default") {
  const client = createOAuth2Client();
  const row = await loadTokens(subject);
  if (!row) throw new Error("Google OAuth not connected yet");

  // Set credentials; googleapis will refresh on demand if refresh_token is present
  const creds = {
    access_token: row.access_token || undefined,
    refresh_token: row.refresh_token || undefined,
    scope: row.scope || undefined,
    token_type: row.token_type || undefined,
    expiry_date: row.expiry_date ? new Date(row.expiry_date).getTime() : undefined
  };
  client.setCredentials(creds);

  // Proactively ensure access token and persist if it changed
  try {
    const at = await client.getAccessToken(); // triggers refresh if needed
    if (at?.token) {
      const fresh = client.credentials;
      await saveTokens(fresh, subject);
    }
  } catch (e) {
    // If refresh_token missing/invalid, surface clear error
    throw new Error(`Google token refresh failed: ${e.message}`);
  }

  return client;
}
