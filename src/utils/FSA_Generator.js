import { jsPDF } from 'jspdf';
import { formatMoney } from './quoteLogic.js';

export function generateFSAPdf({ quote, calculation, db, lang = 'en' }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 28;
  const contentWidth = pageWidth - margin * 2;
  let y = margin + 4;

  const isEs = lang === 'es';

  // Colors
  const black = [0, 0, 0];
  const mutedGray = [100, 116, 139];
  const greenHeader = [22, 128, 59]; // #16803b
  const lightGreenBg = [234, 245, 234]; // #eaf5ea
  const tanBg = [253, 250, 240]; // #fdfaf0
  const tanBorder = [242, 226, 190]; // #f2e2be
  const tanText = [120, 53, 15]; // #78350f
  const borderLight = [203, 213, 225];

  // ================= 1. STATIC (HARDCODED) ELEMENTS =================
  const STATIC_SECTION_1_SERVICES = [
    { desc: isEs ? 'Arreglos y personal profesional' : 'Arrangements and professional staff', amount: 2050.0 },
    { desc: isEs ? 'Traslado (25 millas)' : 'Transfer (25 miles)', amount: 695.0 },
    { desc: isEs ? 'Embalsamamiento / refrigeración' : 'Embalming / refrigeration', amount: 525.0 },
    { desc: isEs ? 'Otra preparación' : 'Other preparation', amount: 200.0 },
    { desc: isEs ? 'Velación (3 horas)' : 'Visitation (3 hours)', amount: 300.0 },
    { desc: isEs ? 'Servicio funerario / memorial' : 'Funeral/memorial service', amount: 150.0 },
    { desc: isEs ? 'Carroza funeraria' : 'Funeral coach', amount: 375.0 },
    { desc: isEs ? 'Vehículos utilitarios / otros' : 'Utility vehicles / other', amount: 100.0 },
    { desc: isEs ? 'Ahorro de paquete' : 'Package savings', amount: -1000.0 },
  ];

  const STATIC_SERVICES_TOTAL = 3395.0;
  const STATIC_DISPOSITION_PERMIT_FEE = 12.0;
  const STATIC_DEATH_CERT_UNIT_PRICE = (quote?.deathCertUnitPrice && quote.deathCertUnitPrice !== 26 && quote.deathCertUnitPrice !== 24)
    ? Number(quote.deathCertUnitPrice)
    : (calculation?.deathCertFee && calculation.deathCertFee !== 26 && calculation.deathCertFee !== 24 ? Number(calculation.deathCertFee) : 94.0);
  const STATIC_SALES_TAX_RATE = 0.095;

  // ================= 2. DYNAMIC (CONTEXT-BASED) ELEMENTS =================
  const homeObj = calculation?.homeObj || quote?.selectedHomeObj || {};
  const serviceKey = quote?.service || 'one_day';
  const serviceTitle = (quote?.serviceName || calculation?.serviceTitle || 'ONE-DAY FUNERAL').toUpperCase();

  const isCremation = serviceKey.includes('cremation');
  const isShip = serviceKey.includes('ship');
  const isBurial = !isCremation && !isShip;

  const casket = calculation?.casket || quote?.casketObj || {};
  const dynamicCasketPrice = Number(casket.price || casket.listPrice || calculation?.s2 || 1690.0);
  const dynamicCasketName = casket.name || 'Gemini Silver';
  const dynamicManufacturer = casket.manufacturer || 'Optima catalog';
  const dynamicInterior = casket.interiorExterior || casket.interior || 'crepe ivory interior';
  const dynamicExterior = casket.exterior || casket.color || '—';
  const dynamicConstruction = casket.material || casket.construction || '20-gauge steel';
  const dynamicModel = casket.model || casket.modelNumber || '—';

  const dynamicTotalMerchandise = dynamicCasketPrice;
  const dynamicTotalGuaranteed = STATIC_SERVICES_TOTAL + dynamicTotalMerchandise;

  // Dynamic Non-guaranteed calculations
  const dynamicCertsCount = Math.max(1, Number(calculation?.certsCount || quote?.certs || quote?.deathCertCount || 1));
  const dynamicCertsTotal = dynamicCertsCount * STATIC_DEATH_CERT_UNIT_PRICE;

  const dynamicSalesTax = Math.round(dynamicCasketPrice * STATIC_SALES_TAX_RATE * 100) / 100;
  const dynamicDispositionPermit = STATIC_DISPOSITION_PERMIT_FEE;

  const dynamicSelectedAddons = (Array.isArray(calculation?.addedAddons) ? calculation.addedAddons : [])
    .filter(addon => {
      const aPrice = typeof addon === 'object' && addon.price !== undefined ? Number(addon.price) : 0;
      const aName = typeof addon === 'string' ? addon : (addon.name || '');
      const aId = typeof addon === 'object' && addon.id ? String(addon.id) : '';
      if (aPrice <= 0) return false;
      if (aName.startsWith('western_') || aName.startsWith('felipe_')) return false;
      if (aId.startsWith('western_') || aId.startsWith('felipe_')) return false;
      return true;
    });

  const dynamicAddonsTotal = dynamicSelectedAddons.reduce(
    (sum, a) => sum + (typeof a === 'object' && a.price !== undefined ? Number(a.price) : 0),
    0
  );

  const dynamicTotalNonGuaranteed = dynamicCertsTotal + dynamicAddonsTotal + dynamicSalesTax + dynamicDispositionPermit;
  const dynamicGrandTotal = dynamicTotalGuaranteed + dynamicTotalNonGuaranteed;

  const dynamicFirmName = calculation?.firmName || (homeObj.name || quote?.homeName || 'Felipe Bagues Mortuary — Los Angeles (Funeral Home)');
  const dynamicFirmAddress = calculation?.firmAddress || (
    homeObj.streetAddress ||
    homeObj.address ||
    calculation?.matchedLoc?.address ||
    '1930 E. First Street, Los Angeles, CA 90033'
  );
  const dynamicFirmPhone = calculation?.firmPhone || homeObj.phone || '(323) 268-0759';

  // ================= 1. DOCUMENT HEADER =================
  doc.setTextColor(...black);
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text(
    isEs
      ? 'DECLARACIÓN DE BIENES Y SERVICIOS FUNERARIOS SELECCIONADOS'
      : 'STATEMENT OF FUNERAL GOODS AND SERVICES SELECTED',
    pageWidth / 2,
    y + 10,
    { align: 'center' }
  );
  y += 18;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedGray);
  doc.text(
    isEs ? 'Borrador de cotización / No es un acuerdo firmado' : 'Draft quotation / Not a signed agreement',
    pageWidth / 2,
    y + 2,
    { align: 'center' }
  );
  y += 10;

  // ================= 2. GREEN SERVICE TITLE BANNER =================
  doc.setDrawColor(...greenHeader);
  doc.setLineWidth(1.2);
  doc.rect(margin, y, contentWidth, 20);
  doc.setTextColor(...greenHeader);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(serviceTitle, pageWidth / 2, y + 14, { align: 'center' });
  y += 26;

  // ================= 3. TWO-COLUMN CONTAINER: SECTION I & SECTION II =================
  const colWidth = contentWidth / 2;
  const startGridY = y;
  const colHeight = 270;

  doc.setDrawColor(...black);
  doc.setLineWidth(1);
  doc.rect(margin, startGridY, contentWidth, colHeight);
  doc.line(margin + colWidth, startGridY, margin + colWidth, startGridY + colHeight - 16);

  // ---------- LEFT COLUMN: SECTION I — SERVICES (STATIC) ----------
  let leftY = startGridY;

  // Column Header
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, leftY, colWidth, 14, 'F');
  doc.setDrawColor(...black);
  doc.line(margin, leftY + 14, margin + colWidth, leftY + 14);
  doc.setTextColor(...black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(isEs ? 'Sección I — Servicios' : 'Section I — Services', margin + 4, leftY + 10);
  leftY += 14;

  // Package Plan Option Inner Box
  const optBoxY = leftY + 3;
  const optBoxH = 34;
  doc.setDrawColor(...black);
  doc.rect(margin + 3, optBoxY, colWidth - 6, optBoxH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(isEs ? 'Opción de Paquete' : 'Package Plan Option', margin + 6, optBoxY + 9);
  doc.setTextColor(...greenHeader);
  doc.setFontSize(9.5);
  doc.text(serviceTitle, margin + 6, optBoxY + 20);
  doc.setTextColor(...black);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(
    isEs
      ? 'Ver descripción completa en el adjunto (Lista General de Precios de Referencia).'
      : 'See full description on attachment (Reference General Price List).',
    margin + 6,
    optBoxY + 29
  );
  leftY = optBoxY + optBoxH + 3;

  // Itemized Services Title
  doc.line(margin, leftY, margin + colWidth, leftY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(isEs ? 'Servicios Detallados' : 'Itemized Services', margin + 4, leftY + 9);
  leftY += 12;
  doc.line(margin, leftY, margin + colWidth, leftY);

  const priceColW = 55;
  const leftTablePriceX = margin + colWidth - priceColW;
  doc.line(leftTablePriceX, leftY, leftTablePriceX, startGridY + colHeight - 32);

  const rowHeight = 16.5;
  STATIC_SECTION_1_SERVICES.forEach((row) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...black);
    doc.text(row.desc, margin + 4, leftY + 11, { maxWidth: colWidth - priceColW - 8 });

    doc.setFont('helvetica', 'bold');
    if (row.amount < 0) {
      doc.setTextColor(185, 28, 28);
      doc.text(`-${formatMoney(Math.abs(row.amount))}`, margin + colWidth - 4, leftY + 11, { align: 'right' });
    } else {
      doc.setTextColor(...black);
      doc.text(formatMoney(row.amount), margin + colWidth - 4, leftY + 11, { align: 'right' });
    }

    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.5);
    doc.line(margin, leftY + rowHeight, margin + colWidth, leftY + rowHeight);
    leftY += rowHeight;
  });

  // Section I Total at bottom of left column (Static $3,395.00)
  const leftBottomY = startGridY + colHeight - 32;
  doc.setDrawColor(...black);
  doc.setLineWidth(1);
  doc.line(margin, leftBottomY, margin + colWidth, leftBottomY);
  doc.line(leftTablePriceX, leftBottomY, leftTablePriceX, startGridY + colHeight - 16);
  doc.setTextColor(...black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(isEs ? 'TOTAL SERVICIOS' : 'TOTAL SERVICES', margin + 4, leftBottomY + 11);
  doc.text(formatMoney(STATIC_SERVICES_TOTAL), margin + colWidth - 4, leftBottomY + 11, { align: 'right' });

  // ---------- RIGHT COLUMN: SECTION II — MERCHANDISE (DYNAMIC) ----------
  let rightX = margin + colWidth;
  let rightY = startGridY;

  // Column Header
  doc.setFillColor(255, 255, 255);
  doc.rect(rightX, rightY, colWidth, 14, 'F');
  doc.setDrawColor(...black);
  doc.setLineWidth(1);
  doc.line(rightX, rightY + 14, rightX + colWidth, rightY + 14);
  doc.setTextColor(...black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(isEs ? 'Sección II — Mercancía' : 'Section II — Merchandise', rightX + 4, rightY + 10);
  rightY += 14;

  // Checkboxes Row: Burial (pre-checked with tick), Cremation, Other
  const cbSize = 7.5;
  const cbY = rightY + 2.5;

  // 1. Burial
  const bBoxX = rightX + 6;
  doc.setDrawColor(...black);
  doc.setLineWidth(0.75);
  doc.rect(bBoxX, cbY, cbSize, cbSize);
  if (isBurial) {
    doc.setLineWidth(1.1);
    doc.line(bBoxX + 1.5, cbY + 3.8, bBoxX + 3.2, cbY + 5.8);
    doc.line(bBoxX + 3.2, cbY + 5.8, bBoxX + 6.2, cbY + 1.8);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...black);
  doc.text(isEs ? 'Entierro' : 'Burial', bBoxX + cbSize + 4, rightY + 8.5);

  // 2. Cremation
  const cBoxX = rightX + 58;
  doc.setLineWidth(0.75);
  doc.rect(cBoxX, cbY, cbSize, cbSize);
  if (isCremation) {
    doc.setLineWidth(1.1);
    doc.line(cBoxX + 1.5, cbY + 3.8, cBoxX + 3.2, cbY + 5.8);
    doc.line(cBoxX + 3.2, cbY + 5.8, cBoxX + 6.2, cbY + 1.8);
  }
  doc.text(isEs ? 'Cremación' : 'Cremation', cBoxX + cbSize + 4, rightY + 8.5);

  // 3. Other
  const oBoxX = rightX + 120;
  doc.setLineWidth(0.75);
  doc.rect(oBoxX, cbY, cbSize, cbSize);
  if (isShip) {
    doc.setLineWidth(1.1);
    doc.line(oBoxX + 1.5, cbY + 3.8, oBoxX + 3.2, cbY + 5.8);
    doc.line(oBoxX + 3.2, cbY + 5.8, oBoxX + 6.2, cbY + 1.8);
  }
  doc.text(isEs ? 'Otro' : 'Other', oBoxX + cbSize + 4, rightY + 8.5);

  rightY += 13;
  doc.setLineWidth(0.5);
  doc.line(rightX, rightY, rightX + colWidth, rightY);

  // Merchandise Rows Table
  const rightTablePriceX = rightX + colWidth - priceColW;
  doc.line(rightTablePriceX, rightY, rightTablePriceX, startGridY + colHeight - 32);

  const merchRows = [
    { label: isEs ? 'Ataúd' : 'Casket', val: formatMoney(dynamicCasketPrice), isBold: true },
    { label: isEs ? 'Fabricante' : 'Manufacturer', val: dynamicManufacturer },
    { label: isEs ? 'Nombre' : 'Name', val: dynamicCasketName, isBoldVal: true },
    { label: isEs ? 'Tela y color interior' : 'Interior fabric and color', val: dynamicInterior },
    { label: isEs ? 'Color exterior' : 'Exterior color', val: dynamicExterior },
    { label: isEs ? 'Construcción y tipo' : 'Construction and type', val: dynamicConstruction },
    { label: isEs ? 'Número de modelo' : 'Model number', val: dynamicModel },
    { label: isEs ? 'Contenedor Exterior de Entierro' : 'Outer Burial Container', val: '', isBold: true },
    { label: isEs ? 'Fabricante' : 'Manufacturer', val: '' },
    { label: isEs ? 'Descripción' : 'Description', val: '' },
    { label: isEs ? 'Construcción' : 'Construction', val: '' },
    { label: isEs ? 'Número de modelo' : 'Model number', val: '' },
    { label: isEs ? 'Mercancía Garantizada' : 'Guaranteed Merchandise', val: '', isHeader: true },
    {
      label: isEs ? 'No se seleccionó mercancía garantizada adicional' : 'No additional guaranteed merchandise selected',
      val: '',
      isItalic: true,
    },
  ];

  const mRowH = 14;
  merchRows.forEach((mRow) => {
    doc.setFont('helvetica', mRow.isBold ? 'bold' : (mRow.isItalic ? 'italic' : 'normal'));
    doc.setFontSize(mRow.isItalic ? 6 : 6.8);
    doc.setTextColor(mRow.isItalic ? 100 : 0);
    doc.text(mRow.label, rightX + 4, rightY + 10, { maxWidth: colWidth - priceColW - 6 });

    if (mRow.val) {
      doc.setFont('helvetica', mRow.isBold || mRow.isBoldVal ? 'bold' : 'normal');
      doc.setTextColor(0);
      doc.text(mRow.val, rightX + colWidth - 4, rightY + 10, { align: 'right' });
    }

    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.5);
    doc.line(rightX, rightY + mRowH, rightX + colWidth, rightY + mRowH);
    rightY += mRowH;
  });

  // Section II Totals
  const totalMerchY = startGridY + colHeight - 32;
  doc.setDrawColor(...black);
  doc.setLineWidth(1);
  doc.line(rightX, totalMerchY, rightX + colWidth, totalMerchY);
  doc.line(rightTablePriceX, totalMerchY, rightTablePriceX, startGridY + colHeight - 16);
  doc.setTextColor(...black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(isEs ? 'TOTAL MERCANCÍA' : 'TOTAL MERCHANDISE', rightX + 4, totalMerchY + 11);
  doc.text(formatMoney(dynamicTotalMerchandise), rightX + colWidth - 4, totalMerchY + 11, { align: 'right' });

  // TOTAL GUARANTEED FUNERAL PRICE (Green Highlight Box) - Full Width across both columns
  const totalGuaranteedY = startGridY + colHeight - 16;
  doc.setFillColor(...lightGreenBg);
  doc.rect(margin, totalGuaranteedY, contentWidth, 16, 'F');
  doc.setDrawColor(...black);
  doc.line(margin, totalGuaranteedY, margin + contentWidth, totalGuaranteedY);
  doc.line(rightTablePriceX, totalGuaranteedY, rightTablePriceX, startGridY + colHeight);
  doc.setTextColor(...black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(isEs ? 'PRECIO FUNERARIO TOTAL GARANTIZADO' : 'TOTAL GUARANTEED FUNERAL PRICE', margin + 4, totalGuaranteedY + 11);
  doc.setFontSize(8);
  doc.text(formatMoney(dynamicTotalGuaranteed), margin + contentWidth - 4, totalGuaranteedY + 11, { align: 'right' });

  y = startGridY + colHeight + 8;

  // ================= 4. NON-GUARANTEED CASH ADVANCE ITEMS SECTION (DYNAMIC) =================
  const nonGBoxH = 68;
  doc.setDrawColor(...black);
  doc.setLineWidth(1);
  doc.rect(margin, y, contentWidth, nonGBoxH);

  // Section Header
  doc.setTextColor(...black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    isEs ? 'ANTICIPOS EN EFECTIVO NO GARANTIZADOS' : 'NON-GUARANTEED CASH ADVANCE ITEMS',
    pageWidth / 2,
    y + 9,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text(
    isEs
      ? 'USTED, EL COMPRADOR, DEBERÁ PAGAR EN EL MOMENTO DE LA NECESIDAD CUALQUIER CARGO ADICIONAL QUE RESULTE DEL AUMENTO DE PRECIOS PARA LOS SIGUIENTES SERVICIOS Y ARTÍCULOS PREACORDADOS:'
      : 'YOU, THE PURCHASER, WILL HAVE TO PAY, AT THE TIME OF NEED, ANY ADDITIONAL CHARGES RESULTING FROM PRICE INCREASES FOR THE FOLLOWING PREARRANGED SERVICES AND COMMODITIES:',
    pageWidth / 2,
    y + 17,
    { align: 'center' }
  );
  doc.line(margin, y + 21, margin + contentWidth, y + 21);

  // Subcolumns
  const nonGColW = contentWidth / 2;
  const nonGInnerY = y + 21;
  const nonGInnerH = 32;

  doc.line(margin + nonGColW, nonGInnerY, margin + nonGColW, nonGInnerY + nonGInnerH);

  // Left subcolumn: Death certificates ($24 each) & Step 5 Addons
  doc.line(margin + nonGColW - priceColW, nonGInnerY, margin + nonGColW - priceColW, nonGInnerY + nonGInnerH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    `${isEs ? 'Actas de defunción' : 'Death certificates'} (${dynamicCertsCount} @ ${formatMoney(STATIC_DEATH_CERT_UNIT_PRICE)})`,
    margin + 4,
    nonGInnerY + 11
  );
  doc.setFont('helvetica', 'bold');
  doc.text(formatMoney(dynamicCertsTotal), margin + nonGColW - 4, nonGInnerY + 11, { align: 'right' });

  // Map any other add-ons from active QuoteContext
  if (dynamicSelectedAddons.length > 0) {
    const firstAddon = dynamicSelectedAddons[0];
    const aName = typeof firstAddon === 'string' ? firstAddon : (firstAddon.name || 'Add-on Item');
    const aPrice = typeof firstAddon === 'object' && firstAddon.price !== undefined ? Number(firstAddon.price) : 0;
    doc.line(margin, nonGInnerY + 16, margin + nonGColW, nonGInnerY + 16);
    doc.setFont('helvetica', 'normal');
    doc.text(aName, margin + 4, nonGInnerY + 26, { maxWidth: nonGColW - priceColW - 6 });
    doc.setFont('helvetica', 'bold');
    doc.text(formatMoney(aPrice), margin + nonGColW - 4, nonGInnerY + 26, { align: 'right' });
  }

  // Right subcolumn: Sales Tax (9.5%) & Disposition permit ($12.00)
  const rightNonGX = margin + nonGColW;
  doc.line(margin + contentWidth - priceColW, nonGInnerY, margin + contentWidth - priceColW, nonGInnerY + nonGInnerH);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(isEs ? 'Impuesto sobre Ventas (9.5%)' : 'Sales Tax (9.5%)', rightNonGX + 4, nonGInnerY + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatMoney(dynamicSalesTax), margin + contentWidth - 4, nonGInnerY + 11, { align: 'right' });

  doc.line(rightNonGX, nonGInnerY + 16, margin + contentWidth, nonGInnerY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(isEs ? 'Permiso de disposición' : 'Disposition permit', rightNonGX + 4, nonGInnerY + 26);
  doc.setFont('helvetica', 'bold');
  doc.text(formatMoney(dynamicDispositionPermit), margin + contentWidth - 4, nonGInnerY + 26, { align: 'right' });

  // TOTAL NON-GUARANTEED CASH ADVANCE ITEMS Footer
  const nonGFooterY = nonGInnerY + nonGInnerH;
  doc.line(margin, nonGFooterY, margin + contentWidth, nonGFooterY);
  doc.line(margin + contentWidth - priceColW, nonGFooterY, margin + contentWidth - priceColW, y + nonGBoxH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(
    isEs ? 'TOTAL ANTICIPOS EN EFECTIVO NO GARANTIZADOS' : 'TOTAL NON-GUARANTEED CASH ADVANCE ITEMS',
    margin + 4,
    nonGFooterY + 11
  );
  doc.text(formatMoney(dynamicTotalNonGuaranteed), margin + contentWidth - 4, nonGFooterY + 11, { align: 'right' });

  y += nonGBoxH + 8;

  // ================= 5. GRAND TOTAL BOX (THICK BORDER) =================
  doc.setDrawColor(...black);
  doc.setLineWidth(1.8);
  doc.rect(margin, y, contentWidth, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    isEs ? 'Total de Artículos Garantizados y No Garantizados' : 'Total Guaranteed and Non-Guaranteed Items',
    margin + 8,
    y + 14
  );
  doc.setFontSize(11);
  doc.text(formatMoney(dynamicGrandTotal), margin + contentWidth - 8, y + 14, { align: 'right' });

  y += 28;

  // ================= 6. DUAL SIGNATURE LINES BLOCK =================
  const sigColW = (contentWidth - 24) / 2;
  const sigLeftX = margin;
  const sigRightX = margin + sigColW + 24;

  // Left: Funeral Firm Representative
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(isEs ? 'Nombre de la Funeraria' : 'Funeral Firm Name', sigLeftX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(dynamicFirmName, sigLeftX, y + 10);
  doc.setLineWidth(0.6);
  doc.line(sigLeftX, y + 12, sigLeftX + sigColW, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text(isEs ? 'Dirección' : 'Address', sigLeftX, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(dynamicFirmAddress, sigLeftX, y + 32, { maxWidth: sigColW * 0.6 });
  doc.line(sigLeftX, y + 34, sigLeftX + sigColW * 0.6, y + 34);
  doc.setFont('helvetica', 'bold');
  doc.text(isEs ? 'Fecha' : 'Date', sigLeftX + sigColW * 0.65, y + 24);
  doc.line(sigLeftX + sigColW * 0.65, y + 34, sigLeftX + sigColW, y + 34);

  doc.text(isEs ? 'Teléfono' : 'Phone', sigLeftX, y + 46);
  doc.setFont('helvetica', 'normal');
  doc.text(dynamicFirmPhone, sigLeftX + 32, y + 46);
  doc.line(sigLeftX, y + 48, sigLeftX + sigColW, y + 48);

  doc.setFont('helvetica', 'bold');
  doc.text(isEs ? 'Representante de la Funeraria' : 'Funeral Firm Representative', sigLeftX, y + 60);
  doc.line(sigLeftX, y + 70, sigLeftX + sigColW, y + 70);

  // Right: Contract Beneficiary Signature
  doc.text(isEs ? 'Firma del Beneficiario del Contrato (Asegurado)' : "Contract Beneficiary's (Insured's) Signature", sigRightX, y);
  doc.line(sigRightX, y + 12, sigRightX + sigColW, y + 12);

  doc.text(isEs ? 'Dirección' : 'Address', sigRightX, y + 24);
  doc.line(sigRightX, y + 34, sigRightX + sigColW * 0.6, y + 34);
  doc.text(isEs ? 'Fecha' : 'Date', sigRightX + sigColW * 0.65, y + 24);
  doc.line(sigRightX + sigColW * 0.65, y + 34, sigRightX + sigColW, y + 34);

  doc.text(isEs ? 'Teléfono' : 'Phone', sigRightX, y + 46);
  doc.line(sigRightX, y + 48, sigRightX + sigColW * 0.45, y + 48);
  doc.text(isEs ? 'Nombre en Letra de Molde' : "Insured's Printed Name", sigRightX + sigColW * 0.5, y + 46);
  doc.line(sigRightX + sigColW * 0.5, y + 48, sigRightX + sigColW, y + 48);

  y += 82;

  // ================= 7. BOTTOM TAN DRAFT FSA NOTICE BOX =================
  doc.setFillColor(...tanBg);
  doc.setDrawColor(...tanBorder);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'FD');

  doc.setTextColor(...tanText);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(
    isEs
      ? 'Borrador FSA: los precios de los paquetes y las asignaciones de servicios individuales deben revisarse con el FSA aprobado de la funeraria antes de su uso.'
      : 'Draft FSA: the package prices and individual service allocations must be reviewed against the approved funeral-home FSA before use.',
    margin + 8,
    y + 14,
    { maxWidth: contentWidth - 16 }
  );

  const safeName = dynamicFirmName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Statement_of_Funeral_Goods_${safeName}_${Date.now().toString().slice(-6)}.pdf`;
  try {
    doc.save(filename);
  } catch (e) {
    // node/test environment
  }
  return doc;
}
