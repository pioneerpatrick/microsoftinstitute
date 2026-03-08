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
  const [statusText, setStatusText] = useState('Loading PDF...');
  const hasStarted = useRef(false);
  const onPagesExtractedRef = useRef(onPagesExtracted);
  const onErrorRef = useRef(onError);

  // Keep refs up to date
  onPagesExtractedRef.current = onPagesExtracted;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!pdfUrl || hasStarted.current) return;
    hasStarted.current = true;

    const INITIAL_BATCH = 3;

    const renderPage = async (pdf: any, pageNum: number, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, scale: number) => {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      context.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      page.cleanup();
      return dataUrl;
    };

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);
        setStatusText('Loading PDF...');

        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        const scale = numPages > 20 ? 1 : 1.5;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create canvas context');

        // Render first batch immediately
        const initialCount = Math.min(INITIAL_BATCH, numPages);
        const pages: string[] = [];
        for (let i = 1; i <= initialCount; i++) {
          setStatusText(`Loading page ${i}...`);
          pages.push(await renderPage(pdf, i, canvas, context, scale));
          setProgress(Math.round((i / numPages) * 100));
        }

        // Send initial pages right away so presentation can start
        onPagesExtractedRef.current([...pages]);
        setLoading(false);

        // Load remaining pages in background
        if (numPages > initialCount) {
          for (let i = initialCount + 1; i <= numPages; i++) {
            pages.push(await renderPage(pdf, i, canvas, context, scale));
            // Update with all pages so far
            onPagesExtractedRef.current([...pages]);
            // Yield to main thread every few pages
            if (i % 3 === 0) await new Promise(r => setTimeout(r, 0));
          }
        }
      } catch (err) {
        console.error('PDF load error:', err);
        const message = err instanceof Error ? err.message : 'Failed to load PDF';
        setError(message);
        onErrorRef.current?.(message);
        setLoading(false);
      }
    };

    loadPDF();
  }, [pdfUrl]);

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
        <p className="text-sm text-muted-foreground">{statusText}</p>
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
