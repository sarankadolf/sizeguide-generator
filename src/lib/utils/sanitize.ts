/**
 * Build the image base name (without extension) used in both:
 * - Downloaded image filenames: sizeguide_{number}_{lang}.png
 * - HTML image URLs: {baseUrl}sizeguide_{number}_{lang}
 *
 * This is intentionally IDENTICAL to the generated HTML template's base name
 * (sizeguide_{number}_{lang}.html) so the image file can be matched 1:1 with
 * its template just by swapping the extension.
 *
 * Example: guideNumber=1500, lang='en' → "sizeguide_1500_en"
 */
export function buildImageBaseName(
  guideNumber: number,
  lang: 'en' | 'ar'
): string {
  return `sizeguide_${guideNumber}_${lang}`;
}
