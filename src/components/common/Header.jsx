import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import memorialExpressLogo from '../../assets/memorial_express_icon.svg';
import { useAuth } from '../../context/AuthContext.jsx';
import { useQuote } from '../../context/QuoteContext.jsx';

export function BrandFeatherIcon({ className, style }) {
  return (
    <img
      src={memorialExpressLogo}
      alt="Memorial Express Logo"
      className={className}
      style={{
        objectFit: 'contain',
        display: 'inline-block',
        borderRadius: 8,
        ...style,
      }}
    />
  );
}

export default function Header({ lang, onLanguageToggle }) {
  const { isAuthenticated, agentUser, logout } = useAuth();
  const { addToast } = useQuote();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    addToast('You have been signed out.', 'info');
    navigate('/login');
  };

  return (
    <header className="app-header">
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="brand-wrapper">
          <BrandFeatherIcon className="brand-logo-img" />
          <div>
            <div className="brand-title">MEMORIAL EXPRESS</div>
            <div className="brand-subtitle">
              {lang === 'es' ? 'Cotizador Funerario Simple' : 'Simple Funeral Quote'}
            </div>
          </div>
        </div>
      </Link>

      <div className="header-actions">
        {onLanguageToggle && (
          <button
            type="button"
            className="lang-toggle-btn"
            onClick={onLanguageToggle}
            title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          >
            <span>🌐</span>
            <span>{lang === 'es' ? 'Español' : 'English'}</span>
          </button>
        )}

        {isAuthenticated && agentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '6px' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                fontSize: '12px',
                lineHeight: 1.25,
              }}
            >
              <span style={{ fontWeight: 700, color: '#183655' }}>
                {agentUser.fullName || agentUser.email}
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  color: '#67788e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                }}
              >
                Agent {agentUser.licenseId ? `• ${agentUser.licenseId}` : ''}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#fee2e2';
                e.currentTarget.style.borderColor = '#fca5a5';
                e.currentTarget.style.color = '#991b1b';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#475569';
              }}
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
