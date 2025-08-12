import { useEffect, useMemo, useState } from "react";
import StripeCard from "../shared/StripeCard";
import { Api } from "../../lib/api";

export default function TablePage({ filters }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const params = useMemo(() => {
    const p = {
      search: filters.search || "",
      platform: filters.channel === "All" ? "" : filters.channel,
      format: filters.format === "All" ? "" : filters.format,
      sort: (filters.sortBy || "Spend").toLowerCase(),
      breakdown: (filters.breakdown || "Campaign").toLowerCase(),
      page: String(filters.page || 1),
      pageSize: String(filters.pageSize || 50),
    };
    if (filters.range === "custom") {
      if (filters.start) p.start = filters.start;
      if (filters.end)   p.end   = filters.end;
    } else {
      p.range = String(filters.range || 7);
    }
    return p;
  }, [filters]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await Api.rows(params); // { rows:[], total:number }
      setRows(data?.rows || []);
      setTotal(data?.total || 0);
    } catch (e) {
      setErr(e.message || "Failed to load rows");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [params]);

  const exportHref = Api.exportCsv(params);

  return (
    <StripeCard>
      <div className="border-b border-border overflow-x-auto">
        <div className="flex items-center justify-between py-2">
          <nav className="flex gap-4 text-sm">
            <button className="py-2 px-3 border-b-2 border-brand text-brand">Table View</button>
            <button className="py-2 px-3 border-b-2 border-transparent text-muted hover:text-ink" disabled>Creative</button>
            <button className="py-2 px-3 border-b-2 border-transparent text-muted hover:text-ink" disabled>Naming</button>
          </nav>
          <a href={exportHref} target="_blank" rel="noreferrer" className="text-sm bg-slate-100 text-ink font-medium rounded-md px-3 py-2 border border-border hover:bg-slate-200">
            Export CSV
          </a>
        </div>
      </div>

      {err && <div className="text-sm text-red-600 mt-3">{err}</div>}
      {loading && <div className="text-sm text-muted mt-3">Loading…</div>}

      <div className="pt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-muted">
            <tr>
              {["Date","Platform","Campaign","Ad Set","Ad","Spend","ROAS","CTR","Clicks","Impr."].map(h=>(
                <th key={h} className="text-left font-medium px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r,i)=>(
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2">{r.date}</td>
                <td className="px-3 py-2">{r.platform}</td>
                <td className="px-3 py-2">{r.campaign}</td>
                <td className="px-3 py-2">{r.adset}</td>
                <td className="px-3 py-2">{r.ad}</td>
                <td className="px-3 py-2">{fmtMoney(r.spend)}</td>
                <td className="px-3 py-2">{fmtNum(r.roas)}x</td>
                <td className="px-3 py-2">{fmtNum(r.ctr)}%</td>
                <td className="px-3 py-2">{fmtInt(r.clicks)}</td>
                <td className="px-3 py-2">{fmtInt(r.imp)}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-muted">No results.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pager
        page={Number(filters.page || 1)}
        pageSize={Number(filters.pageSize || 50)}
        total={total}
        onChange={(p)=>filters._set?.(s=>({ ...s, page:p }))}
      />
    </StripeCard>
  );
}

function Pager({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center gap-3 justify-end mt-3 text-sm">
      <span className="text-muted">Results: {total.toLocaleString()}</span>
      <button className="px-3 py-1 rounded border border-border bg-slate-50 disabled:opacity-50" disabled={page<=1} onClick={()=>onChange(page-1)}>Prev</button>
      <span className="text-muted">Page {page} / {pages}</span>
      <button className="px-3 py-1 rounded border border-border bg-slate-50 disabled:opacity-50" disabled={page>=pages} onClick={()=>onChange(page+1)}>Next</button>
    </div>
  );
}

function fmtMoney(n){ return n==null ? "—" : n.toLocaleString(undefined,{style:"currency",currency:"USD"}); }
function fmtInt(n){ return n==null ? "—" : n.toLocaleString(); }
function fmtNum(n){ return n==null ? "—" : Number(n).toFixed(2); }
