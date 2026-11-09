/* 3D-машина для калькулятора и примерочной цвета.
   Кузов собирается кодом из боковых профилей (подход img2threejs: модель — это код, без готовых 3D-файлов и лицензий).
   Кузова по классам калькулятора: c — хэтчбек, s — седан, k — кроссовер, x — внедорожник; между ними машина плавно перетекает.
   Вокруг — бокс студии: поворотный круг с подсветкой, глянцевый пол с отражением, светодиодные полосы, шестигранные лампы, логотип.

   const view = await mount(host, state)   — state: { mode: 'ppf'|'wrap', body, zones: [...], paint: { hex, hex2, finish }, light: 'box'|'day'|'dusk', accent, onZone(id) }
   view.set(частичное состояние)            — смена цвета идёт полосой спереди назад, смена кузова — перетеканием
   view.applyFilm()                         — показать, как ложится плёнка на выбранные детали
   view.destroy()                           */
import * as THREE from './vendor/three.module.min.js';

const ZONES = ['hood', 'fenderF', 'head', 'bumperF', 'skirt', 'door', 'fenderR', 'bumperR', 'roof', 'mirror'];
const ZI = Object.fromEntries(ZONES.map((z, i) => [z, i]));
// фактуры: шероховатость, металличность, лак, шероховатость лака, переливы хамелеона
const FIN = { gloss: [0.16, 0, 1, 0.04, 0], satin: [0.46, 0.12, 0.3, 0.34, 0], matte: [0.86, 0, 0, 0.6, 0], chrome: [0.07, 1, 0.35, 0.05, 0], shift: [0.22, 0.3, 1, 0.04, 1] };
const FACTORY = { hex: '#0b0d10', hex2: '#0b0d10', fin: [0.32, 0.4, 1, 0.06, 0] };

/* ---------------------------------------------------------------- кузова (метры; +x — перёд, y — вверх, z — вбок)
   top/bot — силуэт сбоку; belt — линия окон (спереди, сзади, x начала и конца наклона); glass — стёкла (x лобового, x заднего, высота крыши, верх порога);
   seam — стыки дверей (передняя, стойка, задняя) и начало капота; lamp — фары, фонари, где начинается перед и зад;
   low — решётка (низ, верх), низ переднего и заднего бампера; misc — низ порога, верх расширителей арок, полуширина решётки */
const BODIES = {
  c: { name: 'Хэтчбек', L2: 2.05, HW: 0.885, AX: 1.27, WR: 0.33, ARCH: 0.40, track: 0.76, nose: [0.40, 2.4], tail: [0.22, 3.2], roofW: 0.74,
    top: [[-2.05, 0.62], [-2.03, 0.86], [-1.98, 1.08], [-1.9, 1.25], [-1.76, 1.36], [-1.4, 1.43], [-0.7, 1.465], [0.05, 1.455], [0.4, 1.37], [0.75, 1.13], [1.02, 0.98], [1.45, 0.905], [1.82, 0.85], [1.94, 0.8], [2.01, 0.73], [2.05, 0.64]],
    bot: [[-2.05, 0.4], [-1.9, 0.31], [-1.65, 0.25], [-1.3, 0.24], [1.3, 0.24], [1.65, 0.25], [1.88, 0.28], [2.0, 0.33], [2.05, 0.38]],
    belt: [0.97, 1.04, 0.92, -1.75], glass: [1.03, -1.95, 1.3, 0.37], seam: [0.9, -0.18, -1.12, 0.94], lamp: [0.78, 0.98, 1.78, -1.94], low: [0.42, 0.62, 0.36, 0.38], misc: [0.25, 0.89, 0.5] },
  s: { name: 'Седан', L2: 2.4, HW: 0.915, AX: 1.43, WR: 0.34, ARCH: 0.41, track: 0.79, nose: [0.45, 2.5], tail: [0.4, 2.6], roofW: 0.72,
    top: [[-2.4, 0.66], [-2.37, 0.86], [-2.3, 0.975], [-2.0, 1.01], [-1.7, 1.035], [-1.45, 1.12], [-1.0, 1.36], [-0.55, 1.44], [0, 1.45], [0.38, 1.41], [0.72, 1.22], [1.05, 1.01], [1.55, 0.93], [2.05, 0.87], [2.25, 0.81], [2.35, 0.73], [2.4, 0.64]],
    bot: [[-2.4, 0.42], [-2.25, 0.32], [-1.95, 0.24], [-1.6, 0.22], [1.6, 0.22], [1.95, 0.24], [2.2, 0.29], [2.35, 0.35], [2.4, 0.4]],
    belt: [0.985, 1.03, 1.0, -1.5], glass: [1.07, -1.6, 1.33, 0.36], seam: [0.96, -0.12, -1.22, 0.98], lamp: [0.79, 0.92, 2.12, -2.24], low: [0.4, 0.64, 0.36, 0.4], misc: [0.23, 0.91, 0.52] },
  k: { name: 'Кроссовер', L2: 2.25, HW: 0.93, AX: 1.36, WR: 0.365, ARCH: 0.44, track: 0.8, nose: [0.45, 2.6], tail: [0.36, 2.8], roofW: 0.72,
    top: [[-2.25, 0.62], [-2.21, 0.88], [-2.13, 1.1], [-1.97, 1.31], [-1.76, 1.48], [-1.4, 1.585], [-0.8, 1.63], [0, 1.645], [0.4, 1.6], [0.62, 1.5], [0.95, 1.235], [1.18, 1.055], [1.6, 0.985], [2.05, 0.93], [2.15, 0.9], [2.21, 0.84], [2.25, 0.74]],
    bot: [[-2.25, 0.42], [-2.1, 0.36], [-1.85, 0.31], [-1.5, 0.29], [1.5, 0.29], [1.85, 0.3], [2.05, 0.31], [2.2, 0.36], [2.25, 0.4]],
    belt: [1.065, 1.13, 1.0, -1.9], glass: [1.17, -2.03, 1.4, 0.44], seam: [1.02, -0.1, -1.27, 1.08], lamp: [0.846, 1.036, 1.96, -2.02], low: [0.47, 0.7, 0.42, 0.44], misc: [0.3, 0.98, 0.56] },
  x: { name: 'Внедорожник', L2: 2.45, HW: 0.975, AX: 1.42, WR: 0.4, ARCH: 0.48, track: 0.84, nose: [0.3, 3.2], tail: [0.2, 3.6], roofW: 0.8,
    top: [[-2.45, 0.8], [-2.44, 1.22], [-2.42, 1.55], [-2.36, 1.73], [-2.18, 1.83], [-1.2, 1.86], [0.2, 1.86], [0.55, 1.8], [0.98, 1.42], [1.22, 1.245], [1.75, 1.19], [2.22, 1.13], [2.36, 1.06], [2.43, 0.95], [2.45, 0.82]],
    bot: [[-2.45, 0.5], [-2.3, 0.42], [-2.0, 0.38], [-1.6, 0.37], [1.6, 0.37], [2.0, 0.38], [2.3, 0.43], [2.45, 0.52]],
    belt: [1.25, 1.3, 1.2, -2.1], glass: [1.24, -2.38, 1.7, 0.53], seam: [1.1, -0.06, -1.3, 1.15], lamp: [1.06, 1.18, 2.18, -2.3], low: [0.62, 0.95, 0.58, 0.6], misc: [0.38, 1.07, 0.62] }
};

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function mono(pts) { // монотонный кубический сплайн по точкам [x, y]
  const n = pts.length, X = pts.map(p => p[0]), Y = pts.map(p => p[1]), d = [], m = [];
  for (let i = 0; i < n - 1; i++) d[i] = (Y[i + 1] - Y[i]) / (X[i + 1] - X[i]);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (!d[i]) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return x => {
    if (x <= X[0]) return Y[0];
    if (x >= X[n - 1]) return Y[n - 1];
    let i = 0; while (x > X[i + 1]) i++;
    const h = X[i + 1] - X[i], t = (x - X[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * Y[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * Y[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
const beltOf = B => x => lerp(B.belt[0], B.belt[1], Math.min(1, Math.max(0, (B.belt[2] - x) / (B.belt[2] - B.belt[3]))));

/* ---------------------------------------------------------------- кузов: кольца сечений вдоль машины, у всех кузовов одинаковая сетка */
const SEG = [6, 4, 6, 8, 5, 10, 5, 8], NX = 170, HALF = SEG.reduce((s, c) => s + c, 0) + 1, RING = HALF * 2 - 2;
const curve = new THREE.CatmullRomCurve3([], false, 'centripetal');
function bodyArrays(B) {
  const topY = mono(B.top), bot = mono(B.bot), belt = beltOf(B);
  const botY = x => { let y = bot(x); for (const a of [B.AX, -B.AX]) { const dx = x - a; if (Math.abs(dx) < B.ARCH) y = Math.max(y, B.WR + Math.sqrt(B.ARCH * B.ARCH - dx * dx)); } return y; };
  const hwAt = x => {
    const F = B.L2 - B.nose[0], R = -B.L2 + B.tail[0];
    if (x > F) { const t = Math.min(1, (x - F) / B.nose[0]); return B.HW * Math.pow(Math.max(0, 1 - Math.pow(t, B.nose[1])), 1 / B.nose[1]); }
    if (x < R) { const t = Math.min(1, (R - x) / B.tail[0]); return B.HW * Math.pow(Math.max(0, 1 - Math.pow(t, B.tail[1])), 1 / B.tail[1]); }
    return B.HW;
  };
  const v3 = (z, y) => new THREE.Vector3(z, y, 0), pos = new Float32Array(NX * RING * 3);
  for (let i = 0; i < NX; i++) {
    const x = B.L2 * Math.sin((-1 + 2 * i / (NX - 1)) * Math.PI / 2);
    const yB = botY(x), yT = topY(x), bl = belt(x), w = hwAt(x);
    const g = smooth(0, 0.22, yT - bl), ysh = Math.min(bl - 0.02, yT - 0.05), rw = B.roofW * w;
    const hood = [[w * 0.93, yT - 0.022], [w * 0.8, yT - 0.004], [w * 0.45, yT + 0.002], [0, yT + 0.004]];
    const cab = [[w * 0.905, bl + 0.004], [rw + 0.035 * (w / B.HW), yT - 0.1], [rw * 0.93, yT - 0.012], [0, yT]];
    const pts = [v3(0, yB), v3(w * 0.86, yB), v3(w * 0.985, yB + 0.035), v3(w, yB + 0.3 * (ysh - yB)), v3(w * 0.985, ysh)];
    for (let k = 0; k < 4; k++) pts.push(v3(lerp(hood[k][0], cab[k][0], g), lerp(hood[k][1], cab[k][1], g)));
    curve.points = pts;
    const half = [];
    SEG.forEach((c, j) => { for (let k = 0; k < c; k++) half.push(curve.getPoint((j + k / c) / SEG.length)); });
    half.push(curve.getPoint(1));
    let o = i * RING * 3;
    for (const p of half) { pos[o++] = x; pos[o++] = p.y; pos[o++] = p.x; }
    for (let k = half.length - 2; k >= 1; k--) { pos[o++] = x; pos[o++] = half[k].y; pos[o++] = -half[k].x; }
  }
  return pos;
}
let INDEX = null;
function indexArray() {
  if (INDEX) return INDEX;
  const idx = new Uint16Array((NX - 1) * RING * 6); let k = 0;
  for (let i = 0; i < NX - 1; i++) for (let j = 0; j < RING; j++) {
    const a = i * RING + j, b = i * RING + (j + 1) % RING, c = (i + 1) * RING + j, d = (i + 1) * RING + (j + 1) % RING;
    idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
  }
  return (INDEX = idx);
}
const CACHE = {};
function bodyData(id) {
  if (CACHE[id]) return CACHE[id];
  const B = BODIES[id], g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(bodyArrays(B), 3));
  g.setIndex(new THREE.BufferAttribute(indexArray(), 1));
  g.computeVertexNormals();
  const mid = Math.floor(NX / 2) * RING + HALF - 1; // крыша: нормаль должна смотреть вверх
  if (g.attributes.normal.getY(mid) < 0) { const n = g.attributes.normal.array; for (let i = 0; i < n.length; i++) n[i] = -n[i]; }
  const pos = g.attributes.position.array, nrm = g.attributes.normal.array; g.dispose();
  return (CACHE[id] = { pos, nrm, B, mask: maskOf(B) });
}
function maskOf(B) {
  const V = (a, b, c, d) => new THREE.Vector4(a, b, c, d);
  return { uDim: V(B.L2, B.AX, B.WR, B.ARCH), uBelt: V(...B.belt), uGlass: V(...B.glass), uSeam: V(...B.seam), uLamp: V(...B.lamp), uLow: V(...B.low), uMisc: V(B.misc[0], B.misc[1], B.misc[2], B.HW) };
}

/* ---------------------------------------------------------------- материал кузова: лак, стёкла, пластик, фары, зазоры и плёнка в одном шейдере */
const GLSL_HEAD = /* glsl */`
uniform float uSel[10]; uniform float uCov[10]; uniform float uAnimZ[10];
uniform float uSweep; uniform float uShow; uniform float uPulse; uniform float uHover; uniform float uZoneO;
uniform vec3 uAccent; uniform vec3 uColA; uniform vec3 uColA2; uniform vec3 uColB; uniform vec3 uColB2;
uniform vec4 uFinA; uniform vec4 uFinB; uniform float uShA; uniform float uShB; uniform float uWrap;
uniform vec4 uDim; uniform vec4 uBelt; uniform vec4 uGlass; uniform vec4 uSeam; uniform vec4 uLamp; uniform vec4 uLow; uniform vec4 uMisc;
varying vec3 vObj; varying vec3 vObjN;
float beltY(float x){ return mix(uBelt.x, uBelt.y, clamp((uBelt.z - x) / (uBelt.z - uBelt.w), 0.0, 1.0)); }
float lineM(float d, float w){ return 1.0 - smoothstep(w * 0.5, w, abs(d)); }
float zoneId(vec3 p, vec3 n){
  if (uZoneO > -0.5) return uZoneO;
  float hw = uMisc.w;
  if (n.y > 0.83 && p.y > uGlass.z) return 8.0;
  if (p.x > uLamp.z && n.x > 0.35) return (p.y > uLamp.x - 0.086 && p.y < uLamp.x + 0.054 && abs(p.z) > 0.32 * hw) ? 2.0 : 3.0;
  if (p.x < uLamp.w && n.x < -0.35) return 7.0;
  if (n.y > 0.45 && p.x > uSeam.w) return 0.0;
  if (p.x > uSeam.x) return 1.0;
  if (p.x < uSeam.z) return 6.0;
  if (p.y < uGlass.w) return 4.0;
  return 5.0;
}
`;
const GLSL_MAIN = /* glsl */`
vec3 P = vObj; vec3 N = normalize(vObjN);
float belt = beltY(P.x), hw = uMisc.w;
float NdV = clamp(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0);
float fres = pow(1.0 - NdV, 2.0);
float isPart = step(-0.5, uZoneO);
float wc = step(uWrap, P.x);
vec3 cA = mix(uColA, uColA2, uShA * smoothstep(0.0, 1.0, fres * 1.8));
vec3 cB = mix(uColB, uColB2, uShB * smoothstep(0.0, 1.0, fres * 1.8));
vec3 sCol = mix(cA, cB, wc);
vec4 fin = mix(uFinA, uFinB, wc);
float sRough = fin.x, sMetal = fin.y, sCoat = fin.z, sCoatR = fin.w;
float zf = zoneId(P, N); int zi = int(zf + 0.5);
float sel = uSel[zi], cov = uCov[zi], an = uAnimZ[zi];
float covN = max(cov, an * step(uSweep, P.x));
sCoat = max(sCoat, covN); sCoatR = mix(sCoatR, 0.012, covN); sRough = mix(sRough, sRough * 0.8, covN);
float edge = an * lineM(P.x - uSweep, 0.034);
float wet = an * step(uSweep, P.x) * (1.0 - smoothstep(0.0, 0.32, P.x - uSweep));
float over = uShow * sel * (1.0 - covN) * (0.24 + 0.12 * uPulse);
float hov = uShow * (1.0 - step(0.5, abs(uHover - zf)));
vec3 ppfE = uAccent * (over * 0.18 + edge * 2.8 + wet * 0.14 + uShow * covN * fres * 0.03 + hov * 0.07);
float wEdge = lineM(P.x - uWrap, 0.034) * step(-uDim.x - 0.25, uWrap) * step(uWrap, uDim.x + 0.25);
float roof = smoothstep(0.78, 0.88, N.y) * step(uGlass.z, P.y);
float glass = step(belt + 0.012, P.y) * step(P.x, uGlass.x) * step(uGlass.y, P.x) * (1.0 - roof) * (1.0 - isPart);
float chromeS = lineM(P.y - (belt + 0.005), 0.014) * step(0.55, abs(N.z)) * step(P.x, uSeam.x + 0.01) * step(uGlass.y + 0.05, P.x) * (1.0 - isPart);
float dF = length(vec2(P.x - uDim.y, P.y - uDim.z)), dR = length(vec2(P.x + uDim.y, P.y - uDim.z));
float flare = (step(dF, uDim.w + 0.065) + step(dR, uDim.w + 0.065)) * step(P.y, uMisc.y);
float trim = clamp(flare + smoothstep(-0.35, -0.6, N.y) + step(uLamp.z - 0.04, P.x) * step(P.y, uLow.z) + step(P.x, uLamp.w + 0.07) * step(P.y, uLow.w) + step(P.y, uMisc.x), 0.0, 1.0) * (1.0 - isPart);
float front = step(uLamp.z + 0.01, P.x) * step(0.3, N.x) * (1.0 - isPart);
float rear = step(P.x, uLamp.w) * step(N.x, -0.3) * (1.0 - isPart);
float gm = front * step(uLow.x, P.y) * step(P.y, uLow.y) * step(abs(P.z), uMisc.z) * (1.0 - trim);
float slat = step(0.55, fract(P.y * 38.0));
float headU = front * step(uLamp.x - 0.066, P.y) * step(P.y, uLamp.x + 0.034) * step(0.537 * hw, abs(P.z));
float tailU = rear * step(uLamp.y - 0.056, P.y) * step(P.y, uLamp.y + 0.044) * step(0.62 * hw, abs(P.z));
float hu = max(headU, tailU) * (1.0 - trim);
float lightBar = front * lineM(P.y - uLamp.x, 0.02) * step(abs(P.z), 0.925 * hw);
float tailBar = rear * lineM(P.y - uLamp.y, 0.028) * step(abs(P.z), 0.925 * hw);
float side = step(0.5, abs(N.z)), topS = step(0.5, N.y), hz = 0.774 * hw;
float gaps = side * step(uGlass.w, P.y) * step(P.y, belt) * (lineM(P.x - uSeam.x, 0.007) + lineM(P.x - uSeam.y, 0.007) + lineM(P.x - uSeam.z, 0.007));
gaps += side * lineM(P.y - uGlass.w, 0.007) * step(uSeam.z, P.x) * step(P.x, uSeam.x);
gaps += topS * step(P.y, belt + 0.06) * (lineM(P.x - (uLamp.z + 0.06), 0.007) * step(abs(P.z), hz) + lineM(P.x - (uSeam.w + 0.12), 0.007) * step(abs(P.z), hz + 0.02) + lineM(abs(P.z) - hz, 0.007) * step(uSeam.w + 0.12, P.x) * step(P.x, uLamp.z + 0.06));
gaps += rear * lineM(P.y - (uLamp.y - 0.166), 0.007) * step(abs(P.z), 0.86 * hw);
gaps = clamp(gaps, 0.0, 1.0) * (1.0 - glass) * (1.0 - trim) * (1.0 - isPart);
float paintM = (1.0 - glass) * (1.0 - trim) * (1.0 - chromeS) * (1.0 - gm) * (1.0 - hu);
float ppfSurf = paintM + hu * (1.0 - step(0.5, abs(zf - 2.0)));
sCol *= 1.0 - 0.85 * gaps; sCoat *= 1.0 - gaps;
sCol = mix(sCol, vec3(0.012, 0.014, 0.017), glass); sRough = mix(sRough, 0.05, glass); sMetal = mix(sMetal, 0.0, glass); sCoat = mix(sCoat, 1.0, glass); sCoatR = mix(sCoatR, 0.02, glass);
sCol = mix(sCol, vec3(0.8, 0.82, 0.85), chromeS); sMetal = mix(sMetal, 1.0, chromeS); sRough = mix(sRough, 0.12, chromeS); sCoat = mix(sCoat, 0.0, chromeS);
sCol = mix(sCol, vec3(0.017, 0.018, 0.02), trim); sRough = mix(sRough, 0.62, trim); sMetal = mix(sMetal, 0.0, trim); sCoat = mix(sCoat, 0.0, trim);
sCol = mix(sCol, vec3(0.008) + slat * 0.02, gm); sRough = mix(sRough, mix(0.22, 0.5, slat), gm); sMetal = mix(sMetal, 0.25, gm); sCoat = mix(sCoat, 0.7 * (1.0 - slat), gm);
sCol = mix(sCol, vec3(0.02), hu); sCoat = mix(sCoat, 1.0, hu); sRough = mix(sRough, 0.1, hu); sMetal = mix(sMetal, 0.0, hu);
sCol = mix(sCol, uAccent * 0.5, over * ppfSurf);
vec3 sEmis = ppfE * ppfSurf + uAccent * wEdge * 2.6 * paintM;
sEmis += vec3(0.85, 0.95, 1.0) * 3.4 * (lightBar + headU * lineM(P.y - (uLamp.x - 0.046), 0.012));
sEmis += vec3(1.0, 0.05, 0.03) * 2.8 * (tailBar + tailU * 0.45);
diffuseColor.rgb = sCol;
`;

/* ---------------------------------------------------------------- бокс: окружение для отражений (три света: бокс, день, вечер) */
function envScene(kind) {
  const env = new THREE.Scene(), C = (r, g, b, k) => new THREE.Color(r, g, b).multiplyScalar(k);
  const wall = { box: C(0.04, 0.045, 0.055, 1), day: C(0.55, 0.6, 0.66, 1), dusk: C(0.09, 0.05, 0.07, 1) }[kind];
  env.add(new THREE.Mesh(new THREE.BoxGeometry(26, 10, 26), new THREE.MeshBasicMaterial({ color: wall, side: THREE.BackSide })));
  const add = (geo, color, x, y, z, rx = 0, ry = 0) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m); };
  if (kind !== 'day') {
    const R = 1.15, ring = new THREE.RingGeometry(R * 0.9, R, 6, 1); ring.rotateX(Math.PI / 2); ring.rotateY(Math.PI / 6);
    const k = kind === 'box' ? 5 : 1.4, dx = Math.sqrt(3) * R, dz = 1.5 * R;
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) add(ring, C(1, 1, 1, k), i * dx + (j & 1 ? dx / 2 : 0), 3.9, j * dz);
  }
  if (kind === 'box') { add(new THREE.PlaneGeometry(9, 0.7), C(1, 1, 1, 2.6), 0, 1.5, 6.2); add(new THREE.PlaneGeometry(9, 0.7), C(1, 1, 1, 2.6), 0, 1.5, -6.2); add(new THREE.PlaneGeometry(0.6, 2.4), C(1, 1, 1, 1.2), 7.5, 1.3, 0, 0, Math.PI / 2); add(new THREE.PlaneGeometry(0.6, 2.4), C(1, 1, 1, 0.8), -7.5, 1.3, 0, 0, Math.PI / 2); }
  if (kind === 'day') { add(new THREE.PlaneGeometry(26, 26), C(1, 1, 1, 2.2), 0, 4.9, 0, Math.PI / 2); add(new THREE.PlaneGeometry(26, 3), C(0.75, 0.82, 0.9, 1.6), 0, 2, -12.9); add(new THREE.PlaneGeometry(26, 3), C(0.75, 0.82, 0.9, 1.6), 0, 2, 12.9); }
  if (kind === 'dusk') { add(new THREE.PlaneGeometry(20, 1.4), C(1, 0.45, 0.18, 3.2), 0, 1.0, -12.9); add(new THREE.PlaneGeometry(20, 2.2), C(0.45, 0.2, 0.42, 1.1), 0, 3.2, 12.9); }
  return env;
}
function gradTex(stops, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function buildWheel(caliperMat) {
  const g = new THREE.Group(), std = (color, roughness, metalness, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness, metalness }, extra));
  const prof = [[0.238, -0.112], [0.29, -0.118], [0.335, -0.116], [0.358, -0.1], [0.366, -0.07], [0.368, 0], [0.366, 0.07], [0.358, 0.1], [0.335, 0.116], [0.29, 0.118], [0.238, 0.112]].map(([r, h]) => new THREE.Vector2(r, h));
  const tyre = new THREE.LatheGeometry(prof, 64); tyre.rotateX(Math.PI / 2); g.add(new THREE.Mesh(tyre, std(0x0f1012, 0.88, 0)));
  const shape = new THREE.Shape(); shape.absarc(0, 0, 0.236, 0, Math.PI * 2, false);
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, w = 0.2, h = new THREE.Path(); h.absarc(0, 0, 0.205, a - w, a + w, false); h.absarc(0, 0, 0.086, a + w * 0.5, a - w * 0.5, true); h.closePath(); shape.holes.push(h); }
  const rim = new THREE.ExtrudeGeometry(shape, { depth: 0.028, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2, curveSegments: 36 }); rim.translate(0, 0, 0.062);
  g.add(new THREE.Mesh(rim, std(0x23272c, 0.3, 0.85)));
  const lip = new THREE.TorusGeometry(0.234, 0.006, 8, 72); lip.translate(0, 0, 0.098); g.add(new THREE.Mesh(lip, std(0xcfd4da, 0.12, 1)));
  const barrel = new THREE.CylinderGeometry(0.236, 0.236, 0.2, 40, 1, true); barrel.rotateX(Math.PI / 2); g.add(new THREE.Mesh(barrel, std(0x0b0c0e, 0.7, 0, { side: THREE.DoubleSide })));
  const disc = new THREE.CylinderGeometry(0.175, 0.175, 0.026, 40); disc.rotateX(Math.PI / 2); g.add(new THREE.Mesh(disc, std(0x5d6268, 0.42, 0.9)));
  const cal = new THREE.BoxGeometry(0.07, 0.15, 0.065); cal.translate(-0.135, 0.07, 0.02); cal.rotateZ(0.5); g.add(new THREE.Mesh(cal, caliperMat));
  const cap = new THREE.CylinderGeometry(0.045, 0.045, 0.012, 28); cap.rotateX(Math.PI / 2); cap.translate(0, 0, 0.1); g.add(new THREE.Mesh(cap, std(0x0c0d0f, 0.2, 0.6)));
  return g;
}
function logoTexture(onReady) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * img.height / img.width || 578);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; onReady(t, c.height / c.width);
  };
  img.src = new URL('../img/logo.svg', import.meta.url).href;
}

/* ---------------------------------------------------------------- сцена */
export async function mount(host, initial = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, coarse = matchMedia('(pointer: coarse)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'c3d-canvas'; canvas.setAttribute('aria-label', 'Машина в 3D: потяните, чтобы повернуть, нажмите на деталь, чтобы выбрать её'); canvas.setAttribute('role', 'img');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
  catch (e) { throw new Error('webgl'); }
  host.appendChild(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.75 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.autoClear = false;
  const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer), envs = {};
  const BG = { box: 0x05070a, day: 0x1a1f25, dusk: 0x140e10 };
  scene.fog = new THREE.Fog(BG.box, 11, 26);
  const envFor = kind => envs[kind] || (envs[kind] = pmrem.fromScene(envScene(kind), 0.02).texture);

  const S = { mode: 'ppf', body: 'k', zones: [], paint: { hex: '#0e5e48', finish: 'gloss' }, light: 'box', accent: '#a6e01e', onZone: null };
  const U = {
    uSel: { value: new Array(10).fill(0) }, uCov: { value: new Array(10).fill(0) }, uAnimZ: { value: new Array(10).fill(0) },
    uSweep: { value: 99 }, uShow: { value: 1 }, uPulse: { value: 0.5 }, uHover: { value: -1 }, uAccent: { value: new THREE.Color(S.accent) },
    uColA: { value: new THREE.Color(FACTORY.hex) }, uColA2: { value: new THREE.Color(FACTORY.hex2) }, uFinA: { value: new THREE.Vector4(...FACTORY.fin.slice(0, 4)) }, uShA: { value: 0 },
    uColB: { value: new THREE.Color(FACTORY.hex) }, uColB2: { value: new THREE.Color(FACTORY.hex2) }, uFinB: { value: new THREE.Vector4(...FACTORY.fin.slice(0, 4)) }, uShB: { value: 0 }, uWrap: { value: 99 },
    uDim: { value: new THREE.Vector4() }, uBelt: { value: new THREE.Vector4() }, uGlass: { value: new THREE.Vector4() }, uSeam: { value: new THREE.Vector4() }, uLamp: { value: new THREE.Vector4() }, uLow: { value: new THREE.Vector4() }, uMisc: { value: new THREE.Vector4() }
  };
  const MASKS = ['uDim', 'uBelt', 'uGlass', 'uSeam', 'uLamp', 'uLow', 'uMisc'];
  const patch = (mat, zoneO) => {
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U, { uZoneO: { value: zoneO } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj; varying vec3 vObjN;')
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvObjN = objectNormal;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = transformed;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GLSL_HEAD)
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + GLSL_MAIN)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = sRough;')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = sMetal;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = sEmis;')
        .replace('#include <lights_physical_fragment>', THREE.ShaderChunk.lights_physical_fragment.replace('material.clearcoat = clearcoat;', 'material.clearcoat = sCoat;').replace('material.clearcoatRoughness = clearcoatRoughness;', 'material.clearcoatRoughness = sCoatR;'));
    };
    mat.customProgramCacheKey = () => 'ask-car3d';
    return mat;
  };
  const paintMat = () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.15 });
  const bodyMat = patch(paintMat(), -1), mirrorMat = patch(paintMat(), 9);
  const caliperMat = new THREE.MeshStandardMaterial({ color: S.accent, roughness: 0.38, metalness: 0.1 });

  // машина и поворотный круг вращаются вместе; отражение — та же машина, отражённая под полом
  const turn = new THREE.Group(), car = new THREE.Group(); scene.add(turn); turn.add(car);
  const geo = new THREE.BufferGeometry(), start = bodyData(initial.body || 'k');
  geo.setAttribute('position', new THREE.BufferAttribute(start.pos.slice(), 3)); geo.setAttribute('normal', new THREE.BufferAttribute(start.nrm.slice(), 3)); geo.setIndex(new THREE.BufferAttribute(indexArray(), 1));
  const body = new THREE.Mesh(geo, bodyMat); car.add(body);
  // зеркала: геометрия сразу в координатах машины, при смене кузова сдвигаются
  const mirrorParts = [], mirrorGlass = new THREE.MeshStandardMaterial({ color: 0x0a0c0f, roughness: 0.04, metalness: 0.9, side: THREE.DoubleSide });
  for (const s of [1, -1]) {
    const h = new THREE.SphereGeometry(1, 30, 18); h.scale(0.13, 0.068, 0.115); h.translate(0, 0, s * 0.01);
    const st = new THREE.BoxGeometry(0.09, 0.04, 0.16); st.translate(0.02, -0.03, -s * 0.09);
    const gl = new THREE.CircleGeometry(1, 32); gl.scale(0.1, 0.052, 1); gl.rotateY(-Math.PI / 2); gl.translate(-0.112, 0, s * 0.015);
    for (const [g, m, pick] of [[h, mirrorMat, 1], [st, mirrorMat, 1], [gl, mirrorGlass, 0]]) {
      const mesh = new THREE.Mesh(g, m); mesh.userData = { base: g.attributes.position.array.slice(), side: s, pick }; car.add(mesh); mirrorParts.push(mesh);
    }
  }
  const wheels = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => { const w = buildWheel(caliperMat); w.userData = { sx, sz }; if (sz < 0) w.rotation.y = Math.PI; car.add(w); return w; });

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x040507, roughness: 0.3, metalness: 0, transparent: true, opacity: 0.8, envMapIntensity: 0.18 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 72), floorMat); floor.rotation.x = -Math.PI / 2; floor.renderOrder = 1; scene.add(floor);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ map: gradTex([[0, 'rgba(255,255,255,0.07)'], [0.5, 'rgba(255,255,255,0.02)'], [1, 'rgba(255,255,255,0)']]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.003; pool.renderOrder = 2; scene.add(pool);
  const shTex = gradTex([[0, 'rgba(0,0,0,0.85)'], [0.55, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.035; shadow.renderOrder = 3; turn.add(shadow);
  // поворотный круг: тёмный диск с тонким светящимся кольцом цвета акцента
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.03, 96), new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.35, metalness: 0.2, envMapIntensity: 0.4 }));
  disc.position.y = 0.015; turn.add(disc);
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(S.accent).multiplyScalar(1.6) });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.012, 8, 160), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.031; turn.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.04, 0.004, 6, 160), new THREE.MeshBasicMaterial({ color: 0x2a3036 })); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.032; turn.add(ring2);
  // стены бокса: вертикальные светодиодные полосы, шестигранные лампы под потолком, логотип на стене
  const studio = new THREE.Group(); scene.add(studio);
  const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(1.3) });
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.2, 0.03), stripMat); m.position.set(Math.cos(a) * 10.5, 1.4, Math.sin(a) * 10.5); studio.add(m); }
  const hexMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(1.6), side: THREE.DoubleSide });
  const hx = new THREE.RingGeometry(1.0, 1.08, 6, 1); hx.rotateX(Math.PI / 2); hx.rotateY(Math.PI / 6);
  for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const m = new THREE.Mesh(hx, hexMat); m.position.set(i * Math.sqrt(3) * 1.08 + (j & 1 ? Math.sqrt(3) * 0.54 : 0), 4.6, j * 1.62); studio.add(m); }
  logoTexture((tex, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6 * k), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.92 }));
    const a = 0.92 + Math.PI; m.position.set(Math.sin(a) * 9.8, 1.25, Math.cos(a) * 9.8); m.lookAt(0, 1.25, 0); studio.add(m);
  });

  // слой 1 — машина: она же рисуется отражённой под полом
  car.traverse(o => o.layers.enable(1));

  /* ---------- состояние: кузов, цвет, плёнка, свет ---------- */
  let morph = null, curBody = start.B ? (initial.body || 'k') : 'k', bodyFrom = start, bodyTo = start, bodyK = 1;
  const tmpPos = geo.attributes.position.array, tmpNrm = geo.attributes.normal.array;
  const lerpV4 = (out, a, b, t) => out.set(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t), lerp(a.w, b.w, t));
  let curShape = { L2: start.B.L2, H: start.B.top.reduce((m, p) => Math.max(m, p[1]), 0) };
  function applyBody(t) {
    const A = bodyFrom, B = bodyTo;
    if (t >= 1) { tmpPos.set(B.pos); tmpNrm.set(B.nrm); }
    else for (let i = 0; i < tmpPos.length; i++) { tmpPos[i] = lerp(A.pos[i], B.pos[i], t); tmpNrm[i] = lerp(A.nrm[i], B.nrm[i], t); }
    geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; geo.computeBoundingSphere();
    MASKS.forEach(k => lerpV4(U[k].value, A.mask[k], B.mask[k], t));
    const a = A.B, b = B.B, L = (k) => lerp(a[k], b[k], t);
    const AX = L('AX'), WR = L('WR'), track = L('track'), HW = L('HW');
    wheels.forEach(w => { w.position.set(w.userData.sx * AX, WR, w.userData.sz * track); w.scale.setScalar(WR / 0.365); });
    const mx = lerp(a.glass[0], b.glass[0], t) - 0.13, my = lerp(a.belt[0], b.belt[0], t) + 0.075, mz = HW * 0.905 + 0.17;
    mirrorParts.forEach(m => { const p = m.geometry.attributes.position, base = m.userData.base, s = m.userData.side; for (let i = 0; i < p.count; i++) { p.array[i * 3] = base[i * 3] + mx; p.array[i * 3 + 1] = base[i * 3 + 1] + my; p.array[i * 3 + 2] = base[i * 3 + 2] + s * mz; } p.needsUpdate = true; m.geometry.computeBoundingSphere(); });
    const L2 = L('L2'); shadow.scale.set(L2 * 2.5, HW * 2.9, 1);
    curShape = { L2, H: lerp(a.top.reduce((m, p) => Math.max(m, p[1]), 0), b.top.reduce((m, p) => Math.max(m, p[1]), 0), t) };
    fit();
  }
  function setBody(id) {
    if (!BODIES[id] || id === curBody) return;
    bodyFrom = { pos: tmpPos.slice(), nrm: tmpNrm.slice(), B: bodyTo.B, mask: Object.fromEntries(MASKS.map(k => [k, U[k].value.clone()])) };
    bodyTo = bodyData(id); curBody = id;
    morph = { t0: performance.now(), ms: reduce ? 1 : 900 };
  }
  const setPaint = (pfx, p) => {
    const f = p.fin || FIN[p.finish] || FIN.gloss;
    U['uCol' + pfx].value.set(p.hex); U['uCol' + pfx + '2'].value.set(p.hex2 || p.hex);
    U['uFin' + pfx].value.set(f[0], f[1], f[2], f[3]); U['uSh' + pfx].value = f[4];
  };
  const samePaint = (a, b) => a && b && a.hex === b.hex && (a.hex2 || '') === (b.hex2 || '') && a.finish === b.finish;
  let wrapSweep = null, ppfSweep = null;
  function wrapTo(p) {
    U.uColA.value.copy(U.uColB.value); U.uColA2.value.copy(U.uColB2.value); U.uFinA.value.copy(U.uFinB.value); U.uShA.value = U.uShB.value;
    setPaint('B', p);
    if (reduce) { setPaint('A', p); U.uWrap.value = 99; return; }
    wrapSweep = { t0: performance.now(), ms: 1800, done: () => { setPaint('A', p); U.uWrap.value = 99; } };
  }
  let covered = new Set();
  function syncZones() {
    ZONES.forEach((z, i) => { U.uSel.value[i] = S.zones.includes(z) ? 1 : 0; U.uCov.value[i] = covered.has(z) && S.zones.includes(z) ? 1 : 0; });
    U.uShow.value = S.mode === 'ppf' ? 1 : 0;
  }
  function applyFilm() {
    if (S.mode !== 'ppf' || !S.zones.length) return;
    covered = new Set(); syncZones();
    S.zones.forEach(z => U.uAnimZ.value[ZI[z]] = 1);
    if (reduce) { S.zones.forEach(z => { covered.add(z); U.uAnimZ.value[ZI[z]] = 0; }); syncZones(); return; }
    ppfSweep = { t0: performance.now(), ms: 2400, done: () => { S.zones.forEach(z => { covered.add(z); U.uAnimZ.value[ZI[z]] = 0; }); U.uSweep.value = 99; syncZones(); } };
  }
  function setLight(kind) {
    if (!BG[kind]) return;
    S.light = kind; scene.environment = envFor(kind);
    renderer.setClearColor(BG[kind], 1); scene.fog.color.set(BG[kind]);
    studio.visible = kind !== 'day'; stripMat.color.setScalar(kind === 'dusk' ? 0.7 : 1.3);
  }
  function setAccent(hex) { S.accent = hex; U.uAccent.value.set(hex); caliperMat.color.set(hex); ringMat.color.set(hex).multiplyScalar(1.6); }
  function set(p = {}) {
    if (p.onZone) S.onZone = p.onZone;
    if (p.accent && p.accent !== S.accent) setAccent(p.accent);
    if (p.light && p.light !== S.light) setLight(p.light);
    if (p.mode) S.mode = p.mode;
    if (p.zones) { S.zones = [...p.zones]; for (const z of [...covered]) if (!S.zones.includes(z)) covered.delete(z); }
    if (p.body) setBody(p.body);
    if (p.paint) S.paint = { ...p.paint };
    if (S.mode === 'wrap' && !samePaint(S.paint, S.shown)) { wrapTo(S.paint); S.shown = { ...S.paint }; }
    syncZones(); wake();
  }

  /* ---------- камера: поворот мышью или пальцем по горизонтали; вертикальный свайп на телефоне листает страницу ---------- */
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80), target = new THREE.Vector3(0, 0.62, 0);
  const view = { az: 0.92, polar: 1.25, dist: 9 };
  let W = 1, H = 1;
  function fit() {
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), half = 2.45 * 1.1 + 0.35;
    view.dist = Math.max(half / (t * (W / H)), (1.86 * 0.62 + 0.55) / t);
    target.y = 0.36 * curShape.H + 0.04;
  }
  function placeCamera() { camera.position.setFromSpherical(new THREE.Spherical(view.dist, view.polar, view.az)).add(target); camera.lookAt(target); }
  function resize() {
    W = Math.max(1, host.clientWidth); H = Math.max(1, host.clientHeight);
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); fit(); wake();
  }
  const ro = new ResizeObserver(resize); ro.observe(host);
  canvas.style.touchAction = 'pan-y';
  let drag = null, velo = 0, idleUntil = 0;
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), picks = [body, ...mirrorParts.filter(m => m.userData.pick)];
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    car.updateMatrixWorld(); ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(picks, false)[0]; if (!hit) return -1;
    if (hit.object !== body) return 9;
    const p = car.worldToLocal(hit.point.clone()), n = hit.face.normal; return zoneOf(p, n);
  }
  function zoneOf(p, n) {
    const v = k => U[k].value, hw = v('uMisc').w, belt = lerp(v('uBelt').x, v('uBelt').y, Math.min(1, Math.max(0, (v('uBelt').z - p.x) / (v('uBelt').z - v('uBelt').w))));
    if (n.y > 0.83 && p.y > v('uGlass').z) return 8;
    if (p.y > belt + 0.012 && p.x < v('uGlass').x && p.x > v('uGlass').y) return -1;
    if (p.x > v('uLamp').z && n.x > 0.35) return (p.y > v('uLamp').x - 0.086 && p.y < v('uLamp').x + 0.054 && Math.abs(p.z) > 0.32 * hw) ? 2 : 3;
    if (p.x < v('uLamp').w && n.x < -0.35) return 7;
    if (n.y > 0.45 && p.x > v('uSeam').w) return 0;
    if (p.x > v('uSeam').x) return 1;
    if (p.x < v('uSeam').z) return 6;
    if (p.y < v('uGlass').w) return 4;
    return 5;
  }
  const onDown = e => { drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, id: e.pointerId, type: e.pointerType }; velo = 0; idleUntil = performance.now() + 6000; wake(); };
  const onMove = e => {
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
      if (drag.moved > 4 && canvas.setPointerCapture && !drag.cap) { try { canvas.setPointerCapture(e.pointerId); drag.cap = true; } catch (_) {} }
      velo = -dx * 0.008; turn.rotation.y -= dx * 0.008;
      if (drag.type === 'mouse') view.polar = Math.min(1.48, Math.max(0.98, view.polar - dy * 0.004));
      idleUntil = performance.now() + 6000; wake(); return;
    }
    if (e.pointerType === 'mouse' && S.mode === 'ppf') { const z = pick(e); U.uHover.value = z; canvas.style.cursor = z >= 0 ? 'pointer' : 'grab'; wake(); }
  };
  const onUp = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const click = drag.moved < 7 && performance.now() - drag.t < 450; drag = null;
    if (click && S.mode === 'ppf' && S.onZone) { const z = pick(e); if (z >= 0) S.onZone(ZONES[z]); }
  };
  canvas.addEventListener('pointerdown', onDown); addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('pointerleave', () => { U.uHover.value = -1; wake(); });

  /* ---------- цикл: рисуем, только пока сцена видна ---------- */
  let visible = true, running = false, lastT = performance.now();
  const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) wake(); }, { threshold: 0.01 });
  io.observe(host);
  function wake() { if (!running && visible) { running = true; lastT = performance.now(); requestAnimationFrame(frame); } }
  function frame(now) {
    if (!visible || destroyed) { running = false; return; }
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (morph) { const k = Math.min(1, (now - morph.t0) / morph.ms); applyBody(ease(k)); if (k >= 1) morph = null; }
    const L = U.uDim.value.x + 0.2;
    if (wrapSweep) { const k = Math.min(1, (now - wrapSweep.t0) / wrapSweep.ms); U.uWrap.value = lerp(L, -L, ease(k)); if (k >= 1) { const s = wrapSweep; wrapSweep = null; s.done(); } }
    if (ppfSweep) { const k = Math.min(1, (now - ppfSweep.t0) / ppfSweep.ms); U.uSweep.value = lerp(L, -L, ease(k)); if (k >= 1) { const s = ppfSweep; ppfSweep = null; s.done(); } }
    if (!drag && Math.abs(velo) > 0.0005) { turn.rotation.y += velo; velo *= 0.92; }
    const auto = !reduce && !drag && now > idleUntil;
    if (auto) turn.rotation.y += dt * 0.16;
    U.uPulse.value = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(now / 1000 * 2.4);
    placeCamera();
    renderer.clear();
    car.scale.y = -1; car.updateMatrixWorld(true); camera.layers.set(1); renderer.render(scene, camera);
    car.scale.y = 1; car.updateMatrixWorld(true); camera.layers.enableAll(); renderer.render(scene, camera);
    const busy = auto || morph || wrapSweep || ppfSweep || drag || Math.abs(velo) > 0.0005 || S.mode === 'ppf';
    if (busy) requestAnimationFrame(frame); else running = false;
  }

  let destroyed = false;
  function destroy() {
    destroyed = true; ro.disconnect(); io.disconnect();
    removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp);
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
    Object.values(envs).forEach(t => t.dispose()); pmrem.dispose(); renderer.dispose(); canvas.remove();
  }

  // начальное состояние
  applyBody(1);
  setLight(initial.light || 'box');
  if (initial.accent) setAccent(initial.accent);
  S.mode = initial.mode || 'ppf'; S.zones = [...(initial.zones || [])]; S.onZone = initial.onZone || null;
  if (initial.paint) S.paint = { ...initial.paint };
  if (initial.body && initial.body !== 'k') { bodyFrom = bodyTo = bodyData(initial.body); curBody = initial.body; applyBody(1); }
  if (S.mode === 'wrap') { setPaint('A', FACTORY); setPaint('B', FACTORY); wrapTo(S.paint); S.shown = { ...S.paint }; }
  syncZones(); resize();
  if (S.mode === 'ppf' && S.zones.length) setTimeout(applyFilm, 500);
  window.__car3d = { view, turn, applyFilm, set }; // для проверки поворотов
  return { set, applyFilm, destroy, resize, bodies: Object.fromEntries(Object.entries(BODIES).map(([k, b]) => [k, b.name])) };
}
