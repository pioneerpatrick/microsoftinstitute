import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFPresenterProps {
  pdfUrl: string;
  onPagesExtracted: (pages: string[]) => void;
  onError?: (error: string) => void;
}

const PDFPresenter = ({ pdfUrl, onPagesExtracted, onError }: PDFPresenterProps) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        const pages: string[] = [];

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const scale = 2; // Higher scale for better quality
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          const dataUrl = canvas.toDataURL('image/png');
          pages.push(dataUrl);
          setProgress(Math.round((i / numPages) * 100));
        }

        onPagesExtracted(pages);
        setLoading(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load PDF';
        setError(message);
        onError?.(message);
        setLoading(false);
      }
    };

    if (pdfUrl) {
      loadPDF();
    }
  }, [pdfUrl, onPagesExtracted, onError]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-destructive mb-2">Failed to load PDF</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Converting PDF to presentation...</p>
        <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{progress}%</p>
      </div>
    );
  }

  return null;
};

export default PDFPresenter;
