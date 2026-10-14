import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { buildImageBaseName } from '../utils/sanitize';

export interface ExtractedImage {
  filename: string;
  data: Uint8Array;
  lang: 'en' | 'ar';
  guideNumber: number;
}

interface SheetImageLink {
  lang: 'en' | 'ar';
  imagePath: string;
}

/**
 * Extract embedded images from an Excel file's zip structure.
 * Only extracts images linked to EN and AR sheets (not chart images from extra sheets).
 *
 * Each sheet (EN and AR) gets its own output file named after the HTML
 * template it belongs to, even when both sheets embed the exact same
 * picture — the two sheets are resolved independently so one language's
 * image is never dropped in favor of the other.
 */
export async function extractImagesFromExcel(
  fileBuffer: ArrayBuffer,
  guideNumber: number
): Promise<ExtractedImage[]> {
  const zip = await JSZip.loadAsync(fileBuffer);
  const images: ExtractedImage[] = [];

  const links = await determineLangMapping(zip);

  // Fallback: if the rels chain found nothing, assume image1=en, image2=ar
  // (or the single image is reused by both sheets).
  if (links.length === 0) {
    const allMedia = Object.keys(zip.files)
      .filter((path) => /^xl\/media\/image\d+\.(png|jpg|jpeg|gif)$/i.test(path))
      .sort();
    if (allMedia[0]) {
      links.push({ lang: 'en', imagePath: allMedia[0] });
      links.push({ lang: 'ar', imagePath: allMedia[1] ?? allMedia[0] });
    }
  }

  for (const { lang, imagePath } of links) {
    const file = zip.files[imagePath];
    if (!file) continue;

    const data = await file.async('uint8array');
    const ext = imagePath.split('.').pop() || 'png';

    // Same base name the HTML generator uses for the template filename
    // (sizeguide_{number}_{lang}.html), so image and template match 1:1.
    const baseName = buildImageBaseName(guideNumber, lang);

    images.push({
      filename: `${baseName}.${ext}`,
      data,
      lang,
      guideNumber,
    });
  }

  return images;
}

/**
 * Follow the rels chain to map EACH matching sheet (EN/AR) to its image.
 * Returns one entry per sheet, in sheet order — not deduped by image path,
 * so a workbook where both sheets embed the same picture still yields two
 * entries (one per language).
 */
async function determineLangMapping(zip: JSZip): Promise<SheetImageLink[]> {
  const links: SheetImageLink[] = [];

  try {
    const workbookXml = await zip.files['xl/workbook.xml']?.async('text');
    if (!workbookXml) return links;

    const sheetMatches = [
      ...workbookXml.matchAll(/name="([^"]+)"[^>]*r:id="([^"]+)"/g),
    ];

    const wbRels = await zip.files['xl/_rels/workbook.xml.rels']?.async('text');
    if (!wbRels) return links;

    for (const [, sheetName, rId] of sheetMatches) {
      const isEn = /\bEN\b/i.test(sheetName);
      const isAr = /\bAR\b/i.test(sheetName);
      if (!isEn && !isAr) continue;

      const lang: 'en' | 'ar' = isAr ? 'ar' : 'en';

      const relMatch = wbRels.match(
        new RegExp(`Id="${rId}"[^>]*Target="([^"]+)"`)
      );
      if (!relMatch) continue;

      const sheetFile = 'xl/' + relMatch[1].replace(/^\//, '');

      const sheetRelsPath =
        sheetFile.replace('worksheets/', 'worksheets/_rels/') + '.rels';
      const sheetRels = await zip.files[sheetRelsPath]?.async('text');
      if (!sheetRels) continue;

      const drawingMatch = sheetRels.match(
        /Type="[^"]*drawing"[^>]*Target="([^"]+)"/
      );
      if (!drawingMatch) continue;

      const drawingFile =
        'xl/drawings/' + drawingMatch[1].replace(/^\.\.\/drawings\//, '');

      const drawingRelsPath =
        drawingFile.replace('drawings/', 'drawings/_rels/') + '.rels';
      const drawingRels = await zip.files[drawingRelsPath]?.async('text');
      if (!drawingRels) continue;

      const imageMatch = drawingRels.match(/Target="([^"]*image[^"]+)"/);
      if (!imageMatch) continue;

      const imagePath =
        'xl/media/' + imageMatch[1].replace(/^\.\.\/media\//, '');

      links.push({ lang, imagePath });
    }
  } catch {
    // Return whatever we have so far
  }

  return links;
}

/**
 * Download all extracted images as a ZIP file.
 */
export async function downloadImagesAsZip(
  allImages: ExtractedImage[]
): Promise<void> {
  const zip = new JSZip();
  for (const img of allImages) {
    zip.file(img.filename, img.data);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(
    blob,
    `sizeguide_images_${new Date().toISOString().slice(0, 10)}.zip`
  );
}
