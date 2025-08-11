import { BrowserRouter, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import Layout from './components/Layout.jsx';
import Header from './components/Header.jsx';
import StatusBar from './components/StatusBar.jsx';
import KPICards from './components/KPICards.jsx';
import ChannelChart from './components/ChannelChart.jsx';
import TablePage from './components/TablePage.jsx';

function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [syncing, setSyncing] = useState(false);

  const brand = import.meta.env.VITE_BRAND_NAME || 'AdsHub';

  const defaults = (() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) };
  })();

  const platform = searchParams.get('platform') || 'all';
  const start = searchParams.get('start') || defaults.start;
  const end = searchParams.get('end') || defaults.end;
  const q = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || '';
  const limit = Number(searchParams.get('limit')) || 50;
  const offset = Number(searchParams.get('offset')) || 0;

  function updateParams(upd) {
    const sp = new URLSearchParams(searchParams);
    Object.entries(upd).forEach(([k,v]) => {
      if (v === undefined || v === null || v === '') sp.delete(k);
      else sp.set(k, String(v));
    });
    setSearchParams(sp);
  }

  return (
    <Layout
      syncing={syncing}
      header={<Header brand={brand} platform={platform} start={start} end={end} onChange={updateParams} onSyncStart={() => setSyncing(true)} onSyncEnd={() => setSyncing(false)} />}
      status={<StatusBar platform={platform} start={start} end={end} q={q} sort={sort} />}
    >
      <KPICards platform={platform} start={start} end={end} />
      <ChannelChart start={start} end={end} />
      <TablePage
        platform={platform}
        start={start}
        end={end}
        q={q}
        sort={sort}
        limit={limit}
        offset={offset}
        onChange={updateParams}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
}
