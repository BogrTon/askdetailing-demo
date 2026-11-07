/* Interior cleaning page: extractor pass over a seat, cabin map, carpet with road-salt stains */
(function () {
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const fit = cv => { const d = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; cv.width = Math.round(w * d); cv.height = Math.round(h * d); const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); return [x, w, h, d]; };
  const rr = (g, x0, y0, w0, h0, r) => { r = Math.min(r, w0 / 2, h0 / 2); g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x0 + w0, y0, x0 + w0, y0 + h0, r); g.arcTo(x0 + w0, y0 + h0, x0, y0 + h0, r); g.arcTo(x0, y0 + h0, x0, y0, r); g.arcTo(x0, y0, x0 + w0, y0, r); g.closePath(); };
  const nb = t => { let prev; do { prev = t; t = t.replace(/(^|[\s(«])([А-Яа-яЁё]{1,2})\s+/g, '$1$2 '); } while (t !== prev); return t.replace(/ —/g, ' —'); };

  let weave = null, tufts = null;
  const weaveTile = () => {
    if (weave) return weave;
    const c = document.createElement('canvas'); c.width = c.height = 6; const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 0, 3, 1); g.fillRect(3, 3, 3, 1);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 1, 1, 3); g.fillRect(3, 4, 1, 2);
    return (weave = c);
  };
  const tuftTile = () => {
    if (tufts) return tufts;
    const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d'), R = rng(7);
    for (let i = 0; i < 520; i++) {
      const px = R() * 48, py = R() * 48, a = R() * Math.PI;
      g.strokeStyle = R() < .5 ? `rgba(255,255,255,${(.04 + R() * .08).toFixed(3)})` : `rgba(0,0,0,${(.08 + R() * .12).toFixed(3)})`;
      g.lineWidth = .8; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * 2.2, py + Math.sin(a) * 2.2); g.stroke();
    }
    return (tufts = c);
  };

  /* ---------- hero: the extractor cleans the seat insert pass by pass ---------- */
  function extractor(sec) {
    const track = sec.querySelector('.dr-track'), st = sec.querySelector('.dr-sticky'), stage = sec.querySelector('.dr-stage'), cv = stage.querySelector('canvas'), pct = sec.querySelector('[data-dr="pct"]');
    const PASSES = 8;
    let x, w = 0, h = 0, dpr = 1, dirty, clean, geo, p = reduce() ? .55 : 0;
    const dirt = (g, ix, iy, iw, ih) => {
      const R = rng(111);
      g.fillStyle = 'rgba(120,100,70,.2)'; g.fillRect(ix, iy, iw, ih);
      for (let k = 0; k < 4; k++) {
        const cx = ix + iw * (.15 + R() * .7), cy = iy + ih * (.2 + R() * .6), r = Math.min(iw, ih) * (.08 + R() * .1), rot = R() * 3;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r * 1.2); gr.addColorStop(0, 'rgba(85,55,25,.42)'); gr.addColorStop(.75, 'rgba(85,55,25,.25)'); gr.addColorStop(1, 'rgba(85,55,25,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, r * 1.2, r, rot, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(60,38,15,.35)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, cy, r * 1.15, r * .95, rot, 0, Math.PI * 2); g.stroke();
      }
      for (let k = 0; k < 3; k++) { const cx = ix + iw * (.2 + R() * .6), cy = iy + ih * (.8 + R() * .12); g.strokeStyle = 'rgba(235,233,222,.38)'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, iw * .09, ih * .05, 0, 0, Math.PI * 2); g.stroke(); }
      for (let i = 0; i < 420; i++) { g.fillStyle = R() < .5 ? 'rgba(225,212,185,.45)' : 'rgba(25,20,15,.35)'; const s = .8 + R() * 1.8; g.fillRect(ix + R() * iw, iy + R() * ih, s, s); }
    };
    const seat = (g, isClean) => {
      const { sx, sy, sw, sh, ix, iy, iw, ih } = geo;
      // тёмный бокс, сверху на сиденье светит лампа
      let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#121820'); gr.addColorStop(1, '#05080b'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      gr = g.createRadialGradient(w / 2, -h * .15, 0, w / 2, -h * .15, Math.max(w, h) * .85); gr.addColorStop(0, 'rgba(200,230,255,.2)'); gr.addColorStop(1, 'rgba(200,230,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      gr = g.createRadialGradient(sx + sw / 2, sy + sh, 0, sx + sw / 2, sy + sh, sw * .55); gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(sx + sw / 2, sy + sh, sw * .55, sh * .12, 0, 0, Math.PI * 2); g.fill();
      gr = g.createLinearGradient(0, sy, 0, sy + sh); gr.addColorStop(0, '#4a525b'); gr.addColorStop(1, '#2b3036'); g.fillStyle = gr; rr(g, sx, sy, sw, sh, sh * .2); g.fill();
      g.save(); rr(g, ix, iy, iw, ih, 18); g.clip();
      g.fillStyle = isClean ? '#59636e' : '#5e605d'; g.fillRect(ix, iy, iw, ih);
      g.fillStyle = g.createPattern(weaveTile(), 'repeat'); g.fillRect(ix, iy, iw, ih);
      for (let i = 1; i < 7; i++) { const cx = ix + iw * i / 7; g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(cx - 1.5, iy, 3, ih); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(cx + 1.5, iy, 1.5, ih); }
      gr = g.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.18)'); g.fillStyle = gr; g.fillRect(ix, iy, iw, ih);
      if (!isClean) dirt(g, ix, iy, iw, ih);
      g.restore();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; rr(g, ix, iy, iw, ih, 18); g.stroke();
      g.setLineDash([4, 5]); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; rr(g, ix + 5, iy + 5, iw - 10, ih - 10, 14); g.stroke(); g.setLineDash([]);
    };
    const build = () => {
      [x, w, h, dpr] = fit(cv); if (!w || !h) return;
      const sw = Math.min(w * (w < 600 ? .94 : .82), h * 2.2), sh = Math.min(h * .8, sw * .5), sx = (w - sw) / 2, sy = (h - sh) / 2 - h * .02;
      geo = { sx, sy, sw, sh, ix: sx + sw * .13, iw: sw * .74, iy: sy + sh * .1, ih: sh * .8 };
      const mk = isClean => { const c = document.createElement('canvas'); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); seat(g, isClean); return c; };
      dirty = mk(false); clean = mk(true);
    };
    const nozzle = (nx, ny, pw) => {
      const nw = pw * 1.15, nh = Math.max(10, pw * .22);
      const g = x.createRadialGradient(nx, ny, 0, nx, ny, nw); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.ellipse(nx, ny, nw * .9, nh * 2.4, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#2a3036'; x.lineWidth = Math.max(4, pw * .12); x.lineCap = 'round'; x.beginPath(); x.moveTo(nx, ny - nh / 2); x.lineTo(nx + pw * .25, ny - nh * 5); x.stroke();
      x.fillStyle = '#20252b'; rr(x, nx - nw / 2, ny - nh / 2, nw, nh, nh / 2); x.fill();
      x.fillStyle = 'rgba(255,255,255,.35)'; rr(x, nx - nw / 2 + 3, ny - nh / 2 + 2, nw - 6, nh * .3, nh * .15); x.fill();
    };
    const draw = () => {
      if (!w || !dirty) return;
      x.clearRect(0, 0, w, h); x.drawImage(dirty, 0, 0, w, h);
      const { ix, iy, iw, ih } = geo, pw = iw / PASSES, k = p * PASSES;
      x.save(); x.beginPath();
      for (let i = 0; i < PASSES; i++) { const f = clamp(k - i, 0, 1); if (f <= 0) break; const hh = ih * f; x.rect(ix + i * pw - 1, i % 2 === 0 ? iy : iy + ih - hh, pw + 2, hh); }
      x.clip(); x.drawImage(clean, 0, 0, w, h); x.restore();
      if (p > 0 && p < 1) { const i = Math.min(PASSES - 1, Math.floor(k)), f = clamp(k - i, 0, 1); nozzle(ix + i * pw + pw / 2, i % 2 === 0 ? iy + ih * f : iy + ih - ih * f, pw); }
      pct.textContent = Math.round(p * 100);
    };
    new ResizeObserver(() => { build(); draw(); }).observe(stage);
    if (reduce()) return;
    track.classList.add('on');
    let tick = false;
    const upd = () => {
      tick = false;
      const r = track.getBoundingClientRect(), top = parseFloat(getComputedStyle(st).top) || 0, total = r.height - st.offsetHeight;
      const raw = total > 0 ? clamp((top - r.top) / total, 0, 1) : 1;
      p = clamp((raw - .04) / .86, 0, 1); draw();
    };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener('resize', upd); upd();
  }

  /* ---------- cabin map ---------- */
  function imap(root) {
    const chips = [...root.querySelectorAll('.imap-chips .chip')], zones = [...root.querySelectorAll('.iz')];
    const title = root.querySelector('[data-info="title"]'), text = root.querySelector('[data-info="text"]'), data = {};
    root.querySelector('#imapData').content.querySelectorAll('p').forEach(p => { data[p.dataset.z] = { t: p.dataset.t, d: nb(p.textContent.trim()) }; });
    const show = z => {
      chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.zone === z)));
      zones.forEach(g => g.classList.toggle('on', z === 'smell' || g.dataset.zone === z));
      if (data[z]) { title.textContent = data[z].t; text.textContent = data[z].d; }
    };
    chips.forEach(c => c.addEventListener('click', () => show(c.dataset.zone)));
    zones.forEach(g => { g.style.cursor = 'pointer'; g.addEventListener('click', () => show(g.dataset.zone)); });
    show('seats');
  }

  /* ---------- carpet with road-salt stains, before/after ---------- */
  function saltStain(x, cx, cy, r, R) {
    // a wavy outline: random radii, smoothed twice, drawn with curves through midpoints
    const n = 24; let rad = []; for (let i = 0; i < n; i++) rad.push(r * (.7 + R() * .5));
    for (let k = 0; k < 2; k++) rad = rad.map((v, i) => (rad[(i + n - 1) % n] + v * 2 + rad[(i + 1) % n]) / 4);
    const path = s => {
      const pt = i => { const a = i / n * Math.PI * 2, q = rad[(i + n) % n] * s; return [cx + Math.cos(a) * q * 1.3, cy + Math.sin(a) * q * .8]; };
      x.beginPath(); let [px, py] = pt(0), [qx, qy] = pt(1); x.moveTo((px + qx) / 2, (py + qy) / 2);
      for (let i = 1; i <= n; i++) { [px, py] = pt(i); [qx, qy] = pt(i + 1); x.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2); }
      x.closePath();
    };
    path(1); x.fillStyle = 'rgba(230,228,215,.13)'; x.fill();
    [1, .82, .63].forEach((s, j) => { path(s); x.strokeStyle = `rgba(240,238,225,${(.45 - j * .1).toFixed(2)})`; x.lineWidth = 2.2 - j * .5; x.stroke(); });
  }
  function drawCarpet(cv, before) {
    const [x, w, h] = fit(cv); if (!w) return;
    const R = rng(before ? 101 : 103);
    x.fillStyle = before ? '#36383a' : '#2a2e33'; x.fillRect(0, 0, w, h);
    x.fillStyle = x.createPattern(tuftTile(), 'repeat'); x.fillRect(0, 0, w, h);
    if (!before) { for (let i = 0; i < 10; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.04)'; x.fillRect(i * w / 10, 0, w / 10 + 1, h); } return; }
    x.fillStyle = 'rgba(150,140,120,.12)'; x.fillRect(0, 0, w, h);
    for (let k = 0; k < 6; k++) saltStain(x, R() * w, h * (.3 + R() * .62), Math.min(w, h) * (.08 + R() * .16), R);
    for (let i = 0; i < 900; i++) { x.fillStyle = R() < .6 ? `rgba(225,215,190,${(.15 + R() * .35).toFixed(2)})` : `rgba(20,18,15,${(.2 + R() * .3).toFixed(2)})`; const s = .6 + R() * 1.6; x.fillRect(R() * w, R() * h, s, s); }
  }
  function carpet(root) {
    const a = root.querySelector('canvas.after'), b = root.querySelector('canvas.before'), range = root.querySelector('.ba-range');
    range.addEventListener('input', () => root.style.setProperty('--pos', range.value + '%'));
    new ResizeObserver(() => { drawCarpet(a, false); drawCarpet(b, true); }).observe(root);
  }

  window.DryDraw = { drawCarpet };

  function init() {
    const run = (sel, fn) => { const el = document.querySelector(sel); if (el) try { fn(el); } catch (e) { console.error(e); } };
    run('.dr-hero', extractor); run('.imap', imap); run('.ba[data-draw="carpet"]', carpet);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
