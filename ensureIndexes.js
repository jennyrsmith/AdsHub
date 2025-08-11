import { pool } from './lib/db.js';

const statements = [
  `CREATE INDEX IF NOT EXISTS facebook_ad_insights_date_start_platform_idx ON facebook_ad_insights(date_start, platform)`,
  `CREATE INDEX IF NOT EXISTS facebook_ad_insights_campaign_name_idx ON facebook_ad_insights(campaign_name)`,
  `CREATE INDEX IF NOT EXISTS facebook_ad_insights_account_id_idx ON facebook_ad_insights(account_id)`,
  `CREATE INDEX IF NOT EXISTS youtube_ad_insights_date_start_platform_idx ON youtube_ad_insights(date_start, platform)`,
  `CREATE INDEX IF NOT EXISTS youtube_ad_insights_campaign_name_idx ON youtube_ad_insights(campaign_name)`,
  `CREATE INDEX IF NOT EXISTS youtube_ad_insights_account_id_idx ON youtube_ad_insights(account_id)`
];

export async function ensureIndexes() {
  const client = await pool.connect();
  try {
    for (const sql of statements) {
      await client.query(sql);
    }
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureIndexes()
    .then(() => {
      console.log('Indexes ensured');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to ensure indexes', err);
      process.exit(1);
    });
}
