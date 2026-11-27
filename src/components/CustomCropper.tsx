import { useId, useRef } from 'react';
import type { PointerEvent } from 'react';
import type { CropShape, Region } from '@/types';

type Edge = 'move' | 'nw' | 'ne' | 'se' | 'sw';
const corners = ['nw', 'ne', 'se', 'sw'] as const;
const box = ({ x, y, width, height }: Region) => ({
  left: `${x * 100}%`, top: `${y * 100}%`, width: `${width * 100}%`, height: `${height * 100}%`,
});
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function moveRegion(region: Region, edge: Edge, dx: number, dy: number, aspect?: number) {
  const { x, y, width, height } = region;
  if (edge === 'move') {
    return { ...region, x: clamp(x + dx, 0, 1 - width), y: clamp(y + dy, 0, 1 - height) };
  }
  const left = edge.endsWith('w');
  const top = edge.startsWith('n');
  const anchorX = left ? x + width : x;
  const anchorY = top ? y + height : y;
  const maxW = left ? anchorX : 1 - anchorX;
  const maxH = top ? anchorY : 1 - anchorY;
  let w = clamp(width + (left ? -dx : dx), Math.min(.025, maxW), maxW);
  let h = clamp(height + (top ? -dy : dy), Math.min(.025, maxH), maxH);
  if (aspect) {
    const max = Math.min(maxW, maxH * aspect);
    const changeX = Math.abs(dx / width) >= Math.abs(dy / height);
    w = clamp(changeX ? w : h * aspect, Math.min(.025, max), max);
    h = w / aspect;
  }
  return { x: left ? anchorX - w : anchorX, y: top ? anchorY - h : anchorY, width: w, height: h };
}

export function CustomCropper({ imageUrl, width, height, region, aspect, shape, radius, onChange }: {
  imageUrl: string;
  width: number;
  height: number;
  region: Region;
  aspect?: number;
  shape: CropShape;
  radius: number;
  onChange: (region: Region) => void;
}) {
  const id = useId();
  const picture = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; edge: Edge; x: number; y: number; region: Region } | undefined>(undefined);
  const ratio = aspect && aspect * height / width;

  function start(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || drag.current) return;
    const edge = (event.target as HTMLElement).closest<HTMLElement>('[data-edge]')?.dataset.edge as Edge | undefined;
    if (!edge) return;
    drag.current = { id: event.pointerId, edge, x: event.clientX, y: event.clientY, region };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    const rect = picture.current?.getBoundingClientRect();
    if (!active || active.id !== event.pointerId || !rect?.width || !rect.height) return;
    onChange(moveRegion(active.region, active.edge,
      (event.clientX - active.x) / rect.width, (event.clientY - active.y) / rect.height, ratio));
  }

  function stop(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === event.pointerId) drag.current = undefined;
  }

  const rx = Math.min(region.width * width, region.height * height) * radius / 200;
  return (
    <div className="crop-stage">
      <div className="crop-picture" ref={picture} style={{ '--image-ratio': width / height } as React.CSSProperties}
        onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}>
        <img src={imageUrl} alt="裁剪预览" draggable={false} />
        <svg className="crop-mask" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
          <defs>
            <mask id={id}>
              <rect x="0" y="0" width={width} height={height} fill="white" />
              {shape === 'round' ? (
                <ellipse cx={(region.x + region.width / 2) * width} cy={(region.y + region.height / 2) * height}
                  rx={region.width * width / 2} ry={region.height * height / 2} fill="black" />
              ) : <rect x={region.x * width} y={region.y * height}
                width={region.width * width} height={region.height * height} rx={rx} fill="black" />}
            </mask>
          </defs>
          <rect width={width} height={height} fill="rgba(17,22,37,.68)" mask={`url(#${id})`} />
        </svg>
        <div className="crop-box" data-edge="move" style={box(region)} tabIndex={0}
          aria-label="裁剪范围，方向键可移动"
          onKeyDown={event => {
            const directions = { ArrowLeft: [-.01, 0], ArrowRight: [.01, 0], ArrowUp: [0, -.01], ArrowDown: [0, .01] };
            const direction = directions[event.key as keyof typeof directions];
            if (!direction) return;
            event.preventDefault();
            onChange(moveRegion(region, event.shiftKey ? 'se' : 'move', direction[0], direction[1], ratio));
          }}>
          {corners.map(edge => <span aria-hidden="true" key={edge} data-edge={edge} className={`crop-handle ${edge}`} />)}
        </div>
      </div>
    </div>
  );
}
