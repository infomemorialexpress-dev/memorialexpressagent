import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useQuote } from '../../context/QuoteContext.jsx';
import Button from '../common/Button.jsx';
import api from '../../services/api.js';

export default function LegalDocuments({ onBack, onContinue }) {
  const { t } = useTranslation();
  const { lang, quote, funeralHomes = [], addToast } = useQuote();

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

  // Form state
  const [isGenerating, setIsGenerating] = useState(false);
  const [formError, setFormError] = useState('');

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
          'Por medio del presente instrumento, el representante legal o familiar más cercano con derecho',
          `legal del difunto autoriza de manera expresa a ${homeTitle} y a sus agentes autorizados`,
          'a proceder con la recepción, custodia, preparación y disposición final de acuerdo con el paquete',
          'funerario y las especificaciones convenidas.',
          '',
          'Se certifica bajo pena de perjurio que se posee la debida autoridad legal para tomar decisiones',
          'con respecto a los restos mortales y se exime de toda responsabilidad legal a la funeraria y a',
          'sus directores por cualquier acto realizado de buena fe en virtud de esta autorización legal.',
        ]
      : [
          'AUTHORIZATION AND LEGAL RELEASE DISCLOSURE',
          '',
          'The authorized representative or Next-of-Kin of the deceased hereby authorizes and directs',
          `${homeTitle} and its licensed funeral directors and designated agents to receive, transfer,`,
          'prepare, and carry out the final disposition of the deceased according to selected terms.',
          '',
          'It is certified under penalty of law that the legal right to control the disposition of remains',
          'pursuant to applicable health and safety codes is held, agreeing to hold harmless the funeral',
          'establishment from any and all claims arising from reasonable reliance on this authorization.',
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
   * Main Generate & Download workflow (signature and signer details not required)
   */
  const handleDownloadDocument = async () => {
    setFormError('');

    if (!selectedForm) {
      setFormError(t('legal.select_form_first', 'Please select a document first.'));
      return;
    }

    setIsGenerating(true);

    try {
      let pdfDoc;

      // 1. Fetch PDF from form URL or create base template
      const docUrl = selectedForm.fileUrl || selectedForm.url || '';
      if (docUrl && docUrl.trim()) {
        try {
          const res = await fetch(docUrl);
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

      // 2. Serialize and trigger browser download
      const finalPdfBytes = await pdfDoc.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);

      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      const cleanTitle = (selectedForm.formTitle || 'Release_Form').replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadLink.download = `${cleanTitle}_${Date.now()}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadUrl);

      addToast(
        isEs
          ? `¡Documento "${selectedForm.formTitle}" descargado exitosamente!`
          : `Document "${selectedForm.formTitle}" downloaded successfully!`,
        'success'
      );
    } catch (err) {
      console.error('[LegalDocuments] Error downloading PDF:', err);
      setFormError(err.message || 'Failed to process and download the PDF document.');
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
              ? 'Seleccione una autorización requerida o formulario para generar y descargar el documento legal.'
              : 'Select a required release authorization or document to view and download.'
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
          {t('legal.select_form', isEs ? 'Seleccione el Formulario de Liberación' : 'Select Release Document')}
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
                      backgroundColor: form.fileUrl ? '#fee2e2' : (form.externalLink ? '#eff6ff' : '#f1f5f9'),
                      color: form.fileUrl ? '#dc2626' : (form.externalLink ? '#2563eb' : '#475569'),
                      fontWeight: 800,
                      fontSize: '11px',
                      padding: '3px 7px',
                      borderRadius: '5px',
                    }}
                  >
                    {form.fileUrl ? 'PDF' : (form.externalLink ? 'LINK' : 'DOC')}
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

                {form.note && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#475569',
                      lineHeight: 1.4,
                      backgroundColor: isSelected ? '#e0f2fe' : '#f8fafc',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      borderLeft: '3px solid #3b82f6',
                    }}
                    title={form.note}
                  >
                    ℹ️ {form.note}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
                  {form.fileUrl || form.url ? (
                    <a
                      href={form.fileUrl || form.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: '11.5px',
                        color: '#2563eb',
                        textDecoration: 'underline',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      📄 {isEs ? 'Ver PDF Original ↗' : 'Preview Original PDF ↗'}
                    </a>
                  ) : (
                    !form.externalLink && (
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {isEs ? 'Plantilla oficial estandarizada' : 'Official standardized release document'}
                      </div>
                    )
                  )}

                  {form.externalLink && (
                    <a
                      href={form.externalLink.startsWith('http') ? form.externalLink : `https://${form.externalLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11.5px',
                        fontWeight: 650,
                        color: '#1d4ed8',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        textDecoration: 'none',
                      }}
                      title={form.externalLink}
                    >
                      🔗 {isEs ? 'Enlace Externo ↗' : 'External Link ↗'}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {selectedForm?.externalLink && (
            <a
              href={selectedForm.externalLink.startsWith('http') ? selectedForm.externalLink : `https://${selectedForm.externalLink}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 650,
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                textDecoration: 'none',
              }}
            >
              <span>🔗</span>
              <span>{isEs ? 'Abrir Enlace Externo ↗' : 'Open External Link ↗'}</span>
            </a>
          )}

          <Button
            variant="primary"
            onClick={handleDownloadDocument}
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
            {!isGenerating && <span>📄</span>}
            <span>
              {isGenerating
                ? t('legal.generating_pdf', isEs ? 'Generando PDF...' : 'Generating PDF...')
                : t('legal.download_document', isEs ? 'Descargar Documento' : 'Download Document')}
            </span>
          </Button>

          {onContinue && (
            <Button
              variant="default"
              onClick={onContinue}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 650,
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
              }}
            >
              {isEs ? 'Finalizar' : 'Finish'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
