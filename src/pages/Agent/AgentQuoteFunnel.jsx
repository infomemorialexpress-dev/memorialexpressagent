import React, { useState } from 'react';
import { useQuote } from '../../context/QuoteContext.jsx';
import ProgressBar from '../../components/Agent/ProgressBar.jsx';
import MerchandiseCard from '../../components/Agent/MerchandiseCard.jsx';
import LocationSearch from '../../components/Agent/LocationSearch.jsx';
import ConfirmHome from '../../components/Agent/ConfirmHome.jsx';
import SelectService from '../../components/Agent/SelectService.jsx';
import ChooseCasket from '../../components/Agent/ChooseCasket.jsx';
import Button from '../../components/common/Button.jsx';
import InputField from '../../components/common/InputField.jsx';
import SelectDropdown from '../../components/common/SelectDropdown.jsx';
import {
  SERVICES,
  formatMoney,
  t,
  isCasketNeeded,
  isShipOut,
  isEligibleCasket
} from '../../utils/quoteLogic.js';

export default function AgentQuoteFunnel() {
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

  const stepNamesEn = [
    'Location & Home',
    'Verify Home',
    'Select Service',
    'Choose Casket',
    'Add-ons & Options',
    'Quote Summary'
  ];

  const stepNamesEs = [
    'Ubicación y Funeraria',
    'Verificar Funeraria',
    'Seleccionar Servicio',
    'Elegir Ataúd',
    'Opciones y Extras',
    'Resumen de Cotización'
  ];

  const stepNames = lang === 'es' ? stepNamesEs : stepNamesEn;

  // Eligible caskets for step 3
  const allCaskets = db.caskets || [];
  const eligibleCaskets = allCaskets.filter(c => isEligibleCasket(c, quote.home, quote.service));

  // Navigation handlers
  const canContinue = () => {
    if (step === 0) return Boolean(quote.home);
    if (step === 1) return Boolean(quote.home);
    if (step === 2) return Boolean(quote.service);
    if (step === 3) {
      if (isCasketNeeded(quote.service)) {
        return Boolean(quote.casket);
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 5) {
      window.print();
      return;
    }
    if (!canContinue()) {
      addToast(
        lang === 'es' ? 'Por favor complete la selección requerida antes de continuar.' : 'Please make a selection to continue.',
        'error'
      );
      return;
    }

    // Skip casket step if not needed
    if (step === 2 && !isCasketNeeded(quote.service)) {
      setStep(4);
      return;
    }

    setStep(Math.min(5, step + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    // If going back from addons and service didn't need casket, return to service
    if (step === 4 && !isCasketNeeded(quote.service)) {
      setStep(2);
      return;
    }
    setStep(Math.max(0, step - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        totalSteps={6}
        steps={stepNames}
        onStepClick={(target) => setStep(target)}
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
              if (!isCasketNeeded(quote.service)) {
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

        {/* STEP 4: ADD-ONS & CASH ADVANCES */}
        {step === 4 && (
          <div>
            <h1 className="page-title">
              {lang === 'es' ? 'Servicios Adicionales y Anticipos' : 'Add-ons & Cash Advances'}
            </h1>
            <p className="page-subtitle">
              {lang === 'es'
                ? 'Seleccione arreglos florales, cortejo fúnebre, actas de defunción y permisos.'
                : 'Select floral arrangements, funeral escorts, death certificates, and memorial items.'}
            </p>

            {/* Mandatory Section */}
            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 12, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#183655', marginBottom: 12 }}>
                📋 {lang === 'es' ? 'Documentación y Permisos' : 'Certificates & Permits'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    {lang === 'es' ? 'Actas de Defunción Certificadas' : 'Certified Death Certificates'} ($26 c/u)
                  </div>
                  <div className="counter-box">
                    <button
                      type="button"
                      className="counter-btn"
                      onClick={() => updateQuantity('certs', Math.max(1, (Number(quote.certs) || 1) - 1))}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      className="counter-value"
                      value={quote.certs}
                      onChange={(e) => updateQuantity('certs', Math.max(1, Number(e.target.value) || 1))}
                    />
                    <button
                      type="button"
                      className="counter-btn"
                      onClick={() => updateQuantity('certs', (Number(quote.certs) || 1) + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    {lang === 'es' ? 'Permiso de Disposición Obligatorio' : 'Mandatory Disposition Permit'}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#183655', paddingTop: 6 }}>
                    ${db.fees?.dispositionPermit || 12}
                  </div>
                </div>
              </div>
            </div>

            {/* Ship out destination & airfare */}
            {isShipOut(quote.service) && (
              <div style={{ background: '#f0f6fb', padding: 18, borderRadius: 12, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#183655', marginBottom: 8 }}>
                  ✈️ {lang === 'es' ? 'Destino de Envío y Boleto Aéreo' : 'Shipping Destination & Airfare'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                  <SelectDropdown
                    label={lang === 'es' ? 'Región de Destino' : 'Destination Region'}
                    value={quote.shipDestination}
                    onChange={(e) => {
                      const v = e.target.value;
                      let airfare = 1000;
                      if (v === 'south_america') airfare = 1500;
                      else if (v === 'europe' || v === 'asia') airfare = 2000;
                      setQuote(prev => ({
                        ...prev,
                        shipDestination: v,
                        airfarePrice: airfare
                      }));
                    }}
                    options={[
                      ['north_america', 'North America ($1,000)'],
                      ['south_america', 'Central / South America ($1,500)'],
                      ['europe', 'Europe ($2,000)'],
                      ['asia', 'Asia / Other ($2,000)']
                    ]}
                  />

                  <InputField
                    label={lang === 'es' ? 'Costo de Boleto Aéreo ($)' : 'Airfare Price ($)'}
                    type="number"
                    value={quote.airfarePrice}
                    onChange={(e) => updateQuantity('airfarePrice', Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
              </div>
            )}

            {/* Optional Add-ons List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(db.addons || [])
                .filter(a => {
                  if (quote.home === 'murillo') return a.home === 'murillo';
                  if (quote.home === 'western') return a.home === 'western' || a.id === 'air_tray';
                  return a.home === '*' || a.home === quote.home;
                })
                .map(addon => {
                  const isChecked = quote.addons.includes(addon.id);

                  return (
                    <div
                      key={addon.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 16px',
                        background: isChecked ? '#f1f6fb' : '#ffffff',
                        border: `1.5px solid ${isChecked ? '#183655' : '#e2e8f0'}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => toggleAddon(addon.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ width: 18, height: 18, accentColor: '#183655', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontWeight: 650, fontSize: 14.5 }}>
                            {lang === 'es' ? t(addon.name, 'es') : addon.name}
                          </div>
                          {addon.id === 'flowers' && isChecked && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                              <span style={{ fontSize: 12, color: '#64748b' }}>
                                {lang === 'es' ? 'Arreglos:' : 'Arrangements:'}
                              </span>
                              <div className="counter-box">
                                <button
                                  type="button"
                                  className="counter-btn"
                                  onClick={() => updateQuantity('flowersQty', Math.max(1, (quote.flowersQty || 1) - 1))}
                                >
                                  -
                                </button>
                                <span className="counter-value">{quote.flowersQty || 1}</span>
                                <button
                                  type="button"
                                  className="counter-btn"
                                  onClick={() => updateQuantity('flowersQty', (quote.flowersQty || 1) + 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}
                          {addon.id === 'escorts' && isChecked && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                              <span style={{ fontSize: 12, color: '#64748b' }}>
                                {lang === 'es' ? 'Escoltas:' : 'Escorts:'}
                              </span>
                              <div className="counter-box">
                                <button
                                  type="button"
                                  className="counter-btn"
                                  onClick={() => updateQuantity('escortQty', Math.max(1, (quote.escortQty || 1) - 1))}
                                >
                                  -
                                </button>
                                <span className="counter-value">{quote.escortQty || 1}</span>
                                <button
                                  type="button"
                                  className="counter-btn"
                                  onClick={() => updateQuantity('escortQty', (quote.escortQty || 1) + 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: 15, color: '#183655' }}>
                        {formatMoney(addon.price)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* STEP 5: FSA QUOTE SUMMARY */}
        {step === 5 && (
          <div>
            <h1 className="page-title">
              {lang === 'es' ? 'Resumen Oficial de la Cotización' : 'Funeral Package Summary'}
            </h1>
            <p className="page-subtitle">
              {lang === 'es'
                ? 'Separación exacta de costos FSA: Secciones garantizadas y anticipos no garantizados.'
                : 'Guaranteed sections together, followed by non-guaranteed cash advances and third-party fees.'}
            </p>

            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
              <strong style={{ fontSize: 18, color: '#183655', display: 'block' }}>
                {calculation.homeObj?.name || 'Funeral Home'}
              </strong>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                📍 {calculation.matchedLoc?.city || calculation.homeObj?.city || 'California'}, {calculation.homeObj?.county}
              </div>
              <div style={{ color: '#183655', fontWeight: 600, fontSize: 14, marginTop: 6 }}>
                ⚰️ {SERVICES.find(s => s[0] === quote.service)?.[1] || quote.service}
              </div>
            </div>

            {/* GUARANTEED SECTION HEADING */}
            <div className="guarantee-heading">
              <span>{lang === 'es' ? 'SECCIÓN 1 Y 2 · TOTAL GARANTIZADO' : 'GUARANTEED SECTIONS · SERVICES & MERCHANDISE'}</span>
              <span>{formatMoney(calculation.totalGuaranteed)}</span>
            </div>

            <div className="guaranteed-row">
              <span>{lang === 'es' ? 'Sección 1 · Servicios Profesionales y Facilidades' : 'Guaranteed Section 1 · Professional Services'}</span>
              <span>{formatMoney(calculation.s1)}</span>
            </div>

            <div className="guaranteed-row">
              <span>
                {lang === 'es' ? 'Sección 2 · Mercancía y Ataúd' : 'Guaranteed Section 2 · Merchandise'}
                {calculation.casket ? ` (${calculation.casket.name})` : ''}
              </span>
              <span>{formatMoney(calculation.s2)}</span>
            </div>

            <div className="guaranteed-total">
              <strong>{lang === 'es' ? 'TOTAL GARANTIZADO' : 'TOTAL GUARANTEED'}</strong>
              <strong>{formatMoney(calculation.totalGuaranteed)}</strong>
            </div>

            {/* NON-GUARANTEED SECTION HEADING */}
            <div className="nonguarantee-heading">
              <span>{lang === 'es' ? 'ANTICIPOS EN EFECTIVO · NO GARANTIZADOS' : 'NON-GUARANTEED CASH ADVANCE ITEMS'}</span>
              <span>{formatMoney(calculation.ng)}</span>
            </div>

            <div style={{ background: '#ffffff', padding: '8px 12px', border: '1px solid #fed7aa', borderRadius: 10 }}>
              <div className="summary-row">
                <span>{lang === 'es' ? 'Actas de Defunción Certificadas' : 'Certified Death Certificates'} ({calculation.certsCount})</span>
                <strong>{formatMoney(calculation.certsCount * calculation.deathCertFee)}</strong>
              </div>

              <div className="summary-row">
                <span>{lang === 'es' ? 'Permiso de Disposición del Estado' : 'State Disposition Permit'}</span>
                <strong>{formatMoney(calculation.dispositionPermitFee)}</strong>
              </div>

              {calculation.salesTax > 0 && (
                <div className="summary-row">
                  <span>{lang === 'es' ? 'Impuesto sobre Ventas' : 'Estimated Sales Tax'}</span>
                  <strong>{formatMoney(calculation.salesTax)}</strong>
                </div>
              )}

              {calculation.shipFees > 0 && (
                <div className="summary-row">
                  <span>{lang === 'es' ? 'Tarifa Consular y Traslado Aéreo' : 'Consulate Fee & Airfare'}</span>
                  <strong>{formatMoney(calculation.shipFees)}</strong>
                </div>
              )}

              {calculation.addedAddons.map((addon, idx) => (
                <div key={idx} className="summary-row">
                  <span>{lang === 'es' ? t(addon.name, 'es') : addon.name}</span>
                  <strong>{formatMoney(addon.price)}</strong>
                </div>
              ))}
            </div>

            <div className="nonguaranteed-total">
              <strong>{lang === 'es' ? 'TOTAL NO GARANTIZADO' : 'TOTAL NON-GUARANTEED'}</strong>
              <strong>{formatMoney(calculation.ng)}</strong>
            </div>

            {/* GRAND TOTAL */}
            <div className="summary-grand-total">
              <span>{lang === 'es' ? 'PRECIO TOTAL DEL PAQUETE' : 'OVERALL PACKAGE PRICE'}</span>
              <span>{formatMoney(calculation.total)}</span>
            </div>

            <p style={{ fontSize: 12, color: '#8290a1', marginTop: 18 }}>
              {lang === 'es'
                ? 'Nota: Esta cotización separa los costos garantizados frente a los no garantizados conforme al estándar FSA. Las estimaciones son informativas y sujetas a confirmación final.'
                : 'Note: This quote separates guaranteed goods and services from third-party non-guaranteed cash advances. Estimates are informational drafts subject to funeral home contract execution.'}
            </p>
          </div>
        )}

        {/* FUNNEL STEP ACTION BUTTONS (For Step 4+) */}
        {step >= 4 && (
          <div className="step-actions">
            <Button variant="default" onClick={handleBack}>
              ← {lang === 'es' ? 'Atrás' : 'Back'}
            </Button>

            <Button variant="primary" onClick={handleNext}>
              {step === 5
                ? (lang === 'es' ? '🖨️ Imprimir / Guardar FSA' : '🖨️ Print / Save FSA Quote')
                : (lang === 'es' ? 'Continuar →' : 'Continue →')}
            </Button>
          </div>
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
