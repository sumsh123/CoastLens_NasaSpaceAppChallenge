import { init, gsap, ScrollTrigger, SplitText, REDUCE, FINE, DPR, EASE, $, $$, clamp, lerp, fit, whileVisible, loadStats } from './core.js';
import { mosaic, cover, drawClouds, BBOX } from './tiles.js';
import { Mangrove3D } from './mangrove3d.js';

init();
const OPTICAL = 's2_truecolor_2025_26', RADAR = 'nisar_hv_20261010';
const SAND = '#eadfcb', MOCHA = '#3a2c24', LBAND = '#b0782a';

/* ---------- 1 · hero: real image, illustrated cloud, radar lens ---------- */
{
  const c = $('#cHero'), g = c.getContext('2d'), hud = $('#hudPos');
  const base = mosaic(OPTICAL), rad = mosaic(RADAR, 12, '#141210');
  const lens = { x: 0, y: 0, tx: null, ty: null }, view = { zoom: REDUCE ? 1.04 : 1.4 };
  let t = 0;
  if (!REDUCE) gsap.to(view, { zoom: 1.04, duration: 5, ease: 'power3.out' }); // the descent
  c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); lens.tx = (e.clientX - r.left) * DPR; lens.ty = (e.clientY - r.top) * DPR; });
  c.addEventListener('pointerleave', () => { lens.tx = null; });

  whileVisible(c, () => {
    if (fit(c)) { lens.x = c.width * 0.7; lens.y = c.height * 0.45; }
    const w = c.width, h = c.height;
    t += REDUCE ? 0 : 0.016;
    // with no pointer (touch, keyboard) the lens drifts slowly on its own
    const tx = lens.tx ?? w * (0.62 + 0.2 * Math.sin(t * 0.21)), ty = lens.ty ?? h * (0.46 + 0.16 * Math.sin(t * 0.33));
    lens.x = lerp(lens.x, tx, 0.07); lens.y = lerp(lens.y, ty, 0.07);
    g.imageSmoothingEnabled = true;
    cover(g, base, w, h, view.zoom);
    drawClouds(g, w, h, t);
    const r = Math.min(w, h) * (FINE ? 0.2 : 0.24);
    g.save();
    g.beginPath(); g.arc(lens.x, lens.y, r, 0, 7); g.clip();
    cover(g, rad, w, h, view.zoom);
    g.restore();
    // lens ring, ticks and label
    g.strokeStyle = SAND; g.lineWidth = 5 * DPR;
    g.beginPath(); g.arc(lens.x, lens.y, r, 0, 7); g.stroke();
    g.strokeStyle = LBAND; g.lineWidth = 1.5 * DPR;
    g.beginPath(); g.arc(lens.x, lens.y, r + 7 * DPR, 0, 7); g.stroke();
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * 6.283 + t * 0.05, l = (k % 9 ? 5 : 13) * DPR, r0 = r + 10 * DPR;
      g.beginPath(); g.moveTo(lens.x + Math.cos(a) * r0, lens.y + Math.sin(a) * r0); g.lineTo(lens.x + Math.cos(a) * (r0 + l), lens.y + Math.sin(a) * (r0 + l)); g.stroke();
    }
    g.font = `500 ${11 * DPR}px "Geist Mono", monospace`; g.fillStyle = MOCHA; g.textAlign = 'center';
    g.fillText('RADAR · SEES THROUGH CLOUD', lens.x, lens.y - r - 30 * DPR);
    // live coordinate of the lens centre (approximate, from the cover fit)
    const s = Math.max(w / base.width, h / base.height) * view.zoom;
    const u = (lens.x - (w - base.width * s) / 2) / (base.width * s), v = (lens.y - (h - base.height * s) / 2) / (base.height * s);
    const lon = lerp(BBOX[0], BBOX[2], clamp(u, 0, 1)), lat = lerp(BBOX[3], BBOX[1], clamp(v, 0, 1));
    hud.textContent = `${lat.toFixed(3)}°N ${lon.toFixed(3)}°E`;
  });
  if (!REDUCE) gsap.to('#hero .title', { yPercent: -30, opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom 40%', scrub: 0.8 } });
}

/* ---------- 2 · one line, lit word by word ---------- */
if (!REDUCE) {
  document.fonts.ready.then(() => {
    const s = SplitText.create('#line', { type: 'words', wordsClass: 'w' });
    gsap.to(s.words, { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: '#oneline', start: 'top 70%', end: 'center 40%', scrub: 0.9 } });
  });
}

/* ---------- 3 · the mangrove (Sketchfab model, dots pinned to real points on it) ---------- */
{
  const sec = $('#tree'), frameEl = $('#sfTree'), hots = $('#hots'), card = $('#acard'), seen = new Set();
  // Facts are for the red / stilt-root mangrove (Rhizophora) that the model shows.
  const parts = [
    { id: 'roots', label: 'Stilt roots', t: 'It breathes through its stilts.', a: 'Stilt roots', b: 'Your nose', p: 'The mud holds almost no oxygen. These arching roots prop the tree up, and tiny pores on them take in air whenever the tide is out.' },
    { id: 'leaf', label: 'Leaves', t: 'It drinks seawater and bins the salt.', a: 'Old leaves', b: 'Your kidneys', p: 'Its roots keep out most of the salt in seawater. The little that gets in is sent to older leaves, which turn yellow and drop off.' },
    { id: 'seed', label: 'Hanging pods', t: 'Its babies are born ready.', a: 'Hanging pods', b: 'A newborn', p: 'Each long green pod is a seedling already growing on the parent tree. When it drops, it floats on the tide until it lodges in mud.' },
    { id: 'fish', label: 'Under the water', t: 'It runs a daycare.', a: 'Root maze', b: 'A daycare', p: 'When the tide comes in, young fish and shrimp hide in this tangle of roots until they are big enough for open water.' },
  ];
  let tree = null;
  const wide = () => innerWidth > 900, copyEl = $('#tree .copy');
  // centre of the free area between the heading block and `until` (the card, or the section edge), as fractions of the viewer
  const freeSpot = (until) => {
    const f = frameEl.getBoundingClientRect(), c = copyEl.getBoundingClientRect();
    if (wide()) return { fx: clamp(((Math.max(f.left, c.right) + Math.min(f.right, until.left)) / 2 - f.left) / f.width, 0.15, 0.85), fy: 0.5 };
    return { fx: 0.5, fy: clamp(((Math.max(f.top, c.bottom) + Math.min(f.bottom, until.top)) / 2 - f.top) / f.height, 0.2, 0.8) };
  };
  const open = (a) => {
    seen.add(a.id); a.el.classList.add('seen');
    $('#foundN').textContent = seen.size;
    const next = parts.find((q) => !seen.has(q.id));
    card.hidden = false;
    card.innerHTML = `<span class="mono">${seen.size} of 4</span><h3>${a.t}</h3>
      <div class="eq"><div><b>${a.a}</b><span>the mangrove</span></div><span>=</span><div><b>${a.b}</b><span>you</span></div></div>
      <p>${a.p}</p>
      <div class="row">${next ? `<button class="btn" id="aNext">Next: ${next.label}</button>` : `<a class="btn" href="#fish">Why it matters</a>`}<button class="btn" id="aBack">Back to the tree</button></div>`;
    // glide to the part, centred in the space between the heading and the card (beside it on desktop, above it on phones)
    tree?.focus(a.id, freeSpot(card.getBoundingClientRect()));
    if (!REDUCE) gsap.from(card, { opacity: 0, y: 24, duration: 0.9, ease: EASE });
    if (next) $('#aNext').onclick = () => open(next);
    $('#aBack').onclick = () => { card.hidden = true; tree?.reset(); };
  };
  parts.forEach((a) => {
    a.el = document.createElement('button');
    a.el.className = 'hot';
    a.el.innerHTML = `<i></i><span>${a.label}</span>`;
    a.el.onclick = () => open(a);
    a.el.style.display = 'none';
    hots.appendChild(a.el);
  });

  // load the (heavy) model only when the section is about to be seen
  new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    const edge = () => { const r = sec.getBoundingClientRect(); return { left: r.right, top: r.bottom }; };
    Mangrove3D(frameEl, $('#sfGrab'), { home: () => freeSpot(edge()) })
      .then((t) => {
        tree = t;
        sec.classList.add('ready');
        let rs = 0;
        addEventListener('resize', () => { clearTimeout(rs); rs = setTimeout(() => { if (!tree.st.focused) tree.reset(0); }, 200); });
        let busy = false;
        whileVisible(sec, () => {
          if (busy) return;
          busy = true;
          tree.frame().then((P) => {
            const f = frameEl.getBoundingClientRect(), s = sec.getBoundingClientRect();
            parts.forEach((a) => {
              const p = P[a.id], show = p.inView && (card.hidden || !seen.has(a.id));
              a.el.style.display = show ? 'flex' : 'none';
              a.el.classList.toggle('behind', !p.front);
              a.el.style.left = f.left - s.left + p.x + 'px';
              a.el.style.top = f.top - s.top + p.y + 'px';
            });
          }).finally(() => (busy = false));
        });
      })
      .catch(() => sec.classList.add('failed'));
  }, { rootMargin: '600px 0px' }).observe(sec);
}

/* ---------- 4 · your fish, traced back ---------- */
{
  const steps = $$('#chain .step').reverse(); // plate first
  let played = false;
  const play = () => {
    if (played) return;
    played = true;
    $$('[data-fish]').forEach((b) => b.setAttribute('aria-pressed', 'true'));
    if (REDUCE) { gsap.set(steps, { opacity: 1 }); gsap.set('#chain .trail', { scaleX: 1 }); return; }
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    tl.to(steps, { opacity: 1, duration: 0.9, stagger: 1 })
      .to('#chain .trail', { scaleX: 1, duration: 5, ease: 'none' }, 0)
      .fromTo('#chain .fishy', { opacity: 0, x: 0 }, { opacity: 1, x: () => -$('#chain').offsetWidth * 0.8, duration: 5, ease: 'none' }, 0);
  };
  $$('[data-fish]').forEach((b) => (b.onclick = play));
  ScrollTrigger.create({ trigger: '#chain', start: 'top 45%', once: true, onEnter: play });
}

/* ---------- 5 · blind spot: frame expands, cloud rolls in, radar reveals ---------- */
{
  const c = $('#cBlind'), g = c.getContext('2d'), frame = $('#blind .frame'), intro = $('#blind .intro'), box = $('#blind .copy');
  const base = mosaic(OPTICAL), rad = mosaic(RADAR, 12, '#141210');
  const copy = [
    ['01 / 03 · Optical', 'A camera in space needs clear sky.', 'In the monsoon, cloud can hide this coast from ordinary satellite cameras. No picture, no answer.'],
    ['02 / 03 · NISAR pass', 'In 2025, a different kind of satellite.', 'NISAR, built by NASA and India’s ISRO, does not take photographs. It sends its own radar signal and listens for the echo.'],
    ['03 / 03 · Radar', 'It sees straight through.', 'Day or night, cloud or not, every 12 days. This is its real image of Keti Bandar: bright is forest, dark is water.'],
  ];
  let p = REDUCE ? 1 : 0, stage = -1, t = 0;
  const draw = () => {
    fit(c);
    const w = c.width, h = c.height;
    t += REDUCE ? 0 : 0.016;
    const grow = clamp(p / 0.22, 0, 1), cloud = clamp((p - 0.18) / 0.2, 0, 1), pass = clamp((p - 0.42) / 0.22, 0, 1), rev = clamp((p - 0.62) / 0.3, 0, 1);
    if (!REDUCE) {
      const k = 1 - gsap.parseEase('power2.inOut')(grow), m = innerWidth < 900;
      frame.style.clipPath = `inset(${(m ? 30 : 24) * k}% ${(m ? 12 : 30) * k}%)`;
    }
    if (!REDUCE) {
      const a = clamp((p - 0.14) / 0.1, 0, 1);
      intro.style.opacity = 1 - grow; intro.style.transform = `translateY(${-40 * grow}px)`;
      box.style.opacity = a; box.style.transform = `translateY(${30 * (1 - a)}px)`;
    }
    g.imageSmoothingEnabled = true;
    cover(g, base, w, h, 1.25 - 0.2 * grow);
    drawClouds(g, w, h, t, cloud * (1 - rev * 0.35));
    if (rev > 0) {
      g.save(); g.beginPath(); g.rect(0, 0, w * rev, h); g.clip();
      cover(g, rad, w, h, 1.05);
      g.restore();
      if (rev < 1) { const gr = g.createLinearGradient(w * rev - 90 * DPR, 0, w * rev, 0); gr.addColorStop(0, 'rgba(176,120,42,0)'); gr.addColorStop(1, 'rgba(176,120,42,.85)'); g.fillStyle = gr; g.fillRect(w * rev - 90 * DPR, 0, 90 * DPR, h); }
    }
    if (pass > 0 && pass < 1) { // the satellite crossing, with its radar beam
      const X = lerp(-80 * DPR, w + 80 * DPR, pass), Y = h * 0.14;
      g.fillStyle = 'rgba(176,120,42,.16)'; g.beginPath(); g.moveTo(X - 8 * DPR, Y); g.lineTo(X - 190 * DPR, h); g.lineTo(X + 190 * DPR, h); g.lineTo(X + 8 * DPR, Y); g.fill();
      g.fillStyle = MOCHA; g.fillRect(X - 12 * DPR, Y - 9 * DPR, 24 * DPR, 18 * DPR);
      g.fillStyle = '#8f7f6c'; g.fillRect(X - 46 * DPR, Y - 5 * DPR, 30 * DPR, 10 * DPR); g.fillRect(X + 16 * DPR, Y - 5 * DPR, 30 * DPR, 10 * DPR);
    }
    const s = p < 0.42 ? 0 : p < 0.62 ? 1 : 2;
    if (s !== stage) { stage = s; $('#bStage').textContent = copy[s][0]; $('#bH').textContent = copy[s][1]; $('#bD').textContent = copy[s][2]; }
  };
  whileVisible($('#blind'), draw);
  if (!REDUCE) {
    ScrollTrigger.create({ trigger: '#blind', start: 'top top', end: '+=260%', pin: true, scrub: 1, onUpdate: (s) => (p = s.progress) });
  }
}

/* ---------- 6 · three scales, three small charts ---------- */
function lineChart(sel, pts, labels, col) {
  const lo = Math.min(...pts), hi = Math.max(...pts), X = (i) => 6 + (i * 288) / (pts.length - 1), Y = (v) => 92 - ((v - lo) / (hi - lo)) * 74;
  const d = pts.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
  $(sel).innerHTML = `<line x1="6" x2="294" y1="100" y2="100" stroke="currentColor" opacity=".25"/>
    <polyline points="${d}" fill="none" stroke="${col}" stroke-width="2.5" pathLength="1" stroke-dasharray="1" class="draw"/>
    ${pts.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="${col}"/>`).join('')}
    <text x="6" y="116" font-size="10" font-family="Geist Mono" fill="currentColor" opacity=".7">${labels[0]}</text>
    <text x="294" y="116" font-size="10" text-anchor="end" font-family="Geist Mono" fill="currentColor" opacity=".7">${labels[1]}</text>`;
}
lineChart('#gWorld', [152604, 147359], ['1996 · 152,604 km²', '2020 · 147,359 km²'], MOCHA);
lineChart('#gDelta', [50973, 101446], ['1990 · 50,973 ha', '2023 · 101,446 ha'], MOCHA);
loadStats().then((S) => {
  const ys = S.mangrove_area.years, bw = 44;
  $('#gLocal').innerHTML = `<line x1="6" x2="294" y1="100" y2="100" stroke="currentColor" opacity=".3"/>` + ys.map((y, i) => {
    const hgt = (y.km2 / 200) * 92, x = 14 + i * ((280 - bw) / (ys.length - 1));
    return `<rect class="bar" x="${x}" y="${100 - hgt}" width="${bw}" height="${hgt}" fill="#7d8f63"/>
      <text x="${x + bw / 2}" y="${94 - hgt}" font-size="10" text-anchor="middle" font-family="Geist Mono" fill="currentColor">${y.km2.toFixed(1)}</text>
      <text x="${x + bw / 2}" y="116" font-size="10" text-anchor="middle" font-family="Geist Mono" fill="currentColor" opacity=".7">${y.year}</text>`;
  }).join('');
  if (REDUCE) return;
  gsap.from('#gLocal .bar', { scaleY: 0, transformOrigin: '50% 100%', duration: 1.6, ease: EASE, stagger: 0.15, scrollTrigger: { trigger: '#gLocal', start: 'top 85%', once: true } });
});
if (!REDUCE) $$('.draw').forEach((l) => gsap.from(l, { strokeDashoffset: 1, duration: 2, ease: 'power2.inOut', scrollTrigger: { trigger: l, start: 'top 85%', once: true } }));
