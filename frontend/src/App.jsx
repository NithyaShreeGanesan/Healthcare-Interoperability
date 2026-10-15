import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PatientIntakePage from './pages/PatientIntakePage';
import ConsentPortalPage from './pages/ConsentPortalPage';
import RecordRequestPage from './pages/RecordRequestPage';
import BundleUploadPage from './pages/BundleUploadPage';
import DataQualityPage from './pages/DataQualityPage';
import AuditViewPage from './pages/AuditViewPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Clinical / Administrative Ingestion */}
              <Route
                path="/intake"
                element={
                  <ProtectedRoute allowedRoles={['clinician', 'admin']}>
                    <PatientIntakePage />
                  </ProtectedRoute>
                }
              />

              {/* Patient Consent Portal */}
              <Route
                path="/consent"
                element={
                  <ProtectedRoute allowedRoles={['patient', 'clinician', 'admin', 'auditor']}>
                    <ConsentPortalPage />
                  </ProtectedRoute>
                }
              />

              {/* Record Query & Request Portal (Gated by RBAC + Consent) */}
              <Route
                path="/records"
                element={
                  <ProtectedRoute allowedRoles={['clinician', 'payer', 'patient', 'admin', 'auditor']}>
                    <RecordRequestPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Bundle Upload */}
              <Route
                path="/upload"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'clinician']}>
                    <BundleUploadPage />
                  </ProtectedRoute>
                }
              />

              {/* Data Quality & Conflict Resolution Panel */}
              <Route
                path="/quality"
                element={
                  <ProtectedRoute>
                    <DataQualityPage />
                  </ProtectedRoute>
                }
              />

              {/* Audit Trail & Tamper Verification */}
              <Route
                path="/audit"
                element={
                  <ProtectedRoute allowedRoles={['auditor', 'patient', 'admin', 'clinician']}>
                    <AuditViewPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer style={{ borderTop: '1px solid var(--border-color)', background: '#ffffff', padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <strong>HealthInterop (PS-013)</strong> • Consent-Based Healthcare Interoperability Platform
              </div>
              <div>
                Standard: <strong>HL7 FHIR R4</strong> • Field-Level Cryptography • Synthetic Data Only (No PHI)
              </div>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
