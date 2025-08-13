// server.js
import 'dotenv/config'; // load .env first
import { createApp } from './src/app.js';

const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '3000', 10);

async function main() {
  const app = createApp();

  // Never block listening on DB readiness. App should start, /readyz reflects DB status.
  app.listen(PORT, HOST, () => {
    console.log(`[start] adshub-api listening on http://${HOST}:${PORT}`);
    console.log(`[config] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  });
}

process.on('unhandledRejection', (e) => {
  console.error('[fatal] unhandledRejection', e);
});
process.on('uncaughtException', (e) => {
  console.error('[fatal] uncaughtException', e);
});

main().catch((e) => {
  console.error('[fatal] bootstrap failed', e);
  // Still exit so PM2 restarts if something truly fatal happened
  process.exit(1);
});

