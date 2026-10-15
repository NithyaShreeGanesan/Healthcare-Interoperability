import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * AccessBlockedModal Component
 * Displays clear explanation when reading patient records is blocked by:
 * - No consent granted
 * - Consent expired
 * - Consent revoked
 * - Role permission not authorized
 *
 * Provides emergency Break-Glass override for Clinicians with mandatory justification.
 */
export default function AccessBlockedModal({ isOpen, errorInfo, onClose, onBreakGlass }) {
  const { role } = useAuth();
  const [justification, setJustification] = useState('');
  const [justificationError, setJustificationError] = useState('');
  const [isSubmittingBreakGlass, setIsSubmittingBreakGlass] = useState(false);

  if (!isOpen) return null;

  const isClinician = role === 'clinician';
  const reasonText =
    errorInfo?.reason ||
    errorInfo?.message ||
    'Access denied: Read gated by RBAC role permission or patient consent policy.';

  const handleBreakGlassSubmit = async (e) => {
    e.preventDefault();
    if (!justification.trim() || justification.trim().length < 15) {
      setJustificationError('Emergency justification must contain at least 15 characters explaining clinical urgency.');
      return;
    }
    setJustificationError('');
    setIsSubmittingBreakGlass(true);
    try {
      if (onBreakGlass) {
        await onBreakGlass(justification);
      }
      onClose();
    } catch (err) {
      setJustificationError(err.message || 'Failed to authorize break-glass access.');
    } finally {
      setIsSubmittingBreakGlass(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="blocked-title">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div className="modal-header" style={{ borderBottomColor: 'var(--danger-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.5rem', color: 'var(--danger-solid)' }}>🛡️</span>
            <div>
              <h3 id="blocked-title" style={{ color: 'var(--danger-solid)', fontSize: '1.25rem' }}>
                Access Blocked: Consent & Security Gate
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                FHIR R4 Read Protection Policy Enforcement
              </p>
            </div>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <div>
            <strong>Reason for Block:</strong>
            <p style={{ marginTop: '0.25rem', fontSize: '0.925rem' }}>{reasonText}</p>
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            🔒 Enforcement Checklist:
          </h4>
          <ul style={{ fontSize: '0.875rem', paddingLeft: '1.25rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
            <li><strong>Authentication (JWT):</strong> Verified</li>
            <li><strong>Role Permission (RBAC):</strong> Evaluated</li>
            <li><strong>Patient Consent:</strong> <span style={{ color: 'var(--danger-solid)', fontWeight: 'bold' }}>Active Policy Restricts This Resource</span></li>
            <li><strong>Audit Logging:</strong> Incident timestamped & logged to immutable audit ledger</li>
          </ul>
        </div>

        {/* Clinician Break-Glass Option */}
        {isClinician ? (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🚨</span>
              <h4 style={{ color: '#b91c1c', fontSize: '1rem' }}>Clinician Emergency Break-Glass Override</h4>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-body)', marginBottom: '1rem' }}>
              Under HIPAA emergency provisions, licensed clinicians may override consent restrictions in life-threatening scenarios. 
              <strong> All actions under Break-Glass are permanently audited with forensic verification.</strong>
            </p>

            <form onSubmit={handleBreakGlassSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="breakglass-reason">
                  Mandatory Clinical Emergency Justification <span className="required">*</span>
                </label>
                <textarea
                  id="breakglass-reason"
                  className={`form-control ${justificationError ? 'is-invalid' : ''}`}
                  rows="3"
                  placeholder="e.g. Unconscious patient in trauma bay requiring immediate allergy and medication history verification..."
                  value={justification}
                  onChange={(e) => {
                    setJustification(e.target.value);
                    if (justificationError) setJustificationError('');
                  }}
                />
                {justificationError && <div className="form-error">⚠️ {justificationError}</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmittingBreakGlass}>
                  Cancel & Return
                </button>
                <button type="submit" className="btn btn-danger" disabled={isSubmittingBreakGlass}>
                  {isSubmittingBreakGlass ? (
                    <>
                      <span className="spinner"></span> Authorizing...
                    </>
                  ) : (
                    'Authorize Emergency Break-Glass'
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Acknowledge & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
