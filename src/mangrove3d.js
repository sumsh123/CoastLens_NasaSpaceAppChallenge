// The 3D red mangrove on the home page ("What is a mangrove?").
// Model: "red-mangrove-tree" by SAVIA_Colombia on Sketchfab, CC BY 4.0.
// Shown through the Sketchfab Viewer API so our own info dots can be pinned to
// real points on the model (see PARTS) and follow it as it turns.
// The viewer never receives pointer events: a transparent layer on top of it
// turns the tree on sideways drags and lets vertical swipes and the wheel
// scroll the page as normal.
import { REDUCE } from './core.js';

const API_URL = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
export const MODEL_UID = 'e806105d83bc440499495e62bb010f7a';

// Points on the model's own surface, in model units (Z is up, ground ≈ 0, crown top ≈ 2,400).
// Picked by clicking the parts in the Sketchfab viewer and checked from two sides.
export const PARTS = {
  roots: [557.3, 270.7, 673.5], // an arching stilt (prop) root, just below where it leaves the trunk
  leaf: [720.2, -288.3, 2228.3], // a leaf cluster near the top of the crown
  seed: [510.9, -643.8, 1404.7], // a long green propagule hanging under the crown (RedMangrovePod_Mat)
  fish: [175.1, -541.7, 28.9], // the root tangle at the waterline, where young fish shelter
};
const AXIS = [-4.3, 47.8]; // the trunk on the ground plane: the tree turns around this line
// The model's own resting view (measured with recenterCamera). Read from the viewer at load it is
// unreliable, because the camera may still be in Sketchfab's intro zoom.
const START = { position: [-4.3, -7991, 3686], target: [-4.3, 47.8, 1074] };

let apiScript;
const loadApi = () =>
  (apiScript ??= new Promise((ok, fail) => {
    if (window.Sketchfab) return ok();
    const s = document.createElement('script');
    s.src = API_URL;
    s.onload = ok;
    s.onerror = () => { apiScript = null; fail(new Error('Sketchfab viewer API did not load')); };
    document.head.appendChild(s);
  }));

const sub = (a, b) => a.map((v, i) => v - b[i]);
const add = (a, b) => a.map((v, i) => v + b[i]);
const mul = (a, k) => a.map((v) => v * k);
const len = (a) => Math.hypot(...a);
const norm = (a) => mul(a, 1 / (len(a) || 1));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const turn = (p, a) => { // rotate a point around the trunk axis
  const c = Math.cos(a), s = Math.sin(a), x = p[0] - AXIS[0], y = p[1] - AXIS[1];
  return [AXIS[0] + x * c - y * s, AXIS[1] + x * s + y * c, p[2]];
};

/**
 * Mounts the viewer in `iframe`; `grab` is the transparent layer laid over it.
 * home: where the trunk should sit in the viewer at rest, as fractions (fx, fy) of its size.
 */
export async function Mangrove3D(iframe, grab, { background = [0.957, 0.929, 0.878], home = () => ({ fx: 0.5, fy: 0.5 }) } = {}) {
  await loadApi();
  const api = await new Promise((ok, fail) => {
    new window.Sketchfab(iframe).init(MODEL_UID, {
      autostart: 1, preload: 1, camera: 0, scrollwheel: 0, ui_controls: 0, ui_infos: 0, ui_stop: 0, ui_hint: 0, ui_watermark: 0, dnt: 1,
      success: (a) => { a.start(); a.addEventListener('viewerready', () => ok(a)); },
      error: () => fail(new Error('Sketchfab viewer failed to start')),
    });
  });
  const call = (fn, ...args) => new Promise((ok) => api[fn](...args, (err, v) => ok(v === undefined ? err : v)));
  await call('setBackground', { color: background });
  const fov = (await call('getFov')) || 45; // degrees, across the viewer's shorter side
  const start = START;
  const startDist = len(sub(start.position, start.target));
  const st = { auto: !REDUCE, hold: 0, t: performance.now(), focused: null };

  /** Camera that looks along `back` and shows point p at (fx, fy) of the viewer, from `dist` away. */
  async function aim(p, fx, fy, dist, back, secs) {
    const right = norm(cross([0, 0, 1], back)), up = cross(back, right);
    const ppu = Math.min(iframe.clientWidth, iframe.clientHeight) / (2 * dist * Math.tan((fov * Math.PI) / 360)); // pixels per model unit at `dist`
    const w = iframe.clientWidth, h = iframe.clientHeight;
    const target = add(add(p, mul(right, (w / 2 - fx * w) / ppu)), mul(up, (fy * h - h / 2) / ppu));
    await call('setCameraLookAt', add(target, mul(back, dist)), target, secs);
  }
  const startBack = () => norm(sub(start.position, start.target));
  const restTrunk = [AXIS[0], AXIS[1], start.target[2]];

  /** Turn the whole camera around the trunk by angle a (radians). */
  async function rotate(a) {
    const c = await call('getCameraLookAt');
    await call('setCameraLookAt', turn(c.position, a), turn(c.target, a), 0);
  }

  // drag sideways to turn; vertical movement is left to the page (touch-action: pan-y)
  let drag = null;
  grab.addEventListener('pointerdown', (e) => { if (e.button) return; drag = { x: e.clientX, y: e.clientY, on: false }; });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.on && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - drag.y)) { drag.on = true; grab.setPointerCapture?.(e.pointerId); grab.classList.add('dragging'); }
    if (!drag.on) return;
    drag.x = e.clientX;
    st.hold = performance.now() + 2500;
    rotate(-dx * 0.008);
  });
  const end = () => { drag = null; grab.classList.remove('dragging'); };
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);

  /** One frame: slow turn when idle, then each part's screen position (CSS px inside the iframe). */
  async function frame() {
    const now = performance.now(), dt = Math.min(0.1, (now - st.t) / 1000);
    st.t = now;
    if (st.auto && !st.focused && !drag && now > st.hold) await rotate(0.12 * dt);
    const c = await call('getCameraLookAt');
    const view = norm([c.position[0] - AXIS[0], c.position[1] - AXIS[1]]);
    const w = iframe.clientWidth, h = iframe.clientHeight, out = {};
    await Promise.all(Object.entries(PARTS).map(async ([k, p]) => {
      const s = await call('getWorldToScreenCoordinates', p), x = s.canvasCoord[0], y = s.canvasCoord[1];
      const side = norm([p[0] - AXIS[0], p[1] - AXIS[1]]);
      out[k] = { x, y, inView: x > 8 && x < w - 8 && y > 8 && y < h - 8, front: side[0] * view[0] + side[1] * view[1] > -0.35 };
    }));
    return out;
  }

  /** Glide in to a part, keeping the viewing direction, framed at (fx, fy) so the info card doesn't hide it. */
  async function focus(key, { fx = 0.5, fy = 0.5, dist = startDist * 0.5 } = {}) {
    st.focused = key;
    const c = await call('getCameraLookAt');
    await aim(PARTS[key], fx, fy, dist, norm(sub(c.position, c.target)), REDUCE ? 0 : 1.4);
  }

  /** Back to the resting view (same side of the tree as now), then resume the slow turn. */
  async function reset(secs = REDUCE ? 0 : 1.4) {
    // keep the side of the tree the visitor is looking at, but go back to the starting height and distance
    const c = await call('getCameraLookAt'), h = norm([c.position[0] - c.target[0], c.position[1] - c.target[1]]), s = startBack(), hm = Math.hypot(s[0], s[1]);
    const { fx, fy } = home();
    await aim(restTrunk, fx, fy, startDist, [h[0] * hm, h[1] * hm, s[2]], secs);
    st.focused = null;
    st.hold = performance.now() + secs * 1000 + 300;
  }

  // start from the resting view, then shift it to where the layout wants the tree
  await call('setCameraLookAt', START.position, START.target, 0);
  await reset(0);
  return { api, frame, focus, reset, st };
}
