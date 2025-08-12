import React, { useState } from 'react';
import Shell from '../components/layout/Shell.jsx';
import StatusBar from '../components/status/StatusBar.jsx';
import FiltersBar from '../components/filters/FiltersBar.jsx';
import KPICards from '../components/kpi/KPICards.jsx';
import ChannelChart from '../components/charts/ChannelChart.jsx';
import StripeCard from '../components/shared/StripeCard.jsx';
import TablePage from '../components/table/TablePage.jsx';

function TabButton({ active, children, ...props }) {
  const base = 'px-4 py-2 border-b-2';
  const activeClasses = 'border-indigo-600 text-indigo-600';
  const inactiveClasses = 'border-transparent text-gray-500';
  return (
    <button className={`${base} ${active ? activeClasses : inactiveClasses}`} {...props}>
      {children}
    </button>
  );
}

export default function ViewportPage() {
  const [tab, setTab] = useState('table');

  return (
    <Shell>
      <StatusBar />
      <div className="my-4">
        <StripeCard>
          <FiltersBar />
        </StripeCard>
      </div>
      <KPICards />
      <div className="my-4">
        <ChannelChart />
      </div>
      <div className="my-4">
        <StripeCard>
          <div className="border-b border-border mb-4 flex space-x-4">
            <TabButton active={tab === 'table'} onClick={() => setTab('table')}>Table View</TabButton>
            <TabButton active={tab === 'creative'} onClick={() => setTab('creative')}>Creative</TabButton>
            <TabButton active={tab === 'naming'} onClick={() => setTab('naming')}>Naming</TabButton>
          </div>
          {tab === 'table' && <TablePage />}
          {tab === 'creative' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-surfaceAlt h-32 rounded flex items-center justify-center">
                  Image
                </div>
              ))}
            </div>
          )}
          {tab === 'naming' && (
            <form className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Campaign Name</label>
                <input className="border border-border rounded px-3 py-2 w-full" placeholder="Placeholder" />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Ad Set Name</label>
                <input className="border border-border rounded px-3 py-2 w-full" placeholder="Placeholder" />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Ad Name</label>
                <input className="border border-border rounded px-3 py-2 w-full" placeholder="Placeholder" />
              </div>
            </form>
          )}
        </StripeCard>
      </div>
    </Shell>
  );
}
