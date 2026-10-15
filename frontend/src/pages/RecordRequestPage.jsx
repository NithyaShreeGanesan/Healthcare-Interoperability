import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import SourceBadge from '../components/SourceBadge';
import FreshnessChip from '../components/FreshnessChip';
import AccessBlockedModal from '../components/AccessBlockedModal';

const RESOURCE_OPTIONS = [
  'Condition',
  'Observation',
  'MedicationRequest',
  'AllergyIntolerance',
  'Immunization',
  'Claim',
  'Coverage'
];

export default function RecordRequestPage() {
  const { user, role } = useAuth();

  const [patientName, setPatientName] = useState('Jane Doe');
  const [dob, setDob] = useState('1985-04-12');
  const [purpose, setPurpose] = useState(role === 'payer' ? 'payment' : 'treatment');
  const [selectedResources, setSelectedResources] = useState([
    'Condition',
    'Observation',
    'MedicationRequest',
    'AllergyIntolerance',
    'Immunization'
  ]);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [responseResult, setResponseResult] = useState(null);
  const [blockedInfo, setBlockedInfo] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [breakGlassActive, setBreakGlassActive] = useState(false);

  const toggleResource = (res) => {
    setSelectedResources((prev) =>
      prev.includes(res) ? prev.filter((r) => r !== res) : [...prev, res]
    );
  };

  const validate = () => {
    const errs = {};
    if (!patientName.trim()) errs.patientName = 'Patient name is required.';
    if (!dob) errs.dob = 'Date of birth is required.';
    if (selectedResources.length === 0) errs.resources = 'Select at least one resource type.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRequestSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setResponseResult(null);
    setBreakGlassActive(false);

    try {
      const data = await api.requestRecords({
        patientName,
        dob,
        resourceTypes: selectedResources,
        purpose,
        breakGlass: false
      });
      setResponseResult(data);
    } catch (err) {
      if (err.isAccessBlocked) {
        setBlockedInfo({
          reason: err.reason || err.message,
          consentStatus: err.consentStatus
        });
        setIsModalOpen(true);
      } else {
        setErrors({ general: err.message || 'Error executing record query.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBreakGlassOverride = async (justification) => {
    setLoading(true);
    try {
      const data = await api.requestRecords({
        patientName,
        dob,
        resourceTypes: selectedResources,
        purpose,
        breakGlass: true,
        justification
      });
      setResponseResult(data);
      setBreakGlassActive(true);
      setIsModalOpen(false);
    } catch (err) {
      alert(`Break-glass override failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Clinical & Payer Record Query Portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Multi-source aggregation gated by Role Permissions, Patient Consent, and Audit Logging.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Requester Role:</span>
          <span className={`role-tag role-${role}`}>{role}</span>
        </div>
      </div>

      {/* QUERY CRITERIA CARD */}
      <section className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h2 style={{ fontSize: '1.15rem' }}>Patient Query & Consent Filter</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setPatientName('Jane Doe');
                setDob('1985-04-12');
                setSelectedResources(['Condition', 'Observation', 'MedicationRequest']);
                setPurpose('treatment');
              }}
            >
              Fill Jane Doe
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                // Test blocked trigger
                setPatientName('Jane Doe');
                setDob('1985-04-12');
                setSelectedResources(['Observation', 'AllergyIntolerance']);
                setPurpose('payment');
                setBlockedInfo({
                  reason: 'Access Denied: Patient has not granted consent for Payer to view detailed Clinical Diagnostic Observations or Allergies.'
                });
                setIsModalOpen(true);
              }}
            >
              🛡️ Test Blocked Modal
            </button>
          </div>
        </div>

        {errors.general && (
          <div className="alert alert-danger">
            <span>⚠️</span>
            <span>{errors.general}</span>
          </div>
        )}

        <form onSubmit={handleRequestSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="patientName">
                Patient Full Name <span className="required">*</span>
              </label>
              <input
                id="patientName"
                type="text"
                className={`form-control ${errors.patientName ? 'is-invalid' : ''}`}
                placeholder="e.g. Jane Doe"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                disabled={loading}
              />
              {errors.patientName && <div className="form-error">⚠️ {errors.patientName}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dob">
                Date of Birth <span className="required">*</span>
              </label>
              <input
                id="dob"
                type="date"
                className={`form-control ${errors.dob ? 'is-invalid' : ''}`}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                disabled={loading}
              />
              {errors.dob && <div className="form-error">⚠️ {errors.dob}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="req-purpose">
                Stated Purpose of Use <span className="required">*</span>
              </label>
              <select
                id="req-purpose"
                className="form-control"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={loading}
              >
                <option value="treatment">Treatment (Direct Clinical Care)</option>
                <option value="payment">Payment (Reimbursement & Claims Review)</option>
                <option value="research">Academic Health Research</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Requested FHIR R4 Resource Types <span className="required">*</span>
            </label>
            <div className="checkbox-group">
              {RESOURCE_OPTIONS.map((rt) => (
                <label key={rt} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedResources.includes(rt)}
                    onChange={() => toggleResource(rt)}
                  />
                  <span>{rt}</span>
                </label>
              ))}
            </div>
            {errors.resources && <div className="form-error">⚠️ {errors.resources}</div>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span> Gating & Aggregating Records...
                </>
              ) : (
                'Request Authorized Records →'
              )}
            </button>
          </div>
        </form>
      </section>

      {/* BREAK-GLASS ACTIVE ALERT */}
      {breakGlassActive && (
        <div className="alert alert-warning" style={{ border: '2px solid var(--warning-solid)' }}>
          <div style={{ fontSize: '1.75rem' }}>🚨</div>
          <div>
            <strong style={{ fontSize: '1.05rem', color: 'var(--warning-text)' }}>
              EMERGENCY BREAK-GLASS PROTOCOL ACTIVE
            </strong>
            <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Consent barriers were bypassed under emergency clinician authorization. 
              This event is logged with SHA-256 hash chaining to the immutable audit ledger.
            </p>
          </div>
        </div>
      )}

      {/* RESULTS SECTION */}
      {responseResult && (
        <section>
          {/* Patient Header Card */}
          <div className="card" style={{ background: '#f0fdfa', borderColor: 'var(--primary-100)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.4rem' }}>
                    {responseResult.patient?.firstName} {responseResult.patient?.lastName}
                  </h2>
                  <span className="role-tag role-patient">Verified in MPI</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-body)', marginTop: '0.4rem', lineHeight: 1.6 }}>
                  <span><strong>Master Patient ID:</strong> <code>{responseResult.master_patient_id}</code></span> • 
                  <span> <strong>DOB:</strong> {responseResult.patient?.dob}</span> • 
                  <span> <strong>Gender:</strong> {responseResult.patient?.gender}</span> • 
                  <span> <strong>Phone:</strong> {responseResult.patient?.phone}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  <strong>Address:</strong> {responseResult.patient?.address} ({responseResult.patient?.postalCode})
                </div>
              </div>

              {/* Linked System Identifiers */}
              <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Linked Source System Identifiers:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem' }}>
                  {responseResult.patient?.identifiers?.map((idObj) => (
                    <div key={idObj.system} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <SourceBadge system={idObj.system} />
                      <code>{idObj.mrn}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Unified Records List */}
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.25rem' }}>
              Consented FHIR R4 Records ({responseResult.records?.length || 0})
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              All records decrypted and verified against data integrity hashes.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {responseResult.records?.map((record) => (
              <div key={record.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '4px',
                        background: 'var(--bg-surface)',
                        fontWeight: 700,
                        fontSize: '0.825rem',
                        color: 'var(--accent-blue)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      {record.resourceType}
                    </span>
                    <h4 style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                      {record.display}
                    </h4>
                  </div>

                  {/* Provenance & Freshness metadata */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <SourceBadge system={record.source_system} />
                    <FreshnessChip dateString={record.last_updated} />
                  </div>
                </div>

                {/* Specific Resource Fields */}
                <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
                  {record.clinicalStatus && (
                    <div>Status: <strong>{record.clinicalStatus}</strong></div>
                  )}
                  {record.value && (
                    <div>Observed Value: <strong>{record.value}</strong></div>
                  )}
                  {record.dosage && (
                    <div>Dosage Instructions: <strong>{record.dosage}</strong></div>
                  )}
                  {record.criticality && (
                    <div>Criticality: <strong style={{ color: 'var(--danger-solid)' }}>{record.criticality.toUpperCase()}</strong></div>
                  )}
                  {record.total && (
                    <div>Claim Total Amount: <strong>{record.total}</strong></div>
                  )}
                </div>

                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                  <span>FHIR ID: <code>{record.fhir_id}</code></span>
                  <span>Ingested At: {new Date(record.ingested_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ACCESS BLOCKED MODAL WITH BREAK-GLASS */}
      <AccessBlockedModal
        isOpen={isModalOpen}
        errorInfo={blockedInfo}
        onClose={() => setIsModalOpen(false)}
        onBreakGlass={handleBreakGlassOverride}
      />
    </div>
  );
}
