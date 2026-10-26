import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuote } from '../../context/QuoteContext.jsx';
import ProgressBar from '../../components/Agent/ProgressBar.jsx';
import MerchandiseCard from '../../components/Agent/MerchandiseCard.jsx';
import LocationSearch from '../../components/Agent/LocationSearch.jsx';
import ConfirmHome from '../../components/Agent/ConfirmHome.jsx';
import SelectService from '../../components/Agent/SelectService.jsx';
import ChooseCasket from '../../components/Agent/ChooseCasket.jsx';
import AddonsOptions from '../../components/Agent/AddonsOptions.jsx';
import QuoteSummary from '../../components/Agent/QuoteSummary.jsx';
import LegalDocuments from '../../components/Agent/LegalDocuments.jsx';
import Button from '../../components/common/Button.jsx';
import InputField from '../../components/common/InputField.jsx';
import SelectDropdown from '../../components/common/SelectDropdown.jsx';
import {
  SERVICES,
  formatMoney,
  isCasketNeeded,
  isDirectCremation,
  isShipOut,
  isEligibleCasket
} from '../../utils/quoteLogic.js';

export default function AgentQuoteFunnel() {
  const { t } = useTranslation();
  const {
    lang,
    step,
    setStep,
    quote,
    setQuote,
    db,
    calculation,
    selectHome,
    setService,
    selectCasket,
    toggleAddon,
    updateQuantity,
    addToast
  } = useQuote();

  const [zoomedCasket, setZoomedCasket] = useState(null);
  const [customZoom, setCustomZoom] = useState(1);

  const stepNames = [
    t('steps.location_home', lang === 'es' ? 'Ubicación y Funeraria' : 'Location & Home'),
    t('steps.verify_home', lang === 'es' ? 'Verificar Funeraria' : 'Verify Home'),
    t('steps.select_service', lang === 'es' ? 'Seleccionar Servicio' : 'Select Service'),
    t('steps.choose_casket', lang === 'es' ? 'Elegir Ataúd' : 'Choose Casket'),
    t('steps.addons_options', lang === 'es' ? 'Opciones y Extras' : 'Add-ons & Options'),
    t('steps.quote_summary', lang === 'es' ? 'Resumen de Cotización' : 'Quote Summary'),
    t('steps.legal_documents', lang === 'es' ? 'Documentos Legales' : 'Legal Documents')
  ];

  // Eligible caskets strictly mapped to selected Funeral Home and Service Package
  const allCaskets = db.caskets || [];
  const eligibleCaskets = allCaskets.filter(c =>
    isEligibleCasket(c, quote.home || quote.homeId, quote.service, db, quote.selectedServiceObject)
  );

  const shouldSkipCasketStep = () => {
    if (isDirectCremation(quote.service, quote.selectedServiceObject)) return true;
    if (!isCasketNeeded(quote.service)) return true;
    if (eligibleCaskets.length === 0) return true;
    return false;
  };

  // Navigation handlers
  const canContinue = () => {
    if (step === 0) return Boolean(quote.home);
    if (step === 1) return Boolean(quote.home);
    if (step === 2) return Boolean(quote.service);
    if (step === 3) {
      if (!shouldSkipCasketStep() && isCasketNeeded(quote.service)) {
        return Boolean(quote.casket);
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 6) {
      return;
    }
    if (!canContinue()) {
      addToast(
        lang === 'es' ? 'Por favor complete la selección requerida antes de continuar.' : 'Please make a selection to continue.',
        'error'
      );
      return;
    }

    // Skip casket step if direct cremation, not needed, or no mapped caskets
    if (step === 2 && shouldSkipCasketStep()) {
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setStep(Math.min(6, step + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    // If going back from addons and casket step was skipped, return directly to service
    if (step === 4 && shouldSkipCasketStep()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setStep(Math.max(0, step - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepClick = (target) => {
    if (target === 3 && shouldSkipCasketStep()) {
      setStep(4);
      return;
    }
    setStep(target);
  };

  if (!calculation) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        <div style={{
          width: 36,
          height: 36,
          border: '3px solid #e2e8f0',
          borderTopColor: '#183655',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px'
        }} />
        <span>{lang === 'es' ? 'Cargando cotizador funerario...' : 'Loading agent funeral quoter...'}</span>
      </div>
    );
  }

  return (
    <div>
      <ProgressBar
        currentStep={step}
        totalSteps={7}
        steps={stepNames}
        onStepClick={handleStepClick}
      />

      <div className="main-card">
        {/* STEP 0: LOCATION & FUNERAL HOME SEARCH */}
        {step === 0 && (
          <LocationSearch onContinue={() => setStep(1)} />
        )}

        {/* STEP 1: VERIFY SELECTED HOME */}
        {step === 1 && (
          <ConfirmHome onBack={() => setStep(0)} onContinue={() => setStep(2)} />
        )}

        {/* STEP 2: SELECT SERVICE */}
        {step === 2 && (
          <SelectService
            onBack={() => setStep(1)}
            onContinue={() => {
              if (shouldSkipCasketStep()) {
                setStep(4);
              } else {
                setStep(3);
              }
            }}
          />
        )}

        {/* STEP 3: CHOOSE CASKET */}
        {step === 3 && (
          <ChooseCasket
            onBack={() => setStep(2)}
            onContinue={() => setStep(4)}
          />
        )}

        {/* STEP 4: ADD-ONS & CASH ADVANCES (Step 5 of 7) */}
        {step === 4 && (
          <AddonsOptions
            onBack={handleBack}
            onContinue={() => {
              setStep(5);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* STEP 5: FSA QUOTE SUMMARY (Step 6 of 7) */}
        {step === 5 && (
          <QuoteSummary
            onBack={handleBack}
            onContinue={() => {
              setStep(6);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* STEP 6: LEGAL DOCUMENTS & DIGITAL SIGNATURE (Step 7 of 7) */}
        {step === 6 && (
          <LegalDocuments
            onBack={() => {
              setStep(5);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onContinue={() => {
              setStep(5);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </div>

      {/* CASKET ZOOM INSPECTION MODAL */}
      {zoomedCasket && (
        <div className="modal-backdrop" onClick={() => setZoomedCasket(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#183655', fontSize: 19 }}>
                {zoomedCasket.name}
              </h3>
              <button
                type="button"
                onClick={() => setZoomedCasket(null)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{
              height: 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              overflow: 'hidden'
            }}>
              <img
                src={zoomedCasket.image}
                alt={zoomedCasket.name}
                style={{
                  transform: `scale(${customZoom})`,
                  transition: 'transform 0.15s ease',
                  maxHeight: '100%',
                  maxWidth: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Zoom:</span>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.1"
                value={customZoom}
                onChange={(e) => setCustomZoom(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, width: 45 }}>
                {Math.round(customZoom * 100)}%
              </span>
            </div>

            <div style={{ marginTop: 18, fontSize: 13.5, color: '#475569', lineHeight: 1.5 }}>
              <strong>{lang === 'es' ? 'Especificaciones:' : 'Specifications:'}</strong> {zoomedCasket.description}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <Button variant="default" onClick={() => setZoomedCasket(null)}>
                {lang === 'es' ? 'Cerrar' : 'Close'}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  selectCasket(zoomedCasket.id);
                  setZoomedCasket(null);
                  addToast(lang === 'es' ? 'Ataúd seleccionado.' : 'Casket selected.', 'success');
                }}
              >
                {lang === 'es' ? 'Seleccionar este Ataúd' : 'Select this Casket'} ({formatMoney(zoomedCasket.price)})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
