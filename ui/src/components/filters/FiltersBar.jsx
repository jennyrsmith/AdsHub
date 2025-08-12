import StripeCard from "../shared/StripeCard";
import { useURLFilters } from "../../lib/filters";

export default function FiltersBar() {
  const { filters, setFilters } = useURLFilters();
  const set = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value, page: 1 }));

  return (
    <StripeCard className="mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        <input className="border border-border rounded-md px-3 py-2" placeholder="Search…" value={filters.search} onChange={set("search")} />
        <select className="border border-border rounded-md px-3 py-2 bg-white" value={filters.channel} onChange={set("channel")}>
          <option>All</option><option>Facebook Ads</option><option>YouTube Ads</option>
        </select>
        <select className="border border-border rounded-md px-3 py-2 bg-white" value={filters.range} onChange={set("range")}>
          <option>Last 7</option><option>Last 30</option><option>Custom</option>
        </select>
        {filters.range === "Custom" && (
          <>
            <input type="date" className="border border-border rounded-md px-3 py-2" value={filters.start} onChange={set("start")} />
            <input type="date" className="border border-border rounded-md px-3 py-2" value={filters.end} onChange={set("end")} />
          </>
        )}
        <select className="border border-border rounded-md px-3 py-2 bg-white" value={filters.format} onChange={set("format")}>
          <option>All</option><option>Static</option><option>Video</option>
        </select>
        <div className="flex gap-2">
          <select className="border border-border rounded-md px-3 py-2 bg-white flex-1" value={filters.sortBy} onChange={set("sortBy")}>
            <option value="Spend">Spend</option><option value="ROAS">ROAS</option>
            <option value="CTR">CTR</option><option value="CR">CR</option>
            <option value="CAC">CAC</option><option value="CV">CV</option>
          </select>
          <select className="border border-border rounded-md px-3 py-2 bg-white" value={filters.sortDir} onChange={set("sortDir")}>
            <option value="desc">▼</option><option value="asc">▲</option>
          </select>
        </div>
      </div>
    </StripeCard>
  );
}
