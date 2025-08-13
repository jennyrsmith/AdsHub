// cron.js
import cron from "node-cron";
import { fetchFacebookInsights } from "./facebookInsights.js";
import { fetchYouTubeInsights } from "./youtubeInsights.js";
import { insertOnly, upsertToday } from "./saveToDatabase.js";
import { runDailyCreativeRecs } from "./dailyCreative.js";
import { getAuthedOAuth2 } from "./lib/googleOAuth.js";
import { yesterdayRange, todayRange } from "./lib/date.js";
import { log, logError } from "./logger.js";
import { refreshRecentWindows } from "./lib/rollups.js";

const TZ = process.env.TZ || "UTC";

async function syncToday() {
  const range = todayRange();
  for (const [name, fetcher] of [["facebook", fetchFacebookInsights], ["youtube", fetchYouTubeInsights]]) {
    try {
      const rows = await fetcher(range);
      const r = await upsertToday(name, rows);
      log(`cron ${name} today rows=${rows.length} upserted=${r.upserted}`);
    } catch (e) {
      await logError(`cron today ${name} failed`, e);
    }
  }
  try { await refreshRecentWindows(); } catch (e) { await logError('cron refreshRecentWindows failed', e); }
}

async function archiveYesterday() {
  const range = yesterdayRange();
  for (const [name, fetcher] of [["facebook", fetchFacebookInsights], ["youtube", fetchYouTubeInsights]]) {
    try {
      const rows = await fetcher(range);
      const r = await insertOnly(name, rows);
      log(`cron ${name} archive rows=${rows.length} inserted=${r.inserted}`);
    } catch (e) {
      await logError(`cron yesterday ${name} failed`, e);
    }
  }
  try { await refreshRecentWindows(); } catch (e) { await logError('cron refreshRecentWindows failed', e); }
}

// 4× per day: 00:15, 06:15, 12:15, 18:15 (local TZ)
cron.schedule("15 0,6,12,18 * * *", () => syncToday(), { timezone: TZ });

// Midnight archival of previous day
cron.schedule("5 0 * * *", () => archiveYesterday(), { timezone: TZ });

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
