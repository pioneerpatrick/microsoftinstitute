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

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);
        setStatusText('Loading PDF...');

        console.log('Loading PDF from:', pdfUrl);
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        console.log(`PDF loaded: ${numPages} pages`);
        setStatusText(`Converting ${numPages} pages...`);

        const pages: string[] = [];
        
        // Use a single reusable canvas for memory efficiency
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Could not create canvas context');
        }

        // Use scale 1.5 for good quality without being too heavy
        // For very large page counts, reduce further
        const scale = numPages > 20 ? 1 : 1.5;

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          // Clear canvas before rendering
          context.clearRect(0, 0, canvas.width, canvas.height);

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          // Use JPEG for faster encoding and smaller data URLs
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          pages.push(dataUrl);
          
          // Clean up page resources
          page.cleanup();
          
          const pct = Math.round((i / numPages) * 100);
          setProgress(pct);
          setStatusText(`Converting page ${i} of ${numPages}...`);
        }

        onPagesExtractedRef.current(pages);
        setLoading(false);
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
