import React, { useState } from 'react';
import { api } from '../api';
import { SAMPLE_FHIR_BUNDLE } from '../mocks/mockData';
import SourceBadge from '../components/SourceBadge';

export default function BundleUploadPage() {
  const [sourceSystem, setSourceSystem] = useState('Hospital A');
  const [inputMode, setInputMode] = useState('paste'); // 'paste' or 'upload'
  const [jsonText, setJsonText] = useState(JSON.stringify(SAMPLE_FHIR_BUNDLE, null, 2));
  const [fileName, setFileName] = useState('');

  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ingestResponse, setIngestResponse] = useState(null);
  const [serverError, setServerError] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setValidationError('Please upload a valid .json file.');
      return;
    }

    setFileName(file.name);
    setValidationError('');
    setValidationResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        setJsonText(text);
        validateJsonContent(text);
      } catch (err) {
        setValidationError(`Failed to read file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const validateJsonContent = (textToValidate) => {
    setValidationError('');
    setValidationResult(null);
    setIngestResponse(null);

    if (!textToValidate.trim()) {
      setValidationError('JSON content cannot be empty.');
      return null;
    }

    try {
      const parsed = JSON.parse(textToValidate);

      if (parsed.resourceType !== 'Bundle') {
        setValidationError(`Invalid Root Element: Expected resourceType 'Bundle', found '${parsed.resourceType || 'None'}'.`);
        return null;
      }

      if (!Array.isArray(parsed.entry)) {
        setValidationError("Invalid Bundle Structure: 'entry' must be an array of FHIR resources.");
        return null;
      }

      // Analyze entries
      const resourceTypeCounts = {};
      const entries = parsed.entry;
      let validCount = 0;
      let invalidCount = 0;

      entries.forEach((entry, idx) => {
        const res = entry.resource;
        if (res && res.resourceType) {
          validCount++;
          resourceTypeCounts[res.resourceType] = (resourceTypeCounts[res.resourceType] || 0) + 1;
        } else {
          invalidCount++;
        }
      });

      const summary = {
        totalEntries: entries.length,
        validCount,
        invalidCount,
        resourceTypeCounts,
        bundleType: parsed.type || 'collection',
        parsedObject: parsed
      };

      setValidationResult(summary);
      return summary;
    } catch (err) {
      setValidationError(`JSON Syntax Error: ${err.message}`);
      return null;
    }
  };

  const handleValidateClick = () => {
    validateJsonContent(jsonText);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    let validated = validationResult;
    if (!validated) {
      validated = validateJsonContent(jsonText);
    }

    if (!validated || validated.invalidCount > 0 && validated.validCount === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.ingestBundle(validated.parsedObject, sourceSystem);
      setIngestResponse(res);
    } catch (err) {
      setServerError(err.message || 'Ingestion failed on integration pipeline.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadSample = () => {
    const formatted = JSON.stringify(SAMPLE_FHIR_BUNDLE, null, 2);
    setJsonText(formatted);
    validateJsonContent(formatted);
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>FHIR R4 Bundle Ingestion Engine</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Batch ingest synthetic EHR bundles from Hospital A, Clinic B, or Payer C.
            </p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={handleLoadSample}>
            📥 Load Sample Synthea Bundle
          </button>
        </div>

        {serverError && (
          <div className="alert alert-danger" role="alert">
            <span>⚠️</span>
            <span>{serverError}</span>
          </div>
        )}

        {/* INGESTION RESULT STATUS */}
        {ingestResponse && (
          <div className="alert alert-success" style={{ display: 'block', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🎉</span>
              <strong style={{ fontSize: '1.05rem' }}>Bundle Ingestion Complete!</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '0.75rem', background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Source System</span>
                <div><SourceBadge system={ingestResponse.source_system} /></div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Accepted Resources</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success-solid)' }}>
                  {ingestResponse.accepted}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rejected Resources</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: ingestResponse.rejected > 0 ? 'var(--danger-solid)' : 'var(--text-muted)' }}>
                  {ingestResponse.rejected}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Batch Ingestion ID</span>
                <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{ingestResponse.batch_id}</div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Source System */}
          <div className="form-group">
            <label className="form-label" htmlFor="source-system">
              Originating Source System <span className="required">*</span>
            </label>
            <select
              id="source-system"
              className="form-control"
              value={sourceSystem}
              onChange={(e) => setSourceSystem(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="Hospital A">Hospital A (Inpatient Acute Care)</option>
              <option value="Clinic B">Clinic B (Ambulatory Health)</option>
              <option value="Payer C">Payer C (Insurance & Claims System)</option>
            </select>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button
              type="button"
              className={`btn btn-sm ${inputMode === 'paste' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setInputMode('paste')}
            >
              Paste Raw JSON
            </button>
            <button
              type="button"
              className={`btn btn-sm ${inputMode === 'upload' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setInputMode('upload')}
            >
              Upload .json File
            </button>
          </div>

          {/* Upload File Input */}
          {inputMode === 'upload' && (
            <div className="form-group" style={{ border: '2px dashed var(--border-color)', padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius-md)' }}>
              <input
                id="file-upload"
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload" className="btn btn-outline" style={{ cursor: 'pointer' }}>
                📁 Choose FHIR R4 Bundle .json File
              </label>
              {fileName && (
                <div style={{ marginTop: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)' }}>
                  Loaded: {fileName}
                </div>
              )}
            </div>
          )}

          {/* Paste JSON Textarea */}
          {inputMode === 'paste' && (
            <div className="form-group">
              <label className="form-label" htmlFor="json-payload">
                FHIR R4 Bundle Payload (JSON) <span className="required">*</span>
              </label>
              <textarea
                id="json-payload"
                className={`form-control ${validationError ? 'is-invalid' : ''}`}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                rows="12"
                placeholder='{ "resourceType": "Bundle", "type": "collection", "entry": [...] }'
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Inline Validation Error */}
          {validationError && (
            <div className="alert alert-danger" style={{ marginTop: '0.5rem' }}>
              <span>⚠️</span>
              <span>{validationError}</span>
            </div>
          )}

          {/* Client-Side Validation Feedback */}
          {validationResult && (
            <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--success-solid)', fontSize: '0.925rem' }}>
                  ✓ Client-Side Bundle Schema Validated
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Bundle Type: <code>{validationResult.bundleType}</code>
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-body)' }}>
                Contains <strong>{validationResult.totalEntries} entries</strong>:
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                  {Object.entries(validationResult.resourceTypeCounts).map(([type, count]) => (
                    <span
                      key={type}
                      style={{
                        background: '#ffffff',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.8rem'
                      }}
                    >
                      {type}: <strong>{count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleValidateClick}
              disabled={isSubmitting}
            >
              🔍 Validate Schema in Browser
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span> Ingesting into Integration Layer...
                </>
              ) : (
                'Upload & Ingest Bundle →'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
