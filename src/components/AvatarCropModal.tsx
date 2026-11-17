import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  FlipHorizontal2,
  Move,
  RotateCcw,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { AppTheme } from '../types/talkcob';
import { THEME_TOKENS } from '../utils/theme';

interface AvatarCropModalProps {
  imageSrc: string;
  theme: AppTheme;
  onCancel: () => void;
  onApply: (croppedDataUrl: string) => void;
}

const VIEWPORT_SIZE = 288;
const CROP_SIZE = 236;
const OUTPUT_SIZE = 320;

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  imageSrc,
  theme,
  onCancel,
  onApply,
}) => {
  const t = THEME_TOKENS[theme];
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [natural, setNatural] = useState<{ w: number; h: number }>({ w: 320, h: 320 });
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0 | 90 | 180 | 270
  const [flipX, setFlipX] = useState(false);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  useEffect(() => {
    setLoaded(false);
    setZoom(1);
    setRotation(0);
    setFlipX(false);
    setPan({ x: 0, y: 0 });

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNatural({
        w: Math.max(1, img.naturalWidth || img.width || 320),
        h: Math.max(1, img.naturalHeight || img.height || 320),
      });
      setLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const getBounds = (z: number, rot: number) => {
    const effW = rot % 180 === 0 ? natural.w : natural.h;
    const effH = rot % 180 === 0 ? natural.h : natural.w;
    const baseScale = CROP_SIZE / Math.min(effW, effH);
    const dispW = effW * baseScale * z;
    const dispH = effH * baseScale * z;
    return {
      baseScale,
      maxPanX: Math.max(0, (dispW - CROP_SIZE) / 2),
      maxPanY: Math.max(0, (dispH - CROP_SIZE) / 2),
    };
  };

  const clampPan = (x: number, y: number, z: number, rot: number) => {
    const { maxPanX, maxPanY } = getBounds(z, rot);
    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, x)),
      y: Math.min(maxPanY, Math.max(-maxPanY, y)),
    };
  };

  const handleZoomChange = (nextZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(1, Number(nextZoom.toFixed(2))));
    setZoom(clampedZoom);
    setPan((prev) => clampPan(prev.x, prev.y, clampedZoom, rotation));
  };

  const handleRotate = () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    setPan((prev) => clampPan(prev.x, prev.y, zoom, nextRot));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFlipX(false);
    setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;
    setPan(
      clampPan(
        dragStartRef.current.startPanX + dx,
        dragStartRef.current.startPanY + dy,
        zoom,
        rotation
      )
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if capture already released
      }
    }
    setDragging(false);
    dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    handleZoomChange(zoom + delta);
  };

  const handleApplyCrop = () => {
    const img = imgRef.current;
    if (!img) {
      onApply(imageSrc);
      return;
    }
    try {
      const { baseScale } = getBounds(zoom, rotation);
      const outRatio = OUTPUT_SIZE / CROP_SIZE;

      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        onApply(imageSrc);
        return;
      }

      ctx.fillStyle = '#18181B';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      ctx.save();
      ctx.translate(OUTPUT_SIZE / 2 + pan.x * outRatio, OUTPUT_SIZE / 2 + pan.y * outRatio);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipX ? -1 : 1, 1);

      const drawW = natural.w * baseScale * zoom * outRatio;
      const drawH = natural.h * baseScale * zoom * outRatio;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      onApply(canvas.toDataURL('image/jpeg', 0.9));
    } catch {
      onApply(imageSrc);
    }
  };

  const { baseScale } = getBounds(zoom, rotation);
  const rawDisplayW = natural.w * baseScale * zoom;
  const rawDisplayH = natural.h * baseScale * zoom;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit Profile Picture"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${t.modalBg} ${t.border}`}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${t.border}`}>
          <div>
            <h2 className={`font-display font-bold text-lg ${t.textPrimary}`}>Edit Image</h2>
            <p className={`text-xs ${t.textMuted}`}>
              Drag to reposition, scroll or slide to zoom, rotate, or flip
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close image cropper"
            className={`p-1.5 rounded-lg text-[#EF4444] ${t.hoverBg}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop Viewport */}
        <div className="p-5 flex flex-col items-center space-y-4">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            className={`relative rounded-xl overflow-hidden bg-[#0E0E10] border ${t.border} select-none touch-none ${
              dragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {loaded && (
              <div
                style={{
                  position: 'absolute',
                  left: VIEWPORT_SIZE / 2 + pan.x,
                  top: VIEWPORT_SIZE / 2 + pan.y,
                  width: rawDisplayW,
                  height: rawDisplayH,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg) scaleX(${flipX ? -1 : 1})`,
                  transformOrigin: 'center center',
                }}
              >
                <img
                  src={imageSrc}
                  alt="Crop preview"
                  draggable={false}
                  style={{ width: '100%', height: '100%', maxWidth: 'none' }}
                  className="pointer-events-none select-none"
                />
              </div>
            )}

            {/* Circular Crop Mask Overlay */}
            <div
              style={{
                width: CROP_SIZE,
                height: CROP_SIZE,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.62)',
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90"
            />

            {/* Subtle Drag Hint */}
            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/60 text-white/90 text-[11px] font-medium flex items-center gap-1 whitespace-nowrap">
              <Move className="w-3 h-3 text-[#EF4444]" />
              <span>Drag to adjust</span>
            </div>
          </div>

          {/* Zoom Slider */}
          <div className="w-full flex items-center gap-3 px-1">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.15)}
              aria-label="Zoom out"
              className={`p-1.5 rounded-lg text-[#EF4444] ${t.hoverBg}`}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              aria-label="Zoom level"
              className="flex-1 accent-[#E53935] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.15)}
              aria-label="Zoom in"
              className={`p-1.5 rounded-lg text-[#EF4444] ${t.hoverBg}`}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className={`text-xs font-mono tabular-nums w-10 text-right ${t.textMuted}`}>
              {zoom.toFixed(1)}x
            </span>
          </div>

          {/* Rotate / Flip / Reset Toolbar */}
          <div className="w-full flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleRotate}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 ${t.border} ${t.textPrimary} ${t.hoverBg} transition-colors`}
            >
              <RotateCw className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>Rotate 90°</span>
            </button>
            <button
              type="button"
              onClick={() => setFlipX((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                flipX
                  ? 'border-[#E53935] bg-[#E53935]/15 text-[#EF4444]'
                  : `${t.border} ${t.textPrimary} ${t.hoverBg}`
              }`}
            >
              <FlipHorizontal2 className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>Flip</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 ${t.border} ${t.textSecondary} ${t.hoverBg} transition-colors`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-3.5 border-t flex items-center justify-end gap-2 ${t.border} ${t.dockBg}`}>
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${t.textSecondary} ${t.hoverBg}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#E53935] hover:bg-[#C62828] text-white inline-flex items-center gap-1.5 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
