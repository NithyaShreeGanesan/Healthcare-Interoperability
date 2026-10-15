import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MOCK_USERS } from '../mocks/mockData';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('dr.smith@metrohealth.org');
  const [password, setPassword] = useState('Clinician@123');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const redirectByRole = (role) => {
    // If user arrived from an attempted protected route, return there
    if (location.state?.from?.pathname) {
      return navigate(location.state.from.pathname);
    }
    // Role-based default destination
    switch (role) {
      case 'patient':
        navigate('/consent');
        break;
      case 'clinician':
      case 'payer':
        navigate('/records');
        break;
      case 'admin':
        navigate('/upload');
        break;
      case 'auditor':
        navigate('/audit');
        break;
      default:
        navigate('/records');
    }
  };

  const validate = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please provide a valid email format (e.g. user@org.com).';
    }
    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters long.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      redirectByRole(loggedUser.role);
    } catch (err) {
      setServerError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoUser = (userObj) => {
    setEmail(userObj.email);
    setPassword('Password@123');
    setErrors({});
    setServerError('');
  };

  return (
    <div style={{ maxWidth: '480px', margin: '2rem auto' }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div className="nav-brand-icon" style={{ margin: '0 auto 0.75rem', width: '48px', height: '48px', fontSize: '1.5rem' }}>
            ⚕
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>Sign In to HealthInterop</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enter your credentials or choose a pre-configured demo account below.
          </p>
        </div>

        {serverError && (
          <div className="alert alert-danger" role="alert">
            <span>⚠️</span>
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email Address <span className="required">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              placeholder="e.g. dr.smith@metrohealth.org"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              autoComplete="email"
              disabled={loading}
            />
            {errors.email && <div className="form-error">⚠️ {errors.email}</div>}
          </div>

          {/* Password Field with Show/Hide toggle */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="login-password">
                Password <span className="required">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-blue)',
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showPassword ? 'Hide password' : 'Show password'}
              </button>
            </div>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: null });
              }}
              autoComplete="current-password"
              disabled={loading}
            />
            {errors.password && <div className="form-error">⚠️ {errors.password}</div>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span> Authenticating...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Selector */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Quick Demo Accounts (Click to Fill):
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {MOCK_USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                className="btn btn-outline btn-sm"
                style={{
                  justifyContent: 'space-between',
                  padding: '0.45rem 0.75rem',
                  border: email === u.email ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-color)',
                  background: email === u.email ? 'var(--primary-50)' : '#ffffff'
                }}
                onClick={() => handleSelectDemoUser(u)}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{u.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                </div>
                <span className={`role-tag role-${u.role}`}>{u.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
