import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const AVAILABLE_RESOURCES = [
  { type: 'Condition', label: 'Conditions & Diagnoses', icon: '🩺' },
  { type: 'Observation', label: 'Observations (Labs, Vitals)', icon: '🔬' },
  { type: 'MedicationRequest', label: 'Medications & Prescriptions', icon: '💊' },
  { type: 'AllergyIntolerance', label: 'Allergies & Intolerances', icon: '⚠️' },
  { type: 'Immunization', label: 'Immunization Records', icon: '💉' },
  { type: 'Claim', label: 'Billing Claims & Encounters', icon: '🧾' },
  { type: 'Coverage', label: 'Insurance Policy & Coverage', icon: '🛡️' }
];

export default function ConsentPortalPage() {
  const { user } = useAuth();
  const patientId = user?.linked_patient_id || 'MP-83921';

  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // New Consent Form State
  const [step, setStep] = useState(1); // 1 = Grantee & Scope, 2 = Review & Confirm
  const [granteeType, setGranteeType] = useState('role');
  const [granteeId, setGranteeId] = useState('clinician');
  const [granteeDisplay, setGranteeDisplay] = useState('All Licensed Clinicians');
  const [selectedResources, setSelectedResources] = useState([
    'Condition',
    'Observation',
    'MedicationRequest'
  ]);
  const [purpose, setPurpose] = useState('treatment');
  const [expiryDays, setExpiryDays] = useState('180');
  const [customExpiryDate, setCustomExpiryDate] = useState('');

  // Expanded JSON previews
  const [previewConsentId, setPreviewConsentId] = useState(null);
  const [showDraftFhir, setShowDraftFhir] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchConsents();
  }, [patientId]);

  const fetchConsents = async () => {
    setLoading(true);
    try {
      const data = await api.getConsents(patientId);
      setConsents(data.consents || []);
    } catch (err) {
      setError('Failed to fetch patient consents.');
    } finally {
      setLoading(false);
    }
  };

  const handleGranteeTypeChange = (type) => {
    setGranteeType(type);
    if (type === 'role') {
      setGranteeId('clinician');
      setGranteeDisplay('All Licensed Clinicians');
    } else if (type === 'org') {
      setGranteeId('Hospital A');
      setGranteeDisplay('Hospital A (Metro Health System)');
    } else {
      setGranteeId('dr.smith@metrohealth.org');
      setGranteeDisplay('Dr. Sarah Smith, MD');
    }
  };

  const handleResourceToggle = (resourceType) => {
    setSelectedResources((prev) =>
      prev.includes(resourceType)
        ? prev.filter((r) => r !== resourceType)
        : [...prev, resourceType]
    );
  };

  const calculateExpiry = () => {
    if (expiryDays === 'custom' && customExpiryDate) {
      return new Date(customExpiryDate).toISOString();
    }
    const days = parseInt(expiryDays, 10) || 180;
    return new Date(Date.now() + days * 86400000).toISOString();
  };

  const buildFhirConsentJson = () => {
    return {
      resourceType: 'Consent',
      id: `draft-cns-${Date.now()}`,
      status: 'active',
      scope: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/consentscope',
            code: 'patient-privacy',
            display: 'Privacy Consent'
          }
        ]
      },
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
              code: 'IDSCL',
              display: 'Information Disclosure'
            }
          ]
        }
      ],
      patient: {
        reference: `Patient/${patientId}`,
        display: user?.name || 'Jane Doe'
      },
      dateTime: new Date().toISOString(),
      provision: {
        type: 'permit',
        period: {
          start: new Date().toISOString(),
          end: calculateExpiry()
        },
        actor: [
          {
            role: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                  code: 'IRCP',
                  display: granteeType
                }
              ]
            },
            reference: {
              display: granteeDisplay
            }
          }
        ],
        action: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/consentaction',
                code: 'access',
                display: 'Access'
              }
            ]
          }
        ],
        purpose: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason',
            code: purpose.toUpperCase(),
            display: purpose
          }
        ],
        class: selectedResources.map((res) => ({
          system: 'http://hl7.org/fhir/resource-types',
          code: res
        }))
      }
    };
  };

  const handleRevoke = async (consentId) => {
    if (!window.confirm('Are you sure you want to revoke this consent directive immediately?')) {
      return;
    }
    try {
      await api.revokeConsent(consentId);
      setSuccessMessage(`Consent ${consentId} has been revoked.`);
      fetchConsents();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to revoke consent.');
    }
  };

  const handleCreateSubmit = async () => {
    if (selectedResources.length === 0) {
      setError('Please select at least one health resource type to authorize.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const consentPayload = {
        master_patient_id: patientId,
        grantee_type: granteeType,
        grantee_id: granteeId,
        grantee_display: granteeDisplay,
        resource_types: selectedResources,
        purpose,
        valid_to: calculateExpiry()
      };

      await api.createConsent(consentPayload);
      setSuccessMessage('New consent policy registered and cryptographically authorized.');
      setStep(1);
      fetchConsents();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.message || 'Error saving consent policy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Patient Consent & Privacy Portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Patient: <strong>{user?.name || 'Jane Doe'}</strong> (Master Patient ID: <code>{patientId}</code>)
          </p>
        </div>
        <span className="role-tag role-patient" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
          🛡️ Self-Sovereign Health Privacy
        </span>
      </div>

      {successMessage && (
        <div className="alert alert-success" role="alert">
          <span>✅</span>
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ACTIVE CONSENTS LIST */}
      <section className="card" style={{ marginBottom: '2.5rem' }}>
        <div className="card-header">
          <h2 style={{ fontSize: '1.25rem' }}>Your Active & Historical Consent Directives</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {consents.length} Policies Configured
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <span className="spinner spinner-dark"></span>
            <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>Loading consent ledger...</p>
          </div>
        ) : consents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            No consent directives created yet. Use the form below to grant authorization.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Grantee</th>
                  <th>Authorized Resource Types</th>
                  <th>Purpose</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {consents.map((c) => {
                  const isActive = c.status === 'active';
                  return (
                    <React.Fragment key={c.id}>
                      <tr>
                        <td>
                          <span
                            className="role-tag"
                            style={{
                              background: isActive ? 'var(--success-bg)' : 'var(--danger-bg)',
                              color: isActive ? 'var(--success-text)' : 'var(--danger-text)',
                              border: `1px solid ${isActive ? 'var(--success-border)' : 'var(--danger-border)'}`
                            }}
                          >
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.grantee_display || c.grantee_id}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type: {c.grantee_type}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {c.resource_types.map((rt) => (
                              <span
                                key={rt}
                                style={{
                                  background: 'var(--bg-surface)',
                                  fontSize: '0.75rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-color)'
                                }}
                              >
                                {rt}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{c.purpose}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>
                            {new Date(c.valid_to).toLocaleDateString()}
                          </div>
                          {c.revoked_at && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--danger-solid)' }}>
                              Revoked {new Date(c.revoked_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {isActive && (
                              <button
                                type="button"
                                className="btn btn-danger-outline btn-sm"
                                onClick={() => handleRevoke(c.id)}
                              >
                                Revoke
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => setPreviewConsentId(previewConsentId === c.id ? null : c.id)}
                            >
                              {previewConsentId === c.id ? 'Hide FHIR' : 'FHIR R4'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {previewConsentId === c.id && (
                        <tr>
                          <td colSpan="6" style={{ background: '#0f172a', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                              <span>HL7 FHIR R4 Consent Document: {c.id}</span>
                              <button
                                style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer' }}
                                onClick={() => setPreviewConsentId(null)}
                              >
                                Close
                              </button>
                            </div>
                            <pre className="json-preview" style={{ maxHeight: '250px' }}>
                              {JSON.stringify(
                                {
                                  resourceType: 'Consent',
                                  id: c.id,
                                  status: c.status,
                                  patient: { reference: `Patient/${c.master_patient_id}` },
                                  provision: {
                                    type: 'permit',
                                    period: { start: c.valid_from, end: c.valid_to },
                                    actor: [{ role: { text: c.grantee_type }, reference: { display: c.grantee_display } }],
                                    purpose: [{ code: c.purpose }],
                                    class: c.resource_types.map((t) => ({ code: t }))
                                  }
                                },
                                null,
                                2
                              )}
                            </pre>
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
      </section>

      {/* CREATE NEW CONSENT DIRECTIVE */}
      <section className="card">
        <div className="card-header">
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Create New Consent Directive</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Authorize specific providers, roles, or organizations to read segments of your health record.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className={`role-tag ${step === 1 ? 'role-clinician' : ''}`}>1. Configure</span>
            <span className={`role-tag ${step === 2 ? 'role-clinician' : ''}`}>2. Review & Authorize</span>
          </div>
        </div>

        {step === 1 ? (
          <div>
            {/* Grantee Selector */}
            <div className="form-row" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="grantee-type">
                  Grantee Type <span className="required">*</span>
                </label>
                <select
                  id="grantee-type"
                  className="form-control"
                  value={granteeType}
                  onChange={(e) => handleGranteeTypeChange(e.target.value)}
                >
                  <option value="role">Healthcare Role (e.g. All Clinicians)</option>
                  <option value="org">Healthcare Organization (Hospital/Clinic/Payer)</option>
                  <option value="user">Specific Named Individual / Practitioner</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="grantee-entity">
                  Authorized Entity / Grantee <span className="required">*</span>
                </label>
                {granteeType === 'role' ? (
                  <select
                    id="grantee-entity"
                    className="form-control"
                    value={granteeId}
                    onChange={(e) => {
                      setGranteeId(e.target.value);
                      setGranteeDisplay(e.target.options[e.target.selectedIndex].text);
                    }}
                  >
                    <option value="clinician">All Licensed Clinicians</option>
                    <option value="payer">Insurance & Benefits Payers</option>
                    <option value="auditor">Regulatory Compliance Auditors</option>
                  </select>
                ) : granteeType === 'org' ? (
                  <select
                    id="grantee-entity"
                    className="form-control"
                    value={granteeId}
                    onChange={(e) => {
                      setGranteeId(e.target.value);
                      setGranteeDisplay(e.target.options[e.target.selectedIndex].text);
                    }}
                  >
                    <option value="Hospital A">Hospital A (Metro Health System)</option>
                    <option value="Clinic B">Clinic B (Valley Ambulatory Clinic)</option>
                    <option value="Payer C">Payer C (Blue Cross / Blue Shield)</option>
                  </select>
                ) : (
                  <input
                    id="grantee-entity"
                    type="text"
                    className="form-control"
                    placeholder="e.g. dr.smith@metrohealth.org"
                    value={granteeId}
                    onChange={(e) => {
                      setGranteeId(e.target.value);
                      setGranteeDisplay(e.target.value);
                    }}
                  />
                )}
              </div>
            </div>

            {/* Health Resource Types */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">
                Permitted Health Resource Types <span className="required">*</span>
                <span className="form-label-hint">(Select all categories you wish to disclose)</span>
              </label>
              <div className="checkbox-group">
                {AVAILABLE_RESOURCES.map((r) => (
                  <label key={r.type} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedResources.includes(r.type)}
                      onChange={() => handleResourceToggle(r.type)}
                    />
                    <span>
                      {r.icon} {r.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Purpose & Expiration */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="purpose">
                  Permitted Purpose of Use <span className="required">*</span>
                </label>
                <select
                  id="purpose"
                  className="form-control"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  <option value="treatment">Direct Clinical Care & Treatment</option>
                  <option value="payment">Healthcare Reimbursement & Claims</option>
                  <option value="research">Anonymized Academic Research</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="expiry-duration">
                  Consent Validity Period <span className="required">*</span>
                </label>
                <select
                  id="expiry-duration"
                  className="form-control"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                >
                  <option value="30">30 Days (Temporary / Acute)</option>
                  <option value="90">90 Days (Quarterly Follow-up)</option>
                  <option value="180">180 Days (6 Months)</option>
                  <option value="365">1 Year (Annual)</option>
                  <option value="custom">Custom Expiration Date...</option>
                </select>
              </div>

              {expiryDays === 'custom' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="custom-date">
                    Expiration Date <span className="required">*</span>
                  </label>
                  <input
                    id="custom-date"
                    type="date"
                    className="form-control"
                    value={customExpiryDate}
                    onChange={(e) => setCustomExpiryDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (selectedResources.length === 0) {
                    setError('Please select at least one health resource type.');
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
              >
                Proceed to Review Step →
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: REVIEW & CONFIRM */
          <div>
            <div className="alert alert-info">
              <div>
                <strong>Please Review Your Health Data Disclosure Terms:</strong>
                <p style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
                  Once authorized, this consent directive will govern all read operations across Hospital A, Clinic B, and Payer C. 
                  You retain the right to revoke this policy at any time.
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Grantee</span>
                  <div style={{ fontWeight: 600 }}>{granteeDisplay}</div>
                  <span className="role-tag" style={{ marginTop: '0.25rem' }}>{granteeType}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Purpose</span>
                  <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{purpose}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Valid Until</span>
                  <div style={{ fontWeight: 600 }}>{new Date(calculateExpiry()).toLocaleDateString()}</div>
                </div>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Authorized Categories ({selectedResources.length})</span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                  {selectedResources.map((res) => (
                    <span
                      key={res}
                      style={{
                        background: '#ffffff',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        fontWeight: 500,
                        fontSize: '0.85rem'
                      }}
                    >
                      {res}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Collapsible preview of FHIR Consent JSON */}
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowDraftFhir(!showDraftFhir)}
                style={{ marginBottom: '0.75rem' }}
              >
                {showDraftFhir ? '▼ Hide Generated FHIR R4 Consent JSON' : '▶ Preview Generated FHIR R4 Consent JSON'}
              </button>

              {showDraftFhir && (
                <pre className="json-preview">{JSON.stringify(buildFhirConsentJson(), null, 2)}</pre>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
              >
                ← Back to Edit
              </button>
              <button
                type="button"
                className="btn btn-teal"
                onClick={handleCreateSubmit}
                disabled={isSubmitting}
                style={{ padding: '0.75rem 2rem' }}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span> Signing & Authorizing...
                  </>
                ) : (
                  'Authorize Consent Policy ✓'
                )}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
