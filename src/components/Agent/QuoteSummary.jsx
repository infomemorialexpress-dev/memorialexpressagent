import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuote } from '../../context/QuoteContext.jsx';
import Button from '../common/Button.jsx';
import { formatMoney, SERVICES, getItemizedServicesList, getLocalizedText } from '../../utils/quoteLogic.js';
import { generateFSAPdf } from '../../utils/FSA_Generator.js';
import { QuoteSummarySkeleton } from '../common/SkeletonLoader.jsx';

export default function QuoteSummary({ onBack, onContinue }) {
  const { t } = useTranslation();
  const { lang, quote, calculation, db, addToast } = useQuote();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const isEs = lang === 'es';

  if (!calculation) {
    return (
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '20px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '20px',
            color: '#183655',
            fontWeight: 650,
            fontSize: '14.5px',
          }}
        >
          <div className="app-spinner" style={{ width: '20px', height: '20px', borderWidth: '2.5px' }} />
          <span>{isEs ? 'Calculando cotización oficial y ahorros...' : 'Calculating official quote & package savings...'}</span>
        </div>
        <QuoteSummarySkeleton />
      </div>
    );
  }

  // ================= 1. DYNAMIC SECTION I SERVICES =================
  const selectedChapel = quote.selectedChapel || calculation.selectedChapel || null;
  const itemizedBreakdown = getItemizedServicesList(
    quote.selectedServiceObject || calculation.serviceObj,
    calculation,
    isEs,
    selectedChapel
  );
  const dynamicItemizedServices = itemizedBreakdown.rows;
  const effectiveServicesTotal = itemizedBreakdown.totalServices;
  const STATIC_SALES_TAX_RATE = 0.095; // Explicitly 9.5%

  // ================= 2. DYNAMIC (CONTEXT-BASED) ELEMENTS =================
  const homeObj = calculation.homeObj || quote.selectedHomeObj || {};
  const serviceKey = quote.service || 'one_day';
  const serviceObj = quote.selectedServiceObject || calculation.serviceObj || {};
  const rawServiceDisplayName = getLocalizedText(serviceObj, 'packageName', lang) || quote.serviceName || SERVICES.find(s => s[0] === serviceKey)?.[1] || 'ONE-DAY FUNERAL';
  const serviceDisplayName = rawServiceDisplayName.toUpperCase();

  const isCremation = serviceKey.includes('cremation');
  const isShip = serviceKey.includes('ship');
  const isBurial = !isCremation && !isShip;

  // Section II: Dynamic Casket Merchandise Details & Price
  const casket = calculation.casket || quote.selectedCasketObject || quote.casketObj || {};
  const dynamicCasketPrice = Number(casket.price || casket.listPrice || calculation.s2 || 0);
  const dynamicCasketName = getLocalizedText(casket, 'name', lang) || casket.name || '';
  const dynamicManufacturer = casket.manufacturer || '';
  const dynamicInterior = casket.interiorFabricColor || casket.interiorExterior || casket.interior || '';
  const dynamicExterior = casket.exteriorColor || casket.exterior || casket.color || '';
  const dynamicConstruction = casket.constructionType || casket.construction || casket.material || '';
  const dynamicModel = casket.modelNumber || casket.model || '';

  // Guaranteed Add-ons from Step 5 (e.g., Memorial package)
  const isGuaranteedItem = (a) => {
    if (!a) return false;
    const id = String(a.id || '').toLowerCase();
    const name = String(a.name || '').toLowerCase();
    return !!a.isGuaranteed || id === 'memorial' || name.includes('memorial package');
  };

  const guaranteedAddons = Array.isArray(quote.guaranteedAddons) && quote.guaranteedAddons.length > 0
    ? quote.guaranteedAddons
    : (Array.isArray(quote.selectedAddonObjects)
        ? quote.selectedAddonObjects.filter(isGuaranteedItem)
        : (quote.addons?.includes('memorial')
            ? [{ id: 'memorial', name: 'Memorial package — guest book, memorial cards & video', price: 395, unitPrice: 395, quantity: 1, totalPrice: 395, isGuaranteed: true }]
            : []));

  const guaranteedAddonsTotal = guaranteedAddons.reduce(
    (sum, a) => sum + Number(a.totalPrice ?? a.price ?? 0),
    0
  );

  // 11% tax on guaranteed merchandise (itemPrice * 0.11)
  const guaranteedAddonsTax = Math.round(guaranteedAddonsTotal * 0.11 * 100) / 100;

  // Add base price of any selected guaranteedAddons to TOTAL MERCHANDISE & TOTAL GUARANTEED FUNERAL PRICE
  const dynamicTotalMerchandise = dynamicCasketPrice + guaranteedAddonsTotal;
  const dynamicTotalGuaranteed = effectiveServicesTotal + dynamicTotalMerchandise;

  // Non-Guaranteed Cash Advance Items:
  // 1. Dynamic Selected Non-Guaranteed Add-ons from Step 5 (Flowers, Dove release, Music, etc.)
  const dynamicSelectedAddons = (Array.isArray(quote.nonGuaranteedAddons) && quote.nonGuaranteedAddons.length > 0
    ? quote.nonGuaranteedAddons
    : (Array.isArray(calculation.addedAddons) ? calculation.addedAddons : (quote.selectedAddonObjects || [])))
    .filter(addon => {
      const aPrice = typeof addon === 'object' && addon.price !== undefined ? Number(addon.price) : 0;
      const aName = typeof addon === 'string' ? addon : (addon.name || '');
      const aId = typeof addon === 'object' && addon.id ? String(addon.id) : '';
      if (aPrice <= 0 && aId !== 'music') return false;
      if (aName.startsWith('western_') || aName.startsWith('felipe_')) return false;
      if (aId.startsWith('western_') || aId.startsWith('felipe_')) return false;
      if (isGuaranteedItem(addon)) return false;
      return true;
    });

  const dynamicAddonsTotal = dynamicSelectedAddons.reduce(
    (sum, a) => sum + (typeof a === 'object' && a.price !== undefined ? Number(a.price) : 0),
    0
  );

  // 2. Dynamic Sales Tax: casket tax (9.5%) + 11% guaranteed items tax
  const casketSalesTax = Math.round(dynamicCasketPrice * STATIC_SALES_TAX_RATE * 100) / 100;
  const dynamicSalesTax = Math.round((casketSalesTax + guaranteedAddonsTax) * 100) / 100;

  // Custom manual non-guaranteed items from Step 5
  const customNonGuaranteedItems = (Array.isArray(quote.customNonGuaranteedItems)
    ? quote.customNonGuaranteedItems
    : (Array.isArray(calculation.customNonGuaranteedItems) ? calculation.customNonGuaranteedItems : []))
    .filter(item => item && item.name && item.name.trim() !== '')
    .map(item => ({
      name: item.name.trim(),
      price: Math.max(0, parseFloat(item.price) || 0)
    }));

  const customItemsTotal = customNonGuaranteedItems.reduce((sum, item) => sum + item.price, 0);

  // Non-guaranteed total & Final Combined Grand Total
  const dynamicTotalNonGuaranteed = dynamicAddonsTotal + customItemsTotal + dynamicSalesTax;
  const dynamicGrandTotal = dynamicTotalGuaranteed + dynamicTotalNonGuaranteed;

  // Dynamic Funeral Firm Details (Checks selectedBranch first, matching FSA_Generator.js)
  const selectedBranch = quote?.selectedBranch || calculation?.selectedBranch;
  const dynamicFirmName =
    selectedBranch?.branchName ||
    calculation?.firmName ||
    homeObj.name ||
    quote.homeName ||
    'Felipe Bagues Mortuary — Los Angeles (Funeral Home)';

  const branchAddress = selectedBranch
    ? [selectedBranch.streetAddress, selectedBranch.city].filter(Boolean).join(', ')
    : '';

  const dynamicFirmAddress =
    branchAddress ||
    calculation?.firmAddress ||
    homeObj.streetAddress ||
    homeObj.address ||
    calculation.matchedLoc?.address ||
    '1930 E. First Street, Los Angeles, CA 90033';

  const dynamicFirmPhone =
    selectedBranch?.phone ||
    calculation?.firmPhone ||
    homeObj.phone ||
    '(323) 268-0759';

  // Trigger standardized PDF Generation
  const handlePrintSavePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      generateFSAPdf({
        quote: {
          ...quote,
          selectedChapel,
          guaranteedAddons,
          nonGuaranteedAddons: dynamicSelectedAddons,
          customNonGuaranteedItems,
          guaranteedAddonsTotal,
          guaranteedAddonsTax,
        },
        calculation: {
          ...calculation,
          selectedChapel,
          s1: effectiveServicesTotal,
          s2: dynamicTotalMerchandise,
          guaranteedAddons,
          guaranteedAddonsTotal,
          guaranteedAddonsTax,
          totalGuaranteed: dynamicTotalGuaranteed,
          salesTax: dynamicSalesTax,
          casketSalesTax,
          dispositionPermitFee: 0,
          certsCount: 0,
          deathCertFee: 0,
          certsTotal: 0,
          addedAddons: dynamicSelectedAddons,
          customNonGuaranteedItems,
          customItemsTotal,
          ng: dynamicTotalNonGuaranteed,
          total: dynamicGrandTotal,
          firmName: dynamicFirmName,
          firmAddress: dynamicFirmAddress,
          firmPhone: dynamicFirmPhone,
          casket: {
            ...casket,
            name: dynamicCasketName,
            manufacturer: dynamicManufacturer,
            interiorFabricColor: dynamicInterior,
            exteriorColor: dynamicExterior,
            constructionType: dynamicConstruction,
            modelNumber: dynamicModel,
            interiorExterior: dynamicInterior,
            exterior: dynamicExterior,
            construction: dynamicConstruction,
            model: dynamicModel,
            price: dynamicCasketPrice,
          },
        },
        db,
        lang,
      });
      addToast(
        isEs ? 'Declaración FSA descargada exitosamente en PDF.' : 'FSA Statement PDF downloaded successfully.',
        'success'
      );
    } catch (err) {
      console.error('[QuoteSummary] Error generating FSA PDF:', err);
      addToast(
        isEs ? 'Error al generar el PDF. Abriendo vista previa de impresión.' : 'Error generating PDF. Opening print preview.',
        'error'
      );
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="quote-summary-wrapper" style={{ paddingBottom: '30px' }}>
      {/* MOBILE SCROLL HINT */}
      <div className="fsa-mobile-scroll-hint">
        <span className="scroll-hint-icon">⇄</span>
        <span>
          {isEs
            ? 'Desliza horizontalmente para ver la cotización completa'
            : 'Scroll horizontally to view full FSA statement'}
        </span>
      </div>

      {/* REPLICATED STATEMENT SHEET (EXACT UI FROM FIRST IMAGE) */}
      <div className="fsa-scroll-container">
        <div
          className="fsa-sheet"
          style={{
            background: '#ffffff',
            border: '1.5px solid #000000',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            maxWidth: '820px',
            minWidth: '780px',
            margin: '0 auto',
            padding: '24px 28px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#000000',
            boxSizing: 'border-box',
          }}
        >
        {/* 1. DOCUMENT HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <h1
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '22px',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              margin: '0 0 3px 0',
              textTransform: 'uppercase',
              color: '#000000',
            }}
          >
            {isEs
              ? 'DECLARACIÓN DE BIENES Y SERVICIOS FUNERARIOS SELECCIONADOS'
              : 'STATEMENT OF FUNERAL GOODS AND SERVICES SELECTED'}
          </h1>
          <div style={{ fontSize: '11px', color: '#4b5563', fontStyle: 'italic' }}>
            {isEs ? 'Borrador de cotización / No es un acuerdo firmado' : 'Draft quotation / Not a signed agreement'}
          </div>
        </div>

        {/* 2. GREEN SERVICE BANNER BOX */}
        <div
          style={{
            border: '1.5px solid #16803b',
            padding: '8px 14px',
            textAlign: 'center',
            marginBottom: '12px',
            background: '#ffffff',
          }}
        >
          <span
            style={{
              color: '#16803b',
              fontWeight: 800,
              fontSize: '20px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            {serviceDisplayName}
          </span>
        </div>

        {/* 3. TWO-COLUMN GRID: SECTION I (STATIC) & SECTION II (DYNAMIC) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            border: '1.5px solid #000000',
            marginBottom: '14px',
          }}
        >
          {/* ================= LEFT COLUMN: Section I — Services (Static) ================= */}
          <div
            style={{
              borderRight: '1.5px solid #000000',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Section Header */}
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '12px',
                  padding: '4px 6px',
                  borderBottom: '1px solid #000000',
                  color: '#000000',
                }}
              >
                {isEs ? 'Sección I — Servicios' : 'Section I — Services'}
              </div>

              {/* Package Plan Option Box */}
              <div
                style={{
                  border: '1px solid #000000',
                  margin: '4px',
                  padding: '5px 7px',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#000000' }}>
                  {isEs ? 'Opción de Paquete' : 'Package Plan Option'}
                </div>
                <div
                  style={{
                    color: '#16803b',
                    fontWeight: 800,
                    fontSize: '13.5px',
                    margin: '2px 0',
                    textTransform: 'uppercase',
                  }}
                >
                  {serviceDisplayName}
                </div>
                <div style={{ fontSize: '10px', color: '#1f2937' }}>
                  {isEs
                    ? 'Ver descripción completa en el adjunto (Lista General de Precios de Referencia).'
                    : 'See full description on attachment (Reference General Price List).'}
                </div>
              </div>

              {/* Itemized Services Subheading */}
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '11px',
                  padding: '4px 6px',
                  borderTop: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                }}
              >
                {isEs ? 'Servicios Detallados' : 'Itemized Services'}
              </div>

              {/* Dynamic Itemized Service Rows */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                <tbody>
                  {dynamicItemizedServices.map((row, idx) => {
                    const isSavings = row.isSavings || row.amount < 0 || row.key === 'packageSavings';
                    const displayPrice = row.displayAmount || (isSavings ? `-${formatMoney(Math.abs(row.amount))}` : formatMoney(row.amount));
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <td style={{ padding: '3.5px 6px', color: '#000000' }}>
                          {row.desc}
                        </td>
                        <td
                          style={{
                            padding: '3.5px 6px',
                            textAlign: 'right',
                            fontWeight: 600,
                            borderLeft: '1px solid #000000',
                            width: '85px',
                            whiteSpace: 'nowrap',
                            color: isSavings ? '#b91c1c' : '#000000',
                          }}
                        >
                          {displayPrice}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Services Footer */}
            <div
              style={{
                display: 'flex',
                borderTop: '1.5px solid #000000',
                fontSize: '11.5px',
                fontWeight: 'bold',
                height: '28px',
                alignItems: 'center',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ flex: 1, padding: '5px 6px' }}>
                {isEs ? 'TOTAL SERVICIOS' : 'TOTAL SERVICES'}
              </div>
              <div
                style={{
                  padding: '5px 6px',
                  borderLeft: '1px solid #000000',
                  width: '85px',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatMoney(effectiveServicesTotal)}
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: Section II — Merchandise (Dynamic) ================= */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Section Header */}
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '12px',
                  padding: '4px 6px',
                  borderBottom: '1px solid #000000',
                  color: '#000000',
                }}
              >
                {isEs ? 'Sección II — Mercancía' : 'Section II — Merchandise'}
              </div>

              {/* Checkboxes: Burial (pre-checked), Cremation, Other */}
              <div
                style={{
                  padding: '4px 6px',
                  borderBottom: '1px solid #000000',
                  fontSize: '11px',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      border: '1.2px solid #000000',
                      textAlign: 'center',
                      lineHeight: '10px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {isBurial ? '✓' : ''}
                  </span>
                  <span>{isEs ? 'Entierro' : 'Burial'}</span>
                </span>

                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      border: '1.2px solid #000000',
                      textAlign: 'center',
                      lineHeight: '10px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {isCremation ? '✓' : ''}
                  </span>
                  <span>{isEs ? 'Cremación' : 'Cremation'}</span>
                </span>

                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      border: '1.2px solid #000000',
                      textAlign: 'center',
                      lineHeight: '10px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {isShip ? '✓' : ''}
                  </span>
                  <span>{isEs ? 'Otro' : 'Other'}</span>
                </span>
              </div>

              {/* Dynamic Merchandise Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '3px 6px', fontWeight: 'bold' }}>
                      {isEs ? 'Ataúd' : 'Casket'}
                    </td>
                    <td
                      style={{
                        padding: '3px 6px',
                        textAlign: 'right',
                        fontWeight: 'bold',
                        borderLeft: '1px solid #000000',
                        width: '85px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatMoney(dynamicCasketPrice)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '3px 6px', color: '#111827' }}>
                      {isEs ? 'Fabricante' : 'Manufacturer'}
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'right', borderLeft: '1px solid #000000' }}>
                      {dynamicManufacturer}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '3px 6px', color: '#111827' }}>
                      {isEs ? 'Nombre' : 'Name'}
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 600, borderLeft: '1px solid #000000' }}>
                      {dynamicCasketName}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '3px 6px', color: '#111827' }}>
                      {isEs ? 'Tela y color interior' : 'Interior fabric and color'}
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'right', borderLeft: '1px solid #000000' }}>
                      {dynamicInterior}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '3px 6px', color: '#111827' }}>
                      {isEs ? 'Color exterior' : 'Exterior color'}
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'right', borderLeft: '1px solid #000000' }}>
                      {dynamicExterior}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '3px 6px', color: '#111827' }}>
                      {isEs ? 'Construcción y tipo' : 'Construction and type'}
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'right', borderLeft: '1px solid #000000' }}>
                      {dynamicConstruction}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '3px 6px', color: '#111827' }}>
                      {isEs ? 'Número de modelo' : 'Model number'}
                    </td>
                    <td style={{ padding: '3px 6px', textAlign: 'right', borderLeft: '1px solid #000000' }}>
                      {dynamicModel}
                    </td>
                  </tr>

                  {/* Outer Burial Container Rows */}
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '3px 6px', fontWeight: 'bold' }}>
                      {isEs ? 'Contenedor Exterior de Entierro' : 'Outer Burial Container'}
                    </td>
                    <td style={{ padding: '3px 6px', borderLeft: '1px solid #000000' }} />
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '3px 6px', color: '#111827' }}>
                      {isEs ? 'Fabricante' : 'Manufacturer'}
                    </td>
                    <td style={{ padding: '3px 6px', borderLeft: '1px solid #000000' }} />
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '3px 6px', color: '#111827' }}>
                      {isEs ? 'Descripción' : 'Description'}
                    </td>
                    <td style={{ padding: '3px 6px', borderLeft: '1px solid #000000' }} />
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '3px 6px', color: '#111827' }}>
                      {isEs ? 'Construcción' : 'Construction'}
                    </td>
                    <td style={{ padding: '3px 6px', borderLeft: '1px solid #000000' }} />
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '3px 6px', color: '#111827' }}>
                      {isEs ? 'Número de modelo' : 'Model number'}
                    </td>
                    <td style={{ padding: '3px 6px', borderLeft: '1px solid #000000' }} />
                  </tr>

                  {/* Guaranteed Merchandise Header & Item */}
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td colSpan={2} style={{ padding: '3px 6px', fontWeight: 'bold' }}>
                      {isEs ? 'Mercancía Garantizada' : 'Guaranteed Merchandise'}
                    </td>
                  </tr>
                  {guaranteedAddons.length > 0 ? (
                    guaranteedAddons.map((item, idx) => {
                      const baseName = getLocalizedText(item, 'name', lang) || item.name;
                      const iName = item.quantity > 1 ? `${baseName} (${item.quantity} × ${formatMoney(item.unitPrice)})` : baseName;
                      const iPrice = Number(item.totalPrice ?? item.price ?? 0);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                          <td style={{ padding: '3px 6px', color: '#111827' }}>
                            {iName}
                          </td>
                          <td
                            style={{
                              padding: '3px 6px',
                              textAlign: 'right',
                              fontWeight: 'bold',
                              borderLeft: '1px solid #000000',
                              width: '85px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatMoney(iPrice)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr style={{ borderBottom: '1px solid #000000' }}>
                      <td colSpan={2} style={{ padding: '3px 6px', color: '#4b5563', fontStyle: 'italic' }}>
                        {isEs
                          ? 'No se seleccionó mercancía garantizada adicional'
                          : 'No additional guaranteed merchandise selected'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

              {/* TOTAL MERCHANDISE Footer */}
              <div
                style={{
                  display: 'flex',
                  borderTop: '1.5px solid #000000',
                  fontSize: '11.5px',
                  fontWeight: 'bold',
                  height: '28px',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ flex: 1, padding: '5px 6px' }}>
                  {isEs ? 'TOTAL MERCANCÍA' : 'TOTAL MERCHANDISE'}
                </div>
                <div
                  style={{
                    padding: '5px 6px',
                    borderLeft: '1px solid #000000',
                    width: '85px',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatMoney(dynamicTotalMerchandise)}
                </div>
              </div>
            </div>

          {/* COMBINED FULL-WIDTH ROW: TOTAL GUARANTEED FUNERAL PRICE (SECTIONS I & II) */}
          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              borderTop: '1.5px solid #000000',
              fontSize: '11.5px',
              fontWeight: 'bold',
              background: '#eaf5ea',
              alignItems: 'center',
              minHeight: '28px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ flex: 1, padding: '5px 8px', color: '#000000' }}>
              {isEs
                ? 'PRECIO FUNERARIO TOTAL GARANTIZADO'
                : 'TOTAL GUARANTEED FUNERAL PRICE'}
            </div>
            <div
              style={{
                padding: '5px 6px',
                borderLeft: '1.5px solid #000000',
                width: '85px',
                textAlign: 'right',
                whiteSpace: 'nowrap',
                color: '#000000',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {formatMoney(dynamicTotalGuaranteed)}
            </div>
          </div>
        </div>

        {/* 4. NON-GUARANTEED CASH ADVANCE ITEMS SECTION (DYNAMIC) */}
        <div style={{ border: '1.5px solid #000000', marginBottom: '14px' }}>
          {/* Header */}
          <div
            style={{
              textAlign: 'center',
              borderBottom: '1px solid #000000',
              padding: '4px 8px',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '11.5px', textTransform: 'uppercase' }}>
              {isEs ? 'ANTICIPOS EN EFECTIVO NO GARANTIZADOS' : 'NON-GUARANTEED CASH ADVANCE ITEMS'}
            </div>
            <div
              style={{
                fontSize: '8.5px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color: '#111827',
                marginTop: '1px',
                lineHeight: 1.25,
              }}
            >
              {isEs
                ? 'USTED, EL COMPRADOR, DEBERÁ PAGAR EN EL MOMENTO DE LA NECESIDAD CUALQUIER CARGO ADICIONAL QUE RESULTE DEL AUMENTO DE PRECIOS PARA LOS SIGUIENTES SERVICIOS Y ARTÍCULOS PREACORDADOS:'
                : 'YOU, THE PURCHASER, WILL HAVE TO PAY, AT THE TIME OF NEED, ANY ADDITIONAL CHARGES RESULTING FROM PRICE INCREASES FOR THE FOLLOWING PREARRANGED SERVICES AND COMMODITIES:'}
            </div>
          </div>

          {/* Side-by-Side Subcolumns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {/* Left Box: Step 5 Addons */}
            <div style={{ borderRight: '1.5px solid #000000' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                <tbody>
                  {/* Selected Add-ons mapped from QuoteContext & Custom Manual Items */}
                  {dynamicSelectedAddons.length === 0 && customNonGuaranteedItems.length === 0 ? (
                    <tr>
                      <td style={{ padding: '4px 6px', color: '#94a3b8', fontStyle: 'italic' }}>
                        {isEs ? 'Ningún adicional no garantizado seleccionado' : 'No non-guaranteed add-ons selected'}
                      </td>
                      <td
                        style={{
                          padding: '4px 6px',
                          textAlign: 'right',
                          fontWeight: 600,
                          borderLeft: '1px solid #000000',
                          width: '85px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        $0.00
                      </td>
                    </tr>
                  ) : (
                    <>
                      {dynamicSelectedAddons.map((addon, aIdx) => {
                        const aName = typeof addon === 'string'
                          ? (isEs ? t(addon) : addon)
                          : (getLocalizedText(addon, 'name', lang) || addon.name || 'Add-on Item');
                        const aPrice = typeof addon === 'object' && addon.price !== undefined ? addon.price : 0;
                        return (
                          <tr key={`addon-${aIdx}`} style={{ borderBottom: '1px solid #cbd5e1' }}>
                            <td style={{ padding: '4px 6px' }}>{aName}</td>
                            <td
                              style={{
                                padding: '4px 6px',
                                textAlign: 'right',
                                fontWeight: 600,
                                borderLeft: '1px solid #000000',
                                width: '85px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatMoney(aPrice)}
                            </td>
                          </tr>
                        );
                      })}
                      {customNonGuaranteedItems.map((item, cIdx) => (
                        <tr key={`custom-${cIdx}`} style={{ borderBottom: '1px solid #cbd5e1' }}>
                          <td style={{ padding: '4px 6px' }}>{item.name}</td>
                          <td
                            style={{
                              padding: '4px 6px',
                              textAlign: 'right',
                              fontWeight: 600,
                              borderLeft: '1px solid #000000',
                              width: '85px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatMoney(item.price)}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Right Box: Sales Tax */}
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '4px 6px' }}>
                      <div>{isEs ? 'Impuesto sobre Ventas' : 'Sales Tax'}</div>
                      {guaranteedAddonsTax > 0 && (
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '1px' }}>
                          {isEs
                            ? `(incluye 11% sobre mercancía garantizada: ${formatMoney(guaranteedAddonsTax)})`
                            : `(includes 11% tax on guaranteed items: ${formatMoney(guaranteedAddonsTax)})`}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '4px 6px',
                        textAlign: 'right',
                        fontWeight: 600,
                        borderLeft: '1px solid #000000',
                        width: '85px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatMoney(dynamicSalesTax)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Subtotal Total Non-Guaranteed Cash Advance Items */}
          <div
            style={{
              display: 'flex',
              borderTop: '1.5px solid #000000',
              fontSize: '11.5px',
              fontWeight: 'bold',
            }}
          >
            <div style={{ flex: 1, padding: '5px 6px' }}>
              {isEs ? 'TOTAL ANTICIPOS EN EFECTIVO NO GARANTIZADOS' : 'TOTAL NON-GUARANTEED CASH ADVANCE ITEMS'}
            </div>
            <div
              style={{
                padding: '5px 6px',
                borderLeft: '1px solid #000000',
                width: '85px',
                textAlign: 'right',
                whiteSpace: 'nowrap',
              }}
            >
              {formatMoney(dynamicTotalNonGuaranteed)}
            </div>
          </div>
        </div>

        {/* 5. GRAND TOTAL BOX (COMBINING GUARANTEED + NON-GUARANTEED) */}
        <div
          style={{
            border: '2px solid #000000',
            padding: '6px 10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '14.5px', fontWeight: 'bold' }}>
            {isEs
              ? 'Total de Artículos Garantizados y No Garantizados'
              : 'Total Guaranteed and Non-Guaranteed Items'}
          </span>
          <span style={{ fontSize: '16.5px', fontWeight: 'bold' }}>
            {formatMoney(dynamicGrandTotal)}
          </span>
        </div>

        {/* 6. DUAL SIGNATURE LINES BLOCK */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            fontSize: '11px',
            marginBottom: '18px',
          }}
        >
          {/* Left Column: Funeral Firm Representative */}
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
              {isEs ? 'Nombre de la Funeraria' : 'Funeral Firm Name'}
            </div>
            <div style={{ borderBottom: '1px solid #000000', paddingBottom: '3px', fontWeight: 600 }}>
              {dynamicFirmName}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', marginTop: '10px' }}>
              <div>
                <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                  {isEs ? 'Dirección' : 'Address'}
                </span>
                <div style={{ borderBottom: '1px solid #000000', minHeight: '18px', fontSize: '10px', color: '#334155', paddingTop: '2px' }}>
                  {dynamicFirmAddress}
                </div>
              </div>
              <div>
                <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                  {isEs ? 'Fecha' : 'Date'}
                </span>
                <div style={{ borderBottom: '1px solid #000000', height: '18px' }} />
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                {isEs ? 'Teléfono' : 'Phone'}
              </span>
              <div style={{ borderBottom: '1px solid #000000', minHeight: '18px', fontSize: '10.5px', color: '#334155' }}>
                {dynamicFirmPhone}
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                {isEs ? 'Representante de la Funeraria' : 'Funeral Firm Representative'}
              </span>
              <div style={{ borderBottom: '1px solid #000000', height: '18px' }} />
            </div>
          </div>

          {/* Right Column: Beneficiary Signature */}
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
              {isEs
                ? 'Firma del Beneficiario del Contrato (Asegurado)'
                : "Contract Beneficiary's (Insured's) Signature"}
            </div>
            <div style={{ borderBottom: '1px solid #000000', height: '22px' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', marginTop: '10px' }}>
              <div>
                <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                  {isEs ? 'Dirección' : 'Address'}
                </span>
                <div style={{ borderBottom: '1px solid #000000', height: '18px' }} />
              </div>
              <div>
                <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                  {isEs ? 'Fecha' : 'Date'}
                </span>
                <div style={{ borderBottom: '1px solid #000000', height: '18px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '12px', marginTop: '10px' }}>
              <div>
                <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                  {isEs ? 'Teléfono' : 'Phone'}
                </span>
                <div style={{ borderBottom: '1px solid #000000', height: '18px' }} />
              </div>
              <div>
                <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>
                  {isEs ? 'Nombre en Letra de Molde' : "Insured's Printed Name"}
                </span>
                <div style={{ borderBottom: '1px solid #000000', height: '18px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* 7. BOTTOM TAN DRAFT FSA NOTICE BOX */}
        <div
          style={{
            background: '#fdfaf0',
            border: '1px solid #f2e2be',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '11px',
            color: '#78350f',
            lineHeight: 1.4,
          }}
        >
          {isEs
            ? 'Borrador FSA: los precios de los paquetes y las asignaciones de servicios individuales deben revisarse con el FSA aprobado de la funeraria antes de su uso.'
            : 'Draft FSA: the package prices and individual service allocations must be reviewed against the approved funeral-home FSA before use.'}
        </div>
      </div>
    </div>

      {/* 8. BOTTOM STEP ACTION BUTTONS */}
      <div
        className="step-actions"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '28px',
          maxWidth: '820px',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0',
          gap: '16px',
        }}
      >
        <Button
          variant="default"
          onClick={onBack}
          style={{
            padding: '12px 28px',
            fontSize: '14.5px',
            fontWeight: 650,
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            borderColor: '#cbd5e1',
            color: '#183655',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          ← {isEs ? 'Atrás' : 'Back'}
        </Button>

        <Button
          variant="primary"
          onClick={handlePrintSavePdf}
          disabled={isGeneratingPdf}
          loading={isGeneratingPdf}
          style={{
            backgroundColor: '#183655',
            borderColor: '#183655',
            padding: '12px 34px',
            fontSize: '14.5px',
            fontWeight: 700,
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 3px 8px rgba(24, 54, 85, 0.25)',
          }}
        >
          {!isGeneratingPdf && <span style={{ fontSize: '18px' }}>🖨️</span>}
          <span>
            {isGeneratingPdf
              ? (isEs ? 'Generando PDF...' : 'Generating PDF...')
              : (isEs ? 'Imprimir / Guardar FSA' : 'Print / Save FSA Quote')}
          </span>
        </Button>

        {onContinue && (
          <Button
            variant="primary"
            onClick={onContinue}
            style={{
              backgroundColor: '#145633',
              borderColor: '#145633',
              padding: '12px 28px',
              fontSize: '14.5px',
              fontWeight: 700,
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 3px 8px rgba(20, 86, 51, 0.25)',
            }}
          >
            <span>{isEs ? 'Documentos Legales y Firmas →' : 'Proceed to Legal Documents →'}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
