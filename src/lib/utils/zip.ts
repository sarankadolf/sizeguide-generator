import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { GeneratedFile } from '../../types';

export async function downloadAsZip(files: GeneratedFile[]): Promise<void> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.filename, file.content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `sizeguides_${new Date().toISOString().slice(0, 10)}.zip`);
}

export function downloadSingleFile(file: GeneratedFile): void {
  const blob = new Blob([file.content], { type: 'text/html;charset=utf-8' });
  saveAs(blob, file.filename);
}
