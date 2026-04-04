import { useRef, useState, useEffect, useCallback } from "react";

export interface DrawnRect {
  x: number;
  y: number;
  width: number;
  height: number; // all percentage 0-1
}

interface RoomPhotoCanvasProps {
  imageUrl: string;
  onRectDrawn: (rect: DrawnRect | null) => void;
  drawnRect: DrawnRect | null;
}

export function RoomPhotoCanvas({
  imageUrl,
  onRectDrawn,
  drawnRect,
}: RoomPhotoCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset loaded state when URL changes
  useEffect(() => {
    setImageLoaded(false);
  }, [imageUrl]);

  const getRelativePos = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      return { x, y };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const pos = getRelativePos(e.clientX, e.clientY);
      if (!pos) return;
      setDrawing(true);
      setStartPoint(pos);
      setCurrentPoint(pos);
      onRectDrawn(null); // clear previous
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getRelativePos, onRectDrawn]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drawing) return;
      const pos = getRelativePos(e.clientX, e.clientY);
      if (pos) setCurrentPoint(pos);
    },
    [drawing, getRelativePos]
  );

  const handlePointerUp = useCallback(() => {
    if (!drawing || !startPoint || !currentPoint) {
      setDrawing(false);
      return;
    }
    setDrawing(false);

    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    // Ignore tiny accidental clicks
    if (width < 0.02 || height < 0.02) return;

    onRectDrawn({ x, y, width, height });
  }, [drawing, startPoint, currentPoint, onRectDrawn]);

  // Compute the visible rect (either in-progress or final)
  const visibleRect: DrawnRect | null =
    drawing && startPoint && currentPoint
      ? {
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y),
        }
      : drawnRect;

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden select-none touch-none cursor-crosshair"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        src={imageUrl}
        alt="Room photo"
        className="w-full block rounded-xl"
        draggable={false}
        onLoad={() => setImageLoaded(true)}
      />

      {/* Overlay rect */}
      {imageLoaded && visibleRect && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${visibleRect.x * 100}%`,
            top: `${visibleRect.y * 100}%`,
            width: `${visibleRect.width * 100}%`,
            height: `${visibleRect.height * 100}%`,
            border: "2px dashed #C96A3D",
            backgroundColor: "rgba(201, 106, 61, 0.15)",
            borderRadius: "4px",
          }}
        />
      )}

      {/* Hint overlay when no rect is drawn */}
      {imageLoaded && !visibleRect && !drawing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none rounded-xl">
          <span className="text-white text-xs font-medium bg-black/40 px-3 py-1.5 rounded-lg">
            Click and drag to mark placement area
          </span>
        </div>
      )}
    </div>
  );
}
