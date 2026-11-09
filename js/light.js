/* «Свет»: всё, что отвечает за освещение сайта.
   Потолок из шестигранных ламп над героями и лампа за курсором, загрузка «включаем свет» на главной,
   плавная прокрутка, навигация, которая прячется при прокрутке вниз, слова и карточки, которые загораются,
   лента услуг на главной и ползунок светопропускания тонировки. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const store = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return '1'; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  const onReady = fn => { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); };
  const navH = () => { const n = document.querySelector('.nav'); return n ? n.offsetHeight : 64; };

  /* ---------- плавная прокрутка: только с мышью и без reduced motion, на телефоне остаётся родная ---------- */
  let lenis = null;
  if (!reduce && !touch && window.Lenis) {
    try {
      lenis = new Lenis({ lerp: 0.11, smoothWheel: true, prevent: n => !!(n.classList && (n.classList.contains('wk-modal') || n.classList.contains('mmenu') || n.classList.contains('doc-toc'))) });
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      // меню и карточка работы ставят body overflow:hidden — в это время страница под ними не прокручивается
      new MutationObserver(() => { if (document.body.style.overflow === 'hidden') lenis.stop(); else lenis.start(); })
        .observe(document.body, { attributes: true, attributeFilter: ['style'] });
      document.addEventListener('click', e => {
        const a = e.target.closest('a[href*="#"]');
        if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || url.hash.length < 2) return;
        let el = null; try { el = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch (err) {}
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(el, { offset: -navH() - 8, duration: 1.3, force: true });
        try { history.replaceState(null, '', url.hash); } catch (err) {}
      });
    } catch (e) { console.error(e); lenis = null; }
  }

  /* ---------- навигация: плотнее после начала прокрутки, прячется при прокрутке вниз ---------- */
  function nav() {
    const el = document.querySelector('.nav'); if (!el) return;
    let lastY = scrollY, tick = false;
    const upd = () => {
      tick = false;
      const y = scrollY, menuOpen = document.body.classList.contains('menu-open');
      el.classList.toggle('solid', y > 30);
      if (!menuOpen && y > lastY + 3 && y > 420) el.classList.add('hide');
      else if (y < lastY - 3 || y <= 420 || menuOpen) el.classList.remove('hide');
      document.body.classList.toggle('nav-hidden', el.classList.contains('hide'));
      lastY = y;
    };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    el.addEventListener('focusin', () => { el.classList.remove('hide'); document.body.classList.remove('nav-hidden'); });
    upd();
  }

  /* ---------- потолок из шестигранных ламп ---------- */
  // Лампы рисуются один раз на двух холстах: тусклый и яркий. Яркий виден только в круге света, круг двигает маска.
  const lamps = [];
  function drawHexes(lamp) {
    const { el, cvs } = lamp, r = el.getBoundingClientRect();
    const W = Math.ceil(r.width), H = Math.ceil(r.height); if (!W || !H) return false;
    lamp.W = W; lamp.H = H;
    const dpr = Math.min(2, devicePixelRatio || 1), small = W < 700;
    const s = +(el.dataset.size || 0) || (small ? 44 : 72), hw = Math.sqrt(3) * s, gap = s * 0.17, fade = +(el.dataset.fade || 1);
    cvs.forEach((cv, idx) => {
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      c.lineCap = 'round'; c.lineWidth = small ? 2 : 3;
      c.strokeStyle = 'rgb(246,250,255)'; c.shadowColor = 'rgba(185,222,255,0.95)'; c.shadowBlur = idx ? (small ? 10 : 16) : 0;
      for (let row = -1, y = -s; y < H + s * 2; row++, y += s * 1.5) {
        const a = Math.min(1, 1.2 - fade * y / H); // ниже от потолка — слабее
        if (a <= 0.02) continue;
        c.globalAlpha = Math.max(fade > 1 ? 0 : 0.18, a);
        for (let x = (row & 1 ? hw / 2 : 0) - hw; x < W + hw; x += hw) {
          for (let k = 0; k < 6; k++) {
            const a1 = Math.PI / 3 * k - Math.PI / 6, a2 = a1 + Math.PI / 3;
            const x1 = x + s * Math.cos(a1), y1 = y + s * Math.sin(a1), x2 = x + s * Math.cos(a2), y2 = y + s * Math.sin(a2);
            const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
            c.beginPath(); c.moveTo(x1 + ux * gap, y1 + uy * gap); c.lineTo(x2 - ux * gap, y2 - uy * gap); c.stroke();
          }
        }
      }
    });
    lamp.R = Math.max(200, Math.min(W, H) * (small ? 0.55 : 0.36)) * (+(el.dataset.radius || 1));
    return true;
  }
  function apply(lamp) {
    const { el, st, frame } = lamp;
    el.style.setProperty('--lx', st.x.toFixed(1) + 'px');
    el.style.setProperty('--ly', st.y.toFixed(1) + 'px');
    el.style.setProperty('--r', st.r.toFixed(1) + 'px');
    if (frame) {
      const er = el.getBoundingClientRect(), fr = frame.getBoundingClientRect();
      frame.style.setProperty('--fx', (st.x - (fr.left - er.left)).toFixed(1) + 'px');
      frame.style.setProperty('--fy', (st.y - (fr.top - er.top)).toFixed(1) + 'px');
      frame.style.setProperty('--fr', (st.r * 0.95).toFixed(1) + 'px');
    }
  }
  // куда идёт лампа, если мыши нет: по кругу у фото на главной, вдоль потолка на остальных страницах
  function idle(lamp, k) {
    const { W, H, frame, el } = lamp;
    if (frame) {
      const er = el.getBoundingClientRect(), fr = frame.getBoundingClientRect();
      const fx = fr.left - er.left, fy = fr.top - er.top;
      return [fx + fr.width * (0.5 + 0.34 * Math.sin(k * 0.55)), fy + fr.height * (0.42 + 0.26 * Math.sin(k * 0.83 + 1))];
    }
    return [W * (0.5 + 0.34 * Math.sin(k * 0.42)), H * (0.3 + 0.14 * Math.sin(k * 0.71 + 1))];
  }
  let looping = false;
  function loop(t) {
    let any = false;
    lamps.forEach(l => {
      if (!l.visible || !l.W) return;
      any = true;
      if (l.mouse) { const r = l.el.getBoundingClientRect(); l.st.tx = l.mouse[0] - r.left; l.st.ty = l.mouse[1] - r.top; }
      else { const p = idle(l, t / 1000 + l.phase); l.st.tx = p[0]; l.st.ty = p[1]; }
      if (l.grow) { const k = clamp((t - l.grow.t0) / l.grow.dur, 0, 1); l.st.r = l.grow.from + (l.grow.to() - l.grow.from) * ease(k); if (k >= 1) l.grow = null; }
      l.st.x += (l.st.tx - l.st.x) * 0.09; l.st.y += (l.st.ty - l.st.y) * 0.09;
      apply(l);
    });
    if (any) requestAnimationFrame(loop); else looping = false;
  }
  const kick = () => { if (!looping) { looping = true; requestAnimationFrame(loop); } };
  function lampCeil(el) {
    const scope = el.closest('[data-lamp-scope]') || el.parentElement;
    const cvs = ['hx-off', 'hx-on'].map(c => { const cv = document.createElement('canvas'); cv.className = c; el.appendChild(cv); return cv; });
    const lamp = { el, scope, cvs, frame: scope.querySelector('.lh-frame'), st: { x: 0, y: 0, tx: 0, ty: 0, r: 0 }, W: 0, H: 0, R: 300, visible: true, mouse: null, grow: null, phase: lamps.length * 1.7 };
    lamps.push(lamp);
    drawHexes(lamp);
    const p = idle(lamp, lamp.phase); lamp.st.x = lamp.st.tx = p[0]; lamp.st.y = lamp.st.ty = p[1];
    let rt = 0;
    new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { drawHexes(lamp); if (reduce) { lamp.st.r = lamp.frame ? Math.hypot(lamp.W, lamp.H) : lamp.R; apply(lamp); } }, 120); }).observe(el);
    if (reduce) { lamp.st.r = lamp.frame ? Math.hypot(lamp.W, lamp.H) : lamp.R; apply(lamp); return lamp; }
    if (!touch) {
      scope.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { lamp.mouse = [e.clientX, e.clientY]; kick(); } });
      scope.addEventListener('pointerleave', () => { lamp.mouse = null; });
    }
    new IntersectionObserver(es => { lamp.visible = es[0].isIntersecting; if (lamp.visible) kick(); }).observe(el);
    apply(lamp); kick();
    return lamp;
  }
  // включить лампу: мигнуть всем потолком, затем свет собирается в круг
  function switchOn(lamp, delay) {
    setTimeout(() => {
      lamp.st.r = Math.hypot(lamp.W, lamp.H) * 1.05; apply(lamp);
      lamp.el.classList.add('flick'); if (lamp.frame) lamp.frame.classList.add('flick');
      setTimeout(() => { lamp.grow = { t0: performance.now(), dur: 1700, from: lamp.st.r, to: () => lamp.R }; kick(); }, 650);
    }, delay || 0);
  }

  /* ---------- загрузка на главной: счётчик, шторка, лампы мигают и загораются ---------- */
  function heroHome(lamp) {
    const hero = document.querySelector('.lh'), loader = document.querySelector('.loader');
    const lines = hero ? [...hero.querySelectorAll('.lh-title .ln')] : [];
    lines.forEach((ln, i) => ln.style.setProperty('--d', i));
    const copy = hero && hero.querySelector('.lh-copy');
    const go = () => { if (hero) hero.classList.add('go'); if (copy) { copy.classList.remove('lamp-wait'); copy.classList.add('lamp-on'); } };
    if (reduce || !lamp) { if (loader) loader.remove(); go(); return; }
    if (copy) copy.classList.add('lamp-wait');
    const seen = document.documentElement.classList.contains('ld-seen') || !loader;
    if (seen) { if (loader) loader.remove(); switchOn(lamp, 80); setTimeout(go, 260); return; }
    const n = loader.querySelector('.ld-n'), bar = loader.querySelector('.ld-bar i'), t0 = performance.now(), dur = 1100;
    (function count(t) {
      const k = clamp((t - t0) / dur, 0, 1), v = Math.round(100 * ease(k));
      n.textContent = String(v).padStart(3, '0'); bar.style.transform = `scaleX(${v / 100})`;
      if (k < 1) requestAnimationFrame(count);
      else {
        store.set('ask-ld', '1');
        setTimeout(() => loader.classList.add('out'), 120);
        switchOn(lamp, 520);
        setTimeout(go, 700);
        setTimeout(() => loader.remove(), 1100);
      }
    })(t0);
  }

  /* ---------- слова и полосы под лампой загораются, когда попадают в кадр ---------- */
  function lampWords() {
    const els = [...document.querySelectorAll('.band-head, .ppf-copy, .pl-copy, .wr-copy, .dr-copy, .wk-hero .wrap, .doc-hero .wrap, .nf .wrap, .heal-copy, .cn-copy, .tn-copy, .srv-head, .steps')];
    document.querySelectorAll('.steps').forEach(s => [...s.children].forEach((li, i) => li.style.setProperty('--n', i)));
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('lamp-on')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target); e.target.classList.remove('lamp-wait'); e.target.classList.add('lamp-on');
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
    els.forEach(e => { e.classList.add('lamp-wait'); io.observe(e); });
  }

  /* ---------- карточки: с мышью загораются под курсором (CSS), на телефоне — в середине экрана ---------- */
  const CARDS = '.case, .wk-card, .film, .pack, .defect, .vs-col, .rv-link, .tl, .hl, .profile, .wash-card';
  function cards() {
    const list = [...document.querySelectorAll(CARDS)];
    if (reduce) { list.forEach(c => c.classList.add('is-lit')); return; }
    if (!touch || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-lit', e.isIntersecting)), { rootMargin: '-38% 0px -38% 0px', threshold: 0 });
    list.forEach(c => io.observe(c));
  }

  /* ---------- услуги на главной: лента едет вбок, пока страница прокручивается ---------- */
  function ribbon(sec) {
    const pin = sec.querySelector('.srv-pin'), sticky = sec.querySelector('.srv-sticky'), track = sec.querySelector('.srv-track');
    const panels = [...track.children], mq = matchMedia('(min-width: 861px)');
    sec.querySelectorAll('.p-car[data-car]').forEach((el, i) => {
      const [c, f] = el.dataset.car.split(':');
      if (window.Car) el.innerHTML = Car.carSVG('sv' + i, { stops: Car.finishStops(c, f || 'gloss'), reflect: true, shadowOpacity: .7, label: el.getAttribute('aria-label') || 'Автомобиль' });
    });
    if (reduce) { panels.forEach(p => p.classList.add('is-lit')); return; }
    let on = false, dist = 0, tick = false, io = null;
    const upd = () => {
      tick = false; if (!on) return;
      const r = pin.getBoundingClientRect(), total = Math.max(1, pin.offsetHeight - innerHeight);
      const p = clamp(-r.top / total, 0, 1);
      track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
      panels.forEach(pn => { const b = pn.getBoundingClientRect(); pn.classList.toggle('is-lit', b.left < innerWidth * 0.64 && b.right > innerWidth * 0.36); });
    };
    const measure = () => { if (!on) return; dist = Math.max(0, track.scrollWidth - innerWidth); pin.style.height = Math.round(dist + innerHeight) + 'px'; upd(); };
    const set = () => {
      on = mq.matches;
      pin.classList.toggle('pinned', on);
      if (io) { io.disconnect(); io = null; }
      if (on) { requestAnimationFrame(measure); return; }
      pin.style.height = ''; track.style.transform = '';
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-lit', e.isIntersecting)), { root: sticky, rootMargin: '0px -22% 0px -22%', threshold: 0 });
        panels.forEach(p => io.observe(p));
      } else panels.forEach(p => p.classList.add('is-lit'));
    };
    addEventListener('scroll', () => { if (on && !tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 120); });
    if (mq.addEventListener) mq.addEventListener('change', set); else mq.addListener(set);
    // с клавиатуры: фокус на ссылке в панели прокручивает страницу так, чтобы панель оказалась в центре
    track.addEventListener('focusin', e => {
      if (!on) return;
      const pn = e.target.closest('.panel'); if (!pn) return;
      const x = clamp(pn.offsetLeft + pn.offsetWidth / 2 - innerWidth / 2, 0, dist), total = pin.offsetHeight - innerHeight;
      const top = pin.getBoundingClientRect().top + scrollY + (dist ? x / dist : 0) * total;
      if (lenis) lenis.scrollTo(top, { immediate: true, force: true }); else scrollTo(0, top);
    });
    set();
  }

  /* ---------- тонировка: светопропускание плёнки ---------- */
  function tint(sec) {
    const steps = [
      [5, 'Задняя полусфера: так тонируем чаще всего, например Mazda CX-5 и Jaecoo J6 из наших работ.'],
      [15, 'Задняя полусфера посветлее, как на Belgee X50 из наших работ.'],
      [35, 'Фары и фонари: затемнённый полиуретан 35% защищает и меняет вид, как на Haval Julion.'],
      [50, 'Лёгкое затемнение задних стёкол: салон видно, солнце мягче.'],
      [70, 'Минимум для лобового и передних боковых стёкол по техрегламенту ТР ТС 018/2011. Атермальная плёнка держит этот порог.'],
      [80, 'Примерно столько пропускает обычное заводское стекло.']
    ];
    const range = sec.querySelector('#vlt'), out = sec.querySelector('#vltOut'), note = sec.querySelector('#vltNote'), glass = sec.querySelector('.glass');
    if (!range) return;
    const set = i => {
      const [v, text] = steps[i];
      out.textContent = v + '%'; range.setAttribute('aria-valuetext', v + '%'); note.textContent = text;
      glass.style.setProperty('--t', ((1 - v / 100) * 0.9).toFixed(3));
    };
    range.addEventListener('input', () => set(+range.value));
    set(+range.value);
  }

  /* ---------- мягкое пятно света за курсором ---------- */
  function cursorGlow() {
    if (touch || reduce) return;
    const g = document.createElement('div'); g.className = 'cursor-glow'; g.setAttribute('aria-hidden', 'true'); document.body.appendChild(g);
    let gx = innerWidth / 2, gy = innerHeight / 2, mx = gx, my = gy, run = false;
    const follow = () => {
      gx += (mx - gx) * 0.12; gy += (my - gy) * 0.12;
      g.style.transform = `translate3d(${gx.toFixed(1)}px,${gy.toFixed(1)}px,0)`;
      if (Math.abs(mx - gx) + Math.abs(my - gy) > 0.5) requestAnimationFrame(follow); else run = false;
    };
    addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; mx = e.clientX; my = e.clientY; g.style.opacity = 1; if (!run) { run = true; requestAnimationFrame(follow); } }, { passive: true });
    document.addEventListener('pointerleave', () => { g.style.opacity = 0; });
  }

  function init() {
    const run = (fn, ...a) => { try { return fn(...a); } catch (e) { console.error(e); } };
    run(nav);
    let homeLamp = null;
    document.querySelectorAll('[data-lamp]').forEach(el => {
      const l = run(lampCeil, el);
      if (!l) return;
      if (el.closest('.lh')) homeLamp = l;
      else if (!reduce) switchOn(l, 120);
    });
    if (document.querySelector('.lh')) run(heroHome, homeLamp);
    run(lampWords); run(cards); run(cursorGlow);
    const srv = document.querySelector('.srv'); if (srv) run(ribbon, srv);
    const tn = document.querySelector('.tint'); if (tn) run(tint, tn);
  }
  onReady(init);
  window.Light = { get lenis() { return lenis; }, reduce, touch };
})();
