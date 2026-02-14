export const STANDARD_VISITOR_QR_CARD_OVERRIDES = {
  cardPaddingMm: 4,
  leftColumnFontSizePx: 13,
  pageGapMm: 2,
  titleFontSizePx: 14,
  titleBottomMarginMm: 2.5,
  leftColumnLineHeight: 1.3,
  leftColumnRowGapMm: 1.8,
  contentGapMm: 2.5,
  cardBorderRadiusMm: 4,
  mediaPaddingMm: 1.5,
  photoPlaceholderFontSizePx: 13
};

export const printVisitorQRCards = ({
  visitors = [],
  apiBaseUrl,
  cardTitle = "ICJ-MD VISITOR'S ID SYSTEM",
  documentTitle = 'Visitor QR IDs',
  contextLabel = 'PDL',
  showRelationship = true,
  getPdlName = () => 'N/A',
  styleConfigOverrides = {},
  onNoData,
  onPopupBlocked
}) => {
  const styleConfig = {
    pageSize: 'Letter portrait',
    pageMarginMm: 8,
    pageSafetyMm: 21,
    pageGapMm: 6,
    pageMinHeightMm: 279,
    cardMinHeightMm: 132,
    cardPaddingMm: 6,
    cardBackground: '#25a253',
    cardBorderColor: '#0f5a2a',
    baseTextColor: '#111',
    titleFontSizePx: 18,
    titleFontWeight: 700,
    titleLetterSpacingPx: 0.5,
    titleBottomMarginMm: 6,
    leftColumnFontSizePx: 16,
    leftColumnFontWeight: 700,
    leftColumnLineHeight: 1.45,
    leftColumnRowGapMm: 4,
    contentGapMm: 5,
    cardBorderRadiusMm: 3,
    rightPanelBackground: '#f8f8f8',
    rightPanelBorderColor: '#3d3d3d',
    dividerColor: '#d1d5db',
    photoPlaceholderColor: '#3f3f46',
    photoPlaceholderFontSizePx: 20,
    mediaPaddingMm: 3
  };

  const cfg = { ...styleConfig, ...styleConfigOverrides };

  const visitorsWithQR = visitors.filter(visitor => visitor?.qrCode);

  if (visitorsWithQR.length === 0) {
    if (typeof onNoData === 'function') onNoData();
    return false;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    if (typeof onPopupBlocked === 'function') onPopupBlocked();
    return false;
  }

  const escapeHtml = (value) =>
    String(value || 'N/A')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const formatBirthday = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
  };

  const pages = [];
  for (let i = 0; i < visitorsWithQR.length; i += 4) {
    pages.push(visitorsWithQR.slice(i, i + 4));
  }

  const renderCard = (visitor) => {
    const pdlName = getPdlName(visitor);
    const photoHTML = visitor.photo
      ? `<img src="${apiBaseUrl}/uploads/${visitor.photo}" alt="1x1 picture" class="photo-img" />`
      : '<div class="photo-placeholder">1x1 picture</div>';

    return `
      <div class="id-card">
        <div class="id-title">${cardTitle}</div>
        <div class="id-content">
          <div class="id-left">
            <div><strong>Name:</strong> ${escapeHtml(visitor.fullName || `${visitor.firstName || ''} ${visitor.lastName || ''}`.trim())}</div>
            <div><strong>Address:</strong> ${escapeHtml(visitor.address)}</div>
            <div><strong>Birthday:</strong> ${escapeHtml(formatBirthday(visitor.dateOfBirth))}</div>
            <div><strong>${escapeHtml(contextLabel)}:</strong> ${escapeHtml(pdlName)}</div>
            ${showRelationship ? `<div><strong>Relationship:</strong> ${escapeHtml(visitor.relationship)}</div>` : ''}
          </div>
          <div class="id-right">
            <div class="photo-box">${photoHTML}</div>
            <div class="qr-box">
              <img src="${visitor.qrCode}" alt="Visitor QR Code" class="qr-img" />
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const pagesHTML = pages
    .map((page) => {
      const cards = page.map(renderCard).join('');
      const blanks = Array.from({ length: 4 - page.length })
        .map(() => '<div class="id-card id-card-empty"></div>')
        .join('');
      return `<div class="print-page">${cards}${blanks}</div>`;
    })
    .join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>${documentTitle}</title>
        <style>
          @page {
            size: ${cfg.pageSize};
            margin: ${cfg.pageMarginMm}mm;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            color: ${cfg.baseTextColor};
          }
          .print-page {
            width: 100%;
            height: calc(${cfg.pageMinHeightMm}mm - ${cfg.pageMarginMm * 2}mm - ${cfg.pageSafetyMm}mm);
            display: grid;
            grid-template-columns: 1fr;
            grid-template-rows: repeat(4, minmax(0, 1fr));
            gap: ${cfg.pageGapMm}mm;
            page-break-after: always;
            align-content: stretch;
            justify-items: stretch;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
          .id-card {
            border: 1px solid ${cfg.cardBorderColor};
            background: ${cfg.cardBackground};
            padding: ${cfg.cardPaddingMm}mm;
            display: flex;
            flex-direction: column;
            min-height: 0;
            border-radius: ${cfg.cardBorderRadiusMm}mm;
          }
          .id-card-empty {
            background: transparent;
            border: none;
          }
          .id-title {
            font-size: ${cfg.titleFontSizePx}px;
            font-weight: ${cfg.titleFontWeight};
            margin-bottom: ${cfg.titleBottomMarginMm}mm;
            letter-spacing: ${cfg.titleLetterSpacingPx}px;
          }
          .id-content {
            flex: 1;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: ${cfg.contentGapMm}mm;
            align-items: stretch;
            min-height: 0;
          }
          .id-left {
            font-size: ${cfg.leftColumnFontSizePx}px;
            font-weight: ${cfg.leftColumnFontWeight};
            line-height: ${cfg.leftColumnLineHeight};
            min-height: 0;
            overflow: hidden;
          }
          .id-left div {
            margin-bottom: ${cfg.leftColumnRowGapMm}mm;
            word-break: break-word;
          }
          .id-right {
            border: 1px solid ${cfg.rightPanelBorderColor};
            background: ${cfg.rightPanelBackground};
            display: grid;
            grid-template-columns: 1fr 1fr;
            overflow: hidden;
            border-radius: 1.5mm;
            min-height: 0;
          }
          .photo-box,
          .qr-box {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 0;
            border-left: 1px solid ${cfg.dividerColor};
          }
          .photo-box {
            border-left: none;
            border-right: 1px solid ${cfg.dividerColor};
            padding: ${cfg.mediaPaddingMm}mm;
          }
          .photo-placeholder {
            color: ${cfg.photoPlaceholderColor};
            font-size: ${cfg.photoPlaceholderFontSizePx}px;
            text-align: center;
          }
          .photo-img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: cover;
          }
          .qr-box {
            padding: ${cfg.mediaPaddingMm}mm;
          }
          .qr-img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        ${pagesHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.onload = function() {
    setTimeout(() => {
      printWindow.print();
    }, 600);
  };

  return true;
};
