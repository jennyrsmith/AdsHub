import { useEffect, useState } from "react";
import StripeCard from "../shared/StripeCard";
import { apiFetch, buildQuery } from "../../lib/api";
import { useURLFilters } from "../../lib/filters";
import { toast } from "../../lib/toast";

function Kpi({label, value, sub}) {
  return (
    <StripeCard>
      <div className="text-sm text-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </StripeCard>
  );
}

export default function KPICards() {
  const { queryForAPI } = useURLFilters();
  const [kpi, setKpi] = useState({ spend: 0, revenue: 0, roas: 0, impressions: 0, clicks: 0 });

  useEffect(() => {
    (async () => {
      try {
        const q = buildQuery({ range: queryForAPI.range, start: queryForAPI.start, end: queryForAPI.end });
        const data = await apiFetch(`/api/summary${q}`);
        setKpi({
          spend: data?.totals?.spend || 0,
          revenue: data?.totals?.revenue || data?.totals?.cv || 0,
          roas: data?.totals?.roas || 0,
          impressions: data?.totals?.impressions || 0,
          clicks: data?.totals?.clicks || 0
        });
      } catch (e) {
        toast(`Summary failed: ${e.message}`, "error");
      }
    })();
  }, [queryForAPI.range, queryForAPI.start, queryForAPI.end]);

  const fm = (n) => Intl.NumberFormat().format(Math.round(n));
  const money = (n) => `$${Intl.NumberFormat().format(+n.toFixed(0))}`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      <Kpi label="Spend" value={money(kpi.spend)} />
      <Kpi label="Revenue" value={money(kpi.revenue)} />
      <Kpi label="ROAS" value={`${kpi.roas.toFixed(2)}x`} />
      <Kpi label="Impressions" value={fm(kpi.impressions)} />
      <Kpi label="Clicks" value={fm(kpi.clicks)} />
    </div>
  );
}
