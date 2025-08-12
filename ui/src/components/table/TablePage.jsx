import { useEffect, useMemo, useState } from "react";
import StripeCard from "../shared/StripeCard";
import { apiFetch, buildQuery } from "../../lib/api";
import { toast } from "../../lib/toast";
import { useURLFilters } from "../../lib/filters";

export default function TablePage() {
  const { filters, setFilters, queryForAPI } = useURLFilters();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => ({
    ...queryForAPI
  }), [queryForAPI]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const q = buildQuery(params);
        const data = await apiFetch(`/api/rows${q}`);
        setRows(data?.rows || []);
        setTotal(data?.total || 0);
      } catch (e) {
        toast(`Load rows failed: ${e.message}`, "error");
        setRows([]); setTotal(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  const onSort = (key) => {
    setFilters(f => ({
      ...f,
      sortBy: key,
      sortDir: f.sortBy === key && f.sortDir === "desc" ? "asc" : "desc",
      page: 1
    }));
  };

  const headers = [
    { key: "date", label: "Date" },
    { key: "platform", label: "Platform" },
    { key: "campaign", label: "Campaign" },
    { key: "adset", label: "Ad Set" },
    { key: "ad", label: "Ad" },
    { key: "spend", label: "Spend" },
    { key: "roas", label: "ROAS" },
    { key: "ctr", label: "CTR" },
    { key: "clicks", label: "Clicks" },
    { key: "impressions", label: "Impr." }
  ];

  async function exportCSV() {
    try {
      const q = buildQuery(params);
      const res = await fetch(`/api/export.csv${q}`, { headers: { "x-api-key": import.meta.env.VITE_SYNC_API_KEY || "" }});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "adshub-export.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(`Export failed: ${e.message}`, "error");
    }
  }

  const pages = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <StripeCard>
      <div className="border-b border-border overflow-x-auto flex items-center justify-between">
        <nav className="flex -mb-px gap-4 text-sm">
          <button className="py-2 px-3 border-b-2 border-brand text-brand">Table View</button>
        </nav>
        <button onClick={exportCSV} className="text-sm bg-slate-100 text-ink font-medium rounded-md px-3 py-1.5 m-2 border border-border hover:bg-slate-200">
          Export CSV
        </button>
      </div>

      <div className="pt-4 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted">No results</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-muted">
              <tr>
                {headers.map(h => (
                  <th key={h.key} className="text-left font-medium px-3 py-2 cursor-pointer" onClick={() => onSort(h.key)}>
                    {h.label}{filters.sortBy === h.key ? (filters.sortDir === "desc" ? " ▼" : " ▲") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2">{r.platform}</td>
                  <td className="px-3 py-2">{r.campaign}</td>
                  <td className="px-3 py-2">{r.adset}</td>
                  <td className="px-3 py-2">{r.ad}</td>
                  <td className="px-3 py-2">${(+r.spend).toFixed(2)}</td>
                  <td className="px-3 py-2">{(+r.roas).toFixed(2)}x</td>
                  <td className="px-3 py-2">{(+r.ctr).toFixed(2)}%</td>
                  <td className="px-3 py-2">{r.clicks}</td>
                  <td className="px-3 py-2">{(+r.impressions).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center gap-3 px-3 py-3 border-t border-border">
        <div className="text-sm text-muted">Results: {rows.length} of {total}</div>
        <div className="ml-auto flex items-center gap-2">
          <button disabled={filters.page<=1} onClick={()=>setFilters(f=>({...f,page:f.page-1}))}
            className="text-sm px-2 py-1 rounded border border-border disabled:opacity-40">Prev</button>
          <div className="text-sm">Page {filters.page} / {pages}</div>
          <button disabled={filters.page>=pages} onClick={()=>setFilters(f=>({...f,page:f.page+1}))}
            className="text-sm px-2 py-1 rounded border border-border disabled:opacity-40">Next</button>
          <select className="text-sm border border-border rounded px-2 py-1"
            value={filters.pageSize} onChange={e=>setFilters(f=>({...f,pageSize:+e.target.value, page:1}))}>
            {[25,50,100,250,500].map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
    </StripeCard>
  );
}
