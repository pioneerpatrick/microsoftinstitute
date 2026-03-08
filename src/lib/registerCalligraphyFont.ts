import { jsPDF } from 'jspdf';

let fontRegistered = false;
let fontLoaded = false;

export const registerCalligraphyFont = async (doc: jsPDF) => {
  if (!fontLoaded) {
    try {
      const response = await fetch('/fonts/GreatVibes-Regular.ttf');
      const buffer = await response.arrayBuffer();
      const binary = Array.from(new Uint8Array(buffer))
        .map((b) => String.fromCharCode(b))
        .join('');
      const base64 = btoa(binary);

      // Register font globally in jsPDF's virtual file system
      doc.addFileToVFS('GreatVibes-Regular.ttf', base64);
      doc.addFont('GreatVibes-Regular.ttf', 'GreatVibes', 'normal');
      fontLoaded = true;
    } catch (err) {
      console.warn('Failed to load calligraphy font, falling back to default', err);
    }
  } else {
    // Re-register for this doc instance
    doc.addFileToVFS('GreatVibes-Regular.ttf', '');
    doc.addFont('GreatVibes-Regular.ttf', 'GreatVibes', 'normal');
  }
};

export const setCalligraphyFont = (doc: jsPDF) => {
  try {
    doc.setFont('GreatVibes', 'normal');
  } catch {
    doc.setFont('helvetica', 'bolditalic');
  }
};
