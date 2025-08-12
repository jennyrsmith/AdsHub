import fetch from "node-fetch";
import { getAuthedOAuth2 } from "../lib/googleOAuth.js";

export async function googleAdsQuery({ customerId, gaql }) {
  // Access Token from OAuth
  const oauth = await getAuthedOAuth2("default");
  const accessToken = (await oauth.getAccessToken()).token;

  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID; // optional MCC

  const url = `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`;
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "developer-token": devToken,
    "Content-Type": "application/json"
  };
  if (loginCustomerId) headers["login-customer-id"] = loginCustomerId;

  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify({ query: gaql }) });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Google Ads API error ${r.status}: ${txt}`);
  }

  const chunks = await r.json(); // searchStream returns an array of message chunks
  return chunks;
}
