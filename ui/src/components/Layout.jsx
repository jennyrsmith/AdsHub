export default function Layout({ header, status, children, syncing }) {
  return (
    <div>
      {syncing && <div style={{ height: '2px', background: 'var(--color-primary)', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }} />}
      {header}
      {status}
      <main className="container">
        {children}
      </main>
    </div>
  );
}
