import StripeCard from "../shared/StripeCard";
import { useEffect, useState } from "react";

export default function FiltersBar({ value, onChange }) {
  const [state, setState] = useState(value || {
    search:"", channel:"All", range:"7", format:"All",
    sortBy:"Spend", breakdown:"Campaign", page:1, pageSize:50, start:"", end:""
  });

  useEffect(()=>{ onChange?.(state); }, [state]); // push up

  return (
    <StripeCard className="mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        <input className="border border-border rounded-md px-3 py-2" placeholder="Search…" value={state.search} onChange={e=>setState(s=>({...s, search:e.target.value, page:1}))} />
        <select className="border border-border rounded-md px-3 py-2 bg-white" value={state.channel} onChange={e=>setState(s=>({...s, channel:e.target.value, page:1}))}>
          <option>All</option><option>Facebook Ads</option><option>YouTube Ads</option>
        </select>
        <select className="border border-border rounded-md px-3 py-2 bg-white" value={state.range} onChange={e=>setState(s=>({...s, range:e.target.value, page:1}))}>
          <option value="7">Last 7</option><option value="30">Last 30</option><option value="custom">Custom…</option>
        </select>

        <select className="border border-border rounded-md px-3 py-2 bg-white" value={state.format} onChange={e=>setState(s=>({...s, format:e.target.value, page:1}))}>
          <option>All</option><option>Static</option><option>Video</option>
        </select>
        <select className="border border-border rounded-md px-3 py-2 bg-white" value={state.sortBy} onChange={e=>setState(s=>({...s, sortBy:e.target.value, page:1}))}>
          <option>Spend</option><option>ROAS</option><option>CTR</option><option>CR</option><option>CAC</option><option>CV</option>
        </select>
        <select className="border border-border rounded-md px-3 py-2 bg-white" value={state.breakdown} onChange={e=>setState(s=>({...s, breakdown:e.target.value, page:1}))}>
          <option>Campaign</option><option>Platform</option><option>Placement</option><option>Format</option><option>Talent</option><option>URL</option>
        </select>

        {state.range === "custom" && (
          <>
            <input type="date" className="border border-border rounded-md px-3 py-2" value={state.start} onChange={e=>setState(s=>({...s, start:e.target.value}))} />
            <input type="date" className="border border-border rounded-md px-3 py-2" value={state.end} onChange={e=>setState(s=>({...s, end:e.target.value}))} />
          </>
        )}
      </div>
    </StripeCard>
  );
}
