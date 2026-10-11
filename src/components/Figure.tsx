import { useEffect, useMemo, useState } from 'react';
import { ease, solve, type Anchor, type Anim, type Geometry, type Prop, type V } from '../library/poses';

interface Props {
  anim: Anim;
  animate?: boolean;
  size?: number;
  className?: string;
}

const PERIOD = 2800;

function usePhase(active: boolean): number {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) return;
    const slow = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const period = slow ? PERIOD * 2.5 : PERIOD;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      setPhase(((now - start) % period) / period);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return phase;
}

/** Stick figure performing an exercise; static (pose A) unless `animate`. */
export function ExerciseFigure({ anim, animate = false, size, className = '' }: Props) {
  const phase = usePhase(animate);
  const u = animate ? ease(phase) : (anim.thumb ?? 0.6);
  const g = solve(anim, u);
  const viewBox = useMemo(() => fitBox(anim), [anim]);
  return (
    <svg
      className={`figure ${className}`}
      viewBox={viewBox}
      width={size}
      height={size}
      aria-hidden="true"
    >
      {(anim.props ?? []).filter((p) => p.k === 'line').map((p, i) => renderProp(p, g, i))}
      {g.body.filter((s) => s.far).map((s, i) => <polyline key={`f${i}`} className="limb far" points={pts(s.pts)} />)}
      {g.body.filter((s) => !s.far).map((s, i) => <polyline key={`b${i}`} className="limb" points={pts(s.pts)} />)}
      <circle className="head" cx={g.head[0]} cy={g.head[1]} r={5.5} />
      {(anim.props ?? []).filter((p) => p.k !== 'line').map((p, i) => renderProp(p, g, i))}
    </svg>
  );
}

/** Square viewBox around the figure and its props over the whole movement. */
function fitBox(anim: Anim): string {
  let [x1, y1, x2, y2] = [Infinity, Infinity, -Infinity, -Infinity];
  const grow = (p: V, r = 0) => {
    x1 = Math.min(x1, p[0] - r);
    y1 = Math.min(y1, p[1] - r);
    x2 = Math.max(x2, p[0] + r);
    y2 = Math.max(y2, p[1] + r);
  };
  for (const u of [0, 0.25, 0.5, 0.75, 1]) {
    const g = solve(anim, u);
    g.body.forEach((s) => s.pts.forEach((p) => grow(p, 3)));
    grow(g.head, 6);
    for (const p of anim.props ?? []) {
      if (p.k === 'line') {
        grow(p.a);
        grow(p.b);
        if (g.front && p.m) {
          grow(mirror(p.a));
          grow(mirror(p.b));
        }
      } else if (p.k === 'cable') {
        grow(p.from, 2);
        if (g.front) grow(mirror(p.from), 2);
      } else {
        const r = p.k === 'plate' ? p.r : p.k === 'bar' ? (p.r ?? 7) + (g.front ? 10 : 0) : 6;
        for (const c of both(g, 'at' in p ? p.at : undefined, 'd' in p ? p.d : undefined)) grow(c, r);
      }
    }
  }
  const size = Math.max(x2 - x1, y2 - y1, 50) + 8;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  return `${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)} ${size.toFixed(1)} ${size.toFixed(1)}`;
}

const pts = (p: V[]) => p.map((v) => `${v[0].toFixed(1)},${v[1].toFixed(1)}`).join(' ');
const mirror = (p: V): V => [100 - p[0], p[1]];

function at(g: Geometry, a: Anchor | undefined, d: V = [0, 0]): V {
  const p = g.anchors[a ?? 'h'];
  return [p[0] + d[0], p[1] + d[1]];
}

/** In front view, hand/foot attached props are drawn on both sides. */
function both(g: Geometry, a: Anchor | undefined, d: V = [0, 0]): V[] {
  const p = at(g, a, d);
  if (!g.front) return [p];
  if (a === 'h' || a === undefined) return [p, [g.anchors.hL[0] - d[0], g.anchors.hL[1] + d[1]]];
  if (a === 'f') return [p, [g.anchors.fL[0] - d[0], g.anchors.fL[1] + d[1]]];
  return [p];
}

function renderProp(p: Prop, g: Geometry, i: number) {
  switch (p.k) {
    case 'line': {
      const l = <line key={`l${i}`} className="prop-line" x1={p.a[0]} y1={p.a[1]} x2={p.b[0]} y2={p.b[1]} strokeWidth={p.w ?? 2} />;
      if (!(g.front && p.m)) return l;
      const [a, b] = [mirror(p.a), mirror(p.b)];
      return (
        <g key={`l${i}`}>
          {l}
          <line className="prop-line" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={p.w ?? 2} />
        </g>
      );
    }
    case 'bar': {
      const r = p.r ?? 7;
      const c = at(g, p.at, p.d);
      if (g.front && (p.at ?? 'h') === 'h') {
        const [hr, hl] = both(g, 'h', p.d);
        const x1 = Math.min(hr[0], hl[0]) - 10;
        const x2 = Math.max(hr[0], hl[0]) + 10;
        const y = (hr[1] + hl[1]) / 2;
        return (
          <g key={`p${i}`}>
            <line className="prop-bar" x1={x1} y1={y} x2={x2} y2={y} />
            {r > 0 && <line className="prop-plate-edge" x1={x1 + 2} y1={y - r} x2={x1 + 2} y2={y + r} />}
            {r > 0 && <line className="prop-plate-edge" x1={x2 - 2} y1={y - r} x2={x2 - 2} y2={y + r} />}
          </g>
        );
      }
      return (
        <g key={`p${i}`}>
          <circle className="prop-plate" cx={c[0]} cy={c[1]} r={r} />
          <circle className="prop-hub" cx={c[0]} cy={c[1]} r={1.4} />
        </g>
      );
    }
    case 'plate':
      return (
        <g key={`p${i}`}>
          {both(g, p.at, p.d).map((c, j) => (
            <circle key={j} className="prop-plate" cx={c[0]} cy={c[1]} r={p.r} />
          ))}
        </g>
      );
    case 'db':
      return (
        <g key={`p${i}`}>
          {both(g, p.at).map((c, j) =>
            g.front ? (
              <line key={j} className="prop-db" x1={c[0]} y1={c[1] - 4} x2={c[0]} y2={c[1] + 4} />
            ) : (
              <circle key={j} className="prop-plate" cx={c[0]} cy={c[1]} r={3.6} />
            ),
          )}
        </g>
      );
    case 'kb': {
      const c = at(g, p.at);
      return (
        <g key={`p${i}`}>
          <circle className="prop-plate" cx={c[0]} cy={c[1] + 5} r={4.6} />
          <circle className="prop-handle" cx={c[0]} cy={c[1] + 1} r={2.4} />
        </g>
      );
    }
    case 'cable': {
      const ends = p.at === 'hm' ? [at(g, 'hm')] : both(g, p.at);
      const froms = g.front && p.at !== 'hm' ? [p.from, mirror(p.from)] : [p.from];
      return (
        <g key={`p${i}`}>
          {ends.map((c, j) => {
            const f = froms[j] ?? froms[0];
            return <line key={j} className="prop-cable" x1={f[0]} y1={f[1]} x2={c[0]} y2={c[1]} />;
          })}
          {froms.map((f, j) => (
            <circle key={`c${j}`} className="prop-pulley" cx={f[0]} cy={f[1]} r={2} />
          ))}
        </g>
      );
    }
    case 'pad': {
      const r = (p.ang * Math.PI) / 180;
      const dx = (Math.cos(r) * p.len) / 2;
      const dy = (Math.sin(r) * p.len) / 2;
      return (
        <g key={`p${i}`}>
          {both(g, p.at, p.d).map((c, j) => (
            <line key={j} className="prop-pad" x1={c[0] - dx} y1={c[1] - dy} x2={c[0] + dx} y2={c[1] + dy} />
          ))}
        </g>
      );
    }
  }
}
