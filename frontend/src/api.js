/**
 * Central API Client for Healthcare Interoperability Platform (PS-013)
 * Handles JWT in memory + sessionStorage, 401 logout, 403 access blocked,
 * and realistic mock fallback switch (USE_MOCKS).
 *
 * PHI SAFETY: Never stores PHI in localStorage or logs PHI to the browser console.
 */

import {
  MOCK_USERS,
  MOCK_PATIENTS,
  MOCK_CONSENTS,
  MOCK_RECORDS,
  MOCK_DATA_ISSUES,
  MOCK_AUDIT_LOGS
} from './mocks/mockData';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:5000';
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

// Token and User session state (In-memory + sessionStorage only; NO PHI stored)
let inMemoryToken = sessionStorage.getItem('auth_jwt_token') || null;
let inMemoryUser = null;
try {
  const cachedUser = sessionStorage.getItem('auth_user_meta');
  if (cachedUser) {
    inMemoryUser = JSON.parse(cachedUser);
  }
} catch {
  inMemoryUser = null;
}

// In-memory mock database state for interactive actions during this session
let activeMockConsents = [...MOCK_CONSENTS];
let activeMockAudits = [...MOCK_AUDIT_LOGS];

// Subscribers for global security events
let onUnauthorizedCb = null;
let onForbiddenCb = null;

export function registerSecurityCallbacks({ onUnauthorized, onForbidden }) {
  onUnauthorizedCb = onUnauthorized;
  onForbiddenCb = onForbidden;
}

export function setAuthSession(token, user) {
  inMemoryToken = token;
  inMemoryUser = user;
  if (token) {
    sessionStorage.setItem('auth_jwt_token', token);
  } else {
    sessionStorage.removeItem('auth_jwt_token');
  }

  if (user) {
    // Only store safe metadata: role, email, org, name, linked_patient_id (no medical records)
    const safeUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      org: user.org,
      linked_patient_id: user.linked_patient_id
    };
    sessionStorage.setItem('auth_user_meta', JSON.stringify(safeUser));
  } else {
    sessionStorage.removeItem('auth_user_meta');
  }
}

export function clearAuthSession() {
  inMemoryToken = null;
  inMemoryUser = null;
  sessionStorage.removeItem('auth_jwt_token');
  sessionStorage.removeItem('auth_user_meta');
}

export function getAuthToken() {
  return inMemoryToken;
}

export function getCurrentUser() {
  return inMemoryUser;
}

/**
 * Underlying fetch with authentication header and security interceptors
 */
async function clientFetch(endpoint, options = {}) {
  if (USE_MOCKS) {
    // Artificial small latency to simulate authentic network roundtrip
    await new Promise((resolve) => setTimeout(resolve, 350));
    return handleMockRequest(endpoint, options);
  }

  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (inMemoryToken) {
    headers['Authorization'] = `Bearer ${inMemoryToken}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      clearAuthSession();
      if (onUnauthorizedCb) onUnauthorizedCb();
      throw new Error('Session expired or unauthorized. Please sign in again.');
    }

    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      if (onForbiddenCb) onForbiddenCb(errorData);
      const err = new Error(errorData.message || 'Access Denied: Read gated by RBAC or patient consent.');
      err.isAccessBlocked = true;
      err.reason = errorData.reason;
      throw err;
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('Failed to fetch') && !USE_MOCKS) {
      // If backend is not running, log a non-PHI warning and inform caller
      throw new Error(`Unable to connect to backend server at ${BASE_URL}. Ensure server is running or set VITE_USE_MOCKS=true.`);
    }
    throw error;
  }
}

/**
 * Mock Request Handler
 */
function handleMockRequest(endpoint, options) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : null;

  // 1. Auth Login
  if (endpoint === '/api/auth/login' && method === 'POST') {
    const { email, password } = body || {};
    const matched = MOCK_USERS.find((u) => u.email.toLowerCase() === (email || '').toLowerCase().trim());
    if (matched) {
      const fakeToken = `mock-jwt-${matched.role}-${Date.now()}`;
      return {
        token: fakeToken,
        user: matched
      };
    }
    // Generic fallback for any email if needed
    const defaultUser = {
      id: 99,
      email: email || 'user@example.com',
      role: 'clinician',
      name: 'Dr. Clinical Provider',
      org: 'Hospital A',
      linked_patient_id: null
    };
    return {
      token: `mock-jwt-clinician-${Date.now()}`,
      user: defaultUser
    };
  }

  // 2. Health check
  if (endpoint === '/api/health') {
    return { status: 'ok', db: 'up', mock: true };
  }

  // 3. Patient Ingest (Single Demographic intake)
  if (endpoint === '/api/ingest' && method === 'POST') {
    const isBundle = body && body.resourceType === 'Bundle';
    if (isBundle) {
      const totalEntries = body.entry ? body.entry.length : 0;
      return {
        status: 'success',
        message: 'FHIR Bundle ingested successfully into Master Patient Index',
        total_resources: totalEntries,
        accepted: totalEntries,
        rejected: 0,
        source_system: options.headers?.['X-Source-System'] || 'Hospital A',
        batch_id: `BATCH-${Date.now()}`
      };
    }

    const generatedId = `MP-${Math.floor(10000 + Math.random() * 90000)}`;
    return {
      status: 'success',
      master_patient_id: generatedId,
      fhir_id: `patient-${Date.now()}`,
      match_status: 'auto',
      match_score: 0.98,
      message: 'Patient registered and mapped to Master Patient Index (MPI).'
    };
  }

  // 4. Consents List
  if (endpoint.startsWith('/api/consents') && method === 'GET') {
    return { consents: activeMockConsents };
  }

  // 5. Create Consent
  if (endpoint === '/api/consents' && method === 'POST') {
    const newConsent = {
      id: `CNS-${Math.floor(100 + Math.random() * 900)}`,
      master_patient_id: body.master_patient_id || 'MP-83921',
      grantee_type: body.grantee_type,
      grantee_id: body.grantee_id,
      grantee_display: body.grantee_display || body.grantee_id,
      resource_types: body.resource_types || [],
      purpose: body.purpose || 'treatment',
      status: 'active',
      valid_from: new Date().toISOString(),
      valid_to: body.valid_to || new Date(Date.now() + 180 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      revoked_at: null
    };
    activeMockConsents = [newConsent, ...activeMockConsents];

    // Log to audit
    activeMockAudits.unshift({
      id: activeMockAudits.length + 1001,
      ts: new Date().toISOString(),
      user_email: inMemoryUser ? inMemoryUser.email : 'patient@interop.org',
      role: inMemoryUser ? inMemoryUser.role : 'patient',
      action: 'CONSENT_GRANT',
      resource_type: 'Consent',
      master_patient_id: newConsent.master_patient_id,
      outcome: 'allowed',
      reason: `Patient granted consent to ${newConsent.grantee_display}`,
      ip: '127.0.0.1',
      prev_hash: activeMockAudits[0]?.entry_hash || '0000000000000000',
      entry_hash: `sha256-hash-${Date.now().toString(16)}`
    });

    return { status: 'success', consent: newConsent };
  }

  // 6. Revoke Consent
  if (endpoint.startsWith('/api/consents/') && method === 'DELETE') {
    const consentId = endpoint.split('/api/consents/')[1];
    activeMockConsents = activeMockConsents.map((c) =>
      c.id === consentId ? { ...c, status: 'revoked', revoked_at: new Date().toISOString() } : c
    );

    activeMockAudits.unshift({
      id: activeMockAudits.length + 1001,
      ts: new Date().toISOString(),
      user_email: inMemoryUser ? inMemoryUser.email : 'patient@interop.org',
      role: inMemoryUser ? inMemoryUser.role : 'patient',
      action: 'REVOKE',
      resource_type: 'Consent',
      master_patient_id: 'MP-83921',
      outcome: 'allowed',
      reason: `Patient revoked consent ID: ${consentId}`,
      ip: '127.0.0.1',
      prev_hash: activeMockAudits[0]?.entry_hash || '0000000000000000',
      entry_hash: `sha256-hash-${Date.now().toString(16)}`
    });

    return { status: 'success', message: 'Consent revoked successfully' };
  }

  // 7. Record Request (Gated by RBAC, Consent, Audit)
  if (endpoint === '/api/records/request' && method === 'POST') {
    const { patientName, dob, resourceTypes, purpose, breakGlass, justification } = body || {};

    // Simulate Break-Glass Emergency
    if (breakGlass) {
      if (!justification || justification.trim().length < 10) {
        const err = new Error('Break-Glass emergency override requires a detailed clinical justification.');
        err.isValidation = true;
        throw err;
      }

      // Record emergency audit log
      activeMockAudits.unshift({
        id: activeMockAudits.length + 1001,
        ts: new Date().toISOString(),
        user_email: inMemoryUser ? inMemoryUser.email : 'clinician@hospital.org',
        role: inMemoryUser ? inMemoryUser.role : 'clinician',
        action: 'BREAK_GLASS',
        resource_type: (resourceTypes || []).join(', '),
        master_patient_id: 'MP-83921',
        outcome: 'allowed',
        reason: `EMERGENCY BREAK-GLASS: ${justification}`,
        ip: '192.168.1.100',
        prev_hash: activeMockAudits[0]?.entry_hash || '0000000000000000',
        entry_hash: `sha256-breakglass-${Date.now().toString(16)}`
      });

      const records = MOCK_RECORDS['MP-83921'].filter(
        (r) => !resourceTypes || resourceTypes.length === 0 || resourceTypes.includes(r.resourceType)
      );
      return {
        master_patient_id: 'MP-83921',
        patient: MOCK_PATIENTS[0],
        records,
        break_glass_active: true
      };
    }

    // Role Permission & Consent Simulation
    const currentRole = inMemoryUser?.role || 'clinician';

    // Payer restricted scenario
    if (currentRole === 'payer') {
      const unconsented = (resourceTypes || []).some(
        (rt) => rt === 'Observation' || rt === 'AllergyIntolerance'
      );
      if (unconsented) {
        const err = new Error('Access Denied: Read blocked by Patient Consent Policy.');
        err.isAccessBlocked = true;
        err.reason = 'Patient has not granted consent to role "payer" for clinical diagnostic observations or allergies.';
        err.consentStatus = 'no_consent';
        if (onForbiddenCb) onForbiddenCb({ reason: err.reason, status: 403 });
        throw err;
      }
    }

    // Default match to Jane Doe
    const patientMatch = MOCK_PATIENTS.find(
      (p) =>
        p.firstName.toLowerCase() === (patientName || '').toLowerCase().trim() ||
        p.lastName.toLowerCase() === (patientName || '').toLowerCase().trim()
    ) || MOCK_PATIENTS[0];

    const records = (MOCK_RECORDS[patientMatch.id] || MOCK_RECORDS['MP-83921']).filter(
      (r) => !resourceTypes || resourceTypes.length === 0 || resourceTypes.includes(r.resourceType)
    );

    // Record audit
    activeMockAudits.unshift({
      id: activeMockAudits.length + 1001,
      ts: new Date().toISOString(),
      user_email: inMemoryUser ? inMemoryUser.email : 'clinician@hospital.org',
      role: currentRole,
      action: 'READ',
      resource_type: (resourceTypes || []).join(', ') || 'ALL',
      master_patient_id: patientMatch.id,
      outcome: 'allowed',
      reason: `Clinical Record Request for purpose: ${purpose || 'treatment'}`,
      ip: '127.0.0.1',
      prev_hash: activeMockAudits[0]?.entry_hash || '0000000000000000',
      entry_hash: `sha256-${Date.now().toString(16)}`
    });

    return {
      master_patient_id: patientMatch.id,
      patient: patientMatch,
      records
    };
  }

  // 8. Data Issues / Conflicts
  if (endpoint === '/api/data-issues') {
    return { issues: MOCK_DATA_ISSUES };
  }

  // 9. Audit Logs
  if (endpoint.startsWith('/api/audit-logs')) {
    return { logs: activeMockAudits };
  }

  return { status: 'ok' };
}

// Exported public API methods
export const api = {
  healthCheck: () => clientFetch('/api/health'),
  login: (email, password) => clientFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  ingestPatient: (patientPayload, sourceSystem = 'Hospital A') =>
    clientFetch('/api/ingest', {
      method: 'POST',
      body: JSON.stringify(patientPayload),
      headers: { 'X-Source-System': sourceSystem }
    }),
  ingestBundle: (bundlePayload, sourceSystem = 'Hospital A') =>
    clientFetch('/api/ingest', {
      method: 'POST',
      body: JSON.stringify(bundlePayload),
      headers: { 'X-Source-System': sourceSystem }
    }),
  getConsents: (patientId) => clientFetch(`/api/consents?master_patient_id=${patientId || ''}`),
  createConsent: (consentData) => clientFetch('/api/consents', { method: 'POST', body: JSON.stringify(consentData) }),
  revokeConsent: (consentId) => clientFetch(`/api/consents/${consentId}`, { method: 'DELETE' }),
  requestRecords: (params) => clientFetch('/api/records/request', { method: 'POST', body: JSON.stringify(params) }),
  getDataIssues: () => clientFetch('/api/data-issues'),
  getAuditLogs: (filters = {}) => clientFetch('/api/audit-logs')
};

export default api;
