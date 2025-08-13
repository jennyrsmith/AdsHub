import 'dotenv/config';
import { fetchFacebookInsights } from '../facebookInsights.js';
import { fetchYouTubeInsights } from '../youtubeInsights.js';
import { insertOnly } from '../saveToDatabase.js';
import { refreshDailyRollup } from '../lib/rollups.js';

const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  const val = args[i + 1];
  if (key && key.startsWith('--')) opts[key.slice(2)] = val;
}

const { source, start, end } = opts;
if (!source || !start || !end) {
  console.error('Usage: node scripts/backfill.js --source facebook --start YYYY-MM-DD --end YYYY-MM-DD');
  process.exit(1);
}

const fetcher = source === 'facebook'
  ? fetchFacebookInsights
  : source === 'youtube'
    ? fetchYouTubeInsights
    : null;

if (!fetcher) {
  console.error('Unknown source:', source);
  process.exit(1);
}

(async () => {
  const rows = await fetcher({ since: start, until: end });
  const r = await insertOnly(source, rows);
  await refreshDailyRollup(start, end);
  console.log(`Backfill complete for ${source}: inserted ${r.inserted}`);
  process.exit(0);
})().catch(err => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
