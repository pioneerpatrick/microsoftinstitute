import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';

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
  const hasStarted = useRef(false);
  const onPagesExtractedRef = useRef(onPagesExtracted);
  const onErrorRef = useRef(onError);
  const blobUrls = useRef<string[]>([]);

  onPagesExtractedRef.current = onPagesExtracted;
  onErrorRef.current = onError;

  useEffect(() => {
    return () => {
      blobUrls.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!pdfUrl || hasStarted.current) return;
    hasStarted.current = true;

    const renderPage = async (
      pdf: pdfjsLib.PDFDocumentProxy,
      pageNum: number,
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D,
      scale: number
    ): Promise<string> => {
      const page = await pdf.getPage(pageNum);
      const vp = page.getViewport({ scale });
      canvas.width = vp.width;
      canvas.height = vp.height;
      ctx.clearRect(0, 0, vp.width, vp.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/jpeg', 0.65)
      );
      const url = URL.createObjectURL(blob);
      blobUrls.current.push(url);
      page.cleanup();
      return url;
    };

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        const pdf = await pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
          disableAutoFetch: true,
          disableStream: false,
        }).promise;

        const numPages = pdf.numPages;
        // Aggressive low scale for speed — 0.6 for large decks, max 1.0
        const scale = numPages > 20 ? 0.6 : numPages > 10 ? 0.75 : 1.0;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (!ctx) throw new Error('Canvas context failed');

        const pages: string[] = [];

        // Render page 1 immediately and show it
        pages.push(await renderPage(pdf, 1, canvas, ctx, scale));
        setProgress(Math.round((1 / numPages) * 100));
        onPagesExtractedRef.current([...pages]);
        setLoading(false);

        // Render rest in background, yielding every page
        for (let i = 2; i <= numPages; i++) {
          pages.push(await renderPage(pdf, i, canvas, ctx, scale));
          setProgress(Math.round((i / numPages) * 100));
          onPagesExtractedRef.current([...pages]);
          // Yield to main thread every 2 pages
          if (i % 2 === 0) await new Promise(r => setTimeout(r, 0));
        }
      } catch (err) {
        console.error('PDF load error:', err);
        const msg = err instanceof Error ? err.message : 'Failed to load PDF';
        setError(msg);
        onErrorRef.current?.(msg);
        setLoading(false);
      }
    })();
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
        <p className="text-sm text-muted-foreground">Loading first page…</p>
        <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  return null;
};

export default PDFPresenter;
