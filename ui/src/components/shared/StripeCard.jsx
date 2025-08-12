import React from 'react';

export default function StripeCard({ children, className = "" }) {
  return (
    <div className={`bg-surface rounded-lg shadow-card border border-border p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}
