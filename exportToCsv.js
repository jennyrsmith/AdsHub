import fs from 'fs';
import path from 'path';
import { HEADERS } from './constants.js';

export function exportToCSV(insightsArray) {
  const date = new Date().toISOString().slice(0, 10);
  const dir = 'data';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, `facebook-insights-${date}.csv`);
  const rows = insightsArray.map((item) => HEADERS.map((h) => item[h] ?? ''));
  const csv = [HEADERS, ...rows].map((row) => row.join(',')).join('\n');
  fs.writeFileSync(filePath, csv);
  return filePath;
}
