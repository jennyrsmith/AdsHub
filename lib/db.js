import 'dotenv/config';
import fs from 'fs';
import { Pool } from 'pg';

let poolInstance;

function createSslConfig() {
  const mode = process.env.PG_SSL_MODE || 'require';
  switch (mode) {
    case 'disable':
      return false;
    case 'require':
      return { rejectUnauthorized: false };
    case 'verify-ca': {
      const caPath = process.env.PG_CA_PATH || './certs/db-ca.pem';
      if (fs.existsSync(caPath)) {
        const ca = fs.readFileSync(caPath).toString();
        return { rejectUnauthorized: true, ca };
      }
      throw new Error(
        'PG_SSL_MODE=verify-ca requires PG_CA_PATH or ./certs/db-ca.pem'
      );
    }
    default:
      throw new Error(`Invalid PG_SSL_MODE: ${mode}`);
  }
}

function getPool() {
  if (!poolInstance) {
    const uri = process.env.PG_URI;
    if (!uri) {
      throw new Error('PG_URI is not set');
    }
    const ssl = createSslConfig();
    poolInstance = new Pool({
      connectionString: uri,
      ssl,
      max: Number(process.env.PG_POOL_MAX || 8),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10000),
      connectionTimeoutMillis: Number(
        process.env.PG_CONN_TIMEOUT_MS || 5000
      )
    });

    poolInstance.on('error', (err) => {
      console.error('Postgres pool error:', err);
    });
  }
  return poolInstance;
}

const pool = getPool();

export { pool, getPool };

