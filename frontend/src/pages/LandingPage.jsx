import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Floating Bar state
  const [selectedService, setSelectedService] = useState('Cardiology & Vitals');
  const [selectedSystem, setSelectedSystem] = useState('All Systems (MPI Unified)');
  const [patientQuery, setPatientQuery] = useState('MP-83921 (Jane Doe)');

  // Interactive Services Section active item
  const [activeSpecialty, setActiveSpecialty] = useState('Cardiology');

  const specialties = [
    {
      id: 'Cardiology',
      name: 'Cardiology',
      desc: 'Hypertension management, systolic & diastolic blood pressure monitoring, and cardiovascular vital observation panels.'
    },
    {
      id: 'Anaesthesiology',
      name: 'Anaesthesiology',
      desc: 'Pre-operative risk stratification, critical penicillin allergy detection, and emergency break-glass clinical overrides.'
    },
    {
      id: 'Bariatric Surgery',
      name: 'Bariatric Surgery',
      desc: 'Inpatient surgical tracking, longitudinal BMI metrics, and cross-system medication reconciliation.'
    },
    {
      id: 'Blood Bank',
      name: 'Blood Bank',
      desc: 'ABO/Rh blood typing verification and automatic detection of conflicting blood type records between facilities.'
    },
    {
      id: 'Endocrinology',
      name: 'Endocrinology & Diabetology',
      desc: 'Fasting blood glucose surveillance, HbA1c lab panels, and active Metformin prescription tracking across payers.'
    },
    {
      id: 'Oncology',
      name: 'Medical Oncology',
      desc: 'Multidisciplinary diagnostic reports, biopsy pathology, and patient consent-governed genomic data sharing.'
    }
  ];

  const handleQuickBook = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate('/records');
    } else {
      navigate('/login');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* ====================================================================
          HERO SECTION (Matches Dr. Template top card)
          ==================================================================== */}
      <section className="dr-hero-wrapper">
        <div className="dr-hero-card">
          <div className="dr-hero-content">
            {/* Left Column Text */}
            <div>
              <div className="dr-hero-badge">
                <span>🛡️ PS-013 Healthcare Interoperability</span>
                <span>•</span>
                <span>HL7 FHIR R4 Standard</span>
              </div>

              <h1 className="dr-hero-title">
                A Great Place care for <br />
                <span className="highlight">yourself</span>
              </h1>

              <p className="dr-hero-desc">
                Medical recovery is most focused in helping you discover your most beautiful smile.
                A unified, consent-gated health data exchange connecting Hospital A, Clinic B, and Payer C
                into a single cryptographic FHIR R4 record.
              </p>

              <div>
                {isAuthenticated ? (
                  <Link to="/records" className="btn-dr-pill-white" style={{ fontSize: '1.05rem', padding: '0.8rem 2rem' }}>
                    <span>Book Appointment</span>
                    <span>→</span>
                  </Link>
                ) : (
                  <Link to="/login" className="btn-dr-pill-white" style={{ fontSize: '1.05rem', padding: '0.8rem 2rem' }}>
                    <span>Book Appointment</span>
                    <span>→</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Right Column Doctor Image */}
            <div className="dr-hero-image-box">
              <img
                src="/assets/hero_doctors.jpg"
                alt="Medical Team of Doctors"
                className="dr-hero-img"
              />
            </div>
          </div>
        </div>

        {/* Floating Quick-Action Appointment / Service Bar */}
        <form className="dr-floating-bar" onSubmit={handleQuickBook}>
          <div className="dr-bar-col">
            <span className="dr-bar-label">Choose Services</span>
            <select
              className="dr-bar-select"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
            >
              <option value="Heart Problem">Heart Problem (Cardiology)</option>
              <option value="Cardiology & Vitals">Cardiology & Vitals (I10)</option>
              <option value="Allergy Intolerance">Allergy Intolerance (Penicillin)</option>
              <option value="Endocrinology & Glucose">Endocrinology & Glucose (E11.9)</option>
              <option value="Patient Consent Directives">Patient Consent Directives</option>
              <option value="Forensic Audit Trail">Forensic Audit Trail</option>
            </select>
          </div>

          <div className="dr-bar-col">
            <span className="dr-bar-label">Choose Date / System</span>
            <select
              className="dr-bar-select"
              value={selectedSystem}
              onChange={(e) => setSelectedSystem(e.target.value)}
            >
              <option value="All Systems (MPI Unified)">All Systems (MPI Unified)</option>
              <option value="Hospital A (Inpatient)">Hospital A (Inpatient HA-90123)</option>
              <option value="Clinic B (Ambulatory)">Clinic B (Ambulatory CB-55410)</option>
              <option value="Payer C (Insurance Claims)">Payer C (Insurance Claims PC-77192)</option>
            </select>
          </div>

          <div className="dr-bar-col">
            <span className="dr-bar-label">Contact Number / ID</span>
            <input
              type="text"
              className="dr-bar-input"
              value={patientQuery}
              onChange={(e) => setPatientQuery(e.target.value)}
              placeholder="+91 968 727 9122 or MP-83921"
            />
          </div>

          <div>
            <button type="submit" className="btn-dr-pill-teal">
              <span>Book Appointment</span>
            </button>
          </div>
        </form>
      </section>

      {/* ====================================================================
          SERVICES SECTION (Matches Dr. Template second section)
          Deep teal surgical backdrop with interactive specialty list
          ==================================================================== */}
      <section
        id="services"
        className="dr-services-section"
        style={{ backgroundImage: `url('/assets/clinical_backdrop.jpg')` }}
      >
        <div className="dr-services-overlay">
          {/* Left Text */}
          <div className="dr-services-left">
            <h2>See what we provide to keep you healthy</h2>
            <p>
              With World-class Preventive, Prescriptive & Curative Medical Practices Sterling has been
              at the helm of Nurturing Healthy Living Since the Turn of the New Century.
              Every clinical query is governed by patient consent, cryptographic field encryption, and
              instant forensic audit logging.
            </p>

            <div className="dr-scroll-indicator">
              <div className="dr-scroll-pill"></div>
              <span>Explore Specialties</span>
            </div>
          </div>

          {/* Right Specialty List */}
          <div className="dr-service-list">
            {specialties.map((spec) => (
              <div
                key={spec.id}
                className={`dr-service-item ${activeSpecialty === spec.id ? 'active' : ''}`}
                onClick={() => setActiveSpecialty(spec.id)}
              >
                <div className="dr-service-title">
                  <span>{spec.name}</span>
                  <span style={{ fontSize: '1.1rem', opacity: activeSpecialty === spec.id ? 1 : 0.5 }}>
                    {activeSpecialty === spec.id ? '●' : '›'}
                  </span>
                </div>
                {activeSpecialty === spec.id && (
                  <p className="dr-service-desc">{spec.desc}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          CIRCULAR METRICS / STATS SECTION (Matches Dr. Template circular stats)
          ==================================================================== */}
      <section id="metrics" className="dr-stats-section">
        <div className="dr-stats-grid">
          <div className="dr-stat-card">
            <div className="dr-stat-circle">
              <span className="dr-stat-number">67+</span>
            </div>
            <h3 className="dr-stat-title">Qualified Doctors</h3>
            <p className="dr-stat-sub">Medical experts present in our integrated clinic network.</p>
          </div>

          <div className="dr-stat-card">
            <div className="dr-stat-circle">
              <span className="dr-stat-number">99%</span>
            </div>
            <h3 className="dr-stat-title">Recover Patients</h3>
            <p className="dr-stat-sub">Deterministic and probabilistic identity resolution match accuracy.</p>
          </div>

          <div className="dr-stat-card">
            <div className="dr-stat-circle">
              <span className="dr-stat-number">98%</span>
            </div>
            <h3 className="dr-stat-title">Satisfaction Rate</h3>
            <p className="dr-stat-sub">Patient consent compliance across all diagnostic record queries.</p>
          </div>

          <div className="dr-stat-card">
            <div className="dr-stat-circle">
              <span className="dr-stat-number">100%</span>
            </div>
            <h3 className="dr-stat-title">Audit Integrity</h3>
            <p className="dr-stat-sub">Cryptographic SHA-256 hash chaining detecting unauthorized edits.</p>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SOURCE SYSTEMS INTEGRATED
          ==================================================================== */}
      <section id="about" style={{ margin: '3rem 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Simulated Source Systems Integrated via Master Patient Index
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '700px', margin: '0 auto' }}>
            Data is retrieved from disparate electronic health records in real-time, normalized to HL7 FHIR R4,
            and displayed with clear provenance badges and data freshness chips.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ background: 'var(--src-hosp-bg)', borderColor: 'var(--src-hosp-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.75rem' }}>🏥</span>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--src-hosp-text)' }}>Hospital A (Inpatient)</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--src-hosp-text)', opacity: 0.8 }}>Local MRN: HOSP-A-90123</span>
              </div>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--src-hosp-text)', lineHeight: 1.5 }}>
              Holds acute inpatient encounters, primary essential hypertension (I10), and systolic blood pressure observations.
            </p>
          </div>

          <div className="card" style={{ background: 'var(--src-clinic-bg)', borderColor: 'var(--src-clinic-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.75rem' }}>🩺</span>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--src-clinic-text)' }}>Clinic B (Ambulatory)</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--src-clinic-text)', opacity: 0.8 }}>Local MRN: CLN-B-55410</span>
              </div>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--src-clinic-text)', lineHeight: 1.5 }}>
              Holds ambulatory laboratory panels, fasting blood glucose (LOINC 1558-6), and life-critical Penicillin anaphylaxis records.
            </p>
          </div>

          <div className="card" style={{ background: 'var(--src-payer-bg)', borderColor: 'var(--src-payer-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.75rem' }}>💳</span>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--src-payer-text)' }}>Payer C (Insurance Claims)</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--src-payer-text)', opacity: 0.8 }}>Member ID: PAY-C-77192</span>
              </div>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--src-payer-text)', lineHeight: 1.5 }}>
              Holds pharmaceutical claim records (Metformin 500mg Oral Tablet) and coverage benefit authorizations.
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================================
          DR. CHECK OUT FOR MORE (Bottom Banner matching template footer)
          ==================================================================== */}
      <section style={{ margin: '3rem 0 2rem', textAlign: 'center' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, var(--teal-900) 0%, var(--teal-750) 100%)',
            borderRadius: '32px',
            padding: '3.5rem 2rem',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.15)', letterSpacing: '-1px', marginBottom: '0.25rem' }}>
            Dr.
          </div>
          <h2 style={{ fontSize: '2rem', color: '#ffffff', marginBottom: '1rem' }}>
            Check out for more
          </h2>
          <p style={{ maxWidth: '600px', margin: '0 auto 1.75rem', color: 'rgba(255, 255, 255, 0.85)', fontSize: '1.05rem' }}>
            Experience secure, consent-driven healthcare interoperability. Log in as a Clinician,
            Patient, Payer, Auditor, or Administrator to test each gated journey.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="btn-dr-pill-white" style={{ padding: '0.75rem 2.25rem', fontSize: '1rem' }}>
              Sign In to Platform
            </Link>
            <Link to="/quality" className="btn-dr-pill-outline" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
              View Data Quality Center
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
