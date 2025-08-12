// cron.js
import cron from "node-cron";
import { finalizeYesterdayIfNeeded, pullToday } from "./cronHelpers.js";
import { runDailyCreativeRecs } from "./dailyCreative.js";
import { getAuthedOAuth2 } from "./lib/googleOAuth.js";

const TZ = process.env.TZ || "UTC";

// 4× per day: 00:15, 06:15, 12:15, 18:15 (local TZ)
cron.schedule("15 0,6,12,18 * * *", async () => {
  try {
    await finalizeYesterdayIfNeeded();
    await pullToday();
  } catch (e) { console.error("cron error", e); }
}, { timezone: TZ });

// AI daily recs at 07:05
cron.schedule("5 7 * * *", async () => {
  try { await runDailyCreativeRecs(30); } catch (e) { console.error("ai daily error", e); }
}, { timezone: TZ });

cron.schedule("0 3 * * *", async () => {
  try {
    await getAuthedOAuth2("default"); // triggers refresh if needed and persists
    console.log("Google OAuth token OK");
  } catch (e) {
    console.error("Google OAuth token refresh failed:", e.message);
  }
}, { timezone: TZ });

console.log("Cron scheduled in TZ:", TZ);
