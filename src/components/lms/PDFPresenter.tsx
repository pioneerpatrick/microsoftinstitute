import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface PDFPresenterProps {
  pdfUrl: string;
  currentPage: number;
  onTotalPages: (total: number) => void;
  onError?: (error: string) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
}

const PDFPresenter = ({ pdfUrl, currentPage, onTotalPages, onError }: PDFPresenterProps) => {
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<any>(null);
  const containerDivRef = useRef<HTMLDivElement>(null);

  // Load PDF document once
  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const pdf = await pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
          disableAutoFetch: true,
        }).promise;

        if (cancelled) { pdf.destroy(); return; }
        pdfRef.current = pdf;
        setTotalPages(pdf.numPages);
        onTotalPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load PDF';
        setError(msg);
        onError?.(msg);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      pdfRef.current?.destroy();
      pdfRef.current = null;
    };
  }, [pdfUrl]);

  // Render current page on-demand
  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || currentPage < 1 || currentPage > totalPages) return;

    let cancelled = false;

    (async () => {
      try {
        // Cancel any in-progress render
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        setPageLoading(true);
        const page = await pdf.getPage(currentPage);
        if (cancelled) { page.cleanup(); return; }

        // Fit to container
        const container = containerDivRef.current;
        const maxW = container ? container.clientWidth : 960;
        const maxH = container ? container.clientHeight : 640;
        const baseVp = page.getViewport({ scale: 1 });
        const scale = Math.min(maxW / baseVp.width, maxH / baseVp.height, 2);
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;

        if (!cancelled) {
          setPageLoading(false);
        }
        page.cleanup();
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException' || cancelled) return;
        console.error('Page render error:', err);
        setPageLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [currentPage, totalPages]);

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
        <p className="text-sm text-muted-foreground">Loading PDF…</p>
      </div>
    );
  }

  return (
    <div ref={containerDivRef} className="w-full h-full flex items-center justify-center relative">
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
        style={{ display: 'block' }}
      />
      {pageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
};

export default PDFPresenter;
