import { useState, useRef, useEffect, useCallback } from 'react';
import type { CropShape } from '@/types';

/* ================================================================
   CustomCropper — pixel-level cropper with precise interaction
   ================================================================ */

interface CropBox {
  x: number;        // pixels relative to original image
  y: number;
  width: number;    // pixels
  height: number;   // pixels
}

interface ImageGeo {
  natW: number;
  natH: number;
  dispX: number;    // image display offset in container (px)
  dispY: number;
  dispW: number;    // image display size (px)
  dispH: number;
}

type DragHandle = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface CustomCropperProps {
  imageUrl: string;
  aspect?: number;              // undefined = free, number = locked ratio
  shape: CropShape;
  borderRadiusPercent: number;  // 0-100, percentage of half the shorter side
  onCropChange: (cropBox: CropBox) => void;
}

/** Convert borderRadiusPercent (0-100) to actual pixel radius */
function percentToRadius(percent: number, sideShort: number): number {
  return (percent / 100) * (sideShort / 2);
}

export function CustomCropper({ imageUrl, aspect, shape, borderRadiusPercent, onCropChange }: CustomCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<ImageGeo | null>(null);
  const [crop, setCrop] = useState<CropBox>({ x: 0, y: 0, width: 0, height: 0 });
  const prevAspectRef = useRef<number | undefined>(undefined);
  const [drag, setDrag] = useState<{
    handle: DragHandle;
    startMX: number;
    startMY: number;
    startCrop: CropBox;
  } | null>(null);

  /* ---- load image, measure container ---- */
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      const cW = r.width, cH = r.height;
      const iW = img.naturalWidth, iH = img.naturalHeight;
      const iR = iW / iH, cR = cW / cH;
      let dW: number, dH: number, dX: number, dY: number;
      if (iR > cR) {
        dW = cW; dH = cW / iR; dX = 0; dY = (cH - dH) / 2;
      } else {
        dH = cH; dW = dH * iR; dX = (cW - dW) / 2; dY = 0;
      }
      const g = { natW: iW, natH: iH, dispX: dX, dispY: dY, dispW: dW, dispH: dH };
      setGeo(g);
      // initialise crop
      const init = makeCenteredCrop(iW, iH, aspect);
      setCrop(init);
      prevAspectRef.current = aspect;
    };
    img.src = imageUrl;
  }, [imageUrl]);

  /* ---- when aspect changes, recompute crop ---- */
  useEffect(() => {
    if (!geo) return;
    if (aspect === prevAspectRef.current) return;
    prevAspectRef.current = aspect;
    const next = makeCenteredCrop(geo.natW, geo.natH, aspect);
    setCrop(next);
  }, [aspect, geo]);

  /* ---- notify parent ---- */
  useEffect(() => {
    if (geo) onCropChange(crop);
  }, [crop, geo, onCropChange]);

  /* ---- helper: build a centred crop box for given aspect ---- */
  const makeCenteredCrop = (maxW: number, maxH: number, asp: number | undefined): CropBox => {
    const minSize = 20;
    if (!asp) {
      const w = Math.max(minSize, maxW * 0.8);
      const h = Math.max(minSize, maxH * 0.8);
      return { x: (maxW - w) / 2, y: (maxH - h) / 2, width: w, height: h };
    }
    let w: number, h: number;
    const imageAspect = maxW / maxH;
    if (asp > imageAspect) {
      w = maxW * 0.9;
      h = w / asp;
    } else {
      h = maxH * 0.9;
      w = h * asp;
    }
    return { x: (maxW - w) / 2, y: (maxH - h) / 2, width: w, height: h };
  };

  /* ---- helper: clamp inside image ---- */
  const fitToBounds = useCallback((b: CropBox, maxW: number, maxH: number): CropBox => {
    let { x, y, width, height } = b;
    const minSize = 20;
    x = Math.max(0, Math.min(maxW - minSize, x));
    y = Math.max(0, Math.min(maxH - minSize, y));
    width = Math.max(minSize, Math.min(maxW - x, width));
    height = Math.max(minSize, Math.min(maxH - y, height));
    return { x, y, width, height };
  }, []);

  /* ---- helper: enforce aspect ratio ---- */
  const constrainAspect = useCallback((b: CropBox, asp: number | undefined, _maxW: number, maxH: number): CropBox => {
    if (!asp) return b;
    let { x, y, width, height } = b;
    const newH = width / asp;
    if (newH <= maxH - y) {
      height = newH;
    } else {
      height = maxH - y;
      width = height * asp;
    }
    return { x, y, width, height };
  }, []);

  /* ---- coordinate conversions ---- */
  const imgPxToScreen = (gx: ImageGeo, px: number, axis: 'x' | 'y') =>
    axis === 'x' ? gx.dispX + (px / gx.natW) * gx.dispW : gx.dispY + (px / gx.natH) * gx.dispH;

  /* ---- hit-test which handle was clicked ---- */
  const hitTest = (mx: number, my: number, gx: ImageGeo, b: CropBox): DragHandle | null => {
    const sx = imgPxToScreen(gx, b.x, 'x');
    const sy = imgPxToScreen(gx, b.y, 'y');
    const sw = (b.width / gx.natW) * gx.dispW;
    const sh = (b.height / gx.natH) * gx.dispH;

    const gap = 4;
    const hSize = 18;

    if (mx >= sx - hSize && mx <= sx + gap && my >= sy - hSize && my <= sy + gap) return 'nw';
    if (mx >= sx + sw - gap && mx <= sx + sw + hSize && my >= sy - hSize && my <= sy + gap) return 'ne';
    if (mx >= sx - hSize && mx <= sx + gap && my >= sy + sh - gap && my <= sy + sh + hSize) return 'sw';
    if (mx >= sx + sw - gap && mx <= sx + sw + hSize && my >= sy + sh - gap && my <= sy + sh + hSize) return 'se';

    const midX = sx + sw / 2;
    const midY = sy + sh / 2;
    if (mx >= midX - 16 && mx <= midX + 16 && my >= sy - hSize && my <= sy + gap) return 'n';
    if (mx >= midX - 16 && mx <= midX + 16 && my >= sy + sh - gap && my <= sy + sh + hSize) return 's';
    if (mx >= sx - hSize && mx <= sx + gap && my >= midY - 16 && my <= midY + 16) return 'w';
    if (mx >= sx + sw - gap && mx <= sx + sw + hSize && my >= midY - 16 && my <= midY + 16) return 'e';

    if (mx >= sx && mx <= sx + sw && my >= sy && my <= sy + sh) return 'move';

    return null;
  };

  /* ---- pointer down ---- */
  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!geo) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const r = containerRef.current!.getBoundingClientRect();
    const mx = clientX - r.left;
    const my = clientY - r.top;

    const h = hitTest(mx, my, geo, crop);
    if (!h) return;
    e.preventDefault();
    setDrag({ handle: h, startMX: mx, startMY: my, startCrop: { ...crop } });
  };

  /* ---- pointer move ---- */
  useEffect(() => {
    if (!drag || !geo) return;

    const move = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const r = containerRef.current!.getBoundingClientRect();
      const mx = cx - r.left;
      const my = cy - r.top;

      const dImgX = Math.round(((mx - drag.startMX) / geo.dispW) * geo.natW);
      const dImgY = Math.round(((my - drag.startMY) / geo.dispH) * geo.natH);

      const sc = drag.startCrop;
      let nb: CropBox;

      if (drag.handle === 'move') {
        nb = { ...sc, x: sc.x + dImgX, y: sc.y + dImgY };
      } else {
        const growRight = drag.handle.includes('e');
        const growBottom = drag.handle.includes('s');
        const growLeft = drag.handle.includes('w');
        const growTop = drag.handle.includes('n');

        let nx = sc.x;
        let ny = sc.y;
        let nw = sc.width;
        let nh = sc.height;

        if (growRight) nw = sc.width + dImgX;
        if (growBottom) nh = sc.height + dImgY;
        if (growLeft) { nx = sc.x + dImgX; nw = sc.width - dImgX; }
        if (growTop) { ny = sc.y + dImgY; nh = sc.height - dImgY; }

        if (aspect) {
          if (growRight && !growLeft && !growBottom && !growTop) nh = nw / aspect;
          else if (growBottom && !growTop && !growRight && !growLeft) nw = nh * aspect;
          else if (growLeft && !growRight && !growBottom && !growTop) nh = nw / aspect;
          else if (growTop && !growBottom && !growRight && !growLeft) nw = nh * aspect;
          else if (drag.handle === 'se') {
            if ((nw / sc.width) > (nh / sc.height)) nh = nw / aspect;
            else nw = nh * aspect;
          } else if (drag.handle === 'nw') {
            if ((sc.width / nw) > (sc.height / nh)) nh = nw / aspect;
            else nw = nh * aspect;
          } else {
            if (nw > nh * aspect) nh = nw / aspect;
            else nw = nh * aspect;
          }
        }

        nb = { x: nx, y: ny, width: nw, height: nh };
      }

      let final = fitToBounds(nb, geo.natW, geo.natH);
      if (aspect) {
        final = constrainAspect(final, aspect, geo.natW, geo.natH);
        final = fitToBounds(final, geo.natW, geo.natH);
      }
      setCrop(final);
    };

    const up = () => setDrag(null);

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [drag, geo, aspect, fitToBounds, constrainAspect]);

  /* ---- render helpers ---- */
  const cursor = drag ? 'grabbing' : 'default';

  if (!geo) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>加载中...</span>
      </div>
    );
  }

  const sx = imgPxToScreen(geo, crop.x, 'x');
  const sy = imgPxToScreen(geo, crop.y, 'y');
  const sw = (crop.width / geo.natW) * geo.dispW;
  const sh = (crop.height / geo.natH) * geo.dispH;

  // Compute display radius from percentage
  const displayShortSide = Math.min(sw, sh);
  const displayRadius = percentToRadius(borderRadiusPercent, displayShortSide);
  const displayRadiusClamped = Math.min(displayRadius, sw / 2, sh / 2);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden select-none"
      style={{ backgroundColor: 'var(--bg-tertiary)', cursor }}
      onMouseDown={onDown}
      onTouchStart={onDown}
    >
      {/* Image — contained, not rotated via CSS */}
      <img
        src={imageUrl}
        alt="crop"
        className="absolute pointer-events-none"
        style={{ left: geo.dispX, top: geo.dispY, width: geo.dispW, height: geo.dispH }}
        draggable={false}
      />

      {/* Dark mask outside crop */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 2 }}>
        <defs>
          <mask id="crop-mask">
            <rect width="100%" height="100%" fill="white" />
            {shape === 'rect' ? (
              <rect
                x={sx} y={sy} width={sw} height={sh}
                rx={displayRadiusClamped} ry={displayRadiusClamped}
                fill="black"
              />
            ) : (
              <ellipse cx={sx + sw / 2} cy={sy + sh / 2} rx={sw / 2} ry={sh / 2} fill="black" />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#crop-mask)" />
      </svg>

      {/* Active border — dashed glow, thin, never blocks content */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: sx,
          top: sy,
          width: sw,
          height: sh,
          border: '2px dashed var(--accent-primary)',
          borderRadius: shape === 'rect' ? `${displayRadiusClamped}px` : '50%',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 0 16px rgba(99,102,241,0.5)',
          zIndex: 3,
        }}
      >
        {/* Rule of thirds grid inside */}
        {shape === 'rect' && (
          <div className="absolute inset-0" style={{ borderRadius: 'inherit', overflow: 'hidden' }}>
            <div className="absolute left-1/3 top-0 bottom-0 w-px" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <div className="absolute left-2/3 top-0 bottom-0 w-px" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <div className="absolute top-1/3 left-0 right-0 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <div className="absolute top-2/3 left-0 right-0 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
          </div>
        )}
      </div>

      {/* Invisible hit zones — no visible handles, cursor changes on hover */}
      {shape === 'rect' && (
        <>
          {/* Corner zones — invisible areas outside corners */}
          {([
            { h: 'nw' as const, cx: sx, cy: sy },
            { h: 'ne' as const, cx: sx + sw, cy: sy },
            { h: 'sw' as const, cx: sx, cy: sy + sh },
            { h: 'se' as const, cx: sx + sw, cy: sy + sh },
          ]).map(({ h, cx, cy }) => {
            const zone = 16;
            const isLeft = h === 'nw' || h === 'sw';
            const isTop = h === 'nw' || h === 'ne';
            return (
              <div
                key={h}
                className="absolute"
                style={{
                  left: isLeft ? cx - zone : cx,
                  top: isTop ? cy - zone : cy,
                  width: zone,
                  height: zone,
                  cursor: ( { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' } as Record<string,string> )[h],
                  pointerEvents: 'auto',
                  zIndex: 4,
                }}
              />
            );
          })}
          {/* Edge zones — invisible strips outside edges */}
          {([
            { h: 'n' as const, cx: sx + sw / 2, cy: sy },
            { h: 's' as const, cx: sx + sw / 2, cy: sy + sh },
            { h: 'w' as const, cx: sx, cy: sy + sh / 2 },
            { h: 'e' as const, cx: sx + sw, cy: sy + sh / 2 },
          ]).map(({ h, cx, cy }) => {
            const isVert = h === 'n' || h === 's';
            return (
              <div
                key={h}
                className="absolute"
                style={{
                  left: isVert ? cx - 18 : cx - 4,
                  top: isVert ? cy - 4 : cy - 18,
                  width: isVert ? 36 : 8,
                  height: isVert ? 8 : 36,
                  cursor: ( { n: 'ns-resize', s: 'ns-resize', w: 'ew-resize', e: 'ew-resize' } as Record<string,string> )[h],
                  pointerEvents: 'auto',
                  zIndex: 4,
                }}
              />
            );
          })}
        </>
      )}

      {/* Size label */}
      <div
        className="absolute px-1.5 py-0.5 rounded text-[10px] font-mono"
        style={{
          left: sx + sw / 2, top: sy + sh + 6,
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(99,102,241,0.9)', color: '#fff',
          zIndex: 5, pointerEvents: 'none', whiteSpace: 'nowrap',
        }}
      >
        {Math.round(crop.width)} x {Math.round(crop.height)} px
      </div>
    </div>
  );
}

/* ================================================================
   generateCroppedBlob — robust crop-to-blob with percentage-based
   borderRadius support
   ================================================================ */

export async function generateCroppedBlob(
  imageUrl: string,
  crop: CropBox,
  shape: CropShape,
  borderRadiusPercent: number,
  outW?: number,
  outH?: number
): Promise<Blob> {
  const image = await createImage(imageUrl);
  const natW = image.naturalWidth;
  const natH = image.naturalHeight;

  const x = Math.max(0, Math.min(natW - 1, Math.round(crop.x)));
  const y = Math.max(0, Math.min(natH - 1, Math.round(crop.y)));
  const w = Math.max(1, Math.min(natW - x, Math.round(crop.width)));
  const h = Math.max(1, Math.min(natH - y, Math.round(crop.height)));

  let tW = outW || w;
  let tH = outH || h;
  if (outW && !outH) tH = Math.round((h / w) * outW);
  else if (!outW && outH) tW = Math.round((w / h) * outH);

  const canvas = document.createElement('canvas');
  canvas.width = tW;
  canvas.height = tH;
  const ctx = canvas.getContext('2d')!;

  ctx.save();

  if (shape === 'round') {
    ctx.beginPath();
    ctx.ellipse(tW / 2, tH / 2, tW / 2, tH / 2, 0, 0, Math.PI * 2);
    ctx.clip();
  } else if (borderRadiusPercent > 0) {
    const maxR = Math.min(tW, tH) / 2;
    const r = (borderRadiusPercent / 100) * maxR;
    const finalR = Math.min(r, tW / 2, tH / 2);
    roundRect(ctx, 0, 0, tW, tH, finalR);
    ctx.clip();
  }

  ctx.drawImage(image, x, y, w, h, 0, 0, tW, tH);
  ctx.restore();

  if (shape === 'round') {
    const data = ctx.getImageData(0, 0, tW, tH);
    const cx = tW / 2, cy = tH / 2, rx = tW / 2, ry = tH / 2;
    for (let py = 0; py < tH; py++) {
      for (let px = 0; px < tW; px++) {
        if ((px - cx) ** 2 / (rx * rx) + (py - cy) ** 2 / (ry * ry) > 1) {
          data.data[(py * tW + px) * 4 + 3] = 0;
        }
      }
    }
    ctx.putImageData(data, 0, 0);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')),
      shape === 'round' ? 'image/png' : 'image/jpeg',
      0.95
    );
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
