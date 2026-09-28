import type { ParsedGuideData, TableSection } from '../../types';
import { buildCss1, CSS_BLOCK_2, CSS_BLOCK_3, buildHowToMeasureCss } from './css';
import { buildTable, buildSimpleTable } from './table-builder';

// ---------------------------------------------------------------------------
// JS template — the dimentionChange toggle function (matches Python exactly)
// ---------------------------------------------------------------------------

const JS_TEMPLATE = `
            function dimentionChange(type, fType){
                var elementToAddActive = document.getElementById(type);
                var elementToRemoveActive = (type === \`cm-\${fType}-table\`)?document.getElementById(\`in-\${fType}-table\`):
                document.getElementById(\`cm-\${fType}-table\`);
                if(type === \`cm-\${fType}-table\`){
                    document.getElementById(\`cm-\${fType}-table\`).style.display = "table";
                    document.getElementById(\`in-\${fType}-table\`).style.display = "none";
                    document.getElementById(\`switch-label-on-\${fType}\`).style.color = "#ffffff";
                    document.getElementById(\`switch-label-off-\${fType}\`).style.color = "#000000";
                }
                else{
                    document.getElementById(\`cm-\${fType}-table\`).style.display = "none";
                    document.getElementById(\`in-\${fType}-table\`).style.display = "table";
                    document.getElementById(\`switch-label-off-\${fType}\`).style.color = "#ffffff";
                    document.getElementById(\`switch-label-on-\${fType}\`).style.color = "#000000";
                }
            }
        `;

// ---------------------------------------------------------------------------
// Section HTML builder (one table-section with cm/inch toggle)
// ---------------------------------------------------------------------------

function buildSectionHtml(
  section: TableSection,
  sectionIndex: number,
  lang: 'en' | 'ar',
): string {
  const isAr = lang === 'ar';
  const isFirst = sectionIndex === 0;
  const tableType = isFirst ? 'rf' : 'sf';
  const cmTableId = `cm-${tableType}-table`;
  const inTableId = `in-${tableType}-table`;
  const viewName = isFirst ? 'view2' : 'view3';
  const monthVal = isFirst ? 'month2' : 'month3';
  const weekVal = isFirst ? 'week2' : 'week3';
  const switchTableId = isFirst ? 'switchTable1' : 'switchTable2';
  const cmLabel = isAr ? '\u0633\u0645' : 'cm'; // سم / cm
  const inchLabel = isAr ? '\u0628\u0648\u0635\u0629' : 'inch'; // بوصة / inch
  const sectionTitle = (isAr ? section.titleAr : section.title) ?? '';
  const tableClass = isFirst ? 'table-1' : 'table-2';

  const cmTable = buildTable(cmTableId, section, 'cm', lang);
  const inTable = buildTable(inTableId, section, 'inch', lang);

  return (
    '                  <section>' +
    '                                        <div class="head">' +
    `                        <label class="title">${sectionTitle}</label>` +
    '                        <div class="switch switch-blue">' +
    `                            <input type="radio" class="switch-input" name="${viewName}" value="${monthVal}" id="cm-${tableType}" onclick="dimentionChange('${cmTableId}', '${tableType}')" checked>` +
    `                            <label for="cm-${tableType}" class="switch-label switch-label-on" id="switch-label-on-${tableType}">${cmLabel}</label>` +
    `                            <input type="radio" class="switch-input" name="${viewName}" value="${weekVal}" id="in-${tableType}" onclick="dimentionChange('${inTableId}', '${tableType}')">` +
    `                            <label for="in-${tableType}" class="switch-label switch-label-off" id="switch-label-off-${tableType}">${inchLabel}</label>` +
    `                            <span id="${switchTableId}" class="switch-selection"></span>` +
    '                        </div>' +
    '                    </div>' +
    `                    <div class="tabel ${tableClass}">` +
    '                      <div class="tableBlock">\n' +
    cmTable +
    '\n' +
    inTable +
    '\n' +
    '                        </div>' +
    '                    </div>'
  );
}

// ---------------------------------------------------------------------------
// Measurement instructions HTML
// ---------------------------------------------------------------------------

function buildMeasurementHtml(data: ParsedGuideData, lang: 'en' | 'ar'): string {
  if (!data.measurements || data.measurements.length === 0) return '';

  const isAr = lang === 'ar';
  const title = isAr
    ? '\u0643\u064a\u0641\u064a\u0629 \u0627\u0644\u0642\u064a\u0627\u0633' // كيفية القياس
    : 'How to Measure';

  const sorted = [...data.measurements].sort((a, b) => a.number - b.number);
  const bodyItems = sorted
    .map(
      (inst) =>
        `                        <h4>${inst.name}</h4>\n` +
        `                        <p>${inst.description}</p>`,
    )
    .join('\n');

  return (
    '\n            <!-- How to Measure (flat, no accordion) -->\n' +
    '            <div class="how-to-meeasure" id="howToMeasure">\n' +
    `                <div class="section-title">${title}</div>\n` +
    '                <div class="how-to-measure-body">\n' +
    bodyItems + '\n' +
    '                </div>\n' +
    '            </div>\n'
  );
}

// ---------------------------------------------------------------------------
// Simple format HTML generation (no CM/INCH, no image, no toggle)
// ---------------------------------------------------------------------------

function generateSimpleSizeGuideHtml(
  data: ParsedGuideData,
  lang: 'en' | 'ar',
): string {
  const isAr = lang === 'ar';
  const direction = isAr ? 'rtl' : 'ltr';
  const heading = isAr
    ? '\u062f\u0644\u064a\u0644 \u0627\u0644\u0645\u0642\u0627\u0633\u0627\u062a'
    : 'Size Guide';

  // Build CSS — use empty image URL, no sf sections
  const css1 = buildCss1(direction, '', false);
  const css2 = CSS_BLOCK_2;
  const css3 = CSS_BLOCK_3;

  // Additional CSS for simple format: hide switch, show table, full-width rightBlock
  const simpleCss = `
        .sizeGuide-modal .switch { display: none !important; }
        .sizeGuide-modal #cm-rf-table { display: table !important; }
        .sizeGuide-modal .rightBlock { width: 100%; }
        .sizeGuide-modal .leftBlock { display: none !important; }
  `;

  const simpleTable = buildSimpleTable(data.simpleData!);

  const footerLabel = isAr
    ? '\u063a\u064a\u0631 \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u0644\u0645\u0642\u0627\u0633\u061f<br class="break"/> \u0646\u0648\u0641\u0631 \u0625\u0631\u062c\u0627\u0639\u0627\u064b \u0645\u062c\u0627\u0646\u064a\u0627\u064b.'
    : 'Not sure about the size?<br class="break"/> We offer free returns.';

  const spacer =
    '                                                                                                                                                                                                                                      ';

  const html =
    `\n<!DOCTYPE html><html lang="${lang}">` +
    '  <head>' +
    '        <meta charset="utf-8">' +
    '        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">' +
    '  </head>' +
    '  <body>' +
    `        <style>\n${css1}\n</style>` +
    `        <style>\n${css2}\n</style>` +
    `        <style>\n${css3}\n</style>` +
    `        <style>\n${simpleCss}\n</style>` +
    '         <div class="sizeGuide-modal">' +
    `            <h1 class="heading">${heading}</h1>` +
    '            <div class="tables">' +
    '                <div class="rightBlock">' +
    '                   ' +
    '                  <section>' +
    '                    <div class="tabel table-1">' +
    '                      <div class="tableBlock">' +
    '                        <div>\n' +
    simpleTable +
    '\n</div>\n\n' +
    '                        </div>' +
    '                    </div>' +
    '                ' +
    `                ${spacer}` +
    '</div>' +
    '                            </div>' +
    '            <footer>' +
    `                                         <label>${footerLabel}</label>` +
    '                            </footer>' +
    '        </div>' +
    '  </body></html>\n';

  return html;
}

// ---------------------------------------------------------------------------
// Main HTML generation entry point
// ---------------------------------------------------------------------------

/**
 * Generate a complete size guide HTML document.
 *
 * Produces output identical to the Python generate_sizeguide.py script,
 * including the sizeGuide-modal structure, hidden-xs/visible-xs image pattern,
 * cm/inch toggle, measurement instructions, and footer.
 *
 * @param data      - Parsed guide data (sections, measurements, disclaimer)
 * @param lang      - 'en' for English (LTR) or 'ar' for Arabic (RTL)
 * @param imageUrl  - Full image URL (e.g. "https://media.../sizeguide2999_men_blazer_en")
 * @returns Complete HTML string
 */
export function generateSizeGuideHtml(
  data: ParsedGuideData,
  lang: 'en' | 'ar',
  imageUrl: string,
): string {
  // Simple format: no cm/inch toggle, no image, just a flat table
  if (data.isSimple && data.simpleData) {
    return generateSimpleSizeGuideHtml(data, lang);
  }

  const isAr = lang === 'ar';
  const direction = isAr ? 'rtl' : 'ltr';
  const heading = isAr
    ? '\u062f\u0644\u064a\u0644 \u0627\u0644\u0645\u0642\u0627\u0633\u0627\u062a' // دليل المقاسات
    : 'Size Guide';
  const hasSf = data.sections.length > 1;

  // Build CSS
  const css1 = buildCss1(direction, imageUrl, hasSf);
  const css2 = CSS_BLOCK_2;
  const css3 = CSS_BLOCK_3;
  const css4 = buildHowToMeasureCss(direction);

  // Build sections
  const sectionHtmls = data.sections.map((section, i) =>
    buildSectionHtml(section, i, lang),
  );
  const sectionsCombined = sectionHtmls.join('');

  // Build measurements
  const measurementHtml = buildMeasurementHtml(data, lang);

  // Footer
  const footerLabel = isAr
    ? '\u063a\u064a\u0631 \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u0644\u0645\u0642\u0627\u0633\u061f<br class="break"/> \u0646\u0648\u0641\u0631 \u0625\u0631\u062c\u0627\u0639\u0627\u064b \u0645\u062c\u0627\u0646\u064a\u0627\u064b.' // غير متأكد من المقاس؟ نوفر إرجاعاً مجانياً.
    : 'Not sure about the size?<br class="break"/> We offer free returns.';

  // Long spacer (matches Python output exactly)
  const spacer =
    '                                                                                                                                                                                                                                      ';

  const hasImage = Boolean(imageUrl);

  const leftBlockDesktop = hasImage
    ? '                <div class="leftBlock hidden-xs">' +
      '                    <section class="image">' +
      '                        <img class="man-image"/>' +
      '                    </section>' +
      '                </div>'
    : '';

  const leftBlockMobile = hasImage
    ? '                <div class="leftBlock visible-xs">' +
      '                    <section class="image">' +
      '                        <img class="man-image"/>' +
      '                    </section>' +
      '                </div>'
    : '';

  // When no image, rightBlock should span full width
  const noImageCss = hasImage ? '' :
    '\n        .sizeGuide-modal .rightBlock { width: 100%; }\n';

  const html =
    `<!DOCTYPE html>\n<html lang="${lang}">\n` +
    '    <head>\n' +
    '        <meta charset="utf-8">\n' +
    '        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">\n' +
    '        <script>\n' +
    JS_TEMPLATE +
    '        </script>\n' +
    '    </head>\n' +
    '    <body>\n' +
    `        <style>\n${css1}\n</style>\n` +
    `        <style>\n${css2}\n</style>\n` +
    `        <style>\n${css3}\n</style>\n` +
    `        <style>\n${css4}${noImageCss}\n        </style>\n` +
    '         <div class="sizeGuide-modal">' +
    `            <h1 class="heading">${heading}</h1>` +
    '            <div class="tables">' +
    leftBlockDesktop +
    '                ' +
    '                <div class="rightBlock">' +
    '                   ' +
    sectionsCombined +
    '                ' +
    `                ${spacer}` +
    '</div>' +
    '                ' +
    leftBlockMobile +
    '                            </div>' +
    `            ${measurementHtml}` +
    '            <footer>' +
    `                                         <label>${footerLabel}</label>` +
    '                            </footer>' +
    '        </div>' +
    '  </body></html>\n';

  return html;
}
