import { init, gsap, ScrollTrigger, SplitText, REDUCE, FINE, DPR, EASE, $, $$, clamp, lerp, fit, whileVisible } from './core.js';
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
  // the radar lens is the cursor here, so hide the site's custom cursor over the hero image
  c.addEventListener('pointerenter', () => $('.cursor')?.classList.add('gone'));
  c.addEventListener('pointerleave', () => $('.cursor')?.classList.remove('gone'));

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
  // "Visit the fish's home" in the next section scrolls back here and opens a card
  document.addEventListener('mangrove:open', (e) => {
    const a = parts.find((q) => q.id === e.detail);
    if (a) setTimeout(() => open(a), 1400); // once the scroll has (nearly) arrived
  });
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

/* ---------- 4 · rewind your fish: plate → market → boat → creek → mangrove roots, then the tree's other jobs ---------- */
{
  const sec = $('#fish'), pano = $('#fish .pano'), fish = $('#fish .fish'), grill = $('#fish .grill'), words = $$('#fish .w');
  const wave = $('#fish .wave'), carbon = $$('#fish .carbon circle'), mud = $('#fish .mud-carbon');
  // where the fish is at each stop (% of the scene) and how big; it gets younger, so smaller, as we go back
  const stops = [
    { left: 50, top: 60, scale: 1 }, // on the plate
    { left: 50, top: 55, scale: 0.78 }, // on ice at the market
    { left: 50, top: 41, scale: 0.55 }, // in the boat's net
    { left: 50, top: 62, scale: 0.42 }, // swimming in the creek
    { left: 40, top: 80, scale: 0.13 }, // a baby among the mangrove roots
  ];
  const at = (s) => ({ left: s.left + '%', top: s.top + '%', scale: s.scale });
  gsap.set(fish, { xPercent: -50, yPercent: -50, ...at(stops[0]) });
  gsap.set(wave, { x: 1530, y: 112, transformOrigin: '50% 100%' });
  gsap.set(words, { opacity: 0 });
  // the "Visit the fish's home" link: scroll up to the 3D tree and open its daycare card
  $('#fish .home-link').addEventListener('click', (e) => document.dispatchEvent(new CustomEvent('mangrove:open', { detail: e.currentTarget.dataset.open })));

  if (REDUCE) { // no motion: show the end of the story
    gsap.set(pano, { xPercent: -80 });
    gsap.set(fish, at(stops[4]));
    gsap.set([grill, wave, $('#fish .carbon')], { opacity: 0 });
    gsap.set(mud, { opacity: 1 });
    gsap.set([words[words.length - 1], $('#fish .home-link')], { autoAlpha: 1 });
    fish.classList.add('swim');
  } else {
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    const say = (i, t) => tl.to(words[i - 1], { opacity: 0, y: -16, duration: 0.3 }, t).fromTo(words[i], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35 }, t + 0.3);
    tl.set(words[0], { opacity: 1 }, 0).to({}, { duration: 0.5 }); // a beat on the plate
    stops.slice(1).forEach((s, j) => {
      const i = j + 1, t = 0.5 + j * 1.2;
      tl.to(pano, { xPercent: -20 * i, duration: 1 }, t).to(fish, { ...at(s), duration: 1 }, t);
      say(i, t + 0.2);
    });
    tl.to(grill, { opacity: 0, duration: 0.3 }, 0.6); // no longer cooked
    let t = 0.5 + 4 * 1.2 + 0.3;
    // storm: a wave rolls in from the sea and breaks on the roots, short of the houses
    say(5, t);
    tl.to(wave, { opacity: 1, duration: 0.2 }, t + 0.2).to(wave, { x: 1652, duration: 1, ease: 'power1.in' }, t + 0.2).to(wave, { scaleY: 0.15, scaleX: 1.3, opacity: 0, duration: 0.5, ease: 'power2.out' }, t + 1.2);
    t += 1.9;
    // carbon: specks drift down from the leaves and stay in the mud
    say(6, t);
    tl.to($('#fish .carbon'), { opacity: 1, duration: 0.2 }, t + 0.1).to(carbon, { y: 164, duration: 1.1, ease: 'power1.in', stagger: 0.06 }, t + 0.2).to(carbon, { opacity: 0, duration: 0.2 }, t + 1.5).to(mud, { opacity: 0.85, duration: 0.3 }, t + 1.45);
    t += 2;
    say(7, t);
    tl.to($('#fish .home-link'), { autoAlpha: 1, duration: 0.3 }, t + 0.5);
    tl.to({}, { duration: 0.8 }, t + 0.6); // hold on the last line
    const water = 0.5 + 2 * 1.2 + 0.6; // the fish is back in the water from the creek onwards
    ScrollTrigger.create({
      trigger: sec, start: 'top top', end: '+=520%', pin: true, scrub: 0.8, animation: tl,
      onUpdate: () => fish.classList.toggle('swim', tl.time() > water),
    });
  }
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
if (!REDUCE) $$('.draw').forEach((l) => gsap.from(l, { strokeDashoffset: 1, duration: 2, ease: 'power2.inOut', scrollTrigger: { trigger: l, start: 'top 85%', once: true } }));
