/* Colour change page: the hero car recolours as you scroll; the fitting room tries films and light */
(function () {
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const json = id => { try { return JSON.parse(document.getElementById(id).textContent); } catch (e) { return null; } };
  const COL = json('colors-data'), PR = json('prices-data');
  const FN = { gloss: 'Глянец', satin: 'Сатин', matte: 'Мат', chrome: 'Хром', shift: 'Хамелеон' };
  const byName = n => COL.list.find(c => c.name === n);
  const stopsOf = (c, flip) => flip && c.hex2 ? Car.finishStops(c.hex2, c.finish, c.hex) : Car.finishStops(c.hex, c.finish, c.hex2);
  const swBg = c => c.finish === 'chrome' ? `linear-gradient(180deg,#f7fafc,${Car.mix('#9fb6cc', c.hex, .5)} 45%,#2a2622 52%,${Car.mix('#cdbba3', c.hex, .35)})`
    : c.finish === 'shift' ? `linear-gradient(135deg,${c.hex},${c.hex2})` : `linear-gradient(180deg,${Car.L(c.hex, .35)},${c.hex} 50%,${Car.L(c.hex, -.45)})`;

  /* ---------- hero: one colour per scroll step ---------- */
  function hero(sec) {
    const track = sec.querySelector('.wr-track'), st = sec.querySelector('.wr-sticky'), host = sec.querySelector('.wr-car'), word = sec.querySelector('.wr-word'), dotsBox = sec.querySelector('.wr-dots');
    const seq = (COL.hero || []).map(byName).filter(Boolean); if (!seq.length) return;
    dotsBox.innerHTML = seq.map(c => `<span class="wr-dot"><i style="background:${c.hex}"></i><span>${c.name}</span></span>`).join('');
    const dots = [...dotsBox.children];
    let cur = stopsOf(seq[0]), idx = -1;
    host.innerHTML = Car.carSVG('wh', { stops: cur, reflect: true, shadowOpacity: .35, label: 'Автомобиль меняет цвет плёнки' });
    const grad = host.querySelector('#wh-paint');
    const show = i => {
      if (i === idx) return; idx = i;
      const c = seq[i], to = stopsOf(c); Car.tweenStops(grad, cur, to, 700); cur = to;
      word.textContent = c.name; sec.style.setProperty('--wr-c', c.hex);
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
    };
    show(0);
    if (reduce()) return;
    track.classList.add('on');
    let tick = false;
    const upd = () => {
      tick = false;
      const r = track.getBoundingClientRect(), top = parseFloat(getComputedStyle(st).top) || 0, total = r.height - st.offsetHeight;
      const p = total > 0 ? clamp((top - r.top) / total, 0, 1) : 1;
      show(Math.min(seq.length - 1, Math.floor(p * seq.length * .999)));
    };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener('resize', upd); upd();
  }

  /* ---------- fitting room ---------- */
  function studio(sec) {
    const stage = sec.querySelector('.studio-stage'), host = sec.querySelector('.studio-car'), sw = sec.querySelector('#wrSw');
    const finSeg = sec.querySelector('.seg[data-g="fin"]'), lightSeg = sec.querySelector('.seg[data-g="light"]');
    const nameEl = sec.querySelector('.sn-name'), finEl = sec.querySelector('.sn-fin'), badge = sec.querySelector('.sn-badge'), priceEl = sec.querySelector('#wrPrice'), metaEl = sec.querySelector('#wrMeta');
    const wrapPrice = (PR && PR.calc && PR.calc.wrap) || {};
    let color = byName(COL.month) || COL.list[0], fin = color.finish, cur = stopsOf(color), timer = 0, flip = false;
    host.innerHTML = Car.carSVG('ws', { stops: cur, reflect: true, shadowOpacity: .35, label: 'Примерка цвета плёнки на автомобиле' });
    const grad = host.querySelector('#ws-paint');
    const renderSwatches = () => {
      sw.innerHTML = COL.list.filter(c => c.finish === fin).map(c => `<button type="button" class="swatch" data-name="${c.name}" aria-pressed="false" aria-label="${c.name}" title="${c.name}" style="background:${swBg(c)}"></button>`).join('');
      finSeg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === fin)));
    };
    const pick = c => {
      color = c; flip = false; clearInterval(timer);
      const to = stopsOf(c); Car.tweenStops(grad, cur, to, 750); cur = to;
      nameEl.textContent = c.name; finEl.textContent = `${FN[c.finish]} · плёнка`; badge.hidden = c.name !== COL.month;
      const base = wrapPrice[c.finish];
      priceEl.textContent = base ? `от ${fmt(Math.round(base / 1000) * 1000)} ₽` : 'Цена по запросу';
      metaEl.textContent = c.finish === 'chrome' || c.finish === 'shift' ? 'Винил · около 7 дней в студии' : 'Винил · около 5 дней в студии';
      sw.querySelectorAll('.swatch').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.name === c.name)));
      if (c.finish === 'shift' && c.hex2 && !reduce()) timer = setInterval(() => { flip = !flip; const t = stopsOf(color, flip); Car.tweenStops(grad, cur, t, 1600); cur = t; }, 2400);
    };
    finSeg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.dataset.v === fin) return; fin = b.dataset.v; renderSwatches(); const first = COL.list.find(c => c.finish === fin); if (first) pick(first); });
    sw.addEventListener('click', e => { const b = e.target.closest('.swatch'); if (!b) return; const c = byName(b.dataset.name); if (c) pick(c); });
    lightSeg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      stage.classList.remove('day', 'box', 'dusk'); stage.classList.add(b.dataset.v);
      lightSeg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    });
    sec.querySelector('#wrSend').addEventListener('click', () => {
      const note = document.getElementById('fNote'), svc = document.getElementById('fService');
      if (note) note.value = `Смена цвета: ${color.name.toLowerCase()}, ${FN[color.finish].toLowerCase()}`;
      if (svc) svc.value = 'wrap';
      const c = document.getElementById('contacts'); if (c) c.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth' });
      if (window.Site) window.Site.toast('Цвет добавлен в заявку. Осталось оставить телефон.');
    });
    renderSwatches(); pick(color);
  }

  function init() {
    if (!COL) return;
    const run = (sel, fn) => { const el = document.querySelector(sel); if (el) try { fn(el); } catch (e) { console.error(e); } };
    run('.wr-hero', hero); run('.studio-sec', studio);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
