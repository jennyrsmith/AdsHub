import { useEffect, useState } from "react";
import StripeCard from "../shared/StripeCard";
import { Api } from "../../lib/api";

function Kpi({label, value, sub}) {
  return (
    <StripeCard>
      <div className="text-sm text-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </StripeCard>
  );
}

export default function KPICards({ range = "7" }) {
  const [kpi, setKpi] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let abort = new AbortController();
    (async () => {
      setErr("");
      try {
        const data = await Api.summary({ range });
        setKpi(data); // expect {spend, revenue, roas, impressions, clicks, byChannel:[{platform,spend,roas}]}
      } catch (e) {
        setErr(e.message || "Failed to load summary");
      }
    })();
    return () => abort.abort();
  }, [range]);

  if (err) {
    return <div className="text-sm text-red-600 mb-6">{err}</div>;
  }
  if (!kpi) {
    return <div className="text-sm text-muted mb-6">Loading summary…</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      <Kpi label="Spend"       value={fmtMoney(kpi.spend)}        sub={kpi.deltaSpend} />
      <Kpi label="Revenue"     value={fmtMoney(kpi.revenue)}      sub={kpi.deltaRevenue} />
      <Kpi label="ROAS"        value={`${fmtNum(kpi.roas)}x`}     sub="target ≥ 2.0x" />
      <Kpi label="Impressions" value={fmtInt(kpi.impressions)} />
      <Kpi label="Clicks"      value={fmtInt(kpi.clicks)} />
    </div>
  );
}

function fmtMoney(n){ return n==null ? "—" : n.toLocaleString(undefined,{style:"currency",currency:"USD"}); }
function fmtInt(n){ return n==null ? "—" : n.toLocaleString(); }
function fmtNum(n){ return n==null ? "—" : Number(n).toFixed(2); }
