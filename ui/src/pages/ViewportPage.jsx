import { useMemo, useState } from "react";
import Shell from "../components/layout/Shell";
import StatusBar from "../components/status/StatusBar";
import FiltersBar from "../components/filters/FiltersBar";
import KPICards from "../components/kpi/KPICards";
import ChannelChart from "../components/charts/ChannelChart";
import TablePage from "../components/table/TablePage";
import AiHighlights from "../components/ai/AiHighlights";

export default function ViewportPage() {
  const [filters, setFilters] = useState({
    search:"", channel:"All", range:"7", format:"All",
    sortBy:"Spend", breakdown:"Campaign", page:1, pageSize:50, start:"", end:""
  });

  // tiny setter so TablePage can nudge pagination
  const filtersWithSetter = useMemo(()=>({ ...filters, _set:setFilters }), [filters]);

  return (
    <Shell>
      <StatusBar />
      <FiltersBar value={filters} onChange={setFilters} />
      <KPICards range={filters.range === "custom" ? undefined : filters.range} />
      <ChannelChart />
      <TablePage filters={filtersWithSetter} />
      <AiHighlights />
    </Shell>
  );
}
