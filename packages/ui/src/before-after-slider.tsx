import * as React from 'react';

import { cn } from './cn.js';

// ─── BeforeAfterSlider ────────────────────────────────────────
//
// Image-Compare mit Drag-Handle und Keyboard-Navi (←/→).
// Nicht library-abhängig — pure clip-path-Magic.
// Gut für Portfolio/Reviews.

export interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt?: string;
  afterAlt?: string;
  defaultPercent?: number;
  aspectRatio?: number;
  className?: string;
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = 'Vorher',
  afterAlt = 'Nachher',
  defaultPercent = 50,
  aspectRatio = 16 / 10,
  className,
}: BeforeAfterSliderProps): React.JSX.Element {
  const [percent, setPercent] = React.useState(
    Math.max(0, Math.min(100, defaultPercent)),
  );
  const rootRef = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);

  const updateFromClientX = (clientX: number): void => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPercent(Math.max(0, Math.min(100, p)));
  };

  React.useEffect(() => {
    const move = (e: PointerEvent): void => {
      if (!dragging.current) return;
      updateFromClientX(e.clientX);
    };
    const up = (): void => {
      dragging.current = false;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn('relative select-none overflow-hidden rounded-md', className)}
      style={{ aspectRatio: String(aspectRatio) }}
    >
      <img
        src={afterSrc}
        alt={afterAlt}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <img
        src={beforeSrc}
        alt={beforeAlt}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
        draggable={false}
      />
      <div
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label="Before/After-Slider"
        tabIndex={0}
        onPointerDown={(e) => {
          dragging.current = true;
          updateFromClientX(e.clientX);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setPercent((p) => Math.max(0, p - 2));
          if (e.key === 'ArrowRight') setPercent((p) => Math.min(100, p + 2));
        }}
        className="absolute inset-y-0 w-1 bg-white shadow-md cursor-ew-resize focus:outline-none"
        style={{ left: `calc(${percent}% - 2px)` }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center text-xs font-bold">
          ⇆
        </div>
      </div>
    </div>
  );
}
