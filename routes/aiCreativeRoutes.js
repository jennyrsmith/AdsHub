import express from "express";
import { generateCreativeRecs } from "../ai/adCreativeRecs.js";
import { pool } from "../lib/db.js";

const router = express.Router();
function requireKey(req,res,next){
  if ((req.headers["x-api-key"]||"") !== (process.env.SYNC_API_KEY||"")) return res.status(401).json({error:"Unauthorized"});
  next();
}

// Recompute + store today (manual)
router.post("/ai/creative-recs", requireKey, async (req,res)=>{
  try {
    const { days = 30, brand } = req.body || {};
    const out = await generateCreativeRecs(days, brand || process.env.BRAND_NAME || "Beauty by Earth");
    res.json(out);
  } catch (e) { console.error(e); res.status(500).json({ error: "AI creative recs failed" }); }
});

// Read-only: return today's stored result (no OpenAI call)
router.get("/ai/creative-recs/today", requireKey, async (req,res)=>{
  try {
    const { rows } = await pool.query(
      `select brand, for_date, summary, top_patterns, recommendations 
         from ai_daily_insights
        where for_date = current_date
        order by created_at desc
        limit 1`
    );
    res.json(rows[0] || null);
  } catch (e) { console.error(e); res.status(500).json({ error: "read failed" }); }
});

export default router;
