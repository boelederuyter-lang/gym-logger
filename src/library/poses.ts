// Procedural stick figure: a pose is a hip position, torso angle and targets
// for hands and feet; elbows and knees are solved with 2-bone IK.

export type V = [number, number];

export const L = { torso: 26, up: 13, fore: 13, thigh: 19, shin: 19, neck: 9, head: 5.5 };
export const GROUND = 96;

export interface PoseSpec {
  hip?: V; // side view: absolute; front view: only y is used
  sh?: V; // alternative to hip: shoulder position (hip follows from torso angle)
  t?: number; // torso angle in degrees, 0 = upright, + = leaning towards the right (facing direction)
  h?: V; // near hand target (front view: right hand, mirrored for the left)
  hr?: V; // hand relative to the shoulder (overrides h)
  h2?: V; // far hand (side view), defaults to h
  f?: V; // near foot
  f2?: V; // far foot
  ft?: V; // toe target for the near foot (calf raises)
}

export type Anchor = 'h' | 'h2' | 'f' | 'f2' | 'sh' | 'hip' | 'hm';

export type Prop =
  | { k: 'line'; a: V; b: V; w?: number; m?: boolean } // static frame; m = mirror in front view
  | { k: 'bar'; at?: Anchor; r?: number; d?: V } // barbell
  | { k: 'plate'; at: Anchor; r: number; d?: V } // disc / wheel / handle
  | { k: 'db'; at?: Anchor } // dumbbell in each hand
  | { k: 'kb'; at?: Anchor } // kettlebell
  | { k: 'cable'; from: V; at?: Anchor } // cable from a pulley to the hands
  | { k: 'pad'; at: Anchor; len: number; ang: number; d?: V }; // short pad moving with a limb

export interface Anim {
  view?: 'side' | 'front';
  a: PoseSpec;
  b: PoseSpec;
  props?: Prop[];
  eh?: V; // elbow direction hint
  kh?: V; // knee direction hint
  thumb?: number; // 0..1 phase used for static thumbnails (default 0.6)
}

interface Abs {
  hip: V;
  t: number;
  h: V;
  h2: V;
  f: V;
  f2: V;
  ft?: V;
}

export interface Segment {
  pts: V[];
  far?: boolean;
}

export interface Geometry {
  front: boolean;
  head: V;
  body: Segment[];
  anchors: Record<Anchor, V> & { hL: V; fL: V };
}

const rad = (d: number) => (d * Math.PI) / 180;
const dirOf = (t: number): V => [Math.sin(rad(t)), -Math.cos(rad(t))];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
const lerp = (a: V, b: V, u: number): V => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
const mirror = (p: V): V => [100 - p[0], p[1]];

/** Body in a straight line from the shoulder towards the feet (planks, push-ups). */
export function plank(sh: V, foot: V, rest: PoseSpec = {}): PoseSpec {
  const d = sub(foot, sh);
  const len = Math.hypot(d[0], d[1]);
  const u: V = [d[0] / len, d[1] / len];
  const t = (Math.atan2(-u[0], u[1]) * 180) / Math.PI;
  return { hip: add(sh, mul(u, L.torso)), t, f: foot, ...rest };
}

function resolve(p: PoseSpec, front: boolean): Abs {
  const t = front ? 0 : (p.t ?? 0);
  let hip: V = p.hip ?? (p.sh ? sub(p.sh, mul(dirOf(t), L.torso)) : [48, 58]);
  if (front) hip = [50, hip[1]];
  const sh = add(hip, mul(dirOf(t), L.torso));
  const h = p.hr ? add(sh, p.hr) : (p.h ?? add(sh, [2, 26]));
  const f = p.f ?? [front ? 56 : hip[0] + 2, GROUND];
  return { hip, t, h, h2: p.h2 ?? h, f, f2: p.f2 ?? f, ft: p.ft };
}

function mix(a: Abs, b: Abs, u: number): Abs {
  return {
    hip: lerp(a.hip, b.hip, u),
    t: a.t + (b.t - a.t) * u,
    h: lerp(a.h, b.h, u),
    h2: lerp(a.h2, b.h2, u),
    f: lerp(a.f, b.f, u),
    f2: lerp(a.f2, b.f2, u),
    ft: a.ft && b.ft ? lerp(a.ft, b.ft, u) : undefined,
  };
}

/** Two-bone IK: returns [joint, end]; the joint is bent towards `hint`. */
export function ik(root: V, target: V, l1: number, l2: number, hint: V): [V, V] {
  let d = sub(target, root);
  let dist = Math.hypot(d[0], d[1]);
  if (dist < 1e-6) {
    d = [0, 1];
    dist = 1;
  }
  const max = l1 + l2 - 0.001;
  const min = Math.abs(l1 - l2) + 0.001;
  const u: V = [d[0] / dist, d[1] / dist];
  const cd = Math.min(max, Math.max(min, dist));
  const end = add(root, mul(u, cd));
  const x = (l1 * l1 - l2 * l2 + cd * cd) / (2 * cd);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const base = add(root, mul(u, x));
  const perp: V = [-u[1], u[0]];
  const j1 = add(base, mul(perp, h));
  const j2 = add(base, mul(perp, -h));
  const score = (j: V) => (j[0] - base[0]) * hint[0] + (j[1] - base[1]) * hint[1];
  return [score(j1) >= score(j2) ? j1 : j2, end];
}

export function solve(anim: Anim, u: number): Geometry {
  const front = anim.view === 'front';
  const p = mix(resolve(anim.a, front), resolve(anim.b, front), u);
  const eh = anim.eh ?? (front ? [1, 0.4] : [-0.4, 1]);
  const kh = anim.kh ?? [1, 0];
  const body: Segment[] = [];

  if (!front) {
    const d = dirOf(p.t);
    const sh = add(p.hip, mul(d, L.torso));
    const head = add(sh, mul(d, L.neck));
    const [e2, h2] = ik(sh, p.h2, L.up, L.fore, eh);
    const [k2, a2] = ik(p.hip, p.f2, L.thigh, L.shin, kh);
    body.push({ pts: [sh, e2, h2], far: true });
    body.push({ pts: [p.hip, k2, a2, add(a2, [5, 0])], far: true });
    body.push({ pts: [p.hip, sh] });
    const [k1, a1] = ik(p.hip, p.f, L.thigh, L.shin, kh);
    body.push({ pts: [p.hip, k1, a1, p.ft ?? add(a1, [5, 0])] });
    const [e1, h1] = ik(sh, p.h, L.up, L.fore, eh);
    body.push({ pts: [sh, e1, h1] });
    return {
      front,
      head,
      body,
      anchors: { h: h1, h2, f: a1, f2: a2, sh, hip: p.hip, hm: h1, hL: h2, fL: a2 },
    };
  }

  const hipY = p.hip[1];
  const shY = hipY - L.torso;
  const shR: V = [60, shY];
  const hipR: V = [55, hipY];
  const [eR, hR] = ik(shR, p.h, L.up, L.fore, eh);
  const [kR, fR] = ik(hipR, p.f, L.thigh, L.shin, kh);
  const mh: V = [-eh[0], eh[1]];
  const mk: V = [-kh[0], kh[1]];
  const [eL, hL] = ik(mirror(shR), mirror(p.h), L.up, L.fore, mh);
  const [kL, fL] = ik(mirror(hipR), mirror(p.f), L.thigh, L.shin, mk);
  body.push({ pts: [[50, hipY], [50, shY]] });
  body.push({ pts: [mirror(shR), shR] });
  body.push({ pts: [mirror(hipR), hipR] });
  body.push({ pts: [hipR, kR, fR, add(fR, [3, 0])] });
  body.push({ pts: [mirror(hipR), kL, fL, add(fL, [-3, 0])] });
  body.push({ pts: [shR, eR, hR] });
  body.push({ pts: [mirror(shR), eL, hL] });
  return {
    front,
    head: [50, shY - L.neck],
    body,
    anchors: {
      h: hR,
      h2: hR,
      f: fR,
      f2: fR,
      sh: [50, shY],
      hip: [50, hipY],
      hm: [50, (hR[1] + hL[1]) / 2],
      hL,
      fL,
    },
  };
}

export const ease = (phase: number) => (1 - Math.cos(phase * 2 * Math.PI)) / 2;
