import React from 'react';

export default function StripeCard({ children }) {
  return (
    <div className="bg-surface rounded-lg shadow-card border border-border p-4 sm:p-6">
      {children}
    </div>
  );
}
