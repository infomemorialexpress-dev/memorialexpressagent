import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuote } from '../../context/QuoteContext.jsx';
import Button from '../../components/common/Button.jsx';

export default function LanguageSelectionScreen({ onProceed }) {
  const { lang, setLanguage } = useQuote();
  const [selectedLang, setSelectedLang] = useState(lang || 'en');
  const navigate = useNavigate();

  const handleSelect = (l) => {
    setSelectedLang(l);
    setLanguage(l);
  };

  const handleContinue = () => {
    setLanguage(selectedLang);
    if (onProceed) {
      onProceed();
    }
    navigate('/funnel');
  };

  return (
    <div className="language-intro-view">
      <div className="language-intro-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </div>

      <h1 className="page-title">
        {selectedLang === 'es' ? 'Seleccione su Idioma' : 'Select Your Language'}
      </h1>
      <p className="page-subtitle">
        {selectedLang === 'es'
          ? 'Elija el idioma preferido para el cotizador funerario y la documentación.'
          : 'Choose your preferred language for the funeral quote funnel and paperwork.'}
      </p>

      <div className="language-buttons-row">
        <button
          type="button"
          className={`lang-card-btn ${selectedLang === 'en' ? 'selected' : ''}`}
          onClick={() => handleSelect('en')}
        >
          <span className="lang-flag">🇺🇸</span>
          <span className="lang-name">English</span>
          <span className="lang-desc">Standard funeral quoter</span>
        </button>

        <button
          type="button"
          className={`lang-card-btn ${selectedLang === 'es' ? 'selected' : ''}`}
          onClick={() => handleSelect('es')}
        >
          <span className="lang-flag">🇲🇽</span>
          <span className="lang-name">Español</span>
          <span className="lang-desc">Cotizador en español</span>
        </button>
      </div>

      <div style={{ marginTop: 36 }}>
        <Button variant="primary" size="lg" onClick={handleContinue}>
          {selectedLang === 'es' ? 'Continuar al Cotizador →' : 'Continue to Quoter →'}
        </Button>
      </div>
    </div>
  );
}
