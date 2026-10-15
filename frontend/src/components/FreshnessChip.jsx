import React from 'react';

/**
 * FreshnessChip Component
 * Computes freshness from ISO date string:
 * - Green: < 30 days old
 * - Amber: 30 - 179 days old
 * - Red: >= 180 days old
 */
export default function FreshnessChip({ dateString }) {
  if (!dateString) {
    return (
      <span className="freshness-chip freshness-amber" title="Last updated timestamp not specified">
        <span className="freshness-dot"></span>
        <span>Unknown freshness</span>
      </span>
    );
  }

  const recordDate = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - recordDate.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  let colorClass = 'freshness-green';
  let tierLabel = 'Fresh (<30d)';

  if (diffDays >= 180) {
    colorClass = 'freshness-red';
    tierLabel = 'Outdated (≥180d)';
  } else if (diffDays >= 30) {
    colorClass = 'freshness-amber';
    tierLabel = 'Stale (30-179d)';
  }

  const formattedDate = recordDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <span
      className={`freshness-chip ${colorClass}`}
      title={`Last Updated: ${formattedDate} (${diffDays} days ago)`}
    >
      <span className="freshness-dot"></span>
      <span>{diffDays === 0 ? 'Today' : `${diffDays}d ago`}</span>
      <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>• {tierLabel}</span>
    </span>
  );
}
