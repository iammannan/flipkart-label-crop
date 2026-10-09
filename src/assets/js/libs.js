// Lazy-loads the PDF libraries only when a user actually drops a file.
// jsDelivr CDN first (keeps bandwidth near zero), self-hosted /vendor copy as fallback.
const PDFJS_V = '4.10.38';
const PDFLIB_V = '1.17.1';
const CDN = 'https://cdn.jsdelivr.net/npm/';

const SOURCES = {
  pdfjs: [
    { base: `${CDN}pdfjs-dist@${PDFJS_V}/`, entry: 'legacy/build/pdf.min.mjs', worker: 'legacy/build/pdf.worker.min.mjs' },
    { base: new URL('../../../vendor/pdfjs/', import.meta.url).href, entry: 'pdf.min.mjs', worker: 'pdf.worker.min.mjs' },
  ],
  pdflib: [
    `${CDN}pdf-lib@${PDFLIB_V}/dist/pdf-lib.esm.min.js`,
    new URL('../../../vendor/pdf-lib/pdf-lib.esm.min.js', import.meta.url).href,
  ],
};

let pdfjsPromise;
let pdflibPromise;

export function loadPdfjs() {
  pdfjsPromise ||= (async () => {
    let lastErr;
    for (const src of SOURCES.pdfjs) {
      try {
        const lib = await import(/* @vite-ignore */ src.base + src.entry);
        lib.GlobalWorkerOptions.workerSrc = src.base + src.worker;
        return {
          lib,
          docOptions: {
            standardFontDataUrl: src.base + 'standard_fonts/',
            cMapUrl: src.base + 'cmaps/',
            cMapPacked: true,
            isEvalSupported: false,
          },
        };
      } catch (e) { lastErr = e; }
    }
    pdfjsPromise = null;
    throw lastErr;
  })();
  return pdfjsPromise;
}

export function loadPdfLib() {
  pdflibPromise ||= (async () => {
    let lastErr;
    for (const url of SOURCES.pdflib) {
      try { return await import(/* @vite-ignore */ url); } catch (e) { lastErr = e; }
    }
    pdflibPromise = null;
    throw lastErr;
  })();
  return pdflibPromise;
}

/** Warm the libraries in the background (e.g. when the pointer approaches the drop zone). */
export function preloadLibs() {
  loadPdfjs().catch(() => {});
  loadPdfLib().catch(() => {});
}
