import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  PenTool,
  Eraser,
  Type,
  Circle,
  Square,
  ArrowRight,
  Trash2,
  Palette,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MousePointer,
  Highlighter,
  Image,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface PresentationModeProps {
  slides: string[];
  isInstructor: boolean;
  onClose: () => void;
  onSlideChange?: (index: number) => void;
  currentSlideIndex?: number;
}

type DrawingTool = 'pointer' | 'pen' | 'highlighter' | 'eraser' | 'text' | 'arrow' | 'circle' | 'rectangle';

interface DrawingPath {
  id: string;
  tool: DrawingTool;
  color: string;
  strokeWidth: number;
  points: { x: number; y: number }[];
  slideIndex: number;
}

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#000000', '#ffffff'
];

const PresentationMode = ({
  slides,
  isInstructor,
  onClose,
  onSlideChange,
  currentSlideIndex: externalSlideIndex,
}: PresentationModeProps) => {
  const [currentSlide, setCurrentSlide] = useState(externalSlideIndex || 0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tool, setTool] = useState<DrawingTool>('pointer');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [drawings, setDrawings] = useState<DrawingPath[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [zoom, setZoom] = useState(100);
  const [showToolbar, setShowToolbar] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Sync with external slide index
  useEffect(() => {
    if (externalSlideIndex !== undefined) {
      setCurrentSlide(externalSlideIndex);
    }
  }, [externalSlideIndex]);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all paths for current slide
    const slideDrawings = drawings.filter(d => d.slideIndex === currentSlide);
    
    slideDrawings.forEach(path => {
      if (path.points.length < 2) return;
      
      ctx.beginPath();
      ctx.strokeStyle = path.tool === 'highlighter' 
        ? `${path.color}66` 
        : path.color;
      ctx.lineWidth = path.tool === 'highlighter' 
        ? path.strokeWidth * 4 
        : path.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (path.tool === 'pen' || path.tool === 'highlighter') {
        ctx.moveTo(path.points[0].x, path.points[0].y);
        path.points.slice(1).forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      } else if (path.tool === 'arrow') {
        const start = path.points[0];
        const end = path.points[path.points.length - 1];
        
        // Draw line
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        
        // Draw arrowhead
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = 15;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (path.tool === 'circle') {
        const start = path.points[0];
        const end = path.points[path.points.length - 1];
        const rx = Math.abs(end.x - start.x) / 2;
        const ry = Math.abs(end.y - start.y) / 2;
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (path.tool === 'rectangle') {
        const start = path.points[0];
        const end = path.points[path.points.length - 1];
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      }
    });

    // Draw current path if drawing
    if (currentPath && currentPath.points.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = currentPath.tool === 'highlighter' 
        ? `${currentPath.color}66` 
        : currentPath.color;
      ctx.lineWidth = currentPath.tool === 'highlighter' 
        ? currentPath.strokeWidth * 4 
        : currentPath.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(currentPath.points[0].x, currentPath.points[0].y);
      currentPath.points.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
  }, [drawings, currentSlide, currentPath]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getPointerPosition = (e: React.PointerEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isInstructor || tool === 'pointer') return;
    
    e.preventDefault();
    setIsDrawing(true);
    
    const pos = getPointerPosition(e);
    
    if (tool === 'eraser') {
      // Remove any drawing near this point
      setDrawings(prev => prev.filter(d => {
        if (d.slideIndex !== currentSlide) return true;
        return !d.points.some(p => 
          Math.abs(p.x - pos.x) < 20 && Math.abs(p.y - pos.y) < 20
        );
      }));
    } else {
      setCurrentPath({
        id: Date.now().toString(),
        tool,
        color,
        strokeWidth,
        points: [pos],
        slideIndex: currentSlide
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !isInstructor || tool === 'pointer' || tool === 'eraser') return;
    
    const pos = getPointerPosition(e);
    
    setCurrentPath(prev => {
      if (!prev) return null;
      
      // For shapes, only keep start and end points
      if (tool === 'arrow' || tool === 'circle' || tool === 'rectangle') {
        return {
          ...prev,
          points: [prev.points[0], pos]
        };
      }
      
      return {
        ...prev,
        points: [...prev.points, pos]
      };
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    if (currentPath && currentPath.points.length > 1) {
      setDrawings(prev => [...prev, currentPath]);
    }
    setCurrentPath(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isInstructor || tool === 'pointer') return;
    e.preventDefault();
    
    const pos = getPointerPosition(e);
    setIsDrawing(true);
    
    if (tool === 'eraser') {
      setDrawings(prev => prev.filter(d => {
        if (d.slideIndex !== currentSlide) return true;
        return !d.points.some(p => 
          Math.abs(p.x - pos.x) < 20 && Math.abs(p.y - pos.y) < 20
        );
      }));
    } else {
      setCurrentPath({
        id: Date.now().toString(),
        tool,
        color,
        strokeWidth,
        points: [pos],
        slideIndex: currentSlide
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing || !isInstructor || tool === 'pointer' || tool === 'eraser') return;
    e.preventDefault();
    
    const pos = getPointerPosition(e);
    
    setCurrentPath(prev => {
      if (!prev) return null;
      if (tool === 'arrow' || tool === 'circle' || tool === 'rectangle') {
        return { ...prev, points: [prev.points[0], pos] };
      }
      return { ...prev, points: [...prev.points, pos] };
    });
  };

  const handleTouchEnd = () => {
    handlePointerUp();
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
      onSlideChange?.(index);
    }
  };

  const nextSlide = () => goToSlide(currentSlide + 1);
  const prevSlide = () => goToSlide(currentSlide - 1);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const clearAnnotations = () => {
    setDrawings(prev => prev.filter(d => d.slideIndex !== currentSlide));
  };

  const clearAllAnnotations = () => {
    setDrawings([]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      } else if (e.key === 'f') {
        toggleFullscreen();
      } else if (e.key === 't') {
        setShowToolbar(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, isFullscreen]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const tools: { id: DrawingTool; icon: React.ReactNode; label: string }[] = [
    { id: 'pointer', icon: <MousePointer className="h-4 w-4" />, label: 'Pointer' },
    { id: 'pen', icon: <PenTool className="h-4 w-4" />, label: 'Pen' },
    { id: 'highlighter', icon: <Highlighter className="h-4 w-4" />, label: 'Highlighter' },
    { id: 'arrow', icon: <ArrowRight className="h-4 w-4" />, label: 'Arrow' },
    { id: 'circle', icon: <Circle className="h-4 w-4" />, label: 'Circle' },
    { id: 'rectangle', icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
    { id: 'eraser', icon: <Eraser className="h-4 w-4" />, label: 'Eraser' },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Top Toolbar */}
      {showToolbar && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
            <Badge className="bg-white/20 text-white border-0">
              {currentSlide + 1} / {slides.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setZoom(prev => Math.max(50, prev - 25))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-white text-sm w-12 text-center">{zoom}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setZoom(prev => Math.min(200, prev + 25))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {/* Slide Image */}
        <div
          className="relative"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          {slides[currentSlide] ? (
            <img
              ref={imageRef}
              src={slides[currentSlide]}
              alt={`Slide ${currentSlide + 1}`}
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              draggable={false}
            />
          ) : (
            <div className="w-[80vw] h-[60vh] bg-gray-800 rounded-lg flex items-center justify-center">
              <Image className="h-16 w-16 text-gray-600" />
            </div>
          )}
          
          {/* Drawing Canvas Overlay */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ 
              cursor: tool === 'pointer' ? 'default' : 'crosshair',
              touchAction: 'none'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        {/* Navigation Arrows */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 text-white hover:bg-white/20 h-12 w-12 rounded-full"
          onClick={prevSlide}
          disabled={currentSlide === 0}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 text-white hover:bg-white/20 h-12 w-12 rounded-full"
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      </div>

      {/* Bottom Toolbar - Annotation Tools (Instructor Only) */}
      {showToolbar && isInstructor && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {/* Tool Selection */}
            <div className="flex items-center bg-white/10 rounded-full p-1 gap-1">
              {tools.map(t => (
                <Button
                  key={t.id}
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 rounded-full ${
                    tool === t.id 
                      ? 'bg-white text-black' 
                      : 'text-white hover:bg-white/20'
                  }`}
                  onClick={() => setTool(t.id)}
                  title={t.label}
                >
                  {t.icon}
                </Button>
              ))}
            </div>

            {/* Color Picker */}
            {tool !== 'pointer' && tool !== 'eraser' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-white hover:bg-white/20"
                  >
                    <div
                      className="h-5 w-5 rounded-full border-2 border-white"
                      style={{ backgroundColor: color }}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" side="top">
                  <div className="grid grid-cols-5 gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        className={`h-8 w-8 rounded-full border-2 ${
                          color === c ? 'border-primary' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Stroke Width */}
            {tool !== 'pointer' && tool !== 'eraser' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-white hover:bg-white/20"
                  >
                    <div className="flex items-center justify-center">
                      <div 
                        className="rounded-full bg-white"
                        style={{ width: strokeWidth * 2, height: strokeWidth * 2 }}
                      />
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-3" side="top">
                  <Slider
                    value={[strokeWidth]}
                    onValueChange={([v]) => setStrokeWidth(v)}
                    min={1}
                    max={10}
                    step={1}
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Clear Actions */}
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-white hover:bg-white/20"
                onClick={clearAnnotations}
                title="Clear slide annotations"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-white hover:bg-red-500/50"
                onClick={clearAllAnnotations}
                title="Clear all annotations"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Slide Thumbnails */}
          <div className="flex items-center justify-center gap-2 mt-3 overflow-x-auto pb-2">
            {slides.map((slide, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`flex-shrink-0 h-12 w-20 rounded-md overflow-hidden border-2 transition-all ${
                  currentSlide === index 
                    ? 'border-white scale-110' 
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={slide}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Touch hint for mobile */}
      {!showToolbar && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Button
            variant="ghost"
            className="text-white/50 hover:text-white text-xs"
            onClick={() => setShowToolbar(true)}
          >
            Tap to show controls
          </Button>
        </div>
      )}
    </div>
  );
};

export default PresentationMode;
