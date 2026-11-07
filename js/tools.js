/* Tools: calculator, compare table, works filter, request form, cookie notice, menu, placeholders */
(function () {
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c); };
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  // Prices come from src/data/prices.json, injected by the build into <script id="prices-data">.
  const DATA = (() => { try { return JSON.parse(document.getElementById('prices-data').textContent); } catch (e) { return null; } })();

  let toastTimer = 0;
  function toast(text) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = text; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3600);
  }
  window.Site = { toast };

  /* ---------- calculator ---------- */
  const ZONES = [
    ['fenderR', 'Задние крылья', 32000, 'M80 150 L334 120 L332 168 L338 234 L338 252 L80 252 Z'],
    ['door', 'Двери', 40000, 'M334 134 L548 128 L556 168 L556 200 L549 232 L338 234 L332 168 Z'],
    ['fenderF', 'Передние крылья', 17000, 'M552 128 L706 148 L706 252 L546 252 L555 200 L556 168 Z'],
    ['bumperF', 'Передний бампер', 24000, 'M706 120 L780 120 L780 252 L706 252 Z'],
    ['bumperR', 'Задний бампер', 18000, 'M20 140 L82 140 L82 252 L20 252 Z'],
    ['skirt', 'Пороги', 10000, 'M242 224 L566 220 L566 252 L242 252 Z'],
    ['roof', 'Стойки и крыша', 21000, 'M230 60 L548 60 L548 128 L520 133 L484 106 L462 100 L410 95 L372 98 L330 104 L300 118 L284 137 L230 142 Z'],
    ['hood', 'Капот', 24000, 'M534 112 L716 146 L716 166 L540 138 Z'],
    ['head', 'Фары', 7000, null],
    ['mirror', 'Зеркала', 5000, null]
  ];
  if (DATA && DATA.calc && DATA.calc.zones) ZONES.forEach(z => { if (DATA.calc.zones[z[0]] != null) z[2] = DATA.calc.zones[z[0]]; });
  window.CarZones = ZONES;
  const PACKS = DATA && DATA.ppfPacks ? DATA.ppfPacks.map(p => [p.name, p.zones])
    : [['Оптика', ['head']], ['Зоны риска', ['bumperF', 'head', 'mirror', 'skirt']], ['Ударная часть', ['bumperF', 'hood', 'fenderF', 'head', 'mirror']], ['Весь кузов', ZONES.map(z => z[0])]];
  const COLORS = [['Обсидиан', '#16181c'], ['Графит', '#4b5158'], ['Хаки', '#5b6341'], ['Изумруд', '#0e5e48'], ['Ультрамарин', '#2244b0'], ['Песок', '#c4b493'], ['Бордо', '#6b1424'], ['Перламутр', '#eceff1']];
  const FIN = { gloss: 'глянец', satin: 'сатин', matte: 'мат', chrome: 'хром' };
  const CLS = { c: [.85, 'компакт'], s: [1, 'седан'], k: [1.1, 'кроссовер'], x: [1.25, 'внедорожник'] };
  const FILM = { std: [1, 'стандарт'], pre: [1.3, 'премиум'] };
  const WRAP = { gloss: 150000, satin: 160000, matte: 160000, chrome: 260000 };
  const CD = (DATA && DATA.calc) || {};
  Object.keys(CLS).forEach(k => { if (CD.classes && CD.classes[k] != null) CLS[k][0] = CD.classes[k]; });
  Object.keys(FILM).forEach(k => { if (CD.films && CD.films[k] != null) FILM[k][0] = CD.films[k]; });
  Object.assign(WRAP, CD.wrap || {});
  const SPREAD = CD.spread != null ? CD.spread : .15;

  function calc(root) {
    if (!root) return;
    const P = Car.P;
    const st = { mode: 'ppf', cls: 's', film: 'std', fin: 'gloss', color: '#0e5e48', sel: new Set(PACKS[2][1]) };
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
    pk.innerHTML = PACKS.map((p, i) => `<button type="button" class="chip" data-p="${i}" aria-pressed="false">${p[0]}</button>`).join('');
    if (sw) sw.innerHTML = COLORS.map(c => `<button type="button" class="swatch" data-c="${c[1]}" aria-pressed="false" aria-label="${c[0]}" title="${c[0]}" style="background:linear-gradient(180deg,${Car.L(c[1], .35)},${c[1]} 50%,${Car.L(c[1], -.45)})"></button>`).join('');
    const priceEl = root.querySelector('#calcPrice'), metaEl = root.querySelector('#calcMeta'), modeEl = root.querySelector('#calcMode');
    const paint = () => { const to = st.mode === 'ppf' ? ppfStops() : Car.finishStops(st.color, st.fin); Car.tweenStops(grad, cur, to, 650); cur = to; };
    const r1000 = v => Math.round(v / 1000) * 1000;
    let summary = '';
    function render() {
      root.classList.toggle('ppfmode', st.mode === 'ppf'); root.classList.toggle('wrapmode', st.mode === 'wrap');
      root.querySelectorAll('.zone').forEach(p => p.classList.toggle('on', st.mode === 'ppf' && st.sel.has(p.dataset.z)));
      zb.querySelectorAll('[data-z]').forEach(b => b.setAttribute('aria-pressed', String(st.sel.has(b.dataset.z))));
      pk.querySelectorAll('[data-p]').forEach(b => { const s = PACKS[b.dataset.p][1]; b.setAttribute('aria-pressed', String(s.length === st.sel.size && s.every(z => st.sel.has(z)))); });
      if (sw) sw.querySelectorAll('[data-c]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === st.color)));
      root.querySelectorAll('.seg[data-g]').forEach(s => s.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(st[s.dataset.g] === b.dataset.v))));
      let lo = 0, meta;
      if (st.mode === 'ppf') {
        const chosen = ZONES.filter(z => st.sel.has(z[0])), base = chosen.reduce((a, z) => a + z[2], 0), n = chosen.length;
        lo = base * CLS[st.cls][0] * FILM[st.film][0];
        const days = Math.max(1, Math.ceil(base / 45000));
        meta = n ? `${n} ${plural(n, 'зона', 'зоны', 'зон')} · ${days} ${plural(days, 'день', 'дня', 'дней')} в студии` : 'Выберите хотя бы одну зону';
        modeEl.textContent = n ? `Защитная плёнка · ${n} ${plural(n, 'зона', 'зоны', 'зон')}` : 'Защитная плёнка';
        const pack = PACKS.find(p => p[1].length === n && p[1].every(z => st.sel.has(z)));
        summary = `Защитная плёнка: ${pack ? pack[0].toLowerCase() : chosen.map(z => z[1].toLowerCase()).join(', ')}; ${CLS[st.cls][1]}, плёнка ${FILM[st.film][1]}`;
      } else {
        lo = WRAP[st.fin] * CLS[st.cls][0];
        const days = st.fin === 'chrome' ? 7 : 5, c = COLORS.find(c => c[1] === st.color);
        meta = `Полная смена цвета · ${days} дней в студии`;
        modeEl.textContent = `Смена цвета · ${c ? c[0].toLowerCase() : ''}, ${FIN[st.fin]}`;
        summary = `Смена цвета: ${c ? c[0].toLowerCase() : ''}, ${FIN[st.fin]}; ${CLS[st.cls][1]}`;
      }
      const range = lo ? `${fmt(r1000(lo))} – ${fmt(r1000(lo * (1 + SPREAD)))} ₽` : '—';
      priceEl.textContent = range; metaEl.textContent = meta;
      if (lo) summary += ` — ориентировочно ${range}`;
    }
    root.addEventListener('click', e => {
      const z = e.target.closest('[data-z]');
      if (z && st.mode === 'ppf') { const k = z.dataset.z; st.sel.has(k) ? st.sel.delete(k) : st.sel.add(k); render(); return; }
      const p = e.target.closest('[data-p]');
      if (p) { st.sel = new Set(PACKS[p.dataset.p][1]); render(); return; }
      const c = e.target.closest('[data-c]');
      if (c) { st.color = c.dataset.c; paint(); render(); return; }
      const b = e.target.closest('.seg[data-g] button');
      if (b) { const g = b.parentElement.dataset.g; if (st[g] !== b.dataset.v) { st[g] = b.dataset.v; if (g === 'mode' || g === 'fin') paint(); render(); } return; }
      if (e.target.closest('#calcSend')) {
        const note = document.getElementById('fNote'), svc = document.getElementById('fService');
        if (note) note.value = summary;
        if (svc) svc.value = st.mode === 'ppf' ? 'ppf' : 'wrap';
        document.getElementById('contacts')?.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth' });
        toast('Расчёт добавлен в заявку. Осталось оставить телефон.');
      }
    });
    render();
  }

  /* ---------- compare ---------- */
  const CMP = {
    ppf: { h: [['Зоны риска', 'от 35 000 ₽'], ['Ударная часть', 'от 60 000 ₽'], ['Весь кузов', 'от 195 000 ₽']],
      rows: [['Что входит', 'Бампер, фары, зеркала, пороги', 'Бампер, капот, крылья, фары, зеркала', 'Все окрашенные детали'], ['Срок', '1–2 дня', '2–3 дня', '4–6 дней'], ['Плёнка', 'Стандарт или премиум', 'Стандарт или премиум', 'Стандарт или премиум'], ['Самовосстановление', '+', '+', '+'], ['Гарантия', 'По условиям производителя плёнки', 'По условиям производителя плёнки', 'По условиям производителя плёнки']] },
    cer: { h: [['Экспресс', 'от 15 000 ₽'], ['Стандарт', 'от 35 000 ₽'], ['Максимум', 'от 60 000 ₽']],
      rows: [['Подготовка', 'Мойка и обезжиривание', '+ полировка в 1 шаг', '+ полировка в 2–3 шага'], ['Слоёв покрытия', '1', '2', '3'], ['Срок', '1 день', '2 дня', '3 дня'], ['Гидрофобный эффект', '+', '+', '+']] },
    dry: { h: [['Экспресс', 'от 8 000 ₽'], ['Комплексная', 'от 18 000 ₽'], ['С разбором', 'от 25 000 ₽']],
      rows: [['Сиденья и ковры', '+', '+', '+'], ['Потолок и багажник', '—', '+', '+'], ['Снятие сидений', '—', '—', '+'], ['Кожа', 'Чистка', 'Чистка и пропитка', 'Чистка и пропитка'], ['Срок', '3–4 часа', '1 день', '2 дня']] }
  };
  if (DATA) {
    const packs = (DATA.ppfPacks || []).filter(p => p.id !== 'optics').slice(0, 3);
    const same = v => [v, v, v];
    if (packs.length === 3) CMP.ppf = {
      h: packs.map(p => [p.name, `от ${fmt(p.from)} ₽`]),
      rows: [['Что входит', ...packs.map(p => p.parts)], ['Срок', ...packs.map(p => p.days)], ['Плёнка', ...same('Стандарт или премиум')], ['Самовосстановление', ...same('+')], ['Гарантия', ...same('По условиям производителя плёнки')]]
    };
    ['cer', 'dry', 'pol'].forEach(k => { const d = DATA.compare && DATA.compare[k]; if (d) CMP[k] = { h: d.cols.map(c => [c[0], `от ${fmt(c[1])} ₽`]), rows: d.rows }; });
  }
  function compare(root) {
    if (!root) return;
    const box = root.querySelector('.cmp-scroll'), seg = root.querySelector('.seg');
    const cell = v => v === '+' ? '<span class="yes" role="img" aria-label="Да">✓</span>' : v === '—' ? '<span class="no" aria-label="Нет">—</span>' : v;
    const render = k => {
      const d = CMP[k];
      box.innerHTML = `<table class="cmp"><thead><tr><th scope="col"><span class="sr">Параметр</span></th>${d.h.map(h => `<th scope="col"><span class="n">${h[0]}</span><span class="p">${h[1]}</span></th>`).join('')}</tr></thead><tbody>${d.rows.map(r => `<tr><td>${r[0]}</td>${r.slice(1).map(v => `<td>${cell(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
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
      if (kind === 'ppf') { o.stops = Car.finishStops('#d3d9de', 'gloss'); o.clipped = '<rect x="536" y="60" width="264" height="200" fill="rgba(30,159,206,.4)"/>'; }
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

  /* ---------- request form ---------- */
  // Large photos are shrunk in the browser to 1600 px before upload: faster on mobile data, fits hosting limits.
  async function shrink(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 700 * 1024 || !window.createImageBitmap) return file;
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      const blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', .84));
      return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
    } catch (e) { return file; }
  }

  function form(f) {
    if (!f) return;
    const phone = f.querySelector('#fPhone'), files = f.querySelector('#fPhotos'), thumbs = f.querySelector('.files'), msg = f.querySelector('.form-msg');
    const btn = f.querySelector('button[type="submit"]'), consent = f.querySelector('#fConsent');
    let opened = Date.now();
    const say = (text, kind) => { msg.textContent = text; msg.classList.toggle('ok', kind === 'ok'); msg.classList.toggle('err', kind === 'err'); };
    phone.addEventListener('input', () => {
      let d = phone.value.replace(/\D/g, ''); if (d.startsWith('8')) d = '7' + d.slice(1); if (!d.startsWith('7')) d = '7' + d; d = d.slice(0, 11);
      const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
      phone.value = '+7' + (p[0] ? ' (' + p[0] : '') + (p[0].length === 3 ? ')' : '') + (p[1] ? ' ' + p[1] : '') + (p[2] ? '-' + p[2] : '') + (p[3] ? '-' + p[3] : '');
    });
    files.addEventListener('change', () => {
      thumbs.innerHTML = '';
      [...files.files].slice(0, 8).forEach(file => { if (!file.type.startsWith('image/')) return; const img = document.createElement('img'); img.alt = file.name; img.src = URL.createObjectURL(file); thumbs.appendChild(img); });
    });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (f.classList.contains('sending')) return;
      const digits = phone.value.replace(/\D/g, '');
      if (digits.length < 11) { say('Укажите телефон полностью, чтобы мастер мог ответить.', 'err'); phone.focus(); return; }
      if (!consent.checked) { say('Отметьте согласие на обработку персональных данных.', 'err'); consent.focus(); return; }
      const endpoint = f.dataset.endpoint;
      if (!endpoint) { say('Это демо-версия: заявка никуда не отправляется. На готовом сайте она сразу придёт мастеру.'); return; }
      f.classList.add('sending'); btn.disabled = true; say('Отправляем…');
      const call = f.dataset.phone ? ` Или позвоните: ${f.dataset.phone}.` : '';
      try {
        const fd = new FormData(f);
        fd.delete('photos[]');
        fd.set('t', String(Date.now() - opened));
        for (const file of [...files.files].slice(0, 8)) { const ready = await shrink(file); fd.append('photos[]', ready, ready.name); }
        const r = await fetch(endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
        const j = await r.json().catch(() => null);
        if (r.ok && j && j.ok) {
          f.reset(); thumbs.innerHTML = ''; opened = Date.now();
          say(j.message || 'Заявка отправлена. Мастер перезвонит вам.', 'ok');
        } else {
          const text = (j && j.message) || 'Не получилось отправить заявку.';
          say(f.dataset.phone && /Позвоните нам, пожалуйста\.$/.test(text) ? text.replace(/Позвоните нам, пожалуйста\.$/, `Позвоните нам: ${f.dataset.phone}.`) : text + call, 'err');
        }
      } catch (err) {
        say('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.' + call, 'err');
      } finally {
        f.classList.remove('sending'); btn.disabled = false;
      }
    });
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
        clipped: '<rect x="536" y="60" width="264" height="200" fill="rgba(30,159,206,.4)"/>' });
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

  /* scroll reveal: [data-rv] fades in itself, [data-rv-group] fades in its children one by one */
  function reveal() {
    if (reduce() || !('IntersectionObserver' in window)) return;
    const items = [...document.querySelectorAll('[data-rv]')];
    document.querySelectorAll('[data-rv-group]').forEach(g => items.push(...g.children));
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .1 });
    items.forEach(el => { el.classList.add('rv'); io.observe(el); });
  }

  /* Chinese brands block: the share counts up when it scrolls in */
  function china(root) {
    const b = root && root.querySelector('[data-count]');
    if (!b || reduce() || !('IntersectionObserver' in window)) return;
    const to = +b.dataset.count; b.textContent = '0';
    const io = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return;
      io.disconnect();
      const t0 = performance.now(), dur = 1500;
      const step = t => { const k = Math.min(1, (t - t0) / dur); b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: .35 });
    io.observe(b);
  }

  function init() {
    try { typo(); } catch (e) { console.error(e); }
    try { illos(); } catch (e) { console.error(e); }
    const run = (sel, fn) => { const el = document.querySelector(sel); if (el) try { fn(el); } catch (e) { console.error(e); } };
    run('.hs', Scenes.hero); run('.hl-rail', Scenes.highlights); run('.ba:not([data-draw])', Scenes.ba);
    try { calc(document.querySelector('.calc')); } catch (e) { console.error(e); }
    try { compare(document.getElementById('compare')); } catch (e) { console.error(e); }
    try { works(document.getElementById('works')); } catch (e) { console.error(e); }
    try { reveal(); } catch (e) { console.error(e); }
    try { china(document.getElementById('china')); } catch (e) { console.error(e); }
    try { form(document.getElementById('requestForm')); } catch (e) { console.error(e); }
    try { metrika(); } catch (e) { console.error(e); }
    cookie(document.querySelector('.cookie')); menu(); placeholders();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
