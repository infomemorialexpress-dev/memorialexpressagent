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

function getInitials(name) {
  if (!name) return 'AG';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
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
            className="header-lang-btn"
            onClick={onLanguageToggle}
            title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>{lang === 'es' ? 'Español' : 'English'}</span>
          </button>
        )}

        {isAuthenticated && agentUser && (
          <div className="header-user-badge">
            <div className="header-user-avatar">
              {getInitials(agentUser.fullName || agentUser.email)}
            </div>

            <div className="header-user-meta">
              <span className="header-user-name">
                {agentUser.fullName || agentUser.email}
              </span>
              <span className="header-user-role">
                Agent {(agentUser.agentCode || agentUser.licenseId) ? `• ${agentUser.agentCode || agentUser.licenseId}` : ''}
              </span>
            </div>

            <div className="header-divider-v" />

            <button
              type="button"
              onClick={handleLogout}
              className="header-logout-btn"
              title="Sign Out"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
