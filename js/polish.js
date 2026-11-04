/* Polishing & ceramics page: inspection lamp, defect samples, polishing stages, water on coated paint */
(function () {
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const fit = cv => { const d = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; cv.width = Math.round(w * d); cv.height = Math.round(h * d); const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); return [x, w, h]; };
  const whenVisible = (el, cb) => new IntersectionObserver(es => cb(es[0].isIntersecting), { threshold: .05 }).observe(el);

  /* ---------- shared painting ---------- */
  function paint(x, w, h) { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#16202b'); g.addColorStop(1, '#04070a'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
  function ambient(x, w, h, cx, cy, a) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * .6); g.addColorStop(0, `rgba(150,170,195,${a})`); g.addColorStop(1, 'rgba(150,170,195,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
  const makeArcs = (seed, n) => { const R = rng(seed), out = []; for (let i = 0; i < n; i++) out.push([Math.pow(R(), .75), R() * Math.PI * 2, .03 + R() * .16, .08 + R() * .42, .5 + R() * .8]); return out; };
  // Swirl marks show up as rings around the light's reflection, so they are drawn around it.
  function swirls(x, cx, cy, s, maxR, arcs, k) {
    x.save(); x.translate(cx, cy); x.lineCap = 'round';
    for (const [rn, a, span, al, lw] of arcs) {
      const rr = s * 2.2 + rn * maxR, fall = Math.max(0, 1 - rr / maxR), alpha = al * fall * fall * k;
      if (alpha < .012) continue;
      x.strokeStyle = `rgba(226,236,248,${alpha.toFixed(3)})`; x.lineWidth = lw; x.beginPath(); x.arc(0, 0, rr, a, a + span); x.stroke();
    }
    x.restore();
  }
  function lampSpot(x, cx, cy, s, crisp) {
    x.save(); x.translate(cx, cy); x.shadowColor = 'rgba(225,240,255,.95)'; x.shadowBlur = crisp ? s * .5 : s * 2.4;
    x.fillStyle = crisp ? '#ffffff' : 'rgba(238,245,252,.82)'; x.beginPath(); x.ellipse(0, 0, s * 1.7, s, 0, 0, Math.PI * 2); x.fill(); x.restore();
  }
  function drop(x, px, py, pr) {
    x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(px + pr * .25, py + pr * .35, pr, pr * .85, 0, 0, Math.PI * 2); x.fill();
    const g = x.createRadialGradient(px - pr * .3, py - pr * .3, pr * .1, px, py, pr);
    g.addColorStop(0, 'rgba(200,225,245,.08)'); g.addColorStop(.75, 'rgba(120,150,180,.14)'); g.addColorStop(1, 'rgba(220,235,250,.45)');
    x.fillStyle = g; x.beginPath(); x.ellipse(px, py, pr, pr * .85, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.ellipse(px - pr * .35, py - pr * .35, pr * .22, pr * .16, -.6, 0, Math.PI * 2); x.fill();
  }

  /* ---------- hero: inspection lamp over dark paint ---------- */
  function lamp(el) {
    const cv = el.querySelector('canvas'), seg = el.querySelector('.seg');
    const arcs = makeArcs(31, 650), R = rng(32), lines = [];
    for (let i = 0; i < 10; i++) lines.push([R(), R(), 60 + R() * 220, R() * Math.PI, .5 + R() * .5]);
    let x, w = 0, h = 0, mode = 'before', lx = .56, ly = .42, tx = lx, ty = ly, auto = !reduce(), raf = 0, vis = false, t = 0, last = 0, resume = 0;
    const draw = () => {
      if (!w) return;
      const cx = lx * w, cy = ly * h, s = Math.min(w, h) * .034, before = mode === 'before';
      paint(x, w, h); ambient(x, w, h, cx, cy, before ? .22 : .12);
      if (before) { x.fillStyle = 'rgba(170,185,200,.06)'; x.fillRect(0, 0, w, h); }
      x.strokeStyle = before ? 'rgba(200,215,230,.14)' : 'rgba(220,235,250,.4)'; x.lineWidth = before ? 3 : 1.3;
      x.beginPath(); x.moveTo(-10, h * .8); x.quadraticCurveTo(w * .5, h * .7, w + 10, h * .8); x.stroke();
      lampSpot(x, cx, cy, s, !before);
      if (!before) return;
      swirls(x, cx, cy, s, Math.hypot(w, h) * .55, arcs, 1);
      lines.forEach(([ux, uy, l, a, k]) => {
        const px = ux * w, py = uy * h, al = Math.max(0, .4 - Math.hypot(px - cx, py - cy) / Math.max(w, h)) * k;
        if (al < .02) return;
        x.strokeStyle = `rgba(230,240,250,${al.toFixed(3)})`; x.lineWidth = .9; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
      });
    };
    const loop = now => {
      raf = 0; if (!vis) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
      if (auto) { tx = .52 + .3 * Math.sin(t * .55); ty = .44 + .18 * Math.sin(t * .9 + 1); }
      const k = auto ? .06 : .25; lx += (tx - lx) * k; ly += (ty - ly) * k; draw();
      if (auto || Math.abs(tx - lx) + Math.abs(ty - ly) > .0015) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && vis) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    const move = e => {
      if (e.target.closest('.lamp-ui')) return;
      const r = el.getBoundingClientRect(); tx = clamp((e.clientX - r.left) / r.width, 0, 1); ty = clamp((e.clientY - r.top) / r.height, 0, 1); auto = false;
      clearTimeout(resume);
      if (reduce()) { lx = tx; ly = ty; draw(); return; }
      resume = setTimeout(() => { auto = true; kick(); }, 3500); kick();
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerdown', move);
    seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.v; seg.querySelectorAll('button').forEach(z => z.setAttribute('aria-pressed', String(z === b))); draw(); });
    new ResizeObserver(() => { [x, w, h] = fit(cv); draw(); }).observe(el);
    whenVisible(el, v => { vis = v; if (v) kick(); });
  }

  /* ---------- defect samples ---------- */
  function defects(sec) {
    const drawOne = cv => {
      const [x, w, h] = fit(cv); if (!w) return;
      const kind = cv.dataset.defect, s = Math.min(w, h) * .05, cx = w * .62, cy = h * .36;
      paint(x, w, h); ambient(x, w, h, cx, cy, .2);
      if (kind === 'dull') { x.fillStyle = 'rgba(175,188,200,.16)'; x.fillRect(0, 0, w, h); lampSpot(x, cx, cy, s, false); x.fillStyle = 'rgba(175,188,200,.12)'; x.fillRect(0, 0, w, h); return; }
      lampSpot(x, cx, cy, s, kind === 'scratch');
      if (kind === 'swirl') swirls(x, cx, cy, s, Math.hypot(w, h) * .6, makeArcs(51, 380), 1.1);
      if (kind === 'holo') {
        const R = rng(61), lim = Math.min(w, h) * .6; x.save(); x.translate(cx, cy); x.lineCap = 'round';
        for (let i = 0; i < 160; i++) {
          const rr = s * 2 + R() * lim * .9, a = -Math.PI * .9 + R() * Math.PI * 1.8, span = .25 + R() * .5, hue = Math.round(rr * 2.2) % 360;
          x.strokeStyle = `hsla(${hue},70%,78%,${((.1 + R() * .18) * Math.max(0, 1 - rr / lim)).toFixed(3)})`; x.lineWidth = 1.2 + R() * 1.4;
          x.beginPath(); x.arc(0, 0, rr, a, a + span); x.stroke();
        }
        x.restore();
      }
      if (kind === 'scratch') {
        const R = rng(71);
        for (let i = 0; i < 5; i++) { const x0 = R() * w, y0 = R() * h, l = w * (.3 + R() * .4), a = (R() - .5) * .9; x.strokeStyle = 'rgba(235,242,250,.55)'; x.lineWidth = 1.1; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); x.stroke(); }
      }
    };
    const ro = new ResizeObserver(es => es.forEach(e => drawOne(e.target)));
    sec.querySelectorAll('canvas[data-defect]').forEach(cv => ro.observe(cv));
  }

  /* ---------- polishing stages, driven by scroll ---------- */
  function stages(sec) {
    const track = sec.querySelector('.stg-track'), st = sec.querySelector('.stg-sticky'), cv = sec.querySelector('.stg-panel canvas'), items = [...sec.querySelectorAll('.stg-list li')];
    const gloss = sec.querySelector('[data-m="gloss"]'), mic = sec.querySelector('[data-m="mic"]');
    const arcs = makeArcs(81, 520), R = rng(82), beads = [];
    for (let i = 0; i < 70; i++) beads.push([R(), .56 + R() * .4, 2 + R() * 6]);
    let x, w = 0, h = 0, p = 1;
    const draw = () => {
      if (!w) return;
      const cut = clamp(p / .4, 0, 1), fin = clamp((p - .3) / .4, 0, 1), cer = clamp((p - .72) / .22, 0, 1), haze = 1 - fin;
      const cx = w * .5, cy = h * .3, s = Math.min(w, h) * .045;
      paint(x, w, h); ambient(x, w, h, cx, cy, .2);
      x.fillStyle = `rgba(170,185,200,${(.08 * haze).toFixed(3)})`; x.fillRect(0, 0, w, h);
      x.save(); x.globalAlpha = haze; lampSpot(x, cx, cy, s, false); x.restore();
      x.save(); x.globalAlpha = 1 - haze * .85; lampSpot(x, cx, cy, s, true); x.restore();
      if (cut < .99) swirls(x, cx, cy, s, Math.hypot(w, h) * .55, arcs, 1 - cut);
      if (cer > .01) { x.save(); x.globalAlpha = cer; beads.forEach(([u, v, r]) => drop(x, u * w, v * h, r)); x.restore(); }
      gloss.textContent = Math.round(62 + 22 * cut + 8 * fin);
      mic.textContent = Math.round(124 - 3 * cut - fin + cer);
      const step = p < .36 ? 0 : p < .72 ? 1 : 2;
      items.forEach((li, i) => li.classList.toggle('on', i === step));
    };
    new ResizeObserver(() => { [x, w, h] = fit(cv); draw(); }).observe(cv);
    if (reduce()) { p = 1; return; }
    track.classList.add('on');
    let tick = false;
    const upd = () => {
      tick = false;
      const r = track.getBoundingClientRect(), top = parseFloat(getComputedStyle(st).top) || 0, total = r.height - st.offsetHeight;
      p = total > 0 ? clamp((top - r.top) / total, 0, 1) : 1; draw();
    };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener('resize', upd); upd();
  }

  /* ---------- water: spreads on bare paint, beads and rolls off the coating ---------- */
  function water(el) {
    const cv = el.querySelector('canvas');
    let x, w = 0, h = 0, falling = [], puddles = [], beads = [], raf = 0, vis = false, last = 0, acc = 0;
    const spawn = (px, py) => falling.push({ x: px, y: -8, ty: py, v: 0, side: px < w / 2 ? 'l' : 'r', r: 2.5 + Math.random() * 4 });
    const step = dt => {
      if (!reduce()) { acc += dt; while (acc > .09) { acc -= .09; spawn(Math.random() * w, h * (.12 + Math.random() * .8)); } }
      falling.forEach(f => { f.v += 1800 * dt; f.y += f.v * dt; });
      falling = falling.filter(f => {
        if (f.y < f.ty) return true;
        if (f.side === 'l') puddles.push({ x: f.x, y: f.ty, r: f.r * .8, R: f.r * (2.4 + Math.random() * 1.6), rot: Math.random() * 3, sx: 1 + Math.random() * .6 });
        else beads.push({ x: f.x, y: f.ty, r: f.r * 1.05, vy: 0, wait: .2 + Math.random() * 1.2 });
        return false;
      });
      puddles.forEach(p => { p.r += (p.R - p.r) * Math.min(1, dt * 6); });
      if (puddles.length > 140) puddles.splice(0, puddles.length - 140);
      beads.forEach(b => { if (b.wait > 0) b.wait -= dt; else { b.vy += 420 * dt; b.y += b.vy * dt; } });
      beads = beads.filter(b => b.y < h + 20);
    };
    const draw = () => {
      if (!w) return;
      let g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a2532'); g.addColorStop(1, '#070b10'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(170,185,200,.05)'; x.fillRect(0, 0, w / 2, h);
      g = x.createLinearGradient(0, 0, 0, h * .4); g.addColorStop(0, 'rgba(140,165,195,.18)'); g.addColorStop(1, 'rgba(140,165,195,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h * .4);
      x.save(); x.beginPath(); x.rect(0, 0, w / 2, h); x.clip();
      puddles.forEach(p => {
        x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.scale(p.sx, 1);
        x.beginPath(); x.arc(0, 0, p.r, 0, Math.PI * 2); x.fillStyle = 'rgba(170,195,220,.1)'; x.fill();
        x.lineWidth = 1 / p.sx; x.strokeStyle = 'rgba(215,232,250,.16)'; x.stroke(); x.restore();
      });
      x.restore();
      falling.forEach(f => { x.strokeStyle = 'rgba(210,230,250,.5)'; x.lineWidth = Math.max(1, f.r * .5); x.beginPath(); x.moveTo(f.x, f.y - 10); x.lineTo(f.x, f.y); x.stroke(); });
      x.save(); x.beginPath(); x.rect(w / 2, 0, w / 2, h); x.clip(); beads.forEach(b => drop(x, b.x, b.y, b.r)); x.restore();
    };
    const loop = now => {
      raf = 0; if (!vis) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; step(dt); draw();
      if (!reduce() || falling.length || beads.some(b => b.wait <= 0 && b.y < h + 20)) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && vis) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    el.addEventListener('pointerdown', e => {
      const r = el.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      for (let i = 0; i < 10; i++) spawn(clamp(px + (Math.random() - .5) * 80, 0, w), clamp(py + (Math.random() - .5) * 60, 10, h - 10));
      kick();
    });
    const seed = () => {
      const S = rng(91);
      for (let i = 0; i < 46; i++) {
        const px = S() * w, py = h * (.1 + S() * .85);
        if (px < w / 2) puddles.push({ x: px, y: py, r: 9 + S() * 8, R: 9 + S() * 8, rot: S() * 3, sx: 1.2 + S() * .5 });
        else beads.push({ x: px, y: py, r: 2.5 + S() * 4, vy: 0, wait: 1 + S() * 2 });
      }
    };
    new ResizeObserver(() => { [x, w, h] = fit(cv); if (!puddles.length && !beads.length) seed(); draw(); }).observe(el);
    whenVisible(el, v => { vis = v; if (v) kick(); });
  }

  function init() {
    const run = (sel, fn) => { const el = document.querySelector(sel); if (el) try { fn(el); } catch (e) { console.error(e); } };
    run('.lamp', lamp); run('.defects', defects); run('.pl-stages', stages); run('.water', water);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
