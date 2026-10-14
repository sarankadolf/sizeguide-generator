import type { SizeGuideConfig } from '../../types';

const RULE = '-'.repeat(79);
const WRAP_WIDTH = 75;
const INDENT = '  ';

/** Wrap a comma-joined list of items to WRAP_WIDTH, indented by 2 spaces. */
function wrapList(items: string[]): string {
  if (items.length === 0) return '';
  const joined = items.join(', ');
  const words = joined.split(' ');
  const lines: string[] = [];
  let current = INDENT;
  for (const word of words) {
    const candidate = current === INDENT ? INDENT + word : `${current} ${word}`;
    if (candidate.length > WRAP_WIDTH && current !== INDENT) {
      lines.push(current);
      current = INDENT + word;
    } else {
      current = candidate;
    }
  }
  if (current.trim().length > 0) lines.push(current);
  return lines.join('\n');
}

/**
 * Build the handover-text block for a single guide, in the team's
 * established format:
 *
 * -------------------------------------------------------------------------------
 * sizeguide_{id}_en.html / sizeguide_{id}_ar.html
 * -------------------------------------------------------------------------------
 * Brands (N):
 *   Brand A, Brand B
 *
 * Categories (N):
 *   category-code-1
 *   category-code-2
 *
 *
 * @ please map the template id.
 *
 * @ {brandLabel} size guide is ready. PFA.
 *
 * Brands/categories come from the parsed Excel sheet (Brand Name column and
 * column A category codes). The "@" mention lines are left bare (no name) —
 * whoever pastes this fills in the mention themselves. Returned text has no
 * trailing newline — callers decide how to separate multiple blocks.
 */
export function buildHandoverText(guide: SizeGuideConfig): string {
  const id = guide.guideNumber;
  const brands = guide.generatorData?.brands ?? [];
  const brandNames = brands.map(([name]) => name);
  const categories = guide.generatorData?.categories ?? [];

  const brandLabel =
    brandNames.length > 0
      ? brandNames.join(', ')
      : guide.fileName.replace(/\.[^.]+$/, '');

  const lines: string[] = [];
  lines.push(RULE);
  lines.push(`sizeguide_${id}_en.html / sizeguide_${id}_ar.html`);
  lines.push(RULE);
  lines.push(`Brands (${brandNames.length}):`);
  lines.push(wrapList(brandNames));
  lines.push('');
  lines.push(`Categories (${categories.length}):`);
  for (const cat of categories) {
    lines.push(`${INDENT}${cat}`);
  }
  lines.push('');
  lines.push('');
  lines.push('@ please map the template id.');
  lines.push('');
  lines.push(`@ ${brandLabel} size guide is ready. PFA.`);

  return lines.join('\n').replace(/\n+$/, '');
}

/**
 * Build combined handover text for multiple guides (e.g. "copy all" from the
 * Generate step), separated by a blank line before each new block's rule —
 * matching the legacy multi-entry handover.txt spacing.
 */
export function buildHandoverTextForGuides(guides: SizeGuideConfig[]): string {
  const blocks = guides
    .filter((g) => g.guideNumber !== null)
    .map((g) => buildHandoverText(g));
  return blocks.join('\n\n\n');
}
