// ─── App Steps ──────────────────────────────────────────────────────────────

export type Step = 'upload' | 'configure' | 'generate';

export type GuideStatus = 'pending' | 'parsed' | 'ready' | 'generating' | 'done' | 'error';

// ─── Excel Parsing Types ────────────────────────────────────────────────────

export interface ParsedSheet {
  name: string;
  language: 'EN' | 'AR';
  headers: string[];
  rows: string[][];
}

export interface ParsedExcelData {
  fileName: string;
  sheets: ParsedSheet[];
  sheetCount: number;
  hasEN: boolean;
  hasAR: boolean;
}

export interface DetectedSheet {
  name: string;
  lang: 'en' | 'ar';
  rowCount: number;
  sectionCount: number;
}

/**
 * One parsed guide extracted from an Excel workbook. Most workbooks produce
 * exactly one; multi-guide workbooks (several unrelated size guides clubbed
 * into one sheet pair) produce several, each independently generatable.
 */
export interface ParsedWorkbookGuide {
  /** Index within the source workbook (0-based), used for stable keys and
   *  default guide-number ordering. */
  blockIndex: number;
  enData: ParsedGuideData | null;
  arData: ParsedGuideData | null;
}

// ─── Generator Types (used by lib/generator) ────────────────────────────────

export interface DataRow {
  values: string[];
  rowspan?: number;
  isFirstOfGroup?: boolean;
}

export interface MeasurementInstruction {
  number: number;
  name: string;
  description: string;
}

export interface TableSection {
  id?: string;
  title: string;
  titleAr?: string;
  conversionHeaders: string[];
  conversionHeadersAr?: string[];
  measurementHeaders: string[];
  measurementHeadersAr?: string[];
  cmRows: DataRow[];
  inchRows: DataRow[];
}

export interface SimpleTableData {
  headers: string[];
  rows: string[][];
}

export interface ParsedGuideData {
  sections: TableSection[];
  measurements: MeasurementInstruction[];
  measurementTitle?: string;
  disclaimer?: string;
  isSimple?: boolean;
  simpleData?: SimpleTableData;
  /** Category codes from column A of the Excel (e.g. women-arabicclothing-dresses) */
  categories?: string[];
  /** Brand names from the Brand Name column (e.g. [['Splash', 'splash'], ['Iconic', 'iconic']]) */
  brands?: [string, string][];
}

// ─── Guide Configuration (store) ────────────────────────────────────────────

export interface SizeGuideConfig {
  id: string;
  fileName: string;
  parsedData: ParsedExcelData;
  guideNumber: number | null;
  status: GuideStatus;
  error?: string;
  /** Parsed EN guide data for the HTML generator */
  generatorData?: ParsedGuideData;
  /** Parsed AR guide data for the HTML generator */
  arGeneratorData?: ParsedGuideData;
  /** Original uploaded File object, retained for image extraction */
  file?: File;
}

// ─── Generated Output ───────────────────────────────────────────────────────

export interface GeneratedFile {
  /** Display name used in the UI (e.g. sizeguide_1_en.html) */
  fileName: string;
  /** File name used by zip/download utilities */
  filename: string;
  language: 'EN' | 'AR';
  /** Full HTML content */
  html: string;
  /** Alias for html, used by zip utility */
  content: string;
  guideId: string;
}
