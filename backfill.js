// backfill.js
import { DateTime } from "luxon";
import { fetchFacebookInsights } from "./facebookInsights.js";
import { fetchYoutubeInsights } from "./youtubeInsights.js";
import { insertOnly } from "./saveToDatabase.js";
import { logSync } from "./syncLog.js";

const YEARS = 3;
const CHUNK_DAYS = 30;

async function backfillPlatform(name, fetcher) {
  const until = DateTime.utc().toISODate();
  const since = DateTime.utc().minus({ years: YEARS }).toISODate();
  let s = DateTime.fromISO(since);
  const end = DateTime.fromISO(until);

  while (s <= end) {
    const e = s.plus({ days: CHUNK_DAYS - 1 });
    const winStart = s.toISODate();
    const winEnd = (e > end ? end : e).toISODate();

    const rows = await fetcher({ since: winStart, until: winEnd, mode: "history" });
    const r = await insertOnly(name, rows);
    await logSync(`${name}_history_chunk`, { winStart, winEnd, rows: rows.length, inserted: r.inserted });

    s = e.plus({ days: 1 });
  }
}

(async () => {
  await backfillPlatform("facebook", fetchFacebookInsights);
  await backfillPlatform("youtube", fetchYoutubeInsights);
  console.log("Backfill complete.");
  process.exit(0);
})();
