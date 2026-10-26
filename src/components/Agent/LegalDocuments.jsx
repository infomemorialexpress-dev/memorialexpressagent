import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useQuote } from '../../context/QuoteContext.jsx';
import Button from '../common/Button.jsx';
import InputField from '../common/InputField.jsx';
import api from '../../services/api.js';

export default function LegalDocuments({ onBack, onContinue }) {
  const { t } = useTranslation();
  const { lang, quote, db, funeralHomes = [], addToast } = useQuote();

  const isEs = lang === 'es';

  // Live forms fetched from backend
  const [liveForms, setLiveForms] = useState([]);

  // Resolve active funeral home
  const targetHomeId = String(quote.homeId || quote.home || '').toLowerCase();
  const activeHome =
    funeralHomes.find((h) => {
      const hId = String(h._id || h.id || '').toLowerCase();
      const hName = String(h.name || '').toLowerCase();
      const qHomeName = String(quote.homeName || quote.home || '').toLowerCase();
      return (
        (hId && targetHomeId && hId === targetHomeId) ||
        (hName && qHomeName && hName === qHomeName)
      );
    }) ||
    quote.selectedHomeObj ||
    null;

  const resolvedHomeId = activeHome?._id || activeHome?.id || quote.homeId || quote.home;

  // Fetch live custom forms directly for this funeral home if available
  useEffect(() => {
    let isMounted = true;
    if (resolvedHomeId) {
      api
        .get(`/funeral-homes/${resolvedHomeId}/custom-forms`)
        .then((res) => {
          if (isMounted && Array.isArray(res.data) && res.data.length > 0) {
            setLiveForms(res.data);
          }
        })
        .catch(() => {
          // If dedicated endpoint is not reachable, fallback quietly to home's embedded forms
        });
    }
    return () => {
      isMounted = false;
    };
  }, [resolvedHomeId]);

  // Merge live custom forms and activeHome.customForms
  const baseCustomForms = Array.isArray(activeHome?.customForms) ? activeHome.customForms : [];
  const customForms = liveForms.length > 0 ? liveForms : baseCustomForms;

  // If no custom forms uploaded yet, provide standard release forms
  const availableForms =
    customForms.length > 0
      ? customForms
      : [
          {
            id: 'sample_cremation_auth',
            formTitle: isEs
              ? 'Autorización y Liberación de Cremación (Estándar)'
              : 'Cremation & Disposition Authorization (Standard)',
            fileUrl: '', // Will generate standard base document on the fly
            isDefaultTemplate: true,
          },
          {
            id: 'sample_custody_release',
            formTitle: isEs
              ? 'Autorización de Custodia y Traslado Funerario'
              : 'Custody & Transfer Authorization of Remains',
            fileUrl: '',
            isDefaultTemplate: true,
          },
        ];

  const [selectedForm, setSelectedForm] = useState(availableForms[0] || null);

  // Automatically sync selectedForm if forms change asynchronously
  useEffect(() => {
    if (availableForms.length > 0) {
      const stillValid =
        selectedForm &&
        availableForms.some(
          (f) =>
            (f.id && f.id === selectedForm.id) ||
            (f._id && f._id === selectedForm._id) ||
            f.formTitle === selectedForm.formTitle
        );
      if (!stillValid) {
        setSelectedForm(availableForms[0]);
      }
    }
  }, [availableForms, selectedForm]);

  // Form inputs
  const [signerName, setSignerName] = useState('');
  const [signDate, setSignDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [relationship, setRelationship] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formError, setFormError] = useState('');

  const sigCanvasRef = useRef(null);

  // Auto-fill signer name if quote has decedent/client info
  useEffect(() => {
    if (!signerName && quote.clientName) {
      setSignerName(quote.clientName);
    }
  }, [quote.clientName]);

  const handleClearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
  };

  /**
   * Generates a clean base release form PDF in memory if the form is a default template
   */
  const createBaseTemplatePdf = async (title) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Standard US Letter
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();

    // Top Header
    page.drawRectangle({
      x: 36,
      y: height - 80,
      width: width - 72,
      height: 48,
      color: rgb(0.09, 0.21, 0.33), // Navy
    });

    page.drawText('MEMORIAL EXPRESS - LEGAL DISCLOSURE & RELEASE', {
      x: 48,
      y: height - 52,
      size: 13,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    const homeTitle = activeHome?.name || quote.homeName || 'Designated Funeral Provider';
    page.drawText(`Location: ${homeTitle}`, {
      x: 48,
      y: height - 68,
      size: 9.5,
      font,
      color: rgb(0.85, 0.9, 0.95),
    });

    // Document Title
    page.drawText(title.toUpperCase(), {
      x: 36,
      y: height - 110,
      size: 14,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Horizontal Divider
    page.drawLine({
      start: { x: 36, y: height - 118 },
      end: { x: width - 36, y: height - 118 },
      thickness: 1.5,
      color: rgb(0.1, 0.22, 0.35),
    });

    // Legal Body Text
    const bodyLines = isEs
      ? [
          'AUTORIZACIÓN Y DECLARACIÓN DE LIBERACIÓN LEGAL',
          '',
          'Por medio del presente instrumento, el firmante abajo suscrito, actuando en su calidad de',
          'familiar más cercano con derecho legal o representante autorizado del difunto, autoriza de',
          `manera expresa e irrevocable a ${homeTitle} y a sus agentes autorizados a proceder con`,
          'la recepción, custodia, embalsamamiento o preparación, y disposición final de acuerdo con',
          'el paquete funerario y las especificaciones convenidas.',
          '',
          'El firmante certifica bajo pena de perjurio que posee la debida autoridad legal para tomar',
          'decisiones con respecto a los restos mortales y exime de toda responsabilidad legal a la',
          'funeraria y a sus directores por cualquier acto realizado de buena fe en virtud de esta',
          'autorización legal.',
          '',
          'Este documento legal ha sido ejecutado mediante firma electrónica conforme a la Ley de',
          'Firmas Electrónicas en el Comercio Global y Nacional (E-SIGN Act).',
        ]
      : [
          'AUTHORIZATION AND LEGAL RELEASE DISCLOSURE',
          '',
          'The undersigned, having full legal authority and acting in the capacity of Next-of-Kin or',
          `authorized legal representative of the deceased, hereby authorizes and directs ${homeTitle}`,
          'and its licensed funeral directors and designated agents to receive, transfer, embalm or',
          'prepare, and carry out the final disposition of the deceased according to selected terms.',
          '',
          'The undersigned certifies under penalty of law that they hold the legal right to control the',
          'disposition of remains pursuant to applicable state health and safety codes, and agrees to',
          'indemnify and hold harmless the funeral establishment from any and all claims arising from',
          'reasonable reliance on this authorization.',
          '',
          'This legal instrument is executed via digital signature in full compliance with the Federal',
          'Electronic Signatures in Global and National Commerce Act (E-SIGN) and applicable state laws.',
        ];

    let currentY = height - 145;
    for (const line of bodyLines) {
      if (line === '') {
        currentY -= 10;
        continue;
      }
      const isHeader = line === bodyLines[0];
      page.drawText(line, {
        x: 36,
        y: currentY,
        size: isHeader ? 11 : 9.5,
        font: isHeader ? fontBold : font,
        color: isHeader ? rgb(0.1, 0.22, 0.35) : rgb(0.2, 0.2, 0.2),
      });
      currentY -= 16;
    }

    return pdfDoc;
  };

  /**
   * Main Sign & Generate workflow using pdf-lib and react-signature-canvas
   */
  const handleSignAndGenerate = async () => {
    setFormError('');

    if (!selectedForm) {
      setFormError(t('legal.select_form_first', 'Please select a document first.'));
      return;
    }

    if (!signerName.trim()) {
      setFormError(t('legal.name_required', "Please enter the signer's full name."));
      return;
    }

    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      setFormError(t('legal.signature_required', 'Please draw your digital signature before generating.'));
      return;
    }

    setIsGenerating(true);

    try {
      let pdfDoc;

      // 1. Fetch PDF from fileUrl or create template
      if (selectedForm.fileUrl && selectedForm.fileUrl.trim()) {
        try {
          const res = await fetch(selectedForm.fileUrl);
          if (!res.ok) {
            throw new Error(`Failed to fetch PDF (${res.status} ${res.statusText})`);
          }
          const pdfBytes = await res.arrayBuffer();
          pdfDoc = await PDFDocument.load(pdfBytes);
        } catch (fetchErr) {
          console.warn('[LegalDocuments] Could not load uploaded PDF directly, generating template:', fetchErr);
          pdfDoc = await createBaseTemplatePdf(selectedForm.formTitle);
        }
      } else {
        pdfDoc = await createBaseTemplatePdf(selectedForm.formTitle);
      }

      // 2. Extract signature PNG image from canvas
      const signaturePngDataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
      const signaturePngBytes = await fetch(signaturePngDataUrl).then((r) => r.arrayBuffer());
      const embeddedSignature = await pdfDoc.embedPng(signaturePngBytes);

      // 3. Fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // 4. Determine page to stamp signature block (last page)
      const pages = pdfDoc.getPages();
      let targetPage = pages[pages.length - 1];
      let { width, height } = targetPage.getSize();

      // Check if page has sufficient vertical space for the endorsement box (needs at least 150 points)
      // If height is tight, append an endorsement page to keep it clean and neat
      const boxHeight = 115;
      const margin = 36;
      const boxWidth = width - margin * 2;
      const boxY = 35;

      // 5. Draw Signature Endorsement Box on target page
      targetPage.drawRectangle({
        x: margin,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        color: rgb(0.97, 0.98, 1),
        borderColor: rgb(0.09, 0.21, 0.33),
        borderWidth: 1.5,
      });

      // Top title bar inside box
      targetPage.drawRectangle({
        x: margin,
        y: boxY + boxHeight - 22,
        width: boxWidth,
        height: 22,
        color: rgb(0.09, 0.21, 0.33),
      });

      targetPage.drawText(
        isEs ? 'EJECUCIÓN Y FIRMA DIGITAL LEGAL' : 'LEGAL DIGITAL EXECUTION & SIGNATURE ENDORSEMENT',
        {
          x: margin + 12,
          y: boxY + boxHeight - 16,
          size: 8.5,
          font: fontBold,
          color: rgb(1, 1, 1),
        }
      );

      // Signer Name
      targetPage.drawText(isEs ? 'Firmante Autorizado:' : 'Authorized Signer:', {
        x: margin + 14,
        y: boxY + boxHeight - 40,
        size: 9,
        font: fontBold,
        color: rgb(0.1, 0.2, 0.3),
      });
      targetPage.drawText(signerName.trim(), {
        x: margin + 130,
        y: boxY + boxHeight - 40,
        size: 9.5,
        font,
        color: rgb(0, 0, 0),
      });

      // Relationship
      targetPage.drawText(isEs ? 'Parentesco / Relación:' : 'Relationship to Deceased:', {
        x: margin + 14,
        y: boxY + boxHeight - 58,
        size: 9,
        font: fontBold,
        color: rgb(0.1, 0.2, 0.3),
      });
      targetPage.drawText(relationship.trim() || (isEs ? 'Familiar Directo' : 'Next of Kin'), {
        x: margin + 130,
        y: boxY + boxHeight - 58,
        size: 9.5,
        font,
        color: rgb(0, 0, 0),
      });

      // Date & Timestamp
      targetPage.drawText(isEs ? 'Fecha de Ejecución:' : 'Date of Execution:', {
        x: margin + 14,
        y: boxY + boxHeight - 76,
        size: 9,
        font: fontBold,
        color: rgb(0.1, 0.2, 0.3),
      });
      targetPage.drawText(`${signDate} (${new Date().toLocaleTimeString()})`, {
        x: margin + 130,
        y: boxY + boxHeight - 76,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      });

      // Verification Badge / Note
      targetPage.drawText(
        isEs
          ? '✓ Firma electrónica verificada conforme a E-SIGN Act y UETA.'
          : '✓ Digitally verified signature pursuant to E-SIGN Act and UETA guidelines.',
        {
          x: margin + 14,
          y: boxY + 12,
          size: 7.5,
          font,
          color: rgb(0.3, 0.5, 0.3),
        }
      );

      // Embedded Signature Image
      const maxSigW = 150;
      const maxSigH = 50;
      const scale = Math.min(maxSigW / embeddedSignature.width, maxSigH / embeddedSignature.height);
      const sigW = embeddedSignature.width * scale;
      const sigH = embeddedSignature.height * scale;

      const sigX = margin + boxWidth - sigW - 20;
      const sigY = boxY + 24;

      targetPage.drawImage(embeddedSignature, {
        x: sigX,
        y: sigY,
        width: sigW,
        height: sigH,
      });

      // Signature underline
      targetPage.drawLine({
        start: { x: margin + boxWidth - maxSigW - 20, y: sigY - 2 },
        end: { x: margin + boxWidth - 15, y: sigY - 2 },
        thickness: 1,
        color: rgb(0.3, 0.3, 0.3),
      });

      targetPage.drawText(isEs ? 'Firma Digital del Otorgante' : 'Authorized Digital Signature', {
        x: margin + boxWidth - maxSigW - 10,
        y: sigY - 12,
        size: 7.5,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });

      // 6. Serialize and trigger browser download
      const finalPdfBytes = await pdfDoc.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);

      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      const cleanTitle = (selectedForm.formTitle || 'Release_Form').replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadLink.download = `Signed_${cleanTitle}_${Date.now()}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadUrl);

      addToast(
        isEs
          ? `¡Documento "${selectedForm.formTitle}" firmado y descargado exitosamente!`
          : `Document "${selectedForm.formTitle}" successfully signed & downloaded!`,
        'success'
      );
    } catch (err) {
      console.error('[LegalDocuments] Error signing PDF:', err);
      setFormError(err.message || 'Failed to process and sign the PDF document.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Step Header */}
      <div className="section-header">
        <h2 className="section-title">
          ⚖️ {t('legal.title', isEs ? 'Documentos Legales y Formularios de Liberación' : 'Legal Documents & Release Forms')}
        </h2>
        <p className="section-subtitle">
          {t(
            'legal.subtitle',
            isEs
              ? 'Seleccione una autorización requerida, complete los datos del firmante y proporcione una firma digital para generar y descargar el documento legal firmado.'
              : 'Select a required release authorization, fill in signer details, and provide a digital signature to generate and download the completed legal document.'
          )}
        </p>
      </div>

      {formError && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '13.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚠️</span>
          <span>{formError}</span>
        </div>
      )}

      {/* Selected Funeral Home Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '12px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🏛️</span>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              {isEs ? 'Funeraria Seleccionada' : 'Selected Funeral Home'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#183655' }}>
              {activeHome?.name || quote.homeName || 'Pacific Crest Memorial'}
            </div>
          </div>
        </div>

        <span
          style={{
            backgroundColor: '#e0f2fe',
            color: '#0369a1',
            fontSize: '12px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '12px',
          }}
        >
          {customForms.length}{' '}
          {isEs ? 'formularios configurados' : 'custom forms available'}
        </span>
      </div>

      {/* 1. SELECT RELEASE FORM */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 700,
            color: '#183655',
            marginBottom: '10px',
          }}
        >
          {t('legal.select_form', isEs ? '1. Seleccione el Formulario de Liberación' : '1. Select Release Document')}
        </label>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
          }}
        >
          {availableForms.map((form, idx) => {
            const isSelected = selectedForm && (selectedForm.id === form.id || selectedForm.formTitle === form.formTitle);
            return (
              <div
                key={form.id || idx}
                onClick={() => setSelectedForm(form)}
                style={{
                  border: isSelected ? '2px solid #183655' : '1.5px solid #e2e8f0',
                  backgroundColor: isSelected ? '#f0f7ff' : '#ffffff',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.15s ease-in-out',
                  boxShadow: isSelected ? '0 4px 12px rgba(24,54,85,0.08)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      fontWeight: 800,
                      fontSize: '11px',
                      padding: '3px 7px',
                      borderRadius: '5px',
                    }}
                  >
                    PDF
                  </span>
                  {isSelected ? (
                    <span
                      style={{
                        backgroundColor: '#183655',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      ✓ {isEs ? 'Seleccionado' : 'Selected'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {isEs ? 'Haga clic para elegir' : 'Click to select'}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', lineHeight: 1.35 }}>
                  {form.formTitle}
                </div>

                {form.fileUrl ? (
                  <div style={{ fontSize: '11.5px', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <a
                      href={form.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: '#2563eb', textDecoration: 'underline' }}
                    >
                      {isEs ? 'Ver PDF Original ↗' : 'Preview Original PDF ↗'}
                    </a>
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {isEs ? 'Plantilla oficial estandarizada' : 'Official standardized release document'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. SIGNER INFORMATION INPUTS */}
      {selectedForm && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, color: '#183655' }}>
            {isEs ? '2. Datos del Firmante Autorizado' : '2. Authorized Signer Information'}
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            <div>
              <InputField
                label={t('legal.signer_name', isEs ? 'Nombre Legal Completo' : 'Full Legal Name')}
                placeholder={t('legal.signer_name_placeholder', isEs ? 'ej. María González' : 'e.g. John Doe')}
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                required
              />
            </div>

            <div>
              <InputField
                label={t('legal.relationship', isEs ? 'Parentesco / Relación con el Difunto' : 'Relationship to Deceased')}
                placeholder={t(
                  'legal.relationship_placeholder',
                  isEs ? 'ej. Cónyuge, Hijo/a, Familiar Directo' : 'e.g. Spouse, Son, Daughter, Next of Kin'
                )}
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              />
            </div>

            <div>
              <InputField
                label={t('legal.sign_date', isEs ? 'Fecha' : 'Date')}
                type="date"
                value={signDate}
                onChange={(e) => setSignDate(e.target.value)}
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. DIGITAL SIGNATURE PAD */}
      {selectedForm && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#183655' }}>
                ✍️ {t('legal.digital_signature', isEs ? '3. Firma Digital del Otorgante' : '3. Digital Signature')} *
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                {t(
                  'legal.draw_signature',
                  isEs
                    ? 'Firme dentro del recuadro a continuación utilizando el ratón o su dedo/lápiz táctil.'
                    : 'Draw your signature inside the canvas using a mouse, stylus, or touchscreen.'
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearSignature}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 650,
                cursor: 'pointer',
              }}
            >
              🔄 {t('legal.clear_signature', isEs ? 'Limpiar Firma' : 'Clear Signature')}
            </button>
          </div>

          {/* Signature Canvas Container */}
          <div
            style={{
              backgroundColor: '#fafbfc',
              border: '2px dashed #cbd5e1',
              borderRadius: '10px',
              overflow: 'hidden',
              height: '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <SignatureCanvas
              ref={sigCanvasRef}
              penColor="#0f172a"
              canvasProps={{
                style: {
                  width: '100%',
                  height: '180px',
                  cursor: 'crosshair',
                },
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '30px',
                left: '30px',
                right: '30px',
                borderBottom: '1px dashed #cbd5e1',
                pointerEvents: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '2px',
              }}
            >
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                ✕ {isEs ? 'Línea de Firma' : 'Sign on line'}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {isEs ? 'Firma autorizada' : 'Authorized Signature'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '20px',
          marginTop: '10px',
        }}
      >
        <Button
          variant="default"
          onClick={onBack}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 650,
            borderRadius: '8px',
          }}
        >
          ← {isEs ? 'Volver a Cotización' : 'Back to Quote Summary'}
        </Button>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="primary"
            onClick={handleSignAndGenerate}
            loading={isGenerating}
            disabled={isGenerating || !selectedForm}
            style={{
              backgroundColor: '#183655',
              borderColor: '#183655',
              padding: '12px 28px',
              fontSize: '14.5px',
              fontWeight: 700,
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(24,54,85,0.2)',
            }}
          >
            {!isGenerating && <span>✍️</span>}
            <span>
              {isGenerating
                ? t('legal.generating_signed_pdf', isEs ? 'Firmando y Generando PDF...' : 'Signing & Generating PDF...')
                : t('legal.sign_and_generate', isEs ? 'Firmar y Generar Documento' : 'Sign & Generate Document')}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
