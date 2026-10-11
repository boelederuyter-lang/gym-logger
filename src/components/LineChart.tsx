import { useEffect, useId, useRef, useState } from 'react';
import { niceTicks } from '../progress';

export interface ChartPoint {
  x: number; // timestamp
  y: number;
  pr?: boolean;
}

interface Props {
  points: ChartPoint[];
  format: (y: number) => string;
  selected: number | null;
  onSelect: (index: number | null) => void;
  height?: number;
}

const PAD = { top: 34, right: 14, bottom: 26, left: 44 };

/** Single-series line chart with area wash, PR dots and a drag-to-scrub crosshair. */
export function LineChart({ points, format, selected, onSelect, height = 220 }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const gradient = useId();

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (points.length === 0) return <div className="chart-empty muted">Nog geen gegevens in deze periode.</div>;

  const ys = points.map((p) => p.y);
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys));
  const [y0, y1] = [ticks[0], ticks[ticks.length - 1]];
  const [x0, x1] = [points[0].x, points[points.length - 1].x];
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const sx = (x: number) => PAD.left + (x1 === x0 ? innerW / 2 : ((x - x0) / (x1 - x0)) * innerW);
  const sy = (y: number) => PAD.top + innerH - ((y - y0) / (y1 - y0 || 1)) * innerH;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const area = `${line}L${sx(x1).toFixed(1)},${sy(y0)}L${sx(x0).toFixed(1)},${sy(y0)}Z`;
  const xTicks = timeTicks(x0, x1);

  function pick(clientX: number) {
    const rect = wrap.current!.getBoundingClientRect();
    const x = clientX - rect.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(sx(p.x) - x) < Math.abs(sx(points[best].x) - x)) best = i;
    });
    onSelect(best);
  }

  const sel = selected != null ? points[selected] : null;
  const label = sel
    ? `${format(sel.y)} · ${new Date(sel.x).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`
    : '';
  const labelW = label.length * 6.6 + 16;
  const labelX = sel ? Math.min(width - PAD.right - labelW, Math.max(PAD.left, sx(sel.x) - labelW / 2)) : 0;

  return (
    <div ref={wrap} className="chart">
      <svg
        width={width}
        height={height}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerMove={(e) => (e.buttons || e.pointerType === 'mouse') && pick(e.clientX)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && onSelect(null)}
        role="img"
        aria-label="Grafiek van je voortgang"
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--red)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--red)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={width - PAD.right} y1={sy(t)} y2={sy(t)} />
            <text className="chart-tick" x={PAD.left - 8} y={sy(t)} textAnchor="end" dominantBaseline="middle">
              {t.toLocaleString('nl-NL')}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} className="chart-tick" x={sx(t)} y={height - 6} textAnchor="middle">
            {new Date(t).toLocaleDateString(
              'nl-NL',
              x1 - x0 > 300 * 864e5 ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' },
            )}
          </text>
        ))}
        {points.length > 1 && <path d={area} fill={`url(#${gradient})`} />}
        {points.length > 1 && <path className="chart-line" d={line} />}
        {points.map((p, i) =>
          p.pr ? <circle key={i} className="chart-pr" cx={sx(p.x)} cy={sy(p.y)} r={4.5} /> : null,
        )}
        {!sel && (
          <circle
            className="chart-dot"
            cx={sx(points[points.length - 1].x)}
            cy={sy(points[points.length - 1].y)}
            r={4.5}
          />
        )}
        {sel && (
          <g pointerEvents="none">
            <line className="chart-cross" x1={sx(sel.x)} x2={sx(sel.x)} y1={PAD.top - 4} y2={PAD.top + innerH} />
            <circle className={sel.pr ? 'chart-pr' : 'chart-dot'} cx={sx(sel.x)} cy={sy(sel.y)} r={6} />
            <rect className="chart-label-bg" x={labelX} y={4} width={labelW} height={24} rx={12} />
            <text className="chart-label" x={labelX + labelW / 2} y={16} textAnchor="middle" dominantBaseline="middle">
              {label}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/** Three or four evenly spread date ticks. */
function timeTicks(x0: number, x1: number): number[] {
  if (x1 === x0) return [x0];
  const n = 3;
  return Array.from({ length: n }, (_, i) => x0 + ((x1 - x0) * i) / (n - 1));
}

export function Sparkline({ values, width = 72, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i: number) => 3 + (i / (values.length - 1)) * (width - 6);
  const y = (v: number) => height - 4 - ((v - min) / (max - min || 1)) * (height - 8);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return (
    <svg width={width} height={height} aria-hidden="true">
      <path className="chart-line" d={d} />
      <circle className="chart-dot" cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={3} />
    </svg>
  );
}
