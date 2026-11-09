/* Scenes: hero (studio lights switch on with scroll), highlight visuals, before/after slider */
(function () {
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const fit = cv => { const d = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; cv.width = Math.round(w * d); cv.height = Math.round(h * d); const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); return [x, w, h, d]; };
  const whenVisible = (el, on, off) => new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? on() : off && off()), { threshold: .15 }).observe(el);

  /* ---------- hero ---------- */
  function hero(root) {
    const st = root.querySelector('.hs-sticky'), cv = root.querySelector('.hs-lights'), carHost = root.querySelector('.hs-car');
    carHost.innerHTML = Car.carSVG('hs', {
      stops: Car.finishStops('#111418', 'gloss'), reflect: true, shadowOpacity: .9, label: 'Автомобиль в детейлинг-боксе под гексагональным светом',
      defs: '<linearGradient id="hs-sweep" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="300" y2="0" gradientTransform="translate(520 0)"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>',
      clipped: '<rect x="-120" y="60" width="1040" height="200" fill="url(#hs-sweep)" transform="skewX(-18)"/>'
    });
    let ctx, w = 0, h = 0, horizon = 0, off, on;
    const lit = 1;
    function build() {
      let d; [ctx, w, h, d] = fit(cv); if (!w || !h) return;
      horizon = h * .52;
      const f = Math.max(w, h * 1.3) * .8, H = 1.7, s = .55, sq = Math.sqrt(3), cells = [];
      for (let q = -18; q <= 18; q++) for (let r = -18; r <= 18; r++) {
        const X = s * 1.5 * q, Z = 1.3 + s * sq * (r + q / 2);
        if (Z < 1.15 || Z > 17) continue;
        const pts = []; let ok = true;
        for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i, px = X + s * .86 * Math.cos(a), pz = Z + s * .86 * Math.sin(a); if (pz < .6) { ok = false; break; } pts.push([w / 2 + f * px / pz, horizon - f * H / pz]); }
        if (!ok) continue;
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        if (Math.max(...xs) < -40 || Math.min(...xs) > w + 40 || Math.max(...ys) < -40) continue;
        cells.push({ pts, Z });
      }
      const layer = bright => {
        const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
        const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.lineCap = 'round';
        cells.forEach(cell => {
          const fog = Math.max(0, 1 - (cell.Z - 1.3) / 15.7), a = (bright ? 1 : .2) * (.1 + .9 * fog * fog);
          x.beginPath(); cell.pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath();
          x.lineWidth = Math.max(.6, 6 / cell.Z); x.strokeStyle = `rgba(234,246,255,${a.toFixed(3)})`;
          if (bright) { x.shadowColor = 'rgba(200,230,255,.9)'; x.shadowBlur = 10 * fog; }
          x.stroke();
        });
        return c;
      };
      off = layer(false); on = layer(true);
    }
    function draw(k) {
      if (!ctx || !w) return;
      ctx.clearRect(0, 0, w, h); ctx.drawImage(off, 0, 0, w, h);
      if (k <= 0) return;
      const y = k >= 1 ? h : k * horizon;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, y); ctx.clip(); ctx.drawImage(on, 0, 0, w, h); ctx.restore();
      if (k < 1) { ctx.save(); ctx.globalAlpha = .45; ctx.beginPath(); ctx.rect(0, y, w, 26); ctx.clip(); ctx.drawImage(on, 0, 0, w, h); ctx.restore(); }
    }
    new ResizeObserver(() => { build(); draw(lit); }).observe(st);
    build();
    // свет в боксе уже включён: сцена стоит на месте, без прокрутки-анимации (меньше движения на странице)
    draw(1);
  }

  /* ---------- before/after paint panel (shared by the slider and a highlight card) ---------- */
  function drawPanel(cv, before) {
    const [x, w, h] = fit(cv); if (!w || !h) return;
    const R = rng(before ? 7 : 9);
    let g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b2633'); g.addColorStop(.42, '#0c1219'); g.addColorStop(1, '#040609');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    g = x.createRadialGradient(w * .3, h * .05, 0, w * .3, h * .05, w * .75); g.addColorStop(0, 'rgba(130,160,190,.3)'); g.addColorStop(1, 'rgba(130,160,190,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.save(); x.beginPath(); x.moveTo(-10, h * .72); x.quadraticCurveTo(w * .5, h * .6, w + 10, h * .72);
    x.lineWidth = before ? 3 : 1.4; x.strokeStyle = before ? 'rgba(200,215,230,.16)' : 'rgba(220,235,250,.5)'; x.shadowColor = 'rgba(200,225,255,.6)'; x.shadowBlur = before ? 14 : 6; x.stroke(); x.restore();
    const cx = w * .5, cy = h * .33, s = Math.min(w, h) * .052;
    const hexes = []; for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) hexes.push([s * 1.5 * q, s * Math.sqrt(3) * (r + q / 2)]);
    const hexLines = (lw, col, blur) => {
      x.save(); x.translate(cx, cy); x.scale(1, .62); x.lineWidth = lw; x.strokeStyle = col; x.shadowColor = 'rgba(215,235,255,.95)'; x.shadowBlur = blur; x.lineCap = 'round';
      hexes.forEach(([hx, hy]) => { x.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i, px = hx + s * .9 * Math.cos(a), py = hy + s * .9 * Math.sin(a); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.stroke(); });
      x.restore();
    };
    if (before) { hexLines(s * .34, 'rgba(225,235,245,.16)', s * 1.2); hexLines(s * .16, 'rgba(235,242,250,.62)', s * .8); }
    else { hexLines(s * .3, 'rgba(220,235,250,.12)', s * .9); hexLines(s * .13, 'rgba(250,252,255,1)', s * .25); }
    if (before) {
      x.fillStyle = 'rgba(165,180,196,.07)'; x.fillRect(0, 0, w, h);
      x.save(); x.translate(cx, cy); x.scale(1, .62); x.lineCap = 'round';
      const maxR = Math.hypot(w, h / .62) * .7;
      for (let i = 0; i < 1100; i++) {
        const rr = s * 2.4 + Math.pow(R(), .8) * maxR, a = R() * Math.PI * 2, span = .03 + R() * .16, fall = Math.max(0, 1 - rr / maxR);
        const al = (.08 + R() * .42) * fall * fall; if (al < .012) continue;
        x.strokeStyle = `rgba(225,236,248,${al.toFixed(3)})`; x.lineWidth = .5 + R() * .8; x.beginPath(); x.arc(0, 0, rr, a, a + span); x.stroke();
      }
      x.restore();
      for (let i = 0; i < 7; i++) { const x0 = R() * w, y0 = R() * h, l = 60 + R() * 180, a = R() * Math.PI; x.strokeStyle = `rgba(230,240,250,${(.08 + R() * .12).toFixed(3)})`; x.lineWidth = .8; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); x.stroke(); }
      for (let i = 0; i < 46; i++) { const px = R() * w, py = h * .5 + R() * h * .5, pr = 2 + R() * 7; x.strokeStyle = `rgba(220,230,240,${(.06 + R() * .1).toFixed(3)})`; x.lineWidth = 1; x.beginPath(); x.ellipse(px, py, pr, pr * .8, 0, 0, Math.PI * 2); x.stroke(); }
    } else drops(x, w, h, R, h * .74, h * .24, 70);
  }
  function drops(x, w, h, R, y0, span, n) {
    for (let i = 0; i < n; i++) {
      const px = w * .04 + R() * w * .92, py = y0 + R() * span, pr = 2 + R() * 6;
      x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(px + pr * .25, py + pr * .35, pr, pr * .85, 0, 0, Math.PI * 2); x.fill();
      const bg = x.createRadialGradient(px - pr * .3, py - pr * .3, pr * .1, px, py, pr);
      bg.addColorStop(0, 'rgba(200,225,245,.08)'); bg.addColorStop(.75, 'rgba(120,150,180,.14)'); bg.addColorStop(1, 'rgba(220,235,250,.42)');
      x.fillStyle = bg; x.beginPath(); x.ellipse(px, py, pr, pr * .85, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.ellipse(px - pr * .35, py - pr * .35, pr * .22, pr * .16, -.6, 0, Math.PI * 2); x.fill();
    }
  }
  function ba(root) {
    const a = root.querySelector('canvas.after'), b = root.querySelector('canvas.before'), range = root.querySelector('.ba-range');
    const set = v => root.style.setProperty('--pos', v + '%');
    range.addEventListener('input', () => set(range.value));
    new ResizeObserver(() => { drawPanel(a, false); drawPanel(b, true); }).observe(root);
    if (!reduce()) {
      const io = new IntersectionObserver(es => {
        if (!es[0].isIntersecting) return; io.disconnect();
        const s = performance.now();
        (function st(t) { const k = clamp((t - s) / 1500, 0, 1); set((50 + Math.sin(k * Math.PI * 2) * 20 * (1 - k)).toFixed(2)); if (k < 1) requestAnimationFrame(st); else set(range.value); })(s);
      }, { threshold: .6 });
      io.observe(root);
    }
  }

  /* ---------- highlight visuals ---------- */
  function highlights(rail) {
    // карточка смены цвета: машина в изумрудной плёнке, без смены цветов по таймеру
    const host = rail.querySelector('[data-vis="color"]');
    if (host) host.innerHTML = Car.carSVG('hlc', { stops: Car.finishStops('#0e5e48', 'gloss'), shadowOpacity: .3, rimOpacity: .5, label: 'Автомобиль в изумрудной глянцевой плёнке' });
    // ceramic card: beads on a dark panel
    const cer = rail.querySelector('[data-vis="beads"]');
    if (cer) new ResizeObserver(() => {
      const [x, w, h] = fit(cer); if (!w) return;
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#16202b'); g.addColorStop(1, '#030507'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.save(); x.beginPath(); x.moveTo(-10, h * .22); x.quadraticCurveTo(w * .5, h * .08, w + 10, h * .22); x.strokeStyle = 'rgba(205,228,250,.35)'; x.lineWidth = 1.4; x.shadowColor = 'rgba(190,225,255,.8)'; x.shadowBlur = 10; x.stroke(); x.restore();
      drops(x, w, h, rng(21), h * .28, h * .7, Math.round(w * h / 900));
    }).observe(cer);
    // polishing card: split before/after that sweeps on its own
    const split = rail.querySelector('[data-vis="split"]');
    if (split) {
      const a = split.querySelector('canvas.after'), b = split.querySelector('canvas.before');
      new ResizeObserver(() => { drawPanel(a, false); drawPanel(b, true); }).observe(split);
      if (!reduce()) split.classList.add('run');
    }
    // paddles
    const wrap = rail.closest('.hl-wrap'), prev = wrap.querySelector('[data-dir="-1"]'), nextB = wrap.querySelector('[data-dir="1"]');
    const step = () => (rail.querySelector('.hl')?.offsetWidth || 360) + 20;
    const sync = () => { prev.disabled = rail.scrollLeft < 8; nextB.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8; };
    [prev, nextB].forEach(btn => btn.addEventListener('click', () => rail.scrollBy({ left: step() * +btn.dataset.dir, behavior: reduce() ? 'auto' : 'smooth' })));
    rail.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    addEventListener('resize', sync); sync();
  }

  window.Scenes = { hero, ba, highlights, drawPanel };
})();
