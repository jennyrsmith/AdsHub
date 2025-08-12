import { useEffect, useState } from "react";
import StripeCard from "../shared/StripeCard";
import { apiFetch, buildQuery } from "../../lib/api";
import { useURLFilters } from "../../lib/filters";
import { toast } from "../../lib/toast";

export default function ChannelChart() {
  const { queryForAPI } = useURLFilters();
  const [by, setBy] = useState({ facebook: 0, youtube: 0 });

  useEffect(() => {
    (async () => {
      try {
        const q = buildQuery({ range: queryForAPI.range, start: queryForAPI.start, end: queryForAPI.end });
        const data = await apiFetch(`/api/summary${q}`);
        setBy({
          facebook: data?.byPlatform?.facebook?.spend || 0,
          youtube:  data?.byPlatform?.youtube?.spend  || 0
        });
      } catch (e) {
        toast(`Channel summary failed: ${e.message}`, "error");
      }
    })();
  }, [queryForAPI.range, queryForAPI.start, queryForAPI.end]);

  const max = Math.max(1, by.facebook, by.youtube);

  return (
    <StripeCard className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Performance by Channel (Spend)</h3>
      </div>
      <div className="grid grid-cols-2 gap-6 h-40 items-end">
        {[
          { label: "Facebook", val: by.facebook, color: "bg-indigo-500" },
          { label: "YouTube",  val: by.youtube,  color: "bg-rose-500" }
        ].map(x => (
          <div key={x.label} className="flex flex-col items-center gap-2">
            <div className={`w-10 ${x.color} rounded`} style={{ height: `${(x.val / max) * 100}%` }} />
            <div className="text-xs text-muted">{x.label}</div>
          </div>
        ))}
      </div>
    </StripeCard>
  );
}
