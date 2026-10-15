import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Role-Based Route Guard using react-router-dom
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
        <h2 style={{ marginBottom: '0.75rem', color: 'var(--danger-solid)' }}>Role Access Restricted</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Your current account role (<strong>{user.role}</strong>) does not hold authorization to access this view.
          Required roles: {allowedRoles.join(', ')}.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => window.history.back()}
        >
          Return to Previous Screen
        </button>
      </div>
    );
  }

  return children;
}
