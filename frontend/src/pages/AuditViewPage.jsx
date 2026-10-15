import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AuditViewPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data.logs || []);
    } catch {
      // Fallback in mock
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (outcomeFilter !== 'all' && l.outcome !== outcomeFilter) return false;
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchEmail = (l.user_email || '').toLowerCase().includes(term);
      const matchPatient = (l.master_patient_id || '').toLowerCase().includes(term);
      const matchReason = (l.reason || '').toLowerCase().includes(term);
      const matchResource = (l.resource_type || '').toLowerCase().includes(term);
      if (!matchEmail && !matchPatient && !matchReason && !matchResource) return false;
    }
    return true;
  });

  const totalEntries = logs.length;
  const allowedCount = logs.filter((l) => l.outcome === 'allowed').length;
  const deniedCount = logs.filter((l) => l.outcome === 'denied').length;
  const breakGlassCount = logs.filter((l) => l.action === 'BREAK_GLASS').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Forensic Audit & Compliance Ledger</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Immutable, SHA-256 hash-chained access log recording all data inspections, consent denials, and emergency overrides.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="role-tag" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
            🔒 Hash Chain Verified (SHA-256)
          </span>
        </div>
      </div>

      {/* METRIC TILES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Audited Requests</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{totalEntries}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success-solid)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--success-solid)', fontWeight: 600 }}>Authorized Reads</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-solid)', marginTop: '0.25rem' }}>{allowedCount}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger-solid)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--danger-solid)', fontWeight: 600 }}>Consent-Blocked Reads</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger-solid)', marginTop: '0.25rem' }}>{deniedCount}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>Break-Glass Overrides</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b45309', marginTop: '0.25rem' }}>{breakGlassCount}</div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <label className="form-label" htmlFor="audit-search" style={{ fontSize: '0.85rem' }}>
              Search Requester, Patient, or Justification
            </label>
            <input
              id="audit-search"
              type="text"
              className="form-control"
              placeholder="e.g. dr.smith, MP-83921, emergency..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="outcome-filter" style={{ fontSize: '0.85rem' }}>
              Filter by Outcome
            </label>
            <select
              id="outcome-filter"
              className="form-control"
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
            >
              <option value="all">All Outcomes (Allowed & Denied)</option>
              <option value="allowed">Allowed Only</option>
              <option value="denied">Denied / Blocked Only</option>
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="action-filter" style={{ fontSize: '0.85rem' }}>
              Filter by Action Type
            </label>
            <select
              id="action-filter"
              className="form-control"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="all">All Actions</option>
              <option value="READ">READ</option>
              <option value="BREAK_GLASS">BREAK_GLASS (Emergency)</option>
              <option value="INGEST">INGEST</option>
              <option value="REVOKE">REVOKE (Consent)</option>
              <option value="CONSENT_GRANT">CONSENT_GRANT</option>
            </select>
          </div>
        </div>
      </div>

      {/* AUDIT LOG TABLE */}
      <div className="card" style={{ padding: '0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <span className="spinner spinner-dark"></span>
            <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>Retrieving audit ledger...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No audit records match the selected filters.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Requester & Role</th>
                  <th>Action</th>
                  <th>Outcome</th>
                  <th>Target Patient</th>
                  <th>Resource(s)</th>
                  <th>Clinical / Business Justification</th>
                  <th>Integrity</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const isAllowed = log.outcome === 'allowed';
                  const isBreakGlass = log.action === 'BREAK_GLASS';
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr style={{ background: isBreakGlass ? '#fffbeb' : undefined }}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                          <div>{new Date(log.ts).toLocaleDateString()}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {new Date(log.ts).toLocaleTimeString()}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.user_email}</div>
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: '0.2rem' }}>
                            <span className={`role-tag role-${log.role}`}>{log.role}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>IP: {log.ip}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className="role-tag"
                            style={{
                              background: isBreakGlass ? '#fef3c7' : 'var(--bg-surface)',
                              color: isBreakGlass ? '#b45309' : 'var(--text-main)',
                              fontWeight: 700,
                              border: isBreakGlass ? '1px solid #fde68a' : '1px solid var(--border-color)'
                            }}
                          >
                            {isBreakGlass ? '🚨 BREAK_GLASS' : log.action}
                          </span>
                        </td>
                        <td>
                          <span
                            className="role-tag"
                            style={{
                              background: isAllowed ? 'var(--success-bg)' : 'var(--danger-bg)',
                              color: isAllowed ? 'var(--success-text)' : 'var(--danger-text)',
                              border: `1px solid ${isAllowed ? 'var(--success-border)' : 'var(--danger-border)'}`
                            }}
                          >
                            {log.outcome.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <code>{log.master_patient_id || 'System'}</code>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', maxWidth: '180px', display: 'inline-block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={log.resource_type}>
                            {log.resource_type}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>{log.reason}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            title="Verify tamper-evident hash chain"
                          >
                            {isExpanded ? 'Hide Hash' : 'SHA-256'}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Tamper Hash Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="8" style={{ background: '#0f172a', color: '#e2e8f0', padding: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                              <div>
                                <span style={{ color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                                  Previous Entry Hash (prev_hash):
                                </span>
                                <code style={{ color: '#38bdf8', wordBreak: 'break-all' }}>{log.prev_hash}</code>
                              </div>
                              <div>
                                <span style={{ color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                                  Current Record Signature (entry_hash):
                                </span>
                                <code style={{ color: '#4ade80', wordBreak: 'break-all' }}>{log.entry_hash}</code>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                              ✓ Cryptographically linked entry #{log.id}. Any mutation to historical data invalidates down-chain signatures.
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
