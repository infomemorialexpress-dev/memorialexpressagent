import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InputField from '../../components/common/InputField.jsx';
import Button from '../../components/common/Button.jsx';
import { BrandFeatherIcon } from '../../components/common/Header.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useQuote } from '../../context/QuoteContext.jsx';

export default function AgentLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { login, isAuthenticated, isLoading } = useAuth();
  const { addToast } = useQuote();
  const navigate = useNavigate();

  // If already authenticated, redirect straight to the main quote funnel
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      const msg = 'Please enter both your email address and password.';
      setFormError(msg);
      addToast(msg, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(trimmedEmail, password);
      addToast(`Welcome back, ${result.user?.fullName || 'Agent'}!`, 'success');
      navigate('/');
    } catch (err) {
      const msg =
        err.userMessage ||
        err.response?.data?.message ||
        err.message ||
        'Authentication failed. Please check your credentials.';
      setFormError(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f7fa',
        }}
      >
        <LoadingSpinner
          size="lg"
          label="Checking agent credentials..."
          subtext="Connecting to Memorial Express"
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: '#f5f7fa',
        backgroundImage: 'radial-gradient(circle at 50% 15%, #edf3f8 0%, #f5f7fa 70%)',
        boxSizing: 'border-box',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 16px 40px rgba(24, 54, 85, 0.09), 0 2px 8px rgba(24, 54, 85, 0.04)',
          border: '1px solid #dbe2ea',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Brand Accent Top Line */}
        <div
          style={{
            height: '5px',
            background: 'linear-gradient(90deg, #183655 0%, #253851 55%, #d4af37 100%)',
          }}
        />

        {/* Login Card Body */}
        <div
          style={{
            padding: 'clamp(24px, 5vw, 36px)',
          }}
        >
          {/* Brand Header & Logo */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              marginBottom: '24px',
            }}
          >
            <BrandFeatherIcon
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                boxShadow: '0 4px 14px rgba(24, 54, 85, 0.12)',
                display: 'inline-block',
                marginBottom: '14px',
              }}
            />

            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#183655',
                lineHeight: 1.2,
                textTransform: 'uppercase',
              }}
            >
              Memorial Express
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '6px',
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: '#eef4f9',
                border: '1px solid #d8e2ed',
                color: '#183655',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Agent Portal
            </div>

            <h1
              style={{
                margin: '18px 0 6px 0',
                fontSize: '22px',
                fontWeight: 700,
                color: '#253851',
                lineHeight: 1.3,
              }}
            >
              Agent Sign In
            </h1>

            <p
              style={{
                margin: 0,
                fontSize: '13.5px',
                color: '#67788e',
                lineHeight: 1.5,
              }}
            >
              Enter your agent credentials to access the quote generator and locations catalog.
            </p>
          </div>

          {/* Inline Error Banner */}
          {formError && (
            <div
              role="alert"
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '20px',
                color: '#991b1b',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                lineHeight: 1.4,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, marginTop: '1px' }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span style={{ flex: 1 }}>{formError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate>
            <InputField
              id="agent-email"
              name="email"
              type="email"
              label="Email"
              placeholder="agent@memorialexpress.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formError) setFormError('');
              }}
              disabled={isSubmitting}
              required
            />

            <div style={{ position: 'relative' }}>
              <InputField
                id="agent-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formError) setFormError('');
                }}
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '36px',
                  background: 'none',
                  border: 'none',
                  color: '#67788e',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Remember Me & Help Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                margin: '-4px 0 22px 0',
                fontSize: '13px',
              }}
            >
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#253851',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: 500,
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: '#183655',
                    cursor: 'pointer',
                    margin: 0,
                  }}
                />
                Remember me
              </label>

              <button
                type="button"
                onClick={() => addToast('Please contact your administrator to reset agent credentials.', 'info')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#183655',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#1f456c')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#183655')}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Action */}
            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
              style={{
                width: '100%',
                justifyContent: 'center',
                backgroundColor: '#183655',
                borderColor: '#183655',
                padding: '13px 20px',
                fontSize: '15px',
                fontWeight: 650,
                borderRadius: '10px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </div>

        {/* Security / Help Desk Footer */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #edf1f5',
            padding: '16px 24px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#67788e',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: '#253851',
              fontWeight: 600,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#183655"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Authorized Agent Access Only
          </div>

          <div>
            Need assistance?{' '}
            <span
              onClick={() => addToast('Agent Support: support@memorialexpress.com | (800) 555-0199', 'info')}
              style={{
                color: '#183655',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Contact Agent Support
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
