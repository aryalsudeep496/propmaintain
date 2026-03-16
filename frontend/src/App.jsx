import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider }  from './context/AuthContext';
import {
  ProtectedRoute,
  RoleRoute,
  PublicOnlyRoute,
} from './components/auth/ProtectedRoute';

// Auth pages
import RegisterPage       from './pages/auth/RegisterPage';
import LoginPage          from './pages/auth/LoginPage';
import VerifyEmailPage    from './pages/auth/VerifyEmailPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage  from './pages/auth/ResetPasswordPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';

// Dashboard pages
import CustomerDashboard from './pages/dashboard/CustomerDashboard';

// Placeholder for pages not yet built
const PlaceholderPage = ({ title }) => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontFamily: "'DM Sans', sans-serif",
  }}>
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ color: '#1a3c5e' }}>{title}</h2>
      <p style={{ color: '#8a9bb0' }}>This page will be built in upcoming phases.</p>
    </div>
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'DM Sans', sans-serif; background: #f0f4f8; }
          @keyframes spin { to { transform: rotate(360deg); } }
          input:focus { outline: none; border-color: #1a3c5e !important; box-shadow: 0 0 0 3px rgba(26,60,94,0.12); }
          a:focus-visible, button:focus-visible { outline: 2px solid #1a3c5e; outline-offset: 2px; }
        `}</style>

        <Routes>
          {/* ── Public auth routes ── */}
          <Route
            path="/auth/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/auth/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/auth/forgot-password"
            element={
              <PublicOnlyRoute>
                <ForgotPasswordPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/auth/reset-password/:token"
            element={
              <PublicOnlyRoute>
                <ResetPasswordPage />
              </PublicOnlyRoute>
            }
          />

          {/* ── Email verification ── */}
          <Route path="/auth/verify-email/:token" element={<VerifyEmailPage />} />
          <Route path="/auth/resend-verification"  element={<PlaceholderPage title="Resend Verification" />} />

          {/* ── Customer dashboard ── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleRoute roles={['customer']}>
                  <CustomerDashboard />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* ── Provider dashboard ── */}
          <Route
            path="/provider/dashboard"
            element={
              <ProtectedRoute>
                <RoleRoute roles={['provider']}>
                  <PlaceholderPage title="Provider Dashboard" />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* ── Admin dashboard ── */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <RoleRoute roles={['admin']}>
                  <PlaceholderPage title="Admin Dashboard" />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* ── Change password ── */}
          <Route
            path="/account/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />

          {/* ── Default redirect ── */}
          <Route path="/"  element={<Navigate to="/auth/login" replace />} />
          <Route path="*"  element={<Navigate to="/auth/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;