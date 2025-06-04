import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

// ตั้งค่า worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

async function loadPDF(url: string): Promise<PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument(url);
  const pdf: PDFDocumentProxy = await loadingTask.promise;
  return pdf;
}
export { loadPDF };
