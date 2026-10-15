import React from 'react';

/**
 * SourceBadge Component
 * Shows source system: Hospital A, Clinic B, Payer C
 */
export default function SourceBadge({ system }) {
  const normalized = (system || '').toLowerCase();

  let badgeClass = 'source-badge-unknown';
  let label = system || 'Unknown Source';

  if (normalized.includes('hospital a')) {
    badgeClass = 'source-badge-hosp';
    label = '🏥 Hospital A';
  } else if (normalized.includes('clinic b')) {
    badgeClass = 'source-badge-clinic';
    label = '🩺 Clinic B';
  } else if (normalized.includes('payer c')) {
    badgeClass = 'source-badge-payer';
    label = '💳 Payer C';
  }

  return (
    <span className={`source-badge ${badgeClass}`} title={`Source Provenance: ${system}`}>
      {label}
    </span>
  );
}
