import React, { useState } from 'react';
import InputField from '../common/InputField.jsx';
import Button from '../common/Button.jsx';
import api from '../../services/api.js';

export default function AgentRegistrationModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    agentCode: '',
    uplineName: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError('');
  };

  const handleReset = () => {
    setFormData({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      agentCode: '',
      uplineName: '',
    });
    setFormError('');
    setIsSuccess(false);
    setShowPassword(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const fullNameTrim = formData.fullName.trim();
    const emailTrim = formData.email.trim();
    const passwordTrim = formData.password.trim();
    const phoneTrim = formData.phone.trim();
    const agentCodeTrim = formData.agentCode.trim();
    const uplineNameTrim = formData.uplineName.trim();

    if (!fullNameTrim) {
      setFormError('Please enter your full legal name.');
      return;
    }

    if (!emailTrim) {
      setFormError('Please enter your email address.');
      return;
    }

    if (!emailTrim.includes('@') || !emailTrim.includes('.')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (!passwordTrim) {
      setFormError('Please enter a secure password.');
      return;
    }

    if (passwordTrim.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (!agentCodeTrim) {
      setFormError('Please enter your Agent Code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        fullName: fullNameTrim,
        email: emailTrim.toLowerCase(),
        password: passwordTrim,
        phone: phoneTrim,
        agentCode: agentCodeTrim,
        uplineName: uplineNameTrim,
      };

      const res = await api.post('/agents/register', payload);

      setIsSuccess(true);
      if (onSuccess) {
        onSuccess(res.data?.message || 'Registration successful. Please wait for Admin approval.');
      }
    } catch (err) {
      const msg =
        err.userMessage ||
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please review your details and try again.';
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          handleClose();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(15, 23, 42, 0.08)',
          border: '1px solid #dbe2ea',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'fadeInScale 0.2s ease-out',
        }}
      >
        {/* Accent Top Strip */}
        <div
          style={{
            height: '5px',
            background: 'linear-gradient(90deg, #183655 0%, #253851 55%, #d4af37 100%)',
          }}
        />

        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px 16px 24px',
            borderBottom: '1px solid #eef2f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fafbfc',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#183655',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '4px',
              }}
            >
              <span>Memorial Express</span>
              <span>•</span>
              <span style={{ color: '#996515' }}>Agent Onboarding</span>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '19px',
                fontWeight: 750,
                color: '#1e293b',
              }}
            >
              {isSuccess ? 'Registration Submitted' : 'Register as Sales Agent'}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {isSuccess ? (
            /* Success State Confirmation */
            <div
              style={{
                textAlign: 'center',
                padding: '20px 8px 10px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#ecfdf5',
                  border: '2px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.15)',
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 750,
                  color: '#065f46',
                  margin: '0 0 10px 0',
                }}
              >
                Registration successful. Please wait for Admin approval.
              </h3>

              <p
                style={{
                  fontSize: '14px',
                  color: '#475569',
                  lineHeight: 1.6,
                  maxWidth: '400px',
                  margin: '0 0 24px 0',
                }}
              >
                Your registration has been submitted with <strong>Pending Review</strong> status. Once an administrator verifies your license credentials and assigns your location, your account will be activated for sign in.
              </p>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  width: '100%',
                  boxSizing: 'border-box',
                  marginBottom: '24px',
                  textAlign: 'left',
                  fontSize: '13px',
                  color: '#334155',
                }}
              >
                <div style={{ fontWeight: 650, marginBottom: '6px', color: '#1e293b' }}>
                  Submitted Profile Summary:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '4px 12px' }}>
                  <span style={{ color: '#64748b' }}>Agent:</span>
                  <span style={{ fontWeight: 600 }}>{formData.fullName}</span>
                  <span style={{ color: '#64748b' }}>Email:</span>
                  <span>{formData.email}</span>
                  <span style={{ color: '#64748b' }}>Agent Code:</span>
                  <span>{formData.agentCode}</span>
                  <span style={{ color: '#64748b' }}>Upline's Name:</span>
                  <span>{formData.uplineName || 'None'}</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleClose}
                style={{
                  width: '100%',
                  backgroundColor: '#183655',
                  borderColor: '#183655',
                  padding: '12px 24px',
                  fontWeight: 650,
                  borderRadius: '10px',
                }}
              >
                Return to Sign In
              </Button>
            </div>
          ) : (
            /* Registration Input Form */
            <form onSubmit={handleSubmit} noValidate>
              <p
                style={{
                  margin: '0 0 20px 0',
                  fontSize: '13.5px',
                  color: '#64748b',
                  lineHeight: 1.5,
                }}
              >
                Enter your professional licensing details to create your Memorial Express agent account. Accounts require administrator verification before activation.
              </p>

              {/* Inline Form Error */}
              {formError && (
                <div
                  role="alert"
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    marginBottom: '18px',
                    color: '#991b1b',
                    fontSize: '13px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    lineHeight: 1.4,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span style={{ flex: 1 }}>{formError}</span>
                </div>
              )}

              {/* Full Name */}
              <InputField
                id="reg-agent-fullname"
                name="fullName"
                type="text"
                label="Full Legal Name"
                placeholder="e.g. Carlos Mendoza"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                disabled={isSubmitting}
                required
              />

              {/* Email */}
              <InputField
                id="reg-agent-email"
                name="email"
                type="email"
                label="Email Address"
                placeholder="agent@memorialexpress.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={isSubmitting}
                required
              />

              {/* Password */}
              <div style={{ position: 'relative' }}>
                <InputField
                  id="reg-agent-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Phone Number & Agent Code Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <InputField
                  id="reg-agent-phone"
                  name="phone"
                  type="tel"
                  label="Phone Number"
                  placeholder="(323) 555-0192"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  disabled={isSubmitting}
                />

                <InputField
                  id="reg-agent-code"
                  name="agentCode"
                  type="text"
                  label="Agent Code"
                  placeholder="CA-FD-98421"
                  value={formData.agentCode}
                  onChange={(e) => handleChange('agentCode', e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Upline's Name */}
              <InputField
                id="reg-agent-upline"
                name="uplineName"
                type="text"
                label="Upline's Name"
                placeholder="e.g. Patricia Davis / Regional Director"
                value={formData.uplineName}
                onChange={(e) => handleChange('uplineName', e.target.value)}
                disabled={isSubmitting}
              />

              {/* Submit Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '16px',
                }}
              >
                <Button
                  variant="secondary"
                  size="lg"
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  style={{
                    flex: '1',
                    padding: '12px 18px',
                    borderRadius: '10px',
                  }}
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="lg"
                  type="submit"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  style={{
                    flex: '2',
                    backgroundColor: '#183655',
                    borderColor: '#183655',
                    padding: '12px 20px',
                    fontWeight: 650,
                    borderRadius: '10px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Registering...' : 'Submit Registration'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
