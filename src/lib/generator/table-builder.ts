import type { TableSection } from '../../types';

// ---------------------------------------------------------------------------
// Value formatting
// ---------------------------------------------------------------------------

/**
 * Format a cell value. Rounds long decimals to 3 places (matching Python).
 */
function formatValue(val: string): string {
  if (!val) return '';
  const num = Number(val);
  if (!Number.isNaN(num) && val.includes('.')) {
    const decimals = val.split('.')[1];
    if (decimals && decimals.length > 3) {
      let formatted = num.toFixed(3);
      // Strip trailing zeros and trailing dot
      formatted = formatted.replace(/0+$/, '').replace(/\.$/, '');
      return formatted;
    }
  }
  return val;
}

// ---------------------------------------------------------------------------
// Table HTML builder
// ---------------------------------------------------------------------------

/**
 * Build one HTML table (cm or inch) for a single section.
 *
 * Matches the exact markup structure of the Python generator:
 * - xl350 class for the INTERNATIONAL CONVERSION header
 * - xl363 class for measurement headers (rowspan=2) and alpha rowspan cells
 * - xl347 class for all data cells and sub-headers
 * - Correct column order: EN = conversion + measurements, AR = measurements + conversion (reversed)
 *
 * @param tableId  - e.g. "cm-rf-table", "in-sf-table"
 * @param section  - The parsed table section data
 * @param unit     - 'cm' or 'inch'
 * @param lang     - 'en' or 'ar'
 */
export function buildTable(
  tableId: string,
  section: TableSection,
  unit: 'cm' | 'inch',
  lang: 'en' | 'ar',
): string {
  const isAr = lang === 'ar';
  const rows = unit === 'cm' ? section.cmRows : section.inchRows;
  const convHeaders = isAr
    ? (section.conversionHeadersAr ?? section.conversionHeaders)
    : section.conversionHeaders;
  const measHeaders = isAr
    ? (section.measurementHeadersAr ?? section.measurementHeaders)
    : section.measurementHeaders;
  const numConv = convHeaders.length;
  const numMeas = measHeaders.length;
  const totalCols = numConv + numMeas;

  // Determine which column index (relative to conversionHeaders) is the ALPHA column.
  // In the parsed data, ALPHA is always the last conversion column.
  const alphaIdx = numConv - 1;

  // Build rowspan map from the DataRow metadata
  const rowspanMap = new Map<number, number>();
  const alphaSpanned = new Set<number>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.rowspan && row.rowspan > 1) {
      rowspanMap.set(i, row.rowspan);
      for (let offset = 1; offset < row.rowspan; offset++) {
        alphaSpanned.add(i + offset);
      }
    } else if (row.isFirstOfGroup && !row.rowspan) {
      // Single-row group (rowspan = 1, still first of group)
      rowspanMap.set(i, 1);
    }
  }

  const lines: string[] = [];

  // Table open
  lines.push(`\t<table id="${tableId}" width="640">`);
  lines.push('\t\t<colgroup>');
  lines.push(`\t\t\t<col class="rtecenter" span="${totalCols}" width="64" />`);
  lines.push('\t\t</colgroup>');
  lines.push('\t\t<tbody>');

  // Header row 1: INTERNATIONAL CONVERSION + measurement headers
  const intConvLabel = isAr ? 'التحويل الدولي' : 'INTERNATIONAL CONVERSION';

  lines.push('\t\t\t<tr height="20">');
  if (isAr) {
    // AR: measurement headers first (they span 2 rows), then conversion label
    for (const mh of measHeaders) {
      lines.push('\t\t\t\t<td class="xl363 rtecenter" height="40" rowspan="2" width="64">');
      lines.push(`\t\t\t\t\t${mh}</td>`);
    }
    lines.push(
      `\t\t\t\t<td class="xl350 rtecenter" colspan="${numConv}" height="20" width="${numConv * 64}">`,
    );
    lines.push(`\t\t\t\t\t${intConvLabel}</td>`);
  } else {
    // EN: conversion label first, then measurement headers
    lines.push(
      `\t\t\t\t<td class="xl350 rtecenter" colspan="${numConv}" height="20" width="${numConv * 64}">`,
    );
    lines.push(`\t\t\t\t\t${intConvLabel}</td>`);
    for (const mh of measHeaders) {
      lines.push('\t\t\t\t<td class="xl363 rtecenter" height="40" rowspan="2" width="64">');
      lines.push(`\t\t\t\t\t${mh}</td>`);
    }
  }
  lines.push('\t\t\t</tr>');

  // Header row 2: conversion sub-headers (SPLASH/UK, ALPHA, etc.)
  lines.push('\t\t\t<tr height="20">');
  if (isAr) {
    // AR: reverse order of conversion headers
    for (let i = convHeaders.length - 1; i >= 0; i--) {
      const ch = convHeaders[i];
      if (i === 0) {
        lines.push('\t\t\t\t<td class="xl347 rtecenter" height="20">');
      } else {
        lines.push('\t\t\t\t<td class="xl347 rtecenter">');
      }
      lines.push(`\t\t\t\t\t${ch}</td>`);
    }
  } else {
    for (let i = 0; i < convHeaders.length; i++) {
      const ch = convHeaders[i];
      if (i === 0) {
        lines.push('\t\t\t\t<td class="xl347 rtecenter" height="20">');
      } else {
        lines.push('\t\t\t\t<td class="xl347 rtecenter">');
      }
      lines.push(`\t\t\t\t\t${ch}</td>`);
    }
  }
  lines.push('\t\t\t</tr>');

  // Data rows
  for (let i = 0; i < rows.length; i++) {
    const rowData = rows[i];
    const vals = rowData.values;
    const convVals = vals.slice(0, numConv);
    const measVals = vals.slice(numConv);

    lines.push('\t\t\t<tr height="20">');

    if (isAr) {
      // AR: measurements first
      for (const mv of measVals) {
        lines.push('\t\t\t\t<td class="xl347 rtecenter">');
        lines.push(`\t\t\t\t\t${formatValue(mv)}</td>`);
      }
      // AR: conversion columns in reverse order
      for (let ci = numConv - 1; ci >= 0; ci--) {
        const cv = convVals[ci];
        if (ci === alphaIdx) {
          if (rowspanMap.has(i)) {
            const rs = rowspanMap.get(i)!;
            if (rs > 1) {
              lines.push(
                `\t\t\t\t<td class="xl363 rtecenter" height="${rs * 20}" rowspan="${rs}" width="64">`,
              );
            } else {
              lines.push('\t\t\t\t<td class="xl347 rtecenter">');
            }
            lines.push(`\t\t\t\t\t${formatValue(cv)}</td>`);
          } else if (alphaSpanned.has(i)) {
            // Skip — merged into rowspan above
          } else {
            lines.push('\t\t\t\t<td class="xl347 rtecenter">');
            lines.push(`\t\t\t\t\t${formatValue(cv)}</td>`);
          }
        } else {
          if (ci === 0) {
            lines.push('\t\t\t\t<td class="xl347 rtecenter" height="20">');
          } else {
            lines.push('\t\t\t\t<td class="xl347 rtecenter">');
          }
          lines.push(`\t\t\t\t\t${formatValue(cv)}</td>`);
        }
      }
    } else {
      // EN: conversion first, then measurements
      for (let ci = 0; ci < convVals.length; ci++) {
        const cv = convVals[ci];
        if (ci === alphaIdx) {
          if (rowspanMap.has(i)) {
            const rs = rowspanMap.get(i)!;
            if (rs > 1) {
              lines.push(
                `\t\t\t\t<td class="xl363 rtecenter" height="${rs * 20}" rowspan="${rs}" width="64">`,
              );
            } else {
              lines.push('\t\t\t\t<td class="xl347 rtecenter">');
            }
            lines.push(`\t\t\t\t\t${formatValue(cv)}</td>`);
          } else if (alphaSpanned.has(i)) {
            // Skip
          } else {
            lines.push('\t\t\t\t<td class="xl347 rtecenter">');
            lines.push(`\t\t\t\t\t${formatValue(cv)}</td>`);
          }
        } else {
          if (ci === 0) {
            lines.push('\t\t\t\t<td class="xl347 rtecenter" height="20">');
          } else {
            lines.push('\t\t\t\t<td class="xl347 rtecenter">');
          }
          lines.push(`\t\t\t\t\t${formatValue(cv)}</td>`);
        }
      }
      for (const mv of measVals) {
        lines.push('\t\t\t\t<td class="xl347 rtecenter">');
        lines.push(`\t\t\t\t\t${formatValue(mv)}</td>`);
      }
    }

    lines.push('\t\t\t</tr>');
  }

  lines.push('\t\t</tbody>');
  lines.push('\t</table>');
  return lines.join('\n');
}
