import { jsPDF } from 'jspdf';

let cachedBase64: string | null = null;

export const registerCalligraphyFont = async (doc: jsPDF) => {
  try {
    if (!cachedBase64) {
      const response = await fetch('/fonts/EdwardianScriptITC.ttf');
      const buffer = await response.arrayBuffer();
      const binary = Array.from(new Uint8Array(buffer))
        .map((b) => String.fromCharCode(b))
        .join('');
      cachedBase64 = btoa(binary);
    }
    doc.addFileToVFS('EdwardianScriptITC.ttf', cachedBase64);
    doc.addFont('EdwardianScriptITC.ttf', 'EdwardianScript', 'normal');
    // Register same font as bold (single-weight font)
    doc.addFont('EdwardianScriptITC.ttf', 'EdwardianScript', 'bold');
  } catch (err) {
    console.warn('Failed to load calligraphy font, falling back to default', err);
  }
};

export const setCalligraphyFont = (doc: jsPDF) => {
  try {
    doc.setFont('EdwardianScript', 'bold');
  } catch {
    doc.setFont('helvetica', 'bolditalic');
  }
};

/** Converts a name to Sentence Case (e.g. "JOHN DOE" → "John Doe") */
export const toSentenceCase = (name: string): string => {
  return name
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
