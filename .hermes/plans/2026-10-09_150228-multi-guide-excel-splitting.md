# Multi-Guide Excel Splitting — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** When an uploaded Excel workbook contains multiple distinct size-guide
datasets clubbed into one sheet pair (EN/AR), detect each distinct guide block,
split it out, and let the user generate N separate HTML template pairs (one
per guide) from that single upload — instead of silently merging unrelated
category blocks into one broken guide or crashing.

**Architecture:** Add a new "block detection" layer in front of the existing
single-guide `parseSheetEn`/`parseSheetAr`. It scans a sheet for repeated
"INTERNATIONAL CONVERSION" / "التحويل الدولي" markers and groups the
rows between them into independent guide blocks, each carrying its own
category-code slice (taken from column A, bounded to that block's row range)
and its own brand slice. Existing single-guide parsing (which already
supports multi-section guides like Top+Bottom Pyjama sets) is reused
UNCHANGED as the "parse one block" step — we're adding a layer above it, not
rewriting it.

**Tech Stack:** TypeScript, `xlsx` (SheetJS), Zustand (existing stores),
React/Vite UI (existing steps).

---

## Grounding: what a multi-guide workbook actually looks like

Verified against the attached `DSM_Size_Chart_Final.xlsx` (EN + AR sheets,
~195 rows each, no "Brand Name" column anywhere):

- Column A holds category codes but with **no blank-row separation between
  guide blocks** — e.g. rows 2-9 belong to one guide ("Blouses/Cardigans/
  Tops"), rows 36-40 belong to a completely different guide ("Bottoms"), but
  column A has entries scattered at rows 2-9, then 36-40, then 69-73, etc.,
  with large gaps where column A is simply blank (not a blank-row-per-guide
  marker — the sheet uses merged cells, so "gap" ≠ "new guide").
- The ONE reliable per-guide signal is the **"INTERNATIONAL CONVERSION" /
  "التحويل الدولي" header marker**: this workbook has it **6 times**
  (rows ~4, 38, 71, 106, 139, 172), each starting a fresh measurement table.
  A normal single-guide workbook (verified against
  `Women-Bottom-Trousers-...xlsx`) has it exactly **once**, even when that
  guide has two sections (e.g. Top + Bottom pyjama set — verified against
  `sizeguide_3001` in the legacy handover, which legitimately keeps 2
  sections inside ONE guide).
- Each of the 6 blocks in DSM has its own "How to Measure" footer
  immediately following its data rows, confirming they are self-contained
  guides, not sub-sections of one guide.
- There is no "Brand Name" column at all in this workbook — brand detection
  must gracefully produce an empty brand list per block (already the
  fallback behavior in `extractBrands`/`handover.ts`).
- Only ONE embedded image exists in the whole workbook
  (`xl/media/image1.jpg`) but is drawn multiple times at different row
  anchors (`drawing1.xml`/`drawing2.xml` — 6 anchors each, at rows 1, 40, 68,
  104, 137/136, 168/169). This means **per-block image extraction by row
  anchor** is possible in principle, but is explicitly OUT OF SCOPE for this
  plan (see Non-Goals) — the existing single-image-per-sheet extraction
  already works for both the "one shared image" and "one image per sheet"
  cases; splitting an embedded drawing by row-range is a separate, riskier
  feature.

**Key design constraint:** splitting must be reserved for sheets with ≥2
"INTERNATIONAL CONVERSION" matches where the matches are NOT already
accounted for by the existing single-guide section logic (i.e. genuinely
separate guides, not Top/Bottom sections of one guide). The existing
Top/Bottom pyjama-set case (2 sections, 1 "How to Measure" block at the very
end, 1 image) must NOT be mistaken for a 2-guide split.

### Distinguishing "2 sections, 1 guide" from "2 guides"

Looked at both cases concretely:

- **Pyjama set (1 guide, 2 sections)**: `generate_sizeguide.py`'s
  `parse_sheet()` finds ONE "INTERNATIONAL CONVERSION" header per sheet in
  that workbook shape — the legacy Python generator's docstring and
  `detectSectionsEn`/`Ar` in the TS port already loop to find **multiple**
  "INTERNATIONAL CONVERSION" matches **in the same scan** and treat them as
  sections of the SAME guide (`sections.push(...)` runs in a `while` loop
  over the whole sheet today) — this is actually already the current
  (accidental) multi-section behavor. Needs verification: does the current
  parser treat 2 "INTERNATIONAL CONVERSION" matches in a Pyjama-style sheet
  as 2 sections of 1 guide (via `rowIdx = dataEnd + 1` continuing the scan)?
  **Yes** — confirmed by reading `detectSectionsEn()` in
  `src/lib/excel/parser.ts`: it loops `while (rowIdx <= maxR)`, finds EVERY
  "INTERNATIONAL CONVERSION"/"(CM)"/"(INCH)" occurrence sheet-wide, and
  pushes one section per occurrence into **a single `ParsedGuideData`**.
  This is exactly why today DSM's 6 blocks got silently parsed as 6
  "sections" of ONE guide (see Task 1 verification below) — the bug we're
  fixing.
- **Distinguishing signal available:** a genuine multi-section SINGLE guide
  (Top+Bottom) has its sections immediately adjacent with no unrelated
  category-code run in between, and only ONE "How to Measure" block at the
  very end covering both sections. A multi-GUIDE workbook has a **separate
  "How to Measure" block after EACH block** (confirmed: DSM has 6 "How to
  Measure Your Body" occurrences, one after each data block — see dump rows
  19-28, 53-62, 86-95, 121-130, 152-161, 185-194). **This is the
  disambiguating signal**: count "How to Measure" occurrences per sheet.
  - 1 "How to Measure" block + N "INTERNATIONAL CONVERSION" blocks → single
    guide, N sections (existing behavior, keep as-is).
  - N "How to Measure" blocks, each following its own "INTERNATIONAL
    CONVERSION" block → N separate guides (new behavior, this plan).
  - This must be verified against the Pyjama set source workbook if it's
    still available (see Task 1), or at minimum the generated
    `sizeguide_3001_en.html` must be re-confirmed to come from a sheet with
    exactly one "How to Measure" section.

## Non-Goals (explicitly out of scope for this plan)

- Splitting a single embedded image by row-anchor into per-guide images.
  Each split guide will fall back to "no image found" / the existing
  fallback-slug mechanism, same as any other guide without an explicit
  image URL marker. The user can manually assign images afterward via the
  existing Configure step flow (no change needed there).
- Any change to `generate_sizeguide.py` (the legacy Python CLI pipeline) —
  this plan only touches the TypeScript `sizeguide-generator` web app.
- Automatic guide-number assignment across split guides beyond what
  `autoFillNumbers` already does (it already works per-guide-row in the
  Configure step; splitting just produces more rows for it to fill).

---

## Step-by-step plan

### Task 1: Confirm current (buggy) behavior on the DSM workbook with a throwaway script

**Objective:** Get concrete proof of today's wrong output before writing the
fix, so we have a before/after baseline.

**Files:**
- None committed — ad hoc `npx tsx -e "..."` run against
  `/Users/saikarthik/.hermes/profiles/lmg-assistant/attachments/DSM_Size_Chart_Final.xlsx`

**Step 1: Run the current parser against the DSM file**

```bash
cd /Users/saikarthik/Documents/sizeguide-generator
npx tsx -e "
import { parseExcelFile } from './src/lib/excel/parser.ts';
import { readFileSync } from 'fs';
const buf = readFileSync('/Users/saikarthik/.hermes/profiles/lmg-assistant/attachments/DSM_Size_Chart_Final.xlsx');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const { enData } = parseExcelFile(ab);
console.log('sections:', enData.sections.length);
console.log('categories (all merged, WRONG):', enData.categories.length);
"
```

Expected (already verified in this session): `sections: 6`, all 6 unrelated
category blocks (shirts/blouses, bottoms, bras, panties, swimsuits, bikinis)
merged into ONE `ParsedGuideData.categories` array of 24 codes — i.e. today
this workbook produces ONE garbled guide instead of 6 correct ones. This is
the bug.

**Step 2: Confirm the Pyjama-set baseline is NOT affected**

If the original Pyjama-set source workbook is still in
`/Users/saikarthik/Documents/intelliswift task/size guide/excel sheets/`
or `completed/excel sheets/`, run the same check against it and confirm:
`sections.length === 2` (Top + Bottom) AND exactly one "How to Measure"
block in the raw sheet (grep the dump for `How to Measure` occurrences). If
that source file is gone, skip to Task 2 — the written output
`sizeguide_3001_en.html` already proves single-"How to Measure" structure.

---

### Task 2: Add a sheet-level "guide block" scanner

**Objective:** Before running the existing `detectSectionsEn`/`detectSectionsAr`,
scan the whole sheet once to find the row ranges of each independent guide
block (if more than one exists), using the "How to Measure" count as the
disambiguator described above.

**Files:**
- Modify: `src/lib/excel/parser.ts`

**Step 1: Add a block-boundary finder function**

Add near the top of `parser.ts`, after the existing `getRange` helper:

```typescript
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
 * Find row ranges of independent HOW-TO-MEASURE footer markers in a sheet.
 * Each occurrence closes out one guide block. Used to decide whether a
 * sheet contains ONE guide (possibly with multiple measurement sections,
 * e.g. Top + Bottom) or SEVERAL unrelated guides clubbed together.
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
  const blocks: GuideBlockRange[] = [];
  for (let i = 0; i < headerRows.length; i++) {
    const start = headerRows[i];
    const end = i < footerRows.length ? footerRows[i] : maxR;
    blocks.push({ startRow: start, endRow: end });
  }
  return blocks;
}
```

**Step 2: Verify against DSM file (expect 6 blocks)**

```bash
cd /Users/saikarthik/Documents/sizeguide-generator
npx tsx -e "
import * as XLSX from 'xlsx';
import { detectGuideBlocks } from './src/lib/excel/parser.ts';
import { readFileSync } from 'fs';
const buf = readFileSync('/Users/saikarthik/.hermes/profiles/lmg-assistant/attachments/DSM_Size_Chart_Final.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const sheet = wb.Sheets[\"DSM Women's - EN\"];
console.log(detectGuideBlocks(sheet, false));
"
```

Expected: an array of 6 `{startRow, endRow}` objects, roughly matching rows
`[3,28], [37,62], [70,95], [105,130], [138,161/162], [171,194]` (0-based;
exact numbers may be off by 1-2, confirm against the row dump captured in
this session).

**Step 3: Verify the scanner returns `null` for a normal single-guide sheet**

Run the same check against
`completed/excel sheets/Women-Bottom-Trousers-Shorts-Joggers-Leggings-Chinos-Skirt-Pyjama.xlsx`
(or any other single-guide workbook) and confirm `detectGuideBlocks` returns
`null` (exactly one "INTERNATIONAL CONVERSION" marker there).

---

### Task 3: Slice categories/brands per block and parse each block independently

**Objective:** When `detectGuideBlocks` returns multiple blocks, parse EACH
block's row range as its own `ParsedGuideData` (reusing the existing
single-guide section/measurement/category/brand extraction, just bounded to
that block's rows), instead of parsing the whole sheet as one guide.

**Files:**
- Modify: `src/lib/excel/parser.ts`

**Step 1: Add row-bounded variants of the existing extraction helpers**

The existing `detectSectionsEn`/`Ar`, `extractCategories`, `extractBrands`,
`extractInstructionsEn`/`Ar` all scan the FULL sheet (`0` to `maxR`). Add
an optional `(startRow, endRow)` bound to each, defaulting to the full
sheet range so existing single-guide behavior is 100% unchanged when not
splitting:

```typescript
// extractCategories — bound to a row range (defaults to whole sheet)
function extractCategories(
  sheet: XLSX.WorkSheet,
  rowBounds?: { start: number; end: number },
): string[] {
  const { maxR } = getRange(sheet);
  const start = rowBounds?.start ?? 0;
  const end = rowBounds?.end ?? maxR;
  const seen = new Set<string>();
  const categories: string[] = [];
  for (let r = start; r <= end; r++) {
    const val = getCell(sheet, r, 0);
    if (val && val.includes('-') && !seen.has(val)) {
      seen.add(val);
      categories.push(val);
    }
  }
  return categories;
}
```

Apply the same `rowBounds` parameter pattern to:
- `detectSectionsEn(sheet, rowBounds?)` / `detectSectionsAr(sheet, rowBounds?)`
  — bound the outer `while (rowIdx <= maxR)` loop's `maxR` to
  `rowBounds?.end ?? maxR` and start `rowIdx` at `rowBounds?.start ?? 0`.
- `extractInstructionsEn(sheet, dataEnd, rowBounds?)` /
  `extractInstructionsAr(...)` — bound the `for (let r = dataEnd + 1; r <= maxR; r++)`
  loop's upper limit to `rowBounds?.end ?? maxR`.
- `extractBrands(sheet, rowBounds?)` — same pattern (there's no "Brand Name"
  column in DSM, so this will correctly return `[]` per block; verified).

**Step 2: Add `parseSheetEnBlock`/`parseSheetArBlock` wrapper**

Add a thin wrapper that calls the existing `parseSheetEn`/`parseSheetAr`
logic but passes `rowBounds` through to each extraction call. Simplest
approach: refactor `parseSheetEn(sheet)` into
`parseSheetEn(sheet, rowBounds?)` directly (single function, optional
param), same for `parseSheetAr`. This avoids duplicating the function.

**Step 3: Verify against DSM — 6 independent category lists**

```bash
cd /Users/saikarthik/Documents/sizeguide-generator
npx tsx -e "
import * as XLSX from 'xlsx';
import { detectGuideBlocks, parseSheetEn } from './src/lib/excel/parser.ts';
// (parseSheetEn needs to be exported for this check — temporarily export it,
//  or test through the public parseExcelFile entry point added in Task 4)
"
```

Expected per block (0-based, matching the row dump from this session):
- Block 1 (rows ~3-28): categories = shirts/blouses/cardigans/jumpers/
  tshirts/dresses/jumpsuits (7 codes), measurement headers = BUST/WAIST/HIP
  with inch+cm both present (no derive-inch fallback needed here).
- Block 2 (rows ~37-62): categories = bottoms (jeans/joggers/shorts/skirts/
  trousers), measurement headers = WAIST/HIP/INSEAM.
- Block 3 (rows ~70-95): lingerie (bras/camisoles/corsets/etc.), 4
  measurement columns (BUST/UNDER BUST/WAIST/HIP).
- Block 4 (rows ~105-130): panties/shapewear, WAIST/HIP only.
- Block 5 (rows ~138-162): swimsuits/bikinis/coverups, 4 measurement cols.
- Block 6 (rows ~171-194): bikinis (different code set than block 5),
  WAIST/HIP only.

---

### Task 4: Wire multi-block detection into `parseExcelFile` and the new types

**Objective:** `parseExcelFile()` (the public entry point used by
`UploadStep.tsx`) must return an ARRAY of guides when a sheet splits, instead
of a single `{enData, arData}` pair.

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/excel/parser.ts`

**Step 1: Add a new return shape to `types/index.ts`**

```typescript
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
```

**Step 2: Change `parseExcelFile`'s return shape**

```typescript
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
  // honor a split when BOTH sheets agree on the block count (same number of
  // "How to Measure" footers) — if they disagree, fall back to treating the
  // workbook as a single guide rather than guessing a misaligned split.
  const enBlocks = enSheet ? detectGuideBlocks(enSheet, false) : null;
  const arBlocks = arSheet ? detectGuideBlocks(arSheet, true) : null;

  const blockCount =
    enBlocks && arBlocks && enBlocks.length === arBlocks.length
      ? enBlocks.length
      : null;

  if (blockCount && blockCount >= 2) {
    // Multi-guide workbook: parse each block independently.
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
        name: enSheetName, lang: 'en',
        rowCount: guides.reduce((s, g) => s + (g.enData?.sections.reduce((ss, se) => ss + se.cmRows.length, 0) ?? 0), 0),
        sectionCount: blockCount,
      });
    }
    if (arSheetName) {
      detection.push({
        name: arSheetName, lang: 'ar',
        rowCount: guides.reduce((s, g) => s + (g.arData?.sections.reduce((ss, se) => ss + se.cmRows.length, 0) ?? 0), 0),
        sectionCount: blockCount,
      });
    }
    return { guides, detection };
  }

  // --- Single-guide path: existing behavior, unchanged, wrapped in the new shape ---
  let enData: ParsedGuideData | null = null;
  let arData: ParsedGuideData | null = null;
  // ... existing try/catch parse logic from the current function body,
  //     verbatim, just assigning into enData/arData as before ...

  return { guides: [{ blockIndex: 0, enData, arData }], detection };
}
```

(The "existing try/catch parse logic" is the current body of
`parseExcelFile` — copy it in unchanged, just indented into the fallback
branch. Do not modify its internals.)

**Step 3: Verify single-guide workbooks still produce exactly 1 guide**

Run `parseExcelFile` against 2-3 of the existing single-guide workbooks in
`completed/excel sheets/` and confirm `guides.length === 1` with identical
`categories`/`brands`/`sections` output to before this change (diff against
a saved baseline captured before Task 2's edits, or re-run Task 1's style
check pre/post).

**Step 4: Verify DSM workbook produces exactly 6 guides**

```bash
cd /Users/saikarthik/Documents/sizeguide-generator
npx tsx -e "
import { parseExcelFile } from './src/lib/excel/parser.ts';
import { readFileSync } from 'fs';
const buf = readFileSync('/Users/saikarthik/.hermes/profiles/lmg-assistant/attachments/DSM_Size_Chart_Final.xlsx');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const { guides, detection } = parseExcelFile(ab);
console.log('guide count:', guides.length);
guides.forEach((g, i) => console.log(i, g.enData?.categories, g.enData?.sections.map(s=>s.measurementHeaders)));
"
```

Expected: `guide count: 6`, each with its own distinct category list matching
the breakdown in Task 3 Step 3.

---

### Task 5: Update `UploadStep.tsx` to add N guides per workbook

**Objective:** When a workbook produces multiple `ParsedWorkbookGuide`
entries, add one `SizeGuideConfig` row per block instead of one per file —
each gets its own `fileName` suffix for display (e.g.
`DSM_Size_Chart_Final.xlsx [1/6]`) so the Configure/Generate steps, which
already operate per-`SizeGuideConfig`-row, work completely unchanged.

**Files:**
- Modify: `src/components/steps/UploadStep.tsx`
- Modify: `src/types/index.ts` (if `SizeGuideConfig.fileName` needs a
  display-label companion field — see Step 2)

**Step 1: Update the parse call site**

```typescript
const buffer = await file.arrayBuffer();
const parsed = parseExcelFile(buffer);
const isMultiGuide = parsed.guides.length > 1;

for (const guideBlock of parsed.guides) {
  const id = `guide_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const displayName = isMultiGuide
    ? `${file.name} [${guideBlock.blockIndex + 1}/${parsed.guides.length}]`
    : file.name;

  const parsedData = {
    fileName: displayName,
    sheets: [] as import('../../types').ParsedSheet[],
    sheetCount: parsed.detection.length,
    hasEN: guideBlock.enData !== null,
    hasAR: guideBlock.arData !== null,
  };

  addGuide({
    id,
    fileName: displayName,
    parsedData,
    guideNumber: null,
    status: 'parsed',
    generatorData: guideBlock.enData ?? guideBlock.arData ?? undefined,
    arGeneratorData: guideBlock.arData ?? undefined,
    file, // same original File object shared across all blocks from this upload
  });
}

toast.success(
  isMultiGuide
    ? `Parsed "${file.name}" — split into ${parsed.guides.length} size guides`
    : `Parsed "${file.name}" — ${parsed.detection.length} sheet(s) detected`
);
```

**Step 2: Check downstream impact of sharing one `File` across multiple guide rows**

`ConfigureStep.tsx`'s `handleDownloadImages` and `GenerateStep.tsx`'s same
function both call `extractImagesFromExcel(buffer, guide.guideNumber)` once
per `guide` with a `file` set. Since all N blocks from one workbook share
the SAME underlying `file`, this will extract the SAME embedded image N
times (once per guide row), naming each `sizeguide_{N}_{lang}.{ext}` using
each row's own `guideNumber` — which is actually correct behavior (each
split guide gets its own image filename per its own guide number, falling
back to the one shared embedded image, consistent with the Non-Goals
decision not to split images by row-anchor). No code change needed here,
but note it for the user explication in Task 6.

**Step 3: Manual verification**

Run `npm run dev`, upload `DSM_Size_Chart_Final.xlsx`, confirm the Upload
step shows 6 rows all referencing the same original filename with
`[1/6]`...`[6/6]` suffixes, each with correct EN/AR badges.

---

### Task 6: Update the Configure step's guide-number auto-fill ordering (verification only, likely no code change)

**Objective:** Confirm `autoFillNumbers` (which assigns `startNumber + i`
across `guides` in store order) assigns consecutive numbers to the 6 new
rows in the same relative order they were added (block 1 → block 6),
matching the user's expectation that guide numbers increase in blockIndex
order.

**Files:**
- Verify only: `src/store/useGuideStore.ts` (`autoFillNumbers`)

**Step 1: Trace the logic**

`autoFillNumbers` maps over `state.guides` in array order and assigns
`startNumber + i`. Since Task 5 pushes guide blocks via `addGuide` in
`blockIndex` order (0 → 5) within the same `for` loop iteration, the store
array preserves that order. No change needed — just confirm via the
Configure step's guide number auto-fill button during manual testing in
Task 5 Step 3.

---

### Task 7: Add a "split detected" notice to the Upload step UI

**Objective:** Make the split behavior visible and understandable to the
user — don't silently turn 1 upload into 6 rows without explanation.

**Files:**
- Modify: `src/components/steps/UploadStep.tsx`

**Step 1: Add a visual grouping / badge for multi-guide-derived rows**

In the uploaded-files list, when consecutive guides share the same original
`file` object (or, simpler: track a `sourceFileName` + `splitTotal` on each
`SizeGuideConfig`, added as optional fields in `types/index.ts`), render a
small "Split 1/6 from DSM_Size_Chart_Final.xlsx" sub-label instead of (or
alongside) the `[1/6]` suffix baked into `fileName` from Task 5. This is a
UI nicety — if time-constrained, the bracket suffix from Task 5 alone is
sufficient and this task can be deferred.

**Step 2: Manual verification**

Re-run the Upload step with DSM file, confirm the 6 rows are visually
distinguishable as coming from one source workbook.

---

## Files likely to change (summary)

- `src/lib/excel/parser.ts` — add `detectGuideBlocks`, row-bounded variants
  of `extractCategories`/`extractBrands`/`detectSectionsEn`/
  `detectSectionsAr`/`extractInstructionsEn`/`extractInstructionsAr`, change
  `parseExcelFile`'s return shape to `{ guides: ParsedWorkbookGuide[], detection }`.
- `src/types/index.ts` — add `ParsedWorkbookGuide` interface; optionally add
  `sourceFileName`/`splitIndex`/`splitTotal` to `SizeGuideConfig` for Task 7.
- `src/components/steps/UploadStep.tsx` — loop over `parsed.guides` instead
  of assuming one guide per file; update toast message.
- No changes expected to `ConfigureStep.tsx`, `GenerateStep.tsx`,
  `engine.ts`, `table-builder.ts`, `handover.ts`, `sanitize.ts`,
  `image-extractor.ts` — they already operate per-`SizeGuideConfig` row and
  are agnostic to whether that row came from a 1-guide or N-guide workbook.

## Tests / validation

No existing test suite in this project (confirmed: no `*.test.ts`/`*.spec.ts`
files, no test runner in `package.json`). Validation is via the `npx tsx -e`
ad hoc scripts embedded in each task above, run against:

1. `DSM_Size_Chart_Final.xlsx` (the multi-guide case, 6 expected blocks)
2. At least 2 single-guide workbooks from `completed/excel sheets/` (must
   continue producing exactly 1 guide each, with unchanged output)
3. A multi-SECTION single-guide workbook if the original Pyjama-set source
   file can be found (must continue producing 1 guide with 2 sections, not
   split into 2 guides)

Plus standard project checks after all tasks:
```bash
cd /Users/saikarthik/Documents/sizeguide-generator
npx tsc -b        # expect only the pre-existing unrelated SimpleTableData warning
npx oxlint src/   # same
npm run build     # full build
```

Manual UI pass: `npm run dev`, upload DSM file, walk through
Upload → Configure → Generate, confirm 6 HTML template pairs download
correctly in the final ZIP, each with correct brand/category data in its
embedded `<!-- Size guide: ... -->` comment (if the TS generator writes one
— check `engine.ts`; the Python reference does via `meta` in
`generate_sizeguide.py`, confirm TS parity or note the gap).

## Risks, tradeoffs, and open questions

1. **Heuristic fragility**: the "How to Measure count == INTERNATIONAL
   CONVERSION count, and both >= 2" rule is inferred from exactly ONE
   multi-guide sample (DSM) and ONE multi-section sample (Pyjama, via its
   already-generated output, not its raw source). If a future multi-guide
   workbook omits a "How to Measure" footer for one of its blocks, or a
   genuinely-one-guide workbook happens to repeat "How to Measure" per
   section (which the Pyjama case did NOT do, per its single rendered
   how-to-measure block), the heuristic will misfire. **Mitigation**: Task 4
   Step 2 already refuses to split when EN/AR block counts disagree,
   failing safe to single-guide mode rather than guessing. Recommend
   manually reviewing `detectGuideBlocks`'s output whenever a new workbook
   shape is encountered, the same way the Python pipeline's
   "DATA FIX"/"ERROR" console reporting makes corrections visible rather
   than silent (see `excel-sizeguide-to-html` skill's Pitfalls section for
   the established pattern of surfacing uncertain corrections to the user).
2. **No "Brand Name" column in DSM-style workbooks**: confirmed
   `extractBrands` returns `[]` for every block — the handover-text builder
   (`handover.ts`) already falls back to the guide's `fileName` when
   `brands` is empty, so each split guide's handover text will read e.g.
   "`DSM_Size_Chart_Final.xlsx [1/6]` size guide is ready" rather than a
   real brand name — cosmetically awkward but not broken. Worth asking the
   user whether brand names should be entered manually per split guide
   somewhere in the Configure step (currently no such field exists for
   brand — only guide number). **Open question for the user.**
3. **Shared image across split guides**: per Non-Goals, all N split guides
   fall back to the SAME single embedded image (if any), each saved under
   its own `sizeguide_{N}_{lang}.{ext}` name. If the real-world workbook
   intends different artwork per block (DSM's `drawing1.xml`/`drawing2.xml`
   DO anchor 6 separate picture placements, though they're alll the same
   underlying `image1.jpg` bytes in this sample), a future enhancement could
   extract by row-anchor instead of by sheet. Deliberately deferred — flag
   to the user as a known follow-up, not silently solved.
4. **Guide numbering for split guides**: Task 6 confirms auto-fill assigns
   sequential numbers in block order, but the user still has to manually
   pick a sensible starting number and resolve any `Template ID already
   exists` warnings per split guide — same friction as today, just across
   more rows. No plan change needed, just a UX note.
