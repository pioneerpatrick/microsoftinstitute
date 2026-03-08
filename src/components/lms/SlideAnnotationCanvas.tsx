import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle,
  Minus,
  Undo2,
  Trash2,
  Download,
  MousePointer,
} from 'lucide-react';

type Tool = 'pointer' | 'pen' | 'highlighter' | 'eraser' | 'rectangle' | 'circle' | 'line';

interface Point { x: number; y: number }

interface DrawingPath {
  tool: Tool;
  color: string;
  width: number;
  points: Point[];
  slideIndex: number;
}

interface SlideAnnotationCanvasProps {
  slideIndex: number;
  isInstructor: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
}

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#000000'];

const SlideAnnotationCanvas = ({ slideIndex, isInstructor, containerRef }: SlideAnnotationCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pointer');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [drawings, setDrawings] = useState<DrawingPath[]>([]);
  const [showToolbar, setShowToolbar] = useState(false);
  const startPoint = useRef<Point | null>(null);

  const slideDrawings = drawings.filter(d => d.slideIndex === slideIndex);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef?.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redraw();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }, []);

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: DrawingPath, w: number, h: number) => {
    if (path.points.length < 1) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (path.tool === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width * 3;
    } else if (path.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = path.width * 4;
    } else {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
    }

    if (path.tool === 'rectangle' && path.points.length >= 2) {
      const p0 = path.points[0];
      const p1 = path.points[path.points.length - 1];
      ctx.strokeRect(p0.x * w, p0.y * h, (p1.x - p0.x) * w, (p1.y - p0.y) * h);
    } else if (path.tool === 'circle' && path.points.length >= 2) {
      const p0 = path.points[0];
      const p1 = path.points[path.points.length - 1];
      const rx = Math.abs(p1.x - p0.x) * w / 2;
      const ry = Math.abs(p1.y - p0.y) * h / 2;
      const cx = (p0.x + p1.x) / 2 * w;
      const cy = (p0.y + p1.y) / 2 * h;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (path.tool === 'line' && path.points.length >= 2) {
      const p0 = path.points[0];
      const p1 = path.points[path.points.length - 1];
      ctx.beginPath();
      ctx.moveTo(p0.x * w, p0.y * h);
      ctx.lineTo(p1.x * w, p1.y * h);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(path.points[0].x * w, path.points[0].y * h);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x * w, path.points[i].y * h);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    slideDrawings.forEach(d => drawPath(ctx, d, w, h));

    // Draw current active path
    if (currentPath.length > 0 && tool !== 'pointer') {
      drawPath(ctx, {
        tool,
        color,
        width: strokeWidth,
        points: currentPath,
        slideIndex,
      }, w, h);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideDrawings, currentPath, tool, color, strokeWidth, slideIndex, drawPath]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'pointer' || !isInstructor) return;
    e.preventDefault();
    const pos = getPos(e);
    setIsDrawing(true);
    setCurrentPath([pos]);
    startPoint.current = pos;
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || tool === 'pointer') return;
    e.preventDefault();
    const pos = getPos(e);

    if (['rectangle', 'circle', 'line'].includes(tool)) {
      // Shape tools: only keep start and current
      setCurrentPath([startPoint.current!, pos]);
    } else {
      setCurrentPath(prev => [...prev, pos]);
    }
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 0 && tool !== 'pointer') {
      setDrawings(prev => [...prev, {
        tool,
        color,
        width: strokeWidth,
        points: [...currentPath],
        slideIndex,
      }]);
    }
    setCurrentPath([]);
    startPoint.current = null;
  };

  const undo = () => {
    setDrawings(prev => {
      const slideOnes = prev.filter(d => d.slideIndex === slideIndex);
      if (slideOnes.length === 0) return prev;
      const lastId = prev.lastIndexOf(slideOnes[slideOnes.length - 1]);
      return prev.filter((_, i) => i !== lastId);
    });
  };

  const clearSlide = () => {
    setDrawings(prev => prev.filter(d => d.slideIndex !== slideIndex));
  };

  const downloadAnnotated = () => {
    const canvas = canvasRef.current;
    const container = containerRef?.current;
    if (!canvas || !container) return;

    // Find the img inside the container
    const img = container.querySelector('img');
    if (!img) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = img.naturalWidth || 1920;
    exportCanvas.height = img.naturalHeight || 1080;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, exportCanvas.width, exportCanvas.height);
    slideDrawings.forEach(d => drawPath(ctx, d, exportCanvas.width, exportCanvas.height));

    const link = document.createElement('a');
    link.download = `slide-${slideIndex + 1}-annotated.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const tools: { id: Tool; icon: typeof Pen; label: string }[] = [
    { id: 'pointer', icon: MousePointer, label: 'Pointer' },
    { id: 'pen', icon: Pen, label: 'Pen' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlighter' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'line', icon: Minus, label: 'Line' },
  ];

  if (!isInstructor) {
    // Students see a transparent non-interactive canvas for viewing annotations
    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    );
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${tool === 'pointer' ? 'pointer-events-none' : 'cursor-crosshair'}`}
        style={{ touchAction: 'none' }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />

      {/* Floating annotation toolbar */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
        {!showToolbar ? (
          <Button
            variant="secondary"
            size="sm"
            className="h-8 text-xs gap-1.5 bg-black/60 hover:bg-black/80 text-white border-0 shadow-lg"
            onClick={() => setShowToolbar(true)}
          >
            <Pen className="h-3 w-3" /> Annotate
          </Button>
        ) : (
          <div className="bg-black/80 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2 shadow-xl border border-white/10">
            {/* Tools */}
            <div className="flex gap-0.5">
              {tools.map(t => (
                <Button
                  key={t.id}
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 rounded-lg ${
                    tool === t.id
                      ? 'bg-white/20 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={() => setTool(t.id)}
                  title={t.label}
                >
                  <t.icon className="h-3.5 w-3.5" />
                </Button>
              ))}
            </div>

            <div className="w-px h-6 bg-white/20" />

            {/* Colors */}
            <div className="flex gap-0.5">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    color === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>

            <div className="w-px h-6 bg-white/20" />

            {/* Stroke width */}
            <div className="w-20">
              <Slider
                value={[strokeWidth]}
                onValueChange={([v]) => setStrokeWidth(v)}
                min={1}
                max={10}
                step={1}
                className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
              />
            </div>

            <div className="w-px h-6 bg-white/20" />

            {/* Actions */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              onClick={undo}
              title="Undo"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              onClick={clearSlide}
              title="Clear slide"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              onClick={downloadAnnotated}
              title="Download annotated"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>

            <div className="w-px h-6 bg-white/20" />

            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-white/60 hover:text-white hover:bg-white/10 px-2"
              onClick={() => {
                setShowToolbar(false);
                setTool('pointer');
              }}
            >
              Done
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default SlideAnnotationCanvas;
