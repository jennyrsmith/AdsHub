import { useState, useEffect } from "react";
import StripeCard from "../shared/StripeCard";

function Leaderboard({ title, items }) {
  return (
    <StripeCard className="flex-1">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <ol className="space-y-1 text-sm">
        {items && items.length > 0 ? (
          items.slice(0,5).map((item, idx) => (
            <li key={idx} className="flex justify-between">
              <span className="truncate">{item.value}</span>
              <span className="text-muted">{item.roas.toFixed(2)}x ROAS</span>
            </li>
          ))
        ) : (
          <li className="text-muted">No data</li>
        )}
      </ol>
    </StripeCard>
  );
}

export default function AiHighlights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function fetchToday() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/creative-recs/today", {
        headers: { "x-api-key": import.meta.env.VITE_SYNC_API_KEY }
      });
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function generateNow() {
    setGenerating(true);
    try {
      await fetch("/api/ai/creative-recs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_SYNC_API_KEY
        },
        body: JSON.stringify({ days: 30 })
      });
      await fetchToday();
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => { fetchToday(); }, []);

  const summary = data?.summary || {};
  const recs = data?.recommendations ? data.recommendations.split("\n").filter(Boolean) : [];

  return (
    <div className="space-y-6">
      {/* Top 5 Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Leaderboard title="Top Formats" items={summary.formats} />
        <Leaderboard title="Top Hooks" items={summary.hooks} />
        <Leaderboard title="Top First Visuals" items={summary.first_visuals} />
        <Leaderboard title="Top Offers" items={summary.offers} />
      </div>

      {/* Today's AI Media Buying Strategy */}
      <StripeCard>
        <h3 className="text-lg font-semibold mb-3">Today’s AI Media Buying Strategy Recommendations</h3>
        {loading ? (
          <p className="text-muted text-sm">Loading...</p>
        ) : recs.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {recs.map((r, idx) => <li key={idx}>{r}</li>)}
          </ul>
        ) : (
          <p className="text-muted text-sm">No recommendations available.</p>
        )}
      </StripeCard>

      {/* AI Ad Creative Recommendations */}
      <StripeCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">AI Ad Creative Recommendations</h3>
          <button
            onClick={generateNow}
            disabled={generating}
            className="bg-brand text-white text-sm px-3 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Creative Brief"}
          </button>
        </div>
        {recs.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {recs.map((r, idx) => <li key={idx}>{r}</li>)}
          </ul>
        ) : (
          <p className="text-muted text-sm">No creative recs yet.</p>
        )}
      </StripeCard>
    </div>
  );
}

