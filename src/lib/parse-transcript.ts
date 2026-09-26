import { extractText, getDocumentProxy } from "unpdf";

// Thin wrapper so the rest of the app depends on "PDF bytes in, text out,"
// not the parsing library's own shape. Assumes a genuine ANU-generated
// Statement of Result — a text PDF with a real selectable text layer, not a
// scanned image, so no OCR step is needed or attempted.
//
// unpdf, not pdf-parse: pdf-parse's bundled pdf.js build throws "bad XRef
// entry" on a perfectly valid PDF when loaded via a real ESM entry point
// (Astro's built server is always `.mjs`) — reproducible even via
// `createRequire`, so it's inherent to that old bundle, not a bundler
// artefact. unpdf is built for exactly this (serverless/edge/ESM) runtime
// shape and parses the same bytes correctly.
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
