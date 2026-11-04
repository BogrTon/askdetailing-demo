/* Shared car silhouette (generic GT coupe, side view, faces right) and paint finishes */
(function () {
  const P = {
    body: "M64 240 Q52 238 50 226 L48 196 Q47 178 60 170 C130 150 210 112 290 94 C340 84 400 80 440 84 C480 88 512 104 540 124 C600 134 660 144 710 156 C736 162 752 174 754 194 L754 222 Q754 236 740 240 L658.6 240 A52 52 0 1 0 565.4 240 L242.6 240 A52 52 0 1 0 149.4 240 Z",
    glass: "M284 136 C300 118 330 104 372 98 C410 94 440 95 462 100 C484 106 504 118 520 132 L284 138 Z",
    door: "M548 132 C556 168 556 200 549 230 L338 232 C334 200 332 168 334 138",
    mirror: "M516 133 Q534 126 542 137 Q538 145 520 143 Z",
    head: "M700 160 C720 162 736 168 746 180 L730 181 C716 173 704 169 692 167 Z",
    tail: "M51 182 L76 176 L77 184 L53 190 Z",
    shoulder: "M80 178 C240 166 480 156 720 168",
    roofline: "M72 167 C142 149 216 112 292 95 C342 85 400 81 440 85 C478 89 508 104 536 123 C600 133 660 143 708 155"
  };

  const hx = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const L = (c, t) => t >= 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t);

  /* 7 stops per finish so any two finishes can tween. Gloss = sharp "horizon" just below the shoulder line. */
  function finishStops(c, f, c2) {
    c2 = c2 || c;
    switch (f) {
      case 'satin': return [[0, L(c, .26)], [.3, L(c, .1)], [.48, L(c, .02)], [.6, L(c, -.22)], [.74, L(c, -.15)], [.88, L(c, -.28)], [1, L(c, -.48)]];
      case 'matte': return [[0, L(c, .12)], [.3, L(c, .06)], [.5, c], [.62, L(c, -.06)], [.76, L(c, -.1)], [.88, L(c, -.16)], [1, L(c, -.28)]];
      case 'chrome': return [[0, mix('#f7fafc', c, .2)], [.26, mix('#9fb6cc', c, .5)], [.52, mix('#eef2f6', c, .25)], [.545, mix('#1f1b18', c, .2)], [.64, mix('#6e5c4b', c, .35)], [.82, mix('#cdbba3', c, .35)], [1, '#2a2826']];
      case 'shift': return [[0, L(c, .38)], [.3, c], [.535, mix(c, c2, .5)], [.55, L(c2, -.42)], [.7, c2], [.86, L(c2, -.25)], [1, L(c2, -.6)]];
      default: return [[0, L(c, .42)], [.3, L(c, .16)], [.535, L(c, .05)], [.55, L(c, -.45)], [.7, L(c, -.18)], [.86, L(c, -.32)], [1, L(c, -.62)]];
    }
  }
  const stopsHTML = s => s.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  function setStops(grad, s) {
    const el = grad.querySelectorAll('stop');
    s.forEach(([o, c], i) => { if (el[i]) { el[i].setAttribute('offset', o); el[i].setAttribute('stop-color', c); } });
  }
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tweenStops(grad, from, to, dur, done) {
    if (reduce() || !from) { setStops(grad, to); done && done(); return; }
    const t0 = performance.now(); dur = dur || 700;
    if (grad._raf) cancelAnimationFrame(grad._raf);
    const ease = k => 1 - Math.pow(1 - k, 3);
    (function step(t) {
      const k = ease(Math.min(1, (t - t0) / dur));
      setStops(grad, to.map(([o, c], i) => [(from[i][0] + (o - from[i][0]) * k).toFixed(4), mix(from[i][1], c, k)]));
      if (k < 1) grad._raf = requestAnimationFrame(step); else { grad._raf = 0; done && done(); }
    })(t0);
  }

  function wheel(cx, u) {
    let sp = '';
    for (let i = 0; i < 5; i++) sp += `<path d="M-4.5 -30 L4.5 -30 L3 -8 L-3 -8 Z" transform="rotate(${i * 72})"/>`;
    return `<g transform="translate(${cx} 217)"><path d="M-46.6 23 A52 52 0 1 1 46.6 23 Z" fill="#0c0e10"/><circle r="45" fill="#0a0b0c"/><circle r="41" fill="none" stroke="#1d2024" stroke-width="2"/><circle r="32" fill="url(#${u}-rim)"/><g fill="#15181b">${sp}</g><circle r="8" fill="#2d3238"/><circle r="3" fill="#8a929a"/></g>`;
  }

  /* o: {stops, label, shadow, reflect, clipped, over, shoulder, rim} */
  function carSVG(u, o) {
    o = o || {};
    const stops = o.stops || finishStops('#15181b', 'gloss');
    const H = o.reflect ? 372 : 284;
    const rim = o.rim !== false ? `<path d="${P.roofline}" fill="none" stroke="url(#${u}-rimg)" stroke-width="2" stroke-linecap="round" opacity="${o.rimOpacity == null ? .9 : o.rimOpacity}" pointer-events="none"/>` : '';
    return `<svg viewBox="0 ${o.top || 60} 800 ${H - (o.top || 60)}" role="img" aria-label="${o.label || 'Силуэт автомобиля'}" xmlns="http://www.w3.org/2000/svg">
<defs>
 <linearGradient id="${u}-paint" x1="0" y1="0" x2="0" y2="1">${stopsHTML(stops)}</linearGradient>
 <linearGradient id="${u}-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b4550"/><stop offset=".45" stop-color="#0b0e11"/><stop offset="1" stop-color="#1b2229"/></linearGradient>
 <radialGradient id="${u}-rim" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#e3e7eb"/><stop offset=".6" stop-color="#7d868f"/><stop offset="1" stop-color="#2c3136"/></radialGradient>
 <linearGradient id="${u}-rimg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".85"/><stop offset=".62" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <filter id="${u}-blur" x="-20%" y="-300%" width="140%" height="700%"><feGaussianBlur stdDeviation="7"/></filter>
 <clipPath id="${u}-clip"><path d="${P.body}"/></clipPath>
 <linearGradient id="${u}-fadeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <mask id="${u}-fade" maskUnits="userSpaceOnUse" x="0" y="262" width="800" height="120"><rect x="0" y="262" width="800" height="120" fill="url(#${u}-fadeg)"/></mask>
 ${o.defs || ''}
</defs>
${o.shadow === false ? '' : `<ellipse cx="402" cy="262" rx="350" ry="9" fill="#000" opacity="${o.shadowOpacity || .55}" filter="url(#${u}-blur)"/>`}
<g id="${u}-car">
 <path class="car-body" d="${P.body}" fill="url(#${u}-paint)"/>
 <g clip-path="url(#${u}-clip)">${o.clipped || ''}</g>
 <path d="${P.glass}" fill="url(#${u}-glass)"/>
 <path d="M424 96 L418 136" stroke="#07090b" stroke-width="7" pointer-events="none"/>
 <path d="${P.shoulder}" stroke="#fff" stroke-opacity="${o.shoulder == null ? .26 : o.shoulder}" fill="none" stroke-width="1.5" pointer-events="none"/>
 <path d="${P.door}" stroke="#000" stroke-opacity=".42" fill="none" stroke-width="1.3" pointer-events="none"/>
 <rect x="352" y="156" width="28" height="5" rx="2.5" fill="#000" opacity=".42" pointer-events="none"/>
 <path class="car-mirror" d="${P.mirror}" fill="url(#${u}-paint)"/>
 <path d="${P.head}" fill="#eaf4ff" opacity=".92" pointer-events="none"/>
 <path d="${P.tail}" fill="#c4262e" pointer-events="none"/>
 ${rim}
 ${wheel(196, u)}${wheel(612, u)}
 ${o.over || ''}
</g>
${o.reflect ? `<g mask="url(#${u}-fade)" opacity=".2" pointer-events="none"><use href="#${u}-car" transform="translate(0 526) scale(1 -1)"/></g>` : ''}
</svg>`;
  }

  window.Car = { P, carSVG, finishStops, setStops, tweenStops, mix, L, reduce };
})();
