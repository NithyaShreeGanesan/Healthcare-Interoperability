import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRoleQuickSwitch = (e) => {
    const role = e.target.value;
    if (role) {
      switchDemoRole(role);
      // Navigate to the role's primary view
      if (role === 'patient') navigate('/consent');
      else if (role === 'clinician' || role === 'payer') navigate('/records');
      else if (role === 'admin') navigate('/upload');
      else if (role === 'auditor') navigate('/audit');
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="nav-brand">
          <div className="nav-brand-icon">⚕</div>
          <div>
            <span>HealthInterop</span>
            <span style={{ fontSize: '0.72rem', display: 'block', color: 'var(--text-muted)', fontWeight: 400 }}>
              PS-013 FHIR R4 Platform
            </span>
          </div>
        </Link>

        {isAuthenticated && (
          <nav aria-label="Main Navigation">
            <ul className="nav-links">
              <li>
                <NavLink to="/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  Record Request
                </NavLink>
              </li>
              <li>
                <NavLink to="/consent" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  Consent Portal
                </NavLink>
              </li>
              <li>
                <NavLink to="/intake" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  Patient Intake
                </NavLink>
              </li>
              <li>
                <NavLink to="/quality" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  Data Quality
                </NavLink>
              </li>
              <li>
                <NavLink to="/upload" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  Bundle Upload
                </NavLink>
              </li>
              <li>
                <NavLink to="/audit" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  Audit Trail
                </NavLink>
              </li>
            </ul>
          </nav>
        )}

        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              {/* Quick Role Switcher for Hackathon Evaluation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} title="Quick switch roles for testing">
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Role:</span>
                <select
                  className="form-control"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.82rem', width: 'auto' }}
                  value={user.role}
                  onChange={handleRoleQuickSwitch}
                  aria-label="Switch Role"
                >
                  <option value="clinician">Clinician (Dr. Smith)</option>
                  <option value="payer">Payer (Blue Cross)</option>
                  <option value="patient">Patient (Jane Doe)</option>
                  <option value="admin">Admin (System Admin)</option>
                  <option value="auditor">Auditor (Compliance)</option>
                </select>
              </div>

              <div className="user-profile-badge">
                <span className={`role-tag role-${user.role}`}>{user.role}</span>
                <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{user.name || user.email}</span>
              </div>

              <button
                className="btn btn-outline btn-sm"
                onClick={handleLogout}
                title="Sign out of current session"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
