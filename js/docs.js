/* Documents: reading progress, a table of contents that follows the reader, reading time, cookie settings */
(function () {
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const toast = t => { if (window.Site) window.Site.toast(t); };
  const onScroll = fn => {
    let tick = false;
    const run = () => { tick = false; fn(); };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(run); } }, { passive: true });
    addEventListener('resize', run);
    run();
  };

  /* the switcher marks the current document */
  function switcher() {
    const nav = document.querySelector('.doc-switch'); if (!nav) return;
    const link = nav.querySelector(`[data-doc="${nav.dataset.current}"]`);
    if (link) link.setAttribute('aria-current', 'page');
  }

  /* thin bar under the menu that fills while you read the document */
  function progress() {
    const bar = document.querySelector('.doc-progress i'), body = document.querySelector('.doc-body');
    if (!bar || !body) return;
    onScroll(() => {
      const r = body.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * .35 - r.top) / Math.max(1, r.height - innerHeight * .3)));
      bar.style.transform = `scaleX(${p})`;
      bar.parentElement.classList.toggle('on', r.top < innerHeight * .35 && r.bottom > 0);
    });
  }

  /* contents: always open on wide screens, folded on phones; highlights the section you are reading */
  function toc() {
    const box = document.querySelector('.doc-toc'); if (!box) return;
    const links = [...box.querySelectorAll('a[href^="#"]')];
    const secs = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    const narrow = matchMedia('(max-width: 900px)');
    const fit = () => { box.open = !narrow.matches; };
    fit();
    if (narrow.addEventListener) narrow.addEventListener('change', fit); else narrow.addListener(fit);
    box.addEventListener('click', e => { if (e.target.closest('a') && narrow.matches) box.open = false; });
    onScroll(() => {
      const line = innerHeight * .3;
      let cur = secs[0];
      secs.forEach(s => { if (s.getBoundingClientRect().top <= line) cur = s; });
      links.forEach(a => a.setAttribute('aria-current', String(!!cur && a.getAttribute('href') === '#' + cur.id)));
    });
  }

  /* "≈ 9 мин чтения" from the length of the text */
  function readTime() {
    const out = document.querySelector('[data-read-time]'), body = document.querySelector('.doc-body');
    if (!out || !body) return;
    const words = body.textContent.trim().split(/\s+/).length;
    out.textContent = `≈ ${Math.max(1, Math.round(words / 160))} мин чтения`;
  }

  /* cookie page: the same choice as in the cookie notice, as a switch */
  function cookiePrefs() {
    const box = document.getElementById('ckPrefs'); if (!box) return;
    const sw = box.querySelector('#ckAnalytics'), state = box.querySelector('#ckState'), reset = box.querySelector('#ckReset');
    const banner = document.querySelector('.cookie');
    const show = () => {
      const v = store.get('cookie-choice');
      sw.checked = v === 'all';
      state.textContent = v === 'all' ? 'Сейчас аналитика включена. Выбор сохранён в этом браузере.'
        : v === 'necessary' ? 'Сейчас работают только необходимые cookie. Метрика выключена.'
        : 'Вы ещё не выбрали. Пока вы не разрешите, Метрика не работает.';
      reset.hidden = !v;
    };
    sw.addEventListener('change', () => {
      store.set('cookie-choice', sw.checked ? 'all' : 'necessary');
      if (banner) banner.hidden = true;
      show();
      document.dispatchEvent(new CustomEvent('cookie-choice'));
      toast(sw.checked ? 'Аналитика включена.' : 'Аналитика выключена.');
    });
    reset.addEventListener('click', () => {
      store.del('cookie-choice');
      if (banner) banner.hidden = false;
      show();
      document.dispatchEvent(new CustomEvent('cookie-choice'));
      toast('Выбор сброшен. Уведомление о cookie появится снова.');
    });
    document.addEventListener('cookie-choice', show);
    show();
  }

  function init() {
    [switcher, progress, toc, readTime, cookiePrefs].forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
