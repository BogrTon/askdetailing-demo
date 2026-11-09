/* Tools: calculator, compare table, works filter, request to Telegram, cookie notice, menu, placeholders */
(function () {
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#a6e01e';
  const plural =(n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c); };
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  // Prices come from src/data/prices.json, injected by the build into <script id="prices-data">.
  const DATA = (() => { try { return JSON.parse(document.getElementById('prices-data').textContent); } catch (e) { return null; } })();

  let toastTimer = 0;
  function toast(text) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = text; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3600);
  }
  /* ---------- requests go to Telegram: the site prepares the text, the visitor presses «Отправить» ---------- */
  // Nothing is stored or sent by the site. t.me/<username> and t.me/+<phone> accept ?text= and put it into the message box;
  // any other link (for example a Telegram Business chat link t.me/m/…) opens as it is, and our text goes to the clipboard.
  const ORDER = ((document.querySelector('meta[name="ask-order"]') || {}).content || '').trim();
  const SITE = ((document.querySelector('meta[property="og:site_name"]') || {}).content || 'ASK Detailing').trim();
  const TG_RE = /^https?:\/\/t\.me\/(\+\d{7,15}|[A-Za-z][A-Za-z0-9_]{3,31})\/?$/;
  const tgHref = text => {
    const m = TG_RE.exec(ORDER);
    return m ? { href: `https://t.me/${m[1]}?text=${encodeURIComponent(text)}`, prefill: true } : { href: ORDER, prefill: false };
  };
  const tgTo = () => { const m = TG_RE.exec(ORDER); return m ? (m[1][0] === '+' ? m[1] : '@' + m[1]) : 'студии'; };
  const copy = text => navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text).then(() => true, () => false) : Promise.resolve(false);
  // a link that opens Telegram with the text from getText(); the href is filled in on click, so it always carries the latest text
  function tgLink(a, getText) {
    if (!a || !ORDER) return;
    a.addEventListener('click', () => {
      const text = getText(), h = tgHref(text);
      a.href = h.href;
      if (!h.prefill) copy(text).then(ok => { if (ok) toast('Текст сообщения скопирован: вставьте его в чат и отправьте.'); });
    });
  }
  const hello = extra => `Здравствуйте! Пишу с сайта ${SITE}.` + (extra ? ' ' + extra : '');
  window.Site = { toast, tgHref, tgLink, hello, SITE };

  /* ---------- calculator ---------- */
  // Zone shapes on the side-view car (id, name, minimal standard price, path). Prices live in prices.json → calc.zones:
  // «от–до» for standard and premium film, from a compact car to an SUV; the car class picks its part of that range.
  const ZONES = [
    ['fenderR', 'Задние крылья', 0, 'M80 150 L334 120 L332 168 L338 234 L338 252 L80 252 Z'],
    ['door', 'Двери', 0, 'M334 134 L548 128 L556 168 L556 200 L549 232 L338 234 L332 168 Z'],
    ['fenderF', 'Передние крылья', 0, 'M552 128 L706 148 L706 252 L546 252 L555 200 L556 168 Z'],
    ['bumperF', 'Передний бампер', 0, 'M706 120 L780 120 L780 252 L706 252 Z'],
    ['bumperR', 'Задний бампер', 0, 'M20 140 L82 140 L82 252 L20 252 Z'],
    ['skirt', 'Пороги', 0, 'M242 224 L566 220 L566 252 L242 252 Z'],
    ['roof', 'Стойки и крыша', 0, 'M230 60 L548 60 L548 128 L520 133 L484 106 L462 100 L410 95 L372 98 L330 104 L300 118 L284 137 L230 142 Z'],
    ['hood', 'Капот', 0, 'M534 112 L716 146 L716 166 L540 138 Z'],
    ['head', 'Фары', 0, null],
    ['mirror', 'Зеркала', 0, null]
  ];
  const CD = (DATA && DATA.calc) || {};
  const ZP = CD.zones || {};
  const zr = (id, film) => (ZP[id] && ZP[id][film]) || [0, 0];
  ZONES.forEach(z => { z[2] = zr(z[0], 'std')[0]; });
  window.CarZones = ZONES;
  const PACKS = ((DATA && DATA.ppfPacks) || []).map(p => ({ id: p.id, name: p.name, zones: p.zones, from: p.from, days: p.days }));
  const COLORS = [['Обсидиан', '#16181c'], ['Графит', '#4b5158'], ['Хаки', '#5b6341'], ['Изумруд', '#0e5e48'], ['Ультрамарин', '#2244b0'], ['Песок', '#c4b493'], ['Бордо', '#6b1424'], ['Белый', '#eceff1', true]];
  const FIN = { gloss: 'глянец', satin: 'сатин', matte: 'мат', chrome: 'хром' };
  const CLS = { c: 'компакт', s: 'седан', k: 'кроссовер', x: 'внедорожник' };
  const FILM = { std: 'стандарт', pre: 'премиум' };
  const WIN = Object.assign({ c: [0, .4], s: [.2, .6], k: [.4, .8], x: [.6, 1] }, CD.classes || {});
  const WRAP = Object.assign({ whiteGloss: 110000, whiteMatte: 140000, color: 180000, chrome: 350000 }, CD.wrap || {});
  const WCLS = Object.assign({ c: 1, s: 1.18, k: 1.29, x: 1.47 }, CD.wrapClasses || {});
  const SPREAD = CD.spread != null ? CD.spread : .15;
  const lerp = (a, b, t) => a + (b - a) * t;
  const samePack = ids => PACKS.find(p => p.zones.length === ids.length && p.zones.every(z => ids.includes(z)));
  // film price for a set of zones: sum of each zone's range at the class position; an exact package keeps its own «от» price
  function ppfRange(ids, film, cls) {
    const [t0, t1] = WIN[cls] || [0, 1];
    let lo = 0, hi = 0, minStd = 0;
    ids.forEach(id => { const r = zr(id, film); lo += lerp(r[0], r[1], t0); hi += lerp(r[0], r[1], t1); minStd += zr(id, 'std')[0]; });
    const pack = samePack(ids), k = pack && pack.from && minStd ? pack.from / minStd : 1;
    return { lo: lo * k, hi: hi * k, pack, minStd };
  }
  // vinyl «от» price: white gloss and white matte have their own prices, chrome too, everything else is colour vinyl
  const wrapFrom = (white, fin) => fin === 'chrome' ? WRAP.chrome : white ? (fin === 'gloss' ? WRAP.whiteGloss : WRAP.whiteMatte) : WRAP.color;
  window.Prices = { ppfRange, wrapFrom, WRAP };

  function calc(root) {
    if (!root) return;
    const P = Car.P;
    const first = PACKS.find(p => p.id === 'risk') || PACKS[0];
    const st = { mode: 'ppf', cls: 's', film: 'std', fin: 'gloss', color: '#0e5e48', sel: new Set(first ? first.zones : ['hood']) };
    const zp = z => `<path class="zone" data-z="${z[0]}" d="${z[3] || P[z[0] === 'head' ? 'head' : 'mirror']}"><title>${z[1]}</title></path>`;
    const ppfStops = () => Car.finishStops('#d3d9de', 'gloss');
    const host = root.querySelector('.calc-car');
    host.innerHTML = Car.carSVG('cl', {
      stops: ppfStops(), label: 'Схема зон автомобиля: нажмите на деталь', shadowOpacity: .25, rimOpacity: .5,
      clipped: ZONES.filter(z => z[3]).map(zp).join(''), over: ZONES.filter(z => !z[3]).map(zp).join('')
    });
    const grad = host.querySelector('#cl-paint');
    let cur = ppfStops();
    const zb = root.querySelector('#calcZ'), pk = root.querySelector('#calcPk'), sw = root.querySelector('#calcSw');
    zb.innerHTML = ZONES.map(z => `<button type="button" class="chip" data-z="${z[0]}" aria-pressed="false">${z[1]}</button>`).join('');
    pk.innerHTML = PACKS.map((p, i) => `<button type="button" class="chip" data-p="${i}" aria-pressed="false">${p.name}</button>`).join('');
    if (sw) sw.innerHTML = COLORS.map(c => `<button type="button" class="swatch" data-c="${c[1]}" aria-pressed="false" aria-label="${c[0]}" title="${c[0]}" style="background:linear-gradient(180deg,${Car.L(c[1], .35)},${c[1]} 50%,${Car.L(c[1], -.45)})"></button>`).join('');
    const priceEl = root.querySelector('#calcPrice'), metaEl = root.querySelector('#calcMeta'), modeEl = root.querySelector('#calcMode');
    const paint = () => { const to = st.mode === 'ppf' ? ppfStops() : Car.finishStops(st.color, st.fin); Car.tweenStops(grad, cur, to, 650); cur = to; };
    const r1000 = v => Math.round(v / 1000) * 1000;
    let summary = '';
    // 2D или 3D: 3D-модуль с Three.js грузится только по нажатию «3D»
    const vseg = root.querySelector('.view-seg'), box3d = root.querySelector('.calc-3d'), note = root.querySelector('.calc-note'), note2d = note ? note.textContent : '';
    const play = box3d && box3d.querySelector('.c3d-play');
    let view3d = null, loading3d = false, is3d = false;
    const state3d = () => ({ mode: st.mode, body: st.cls, zones: [...st.sel], paint: { hex: st.color, finish: st.fin } });
    const sync3d = () => {
      if (note) note.textContent = !is3d ? note2d : st.mode === 'ppf' ? 'Потяните, чтобы повернуть машину. Нажмите на деталь, чтобы добавить её в расчёт.' : 'Потяните, чтобы повернуть машину. Новый цвет ложится полосой, как плёнка.';
      if (play) play.hidden = !view3d || st.mode !== 'ppf';
      if (view3d) view3d.set(state3d());
    };
    async function setView(v) {
      is3d = v === '3d';
      vseg.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
      host.hidden = is3d; box3d.hidden = !is3d; root.classList.toggle('is3d', is3d); sync3d();
      if (!is3d || view3d || loading3d) return;
      loading3d = true; box3d.classList.add('loading');
      try {
        const m = await import('./car3d.js?v=cb09d02e');
        view3d = await m.mount(box3d, { ...state3d(), accent: accent(), onZone: z => { st.sel.has(z) ? st.sel.delete(z) : st.sel.add(z); render(); } });
      } catch (e) {
        console.error(e); box3d.dataset.msg = 'Этот браузер не показывает 3D. Схема 2D работает как раньше.'; box3d.classList.add('failed');
        setTimeout(() => { box3d.classList.remove('failed'); setView('2d'); }, 2600);
      } finally { loading3d = false; box3d.classList.remove('loading'); sync3d(); }
    }
    if (vseg && box3d) vseg.addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
    if (play) play.addEventListener('click', () => view3d && view3d.applyFilm());
    function render() {
      root.classList.toggle('ppfmode', st.mode === 'ppf'); root.classList.toggle('wrapmode', st.mode === 'wrap');
      root.querySelectorAll('.zone').forEach(p => p.classList.toggle('on', st.mode === 'ppf' && st.sel.has(p.dataset.z)));
      zb.querySelectorAll('[data-z]').forEach(b => b.setAttribute('aria-pressed', String(st.sel.has(b.dataset.z))));
      pk.querySelectorAll('[data-p]').forEach(b => { const s = PACKS[b.dataset.p].zones; b.setAttribute('aria-pressed', String(s.length === st.sel.size && s.every(z => st.sel.has(z)))); });
      if (sw) sw.querySelectorAll('[data-c]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === st.color)));
      root.querySelectorAll('.seg[data-g]').forEach(s => s.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(st[s.dataset.g] === b.dataset.v))));
      let lo = 0, hi = 0, meta;
      if (st.mode === 'ppf') {
        const chosen = ZONES.filter(z => st.sel.has(z[0])), n = chosen.length, pr = ppfRange(chosen.map(z => z[0]), st.film, st.cls);
        lo = pr.lo; hi = pr.hi;
        const days = Math.max(1, Math.ceil(pr.minStd / 45000));
        meta = !n ? 'Выберите хотя бы одну зону' : pr.pack ? `Пакет «${pr.pack.name}» · ${pr.pack.days} в студии` : `${n} ${plural(n, 'зона', 'зоны', 'зон')} · ${days} ${plural(days, 'день', 'дня', 'дней')} в студии`;
        modeEl.textContent = n ? `Защитная плёнка · ${n} ${plural(n, 'зона', 'зоны', 'зон')}` : 'Защитная плёнка';
        summary = `Защитная плёнка: ${pr.pack ? pr.pack.name.toLowerCase() : chosen.map(z => z[1].toLowerCase()).join(', ')}; ${CLS[st.cls]}, плёнка ${FILM[st.film]}`;
      } else {
        const c = COLORS.find(c => c[1] === st.color);
        lo = wrapFrom(c && c[2], st.fin) * (WCLS[st.cls] || 1); hi = lo * (1 + SPREAD);
        const days = st.fin === 'chrome' ? 7 : 5;
        meta = `Полная смена цвета · ${days} дней в студии`;
        modeEl.textContent = `Смена цвета · ${c ? c[0].toLowerCase() : ''}, ${FIN[st.fin]}`;
        summary = `Смена цвета: ${c ? c[0].toLowerCase() : ''}, ${FIN[st.fin]}; ${CLS[st.cls]}`;
      }
      const a1 = r1000(lo), b1 = Math.max(r1000(hi), a1);
      const range = lo ? (b1 > a1 ? `${fmt(a1)} – ${fmt(b1)} ₽` : `от ${fmt(a1)} ₽`) : '—';
      priceEl.textContent = range; metaEl.textContent = meta;
      if (lo) summary += ` — ориентировочно ${range}`;
      sync3d();
    }
    root.addEventListener('click', e => {
      const z = e.target.closest('[data-z]');
      if (z && st.mode === 'ppf') { const k = z.dataset.z; st.sel.has(k) ? st.sel.delete(k) : st.sel.add(k); render(); return; }
      const p = e.target.closest('[data-p]');
      if (p) { st.sel = new Set(PACKS[p.dataset.p].zones); render(); return; }
      const c = e.target.closest('[data-c]');
      if (c) { st.color = c.dataset.c; paint(); render(); return; }
      const b = e.target.closest('.seg[data-g] button');
      if (b) { const g = b.parentElement.dataset.g; if (st[g] !== b.dataset.v) { st[g] = b.dataset.v; if (g === 'mode' || g === 'fin') paint(); render(); } return; }
    });
    tgLink(root.querySelector('#calcSend'), () => `Здравствуйте! Посчитал стоимость на сайте ${SITE}.\n${summary}.\nПодскажите, пожалуйста, свободные даты для осмотра.`);
    render();
  }

  /* ---------- sound insulation: zones on a top view, the sum goes to Telegram ---------- */
  function noise(root) {
    if (!root || !DATA || !DATA.noise) return;
    const Z = DATA.noise.zones || [], st = { sel: new Set(['doors']), pano: false };
    const chips = root.querySelector('#nsZ'), priceEl = root.querySelector('#nsPrice'), metaEl = root.querySelector('#nsMeta'), seg = root.querySelector('.seg[data-g="roofType"]');
    const price = z => z.id === 'roof' && st.pano && z.pano != null ? z.pano : z.price;
    const label = z => z.id === 'roof' ? `${z.name} ${st.pano ? 'с панорамой' : 'без панорамы'}` : z.name;
    chips.innerHTML = Z.map(z => `<button type="button" class="chip" data-nz="${z.id}" aria-pressed="false">${z.name}<span class="n"></span></button>`).join('');
    let summary = '';
    const render = () => {
      const chosen = Z.filter(z => st.sel.has(z.id)), sum = chosen.reduce((a, z) => a + price(z), 0), names = chosen.map(z => label(z).toLowerCase()).join(', ');
      chips.querySelectorAll('[data-nz]').forEach(b => { const z = Z.find(x => x.id === b.dataset.nz); b.setAttribute('aria-pressed', String(st.sel.has(z.id))); b.querySelector('.n').textContent = fmt(price(z)); });
      root.querySelectorAll('.nz').forEach(g => g.classList.toggle('on', st.sel.has(g.dataset.zone)));
      if (seg) seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.v === 'pano') === st.pano)));
      priceEl.textContent = sum ? `от ${fmt(sum)} ₽` : '—';
      metaEl.textContent = chosen.length ? names[0].toUpperCase() + names.slice(1) : 'Выберите хотя бы одну зону';
      summary = chosen.length ? `${names} — от ${fmt(sum)} ₽` : '';
    };
    const toggle = id => { st.sel.has(id) ? st.sel.delete(id) : st.sel.add(id); render(); };
    chips.addEventListener('click', e => { const b = e.target.closest('[data-nz]'); if (b) toggle(b.dataset.nz); });
    root.querySelectorAll('.nz').forEach(g => g.addEventListener('click', () => toggle(g.dataset.zone)));
    if (seg) seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.pano = b.dataset.v === 'pano'; render(); });
    tgLink(root.querySelector('#nsSend'), () => summary ? `Здравствуйте! Посчитал шумоизоляцию на сайте ${SITE}: ${summary}.\nПодскажите, пожалуйста, свободные даты.` : hello('Хочу узнать про шумоизоляцию.'));
    render();
  }

  /* ---------- compare ---------- */
  // tables come from prices.json: film packages (ppfPacks) and compare.pol / compare.dry
  const CMP = {};
  if (DATA) {
    const packs = DATA.ppfPacks || [], th = DATA.film && DATA.film.thickness ? `${DATA.film.thickness} мкм` : '';
    const same = v => packs.map(() => v);
    if (packs.length) CMP.ppf = {
      h: packs.map(p => [p.name, `от ${fmt(p.from)} ₽`]),
      rows: [['Что входит', ...packs.map(p => p.parts)], ['Срок', ...packs.map(p => p.days)], ['Плёнка', ...same('Стандарт или премиум')], ...(th ? [['Толщина', ...same(th)]] : []), ['Самовосстановление', ...same('+')], ['Гарантия', ...same('По условиям производителя плёнки')]]
    };
    Object.keys(DATA.compare || {}).forEach(k => { const d = DATA.compare[k]; if (d && d.cols) CMP[k] = { h: d.cols.map(c => [c[0], `от ${fmt(c[1])} ₽`]), rows: d.rows }; });
  }
  function compare(root) {
    if (!root) return;
    const box = root.querySelector('.cmp-scroll'), seg = root.querySelector('.seg');
    const cell = v => v === '+' ? '<span class="yes" role="img" aria-label="Да">✓</span>' : v === '—' ? '<span class="no" aria-label="Нет">—</span>' : v;
    const render = k => {
      const d = CMP[k]; if (!d) { box.textContent = ''; return; }
      box.innerHTML = `<table class="cmp c${d.h.length}"><thead><tr><th scope="col"><span class="sr">Параметр</span></th>${d.h.map(h => `<th scope="col"><span class="n">${h[0]}</span><span class="p">${h[1]}</span></th>`).join('')}</tr></thead><tbody>${d.rows.map(r => `<tr><td>${r[0]}</td>${r.slice(1).map(v => `<td>${cell(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    };
    if (seg) seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); render(b.dataset.v); });
    render(root.dataset.start || 'ppf');
  }

  /* ---------- works: case pictures + filter ---------- */
  function works(root) {
    if (!root) return;
    root.querySelectorAll('.case-pic[data-car]').forEach((el, i) => {
      const [kind, c1, c2] = el.dataset.car.split(':');
      const o = { shadowOpacity: .35, rimOpacity: .5, label: el.dataset.label || 'Автомобиль' };
      if (kind === 'ppf') { o.stops = Car.finishStops('#d3d9de', 'gloss'); o.clipped = '<rect x="536" y="60" width="264" height="200" fill="rgba(127,191,10,.42)"/>'; }
      else o.stops = Car.finishStops(c1, kind, c2);
      el.insertAdjacentHTML('beforeend', Car.carSVG('cs' + i, o));
    });
    const chips = root.querySelector('.filters'), cards = [...root.querySelectorAll('.case')];
    if (chips) chips.addEventListener('click', e => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      chips.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const f = b.dataset.f;
      cards.forEach(c => { c.hidden = f !== 'all' && !c.dataset.cat.split(' ').includes(f); });
    });
  }

  /* ---------- request: the form builds a message, Telegram opens with it ---------- */
  function form(f) {
    if (!f) return;
    const svc = f.querySelector('#fService'), car = f.querySelector('#fCar'), note = f.querySelector('#fNote');
    const out = f.querySelector('[data-tg-text]'), to = f.querySelector('[data-tg-to]'), send = f.querySelector('#fSend');
    const text = () => {
      const lines = [];
      if (svc && svc.value) lines.push(`Услуга: ${svc.options[svc.selectedIndex].text}`);
      const c = car ? car.value.trim() : ''; if (c) lines.push(`Машина: ${c}`);
      const n = note ? note.value.trim() : ''; if (n) lines.push(`Комментарий: ${n}`);
      return lines.length ? [hello(), ...lines].join('\n') : hello('Хочу записаться на осмотр.');
    };
    const upd = () => { if (out) out.textContent = text(); };
    if (to) to.textContent = tgTo();
    f.addEventListener('input', upd); f.addEventListener('change', upd); upd();
    tgLink(send, text);
    // Enter in a field works like the button
    f.addEventListener('submit', e => { e.preventDefault(); if (send) send.click(); });
  }

  /* ---------- Yandex Metrica: loads only after "Принять", never with Webvisor ---------- */
  function metrika() {
    const banner = document.querySelector('.cookie'), id = banner && banner.dataset.metrika;
    if (!id || !/^\d+$/.test(id)) return;
    const load = () => {
      if (window.ym) return;
      (function (m, e, t, r, i, k, a) {
        m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); }; m[i].l = 1 * new Date();
        k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
      })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
      window.ym(+id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
    };
    // after a refusal, drop Metrica cookies set earlier on this site
    const drop = () => document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(n => /^_ym/.test(n)).forEach(n => {
      [location.hostname, '.' + location.hostname.replace(/^www\./, '')].forEach(d => { document.cookie = `${n}=; Max-Age=0; path=/; domain=${d}`; });
      document.cookie = `${n}=; Max-Age=0; path=/`;
    });
    const sync = () => { if (store.get('cookie-choice') === 'all') load(); else drop(); };
    sync();
    document.addEventListener('cookie-choice', sync);
  }

  /* ---------- cookie notice, menu, placeholder links ---------- */
  function cookie(el) {
    if (!el) return;
    el.hidden = !!store.get('cookie-choice');
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-cookie]'); if (!b) return;
      store.set('cookie-choice', b.dataset.cookie); el.hidden = true;
      document.dispatchEvent(new CustomEvent('cookie-choice'));
    });
  }
  function menu() {
    const btn = document.querySelector('.burger'), m = document.getElementById('mmenu'); if (!btn || !m) return;
    const set = open => { m.hidden = !open; btn.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('menu-open', open); document.body.style.overflow = open ? 'hidden' : ''; };
    btn.addEventListener('click', () => set(m.hidden));
    m.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !m.hidden) { set(false); btn.focus(); } });
  }
  function placeholders() {
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-ph]'); if (!a) return;
      e.preventDefault(); toast(a.dataset.ph || 'В прототипе эта ссылка ещё не подключена.');
    });
  }

  function illos() {
    document.querySelectorAll('[data-ill="ppf"]').forEach((el, i) => {
      el.innerHTML = Car.carSVG('il' + i, { stops: Car.finishStops('#d3d9de', 'gloss'), shadowOpacity: .25, rimOpacity: .4, label: 'Передняя часть машины под плёнкой',
        clipped: '<rect x="536" y="60" width="264" height="200" fill="rgba(127,191,10,.42)"/>' });
    });
  }

  /* Russian typography: bind short words to the next word and keep dashes off line starts */
  function typo() {
    const re = /(^|[\s(«])([А-Яа-яЁё]{1,2})\s+/g;
    ['.ribbon', 'main', '.foot'].forEach(sel => {
      const root = document.querySelector(sel); if (!root) return;
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && n.parentElement.closest('script,style,textarea,svg,select') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      const nodes = []; while (walk.nextNode()) nodes.push(walk.currentNode);
      nodes.forEach(n => {
        let t = n.nodeValue, prev;
        do { prev = t; t = t.replace(re, '$1$2\u00a0'); } while (t !== prev);
        t = t.replace(/ —/g, '\u00a0—')
          .replace(/(^|[\s(])(№|ст\.|ч\.|п\.|подп\.|г\.|д\.|ул\.) (?=[\dА-ЯЁ«])/g, '$1$2\u00a0')  // «ч. 2 ст. 9», «г. Москва»
          .replace(/(\d) (?=(?:рабоч|дн|час|минут|год|лет|мес|фото|работ|марк|машин|мкм|%|₽))/g, '$1\u00a0')  // «10 рабочих дней»
          .replace(/(^|[\s(])т\. ([пдеч])\./g, '$1т.\u00a0$2.');  // «т. п.», «т. е.»
        n.nodeValue = t;
      });
    });
  }

  /* Блоки больше не появляются при прокрутке и цифры не «набегают»: страница сразу видна целиком. */

  function init() {
    try { typo(); } catch (e) { console.error(e); }
    try { illos(); } catch (e) { console.error(e); }
    const run = (sel, fn) => { const el = document.querySelector(sel); if (el) try { fn(el); } catch (e) { console.error(e); } };
    run('.hs', Scenes.hero); run('.hl-rail', Scenes.highlights); run('.ba:not([data-draw])', Scenes.ba);
    try { calc(document.querySelector('.calc:not(.ns-calc)')); } catch (e) { console.error(e); }
    try { noise(document.getElementById('noise')); } catch (e) { console.error(e); }
    try { compare(document.getElementById('compare')); } catch (e) { console.error(e); }
    try { works(document.getElementById('works')); } catch (e) { console.error(e); }
    try { form(document.getElementById('requestForm')); } catch (e) { console.error(e); }
    try { document.querySelectorAll('a[data-tg]').forEach(a => tgLink(a, () => a.dataset.tg || hello('Хочу записаться на осмотр.'))); } catch (e) { console.error(e); }
    try { metrika(); } catch (e) { console.error(e); }
    cookie(document.querySelector('.cookie')); menu(); placeholders();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
