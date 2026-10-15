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
      if (role === 'patient') navigate('/consent');
      else if (role === 'clinician' || role === 'payer') navigate('/records');
      else if (role === 'admin') navigate('/upload');
      else if (role === 'auditor') navigate('/audit');
    }
  };

  return (
    <header className="dr-navbar">
      <div className="dr-navbar-inner">
        {/* Brand / Logo */}
        <Link to="/" className="dr-brand" title="Healthcare Interoperability Platform">
          <span className="dr-brand-logo">
            Dr<span className="dot">.</span>
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.1, color: '#ffffff' }}>
              HealthInterop
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--teal-200)', letterSpacing: '0.5px' }}>
              HL7 FHIR R4 • PS-013
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav aria-label="Main Navigation">
          <ul className="dr-nav-menu">
            <li>
              <NavLink to="/" className={({ isActive }) => `dr-nav-link ${isActive ? 'active' : ''}`}>
                Home
              </NavLink>
            </li>
            {isAuthenticated ? (
              <>
                <li>
                  <NavLink to="/records" className={({ isActive }) => `dr-nav-link ${isActive ? 'active' : ''}`}>
                    Records
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/consent" className={({ isActive }) => `dr-nav-link ${isActive ? 'active' : ''}`}>
                    Consent Portal
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/quality" className={({ isActive }) => `dr-nav-link ${isActive ? 'active' : ''}`}>
                    Data Quality
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/audit" className={({ isActive }) => `dr-nav-link ${isActive ? 'active' : ''}`}>
                    Audit Trail
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/intake" className={({ isActive }) => `dr-nav-link ${isActive ? 'active' : ''}`}>
                    Intake
                  </NavLink>
                </li>
              </>
            ) : (
              <>
                <li>
                  <a href="#services" className="dr-nav-link">
                    Services
                  </a>
                </li>
                <li>
                  <a href="#metrics" className="dr-nav-link">
                    Impact
                  </a>
                </li>
                <li>
                  <a href="#about" className="dr-nav-link">
                    About
                  </a>
                </li>
              </>
            )}
          </ul>
        </nav>

        {/* Right Actions */}
        <div className="dr-nav-actions">
          {isAuthenticated ? (
            <>
              {/* Role Quick Switcher for Hackathon Evaluation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} title="Quick switch roles for testing">
                <span style={{ fontSize: '0.78rem', color: 'var(--teal-200)' }}>Role:</span>
                <select
                  className="form-control"
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.82rem',
                    width: 'auto',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                  value={user.role}
                  onChange={handleRoleQuickSwitch}
                  aria-label="Switch Role"
                >
                  <option value="clinician" style={{ color: '#000' }}>Clinician (Dr. Smith)</option>
                  <option value="payer" style={{ color: '#000' }}>Payer (Blue Cross)</option>
                  <option value="patient" style={{ color: '#000' }}>Patient (Jane Doe)</option>
                  <option value="admin" style={{ color: '#000' }}>Admin (System Admin)</option>
                  <option value="auditor" style={{ color: '#000' }}>Auditor (Compliance)</option>
                </select>
              </div>

              <div className="user-profile-badge">
                <span className={`role-tag role-${user.role}`}>{user.role}</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#ffffff' }}>
                  {user.name || user.email}
                </span>
              </div>

              <button
                className="btn-dr-pill-outline"
                onClick={handleLogout}
                title="Sign out of current session"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-dr-pill-white">
              <span>Sign In</span>
              <span>→</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
