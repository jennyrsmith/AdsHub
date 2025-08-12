// cronHelpers.js
import { DateTime } from "luxon";
import { fetchFacebookInsights } from "./facebookInsights.js";
import { fetchYoutubeInsights } from "./youtubeInsights.js";
import { insertOnly, upsertToday } from "./saveToDatabase.js";
import { logSync } from "./syncLog.js";
import { getLastSync, markLastSync } from "./syncState.js";

const TZ = process.env.TZ || "UTC";

export async function finalizeYesterdayIfNeeded() {
  const today = DateTime.now().setZone(TZ).toISODate();
  const yday = DateTime.now().setZone(TZ).minus({ days: 1 }).toISODate();

  const last = await getLastSync("yesterday_finalize");
  const already = last && DateTime.fromJSDate(last).setZone(TZ).toISODate() === today;
  if (already) return { skipped: true };

  for (const [name, fetcher] of [["facebook", fetchFacebookInsights], ["youtube", fetchYoutubeInsights]]) {
    const rows = await fetcher({ since: yday, until: yday, mode: "history" });
    const r = await insertOnly(name, rows);
    await logSync(`${name}_yesterday_finalize`, { date: yday, rows: rows.length, inserted: r.inserted });
  }
  await markLastSync("yesterday_finalize");
  return { ok: true, date: yday };
}

export async function pullToday() {
  const d = DateTime.now().setZone(TZ).toISODate();
  for (const [name, fetcher, scope] of [
    ["facebook", fetchFacebookInsights, "today_facebook"],
    ["youtube", fetchYoutubeInsights, "today_youtube"]
  ]) {
    const rows = await fetcher({ since: d, until: d, mode: "today" });
    const r = await upsertToday(name, rows);
    await logSync(scope, { date: d, rows: rows.length, upserted: r.upserted });
    await markLastSync(scope);
  }
  return { ok: true, date: d };
}
