/**
 * Build the image name (without extension) used in both:
 * - Downloaded image filenames: sizeGuide_{number}_{originalName}_{lang}.png
 * - HTML image URLs: {baseUrl}sizeGuide_{number}_{originalName}_{lang}
 *
 * Uses the ORIGINAL Excel filename as-is (minus .xlsx extension).
 * This ensures compatibility with images already uploaded to Amplience.
 *
 * Example: "Women- Blazers.xlsx" → "sizeGuide_1500_Women- Blazers_en"
 * Example: "Women-Denim Jeans-Jeggings-Shorts-Skirt.xlsx" → "sizeGuide_1504_Women-Denim Jeans-Jeggings-Shorts-Skirt_ar"
 */
export function buildImageBaseName(
  guideNumber: number,
  fileName: string,
  lang: 'en' | 'ar'
): string {
  const base = fileName.replace(/\.xlsx$/i, '');
  return `sizeGuide_${guideNumber}_${base}_${lang}`;
}
