// dailyCreative.js
import { generateCreativeRecs } from "./ai/adCreativeRecs.js";
export async function runDailyCreativeRecs(days = 30) {
  return generateCreativeRecs(days, process.env.BRAND_NAME || "Beauty by Earth");
}
