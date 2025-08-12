import React from 'react';

export default function Shell({ children }) {
  const brand = import.meta.env.VITE_BRAND_NAME || 'AdsHub';
  return (
    <div className="min-h-screen bg-surfaceAlt text-ink">
      <header className="bg-surface shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-semibold">{brand}</h1>
        </div>
      </header>
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
