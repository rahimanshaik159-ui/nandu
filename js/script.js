/* =====================================================================
   Nandu thammudu — Birthday Website
   Vanilla JS · no dependencies · static-hosting friendly
   ---------------------------------------------------------------------
   Sections
     1. Helpers & state
     2. Cake SVG builder
     3. Audio (one shared <audio> element)
     4. Screen navigation
     5. Candle blowing
     6. Fireworks (canvas)
     7. Cake cutting
     8. Replay
     9. Wiring / init
   ===================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     1. Helpers & state
  ------------------------------------------------------------------ */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = () => reduceMotionQuery.matches;

  const SCREEN = { WELCOME: 0, WISHES: 1, LETTER: 2, CAKE: 3, CANDLES: 4, FIREWORKS: 5, CUT: 6, FINAL: 7 };

  const screens   = $$('.screen');
  const TOTAL     = screens.length;               // 8
  const root      = document.documentElement;
  const topbar    = $('#topbar');
  const navEl     = $('#nav');
  const navBtns   = $$('.nav__btn');
  const dotsEl    = $('#dots');

  const state = {
    current: SCREEN.WELCOME,
    candles: 'lit',            // 'lit' | 'blowing' | 'blown'
    cake:    'whole',          // 'whole' | 'cutting' | 'cut'
    wantsMusic: false,         // true once the visitor has asked for music
  };

  // pending timers per interaction, so they can be cancelled on leave/replay
  const timers = { candles: [], cut: [] };
  const later = (bucket, fn, ms) => { const id = setTimeout(fn, ms); timers[bucket].push(id); return id; };
  const clearBucket = bucket => { timers[bucket].forEach(clearTimeout); timers[bucket] = []; };

  /* ------------------------------------------------------------------
     2. Cake SVG builder  (the cake is drawn in SVG so no extra image is needed)
  ------------------------------------------------------------------ */
  const CAKE = { cx: 320, rx: 230, ry: 36, top: 200, bottom: 350 };
  const rimY = x => CAKE.top + CAKE.ry * Math.sqrt(Math.max(0, 1 - ((x - CAKE.cx) / CAKE.rx) ** 2));

  function ganachePath() {
    const drips = [[128, 15, 34], [184, 12, 54], [248, 14, 26], [306, 11, 62], [362, 13, 38], [420, 15, 50], [482, 12, 30], [524, 10, 42]];
    let d = `M90 ${CAKE.top} A${CAKE.rx} ${CAKE.ry} 0 0 0 550 ${CAKE.top}`;
    for (let x = 550; x >= 90; x -= 1.5) {
      let drip = 0;
      for (const [dx, w, len] of drips) {
        const t = (x - dx) / w;
        if (Math.abs(t) < 1) drip = Math.max(drip, len * Math.sqrt(1 - t * t));
      }
      d += ` L${x.toFixed(1)} ${(rimY(x) + 12 + drip).toFixed(1)}`;
    }
    return d + ' Z';
  }

  function trufflesMarkup(front) {
    const out = [];
    const N = 18;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const s = Math.sin(a);
      if ((s >= 0) !== front) continue;
      const x = CAKE.cx + 192 * Math.cos(a);
      const y = CAKE.top + 3 + 27 * s;
      const r = 11.5 + 3.5 * ((s + 1) / 2);
      out.push({ x, y, r });
    }
    out.sort((a, b) => a.y - b.y);
    return out.map(t => `
      <ellipse cx="${t.x.toFixed(1)}" cy="${(t.y + t.r * .8).toFixed(1)}" rx="${(t.r * .95).toFixed(1)}" ry="${(t.r * .35).toFixed(1)}" fill="rgba(0,0,0,.35)"/>
      <circle cx="${t.x.toFixed(1)}" cy="${t.y.toFixed(1)}" r="${t.r.toFixed(1)}" fill="url(#g-truffle)"/>
      <circle cx="${(t.x - t.r * .35).toFixed(1)}" cy="${(t.y - t.r * .4).toFixed(1)}" r="${(t.r * .22).toFixed(1)}" fill="rgba(255,236,200,.65)"/>`).join('');
  }

  function candlesMarkup() {
    const xs = [190, 255, 320, 385, 450];
    const hs = [74, 84, 90, 80, 72];
    return xs.map((x, i) => {
      const base = 208 + (i % 2) * 2;
      const topY = base - hs[i];
      const wickTop = topY - 9;
      let stripes = '';
      for (let y = topY + 12; y < base - 4; y += 12) stripes += `M${x - 6} ${y} L${x + 6} ${y - 5} `;
      return `
      <g class="candle">
        <ellipse cx="${x}" cy="${base}" rx="9" ry="3" fill="rgba(0,0,0,.4)"/>
        <rect x="${x - 6}" y="${topY}" width="12" height="${hs[i]}" rx="2" fill="url(#g-candle)"/>
        <path d="${stripes}" stroke="#d9677a" stroke-width="3" stroke-linecap="butt" fill="none" opacity=".72"/>
        <ellipse cx="${x}" cy="${topY}" rx="6" ry="2" fill="#f8dfd2"/>
        <line x1="${x}" y1="${topY}" x2="${x}" y2="${wickTop}" stroke="#2a1a10" stroke-width="1.8" stroke-linecap="round"/>
        <g class="candle-fire" style="--i:${i}">
          <circle class="flame-glow" cx="${x}" cy="${wickTop - 20}" r="38" fill="url(#g-glow)"/>
          <g class="flame" style="--fd:${(1.1 + i * .17).toFixed(2)}s">
            <path d="M${x} ${wickTop} C${x - 11} ${wickTop - 5} ${x - 10} ${wickTop - 21} ${x} ${wickTop - 37} C${x + 10} ${wickTop - 21} ${x + 11} ${wickTop - 5} ${x} ${wickTop} Z" fill="url(#g-flame)"/>
            <path d="M${x} ${wickTop} C${x - 5} ${wickTop - 2} ${x - 5} ${wickTop - 9} ${x} ${wickTop - 16} C${x + 5} ${wickTop - 9} ${x + 5} ${wickTop - 2} ${x} ${wickTop} Z" fill="#fff6cf" opacity=".92"/>
            <ellipse cx="${x}" cy="${wickTop - 3}" rx="2.6" ry="3.6" fill="#7aa8ff" opacity=".45"/>
          </g>
        </g>
        <g class="smoke" transform="translate(${x} ${wickTop})">
          <path style="--i:${i};--k:0" d="M0 0 c-7-10 7-18 0-28 s6-16 0-24" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="3.2" stroke-linecap="round"/>
          <path style="--i:${i};--k:1" d="M3 0 c6-9-6-17 1-26 s-5-15 1-22" fill="none" stroke="rgba(255,248,240,.7)" stroke-width="2.6" stroke-linecap="round"/>
          <path style="--i:${i};--k:2" d="M-3 0 c-5-9 6-15-1-24 s5-14-1-20" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2.2" stroke-linecap="round"/>
        </g>
      </g>`;
    }).join('');
  }

  // everything that makes up the cake itself (no plate, no candles)
  function cakeBody() {
    return `
      <path d="M90 ${CAKE.top} V${CAKE.bottom} A${CAKE.rx} ${CAKE.ry} 0 0 0 550 ${CAKE.bottom} V${CAKE.top} Z" fill="url(#g-choc)"/>
      <path d="M90 262 A${CAKE.rx} ${CAKE.ry} 0 0 0 550 262 V284 A${CAKE.rx} ${CAKE.ry} 0 0 1 90 284 Z" fill="url(#g-cream)"/>
      <path d="M90 262 A${CAKE.rx} ${CAKE.ry} 0 0 0 550 262" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>
      <path d="M90 ${CAKE.bottom - 6} A${CAKE.rx} ${CAKE.ry} 0 0 0 550 ${CAKE.bottom - 6}" fill="none" stroke="rgba(255,225,185,.12)" stroke-width="3"/>
      <ellipse cx="${CAKE.cx}" cy="${CAKE.top}" rx="${CAKE.rx}" ry="${CAKE.ry}" fill="url(#g-top)"/>
      <ellipse cx="${CAKE.cx}" cy="${CAKE.top}" rx="203" ry="29" fill="#2a1309" opacity=".55"/>
      <ellipse cx="250" cy="${CAKE.top - 9}" rx="96" ry="9" fill="rgba(255,232,196,.13)"/>
      <path d="${ganachePath()}" fill="url(#g-ganache)"/>
      <path d="M96 ${CAKE.top + 6} A${CAKE.rx - 6} ${CAKE.ry - 2} 0 0 0 544 ${CAKE.top + 6}" fill="none" stroke="rgba(255,226,190,.22)" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="120 40 60 30"/>
      <g class="truffles-back">${trufflesMarkup(false)}</g>`;
  }
  function cakeFront() { return `<g class="truffles-front">${trufflesMarkup(true)}</g>`; }

  function plateMarkup() {
    return `
      <ellipse cx="320" cy="386" rx="306" ry="44" fill="rgba(0,0,0,.28)"/>
      <ellipse cx="320" cy="372" rx="300" ry="44" fill="#a98f70"/>
      <ellipse cx="320" cy="364" rx="300" ry="44" fill="url(#g-plate)"/>
      <ellipse cx="320" cy="364" rx="268" ry="36" fill="none" stroke="rgba(120,88,56,.28)" stroke-width="2"/>`;
  }

  function knifeMarkup() {
    return `
      <g class="knife" aria-hidden="true">
        <path d="M0 0 L-9 -14 L-9 -132 L9 -132 L9 -14 Z" fill="url(#g-blade)" stroke="#7b8086" stroke-width=".8"/>
        <rect x="-11" y="-138" width="22" height="7" rx="2" fill="#b9bdc2"/>
        <rect x="-8" y="-200" width="16" height="64" rx="7" fill="#3b1f12"/>
        <circle cx="0" cy="-184" r="2.4" fill="#d9b25a"/><circle cx="0" cy="-166" r="2.4" fill="#d9b25a"/>
      </g>`;
  }

  function buildCake(mode) {
    if (mode === 'cut') {
      return `
      <svg viewBox="0 0 640 424" focusable="false" aria-hidden="true">
        <defs>
          <clipPath id="cp-main"><rect x="0" y="0" width="418" height="424"/></clipPath>
          <clipPath id="cp-slice"><rect x="418" y="0" width="240" height="424"/></clipPath>
          <clipPath id="cp-face"><path d="M418 236 L418 384 L394 372 L394 224 Z"/></clipPath>
        </defs>
        ${plateMarkup()}
        <g clip-path="url(#cp-main)">${cakeBody()}${cakeFront()}</g>
        <g class="slice">
          <g clip-path="url(#cp-slice)">${cakeBody()}${cakeFront()}</g>
          <g class="cut-face" clip-path="url(#cp-face)">
            <rect x="390" y="220" width="30" height="46" fill="#5b2e19"/>
            <rect x="390" y="262" width="30" height="22" fill="#f7e7c8"/>
            <rect x="390" y="284" width="30" height="46" fill="#4b2515"/>
            <rect x="390" y="326" width="30" height="12" fill="#f7e7c8"/>
            <rect x="390" y="338" width="30" height="50" fill="#3e1e10"/>
            <circle cx="404" cy="244" r="1.6" fill="#8a5632"/><circle cx="410" cy="300" r="1.6" fill="#8a5632"/><circle cx="400" cy="352" r="1.6" fill="#8a5632"/>
          </g>
        </g>
        ${knifeMarkup()}
      </svg>`;
    }
    return `
      <svg viewBox="0 52 640 372" focusable="false" aria-hidden="true">
        ${plateMarkup()}
        ${cakeBody()}
        ${candlesMarkup()}
        ${cakeFront()}
      </svg>`;
  }

  $$('[data-cake]').forEach(el => { el.innerHTML = buildCake(el.dataset.cake === 'cut' ? 'cut' : 'candles'); });

  /* ------------------------------------------------------------------
     3. Audio — ONE shared <audio> element for the whole site
  ------------------------------------------------------------------ */
  const audio       = $('#bgm');
  const musicBtn    = $('#music-btn');
  const songBtn     = $('#song-btn');
  const songLabel   = $('#song-btn-label');
  const toast       = $('#toast');
  const toastMsg    = $('#toast-msg');

  function showToast(message) {
    toastMsg.textContent = message;
    toast.hidden = false;
  }
  function hideToast() { toast.hidden = true; }

  function syncMusicUI() {
    const playing = !audio.paused;
    musicBtn.setAttribute('aria-pressed', String(playing));
    musicBtn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
    $('.music-btn__label', musicBtn).textContent = playing ? 'Pause' : 'Music';
    songBtn.setAttribute('aria-pressed', String(playing));
    songLabel.textContent = playing ? 'Pause Birthday Song' : 'Play Birthday Song';
  }

  /**
   * Start / resume playback. Safe to call repeatedly: it never restarts a track
   * that is already playing and there is only ever one element, so tracks can't overlap.
   * Must be called synchronously from a click handler (autoplay policy).
   */
  function playMusic() {
    state.wantsMusic = true;
    if (!audio.paused) { syncMusicUI(); return Promise.resolve(true); }
    let p;
    try { p = audio.play(); } catch (err) { p = Promise.reject(err); }
    return Promise.resolve(p).then(() => { hideToast(); syncMusicUI(); return true; }).catch(err => {
      syncMusicUI();
      if (err && err.name === 'AbortError') return false;      // paused again before it began — not an error
      showToast(err && err.name === 'NotAllowedError'
        ? 'Your browser blocked the music. Tap “Try again” to play it.'
        : 'The birthday song couldn’t be played. Tap “Try again”.');
      return false;
    });
  }
  function pauseMusic() { audio.pause(); }
  function toggleMusic() { audio.paused ? playMusic() : pauseMusic(); }

  ['play', 'pause', 'playing', 'ended'].forEach(ev => audio.addEventListener(ev, syncMusicUI));
  audio.addEventListener('error', () => {
    syncMusicUI();
    if (state.wantsMusic) showToast('The music file couldn’t be loaded. Tap “Try again”.');
  });

  /* ------------------------------------------------------------------
     4. Screen navigation
  ------------------------------------------------------------------ */
  // which header item is "current" for each of the eight screens
  const NAV_FOR_SCREEN = [0, 1, 2, 3, 3, 5, 3, 7];     // values are screen indexes of nav buttons

  // build the progress dots
  screens.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.goto = i;
    b.setAttribute('aria-label', `Go to screen ${i + 1} of ${TOTAL}: ${s.dataset.name}`);
    dotsEl.appendChild(b);
  });
  const dotBtns = $$('button', dotsEl);

  const enterHooks = {
    [SCREEN.CANDLES]:   opts => { resetCandles(); if (opts.autoBlow) later('candles', blowCandles, 1500); },
    [SCREEN.FIREWORKS]: () => fireworks.start(),
    [SCREEN.CUT]:       () => resetCut(),
  };
  const leaveHooks = {
    [SCREEN.CANDLES]:   () => clearBucket('candles'),
    [SCREEN.FIREWORKS]: () => fireworks.stop(),
    [SCREEN.CUT]:       () => clearBucket('cut'),
  };

  function updateNavUI() {
    const activeNav = NAV_FOR_SCREEN[state.current];
    navBtns.forEach(b => {
      const on = Number(b.dataset.goto) === activeNav;
      if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    dotBtns.forEach((b, i) => {
      if (i === state.current) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    const cur = navBtns.find(b => b.getAttribute('aria-current') === 'true');
    if (cur && navEl.scrollWidth > navEl.clientWidth) {
      navEl.scrollTo({ left: cur.offsetLeft - (navEl.clientWidth - cur.offsetWidth) / 2, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }

  function goTo(index, opts = {}) {
    index = Math.max(0, Math.min(TOTAL - 1, index));
    if (index === state.current && !opts.force) return;
    const prev = state.current;
    state.current = index;

    screens.forEach((s, i) => {
      const active = i === index;
      s.classList.toggle('is-active', active);
      s.inert = !active;
      s.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    screens[index].scrollTop = 0;

    if (leaveHooks[prev] && prev !== index) leaveHooks[prev]();
    if (enterHooks[index]) enterHooks[index](opts);
    updateNavUI();

    if (!opts.silent) {
      const heading = $('[tabindex="-1"]', screens[index]);
      if (heading) heading.focus({ preventScroll: true });
    }
  }
  const next = () => goTo(state.current + 1);
  const prev = () => goTo(state.current - 1);

  /* ------------------------------------------------------------------
     5. Candle blowing (button-triggered, no microphone)
  ------------------------------------------------------------------ */
  const candleScreen = screens[SCREEN.CANDLES];

  function resetCandles() {
    clearBucket('candles');
    state.candles = 'lit';
    candleScreen.classList.remove('is-blowing', 'is-blown');
    $('#blow-btn-2').disabled = false;
  }

  function blowCandles() {
    if (state.candles !== 'lit') return;          // already running or finished: ignore repeats
    state.candles = 'blowing';
    $('#blow-btn-2').disabled = true;
    candleScreen.classList.add('is-blowing');
    later('candles', () => {
      state.candles = 'blown';
      candleScreen.classList.add('is-blown');
      $('#candles-next').focus({ preventScroll: true });
    }, prefersReducedMotion() ? 200 : 2200);
  }

  /* ------------------------------------------------------------------
     6. Fireworks (canvas, bounded particle count, pauses when hidden)
  ------------------------------------------------------------------ */
  const fireworks = (() => {
    const canvas = $('#fx');
    const ctx = canvas.getContext('2d');
    const screenEl = screens[SCREEN.FIREWORKS];
    const MAX_PARTICLES = 700;
    const COLORS = [[255, 214, 120], [255, 176, 72], [255, 132, 52], [255, 244, 224], [255, 200, 150], [255, 108, 64]];

    let w = 0, h = 0, dpr = 1, raf = 0, last = 0, nextLaunch = 0;
    let active = false;             // screen is the current one
    let running = false;            // animation loop is live
    const rockets = [];
    const sparks = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, screenEl.clientWidth);      // clientWidth/Height ignore the entrance scale transform
      h = Math.max(1, screenEl.clientHeight);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const topLimit = () => topbar.offsetHeight + 24;
    const rand = (a, b) => a + Math.random() * (b - a);

    function launch() {
      if (rockets.length > 4) return;
      const x = rand(w * .12, w * .88);
      rockets.push({
        x, y: h * .78, vx: rand(-.5, .5), vy: -rand(h * .0105, h * .0135),
        targetY: rand(topLimit() + h * .06, h * .42), color: COLORS[(Math.random() * COLORS.length) | 0], trail: []
      });
    }

    function burst(x, y, color) {
      const small = w < 520;
      const count = Math.round((small ? 44 : 70) * rand(.85, 1.2));
      const speed = small ? 3.1 : 4.3;
      const ring = Math.random() < .4;
      for (let i = 0; i < count && sparks.length < MAX_PARTICLES; i++) {
        const a = (i / count) * Math.PI * 2 + rand(-.05, .05);
        const s = ring ? speed * rand(.92, 1) : speed * rand(.25, 1);
        sparks.push({
          x, y, px: x, py: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, decay: rand(.0075, .014),
          size: rand(1.2, 2.4), color: Math.random() < .2 ? COLORS[3] : color
        });
      }
    }

    function frame(t) {
      if (!running) return;
      const dt = Math.min(t - last, 50);
      last = t;
      const k = dt / 16.67;

      if (t >= nextLaunch) { launch(); nextLaunch = t + rand(650, 1350); }

      // fade previous frame (keeps the canvas transparent over the sky)
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,.24)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx * k; r.y += r.vy * k; r.vy *= Math.pow(.992, k);
        r.trail.push(r.x, r.y); if (r.trail.length > 14) r.trail.splice(0, 2);
        ctx.strokeStyle = 'rgba(255,220,160,.8)'; ctx.lineWidth = 2; ctx.beginPath();
        for (let j = 0; j < r.trail.length; j += 2) j ? ctx.lineTo(r.trail[j], r.trail[j + 1]) : ctx.moveTo(r.trail[j], r.trail[j + 1]);
        ctx.stroke();
        if (r.y <= r.targetY || r.vy > -1.2) { burst(r.x, r.y, r.color); rockets.splice(i, 1); }
      }

      const fric = Math.pow(.985, k);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.px = p.x; p.py = p.y;
        p.vx *= fric; p.vy = p.vy * fric + .045 * k;
        p.x += p.vx * k; p.y += p.vy * k; p.life -= p.decay * k;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        const [r, g, b] = p.color;
        ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(1, p.life * 1.3).toFixed(2)})`;
        ctx.lineWidth = p.size * (.5 + p.life * .7);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    }

    // a single still frame for visitors who prefer reduced motion
    function drawStill() {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const spots = [[.2, .3], [.5, .22], [.8, .3], [.34, .46], [.68, .44]];
      spots.forEach(([fx, fy], idx) => {
        const cx = w * fx, cy = Math.max(topLimit() + 30, h * fy), c = COLORS[idx % COLORS.length], n = 28;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2, d1 = Math.min(w, h) * .05, d2 = Math.min(w, h) * .1;
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},.75)`; ctx.lineWidth = 1.6; ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * d1, cy + Math.sin(a) * d1); ctx.lineTo(cx + Math.cos(a) * d2, cy + Math.sin(a) * d2); ctx.stroke();
        }
      });
    }

    function loopOn() {
      if (running) return;
      running = true; last = performance.now(); nextLaunch = last + 150;
      raf = requestAnimationFrame(frame);
    }
    function loopOff() { running = false; cancelAnimationFrame(raf); }

    function start() {
      active = true;
      resize();
      if (prefersReducedMotion()) { drawStill(); return; }
      if (!document.hidden) loopOn();
    }
    function stop() {
      active = false;
      loopOff();
      rockets.length = 0; sparks.length = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    document.addEventListener('visibilitychange', () => {
      if (!active || prefersReducedMotion()) return;
      if (document.hidden) loopOff(); else loopOn();
    });
    let resizeRaf = 0;
    window.addEventListener('resize', () => {
      if (!active) return;
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => { resize(); if (prefersReducedMotion()) drawStill(); });
    });

    return { start, stop };
  })();

  // twinkling city lights on the horizon
  (function buildCityLights() {
    const wrap = $('#city-lights');
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 70; i++) {
      const el = document.createElement('i');
      el.style.left = (Math.random() * 98 + 1).toFixed(1) + '%';
      el.style.top = (45 + Math.random() * 50).toFixed(1) + '%';
      el.style.setProperty('--s', (1.5 + Math.random() * 2).toFixed(1) + 'px');
      el.style.setProperty('--t', (1.8 + Math.random() * 3).toFixed(1) + 's');
      el.style.setProperty('--dl', (-Math.random() * 3).toFixed(1) + 's');
      frag.appendChild(el);
    }
    wrap.appendChild(frag);
  })();

  /* ------------------------------------------------------------------
     7. Cake cutting
  ------------------------------------------------------------------ */
  const cutScreen = screens[SCREEN.CUT];
  const confettiEl = $('#confetti');
  let cutDone = null;                              // promise that resolves when the cut animation ends

  function resetCut() {
    clearBucket('cut');
    state.cake = 'whole';
    cutDone = null;
    cutScreen.classList.remove('is-cutting', 'is-cut');
    $('#cut-btn').disabled = false;
    confettiEl.textContent = '';
  }

  function burstConfetti() {
    if (prefersReducedMotion()) return;
    const colors = ['#ffd27a', '#ff9d3c', '#ffffff', '#e0713a', '#ffc2a0', '#c4572a'];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 46; i++) {
      const p = document.createElement('i');
      p.style.setProperty('--c', colors[i % colors.length]);
      p.style.setProperty('--x', ((Math.random() - .5) * 560).toFixed(0) + 'px');
      p.style.setProperty('--y', (-Math.random() * 260 + 40).toFixed(0) + 'px');
      p.style.setProperty('--r', ((Math.random() - .5) * 900).toFixed(0) + 'deg');
      p.style.setProperty('--w', (5 + Math.random() * 6).toFixed(0) + 'px');
      p.style.setProperty('--h', (8 + Math.random() * 10).toFixed(0) + 'px');
      p.style.animationDelay = (Math.random() * .15).toFixed(2) + 's';
      frag.appendChild(p);
    }
    confettiEl.appendChild(frag);
    later('cut', () => { confettiEl.textContent = ''; }, 2400);
  }

  function cutCake() {
    if (cutDone) return cutDone;                   // already cutting / cut
    state.cake = 'cutting';
    $('#cut-btn').disabled = true;
    cutScreen.classList.add('is-cutting');
    const fast = prefersReducedMotion();
    cutDone = new Promise(resolve => {
      later('cut', () => { cutScreen.classList.add('is-cut'); burstConfetti(); }, fast ? 50 : 1000);
      later('cut', () => { state.cake = 'cut'; resolve(); }, fast ? 100 : 2100);
    });
    return cutDone;
  }

  /* ------------------------------------------------------------------
     8. Replay
  ------------------------------------------------------------------ */
  function replay() {
    resetCandles();
    resetCut();
    fireworks.stop();
    // Policy: an explicit replay restarts the song from the beginning (same single <audio> element).
    audio.currentTime = 0;
    playMusic();
    goTo(SCREEN.WELCOME, { force: true });
    state.current = SCREEN.WELCOME;
    updateNavUI();
  }

  /* ------------------------------------------------------------------
     9. Wiring / init
  ------------------------------------------------------------------ */
  // header measurement → --hdr
  const measureHeader = () => root.style.setProperty('--hdr', topbar.offsetHeight + 'px');
  measureHeader();
  window.addEventListener('resize', measureHeader);
  window.addEventListener('orientationchange', measureHeader);
  if ('ResizeObserver' in window) new ResizeObserver(measureHeader).observe(topbar);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureHeader);

  // header nav, brand & dots (anything with data-goto)
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-goto]');
    if (!t) return;
    e.preventDefault();
    goTo(Number(t.dataset.goto));
  });

  // Next buttons (screens 2, 3, 5, 6) – generic
  $$('[data-next]').forEach(btn => btn.addEventListener('click', next));

  // 1 · Start: music starts inside the click handler, then the experience begins
  $('#start-btn').addEventListener('click', () => {
    playMusic();                    // synchronous call to audio.play() → satisfies autoplay policy
    goTo(SCREEN.WISHES);
  });

  // music controls
  musicBtn.addEventListener('click', toggleMusic);
  songBtn.addEventListener('click', toggleMusic);
  $('#toast-retry').addEventListener('click', () => { hideToast(); playMusic(); });
  $('#toast-close').addEventListener('click', hideToast);

  // 4 → 5
  $('#blow-btn-1').addEventListener('click', () => goTo(SCREEN.CANDLES, { autoBlow: true }));
  // 5
  $('#blow-btn-2').addEventListener('click', blowCandles);
  // 7
  $('#cut-btn').addEventListener('click', cutCake);
  $('#cut-next').addEventListener('click', () => {
    if (state.cake === 'cut') { next(); return; }
    cutCake().then(() => later('cut', () => { if (state.current === SCREEN.CUT) next(); }, prefersReducedMotion() ? 0 : 900));
  });
  // 8
  $('#replay-btn').addEventListener('click', replay);

  // keyboard: ← / →
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  });

  // initial state: Welcome screen, nothing playing
  screens.forEach((s, i) => { s.inert = i !== 0; s.setAttribute('aria-hidden', i === 0 ? 'false' : 'true'); });
  updateNavUI();
  syncMusicUI();
})();
