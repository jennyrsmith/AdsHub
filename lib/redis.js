import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export const redis = process.env.REDIS_URL
  ? createClient({ url: process.env.REDIS_URL })
  : null;

if (redis) {
  redis.on('error', (err) => console.error('Redis error', err));
}

export async function connectRedis() {
  if (redis && !redis.isOpen) {
    await redis.connect();
  }
}

export async function closeRedis() {
  if (redis && redis.isOpen) {
    await redis.quit();
  }
}
