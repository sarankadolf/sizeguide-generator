import * as XLSX from 'xlsx';
import type {
  ParsedGuideData,
  TableSection,
  DataRow,
  MeasurementInstruction,
  DetectedSheet,
  SimpleTableData,
  ParsedWorkbookGuide,
} from '../../types';

// ---------------------------------------------------------------------------
// Constants — header maps (ported from Python)
// ---------------------------------------------------------------------------

const EN_HEADER_MAP: Record<string, string> = {
  NECK: 'NECK',
  SHOULDER: 'SHOULDER',
  CHEST: 'CHEST',
  'ARM LENGTH': 'ARM<br />\n\t\t\t\t\tLENGTH',
  ARMLENGTH: 'ARM<br />\n\t\t\t\t\tLENGTH',
  WAIST: 'WAIST',
  HIP: 'HIP',
  OUTSEAM: 'OUTSEAM',
  TOUTSEAM: 'OUTSEAM',
  THIGH: 'THIGH',
  INSEAM: 'INSEAM',
  'BODY LENGTH': 'BODY<br />\n\t\t\t\t\tLENGTH',
  BODYLENGTH: 'BODY<br />\n\t\t\t\t\tLENGTH',
  'ACROSS SHOULDER': 'ACROSS<br />\n\t\t\t\t\tSHOULDER',
  ACROSSSHOULDER: 'ACROSS<br />\n\t\t\t\t\tSHOULDER',
  'SLEEVE LENGTH': 'SLEEVE<br />\n\t\t\t\t\tLENGTH',
  SLEEVELENGTH: 'SLEEVE<br />\n\t\t\t\t\tLENGTH',
  'TOTAL LENGTH': 'TOTAL<br />\n\t\t\t\t\tLENGTH',
  TOTALLENGTH: 'TOTAL<br />\n\t\t\t\t\tLENGTH',
  LENGTH: 'LENGTH',
};

const AR_CONVERSION_DISPLAY: Record<string, string> = {
  'سبلاش/ المملكة المتحدة': 'سبلاش/ المملكة المتحدة',
  'سبلاش/المملكة المتحدة': 'سبلاش/ المملكة المتحدة',
  'قياس ألفا': 'قياس ألفا',
  'مقاس ألفا': 'مقاس ألفا',
  'الاتحاد الأوروبي': 'الاتحاد الأوروبي',
  'مقاس - المملكة المتحدة': 'مقاس - المملكة المتحدة',
};

const AR_HEADER_DISPLAY: Record<string, string> = {
  'الرقبة': 'الرقبة',
  'الكتف': 'الكتف',
  'الصدر': 'الصدر',
  'طول الذراع': 'طول الذراع',
  'الخصر': 'الخصر',
  'الورك': 'الورك',
  'الطول الخارجي': 'الطول الخارجي',
  'الفخذ': 'الفخذ',
  'طول الساق الداخلي': 'طول الساق الداخلي',
  'الطول': 'الطول',
  'طول الجسم': 'طول الجسم',
  'عرض الأكتاف': 'عرض الأكتاف',
  'طول الأكمام': 'طول الأكمام',
  'الطول الكلي': 'الطول الكلي',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a cell value to a clean string (matches Python _cell_str). */
function cellStr(val: unknown): string {
  if (val == null) return '';
  let s = String(val).trim();
  // Strip trailing ".0" from integer-like floats
  if (/^-?\d+\.0$/.test(s)) {
    s = s.slice(0, -2);
  }
  return s;
}

/** Normalize a header string for matching. */
function normalizeHeader(h: string): string {
  let norm = h.replace(/\(.*?\)/g, '');
  norm = norm.trim().toUpperCase();
  norm = norm.replace(/\s+/g, ' ');
  return norm;
}

/** Get display name for EN measurement header. */
function getMeasurementDisplayEn(h: string): string {
  const norm = normalizeHeader(h);
  // Sort by key length descending so longer matches win
  const sorted = Object.keys(EN_HEADER_MAP).sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    if (norm.includes(kw)) {
      return EN_HEADER_MAP[kw];
    }
  }
  return norm;
}

/** Get display name for AR measurement header. */
function getMeasurementDisplayAr(h: string): string {
  const cleaned = h.replace(/\(.*?\)/g, '').trim();
  const sorted = Object.keys(AR_HEADER_DISPLAY).sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    if (cleaned.includes(kw)) {
      return AR_HEADER_DISPLAY[kw];
    }
  }
  return cleaned;
}

/** Read a cell from a sheet using 0-based row/col. */
function getCell(sheet: XLSX.WorkSheet, row: number, col: number): string {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = sheet[addr];
  return cellStr(cell?.v);
}

/**
 * Convert a single cm numeric string to inches, rounded to the nearest
 * quarter-inch (matches the production reference templates, e.g.
 * sizeguide_2002_en.html: 76cm -> 30in, 80.5cm -> 31.75in).
 */
function cmToInch(cmStr: string): string {
  if (!cmStr) return '';
  const num = Number(cmStr);
  if (Number.isNaN(num)) return cmStr;
  const inch = Math.round((num / 2.54) * 4) / 4;
  return String(inch);
}

/** Convert a cm value or a "lo-hi" cm range to its inch equivalent. */
function cmRangeToInch(val: string): string {
  if (!val) return '';
  const m = val.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
  if (m) {
    return `${cmToInch(m[1])}-${cmToInch(m[2])}`;
  }
  return cmToInch(val);
}

/** Get the range of a sheet. */
function getRange(sheet: XLSX.WorkSheet): { minR: number; maxR: number; minC: number; maxC: number } {
  const ref = sheet['!ref'];
  if (!ref) return { minR: 0, maxR: 0, minC: 0, maxC: 0 };
  const range = XLSX.utils.decode_range(ref);
  return {
    minR: range.s.r,
    maxR: range.e.r,
    minC: range.s.c,
    maxC: range.e.c,
  };
}

// ---------------------------------------------------------------------------
// Multi-guide block detection
// ---------------------------------------------------------------------------

export interface GuideBlockRange {
  /** 0-based first row of this guide's data (inclusive) — from its own
   *  "INTERNATIONAL CONVERSION" header row. */
  startRow: number;
  /** 0-based last row of this guide's data (inclusive) — the end of its own
   *  "How to Measure" footer, or maxR for the final block. */
  endRow: number;
}

/**
 * Find row indices where a "How to Measure" (or Arabic equivalent) footer
 * marker occurs. Each occurrence closes out one guide block. Used to decide
 * whether a sheet contains ONE guide (possibly with multiple measurement
 * sections, e.g. Top + Bottom) or SEVERAL unrelated guides clubbed together.
 */
function findHowToMeasureRows(sheet: XLSX.WorkSheet, isAr: boolean): number[] {
  const { maxR, maxC } = getRange(sheet);
  const rows: number[] = [];
  for (let r = 0; r <= maxR; r++) {
    for (let c = 0; c <= maxC; c++) {
      const val = getCell(sheet, r, c);
      if (!val) continue;
      const hit = isAr
        ? val.includes('كيفية قياس') || val.includes('كيف تقيس')
        : val.toLowerCase().includes('how to measure');
      if (hit) {
        rows.push(r);
        break;
      }
    }
  }
  return rows;
}

/**
 * Find row indices where a fresh "INTERNATIONAL CONVERSION" (or Arabic
 * equivalent) header starts — one per measurement block, regardless of
 * whether those blocks belong to one guide or many.
 */
function findConversionHeaderRows(sheet: XLSX.WorkSheet, isAr: boolean): number[] {
  const { maxR, maxC } = getRange(sheet);
  const rows: number[] = [];
  for (let r = 0; r <= maxR; r++) {
    for (let c = 0; c <= maxC; c++) {
      const val = getCell(sheet, r, c);
      if (!val) continue;
      const hit = isAr
        ? val.includes('التحويل الدولي') || val.includes('التخويل الدولي')
        : (() => {
            const uv = val.toUpperCase();
            return uv.includes('INTERNATIONAL') && uv.includes('CONVERSION');
          })();
      if (hit) {
        rows.push(r);
        break;
      }
    }
  }
  return rows;
}

/**
 * Decide whether a sheet contains multiple independent guides clubbed
 * together, and if so, return their row ranges.
 *
 * Heuristic: if the count of "How to Measure" footers equals the count of
 * "INTERNATIONAL CONVERSION" headers, and that count is >= 2, treat each
 * (header, footer) pair as ONE independent guide. Otherwise (e.g. a single
 * guide with N measurement sections but only ONE "How to Measure" footer
 * at the end, like a Top+Bottom pyjama set) return null — meaning "parse
 * as one guide, unchanged".
 *
 * Row ranges fully partition the sheet (no gaps/overlaps): each block runs
 * from just after the previous block ends to one row before the NEXT
 * block's own category-code row (which conventionally sits one row above
 * its "INTERNATIONAL CONVERSION" header — mirrors the gap already used by
 * the first block, which starts at row 0). The last block runs to maxR, so
 * every row in the sheet belongs to exactly one block — including trailing
 * disclaimer/instruction rows after each block's own footer.
 */
export function detectGuideBlocks(
  sheet: XLSX.WorkSheet,
  isAr: boolean,
): GuideBlockRange[] | null {
  const headerRows = findConversionHeaderRows(sheet, isAr);
  const footerRows = findHowToMeasureRows(sheet, isAr);

  if (headerRows.length < 2) return null; // only one guide, nothing to split
  if (headerRows.length !== footerRows.length) return null; // ambiguous shape, don't guess

  const { maxR } = getRange(sheet);
  const n = headerRows.length;
  const blocks: GuideBlockRange[] = [];
  let start = 0;
  for (let i = 0; i < n; i++) {
    const end = i < n - 1 ? headerRows[i + 1] - 2 : maxR;
    blocks.push({ startRow: start, endRow: end });
    start = end + 1;
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Section detection — EN
// ---------------------------------------------------------------------------

interface SectionMeta {
  headerRow: number;
  subHeaderRow: number | null;
  dataStart: number;
  dataEnd: number;
  convCols: [number, string][];
  cmCols: [number, string][];
  inchCols: [number, string][];
  sectionTitle: string;
}

function detectSectionsEn(
  sheet: XLSX.WorkSheet,
  rowBounds?: { start: number; end: number },
): SectionMeta[] {
  const sections: SectionMeta[] = [];
  const { maxC } = getRange(sheet);
  const maxR = rowBounds?.end ?? getRange(sheet).maxR;
  let rowIdx = rowBounds?.start ?? 0;

  while (rowIdx <= maxR) {
    let foundHeader = false;
    let headerRow = 0;

    for (let r = rowIdx; r < Math.min(rowIdx + 10, maxR + 1); r++) {
      for (let c = 0; c <= maxC; c++) {
        const val = getCell(sheet, r, c);
        if (!val) continue;
        const uv = val.toUpperCase();
        if (
          (uv.includes('INTERNATIONAL') && uv.includes('CONVERSION')) ||
          uv.includes('(CM)') ||
          uv.includes('(INCH)')
        ) {
          foundHeader = true;
          headerRow = r;
          break;
        }
      }
      if (foundHeader) break;
    }

    if (!foundHeader) {
      rowIdx++;
      continue;
    }

    // Find CM and INCH columns
    const cmCols: [number, string][] = [];
    const inchCols: [number, string][] = [];
    for (let c = 0; c <= maxC; c++) {
      const val = getCell(sheet, headerRow, c);
      if (!val) continue;
      const uv = val.toUpperCase();
      if (uv.includes('(CM)')) cmCols.push([c, val]);
      else if (uv.includes('(INCH)')) inchCols.push([c, val]);
    }

    // Find conversion sub-headers (ALPHA, SPLASH/UK, etc.)
    const convCols: [number, string][] = [];
    let subHeaderRow: number | null = null;
    for (let r = headerRow + 1; r < Math.min(headerRow + 4, maxR + 1); r++) {
      for (let c = 0; c <= maxC; c++) {
        const val = getCell(sheet, r, c);
        if (!val) continue;
        const uv = val.toUpperCase().trim();
        // Skip measurement columns
        if (cmCols.some(([cc]) => cc === c) || inchCols.some(([cc]) => cc === c)) continue;
        if (
          ['ALPHA', 'SPLASH/UK', 'SPLASH/ UK', 'EU', 'UK-SIZE', 'UK-Size', 'UK SIZE',
           'NUMERIC SIZE', 'DENIM-SIZE', 'DENIM SIZE', 'SIZE'].includes(uv) ||
          uv.includes('ALPHA')
        ) {
          convCols.push([c, val]);
          subHeaderRow = r;
        }
      }
      if (convCols.length > 0) break;
    }

    // If we found only one conv column (e.g. ALPHA), look for a sibling label
    // on the same row (the UK/Numeric column) — same logic as Python parser
    if (convCols.length === 1 && subHeaderRow !== null) {
      const alphaCol = convCols[0][0];
      const measColSet = new Set([...cmCols, ...inchCols].map(([cc]) => cc));
      for (let dist = 1; dist <= 3; dist++) {
        for (const c of [alphaCol - dist, alphaCol + dist]) {
          if (c < 0 || c > maxC || measColSet.has(c)) continue;
          const v = getCell(sheet, subHeaderRow, c);
          if (v && v.length < 40) {
            convCols.push([c, v]);
            break;
          }
        }
        if (convCols.length > 1) break;
      }
      convCols.sort((a, b) => a[0] - b[0]);
    }

    if (convCols.length === 0 && cmCols.length === 0) {
      rowIdx = headerRow + 1;
      continue;
    }

    convCols.sort((a, b) => a[0] - b[0]);
    cmCols.sort((a, b) => a[0] - b[0]);
    inchCols.sort((a, b) => a[0] - b[0]);

    const dataStart = (subHeaderRow ?? headerRow) + 1;
    const allDataCols = [...convCols, ...cmCols, ...inchCols].map(([c]) => c);
    let dataEnd = dataStart;
    for (let r = dataStart; r <= maxR; r++) {
      const hasData = allDataCols.some((c) => getCell(sheet, r, c) !== '');
      if (hasData) {
        dataEnd = r;
      } else {
        break;
      }
    }

    // Detect section title (e.g. "Men's Top" / "Men's Bottom")
    let sectionTitle = '';
    for (let r = Math.max(0, headerRow - 3); r < headerRow; r++) {
      for (let c = 0; c <= maxC; c++) {
        const val = getCell(sheet, r, c);
        if (val && (val.includes('Top') || val.includes('Bottom'))) {
          const m = val.match(/Men's\s+(.*)/i);
          if (m) {
            sectionTitle = m[1].trim();
          }
          break;
        }
      }
    }

    sections.push({
      headerRow,
      subHeaderRow,
      dataStart,
      dataEnd,
      convCols,
      cmCols,
      inchCols,
      sectionTitle,
    });
    rowIdx = dataEnd + 1;
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Section detection — AR
// ---------------------------------------------------------------------------

function detectSectionsAr(
  sheet: XLSX.WorkSheet,
  rowBounds?: { start: number; end: number },
): SectionMeta[] {
  const sections: SectionMeta[] = [];
  const { maxC } = getRange(sheet);
  const maxR = rowBounds?.end ?? getRange(sheet).maxR;
  let rowIdx = rowBounds?.start ?? 0;

  while (rowIdx <= maxR) {
    let foundHeader = false;
    let headerRow = 0;

    for (let r = rowIdx; r < Math.min(rowIdx + 10, maxR + 1); r++) {
      for (let c = 0; c <= maxC; c++) {
        const val = getCell(sheet, r, c);
        if (!val) continue;
        if (
          val.includes('التحويل الدولي') ||
          val.includes('التخويل الدولي') ||
          val.includes('(سم)') ||
          val.includes('(بوصة)')
        ) {
          foundHeader = true;
          headerRow = r;
          break;
        }
      }
      if (foundHeader) break;
    }

    if (!foundHeader) {
      rowIdx++;
      continue;
    }

    const cmCols: [number, string][] = [];
    const inchCols: [number, string][] = [];
    for (let c = 0; c <= maxC; c++) {
      const val = getCell(sheet, headerRow, c);
      if (!val) continue;
      if (val.includes('(سم)')) cmCols.push([c, val]);
      else if (val.includes('(بوصة)')) inchCols.push([c, val]);
    }

    const convCols: [number, string][] = [];
    let subHeaderRow: number | null = null;
    const arConvKeywords = ['قياس ألفا', 'مقاس ألفا', 'سبلاش', 'الاتحاد الأوروبي', 'مقاس - المملكة المتحدة', 'ألفا', 'المقاس الرقمي'];
    for (let r = headerRow + 1; r < Math.min(headerRow + 4, maxR + 1); r++) {
      for (let c = 0; c <= maxC; c++) {
        const val = getCell(sheet, r, c).trim();
        if (!val) continue;
        // Skip measurement columns
        if (cmCols.some(([cc]) => cc === c) || inchCols.some(([cc]) => cc === c)) continue;
        if (arConvKeywords.some((kw) => val.includes(kw))) {
          convCols.push([c, val]);
          subHeaderRow = r;
        }
      }
      if (convCols.length > 0) break;
    }

    // If we found only one conv column, look for a sibling label on the same row
    if (convCols.length === 1 && subHeaderRow !== null) {
      const foundCol = convCols[0][0];
      const measColSet = new Set([...cmCols, ...inchCols].map(([cc]) => cc));
      for (let dist = 1; dist <= 3; dist++) {
        for (const c of [foundCol - dist, foundCol + dist]) {
          if (c < 0 || c > maxC || measColSet.has(c)) continue;
          const v = getCell(sheet, subHeaderRow, c);
          if (v && v.length < 40) {
            convCols.push([c, v]);
            break;
          }
        }
        if (convCols.length > 1) break;
      }
      convCols.sort((a, b) => a[0] - b[0]);
    }

    if (convCols.length === 0 && cmCols.length === 0) {
      rowIdx = headerRow + 1;
      continue;
    }

    convCols.sort((a, b) => a[0] - b[0]);
    cmCols.sort((a, b) => a[0] - b[0]);
    inchCols.sort((a, b) => a[0] - b[0]);

    const dataStart = (subHeaderRow ?? headerRow) + 1;
    const allDataCols = [...convCols, ...cmCols, ...inchCols].map(([c]) => c);
    let dataEnd = dataStart;
    for (let r = dataStart; r <= maxR; r++) {
      const hasData = allDataCols.some((c) => getCell(sheet, r, c) !== '');
      if (hasData) {
        dataEnd = r;
      } else {
        break;
      }
    }

    let sectionTitle = '';
    for (let r = Math.max(0, headerRow - 3); r < headerRow; r++) {
      for (let c = 0; c <= maxC; c++) {
        const val = getCell(sheet, r, c);
        if (val && (val.includes('Top') || val.includes('Bottom'))) {
          const m = val.match(/Men's\s+(.*)/i);
          if (m) {
            sectionTitle = m[1].trim();
          }
          break;
        }
      }
    }

    sections.push({
      headerRow,
      subHeaderRow,
      dataStart,
      dataEnd,
      convCols,
      cmCols,
      inchCols,
      sectionTitle,
    });
    rowIdx = dataEnd + 1;
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Rowspan computation
// ---------------------------------------------------------------------------

function computeRowspan(
  sheet: XLSX.WorkSheet,
  dataStart: number,
  dataEnd: number,
  alphaCol: number,
): Map<number, number> {
  const rowspanMap = new Map<number, number>();
  let i = 0;
  let row = dataStart;
  while (row <= dataEnd) {
    const val = getCell(sheet, row, alphaCol);
    if (val) {
      let span = 1;
      for (let r2 = row + 1; r2 <= dataEnd; r2++) {
        const v2 = getCell(sheet, r2, alphaCol);
        if (v2) break;
        span++;
      }
      rowspanMap.set(i, span);
    }
    i++;
    row++;
  }
  return rowspanMap;
}

// ---------------------------------------------------------------------------
// Find alpha column
// ---------------------------------------------------------------------------

function findAlphaCol(
  convCols: [number, string][],
_isAr = false,
): { colIdx: number; relIdx: number } {
  for (let i = 0; i < convCols.length; i++) {
    const [colIdx, name] = convCols[i];
    const norm = name.toUpperCase().trim();
    if (norm.includes('ALPHA') || name.includes('ألفا')) {
      return { colIdx, relIdx: i };
    }
  }
  // Default: last conversion column
  const lastIdx = convCols.length - 1;
  return { colIdx: convCols[lastIdx][0], relIdx: lastIdx };
}

// ---------------------------------------------------------------------------
// Instruction extraction — EN
// ---------------------------------------------------------------------------

function extractInstructionsEn(
  sheet: XLSX.WorkSheet,
  dataEnd: number,
  rowBounds?: { start: number; end: number },
): {
  instructions: MeasurementInstruction[];
  disclaimer: string;
  howToTitle: string;
} {
  const instructions: MeasurementInstruction[] = [];
  let disclaimer = '';
  let howToTitle = '';
  const { maxC } = getRange(sheet);
  const maxR = rowBounds?.end ?? getRange(sheet).maxR;

  for (let r = dataEnd + 1; r <= maxR; r++) {
    for (let c = 0; c <= maxC; c++) {
      const val = getCell(sheet, r, c);
      if (!val) continue;

      if (val.includes('How to Measure')) {
        howToTitle = val.replace(/ - /g, ' \u2013 ').replace(/ – /g, ' \u2013 ');
        break;
      }
      if (val.includes('Size guide measurements') || val.includes('size guide measurements')) {
        disclaimer = val.trim();
        break;
      }

      // Check if previous column has a number
      const numVal = c > 0 ? getCell(sheet, r, c - 1) : '';
      if (numVal && /^\d+$/.test(numVal)) {
        const name = val;
        let descVal = c + 1 <= maxC ? getCell(sheet, r, c + 1) : '';
        // Clean trailing markers
        for (const suffix of [' Done.', ' Done']) {
          if (descVal.endsWith(suffix)) {
            descVal = descVal.slice(0, -suffix.length).trim();
          }
        }
        // Fix sentence-initial lowercase
        descVal = descVal.replace(/(?<=\.\s)the\s/g, 'The ');
        descVal = descVal.replace(/^the\s/, 'The ');
        if (descVal && descVal[0] >= 'a' && descVal[0] <= 'z') {
          descVal = descVal[0].toUpperCase() + descVal.slice(1);
        }
        instructions.push({ number: parseInt(numVal, 10), name, description: descVal });
      }
    }
  }

  return { instructions, disclaimer, howToTitle };
}

// ---------------------------------------------------------------------------
// Instruction extraction — AR
// ---------------------------------------------------------------------------

function extractInstructionsAr(
  sheet: XLSX.WorkSheet,
  dataEnd: number,
  rowBounds?: { start: number; end: number },
): {
  instructions: MeasurementInstruction[];
  disclaimer: string;
  howToTitle: string;
} {
  const instructions: MeasurementInstruction[] = [];
  let disclaimer = '';
  let howToTitle = '';
  const { maxC } = getRange(sheet);
  const maxR = rowBounds?.end ?? getRange(sheet).maxR;

  for (let r = dataEnd + 1; r <= maxR; r++) {
    for (let c = 0; c <= maxC; c++) {
      const val = getCell(sheet, r, c);
      if (!val) continue;

      if (val.includes('كيفية قياس') || val.includes('كيف تقيس')) {
        howToTitle = val.replace(/ - /g, ' \u2013 ').replace(/ – /g, ' \u2013 ');
        break;
      }
      if (val.includes('تنويه') || val.includes('قياسات دليل المقاسات')) {
        disclaimer = val.trim();
        break;
      }

      // AR: Try both patterns:
      // Pattern 1 (like EN): number | name | description  (number at current col or before name)
      // Pattern 2 (some AR sheets): description | ... | name | number
      let found = false;

      // Pattern 1: current cell is a number
      if (/^\d+$/.test(val)) {
        const nameVal = getCell(sheet, r, c + 1);
        let descVal = getCell(sheet, r, c + 2);
        if (nameVal && descVal && descVal.length > 10) {
          for (const suffix of [' انتهى.', ' انتهى']) {
            if (descVal.endsWith(suffix)) {
              descVal = descVal.slice(0, -suffix.length).trim();
            }
          }
          instructions.push({ number: parseInt(val, 10), name: nameVal, description: descVal });
          found = true;
        }
      }

      // Pattern 2: description first, number comes later
      if (!found) {
        for (let c2 = c + 1; c2 <= maxC; c2++) {
          const numVal = getCell(sheet, r, c2);
          if (numVal && /^\d+$/.test(numVal)) {
            const nameVal = c2 > 0 ? getCell(sheet, r, c2 - 1) : '';
            let descVal = val;
            for (const suffix of [' انتهى.', ' انتهى']) {
              if (descVal.endsWith(suffix)) {
                descVal = descVal.slice(0, -suffix.length).trim();
              }
            }
            instructions.push({ number: parseInt(numVal, 10), name: nameVal, description: descVal });
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }
  }

  return { instructions, disclaimer, howToTitle };
}

// ---------------------------------------------------------------------------
// Convert rows to DataRow format with rowspan info
// ---------------------------------------------------------------------------

function buildDataRows(
  rawRows: string[][],
  rowspanMap: Map<number, number>,
): DataRow[] {
  const result: DataRow[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const rs = rowspanMap.get(i);
    result.push({
      values: rawRows[i],
      isFirstOfGroup: rs !== undefined,
      rowspan: rs,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Category and Brand extraction from Excel
// ---------------------------------------------------------------------------

/** Extract category codes from column A (col index 0), optionally bounded
 *  to a row range (used when parsing one block of a multi-guide sheet). */
function extractCategories(
  sheet: XLSX.WorkSheet,
  rowBounds?: { start: number; end: number },
): string[] {
  const maxR = rowBounds?.end ?? getRange(sheet).maxR;
  const minR = rowBounds?.start ?? 0;
  const seen = new Set<string>();
  const categories: string[] = [];
  for (let r = minR; r <= maxR; r++) {
    const val = getCell(sheet, r, 0);
    if (val && val.includes('-') && !seen.has(val)) {
      seen.add(val);
      categories.push(val);
    }
  }
  return categories;
}

/** Extract brand names from the "Brand Name" column, optionally bounded to
 *  a row range (used when parsing one block of a multi-guide sheet). */
function extractBrands(
  sheet: XLSX.WorkSheet,
  rowBounds?: { start: number; end: number },
): [string, string][] {
  const maxR = rowBounds?.end ?? getRange(sheet).maxR;
  const minR = rowBounds?.start ?? 0;
  const { maxC } = getRange(sheet);
  let brandCol = -1;
  for (let r = minR; r <= maxR; r++) {
    for (let c = 0; c <= maxC; c++) {
      const val = getCell(sheet, r, c);
      if (val.toLowerCase() === 'brand name') {
        brandCol = c;
        // Read brand entries below
        const brands: [string, string][] = [];
        for (let rr = r + 1; rr <= maxR; rr++) {
          const name = getCell(sheet, rr, c);
          if (!name) break;
          const code = getCell(sheet, rr, c + 1);
          brands.push([name, code]);
        }
        return brands;
      }
    }
    if (brandCol >= 0) break;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Parse EN sheet
// ---------------------------------------------------------------------------

function parseSheetEn(
  sheet: XLSX.WorkSheet,
  rowBounds?: { start: number; end: number },
): ParsedGuideData {
  const sectionsMeta = detectSectionsEn(sheet, rowBounds);
  if (sectionsMeta.length === 0) {
    throw new Error('No data sections found in EN sheet');
  }

  const sections: TableSection[] = [];
  let lastDataEnd = 0;

  for (let si = 0; si < sectionsMeta.length; si++) {
    const sm = sectionsMeta[si];
    const { convCols, cmCols, inchCols, dataStart, dataEnd } = sm;

    const conversionHeaders = convCols.map(([, name]) => name.trim());
    const measurementHeaders = cmCols.map(([, name]) => getMeasurementDisplayEn(name));

    const { colIdx: alphaCol } = findAlphaCol(convCols);
    const rowspanMap = computeRowspan(sheet, dataStart, dataEnd, alphaCol);

    // Some sheets (e.g. Coega Womens) only ship (CM) measurement columns with
    // no (INCH) counterpart. In that case derive inch values from the cm
    // values instead of leaving the INCH table blank.
    const deriveInch = inchCols.length === 0 && cmCols.length > 0;

    const cmRawRows: string[][] = [];
    const inchRawRows: string[][] = [];
    for (let r = dataStart; r <= dataEnd; r++) {
      const cmRow = convCols.map(([c]) => getCell(sheet, r, c));
      const cmVals = cmCols.map(([c]) => getCell(sheet, r, c));
      cmRow.push(...cmVals);
      const inchRow = convCols.map(([c]) => getCell(sheet, r, c));
      if (deriveInch) {
        inchRow.push(...cmVals.map(cmRangeToInch));
      } else {
        inchRow.push(...inchCols.map(([c]) => getCell(sheet, r, c)));
      }
      cmRawRows.push(cmRow);
      inchRawRows.push(inchRow);
    }

    sections.push({
      id: si === 0 ? 'rf' : 'sf',
      title: sm.sectionTitle,
      conversionHeaders,
      measurementHeaders,
      cmRows: buildDataRows(cmRawRows, rowspanMap),
      inchRows: buildDataRows(inchRawRows, rowspanMap),
    });
    lastDataEnd = Math.max(lastDataEnd, dataEnd);
  }

  const { instructions, disclaimer, howToTitle } = extractInstructionsEn(sheet, lastDataEnd, rowBounds);
  const categories = extractCategories(sheet, rowBounds);
  const brands = extractBrands(sheet, rowBounds);

  return {
    sections,
    measurements: instructions,
    disclaimer,
    measurementTitle: howToTitle,
    categories,
    brands,
  };
}

// ---------------------------------------------------------------------------
// Parse AR sheet
// ---------------------------------------------------------------------------

function parseSheetAr(
  sheet: XLSX.WorkSheet,
  rowBounds?: { start: number; end: number },
): ParsedGuideData {
  const sectionsMeta = detectSectionsAr(sheet, rowBounds);
  if (sectionsMeta.length === 0) {
    throw new Error('No data sections found in AR sheet');
  }

  const sections: TableSection[] = [];
  let lastDataEnd = 0;

  for (let si = 0; si < sectionsMeta.length; si++) {
    const sm = sectionsMeta[si];
    const { convCols, cmCols, inchCols, dataStart, dataEnd } = sm;

    const conversionHeaders: string[] = [];
    for (const [, name] of convCols) {
      const trimmed = name.trim();
      conversionHeaders.push(AR_CONVERSION_DISPLAY[trimmed] ?? trimmed);
    }

    const measurementHeaders = cmCols.map(([, name]) => getMeasurementDisplayAr(name));

    const { colIdx: alphaCol } = findAlphaCol(convCols, true);
    const rowspanMap = computeRowspan(sheet, dataStart, dataEnd, alphaCol);

    // Some sheets (e.g. Coega Womens) only ship (CM) measurement columns with
    // no (INCH) counterpart. In that case derive inch values from the cm
    // values instead of leaving the INCH table blank.
    const deriveInch = inchCols.length === 0 && cmCols.length > 0;

    const cmRawRows: string[][] = [];
    const inchRawRows: string[][] = [];
    for (let r = dataStart; r <= dataEnd; r++) {
      const cmRow = convCols.map(([c]) => getCell(sheet, r, c));
      const cmVals = cmCols.map(([c]) => getCell(sheet, r, c));
      cmRow.push(...cmVals);
      const inchRow = convCols.map(([c]) => getCell(sheet, r, c));
      if (deriveInch) {
        inchRow.push(...cmVals.map(cmRangeToInch));
      } else {
        inchRow.push(...inchCols.map(([c]) => getCell(sheet, r, c)));
      }
      cmRawRows.push(cmRow);
      inchRawRows.push(inchRow);
    }

    sections.push({
      id: si === 0 ? 'rf' : 'sf',
      title: sm.sectionTitle,
      conversionHeaders,
      measurementHeaders,
      cmRows: buildDataRows(cmRawRows, rowspanMap),
      inchRows: buildDataRows(inchRawRows, rowspanMap),
    });
    lastDataEnd = Math.max(lastDataEnd, dataEnd);
  }

  const { instructions, disclaimer, howToTitle } = extractInstructionsAr(sheet, lastDataEnd, rowBounds);
  const categories = extractCategories(sheet, rowBounds);
  const brands = extractBrands(sheet, rowBounds);

  return {
    sections,
    measurements: instructions,
    disclaimer,
    measurementTitle: howToTitle,
    categories,
    brands,
  };
}

// ---------------------------------------------------------------------------
// Simple sheet parser (no CM/INCH split, e.g. Socks)
// ---------------------------------------------------------------------------

function parseSimpleSheet(sheet: XLSX.WorkSheet): ParsedGuideData {
  const { maxR, maxC } = getRange(sheet);

  // Find the header row: first row with 2+ non-empty short text cells
  let headerRow = -1;
  let headers: string[] = [];
  for (let r = 0; r <= maxR; r++) {
    const rowCells: string[] = [];
    for (let c = 0; c <= maxC; c++) {
      const val = getCell(sheet, r, c);
      if (val) rowCells.push(val);
    }
    if (rowCells.length >= 2 && rowCells.every((v) => v.length < 30)) {
      headerRow = r;
      // Collect all cells including empty ones to preserve column positions
      headers = [];
      for (let c = 0; c <= maxC; c++) {
        const val = getCell(sheet, r, c);
        if (val) headers.push(val);
      }
      break;
    }
  }

  if (headerRow < 0) {
    throw new Error('No header row found in simple sheet');
  }

  // Read data rows below header until blank
  const rows: string[][] = [];
  for (let r = headerRow + 1; r <= maxR; r++) {
    const rowVals: string[] = [];
    let hasData = false;
    for (let c = 0; c <= maxC; c++) {
      const val = getCell(sheet, r, c);
      if (val) hasData = true;
      rowVals.push(val);
    }
    if (!hasData) break;
    // Only keep cells that correspond to header columns (non-empty columns)
    const filteredVals: string[] = [];
    for (let c = 0; c <= maxC; c++) {
      const headerVal = getCell(sheet, headerRow, c);
      if (headerVal) {
        filteredVals.push(rowVals[c] ?? '');
      }
    }
    rows.push(filteredVals);
  }

  return {
    sections: [],
    measurements: [],
    isSimple: true,
    simpleData: { headers, rows },
  };
}

// ---------------------------------------------------------------------------
// Sheet detection
// ---------------------------------------------------------------------------

function findSheet(
  wb: XLSX.WorkBook,
  lang: 'en' | 'ar',
): string | null {
  const langUpper = lang.toUpperCase();
  const candidates: string[] = [];

  for (const name of wb.SheetNames) {
    const nu = name.toUpperCase();
    if (langUpper === 'EN') {
      if (/\bEN\b/.test(nu) || nu.endsWith(' EN') || nu.endsWith('-EN') || nu.endsWith('- EN')) {
        candidates.push(name);
      }
    } else {
      if (/\bAR\b/.test(nu) || nu.endsWith(' AR') || nu.endsWith('-AR') || nu.endsWith('- AR')) {
        candidates.push(name);
      }
    }
  }

  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const exact = candidates.find((c) => c.toUpperCase().trim().endsWith(langUpper));
    return exact ?? candidates[0];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse an Excel file buffer and extract size guide data.
 *
 * Most workbooks contain exactly one size guide and return a single-element
 * `guides` array. When a workbook clubs several unrelated size guides into
 * one EN/AR sheet pair (detected via `detectGuideBlocks` — multiple
 * independent "INTERNATIONAL CONVERSION" + "How to Measure" blocks), each
 * block is parsed independently and returned as its own guide, so the
 * caller can generate N separate HTML template pairs from one upload.
 *
 * @param buffer - ArrayBuffer of the uploaded .xlsx file
 * @returns One or more parsed guides, plus detection info
 */
export function parseExcelFile(buffer: ArrayBuffer): {
  guides: ParsedWorkbookGuide[];
  detection: DetectedSheet[];
} {
  const wb = XLSX.read(buffer, { type: 'array' });
  const detection: DetectedSheet[] = [];

  const enSheetName = findSheet(wb, 'en');
  const arSheetName = findSheet(wb, 'ar');
  const enSheet = enSheetName ? wb.Sheets[enSheetName] : null;
  const arSheet = arSheetName ? wb.Sheets[arSheetName] : null;

  // Detect multi-guide blocks independently per language sheet, but only
  // honor a split when BOTH sheets agree on the block count — if they
  // disagree (or one sheet is missing), fall back to treating the workbook
  // as a single guide rather than guessing a misaligned split.
  const enBlocks = enSheet ? detectGuideBlocks(enSheet, false) : null;
  const arBlocks = arSheet ? detectGuideBlocks(arSheet, true) : null;

  const blockCount =
    enBlocks && arBlocks && enBlocks.length === arBlocks.length
      ? enBlocks.length
      : null;

  if (blockCount && blockCount >= 2) {
    // --- Multi-guide workbook: parse each block independently ---
    const guides: ParsedWorkbookGuide[] = [];
    for (let i = 0; i < blockCount; i++) {
      let enData: ParsedGuideData | null = null;
      let arData: ParsedGuideData | null = null;
      try {
        if (enSheet && enBlocks) {
          const b = enBlocks[i];
          enData = parseSheetEn(enSheet, { start: b.startRow, end: b.endRow });
        }
      } catch (e) {
        console.error(`Error parsing EN block ${i}:`, e);
      }
      try {
        if (arSheet && arBlocks) {
          const b = arBlocks[i];
          arData = parseSheetAr(arSheet, { start: b.startRow, end: b.endRow });
        }
      } catch (e) {
        console.error(`Error parsing AR block ${i}:`, e);
      }
      guides.push({ blockIndex: i, enData, arData });
    }

    if (enSheetName) {
      detection.push({
        name: enSheetName,
        lang: 'en',
        rowCount: guides.reduce(
          (sum, g) => sum + (g.enData?.sections.reduce((s, se) => s + se.cmRows.length, 0) ?? 0),
          0,
        ),
        sectionCount: blockCount,
      });
    }
    if (arSheetName) {
      detection.push({
        name: arSheetName,
        lang: 'ar',
        rowCount: guides.reduce(
          (sum, g) => sum + (g.arData?.sections.reduce((s, se) => s + se.cmRows.length, 0) ?? 0),
          0,
        ),
        sectionCount: blockCount,
      });
    }

    return { guides, detection };
  }

  // --- Single-guide path: existing behavior, unchanged ---
  let enData: ParsedGuideData | null = null;
  let arData: ParsedGuideData | null = null;

  // EN
  if (enSheetName && enSheet) {
    try {
      enData = parseSheetEn(enSheet);
      detection.push({
        name: enSheetName,
        lang: 'en',
        rowCount: enData.sections.reduce((sum, s) => sum + s.cmRows.length, 0),
        sectionCount: enData.sections.length,
      });
    } catch (e) {
      // Fallback: try simple sheet parse
      try {
        enData = parseSimpleSheet(enSheet);
        detection.push({
          name: enSheetName,
          lang: 'en',
          rowCount: enData.simpleData?.rows.length ?? 0,
          sectionCount: 0,
        });
      } catch {
        detection.push({
          name: enSheetName,
          lang: 'en',
          rowCount: 0,
          sectionCount: 0,
        });
        console.error(`Error parsing EN sheet "${enSheetName}":`, e);
      }
    }
  }

  // AR
  if (arSheetName && arSheet) {
    try {
      arData = parseSheetAr(arSheet);
      detection.push({
        name: arSheetName,
        lang: 'ar',
        rowCount: arData.sections.reduce((sum, s) => sum + s.cmRows.length, 0),
        sectionCount: arData.sections.length,
      });
    } catch (e) {
      // Fallback: try simple sheet parse
      try {
        arData = parseSimpleSheet(arSheet);
        detection.push({
          name: arSheetName,
          lang: 'ar',
          rowCount: arData.simpleData?.rows.length ?? 0,
          sectionCount: 0,
        });
      } catch {
        detection.push({
          name: arSheetName,
          lang: 'ar',
          rowCount: 0,
          sectionCount: 0,
        });
        console.error(`Error parsing AR sheet "${arSheetName}":`, e);
      }
    }
  }

  // Fallback: if no EN/AR named sheets found, try any sheet as simple format
  // (e.g. Socks with just "Sheet1")
  if (!enSheetName && !arSheetName && wb.SheetNames.length > 0) {
    const fallbackName = wb.SheetNames[0];
    const sheet = wb.Sheets[fallbackName];
    try {
      const simpleData = parseSimpleSheet(sheet);
      // Use as both EN and AR
      enData = simpleData;
      arData = { ...simpleData, simpleData: { ...simpleData.simpleData! } };
      detection.push({
        name: fallbackName,
        lang: 'en',
        rowCount: simpleData.simpleData?.rows.length ?? 0,
        sectionCount: 0,
      });
    } catch (e) {
      console.error(`Error parsing fallback sheet "${fallbackName}":`, e);
    }
  }

  return { guides: [{ blockIndex: 0, enData, arData }], detection };
}
