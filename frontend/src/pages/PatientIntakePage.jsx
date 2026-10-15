import React, { useState } from 'react';
import { api } from '../api';
import SourceBadge from '../components/SourceBadge';

export default function PatientIntakePage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'female',
    phone: '',
    address: '',
    postalCode: '',
    mrn: '',
    sourceSystem: 'Hospital A'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [submittedFhir, setSubmittedFhir] = useState(null);
  const [serverError, setServerError] = useState('');

  // Form Validation
  const validate = () => {
    const errs = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required.';
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required.';

    // Date of Birth validation
    if (!formData.dob) {
      errs.dob = 'Date of birth is required.';
    } else {
      const parsedDate = new Date(formData.dob);
      if (isNaN(parsedDate.getTime())) {
        errs.dob = 'Please provide a valid date (YYYY-MM-DD).';
      } else if (parsedDate > new Date()) {
        errs.dob = 'Date of birth cannot be in the future.';
      }
    }

    // Phone validation
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (!phoneRegex.test(formData.phone.trim())) {
      errs.phone = 'Invalid phone format (e.g. (555) 234-5678 or 555-234-5678).';
    }

    if (!formData.address.trim()) errs.address = 'Street address is required.';
    if (!formData.postalCode.trim()) errs.postalCode = 'Postal code is required.';
    if (!formData.mrn.trim()) errs.mrn = 'Local MRN / Identifier is required.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setResult(null);

    if (!validate()) return;

    // Construct FHIR R4 Patient Resource
    const fhirPatient = {
      resourceType: 'Patient',
      id: `pt-${formData.sourceSystem.toLowerCase().replace(/\s+/g, '-')}-${formData.mrn}`,
      meta: {
        lastUpdated: new Date().toISOString(),
        source: formData.sourceSystem
      },
      identifier: [
        {
          use: 'usual',
          type: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                code: 'MR',
                display: 'Medical Record Number'
              }
            ]
          },
          system: `http://${formData.sourceSystem.toLowerCase().replace(/\s+/g, '')}.org/mrn`,
          value: formData.mrn
        }
      ],
      active: true,
      name: [
        {
          use: 'official',
          family: formData.lastName,
          given: [formData.firstName]
        }
      ],
      telecom: [
        {
          system: 'phone',
          value: formData.phone,
          use: 'mobile'
        }
      ],
      gender: formData.gender,
      birthDate: formData.dob,
      address: [
        {
          use: 'home',
          line: [formData.address],
          postalCode: formData.postalCode
        }
      ]
    };

    setSubmittedFhir(fhirPatient);
    setLoading(true);

    try {
      const response = await api.ingestPatient(fhirPatient, formData.sourceSystem);
      setResult(response);
    } catch (err) {
      setServerError(err.message || 'Failed to ingest patient into integration layer.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setFormData({
      firstName: 'Jane',
      lastName: 'Doe',
      dob: '1985-04-12',
      gender: 'female',
      phone: '(555) 234-5678',
      address: '742 Evergreen Terrace',
      postalCode: '97477',
      mrn: `HA-${Math.floor(10000 + Math.random() * 90000)}`,
      sourceSystem: 'Hospital A'
    });
    setErrors({});
    setResult(null);
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>Patient Demographic Intake</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Standardized HL7 FHIR R4 demographic ingestion into Master Patient Index (MPI).
            </p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={handleFillDemo}>
            ⚡ Auto-Fill Sample Data
          </button>
        </div>

        {serverError && (
          <div className="alert alert-danger" role="alert">
            <span>⚠️</span>
            <span>{serverError}</span>
          </div>
        )}

        {result && (
          <div className="alert alert-success" style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>✅</span>
              <strong style={{ fontSize: '1.05rem' }}>Patient Successfully Ingested & Link Matched!</strong>
            </div>
            <div style={{ fontSize: '0.925rem', marginTop: '0.5rem', lineHeight: 1.6 }}>
              <div>• <strong>Master Patient ID:</strong> <code>{result.master_patient_id}</code></div>
              <div>• <strong>MPI Match Score:</strong> {result.match_score * 100}% ({result.match_status.toUpperCase()})</div>
              <div>• <strong>FHIR Ingested ID:</strong> <code>{result.fhir_id}</code></div>
              <div>• <strong>Source Link:</strong> <SourceBadge system={formData.sourceSystem} /></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Source System & Identifier Row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="sourceSystem">
                Originating Source System <span className="required">*</span>
              </label>
              <select
                id="sourceSystem"
                name="sourceSystem"
                className="form-control"
                value={formData.sourceSystem}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="Hospital A">Hospital A (Inpatient Acute)</option>
                <option value="Clinic B">Clinic B (Ambulatory Health)</option>
                <option value="Payer C">Payer C (Healthcare Benefits)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mrn">
                Local System MRN / Identifier <span className="required">*</span>
              </label>
              <input
                id="mrn"
                name="mrn"
                type="text"
                className={`form-control ${errors.mrn ? 'is-invalid' : ''}`}
                placeholder="e.g. HA-99214"
                value={formData.mrn}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.mrn && <div className="form-error">⚠️ {errors.mrn}</div>}
            </div>
          </div>

          {/* Name Row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="firstName">
                First Given Name <span className="required">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                placeholder="e.g. Jane"
                value={formData.firstName}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.firstName && <div className="form-error">⚠️ {errors.firstName}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="lastName">
                Family / Last Name <span className="required">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                placeholder="e.g. Doe"
                value={formData.lastName}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.lastName && <div className="form-error">⚠️ {errors.lastName}</div>}
            </div>
          </div>

          {/* DOB & Gender Row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="dob">
                Date of Birth (YYYY-MM-DD) <span className="required">*</span>
              </label>
              <input
                id="dob"
                name="dob"
                type="date"
                className={`form-control ${errors.dob ? 'is-invalid' : ''}`}
                value={formData.dob}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.dob && <div className="form-error">⚠️ {errors.dob}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="gender">
                Administrative Gender <span className="required">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                className="form-control"
                value={formData.gender}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                Phone Number <span className="required">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                placeholder="(555) 234-5678"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.phone && <div className="form-error">⚠️ {errors.phone}</div>}
            </div>
          </div>

          {/* Address Row */}
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label" htmlFor="address">
                Street Address <span className="required">*</span>
              </label>
              <input
                id="address"
                name="address"
                type="text"
                className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                placeholder="e.g. 742 Evergreen Terrace"
                value={formData.address}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.address && <div className="form-error">⚠️ {errors.address}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="postalCode">
                Postal Code <span className="required">*</span>
              </label>
              <input
                id="postalCode"
                name="postalCode"
                type="text"
                className={`form-control ${errors.postalCode ? 'is-invalid' : ''}`}
                placeholder="e.g. 97477"
                value={formData.postalCode}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.postalCode && <div className="form-error">⚠️ {errors.postalCode}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span> Building FHIR & Ingesting...
                </>
              ) : (
                'Generate FHIR Patient & Ingest →'
              )}
            </button>
          </div>
        </form>

        {/* Collapsible/Display of submitted FHIR JSON */}
        {submittedFhir && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Generated HL7 FHIR R4 Patient Payload:
            </h2>
            <pre className="json-preview">{JSON.stringify(submittedFhir, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
