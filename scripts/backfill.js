import 'dotenv/config';
import { DateTime } from 'luxon';
import { facebookFetch } from '../services/facebookFetch.js';

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}

const source = getArg('--source');
const start = getArg('--start');
const end = getArg('--end');

if (!source || !start || !end) {
  console.error('Usage: node scripts/backfill.js --source facebook --start YYYY-MM-DD --end YYYY-MM-DD');
  process.exit(1);
}

if (source !== 'facebook') {
  console.error('Only facebook source is supported for now');
  process.exit(1);
}

const s = DateTime.fromISO(start);
const e = DateTime.fromISO(end);

(async () => {
  for (let d = s; d <= e; d = d.plus({ days: 1 })) {
    const day = d.toISODate();
    await facebookFetch({ since: day, until: day });
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('✅ backfill complete');
  process.exit(0);
})().catch(err => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
