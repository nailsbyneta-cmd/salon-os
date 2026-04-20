import { cn } from '@salon-os/ui';

/**
 * Inline-SVG-Sparkline. Rendert eine Mini-Linie für N Datenpunkte —
 * perfekt für Dashboard-Stats ("Umsatz-Trend letzte 7 Tage").
 */
export function Sparkline({
  data,
  width = 180,
  height = 40,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}): React.JSX.Element {
  if (data.length === 0) {
    return (
      <div
        className={cn('text-[10px] text-text-muted', className)}
        style={{ width, height }}
      >
        — keine Daten —
      </div>
    );
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(' ');

  const area =
    `${path} L${width},${height} L0,${height} Z`;

  const last = points[points.length - 1]!;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="sparkline-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-accent))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--brand-accent))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkline-grad)" />
      <path
        d={path}
        fill="none"
        stroke="hsl(var(--brand-accent))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="hsl(var(--brand-accent))" />
    </svg>
  );
}
