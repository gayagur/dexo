import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";

export type MaskTool = "brush" | "erase" | "reset";

interface MaskCanvasProps {
  /** URL of the image to overlay the mask on */
  imageUrl: string;
  /** Callback when mask changes (for validation UI) */
  onMaskChange?: (hasContent: boolean, whiteRatio: number) => void;
}

export interface MaskBoundingBox {
  /** Normalized coordinates (0-1) of the white region bounding box */
  top: number;
  left: number;
  bottom: number;
  right: number;
  /** Center of mass (0-1) */
  centerX: number;
  centerY: number;
}

export interface MaskCanvasHandle {
  /** Export the mask as a PNG Blob at natural image resolution */
  exportMask: () => Promise<Blob | null>;
  /** Get mask dimensions (should match image natural dims) */
  getDimensions: () => { width: number; height: number } | null;
  /** Get white pixel ratio (0-1) */
  getWhiteRatio: () => number;
  /** Get bounding box of white (selected) pixels, normalized 0-1 */
  getMaskBoundingBox: () => MaskBoundingBox | null;
  /** Set the active tool */
  setTool: (tool: MaskTool) => void;
  /** Set brush size (px in natural space) */
  setBrushSize: (size: number) => void;
  /** Reset the mask to all black */
  resetMask: () => void;
}

/**
 * Canvas overlay for painting masks on images.
 * The mask canvas operates at the image's natural pixel resolution
 * to ensure exact dimension matching for AI inpainting.
 */
export const MaskCanvas = forwardRef<MaskCanvasHandle, MaskCanvasProps>(
  function MaskCanvas({ imageUrl, onMaskChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const displayCanvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    const [naturalWidth, setNaturalWidth] = useState(0);
    const [naturalHeight, setNaturalHeight] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [drawing, setDrawing] = useState(false);

    // Tool state
    const toolRef = useRef<MaskTool>("brush");
    const brushSizeRef = useRef(40); // px in natural space

    // Load image and set up canvases
    useEffect(() => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageRef.current = img;
        setNaturalWidth(img.naturalWidth);
        setNaturalHeight(img.naturalHeight);

        // Set up the offscreen mask canvas at natural resolution
        const maskCanvas = maskCanvasRef.current;
        if (maskCanvas) {
          maskCanvas.width = img.naturalWidth;
          maskCanvas.height = img.naturalHeight;
          const ctx = maskCanvas.getContext("2d");
          if (ctx) {
            // Start with all black (protected)
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
          }
        }

        setLoaded(true);
        redrawDisplay();
      };
      img.onerror = () => {
        console.error("[MaskCanvas] Failed to load image:", imageUrl);
      };
      img.src = imageUrl;

      return () => {
        img.onload = null;
        img.onerror = null;
      };
    }, [imageUrl]);

    // Redraw the visible display canvas
    const redrawDisplay = useCallback(() => {
      const displayCanvas = displayCanvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      const img = imageRef.current;
      if (!displayCanvas || !maskCanvas || !img) return;

      const ctx = displayCanvas.getContext("2d");
      if (!ctx) return;

      // Size display canvas to container
      const container = containerRef.current;
      if (!container) return;
      const displayWidth = container.clientWidth;
      const displayHeight = (img.naturalHeight / img.naturalWidth) * displayWidth;
      displayCanvas.width = displayWidth;
      displayCanvas.height = displayHeight;

      // Draw image
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      // Draw mask overlay (semi-transparent red for white regions)
      const maskCtx = maskCanvas.getContext("2d");
      if (!maskCtx) return;
      const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

      // Create overlay
      const overlayCanvas = document.createElement("canvas");
      overlayCanvas.width = maskCanvas.width;
      overlayCanvas.height = maskCanvas.height;
      const overlayCtx = overlayCanvas.getContext("2d");
      if (!overlayCtx) return;

      const overlayData = overlayCtx.createImageData(maskCanvas.width, maskCanvas.height);
      for (let i = 0; i < maskData.data.length; i += 4) {
        const isWhite = maskData.data[i] > 128;
        if (isWhite) {
          overlayData.data[i] = 255;     // R
          overlayData.data[i + 1] = 100; // G
          overlayData.data[i + 2] = 50;  // B
          overlayData.data[i + 3] = 100; // A — semi-transparent
        } else {
          overlayData.data[i + 3] = 0; // fully transparent
        }
      }
      overlayCtx.putImageData(overlayData, 0, 0);

      // Draw overlay scaled to display
      ctx.drawImage(overlayCanvas, 0, 0, displayWidth, displayHeight);
    }, []);

    // Map display coordinates to natural pixel space
    const displayToNatural = useCallback(
      (displayX: number, displayY: number): { x: number; y: number } => {
        const displayCanvas = displayCanvasRef.current;
        if (!displayCanvas || !naturalWidth || !naturalHeight) {
          return { x: 0, y: 0 };
        }
        const scaleX = naturalWidth / displayCanvas.width;
        const scaleY = naturalHeight / displayCanvas.height;
        return {
          x: displayX * scaleX,
          y: displayY * scaleY,
        };
      },
      [naturalWidth, naturalHeight]
    );

    // Paint on the mask canvas at natural resolution
    const paintAt = useCallback(
      (natX: number, natY: number) => {
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return;
        const ctx = maskCanvas.getContext("2d");
        if (!ctx) return;

        const tool = toolRef.current;
        const size = brushSizeRef.current;

        ctx.beginPath();
        ctx.arc(natX, natY, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = tool === "brush" ? "#ffffff" : "#000000";
        ctx.fill();

        redrawDisplay();
        notifyMaskChange();
      },
      [redrawDisplay]
    );

    const notifyMaskChange = useCallback(() => {
      if (!onMaskChange) return;
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;
      const ctx = maskCanvas.getContext("2d");
      if (!ctx) return;

      const data = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      let whitePixels = 0;
      const total = data.data.length / 4;
      for (let i = 0; i < data.data.length; i += 4) {
        if (data.data[i] > 128) whitePixels++;
      }
      const ratio = whitePixels / total;
      onMaskChange(ratio > 0.001, ratio);
    }, [onMaskChange]);

    // Mouse/touch handlers
    const getCanvasPos = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = displayCanvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        return {
          x: clientX - rect.left,
          y: clientY - rect.top,
        };
      },
      []
    );

    const handlePointerDown = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setDrawing(true);
        const pos = getCanvasPos(e);
        if (pos) {
          const nat = displayToNatural(pos.x, pos.y);
          paintAt(nat.x, nat.y);
        }
      },
      [getCanvasPos, displayToNatural, paintAt]
    );

    const handlePointerMove = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawing) return;
        e.preventDefault();
        const pos = getCanvasPos(e);
        if (pos) {
          const nat = displayToNatural(pos.x, pos.y);
          paintAt(nat.x, nat.y);
        }
      },
      [drawing, getCanvasPos, displayToNatural, paintAt]
    );

    const handlePointerUp = useCallback(() => {
      setDrawing(false);
    }, []);

    // Imperative handle for parent
    useImperativeHandle(ref, () => ({
      exportMask: async () => {
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return null;
        return new Promise<Blob | null>((resolve) => {
          maskCanvas.toBlob((blob) => resolve(blob), "image/png");
        });
      },

      getDimensions: () => {
        if (!naturalWidth || !naturalHeight) return null;
        return { width: naturalWidth, height: naturalHeight };
      },

      getWhiteRatio: () => {
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return 0;
        const ctx = maskCanvas.getContext("2d");
        if (!ctx) return 0;
        const data = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        let whitePixels = 0;
        const total = data.data.length / 4;
        for (let i = 0; i < data.data.length; i += 4) {
          if (data.data[i] > 128) whitePixels++;
        }
        return whitePixels / total;
      },

      getMaskBoundingBox: () => {
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas || !maskCanvas.width || !maskCanvas.height) return null;
        const ctx = maskCanvas.getContext("2d");
        if (!ctx) return null;

        const w = maskCanvas.width;
        const h = maskCanvas.height;
        const data = ctx.getImageData(0, 0, w, h).data;

        let minX = w, minY = h, maxX = 0, maxY = 0;
        let sumX = 0, sumY = 0, count = 0;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (data[i] > 128) { // white pixel
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              sumX += x;
              sumY += y;
              count++;
            }
          }
        }

        if (count === 0) return null;

        return {
          top: minY / h,
          left: minX / w,
          bottom: maxY / h,
          right: maxX / w,
          centerX: (sumX / count) / w,
          centerY: (sumY / count) / h,
        };
      },

      setTool: (tool: MaskTool) => {
        toolRef.current = tool;
      },

      setBrushSize: (size: number) => {
        brushSizeRef.current = size;
      },

      resetMask: () => {
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return;
        const ctx = maskCanvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        redrawDisplay();
        onMaskChange?.(false, 0);
      },
    }));

    // Recalculate display on resize
    useEffect(() => {
      if (!loaded) return;
      const observer = new ResizeObserver(() => redrawDisplay());
      if (containerRef.current) observer.observe(containerRef.current);
      return () => observer.disconnect();
    }, [loaded, redrawDisplay]);

    return (
      <div ref={containerRef} className="relative w-full select-none touch-none">
        {/* Hidden mask canvas at natural resolution */}
        <canvas ref={maskCanvasRef} className="hidden" />

        {/* Visible display canvas */}
        <canvas
          ref={displayCanvasRef}
          className="w-full rounded-xl cursor-crosshair"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />

        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-xl">
            <span className="text-sm text-[#4A5568]">Loading image...</span>
          </div>
        )}
      </div>
    );
  }
);
