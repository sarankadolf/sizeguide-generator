import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { buildImageBaseName } from '../utils/sanitize';

export interface ExtractedImage {
  filename: string;
  data: Uint8Array;
  lang: 'en' | 'ar';
  guideNumber: number;
}

/**
 * Extract embedded images from an Excel file's zip structure.
 * Only extracts images linked to EN and AR sheets (not chart images from extra sheets).
 */
export async function extractImagesFromExcel(
  fileBuffer: ArrayBuffer,
  fileName: string,
  guideNumber: number
): Promise<ExtractedImage[]> {
  const zip = await JSZip.loadAsync(fileBuffer);
  const images: ExtractedImage[] = [];

  const langMap = await determineLangMapping(zip);

  // Fallback: if rels chain found nothing, try image1=en, image2=ar
  if (langMap.size === 0) {
    const allMedia = Object.keys(zip.files)
      .filter((path) => /^xl\/media\/image\d+\.(png|jpg|jpeg|gif)$/i.test(path))
      .sort();
    if (allMedia[0]) langMap.set(allMedia[0], 'en');
    if (allMedia[1]) langMap.set(allMedia[1], 'ar');
  }

  // Extract ONLY the images that are in the langMap
  for (const [imgPath, lang] of langMap.entries()) {
    const file = zip.files[imgPath];
    if (!file) continue;

    const data = await file.async('uint8array');
    const ext = imgPath.split('.').pop() || 'png';

    // Use the SAME naming function that the HTML generator uses for image URLs
    const baseName = buildImageBaseName(guideNumber, fileName, lang);

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
 * Follow the rels chain to map images to their language.
 * Only sheets whose names match \bEN\b or \bAR\b are included.
 */
async function determineLangMapping(
  zip: JSZip
): Promise<Map<string, 'en' | 'ar'>> {
  const langMap = new Map<string, 'en' | 'ar'>();

  try {
    const workbookXml = await zip.files['xl/workbook.xml']?.async('text');
    if (!workbookXml) return langMap;

    const sheetMatches = [
      ...workbookXml.matchAll(/name="([^"]+)"[^>]*r:id="([^"]+)"/g),
    ];

    const wbRels = await zip.files['xl/_rels/workbook.xml.rels']?.async('text');
    if (!wbRels) return langMap;

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

      langMap.set(imagePath, lang);
    }
  } catch {
    // Return whatever we have so far
  }

  return langMap;
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
