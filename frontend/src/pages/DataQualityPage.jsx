import React, { useState, useEffect } from 'react';
import { api } from '../api';
import SourceBadge from '../components/SourceBadge';
import FreshnessChip from '../components/FreshnessChip';

export default function DataQualityPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'conflict', 'missing', 'stale'

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const data = await api.getDataIssues();
      setIssues(data.issues || []);
    } catch {
      // Handled via fallback
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter((iss) => {
    if (filterType === 'all') return true;
    return iss.issue_type === filterType;
  });

  const conflictCount = issues.filter((i) => i.issue_type === 'conflict').length;
  const missingCount = issues.filter((i) => i.issue_type === 'missing').length;
  const duplicateCount = issues.filter((i) => i.issue_type === 'stale').length;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Data Quality & Discrepancy Panel</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Integration reconciliation engine detecting conflicting clinical data, missing payload attributes, and duplicate orders.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className="role-tag" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
            Never Silently Merged
          </span>
        </div>
      </div>

      {/* METRIC KPI TILES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Total Detected Issues</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
            {issues.length}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across 3 integrated sources</span>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger-solid)' }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--danger-solid)', fontWeight: 600 }}>Active Value Conflicts</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--danger-solid)', marginTop: '0.25rem' }}>
            {conflictCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Incompatible lab/medication entries</span>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning-solid)' }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--warning-solid)', fontWeight: 600 }}>Missing Core Attributes</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning-solid)', marginTop: '0.25rem' }}>
            {missingCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Omitted fields during FHIR intake</span>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-blue)' }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--accent-blue)', fontWeight: 600 }}>Possible Duplicate Tests</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '0.25rem' }}>
            {duplicateCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Repeated orders within 48 hours</span>
        </div>
      </div>

      {/* FILTER TABS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilterType('all')}
        >
          All Issues ({issues.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${filterType === 'conflict' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilterType('conflict')}
        >
          Conflicts ({conflictCount})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${filterType === 'missing' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilterType('missing')}
        >
          Missing Data ({missingCount})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${filterType === 'stale' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilterType('stale')}
        >
          Duplicate Tests ({duplicateCount})
        </button>
      </div>

      {/* ISSUES LIST WITH SIDE-BY-SIDE COMPARISON */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <span className="spinner spinner-dark"></span>
          <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>Evaluating cross-system inconsistencies...</p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No discrepancies found in this category.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredIssues.map((issue) => (
            <div key={issue.id} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span
                      className="role-tag"
                      style={{
                        background: issue.severity === 'high' ? 'var(--danger-bg)' : issue.severity === 'medium' ? 'var(--warning-bg)' : 'var(--bg-surface)',
                        color: issue.severity === 'high' ? 'var(--danger-solid)' : issue.severity === 'medium' ? 'var(--warning-solid)' : 'var(--text-body)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      {issue.severity.toUpperCase()} SEVERITY
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Issue #{issue.id}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      • Patient: <code>{issue.master_patient_id}</code>
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{issue.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {issue.description}
                  </p>
                </div>

                <span
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    fontWeight: 600,
                    textTransform: 'capitalize'
                  }}
                >
                  {issue.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* SIDE-BY-SIDE CONFLICT BOX */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                {/* Source A Column */}
                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <SourceBadge system={issue.sourceA.system} />
                    <FreshnessChip dateString={issue.sourceA.recorded} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Field: {issue.sourceA.field}</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                    {issue.sourceA.value}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Recorded: {issue.sourceA.recorded}
                  </div>
                </div>

                {/* Source B Column */}
                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <SourceBadge system={issue.sourceB.system} />
                    <FreshnessChip dateString={issue.sourceB.recorded} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Field: {issue.sourceB.field}</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--danger-solid)', marginTop: '0.25rem' }}>
                    {issue.sourceB.value}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Recorded: {issue.sourceB.recorded}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Resource Type: <code>{issue.resource_type}</code></span>
                <span>Detected At: {new Date(issue.detected_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
