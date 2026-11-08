/* PPF page: stones hitting the film, layers that separate on scroll, self-healing sample, package zones */
(function () {
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fit = cv => { const d = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; cv.width = Math.round(w * d); cv.height = Math.round(h * d); const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); return [x, w, h]; };

  /* ---------- hero: stones from the road bounce off the film ---------- */
  function chips(stage) {
    const host = stage.querySelector('.ppf-car'), cv = stage.querySelector('canvas.chips');
    host.innerHTML = Car.carSVG('pf', { stops: Car.finishStops('#20262d', 'gloss'), shadowOpacity: .85, label: 'Автомобиль с плёнкой на передней части',
      clipped: '<rect x="536" y="60" width="264" height="200" fill="rgba(30,159,206,.26)"/>' });
    const svg = host.querySelector('svg');
    // impact points on the hood, nose, bumper and mirror, in the car's viewBox units
    const targets = [[600, 137], [650, 145], [696, 156], [726, 165], [744, 180], [752, 200], [752, 220], [532, 139]];
    let x, w = 0, h = 0, stones = [], flashes = [], acc = 0, last = 0, vis = false, raf = 0;
    const map = ([vx, vy]) => { const r = svg.getBoundingClientRect(), c = cv.getBoundingClientRect(); return [r.left - c.left + vx / 800 * r.width, r.top - c.top + (vy - 60) / 224 * r.height]; };
    const spawn = () => {
      const t = map(targets[Math.random() * targets.length | 0]), sx = w + 20, sy = t[1] + (Math.random() - .5) * h * .3;
      const dx = t[0] - sx, dy = t[1] - sy, d = Math.hypot(dx, dy), v = w * (1.1 + Math.random() * .5);
      stones.push({ x: sx, y: sy, vx: dx / d * v, vy: dy / d * v, tx: t[0], hit: false, life: 0, r: 1.4 + Math.random() * 2.2 });
    };
    const step = dt => {
      acc += dt; while (acc > .17) { acc -= .17; if (stones.length < 36) spawn(); }
      stones.forEach(s => {
        s.life += dt;
        if (!s.hit) { s.x += s.vx * dt; s.y += s.vy * dt; if (s.x <= s.tx) { s.hit = true; s.x = s.tx; flashes.push({ x: s.x, y: s.y, t: 0 }); s.vx = Math.abs(s.vx) * .2; s.vy = -(80 + Math.random() * 240); s.life = 0; } }
        else { s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; }
      });
      stones = stones.filter(s => !(s.hit && s.life > .9) && s.y < h + 20);
      flashes.forEach(f => { f.t += dt; }); flashes = flashes.filter(f => f.t < .5);
    };
    const draw = () => {
      if (!w) return;
      x.clearRect(0, 0, w, h);
      flashes.forEach(f => {
        const k = f.t / .5;
        x.strokeStyle = `rgba(80,190,240,${((1 - k) * .9).toFixed(3)})`; x.lineWidth = 2; x.beginPath(); x.arc(f.x, f.y, 4 + k * 24, 0, Math.PI * 2); x.stroke();
        x.fillStyle = `rgba(225,246,255,${(1 - k).toFixed(3)})`; x.beginPath(); x.arc(f.x, f.y, 2.6 * (1 - k) + 1, 0, Math.PI * 2); x.fill();
      });
      stones.forEach(s => {
        const a = s.hit ? Math.max(0, 1 - s.life / .9) : 1;
        if (!s.hit) { x.strokeStyle = `rgba(200,205,210,${(.28 * a).toFixed(3)})`; x.lineWidth = s.r; x.lineCap = 'round'; x.beginPath(); x.moveTo(s.x, s.y); x.lineTo(s.x - s.vx * .03, s.y - s.vy * .03); x.stroke(); }
        x.fillStyle = `rgba(176,181,186,${a.toFixed(3)})`; x.beginPath(); x.arc(s.x, s.y, s.r, 0, Math.PI * 2); x.fill();
      });
    };
    const loop = t => { raf = 0; if (!vis) return; const dt = Math.min(.05, (t - last) / 1000); last = t; step(dt); draw(); raf = requestAnimationFrame(loop); };
    new ResizeObserver(() => { [x, w, h] = fit(cv); if (reduce()) { flashes = targets.slice(0, 5).map(p => { const q = map(p); return { x: q[0], y: q[1], t: .1 }; }); } draw(); }).observe(stage);
    if (reduce()) return;
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }, { threshold: .1 }).observe(stage);
  }

  /* ---------- layers: the stack separates as the section scrolls ---------- */
  function layers(sec) {
    const track = sec.querySelector('.ly-track'), st = sec.querySelector('.ly-sticky'), stack = sec.querySelector('.ly-stack');
    const planes = [...sec.querySelectorAll('.ly')], items = [...sec.querySelectorAll('.ly-list li[data-k]')], now = sec.querySelector('.ly-now');
    const order = ['top', 'tpu', 'glue', 'clear', 'base', 'primer', 'metal'];
    const info = Object.fromEntries(items.map(li => [li.dataset.k, { name: li.querySelector('.nm').textContent, um: li.querySelector('.um').textContent, d: li.querySelector('small') ? li.querySelector('small').textContent : '' }]));
    let cur = .62, shown = null;
    const set = (xv, k) => {
      cur = xv; stack.style.setProperty('--x', xv.toFixed(3));
      if (k === shown) return; shown = k;
      planes.forEach(p => p.classList.toggle('hot', p.dataset.k === k));
      items.forEach(i => i.classList.toggle('hot', i.dataset.k === k));
      stack.classList.toggle('dim', !!k);
      if (now && k && info[k]) { now.querySelector('b').textContent = info[k].name; now.querySelector('span').textContent = info[k].um; now.querySelector('p').textContent = info[k].d; }
    };
    items.forEach(i => { i.tabIndex = 0; const k = i.dataset.k; i.addEventListener('mouseenter', () => set(cur, k)); i.addEventListener('focus', () => set(cur, k)); });
    if (reduce()) { set(.62, null); return; }
    track.classList.add('on');
    let tick = false;
    const upd = () => {
      tick = false;
      const r = track.getBoundingClientRect(), top = parseFloat(getComputedStyle(st).top) || 0, total = r.height - st.offsetHeight;
      const p = total > 0 ? clamp((top - r.top) / total, 0, 1) : 1;
      const idx = Math.min(order.length - 1, Math.floor(clamp((p - .28) / .68, 0, .999) * order.length));
      set(.04 + clamp(p / .3, 0, 1) * .62, p < .28 ? null : order[idx]);
    };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener('resize', upd); upd();
  }

  /* ---------- self-healing sample ---------- */
  function heal(sec) {
    const panel = sec.querySelector('.heal-panel'), g = panel.querySelector('.scr'), temp = panel.querySelector('.heal-temp'), btn = sec.querySelector('#healBtn');
    const scratch = () => {
      let d = '';
      for (let i = 0; i < 10; i++) {
        const x = 40 + Math.random() * 300, y = 40 + Math.random() * 200, a = Math.random() * Math.PI, l = 40 + Math.random() * 120;
        const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l * .5, cx = (x + x2) / 2 + (Math.random() - .5) * 30, cy = (y + y2) / 2 + (Math.random() - .5) * 20;
        d += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`;
      }
      g.innerHTML = d; g.style.transition = 'none'; g.style.opacity = 1; panel.classList.remove('warm');
      temp.textContent = '22 °C'; btn.textContent = 'Нагреть до 60 °C'; btn.dataset.state = 'cold';
    };
    const warm = () => {
      btn.dataset.state = 'busy'; panel.classList.add('warm');
      const fast = reduce(), D = fast ? 1 : 1600, t0 = performance.now();
      g.style.transition = `opacity ${fast ? 0 : 1.4}s ease ${fast ? 0 : .5}s`;
      requestAnimationFrame(() => { g.style.opacity = 0; });
      (function tickT(t) {
        const k = clamp((t - t0) / D, 0, 1); temp.textContent = Math.round(22 + 38 * k) + ' °C';
        if (k < 1) requestAnimationFrame(tickT);
        else { btn.textContent = 'Поцарапать снова'; btn.dataset.state = 'hot'; setTimeout(() => panel.classList.remove('warm'), 900); }
      })(t0);
    };
    btn.addEventListener('click', () => { if (btn.dataset.state === 'cold') warm(); else if (btn.dataset.state === 'hot') scratch(); });
    scratch();
  }

  /* ---------- packages: hover a card to see its zones; send it to the calculator ---------- */
  function packs(sec) {
    const host = sec.querySelector('.packs-car'), cards = [...sec.querySelectorAll('.pack')], Z = window.CarZones || [], P = Car.P;
    const zp = z => `<path class="zone" data-z="${z[0]}" d="${z[3] || (z[0] === 'head' ? P.head : P.mirror)}" style="pointer-events:none"/>`;
    host.innerHTML = Car.carSVG('pk', { stops: Car.finishStops('#d3d9de', 'gloss'), shadowOpacity: .25, rimOpacity: .5, label: 'Схема зон плёнки',
      clipped: Z.filter(z => z[3]).map(zp).join(''), over: Z.filter(z => !z[3]).map(zp).join('') });
    const show = card => {
      const zones = (card.dataset.zones || '').split(',');
      host.querySelectorAll('.zone').forEach(p => p.classList.toggle('on', zones.includes(p.dataset.z)));
      cards.forEach(c => c.classList.toggle('on', c === card));
    };
    cards.forEach(c => { c.addEventListener('mouseenter', () => show(c)); c.addEventListener('focusin', () => show(c)); c.addEventListener('click', () => show(c)); });
    show(cards.find(c => c.dataset.id === 'risk') || cards[0]);
    sec.addEventListener('click', e => {
      const b = e.target.closest('[data-pick-pack]'); if (!b) return;
      const chip = document.querySelector(`.calc [data-p="${b.dataset.pickPack}"]`); if (chip) chip.click();
      const calc = document.getElementById('calc'); if (calc) calc.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth' });
    });
  }

  function init() {
    const run = (sel, fn) => { const el = document.querySelector(sel); if (el) try { fn(el); } catch (e) { console.error(e); } };
    run('.ppf-stage', chips); run('.layers', layers); run('.heal-sec', heal); run('.packs-sec', packs);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
