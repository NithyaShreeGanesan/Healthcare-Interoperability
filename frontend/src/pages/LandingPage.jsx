import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '3rem 1rem 2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-50)', color: 'var(--primary-700)', padding: '0.35rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          <span>🛡️ PS-013 National Healthcare Challenge</span>
          <span>•</span>
          <span>HL7 FHIR R4 Compliant</span>
        </div>
        <h1 style={{ fontSize: '2.75rem', color: 'var(--text-main)', marginBottom: '1.25rem', lineHeight: 1.2 }}>
          Consent-Based Healthcare <br />
          <span style={{ color: 'var(--accent-blue)' }}>Interoperability Platform</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-body)', maxWidth: '820px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
          A unified, HL7 FHIR R4-compliant data exchange bridge connecting disparate Electronic Health Record (EHR) 
          systems across Hospital A, Clinic B, and Payer C. Powered by a Master Patient Index (MPI) with 
          cryptographic field encryption, every single data access is gated by strict authentication, RBAC role permission, 
          patient consent verification, and an immutable cryptographic audit ledger.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isAuthenticated ? (
            <Link to="/records" className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem' }}>
              Launch Record Request Portal →
            </Link>
          ) : (
            <Link to="/login" className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem' }}>
              Sign In to Platform →
            </Link>
          )}
          <Link to="/quality" className="btn btn-outline" style={{ padding: '0.85rem 1.75rem', fontSize: '1.05rem' }}>
            View Data Quality Panel
          </Link>
        </div>
      </section>

      {/* Disparate Systems Connected */}
      <section style={{ margin: '2rem 0 3rem' }}>
        <div className="card" style={{ background: '#ffffff', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.25rem', textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
            Simulated Source Systems Integrated via Master Patient Index
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-sm)', background: 'var(--src-hosp-bg)', border: '1px solid var(--src-hosp-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🏥</span>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--src-hosp-text)' }}>Hospital A (Inpatient)</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--src-hosp-text)', opacity: 0.9 }}>
                Holds acute encounter diagnoses, vital observation panels, medication orders, and critical allergies.
                Local MRN format: <code>HA-99214</code>.
              </p>
            </div>

            <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-sm)', background: 'var(--src-clinic-bg)', border: '1px solid var(--src-clinic-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🩺</span>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--src-clinic-text)' }}>Clinic B (Ambulatory)</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--src-clinic-text)', opacity: 0.9 }}>
                Holds longitudinal chronic care records (Diabetes, HbA1c lab panels, immunizations).
                Local MRN format: <code>CB-41008</code>.
              </p>
            </div>

            <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-sm)', background: 'var(--src-payer-bg)', border: '1px solid var(--src-payer-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>💳</span>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--src-payer-text)' }}>Payer C (Insurance)</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--src-payer-text)', opacity: 0.9 }}>
                Holds claim reimbursement history, insurance coverage benefits, and service utilization data.
                Member ID format: <code>PC-881920</code>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How Consent Works Section */}
      <section style={{ margin: '3rem 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>How Patient-Centric Consent Works</h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', maxWidth: '720px', margin: '0 auto' }}>
            Every single read request must pass through our deterministic 4-stage security gate. 
            Data is never leaked, merged blindly, or accessed without explicit authorization.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ position: 'relative' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '1rem' }}>
              1
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Authentication & RBAC</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
              The requester identity is authenticated using short-lived JWTs. System verifies role permissions 
              (Clinician, Payer, Patient, Admin, or Auditor).
            </p>
          </div>

          <div className="card">
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '1rem' }}>
              2
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Consent Verification</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
              The engine queries active FHIR Consent records. Checks grantee (user, organization, or role), 
              allowed resource types, stated purpose, and expiration timestamp.
            </p>
          </div>

          <div className="card">
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '1rem' }}>
              3
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Unified Aggregation</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
              Only consented FHIR resources are decrypted and returned. Each entry is tagged with its 
              originating source system and calculated data freshness badge.
            </p>
          </div>

          <div className="card">
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#d97706', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '1rem' }}>
              4
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Forensic Audit Trail</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.5 }}>
              Whether the request is allowed or denied, an SHA-256 hash-chained entry is appended to the 
              immutable audit log, capturing user, role, patient, outcome, and timestamp.
            </p>
          </div>
        </div>
      </section>

      {/* Break-Glass Protocol Banner */}
      <section style={{ margin: '2rem 0' }}>
        <div className="alert alert-warning" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '2rem', marginRight: '0.5rem' }}>🚨</div>
          <div>
            <h4 style={{ fontSize: '1.1rem', color: 'var(--warning-text)', marginBottom: '0.35rem' }}>
              Emergency Break-Glass Protocol
            </h4>
            <p style={{ fontSize: '0.925rem', color: 'var(--warning-text)', lineHeight: 1.5 }}>
              In acute life-threatening situations where a patient cannot grant consent, licensed clinicians can 
              invoke emergency <strong>Break-Glass Access</strong> with mandatory clinical justification. 
              The event triggers real-time alerts and high-priority compliance audit flags.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
