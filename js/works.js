/* Works page: the studio's real works from its Telegram channel.
   Filter by service and brand; open a work to swipe through its photos and read what was done.
   Links: #tg383 opens a work, #f=tint filters by service, #brand=geely filters by brand. */
(function () {
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nb = t => { let prev; do { prev = t; t = t.replace(/(^|[\s(«])([А-Яа-яЁё]{1,2})\s+/g, '$1$2 '); } while (t !== prev); return t.replace(/ —/g, ' —'); };
  const json = id => { try { return JSON.parse(document.getElementById(id).textContent); } catch (e) { return null; } };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const setHash = h => { try { history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); } catch (e) {} };
  const DATA = json('cases-data');

  function gallery() {
    const byId = Object.fromEntries(DATA.list.map(c => [c.id, c]));
    const cards = [...document.querySelectorAll('.wk-card')];
    const chips = document.querySelector('.wk-filters'), brandSel = document.getElementById('wkBrand');
    const shown = document.querySelector('[data-wk="shown"]'), empty = document.querySelector('.wk-empty');
    let cat = 'all';

    /* ---------- filter ---------- */
    const apply = () => {
      const brand = brandSel ? brandSel.value : '';
      let n = 0;
      cards.forEach(card => {
        const on = (cat === 'all' || card.dataset.cats.split(' ').includes(cat)) && (!brand || card.dataset.brand === brand);
        card.hidden = !on;
        if (on) { card.style.setProperty('--i', n % 3); card.dataset.num = String(n + 1).padStart(2, '0'); n++; }
      });
      if (shown) shown.textContent = n;
      if (empty) empty.hidden = n > 0;
      chips.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.f === cat)));
    };
    const setCat = f => { cat = chips.querySelector(`[data-f="${f}"]`) ? f : 'all'; apply(); };
    chips.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) setCat(b.dataset.f); });
    if (brandSel) brandSel.addEventListener('change', apply);
    apply();

    /* ---------- view: tiles or a list like a magazine index, with a photo peeking next to the cursor ---------- */
    const grid = document.querySelector('.wk-grid'), viewSeg = document.querySelector('.wk-view');
    const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
    const setView = v => {
      grid.classList.toggle('as-list', v === 'list');
      if (viewSeg) viewSeg.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    };
    if (viewSeg) viewSeg.addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (!b) return; setView(b.dataset.view); store.set('wk-view', b.dataset.view); });
    setView(store.get('wk-view') === 'list' ? 'list' : 'grid');
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const peek = el('div', 'wk-peek'), pimg = el('img'); pimg.alt = ''; peek.setAttribute('aria-hidden', 'true'); peek.appendChild(pimg); document.body.appendChild(peek);
      let px = 0, py = 0, tx = 0, ty = 0, raf2 = 0, shown = false;
      const step = () => {
        px += (tx - px) * (reduce() ? 1 : .18); py += (ty - py) * (reduce() ? 1 : .18);
        peek.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0)`;
        raf2 = shown || Math.abs(tx - px) > .5 ? requestAnimationFrame(step) : 0;
      };
      const aim = e => {
        const w = peek.offsetWidth || 280, h = peek.offsetHeight || 210;
        tx = Math.min(innerWidth - w - 16, e.clientX + 28); ty = Math.max(16, Math.min(innerHeight - h - 16, e.clientY - h / 2));
      };
      grid.addEventListener('pointerover', e => {
        if (!grid.classList.contains('as-list') || e.pointerType !== 'mouse') return;
        const card = e.target.closest('.wk-card'); if (!card) return;
        const src = card.querySelector('.wk-vis img'); if (src) pimg.src = src.currentSrc || src.src;
        aim(e); if (!shown) { px = tx; py = ty; } shown = true; peek.classList.add('on'); if (!raf2) raf2 = requestAnimationFrame(step);
      });
      grid.addEventListener('pointermove', e => { if (shown) aim(e); });
      grid.addEventListener('pointerleave', () => { shown = false; peek.classList.remove('on'); });
      grid.addEventListener('click', () => { shown = false; peek.classList.remove('on'); });
    }

    /* ---------- work sheet with a swipeable photo gallery ---------- */
    const modal = document.getElementById('wkModal'), sheet = modal.querySelector('.wk-sheet');
    const track = document.getElementById('wkTrack'), thumbs = document.getElementById('wkThumbs'), counter = document.getElementById('wkCounter');
    const prevB = modal.querySelector('.wk-arrow.prev'), nextB = modal.querySelector('.wk-arrow.next');
    const $ = id => document.getElementById(id);
    let lastFocus = null, current = null, idx = 0, count = 0, raf = 0;

    const mark = i => {
      idx = Math.max(0, Math.min(count - 1, i));
      counter.textContent = `${idx + 1} / ${count}`;
      prevB.disabled = idx === 0; nextB.disabled = idx >= count - 1;
      [...thumbs.children].forEach((t, k) => t.setAttribute('aria-current', String(k === idx)));
      const t = thumbs.children[idx];
      if (t) thumbs.scrollTo({ left: t.offsetLeft - (thumbs.clientWidth - t.offsetWidth) / 2, behavior: reduce() ? 'auto' : 'smooth' });
    };
    const go = i => {
      i = Math.max(0, Math.min(count - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: reduce() ? 'auto' : 'smooth' });
      mark(i);
    };
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); if (i !== idx) mark(i); });
    }, { passive: true });
    prevB.addEventListener('click', () => go(idx - 1));
    nextB.addEventListener('click', () => go(idx + 1));
    thumbs.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) go(+b.dataset.i); });

    const text = c => {
      const box = $('wkText'); box.textContent = '';
      let ul = null;
      (c.body || []).forEach(b => {
        if (b.t !== 'li') { ul = null; box.appendChild(el('p', null, nb(b.s))); return; }
        if (!ul) { ul = el('ul'); box.appendChild(ul); }
        const li = el('li', null, nb(b.s) + (b.sub && b.sub.length ? ':' : ''));
        if (b.sub && b.sub.length) { const sub = el('ul'); b.sub.forEach(s => sub.appendChild(el('li', null, nb(s)))); li.appendChild(sub); }
        ul.appendChild(li);
      });
    };

    const open = (id, viaLink) => {
      const c = byId[id]; if (!c) return;
      current = c; lastFocus = viaLink ? null : document.activeElement;
      $('wkCat').textContent = c.catNames;
      $('wkTitle').textContent = c.title;
      $('wkDate').textContent = c.dateLabel;
      $('wkSrc').href = c.source;
      text(c);
      count = c.photos.length;
      track.textContent = ''; thumbs.textContent = '';
      c.photos.forEach((src, i) => {
        const slide = el('div', 'wk-slide'), img = el('img');
        img.src = src; img.alt = `${c.title}, фото ${i + 1} из ${count}`; img.decoding = 'async'; img.draggable = false;
        slide.appendChild(img); track.appendChild(slide);
        const tb = el('button'), ti = el('img');
        tb.type = 'button'; tb.dataset.i = i; tb.setAttribute('aria-label', `Фото ${i + 1} из ${count}`);
        ti.src = src; ti.alt = ''; tb.appendChild(ti); thumbs.appendChild(tb);
      });
      modal.classList.toggle('one', count < 2);
      modal.hidden = false; document.body.style.overflow = 'hidden';
      track.scrollLeft = 0; sheet.scrollTop = 0; mark(0);
      modal.querySelector('.wk-close').focus();
      setHash(id);
    };
    const close = () => {
      if (modal.hidden) return;
      modal.hidden = true; document.body.style.overflow = '';
      track.textContent = ''; thumbs.textContent = '';
      setHash('');
      const card = current && cards.find(x => x.dataset.id === current.id);
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
      else if (card) card.focus({ preventScroll: true });
    };
    cards.forEach(card => {
      card.addEventListener('click', () => open(card.dataset.id));
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card.dataset.id); } });
    });
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('.wk-close').addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (modal.hidden) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); go(idx + (e.key === 'ArrowRight' ? 1 : -1)); return; }
      if (e.key !== 'Tab') return;
      const fs = [...sheet.querySelectorAll('button:not([disabled]), [href], [tabindex="0"]')].filter(x => x.offsetParent !== null);
      if (!fs.length) return;
      if (e.shiftKey && document.activeElement === fs[0]) { e.preventDefault(); fs[fs.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === fs[fs.length - 1]) { e.preventDefault(); fs[0].focus(); }
    });
    addEventListener('resize', () => { if (!modal.hidden) track.scrollLeft = idx * track.clientWidth; });

    // «Хочу так же» opens Telegram with the work and a link to its post in the studio channel
    if (window.Site && Site.tgLink) Site.tgLink($('wkWant'), () => {
      const c = current; if (!c) return Site.hello('Хочу записаться на осмотр.');
      return `Здравствуйте! Хочу так же, как в работе «${c.title}» (${c.dateLabel.toLowerCase()}).` + (c.source ? `\n${c.source}` : '');
    });

    /* ---------- links from other pages ---------- */
    const fromHash = () => {
      const h = decodeURIComponent(location.hash.slice(1));
      if (!h) return;
      const kv = h.match(/^(f|brand)=([\w-]+)$/);
      if (kv) {
        if (kv[1] === 'f') setCat(kv[2]);
        else if (brandSel) { brandSel.value = kv[2]; if (brandSel.value !== kv[2]) brandSel.value = ''; apply(); }
        const list = document.querySelector('.wk-list'); if (list) list.scrollIntoView();
      } else if (byId[h]) open(h, true);
    };
    fromHash();
    addEventListener('hashchange', fromHash);
  }

  const init = () => { if (DATA && document.querySelector('.wk-grid')) try { gallery(); } catch (e) { console.error(e); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
