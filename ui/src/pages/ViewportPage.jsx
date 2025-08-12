import Shell from "../components/layout/Shell.jsx";
import StatusBar from "../components/status/StatusBar.jsx";
import FiltersBar from "../components/filters/FiltersBar.jsx";
import KPICards from "../components/kpi/KPICards.jsx";
import ChannelChart from "../components/charts/ChannelChart.jsx";
import TablePage from "../components/table/TablePage.jsx";

export default function ViewportPage() {
  return (
    <Shell>
      <StatusBar />
      <FiltersBar />
      <KPICards />
      <ChannelChart />
      <TablePage />
    </Shell>
  );
}
