// The predicted path's promises (viewer/path.ts, its header comment), checked in the running page on what it draws:
// each flight flown through a set of instants, each seen from the chase camera, from the orbit camera close to the
// vehicle, from the seat, and from far enough out to see the whole Earth (where a player goes to read an orbit), in the
// real look and at some instants the cel look, at 1280 wide (and every third instant from the chase camera and far out
// at 820 and 390, where the panels take more of the view). At each it fails on
//   - a line that does not start at the vehicle (taken onto it within two reaches, path.ts `reachOf`),
//   - a line not first drawn ahead of the vehicle along its motion within its clearance (the gap and fade round it),
//     any of it seen drawn behind the vehicle from near it (from far out, any of it behind the vehicle nearer than
//     1,000 km), or a far end cut square that can be seen (but one that meets the ground at its ring): its owner's
//     rule, "the path should always cleanly be ahead of the ship, never behind it"; held every frame as the clock runs
//     at life's rate from the chase camera, and at ten and a hundred thousand times it (a coast on rails) for a flight
//     that goes round, which is besides looked at with the path drawn as the orbit lies among the stars (O),
//   - a chord that strays from the curve it stands for by more than CHORD_PX as seen from the eye, the line ahead's or the
//     line flown's,
//   - either line breaking into dots or fragments, or spreading into a sheet (its own pixels: the frame drawn with it
//     and without it, the stage frozen, the difference; a piece within the soft start round the vehicle, or on a faded
//     end where the line is drawn at under half its strength, is the line going to nothing, which over cloud and sea of
//     different brightness crosses the measure's threshold at more than one place, and is not counted),
//   - the line flown drawn from near the vehicle (where it is read as the path); and from far out, none behind a vehicle
//     that has flown a minute, whatever deck flies it (GitHub issue #6),
//   - a point of the line jumping between frames as the clock runs at life's rate (at instants from seconds to half an
//     hour ahead),
//   - a marker away from its place, a chip for a place that is in view, a chip that points elsewhere than its place,
//     or one that overlaps a panel or another chip,
//   - an apsis marked where the path's radial speed does not change sign, a path that does not end where it comes down,
//   - in the map (M), taken from the chase view at every third instant: a view that is not the map's or does not take in
//     the whole line ahead; no path with its switch off; an orbit drawn over the turning Earth, or not whole (its line
//     short of a revolution, or ending away from the vehicle); the vehicle's marker off the vehicle; another body that
//     flies with no line or marker; no outline of the Earth; and, out of it, anything but the chase view it was taken from,
//   - on the pad with guidance off and nothing lit (a page of its own, at 1280 and 390): anything predicted; no line of
//     the record's (pathref.ts), from the chase view and on the map, in both looks, or one not on the page, or with no
//     pixels of its own, or whose pixels differ between two frames of a still scene; on the map no outline of the Earth
//     or no marker on the vehicle; then, the engine lit and flown by hand with a prediction on show and moving, the
//     record's line anywhere but where it stood on the pad.
// Then each flight is taken over at seeded instants (--seed) and flown by scripted hands (Freedom 7 pitched hard over
// and its engine cut early; Vostok 1's ascent pitched and its stages cut early or late, its braking engine fired forward
// and back in orbit), checked at each step as above, run on to its end with nothing more done, and where it ends held
// against where the path said it would when the hands let go; one that breaks up is held to where the path had it as
// it broke up, and must then show no path; one that stays up, to where the path has it as far ahead as it goes.
//
// Every run measures the same thing (GitHub issue #7): each instant is reached exactly (the clock put forward a deck's
// five seconds at a time, or a frame's worth of the rate asked for, never by the wall's clock: a deck flies in whole
// ticks, so the flight there is the same however it got there); every view is taken up from the far one, so what was
// looked at before does not carry into it; what is drawn is measured with the stage frozen (the vehicle drawn where the
// flight is, nothing kept of an earlier frame) once the prediction on show is the one for that instant, its ease over
// and the line sampled for the camera as it stands, and the chips settled where the layout puts them against the panels
// as they stand (path.ts `chipsSettled`: the layout keeps a chip's way round from one frame to the next, so where a chip
// is while it eases depends on what was looked at before, and only where it settles is held to the rules); and the
// line's motion as the clock runs is measured on a clock of
// the page's own that gives every frame a sixtieth of a second (`VIRTUAL`), so a slow or busy machine sees the same
// frames as a fast one. The views are measured on --jobs pages at once (default 4), each flight
// and size, and each pair of hands, a page of its own, its lines printed together when it is done.
//   pnpm dev, then: node tools/path-test.mjs [url] [--shots <dir>] [--only f7|lb7|v1|v2|v3|v4|v5|v6|vk1|vk2] [--quick] [--at 60,700] [--seed n]
//                   [--hands: the hands alone] [--jobs n]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { flag, launch, open as openPage, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const shots = opt(args, '--shots', null);
const only = opt(args, '--only', null);
const at = opt(args, '--at', null);
const seed = Number(opt(args, '--seed', 1961));
const jobs = Math.max(1, Number(opt(args, '--jobs', 4)));
const handsOnly = flag(args, '--hands');
const quick = flag(args, '--quick');
const url = urlOf(args);
if (shots) mkdirSync(shots, { recursive: true });

/** Pixels: the most a chord may stray from its curve (pathline.ts samples to 0.35; the rest is the camera having moved since). */
const CHORD_PX = 1;
/** Summed RGB difference that counts as the line's pixel; a piece of it smaller than DOT pixels is a dot, smaller than BIT a fragment. */
const INK = 60;
const DOT = 20;
const BIT = 80;
/** Pixels: as the clock runs at life's rate, a frame that moves a point of the line further than this, and three times as far as the frames round it, is a leap. */
const JUMP_PX = 3;
/**
 * Degrees a chip's pointer may be off the bearing to its place, or (for a place a few pixels from the pointer, where a
 * bearing means nothing) the ray from the pointer passing within a marker's pixels of it; pixels a marker may be off its place.
 */
const AIM = 15;
const OFF = 3;
/** Pixels from the page's edge within which a place counts as at the edge, where a chip may stand for it (pathmarks.ts keeps a margin). */
const EDGE = 24;
/** Seconds of flight after which a line flown is owed. */
const FLOWN_AFTER = 60;

// Each flight: the instants of the record's flight looked at; for one that goes round, `orbit`, instants it is looked at
// with the path drawn as the orbit lies among the stars (the navball's O: where a path once round comes back to the
// vehicle, and where its owner saw it drawn behind his ship), and `coast`, the instant its clock is run from at the
// rates of a coast on rails. A flight not yet on this branch (`missing`) is passed over, and says so.
const FLIGHTS = {
  f7: { id: 'usa/mercury/mr-3-freedom-7', ballistic: true, instants: [5, 60, 142, 200, 300, 420, 560, 700] },
  lb7: { id: 'usa/mercury/mr-4-liberty-bell-7', ballistic: true, instants: [5, 60, 143, 200, 310, 420, 580, 700] },
  // (three revolutions: the ascent and its staging, the first orbit by day and night, the retrosequence and the burn, the
  // pack going in the entry, the drogue and the main)
  ma6: {
    id: 'usa/mercury/ma-6-friendship-7',
    instants: [5, 60, 131, 140, 200, 302, 600, 3000, 8000, 16_300, 16_395, 16_900, 17_100, 17_380, 17_500, 17_700],
    orbit: [3000, 8000],
    coast: 3000,
  },
  // (Aurora 7: the ascent, the first orbit, the retrosequence and the burn by hand, the pack going, the entry, the drogue and
  // the main both by hand)
  ma7: {
    id: 'usa/mercury/ma-7-aurora-7',
    instants: [5, 60, 130, 140, 200, 311, 600, 3000, 8000, 16_300, 16_400, 17_000, 17_200, 17_470, 17_560, 17_740],
    orbit: [3000, 8000],
    coast: 3000,
  },
  // (Sigma 7: the ascent, the first orbit, the drifting hours, the retrosequence and the burn, the pack going, the entry,
  // the drogue by hand and the main)
  ma8: {
    id: 'usa/mercury/ma-8-sigma-7',
    instants: [5, 60, 130, 140, 200, 317, 600, 3000, 16_000, 31_800, 31_930, 32_400, 32_600, 32_830, 32_900, 33_150],
    orbit: [3000, 16_000],
    coast: 3000,
  },
  // (Faith 7: the ascent, the first orbit, a day in it, the retrofire by hand at 33:59:30, the pack, the entry, the drogue
  // by hand and the main)
  ma9: {
    id: 'usa/mercury/ma-9-faith-7',
    instants: [5, 60, 134, 140, 200, 304, 600, 3000, 60_000, 122_300, 122_380, 122_800, 123_000, 123_260, 123_400, 123_560],
    orbit: [3000, 60_000],
    coast: 3000,
  },
  v1: {
    id: 'ussr/vostok/vostok-1',
    instants: [5, 60, 118, 125, 200, 330, 600, 700, 1500, 3000, 4600, 4750, 5200, 5900, 6100, 6500],
    orbit: [1500, 3000],
    coast: 1500,
  },
  // (a day in orbit: the first revolutions, the periods by hand, the night, the burn at 09:51 on the 7th and the descent)
  v2: {
    id: 'ussr/vostok/vostok-2',
    instants: [5, 60, 125, 330, 700, 3000, 4000, 30_600, 60_000, 87_000, 89_400, 89_480, 90_000, 90_400, 90_800],
    orbit: [3000, 4000, 30_600, 60_000],
    coast: 4000,
  },
  // (four days: the first revolutions, Vostok 4's launch below on the second day, the burn at 09:24 on the 15th and the descent)
  v3: {
    id: 'ussr/vostok/vostok-3',
    instants: [5, 60, 125, 330, 700, 3000, 84_200, 200_000, 336_000, 338_000, 338_080, 338_600, 339_000, 339_300, 339_600],
    orbit: [3000, 200_000],
    coast: 3000,
  },
  // (five days in orbit: the first revolutions, a day, two, four, the burn at 13:38 on the 19th and the descent)
  v5: {
    id: 'ussr/vostok/vostok-5',
    instants: [5, 60, 125, 330, 700, 3000, 86_400, 200_000, 345_600, 427_000, 427_160, 427_250, 427_900, 428_200, 428_500],
    orbit: [3000, 427_000, 427_900],
    coast: 3000,
  },
  // (three days: the first revolutions, a day, two, her orientation by hand on the last morning, the burn about 10:50 and the descent)
  v6: {
    id: 'ussr/vostok/vostok-6',
    instants: [5, 60, 125, 330, 700, 3000, 86_400, 200_000, 242_000, 253_000, 253_260, 253_300, 254_000, 254_300, 254_600],
  },
  // (three days: the first revolutions beside Vostok 3, the night, the burn at 09:31 on the 15th and the descent)
  v4: {
    id: 'ussr/vostok/vostok-4',
    instants: [5, 60, 125, 330, 700, 3000, 6000, 100_000, 252_000, 253_800, 253_860, 254_300, 254_700, 255_000, 255_300],
  },
  // (a day: the first revolutions, the sixth by hand, the night out of touch, the burn at 10:18:58 on the 13th and the descent)
  vk1: {
    id: 'ussr/voskhod/voskhod-1',
    instants: [5, 60, 125, 300, 530, 3000, 30_000, 60_000, 85_000, 85_740, 85_800, 86_300, 86_700, 87_000, 87_300],
    orbit: [3000, 60_000],
    coast: 3000,
  },
  // (three revolutions: staging, insertion, the first burn by day, the night, the third burn, retrofire, the entry banked, the drogue, the main)
  gt3: {
    id: 'usa/gemini/gt-3',
    instants: [5, 60, 150, 200, 340, 600, 3000, 5600, 8000, 15_700, 16_380, 16_410, 16_900, 17_250, 17_400, 17_560],
    orbit: [3000, 8000],
    coast: 3000,
  },
  // (four days: staging, insertion, the station keeping on both pairs, then on one, the walk's hours drifting, the second day,
  // the burn before retrofire, retrofire, the entry rolled, the drogue at 40,000 ft, the main)
  gt4: {
    id: 'usa/gemini/gt-4',
    instants: [5, 60, 150, 200, 340, 600, 2000, 4500, 16_000, 200_000, 350_900, 351_590, 351_620, 351_900, 352_200, 352_300, 352_500],
    orbit: [3000, 200_000],
    coast: 3000,
  },
  // (eight days: staging, insertion, the perigee raised, the pod, the third day's burns, the night before retrofire, the burn
  // timed for the landing place, the entry banked, the drogue at 69,000 ft, the main)
  gt5: {
    id: 'usa/gemini/gt-5',
    instants: [
      5, 60, 150, 200, 340, 600, 3000, 3400, 7700, 183_200, 191_000, 686_200, 686_300, 687_000, 687_300, 687_660, 687_800, 688_000,
    ],
    orbit: [3000, 183_200],
    coast: 3000,
  },
  // (a day: the airlock out, the walk at 11:34, the airlock shot off, the burn by hand at 11:36 on the 19th and the descent)
  vk2: {
    id: 'ussr/voskhod/voskhod-2',
    instants: [5, 60, 125, 300, 540, 1400, 5700, 8400, 50_000, 92_150, 92_210, 92_700, 93_100, 93_400, 93_720],
    orbit: [1400, 50_000],
    coast: 1400,
  },
  // (the Gemini targets: the Atlas, its verniers alone, the Agena's coast and its burn, the first orbit; the two lost ones
  // to the sea)
  g5003: { id: 'usa/gemini/gatv-5003', instants: [5, 60, 131, 200, 305, 340, 450, 600, 3000, 8000], orbit: [3000, 8000], coast: 3000 },
  atda: { id: 'usa/gemini/atda', instants: [5, 60, 118, 200, 360, 400, 3000, 8000], orbit: [3000, 8000], coast: 3000 },
  g5002: { id: 'usa/gemini/gatv-5002', instants: [5, 60, 131, 200, 305, 368, 400, 600, 900] },
  g5004: { id: 'usa/gemini/gatv-5004', instants: [5, 60, 125, 140, 200, 300, 400] },
};
const VIEWS = ['chase', 'locked', 'onboard', 'far'];
/** The window sizes: a laptop's, a tablet's upright and a phone's. */
const SIZES = [
  [1280, 800],
  [820, 1180],
  [390, 844],
];

/**
 * Before the page's own scripts: a clock of the page's own for `performance.now` and the frames' times, which is the
 * wall's (continued where it was left) until it is switched on (`__virtual.on()`), then gives every frame exactly a
 * sixtieth of a second however long it took, and within a frame stands still (a budget of milliseconds, a prediction's
 * slice, is then the whole of the work at once). Switched off, it goes on from where it stood, so no time runs back.
 */
const VIRTUAL = () => {
  const real = performance.now.bind(performance);
  const raf = window.requestAnimationFrame.bind(window);
  const v = { running: false, offset: 0, now: 0, seen: -1 };
  performance.now = () => (v.running ? v.now : real() + v.offset);
  window.requestAnimationFrame = (cb) =>
    raf((ts) => {
      if (!v.running) return cb(ts + v.offset);
      if (ts !== v.seen) {
        v.seen = ts;
        v.now += 1000 / 60;
      }
      return cb(v.now);
    });
  window.__virtual = {
    on: () => {
      v.now = real() + v.offset;
      v.seen = -1;
      v.running = true;
    },
    off: () => {
      v.offset = v.now - real();
      v.running = false;
    },
  };
};

/**
 * Before the page's own scripts: `__side(ship, camera)`, where the line ahead is drawn about the vehicle as last sampled
 * (path.ts), every chord looked at in eight places as its fragment shader fades it (the gap and fade round the vehicle,
 * pathline.ts `fadeIn`, and its ends, `uEnds`): how far from the vehicle the nearest of it drawn ahead (along the
 * vehicle's motion) and behind lie, how many pixels of it drawn behind can be seen (in front of the eye, on the page, not
 * behind the Earth), and how much of its far end is drawn and whether it can be seen.
 */
const SIDE = () => {
  window.__side = (ship, cam) => {
    const p = window.sr.path;
    const s = p.sample;
    const shown = p.shown;
    if (!s || !shown) return {};
    const V = cam.position.constructor;
    const q = cam.quaternion.clone().invert();
    const W = innerWidth;
    const H = innerHeight;
    const toView = (x, y, z) => new V(x, y, z).sub(cam.position).applyQuaternion(q);
    const toPage = (v) => {
      const c = v.clone().applyMatrix4(cam.projectionMatrix);
      return { x: ((c.x + 1) / 2) * W, y: ((1 - c.y) / 2) * H };
    };
    // the vehicle's way in the frame the line is drawn in: the prediction's own velocity at the instant the vehicle is
    // drawn at (its state there is the vehicle's), a second on, in the scene as the line is (over the ground at its own
    // instant, or as the orbit lies at the instant on show)
    const shift = p.shift ?? 0;
    const c = shown.curve;
    const now = Math.min(c.t[c.n - 1], Math.max(c.t[0], p.drawn?.now ?? s.t));
    const r = [0, 0, 0];
    const vel = [0, 0, 0];
    let i = 0;
    while (i + 2 < c.n && c.t[i + 1] <= now) i++;
    {
      const h = c.t[i + 1] - c.t[i];
      const u = Math.min(1, Math.max(0, (now - c.t[i]) / h));
      const [u2, u3] = [u * u, u * u * u];
      const w = [2 * u3 - 3 * u2 + 1, (u3 - 2 * u2 + u) * h, -2 * u3 + 3 * u2, (u3 - u2) * h];
      const dw = [(6 * u2 - 6 * u) / h, 3 * u2 - 4 * u + 1, (-6 * u2 + 6 * u) / h, 3 * u2 - 2 * u];
      for (let k = 0; k < 3; k++) {
        const [ra, va, rb, vb] = [c.r[i * 3 + k], c.v[i * 3 + k], c.r[i * 3 + 3 + k], c.v[i * 3 + 3 + k]];
        r[k] = w[0] * ra + w[1] * va + w[2] * rb + w[3] * vb;
        vel[k] = dw[0] * ra + dw[1] * va + dw[2] * rb + dw[3] * vb;
      }
    }
    const a = [0, 0, 0];
    const b = [0, 0, 0];
    p.sceneOf(r, 0, now + shift, shown.frame, now + shift, a, 0);
    p.sceneOf([r[0] + vel[0], r[1] + vel[1], r[2] + vel[2]], 0, now + shift + 1, shown.frame, now + shift, b, 0);
    const way = new V(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    const d = p.drawn;
    const gap = p.uniforms.uGap.value;
    const fade = p.uniforms.uFade.value;
    const E = p.mesh.material.uniforms.uEnds?.value ?? { x: 0, y: 0, z: 0, w: 0 };
    const zero = shown.result.from;
    const smooth = (x) => {
      const k = Math.min(1, Math.max(0, x));
      return k * k * (3 - 2 * k);
    };
    const alpha = (t, dist) => {
      const x = Math.min(1, Math.max(0, 0.631 * Math.log2(1 + (2 * Math.max(dist - gap, 0)) / Math.max(fade, 1e-9))));
      let k = x * x * (3 - 2 * x);
      if (E.w > 0) k *= 1 - smooth((t - zero - (E.z - E.w)) / E.w);
      return k;
    };
    const C = p.centre;
    const pole = p.pole;
    const A = 6378137;
    const stretch = 1 / (1 - 1 / 298.257223563) - 1;
    const along = (v) => v.addScaledVector(pole, v.dot(pole) * stretch);
    const hidden = (x, y, z) => {
      const f = along(new V(x, y, z).sub(cam.position));
      const e = along(cam.position.clone().sub(C));
      const k = -e.dot(f) / f.lengthSq();
      return k > 0 && k < 1 && e.addScaledVector(f, k).length() < A;
    };
    const near = 1.02 * cam.near;
    const seen = (v, x, y, z) => {
      if (v.z > -near || hidden(x, y, z)) return null;
      const pg = toPage(v);
      return pg.x >= 0 && pg.x <= W && pg.y >= 0 && pg.y <= H ? pg : null;
    };
    const L = p.line();
    const n = L.t.length;
    const out = { aheadNear: null, behindNear: null, behindPx: 0, endAlpha: null, endSeen: false, outcome: shown.result.outcome, shift };
    let last = null;
    // (a path that turns back on itself, straight up and down from the pad or a lob seen end on, comes back past the vehicle
    // honestly: what is behind is looked for until its way has turned more than a right angle from the vehicle's, but in
    // an orbit, which goes round, and whose coming round is what is looked for)
    const round = shown.result.outcome === 'orbit' || shown.result.outcome === 'limit';
    let turned = false;
    out.aheadReach = 0;
    const clear = gap + fade;
    for (let i = 0; i < n; i++) {
      const j = Math.min(i + 1, n - 1);
      const dx = L.p[j * 3] - L.p[i * 3];
      const dy = L.p[j * 3 + 1] - L.p[i * 3 + 1];
      const dz = L.p[j * 3 + 2] - L.p[i * 3 + 2];
      if (!round && j > i && dx * way.x + dy * way.y + dz * way.z < 0) turned = true;
      if (turned) break;
      // (a chord that passes near the vehicle in steps of an eighth of the clearance at most, so the first of it drawn is
      // found to that; the rest in eight)
      const len2 = dx * dx + dy * dy + dz * dz;
      const k =
        len2 > 0
          ? Math.min(1, Math.max(0, ((ship.x - L.p[i * 3]) * dx + (ship.y - L.p[i * 3 + 1]) * dy + (ship.z - L.p[i * 3 + 2]) * dz) / len2))
          : 0;
      const by = Math.hypot(L.p[i * 3] + dx * k - ship.x, L.p[i * 3 + 1] + dy * k - ship.y, L.p[i * 3 + 2] + dz * k - ship.z);
      const steps = j === i ? 1 : by < 4 * clear ? Math.min(2048, Math.max(8, Math.ceil(Math.sqrt(len2) / (clear / 8)))) : 8;
      for (let u = 0; u < steps; u++) {
        const f = u / steps;
        const x = L.p[i * 3] + dx * f;
        const y = L.p[i * 3 + 1] + dy * f;
        const z = L.p[i * 3 + 2] + dz * f;
        const t = L.t[i] + (L.t[j] - L.t[i]) * f;
        const dist = Math.hypot(x - ship.x, y - ship.y, z - ship.z);
        const ahead = (x - ship.x) * way.x + (y - ship.y) * way.y + (z - ship.z) * way.z >= 0;
        if (ahead) out.aheadReach = Math.max(out.aheadReach, dist);
        const pg = seen(toView(x, y, z), x, y, z);
        if (alpha(t, dist) < 0.02) {
          last = null;
          continue;
        }
        if (ahead) out.aheadNear = out.aheadNear === null ? dist : Math.min(out.aheadNear, dist);
        else {
          out.behindNear = out.behindNear === null ? dist : Math.min(out.behindNear, dist);
          if (pg && last) out.behindPx += Math.hypot(pg.x - last.x, pg.y - last.y);
        }
        last = !ahead && pg ? pg : null;
      }
    }
    if (n) {
      const e = n - 1;
      const [x, y, z] = [L.p[e * 3], L.p[e * 3 + 1], L.p[e * 3 + 2]];
      out.endAlpha = alpha(L.t[e], Math.hypot(x - ship.x, y - ship.y, z - ship.z));
      out.endSeen = Boolean(seen(toView(x, y, z), x, y, z));
    }
    // (named apart from `measure`'s `fade`, the ball round the vehicle on the page the pixel count leaves to the line's soft start)
    out.clearGap = gap;
    out.clearFade = fade;
    out.reach = d.reach;
    out.headOff = n ? Math.hypot(L.p[0] - ship.x, L.p[1] - ship.y, L.p[2] - ship.z) : null;
    // (as the line is drawn now: before it had a strength of its own, by whether it was shown)
    out.flownOpacity = d.flownOpacity ?? (p.flownMesh.visible ? p.flownMesh.material.uniforms.uOpacity.value : 0);
    return out;
  };
};

/**
 * In the page: wait until what is drawn is the settled answer for the instant on show, so that every run measures the
 * same thing: no prediction being worked, the one on show made from the sample on show (or one the flight keeps to:
 * path.ts `holds`, which gives it that sample's key), its ease over, and the line sampled since for the camera as it
 * stands; or, where no path is wanted (on the pad unlit, down), none on show. Measured before this, a run caught the line
 * part way through being made again or eased (a prediction begun a fifth of a second after the one before, or after the
 * camera's move), so the failures wandered from run to run.
 */
const SETTLE = `(async () => {
  const p = window.sr.path;
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  const began = performance.now();
  while (performance.now() - began < 15000) {
    await frame();
    const want = p.want();
    if (p.job) continue;
    if (!want) {
      if (!p.shown) break;
      continue;
    }
    if (p.shown && p.shown.key === want.key && performance.now() - p.shown.began > 400) break;
  }
  // and the markers' words where the layout puts them, against the panels as they stand: no chip fading out at one place
  // to come in at another, none half way from its label (path.ts chipsSettled); a chip that never settles is said so
  const still = performance.now();
  let settled = !p.chipsSettled;
  while (!settled && performance.now() - still < 5000) {
    await frame();
    settled = p.chipsSettled();
  }
  window.__chipsUnsettled = !settled;
  for (let i = 0; i < 3; i++) await frame();
})()`;

/** A seeded generator (mulberry32): the same numbers every run of the same seed. */
function seeded(n) {
  let a = n >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Each pair of hands its own numbers, from the seed and its name: the same whichever page runs it, and whenever. */
const randOf = (name) => {
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return seeded((seed ^ h) >>> 0);
};

const overlap = (a, b, m = 0) => a.x0 < b.x1 - m && b.x0 < a.x1 - m && a.y0 < b.y1 - m && b.y0 < a.y1 - m;
const apart = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** What the page says of the line, the camera and the markers, measured from the line's own points where it gives them. */
const measure = (page) =>
  page.evaluate((CHORD_PX) => {
    const sr = window.sr;
    const p = sr.path;
    const cam = window.__drawCamera;
    const V = cam.position.constructor;
    const q = cam.quaternion.clone().invert();
    const W = innerWidth;
    const H = innerHeight;
    const tanHalf = Math.tan((cam.fov * Math.PI) / 360) / cam.zoom;
    const pxPerRad = H / 2 / tanHalf;
    const toView = (x, y, z) => new V(x, y, z).sub(cam.position).applyQuaternion(q);
    const toPage = (v) => {
      const c = v.clone().applyMatrix4(cam.projectionMatrix);
      return { x: ((c.x + 1) / 2) * W, y: ((1 - c.y) / 2) * H, front: v.z < 0 };
    };
    const out = { probe: typeof p.line === 'function' && typeof p.where === 'function', issues: [], marks: [], chips: [], panels: [] };
    const ship = new V();
    const vessel = sr.stage.show.vessel(ship);
    out.ship = vessel ? toPage(toView(ship.x, ship.y, ship.z)) : null;
    // the ball of the gap and the fade round the vehicle (path.ts: so many pixels at it), where the line comes in from nothing, as it is seen
    if (vessel && p.drawn && out.ship.front) {
      const d = ship.distanceTo(cam.position);
      // (and the vehicle's outline on the screen, which the line keeps off where it passes in front: its long axis and
      // a breadth round it, with the margin it comes in over, path.ts `uShipSeg`, `uShipW`; device pixels)
      const u = p.uniforms;
      const ratio = u.uRatio?.value ?? 1;
      const seg = u.uShipSeg?.value;
      const outline = seg && u.uShipW.value > 0 ? (Math.hypot(seg.z - seg.x, seg.w - seg.y) / 2 + u.uShipW.value + 16 * ratio) / ratio : 0;
      out.fade = {
        x: out.ship.x,
        y: out.ship.y,
        r: Math.max(Math.atan2(p.drawn.gap + p.drawn.fade, Math.max(d - p.drawn.gap - p.drawn.fade, 1e-3)) * pxPerRad, outline),
      };
    }
    if (out.probe) {
      const L = p.line();
      const d = p.drawn;
      out.drawn = d;
      const n = L.t.length;
      out.chords = Math.max(0, n - 1);
      if (n > 1) {
        if (Math.abs(L.t[0] - d.now) > 1e-6)
          out.issues.push(`the line starts at ${L.t[0].toFixed(2)} s, not at the instant on show ${d.now.toFixed(2)}`);
        for (let i = 1; i < n; i++)
          if (!(L.t[i] > L.t[i - 1])) {
            out.issues.push(`the line goes back in time at its point ${i}`);
            break;
          }
        if (vessel) {
          const off = Math.hypot(L.p[0] - ship.x, L.p[1] - ship.y, L.p[2] - ship.z);
          if (off > Math.max(2 * (d.reach ?? d.gap), 0.01))
            out.issues.push(`the line starts ${off.toFixed(1)} m from the vehicle (reach ${(d.reach ?? d.gap).toFixed(1)} m)`);
        }
        // every chord against the curve it was cut from, as an angle from the eye
        let worst = 0;
        let at = -1;
        const near = 1.02 * cam.near;
        for (let i = 0; i + 1 < n; i++) {
          const tm = 0.5 * (L.t[i] + L.t[i + 1]);
          const m = p.where(tm);
          const a = toView(L.p[i * 3], L.p[i * 3 + 1], L.p[i * 3 + 2]);
          const b = toView(L.p[i * 3 + 3], L.p[i * 3 + 4], L.p[i * 3 + 5]);
          if (a.z > -near && b.z > -near) continue;
          const mv = toView(m[0], m[1], m[2]);
          // (what is seen: how far the curve is from the chord, wherever along it)
          const ab = b.clone().sub(a);
          const k = Math.min(1, Math.max(0, mv.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-12)));
          const mid = a.clone().addScaledVector(ab, k);
          const px = (mid.distanceTo(mv) / Math.max(mid.length(), near)) * pxPerRad;
          if (px > worst) {
            worst = px;
            at = i;
          }
        }
        out.worst = worst;
        // how much of the line should be seen: chords in front of the eye, on the page, past the vehicle's gap and fade and
        // not behind the Earth (its ellipsoid, stretched along the pole to a sphere, as the shader has it), in pixels along them
        const C = p.centre;
        const pole = p.pole;
        const A = 6378137;
        const stretch = 1 / (1 - 1 / 298.257223563) - 1;
        const along = (v) => v.addScaledVector(pole, v.dot(pole) * stretch);
        let expect = 0;
        for (let i = 0; i + 1 < n; i++) {
          const a = toView(L.p[i * 3], L.p[i * 3 + 1], L.p[i * 3 + 2]);
          const b = toView(L.p[i * 3 + 3], L.p[i * 3 + 4], L.p[i * 3 + 5]);
          if (a.z > -near || b.z > -near) continue;
          const mx = (L.p[i * 3] + L.p[i * 3 + 3]) / 2;
          const my = (L.p[i * 3 + 1] + L.p[i * 3 + 4]) / 2;
          const mz = (L.p[i * 3 + 2] + L.p[i * 3 + 5]) / 2;
          // (and not within three gaps: a path that doubles back there, straight up and down, lies on itself on the page)
          if (vessel && Math.hypot(mx - ship.x, my - ship.y, mz - ship.z) < Math.max(3 * d.gap, d.gap + d.fade)) continue;
          if (C && pole) {
            const f = along(new V(mx, my, mz).sub(cam.position));
            const e = along(cam.position.clone().sub(C));
            const k = -e.dot(f) / f.lengthSq();
            if (k > 0 && k < 1 && e.addScaledVector(f, k).length() < A) continue;
          }
          const pa = toPage(a);
          const pb = toPage(b);
          const on = (q) => q.x >= 0 && q.x <= W && q.y >= 0 && q.y <= H;
          if (on(pa) && on(pb)) expect += Math.hypot(pb.x - pa.x, pb.y - pa.y);
        }
        out.expect = expect;
        if (worst > CHORD_PX) out.issues.push(`chord ${at} of ${n - 1} strays ${worst.toFixed(2)} px from its curve`);
        // ahead of the vehicle, never behind it (the owner's rule): where the line is drawn at all (its gap and fade round
        // the vehicle, pathline.ts fadeIn; its ends, uEnds), against the vehicle's way along its motion
        if (vessel) Object.assign(out, window.__side(ship, cam));
        // the line flown, against the curve it was cut from, the same way
        const FT = L.flownT ?? [];
        out.flownChords = Math.max(0, FT.length - 1);
        out.flownWorst = 0;
        if (typeof p.flownWhere === 'function')
          for (let i = 0; i + 1 < FT.length; i++) {
            const a = toView(L.flown[i * 3], L.flown[i * 3 + 1], L.flown[i * 3 + 2]);
            const b = toView(L.flown[i * 3 + 3], L.flown[i * 3 + 4], L.flown[i * 3 + 5]);
            if (a.z > -near && b.z > -near) continue;
            const m = p.flownWhere(0.5 * (FT[i] + FT[i + 1]));
            const mv = toView(m[0], m[1], m[2]);
            const ab = b.clone().sub(a);
            const k = Math.min(1, Math.max(0, mv.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-12)));
            const mid = a.clone().addScaledVector(ab, k);
            out.flownWorst = Math.max(out.flownWorst, (mid.distanceTo(mv) / Math.max(mid.length(), near)) * pxPerRad);
          }
        if (out.flownWorst > CHORD_PX) out.issues.push(`a chord of the line flown strays ${out.flownWorst.toFixed(2)} px from its curve`);
        // each line's faded ends on the page, where it is drawn at under half its strength (its far end going out, `uEnds.zw`;
        // the line flown's old end coming in from nothing, `uEnds.xy`): the stretch where a line fading to nothing crosses the
        // measure's threshold, which over cloud and sea of different brightness it does at more than one place
        const tail = (T, P, ends, zero, ahead) => {
          const out = [];
          let run = [];
          for (let i = 0; i < T.length; i++) {
            const t = T[i] - zero;
            const faint = ahead ? ends.w > 0 && t > ends.z - ends.w / 2 : ends.y > 0 && t < ends.x + ends.y / 2;
            const v = toView(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
            if (faint && v.z < -near) {
              // (every two pixels along it, so a piece between two of its points is found beside it)
              const q = toPage(v);
              const was = run.at(-1);
              const n = was ? Math.min(512, Math.ceil(Math.hypot(q.x - was.x, q.y - was.y) / 2)) : 1;
              for (let k = 1; k < n; k++) run.push({ x: was.x + ((q.x - was.x) * k) / n, y: was.y + ((q.y - was.y) * k) / n });
              run.push(q);
            } else if (run.length) {
              out.push(run);
              run = [];
            }
          }
          if (run.length) out.push(run);
          return out;
        };
        const zero = p.shown?.result.from ?? 0;
        out.tails = {
          ahead: tail(L.t, L.p, p.mesh.material.uniforms.uEnds?.value ?? { x: 0, y: 0, z: 0, w: 0 }, zero, true),
          flown: tail(FT, L.flown ?? [], p.flownMesh?.material.uniforms.uEnds?.value ?? { x: 0, y: 0, z: 0, w: 0 }, 0, false),
        };
        // the markers against the propagation they were found in: an apoapsis where the radial speed goes from rising to
        // falling, a periapsis the other way, the end where the path ends
        const r = p.prediction;
        if (r) {
          const P = r.points;
          const radial = (t) => {
            let i = 0;
            while (i + 2 < P.length && P[i + 1].t <= t) i++;
            // (on the cubic through the two points either side: their places and speeds, as predict.ts `between`)
            const [a, b] = [P[i], P[i + 1]];
            const h = b.t - a.t;
            const s = Math.min(1, Math.max(0, (t - a.t) / Math.max(h, 1e-9)));
            const [s2, s3] = [s * s, s * s * s];
            const w = [2 * s3 - 3 * s2 + 1, (s3 - 2 * s2 + s) * h, -2 * s3 + 3 * s2, (s3 - s2) * h];
            const dw = [(6 * s2 - 6 * s) / h, 3 * s2 - 4 * s + 1, (-6 * s2 + 6 * s) / h, 3 * s2 - 2 * s];
            let rv = 0;
            for (let k = 0; k < 3; k++) {
              const x = w[0] * a.r[k] + w[1] * a.v[k] + w[2] * b.r[k] + w[3] * b.v[k];
              const u = dw[0] * a.r[k] + dw[1] * a.v[k] + dw[2] * b.r[k] + dw[3] * b.v[k];
              rv += x * u;
            }
            return rv;
          };
          for (const mk of p.marks ?? []) {
            if ((mk.kind !== 'apogee' && mk.kind !== 'perigee') || mk.t - P[0].t < 3 || P.at(-1).t - mk.t < 3) continue;
            const [before, after] = [radial(mk.t - 2), radial(mk.t + 2)];
            const ok = mk.kind === 'apogee' ? before > 0 && after < 0 : before < 0 && after > 0;
            if (!ok) out.issues.push(`${mk.id} at T+${mk.t.toFixed(1)} is not where the path's radial speed changes sign`);
          }
          if (r.impact && Math.abs(r.impact.t - P.at(-1).t) > 1e-6) out.issues.push('the path does not end where it comes down');
        }
      }
    }
    // the markers and the chips, and the panels
    out.unsettled = window.__chipsUnsettled === true;
    // (still settled as measured: a passing note under the clock that goes between the wait and now has the chips laid again)
    out.settled = !p.chipsSettled || p.chipsSettled();
    out.panels = sr.ui.panels().map((r) => ({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }));
    const now = p.drawn?.now ?? p.now ?? 0;
    for (const m of p.marks ?? []) {
      if (m.t <= now) continue;
      const v = m.at ? toView(m.at.x, m.at.y, m.at.z) : null;
      const place = v ? toPage(v) : null;
      const glyph = !m.el.classList.contains('gone') && getComputedStyle(m.el).display !== 'none' && !m.el.parentElement.hidden;
      const ce = m.chip.el;
      const op = Number(ce.style.opacity || getComputedStyle(ce).opacity);
      const box = ce.getBoundingClientRect();
      out.marks.push({ id: m.id, place, glyph, ex: m.ex, ey: m.ey });
      if (op > 0.5 && box.width > 0 && !ce.parentElement.hidden) {
        const laid = p.chipsLaid?.get(m.id);
        out.chips.push({
          id: m.id,
          x0: box.left,
          y0: box.top,
          x1: box.right,
          y1: box.bottom,
          place,
          op,
          laid: laid ? { px: laid.px, py: laid.py, angle: laid.angle, box: laid.box } : null,
        });
      }
    }
    return out;
  }, CHORD_PX);

/** One page's run: its page, what it says (printed together when it is done) and what failed. */
class Run {
  constructor(name) {
    this.name = name;
    this.lines = [];
    this.failed = 0;
    this.cases = 0;
    this.hands = [];
    this.page = null;
    this.close = null;
    this.errors = [];
  }

  log(line) {
    this.lines.push(line);
  }

  fail(where, what) {
    this.failed++;
    this.lines.push(`  FAIL ${where}: ${what}`);
  }

  /** A page of the size given, on a flight's deck with the path drawn. */
  async open(W, H, f) {
    if (this.close) await this.close();
    const opened = await openPage(browser, `${url}#${f.id}/fly`, {
      viewport: [W, H],
      console: [],
      before: async (page) => {
        await page.addInitScript(VIRTUAL);
        await page.addInitScript(SIDE);
      },
      wait: () => window.sr && document.querySelector('.loading.done') && window.sr.cockpit.active,
      timeout: 120000,
    });
    this.page = opened.page;
    this.close = opened.close;
    this.errors.push(opened.errors);
    await this.page.evaluate(() => {
      // A launch shakes the camera for the draw, then restores it. Compare screen positions with the frame the visitor actually saw.
      const stage = window.sr.stage;
      const drawn = (window.__drawCamera = stage.camera.clone(false));
      const draw = stage.pipe.draw.bind(stage.pipe);
      stage.pipe.draw = (...args) => {
        drawn.copy(stage.camera, false);
        return draw(...args);
      };
      window.sr.path.show(true, false);
      window.sr.navball?.tuck?.(false, false);
    });
  }

  async done() {
    if (this.close) await this.close();
    for (const e of this.errors.flat()) this.fail('page', e);
  }

  turn() {
    return this.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  }

  now() {
    return this.page.evaluate(() => window.sr.clock.t);
  }

  /**
   * Put the view where it is asked for (the chase camera, the orbit camera 60 m off the vehicle, the seat, or 26,000 km
   * off the Earth's centre), freeze the stage, and wait for the path to settle there. Every view is taken up from the
   * far one, so it is the same view whatever was looked at before: a rig takes up a view near it as it stands (the
   * chase camera, from the last instant's seat, stood inside the glow round a capsule coming down and behind it, where
   * the run that had come by another way saw it from the side).
   */
  view(v) {
    return this.page.evaluate(
      async ([v, SETTLE]) => {
        const sr = window.sr;
        const st = sr.stage;
        const went = async () => {
          // (the camera goes there, and the chips fade to where they are laid)
          for (let i = 0; i < 300 && (st.cam.orbit?.journey || st.cam.blend); i++) await new Promise((r) => requestAnimationFrame(r));
        };
        st.setAutoRotate(false);
        st.setCamera('orbit');
        const c = sr.path.centre ?? { x: 0, y: -6.37e6, z: 0 };
        st.pose(60, 35, 2.6e7, c.y, c.x, c.z);
        await went();
        if (v !== 'far') {
          // (a rig and, after an @, how far off the vehicle it is held: the chase a kilometre and a half off, where its owner
          // saw the vehicle small in the middle of the view)
          const [rig, off] = v.split('@');
          st.setCamera(rig);
          await went();
          if (off) {
            const r = st.cam[rig];
            r.zoomer.set(Math.log(Number(off)));
            r.distance = Number(off);
            r.handSet = true;
            for (let i = 0; i < 5; i++) await new Promise((r) => requestAnimationFrame(r));
          }
        }
        // (frozen: the vehicle drawn where the flight is, at once, and nothing of an earlier frame kept: Stage.frozen)
        st.frozen = true;
        await new Promise((r) => setTimeout(r, 300));
        // biome-ignore lint/security/noGlobalEval: the one wait, shared by the page's steps
        await eval(SETTLE);
      },
      [v, SETTLE],
    );
  }

  /**
   * The flight flown live by its own sequence from the pad to `t`, exactly: the clock put forward five seconds at a time
   * (as far as a deck flies in a frame), and stopped there; then a prediction made from there
   * and drawn. A deck flies up to its clock in whole ticks of its own, so the flight at an instant is the same however the
   * clock got there, and so is everything drawn from it. (Run at three hundred times life's rate, as it was, the flight
   * stopped wherever the frames happened to leave it: "T+5" was T+5 in one run and T+8 in the next.)
   */
  seek(t) {
    return this.page.evaluate(
      async ([t, SETTLE]) => {
        const sr = window.sr;
        const c = sr.cockpit;
        const st = sr.stage;
        st.frozen = false;
        if (!window.__lit) {
          window.__lit = true;
          c.eventAt = -1e9;
          c.command('next'); // ignition
        }
        sr.clock.pause();
        // (the deck flies as the clock is put forward, whether or not the scene is drawn: it is drawn every twentieth step
        // and at the last, so a day in orbit, eighteen thousand steps, is not eighteen thousand frames)
        for (let i = 0; i < 20000 && sr.clock.t < t - 1e-9 && !c.state?.landing; i++) {
          const was = sr.clock.t;
          sr.clock.seek(Math.min(t, was + 5));
          if (i % 20 === 0) {
            st.frame();
            await new Promise((r) => requestAnimationFrame(r));
          }
          if (!(sr.clock.t > was)) break; // (down, or nowhere further to go)
        }
        st.frame();
        // biome-ignore lint/security/noGlobalEval: the one wait, shared by the page's steps
        await eval(SETTLE);
        const p = sr.path;
        return { shown: Boolean(p.shown), t: sr.clock.t, live: Boolean(p.live) };
      },
      [t, SETTLE],
    );
  }

  /** The line's own pixels: the frame with it and without it, the stage frozen and the camera still, the page hidden. */
  async pixels(name, fade = null, which = 'ahead', tails = []) {
    const page = this.page;
    // (all of the page: the markers are on the page, not the canvas, and their glyphs over the line cut it into pieces)
    const style = await page.addStyleTag({ content: '#ui, #gallery, #title { visibility: hidden !important }' });
    const shot = async (on) => {
      await page.evaluate(
        ([on, which]) => {
          // (one line at a time: the line ahead, or the line flown; the ring where it comes down, a loop of its own, hidden)
          const p = window.sr.path;
          // (the line flown in the line ahead's colour and strength: the same line, told from the scene by the same measure)
          p.flownAsAhead = which === 'flown';
          p.mesh.material.visible = which === 'ahead' && on;
          if (p.ringMesh) p.ringMesh.material.visible = false;
          if (p.flownMesh) p.flownMesh.material.visible = which === 'flown' && on;
          // (the record's line is a line of its own: hidden while either of the others is measured, so they are measured as ever)
          if (p.refMesh) p.refMesh.material.visible = which === 'ref' && on;
          window.sr.stage.dirty = true;
        },
        [on, which],
      );
      for (let i = 0; i < 6; i++) await this.turn();
      return (await page.screenshot({ type: 'png' })).toString('base64');
    };
    // (the dashes drawn under power are a pattern, not breaks: the line's pieces are counted with them off)
    const cut = await page.evaluate(() => {
      const u = window.sr.path.uniforms?.uCut;
      const was = u?.value ?? -1;
      if (u) u.value = -1;
      return was;
    });
    const a = await shot(true);
    const b = await shot(false);
    const c = await shot(true);
    await page.evaluate(() => {
      const p = window.sr.path;
      p.flownAsAhead = false;
      p.mesh.material.visible = true;
      if (p.flownMesh) p.flownMesh.material.visible = true;
      if (p.ringMesh) p.ringMesh.material.visible = true;
      if (p.refMesh) p.refMesh.material.visible = true;
    });
    await page.evaluate((cut) => {
      const u = window.sr.path.uniforms?.uCut;
      if (u) u.value = cut;
    }, cut);
    await style.evaluate((el) => el.remove());
    if (shots && name) writeFileSync(join(shots, `${name}.png`), Buffer.from(a, 'base64'));
    const got = await page.evaluate(
      async ([a, b, c, INK, DOT, BIT, fade, tails, keep]) => {
        const load = async (s) => {
          const img = new Image();
          img.src = `data:image/png;base64,${s}`;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const g = c.getContext('2d');
          g.drawImage(img, 0, 0);
          return g.getImageData(0, 0, c.width, c.height);
        };
        const A = await load(a);
        const B = await load(b);
        const C = await load(c);
        const w = A.width;
        const h = A.height;
        const mask = new Uint8Array(w * h);
        // (what changes between two frames drawn alike, with the line both times, is not the line: the fire, a glint; it and two pixels round it are left out)
        const still = new Uint8Array(w * h).fill(1);
        let unsteady = 0;
        for (let i = 0; i < w * h; i++) {
          const d =
            Math.abs(A.data[i * 4] - C.data[i * 4]) +
            Math.abs(A.data[i * 4 + 1] - C.data[i * 4 + 1]) +
            Math.abs(A.data[i * 4 + 2] - C.data[i * 4 + 2]);
          if (d > INK / 2) {
            unsteady++;
            const x = i % w;
            const y = (i - x) / w;
            for (let dy = -2; dy <= 2; dy++)
              for (let dx = -2; dx <= 2; dx++) if (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h) still[(y + dy) * w + x + dx] = 0;
          }
        }
        let area = 0;
        for (let i = 0; i < w * h; i++) {
          if (!still[i]) continue;
          const d =
            Math.abs(A.data[i * 4] - B.data[i * 4]) +
            Math.abs(A.data[i * 4 + 1] - B.data[i * 4 + 1]) +
            Math.abs(A.data[i * 4 + 2] - B.data[i * 4 + 2]);
          if (d > INK) {
            mask[i] = 1;
            area++;
          }
        }
        // its pieces (eight neighbours), after closing gaps of a pixel: the soft edge of a line fading in thresholds to a
        // ragged run of pixels, which is one piece; dots a few pixels apart (a ribbon under a pixel wide) stay apart
        const grown = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) {
          if (!mask[i]) continue;
          const x = i % w;
          const y = (i - x) / w;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) if (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h) grown[(y + dy) * w + x + dx] = 1;
        }
        mask.set(grown);
        const seen = new Uint8Array(w * h);
        const pieces = [];
        const stack = [];
        for (let i = 0; i < w * h; i++) {
          if (!mask[i] || seen[i]) continue;
          let n = 0;
          // (a piece that runs off the page, or into what moves of itself, may go on there: it is not counted as a fragment)
          let open = false;
          let x0 = w;
          let y0 = h;
          let x1 = 0;
          let y1 = 0;
          stack.push(i);
          seen[i] = 1;
          while (stack.length) {
            const j = stack.pop();
            n++;
            const x = j % w;
            const y = (j - x) / w;
            if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || !still[j]) open = true;
            x0 = Math.min(x0, x);
            x1 = Math.max(x1, x);
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const xx = x + dx;
                const yy = y + dy;
                if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
                const k = yy * w + xx;
                if (!still[k]) open = true;
                if (mask[k] && !seen[k]) {
                  seen[k] = 1;
                  stack.push(k);
                }
              }
          }
          // (and one within the vehicle's gap and fade as seen, where the line comes in from nothing, may be its faint tail)
          if (fade && Math.hypot(Math.max(fade.x - x1, 0, x0 - fade.x), Math.max(fade.y - y1, 0, y0 - fade.y)) < fade.r) open = true;
          // (and one on the line's faded end, drawn at under half its strength, is that end going out: measure's `tails`)
          if (!open && tails.some((run) => run.some((q) => q.x > x0 - 3 && q.x < x1 + 3 && q.y > y0 - 3 && q.y < y1 + 3))) open = true;
          pieces.push({ n, x0, y0, x1, y1, open });
        }
        const dots = pieces.filter((p) => p.n < DOT && !p.open);
        const bits = pieces.filter((p) => p.n >= DOT && p.n < BIT && !p.open);
        // (with --shots, the line's own pixels as the measure sees them: white the line, grey what moves of itself)
        let picture = null;
        if (keep) {
          const out = document.createElement('canvas');
          out.width = w;
          out.height = h;
          const g = out.getContext('2d');
          const img = g.createImageData(w, h);
          for (let i = 0; i < w * h; i++) {
            const v = mask[i] ? 255 : still[i] ? 0 : 70;
            img.data.set([v, v, v, 255], i * 4);
          }
          g.putImageData(img, 0, 0);
          picture = out.toDataURL('image/png').split(',')[1];
        }
        return {
          area,
          unsteady,
          pieces: pieces.length,
          dots: dots.length,
          bits: bits.map((p) => `${p.n}px@${p.x0},${p.y0}`),
          frac: area / (w * h),
          picture,
        };
      },
      [a, b, c, INK, DOT, BIT, fade, tails, Boolean(shots && name)],
    );
    if (got.picture) writeFileSync(join(shots, `${name}-mask.png`), Buffer.from(got.picture, 'base64'));
    return got;
  }

  /**
   * As the clock runs at `rate` times life's for `frames` frames, frame by frame: how far points of the line at instants a
   * little, a minute and up to half an hour ahead move from one frame to the next, in pixels from the eye; and where the
   * line is drawn about the vehicle (`__side`), each frame. On the page's own clock (`VIRTUAL`), a sixtieth of a second a
   * frame however long the frame took, so the same frames are measured on any machine; the stage let go of its freeze. At
   * a rate past an hour a second the clock is held at each of the record's instants and goes back to life's rate there
   * (world/clock.ts `hold`): it is asked again, as a visitor would.
   */
  jumps(rate = 1, frames = 40) {
    return this.page.evaluate(
      async ([rate, frames]) => {
        const sr = window.sr;
        const p = sr.path;
        if (typeof p.where !== 'function') return null;
        const cam = sr.stage.camera;
        sr.stage.frozen = false;
        window.__virtual.on();
        const T = [20, 60, 180, 600, 1800].map((x) => sr.clock.t + x);
        sr.clock.setRate(rate);
        sr.clock.play(true);
        const last = T.map(() => null);
        const moves = T.map(() => []);
        const sides = [];
        const ship = new cam.position.constructor();
        // (where the line drawn starts, in the draw itself: the anchor it was laid from, against the vehicle as the draw has it)
        if (!p.__drawnAt) {
          const prepare = p.prepare.bind(p);
          const at = new cam.position.constructor();
          p.prepare = (renderer, camera) => {
            p.__drawnOff = sr.stage.show.vessel(at) && p.mesh.visible ? p.mesh.position.distanceTo(at) : null;
            prepare(renderer, camera);
          };
          p.__drawnAt = true;
        }
        p.__drawnOff = null;
        try {
          for (let i = 0; i < frames; i++) {
            await new Promise((r) => requestAnimationFrame(r));
            const line = p.line().t;
            const vessel = sr.stage.show.vessel(ship);
            if (vessel && line.length > 1 && p.shown)
              sides.push({ t: sr.clock.t, ...window.__side(ship, cam), chords: line.length - 1, drawnOff: p.__drawnOff });
            // (after the frame is measured: asked between the draw and the measure, the frame measured was not the one drawn)
            if (sr.clock.rate !== rate) sr.clock.setRate(rate);
            if (rate !== 1) continue;
            const pxPerRad = innerHeight / 2 / (Math.tan((cam.fov * Math.PI) / 360) / cam.zoom);
            T.forEach((t, k) => {
              if (!(line.at(-1) > t)) {
                last[k] = null;
                return;
              }
              const w = p.where(t);
              const d = Math.hypot(w[0] - cam.position.x, w[1] - cam.position.y, w[2] - cam.position.z);
              if (last[k]) moves[k].push((Math.hypot(w[0] - last[k][0], w[1] - last[k][1], w[2] - last[k][2]) / d) * pxPerRad);
              last[k] = w;
            });
          }
        } finally {
          sr.clock.pause();
          sr.clock.setRate(1);
          window.__virtual.off();
        }
        // a leap: a frame that moves a point more than JUMP_PX and three times as far as the frames round it do (under
        // power the future itself moves, eased, frame by frame: that is motion, not a jump)
        let worst = 0;
        const all = [];
        for (const m of moves) {
          all.push(...m);
          for (let i = 0; i < m.length; i++) {
            const round = m
              .slice(Math.max(0, i - 4), i + 5)
              .filter((_, k) => k !== Math.min(i, 4))
              .sort((a, b) => a - b);
            const usual = round.length ? round[Math.floor(round.length / 2)] : 0;
            if (m[i] > 3 * usual) worst = Math.max(worst, m[i]);
          }
        }
        return { worst, usual: all.length ? [...all].sort((a, b) => a - b)[Math.floor(all.length / 2)] : 0, sides };
      },
      [rate, frames],
    );
  }

  /**
   * The line ahead about the vehicle (`__side`): it is drawn from within its clearance of the vehicle (the gap and the
   * fade, a few of the vehicle's lengths or `FADE_PX`: path.ts), along the vehicle's motion; nothing of it drawn behind
   * the vehicle can be seen (from far out, where the whole orbit is in view, nothing of it drawn behind it nearer than the
   * vehicle's horizon); and its far end is not a square cut, unless it meets the ground (its ring) or cannot be seen.
   */
  side(where, v, m) {
    if (m.aheadNear === undefined || !m.chords) return;
    const clear = m.clearGap + m.clearFade;
    // (a path whose way ahead lies all within the clearance, on the pad a moment after it was lit, has nothing there to draw)
    if (m.aheadNear === null) {
      if (m.aheadReach > 1.05 * clear + 1)
        this.fail(where, `nothing of the line is drawn ahead of the vehicle (it reaches ${m.aheadReach.toFixed(0)} m ahead)`);
    } else if (m.aheadNear > 1.05 * clear + 1)
      this.fail(where, `the line is first drawn ${m.aheadNear.toFixed(1)} m ahead of the vehicle (its clearance ${clear.toFixed(1)} m)`);
    if (v !== 'far' && m.behindPx > 2) this.fail(where, `${m.behindPx.toFixed(0)} px of the line ahead are drawn behind the vehicle`);
    if (v === 'far' && m.behindNear !== null && m.behindNear < 1_000_000)
      this.fail(where, `the line ahead is drawn ${(m.behindNear / 1000).toFixed(0)} km behind the vehicle`);
    if (m.outcome !== 'impact' && m.endSeen && m.endAlpha > 0.02)
      this.fail(where, `the line's far end is cut square, at ${(100 * m.endAlpha).toFixed(0)} % (${m.outcome})`);
  }

  /** The same of every frame of a run (`jumps`), each failure said once with the first instant it was seen at and how many frames. */
  frames(where, v, sides) {
    const seen = new Map();
    for (const s of sides) {
      const before = this.failed;
      const lines = this.lines.length;
      this.side(`${where} T+${s.t.toFixed(0)}`, v, s);
      // (the line as drawn starts where the draw has the vehicle: laid out for the frame it is drawn in, Stage.beforeDraw)
      if (s.drawnOff !== null && s.drawnOff !== undefined && s.drawnOff > Math.max(0.01, 0.5 * s.clearGap))
        this.fail(`${where} T+${s.t.toFixed(0)}`, `the line drawn starts ${s.drawnOff.toFixed(1)} m from where the vehicle is drawn`);
      // (the head where it is taken onto the vehicle: within two reaches of it, path.ts `PIN_WITHIN`)
      if (s.headOff !== null && s.reach && s.headOff > 2 * s.reach + 0.01)
        this.fail(`${where} T+${s.t.toFixed(0)}`, `the line starts ${s.headOff.toFixed(1)} m from the vehicle`);
      for (const line of this.lines.splice(lines)) {
        const what = line.replace(/T\+\d+: /, '').replace(/[\d.]+/g, '#');
        const had = seen.get(what);
        if (had) had.n++;
        else seen.set(what, { line, n: 1 });
      }
      this.failed = before;
    }
    for (const { line, n } of seen.values()) {
      this.failed++;
      this.lines.push(`${line}${n > 1 ? ` (and ${n - 1} frames more)` : ''}`);
    }
    return sides.length;
  }

  /**
   * At the rates of a coast on rails (ten thousand and a hundred thousand times life's: world/clock.ts `COAST_RATES`),
   * from the chase camera a kilometre and a half off and from far out: the line starts at the vehicle and runs ahead of
   * it every frame, though a frame is half an hour of the flight and a prediction a few frames' work.
   */
  async coasting(where) {
    for (const [v, distance] of [
      ['chase', 1500],
      ['far', 0],
    ])
      for (const rate of [10_000, 100_000]) {
        await this.view(v);
        if (distance)
          await this.page.evaluate((d) => {
            const r = window.sr.stage.cam.chase;
            r.zoomer.set(Math.log(d));
            r.distance = d;
            r.handSet = true;
          }, distance);
        const j = await this.jumps(rate, 24);
        const n = this.frames(`${where} ${v} at ${rate}x`, v, j?.sides ?? []);
        this.cases++;
        this.log(
          `  ${where} ${v} at ${rate}x: ${n} frames with a line, T+${(j?.sides?.[0]?.t ?? 0).toFixed(0)} to T+${(j?.sides?.at(-1)?.t ?? 0).toFixed(0)}`,
        );
      }
  }

  /** Everything checked of what is drawn now, from view `v`: the line ahead, the line flown, the markers and the chips. */
  async inspect(where, v, look, W, H, t = null) {
    let m = await measure(this.page);
    // (something on the page changed as it was measured, a note under the clock going: waited for again, and measured again)
    for (let k = 0; k < 3 && !m.settled && !m.unsettled; k++) {
      await this.page.evaluate(SETTLE);
      m = await measure(this.page);
    }
    if (!m.probe) this.fail(where, 'the page gives no line to measure (sr.path.line, sr.path.where, sr.path.drawn)');
    for (const issue of m.issues) this.fail(where, issue);
    const px = await this.pixels(shots ? where.replaceAll(/[ +]/g, '-') : null, m.fade, 'ahead', m.tails?.ahead);
    // (the line's pixels run about eight wide, its core, casing and glow over the threshold, closed by a pixel each side)
    // (from the seat the cabin's walls hide it but for the windows: not counted there)
    if (v !== 'onboard' && m.expect > 150 && px.area / 8 < 0.25 * m.expect)
      this.fail(where, `only about ${(px.area / 8).toFixed(0)} px of the ${m.expect.toFixed(0)} px of line in view are drawn`);
    if (px.frac > 0.2) this.fail(where, `the line covers ${(px.frac * 100).toFixed(0)} % of the view: a sheet`);
    if (px.dots > 2) this.fail(where, `the line breaks into dots: ${px.dots} pieces under ${DOT} px`);
    if (px.bits.length > 1) this.fail(where, `fragments of line: ${px.bits.join(', ')}`);
    // ahead of the vehicle and never behind it (the owner's rule: "the path should always cleanly be ahead of the ship")
    this.side(where, v, m);
    // the line flown: never from near the vehicle, where a line behind it is read as the path; from far out, owed behind a
    // vehicle that has flown a while, whatever deck flies it (#6), in its own quiet style
    const far = v === 'far';
    if (!far && m.flownOpacity > 0) this.fail(where, `the line flown is drawn from near the vehicle (at ${m.flownOpacity.toFixed(2)})`);
    if (far && t !== null && t >= FLOWN_AFTER && m.chords > 0 && !(m.flownChords > 0 && m.flownOpacity > 0))
      this.fail(where, `no line flown behind the vehicle from far out at T+${t}`);
    // the line flown, drawn alone where it is drawn: the same rules (drawn as the line ahead for the measure: `flownAsAhead`)
    const fl =
      far && m.flownChords > 1 && m.flownOpacity > 0
        ? await this.pixels(shots ? `${where.replaceAll(/[ +]/g, '-')}-flown` : null, m.fade, 'flown', m.tails?.flown)
        : null;
    if (fl) {
      if (fl.frac > 0.2) this.fail(where, `the line flown covers ${(fl.frac * 100).toFixed(0)} % of the view: a sheet`);
      if (fl.dots > 2) this.fail(where, `the line flown breaks into dots: ${fl.dots} pieces under ${DOT} px`);
      if (fl.bits.length > 1) this.fail(where, `fragments of the line flown: ${fl.bits.join(', ')}`);
    }
    // the markers on their places, the chips for those not in view, pointing at them, clear of the panels and each other
    if (m.unsettled) this.fail(where, 'the chips do not settle: after five seconds one is still fading or going to another place');
    for (const mk of m.marks) {
      if (mk.glyph && mk.place?.front && Math.hypot(mk.ex - mk.place.x, mk.ey - mk.place.y) > OFF)
        this.fail(where, `${mk.id} drawn ${Math.hypot(mk.ex - mk.place.x, mk.ey - mk.place.y).toFixed(0)} px from its place`);
    }
    for (const c of m.chips) {
      const pl = c.place;
      const inView =
        pl?.front &&
        pl.x > EDGE &&
        pl.x < W - EDGE &&
        pl.y > EDGE &&
        pl.y < H - EDGE &&
        !m.panels.some((b) => pl.x > b.x0 - 8 && pl.x < b.x1 + 8 && pl.y > b.y0 - 8 && pl.y < b.y1 + 8);
      // (where it is drawn, how strongly, and where the layout last laid it, in the view's frame: said with a failure)
      const box = (b) => (b ? `${b.x0.toFixed(0)},${b.y0.toFixed(0)}-${b.x1.toFixed(0)},${b.y1.toFixed(0)}` : 'none');
      const at = `drawn ${box(c)} at ${c.op.toFixed(2)}, laid ${box(c.laid?.box)}`;
      if (inView) this.fail(where, `a chip for ${c.id}, whose place (${pl.x.toFixed(0)}, ${pl.y.toFixed(0)}) is in view (${at})`);
      if (c.x0 < -1 || c.y0 < -1 || c.x1 > W + 1 || c.y1 > H + 1) this.fail(where, `the chip for ${c.id} is off the page`);
      for (const b of m.panels) if (overlap(c, b, 1)) this.fail(where, `the chip for ${c.id} overlaps a panel ${box(b)} (${at})`);
      for (const o of m.chips)
        if (o !== c && o.id < c.id && overlap(c, o, 1)) this.fail(where, `the chips for ${c.id} and ${o.id} overlap`);
      if (pl?.front && c.laid) {
        const want = (Math.atan2(pl.y - c.laid.py, pl.x - c.laid.px) * 180) / Math.PI;
        const got = (c.laid.angle * 180) / Math.PI;
        const off = Math.abs(((want - got + 540) % 360) - 180);
        // (the page and this measure each project the place: to a pixel or so apart, which three pixels off is many degrees)
        const near = (Math.atan2(OFF, Math.hypot(pl.y - c.laid.py, pl.x - c.laid.px)) * 180) / Math.PI;
        if (off > Math.max(AIM, near))
          this.fail(
            where,
            `the chip for ${c.id} points ${off.toFixed(0)} degrees off its place (${pl.x.toFixed(0)}, ${pl.y.toFixed(0)}) from (${c.laid.px.toFixed(0)}, ${c.laid.py.toFixed(0)}); ${at}`,
          );
      }
    }
    // (with --shots, the page as it stands, panels and chips with it, wherever there are chips)
    if (shots && m.chips.length) await this.page.screenshot({ path: join(shots, `${where.replaceAll(/[ +]/g, '-')}-ui.png`) });
    let jump = null;
    if (v.startsWith('chase') && look === 'real') {
      const j = await this.jumps();
      jump = j?.worst ?? null;
      if (j && j.worst > JUMP_PX)
        this.fail(
          where,
          `a point of the line leaps ${j.worst.toFixed(1)} px in a frame (it moves ${j.usual.toFixed(1)} px a frame round it)`,
        );
      this.frames(`${where} running`, v, j?.sides ?? []);
    }
    this.log(
      `  ${where}: ${m.chords ?? '?'} chords, ${m.expect !== undefined ? `${(px.area / 8).toFixed(0)}/${m.expect.toFixed(0)} px drawn, ` : ''}${m.worst !== undefined ? ` (worst ${m.worst.toFixed(2)} px)` : ''}, ${px.pieces} pieces, ${px.dots} dots, ${(px.frac * 100).toFixed(1)} % covered${fl ? `; flown ${m.flownChords} chords (worst ${m.flownWorst.toFixed(2)} px), ${fl.pieces} pieces` : ''}${m.drawn ? `, ${m.drawn.ms.toFixed(1)} ms` : ''}${jump !== null ? `, jump ${jump.toFixed(2)} px` : ''}, ${m.chips.length} chips`,
    );
  }

  /**
   * The flight run on to `t` (or down, or in pieces) at `rate` times life's: the clock put forward a frame's worth of it at
   * a time (a sixtieth of a second of it, at most five seconds), exactly to `t`, the stage drawn each time. Never by the
   * wall's clock: a hand held for a second is held for a second of the flight's, however long the frames take.
   */
  runTo(t, rate) {
    return this.page.evaluate(
      async ([t, rate]) => {
        const sr = window.sr;
        const c = sr.cockpit;
        sr.stage.frozen = false;
        sr.clock.pause();
        const step = Math.min(5, rate / 60);
        // (down; or in pieces and flown no further: a launch vehicle that broke up, whose run ends there)
        const ended = () => c.state?.landing || c.state?.landed || (c.state?.broke && c.run?.duration <= c.state.broke.t + 1e-6);
        for (let i = 0; i < 400000 && sr.clock.t < t - 1e-9 && !ended(); i++) {
          const was = sr.clock.t;
          sr.clock.seek(Math.min(t, was + step));
          sr.stage.frame();
          if (i % 10 === 0) await new Promise((r) => requestAnimationFrame(r));
          if (!(sr.clock.t > was)) break;
        }
        return sr.clock.t;
      },
      [t, rate],
    );
  }

  /** A key held for `seconds` of the flight's clock at life's rate. */
  async hold(key, seconds) {
    const t = await this.now();
    await this.page.keyboard.down(key);
    await this.runTo(t + seconds, 1);
    await this.page.keyboard.up(key);
  }

  deck(what) {
    return this.page.evaluate((what) => {
      const c = window.sr.cockpit;
      c.eventAt = -1e9;
      c.command(what);
    }, what);
  }

  /** The prediction on show once it is of the instant on show, and where it says the flight ends, in the Earth's frame. */
  predicted() {
    return this.page.evaluate(async () => {
      const sr = window.sr;
      const p = sr.path;
      const began = performance.now();
      while (performance.now() - began < 8000) {
        await new Promise((r) => requestAnimationFrame(r));
        // (one made from this instant, or one the flight has kept to since: path.ts `holds`, which gives it this instant's key)
        if (p.freshness.current) break;
      }
      const display = p.freshness;
      if (!display.current)
        throw Error(
          'Path display timed out after ' + Math.round(performance.now() - began) + ' ms of wall time: ' + JSON.stringify(display),
        );
      const r = p.prediction;
      // (its points kept, for where it has the flight at an instant: `predictedAt`)
      window.__predicted = r ? r.points.map((x) => ({ t: x.t, r: [...x.r], v: [...x.v] })) : null;
      if (!r?.impact) return r ? { outcome: r.outcome, from: display.sampleTime } : null;
      const w = 7.292115e-5 * r.impact.t;
      const i = r.impact.r;
      return {
        outcome: r.outcome,
        from: display.sampleTime,
        t: r.impact.t,
        ecef: [i[0] * Math.cos(w) + i[1] * Math.sin(w), -i[0] * Math.sin(w) + i[1] * Math.cos(w), i[2]],
        altitude: r.impact.altitude,
      };
    });
  }

  /** Where the flight on show is now, in the Earth's frame. */
  here() {
    return this.page.evaluate(() => {
      const s = window.sr.path.sample;
      const r = s.centre ?? s.r;
      const w = 7.292115e-5 * s.t;
      return {
        t: s.t,
        altitude: s.altitude,
        ecef: [r[0] * Math.cos(w) + r[1] * Math.sin(w), -r[0] * Math.sin(w) + r[1] * Math.cos(w), r[2]],
      };
    });
  }

  /**
   * The vehicle as it stands: each stage lit, stopped and let go, what has been dropped, and whether it is in pieces
   * (`broke`), and if so whether its run ends there (`ended`: a launch vehicle in pieces is flown no further; a ballistic
   * stack broken at a joint comes down in its two pieces, and is flown on).
   */
  stood() {
    return this.page.evaluate(() => {
      const c = window.sr.cockpit;
      const s = c.state;
      if (!s) return null;
      const n = (x) => (Number.isFinite(x) ? Number(x.toFixed(2)) : null);
      return {
        stages: s.stages ? s.stages.map((x) => ({ from: n(x.from), to: n(x.to), gone: n(x.gone) })) : null,
        drops: s.drops ? Object.fromEntries(Object.entries(s.drops).map(([k, v]) => [k, n(v)])) : null,
        broke: s.broke
          ? {
              t: s.broke.t,
              text: s.broke.text ?? `at its ${s.broke.joint} joint, ${Math.round(100 * s.broke.load)} per cent of its limit`,
              ended: Number.isFinite(c.run?.duration) && c.run.duration <= s.broke.t + 1e-6,
            }
          : null,
      };
    });
  }

  async views(where) {
    // (in pieces already, and flown no further: there is no future to show, and none must be)
    const stood = await this.stood();
    if (stood?.broke?.ended) return this.none(where, stood.broke);
    // (the prediction of the instant on show, first: a hand has just moved the flight off the last one)
    const p = await this.predicted();
    const now = await this.now();
    if (!p || Math.abs(p.from - now) > 1)
      this.fail(where, `no prediction of the instant on show (T+${now.toFixed(1)}): ${p ? `from T+${p.from.toFixed(1)}` : 'none'}`);
    for (const v of ['chase', 'far']) {
      this.cases++;
      await this.view(v);
      await this.turn();
      await this.inspect(`${where} ${v}`, v, 'real', 1280, 800);
    }
  }

  /**
   * The record's line (path.ts `layRef`, pathref.ts) on the pad, by hand: guidance off and nothing lit, so nothing is
   * predicted. From the chase view and on the map, in both looks: the line is there, on the page, in pixels of its own
   * that are the same in two frames of the still scene; the key beside the navball names it; on the map the Earth has
   * its outline and the vehicle its marker. Then the engine is lit and the flight flown on by hand, a prediction on show
   * and moving with it: the record's line is where it stood on the pad, to the millimetre.
   */
  async reference(where, f) {
    const page = this.page;
    const off = await page.evaluate(async () => {
      const sr = window.sr;
      const c = sr.cockpit;
      // (a ballistic deck shows guidance's own plan on the pad while guidance is on: off, there is none to show)
      if (c.steering.guidance && !c.predict) {
        c.eventAt = -1e9;
        c.command('guidance');
      }
      sr.path.show(true, false);
      for (let i = 0; i < 30; i++) await new Promise((r) => requestAnimationFrame(r));
      return { t: sr.clock.t, wanted: Boolean(sr.path.want()), shown: Boolean(sr.path.shown) };
    });
    this.cases++;
    if (off.wanted || off.shown) return this.fail(where, `on the pad by hand a path is predicted (T+${off.t})`);
    const T = [1, 30, 120, 300, 600];
    let stood = null;
    for (const view of ['chase', 'map']) {
      for (const look of ['real', 'cel']) {
        const at = `${where} ${view}${look === 'cel' ? ' cel' : ''}`;
        this.cases++;
        const m = await page.evaluate(
          async ([view, look, T]) => {
            const sr = window.sr;
            const st = sr.stage;
            const p = sr.path;
            const frames = async (n) => {
              for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r));
            };
            st.frozen = false;
            st.setAutoRotate(false);
            st.setLook?.(look);
            if (view === 'map') {
              if (st.cameraMode !== 'map') st.setMap(true);
              for (let i = 0; i < 400 && (st.cameraMode !== 'map' || st.cam.blend || st.cam.map.busy); i++) await frames(1);
            } else {
              if (st.cameraMode === 'map') st.setMap(false);
              st.setCamera('chase');
              for (let i = 0; i < 400 && (st.cameraMode !== 'chase' || st.cam.blend); i++) await frames(1);
            }
            st.frozen = true;
            await new Promise((r) => setTimeout(r, 300));
            await frames(30);
            const c = window.__drawCamera ?? st.camera;
            const rect = st.viewRect();
            const v = c.position.clone();
            const L = p.line();
            let on = 0;
            for (let i = 0; i < L.refT.length; i++) {
              const ahead = v.set(L.ref[i * 3], L.ref[i * 3 + 1], L.ref[i * 3 + 2]).applyMatrix4(c.matrixWorldInverse).z < 0;
              v.set(L.ref[i * 3], L.ref[i * 3 + 1], L.ref[i * 3 + 2]).project(c);
              if (ahead && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1) on++;
            }
            const mark = p.craftMark;
            const row = document.querySelector('[data-path-row=ref]');
            return {
              rig: st.cameraMode,
              shown: Boolean(p.shown),
              seen: p.mesh.visible && p.refMesh.visible,
              points: L.refT.length,
              ahead: L.t.length,
              on,
              from: p.drawnRef.from,
              frame: p.drawnRef.frame,
              ms: p.drawnRef.ms,
              key: Boolean(row && !row.hidden),
              limb: p.limbMesh.visible,
              marker: Boolean(mark) && !mark.el.classList.contains('gone') && !p.marksEl.hidden,
              where: T.map((t) => p.refWhere(t)),
              marks: p.refMarks.length,
            };
          },
          [view, look, T],
        );
        if (m.rig !== view) {
          this.fail(at, `the view is ${m.rig}`);
          continue;
        }
        if (m.shown || m.ahead) this.fail(at, 'a path is predicted on the pad with guidance off');
        if (!m.seen || m.points < 2) {
          this.fail(at, `no line of the record's: ${m.points} points${m.seen ? '' : ', not drawn'}`);
          continue;
        }
        if (m.from > 1e-6 || m.frame !== 'surface') this.fail(at, `the record's line starts at T+${m.from}, drawn in ${m.frame}`);
        if (m.on < 2) this.fail(at, `${m.on} of the ${m.points} points of the record's line are on the page`);
        if (!m.key) this.fail(at, 'the key beside the navball does not name the record’s line');
        if (view === 'map' && !m.limb) this.fail(at, 'the Earth has no outline on the map');
        if (view === 'map' && !m.marker) this.fail(at, 'the vehicle has no marker on the map');
        const px = await this.pixels(shots ? at.replace(/[ /+]/g, '-') : null, null, 'ref');
        if (px.area < 30) this.fail(at, `the record's line has ${px.area} pixels of its own`);
        if (px.unsteady) this.fail(at, `${px.unsteady} pixels differ between two frames of a still scene`);
        this.log(
          `  ${at}: the record's line, ${m.points} points (${m.on} on the page, ${m.ms.toFixed(1)} ms), ${px.area} px of its own, ${m.marks} events of its own`,
        );
        stood ??= m.where;
      }
    }
    await page.evaluate(async () => {
      const st = window.sr.stage;
      st.frozen = false;
      st.setLook?.('real');
      st.setMap(false);
      st.setCamera('chase');
      for (let i = 0; i < 400 && (st.cameraMode !== 'chase' || st.cam.blend); i++) await new Promise((r) => requestAnimationFrame(r));
    });
    // flown on by hand: a prediction on show, and made again as the flight goes; the record's line stays where it stood
    if (!stood) return;
    for (const t of [8, 20]) {
      const s = await this.seek(t);
      await this.view('chase');
      await this.turn();
      const at = `${where} T+${t} by hand`;
      this.cases++;
      const m = await page.evaluate(
        ([T]) => {
          const p = window.sr.path;
          return { where: T.map((x) => p.refWhere(x)), frame: p.drawnRef.frame, seen: p.refMesh.visible, ahead: p.line().t.length };
        },
        [T],
      );
      if (!s.shown || m.ahead < 2) this.log(`  ${at}: no path`);
      if (!m.seen) {
        this.fail(at, 'the record’s line is gone');
        continue;
      }
      const moved = Math.max(...stood.map((a, i) => Math.hypot(a[0] - m.where[i][0], a[1] - m.where[i][1], a[2] - m.where[i][2])));
      if (m.frame !== 'surface' || !(moved <= 1e-3))
        this.fail(at, `the record's line has moved ${moved.toFixed(3)} m from where it stood on the pad (drawn in ${m.frame})`);
      else
        this.log(
          `  ${at}: the record's line where it stood on the pad (${moved.toExponential(1)} m), ${m.ahead} points predicted beside it`,
        );
    }
  }

  /**
   * The map (M: camera/map.ts, path.ts `mapped`) at the instant on show, taken from the chase view with nobody having
   * set it: the view is the map's and takes in all of the line ahead; the path is drawn whatever its switch says; an
   * orbit is drawn as it lies among the stars and whole, its line coming round to the vehicle; the vehicle's marker is
   * on the vehicle; every other thing that flies in the run has its marker and its line; the Earth's outline is drawn;
   * and going back out of it gives the chase view back with the path as it was.
   */
  async map(where) {
    const m = await this.page.evaluate(
      async ([SETTLE]) => {
        const sr = window.sr;
        const st = sr.stage;
        const p = sr.path;
        const frames = async (n) => {
          for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r));
        };
        st.frozen = false;
        st.setAutoRotate(false);
        st.setCamera('chase');
        await frames(3);
        const was = p.showing;
        p.show(false, false); // (the map draws the path whatever its switch says)
        st.setMap(true);
        for (let i = 0; i < 400 && (st.cameraMode !== 'map' || st.cam.blend || st.cam.map.busy); i++) await frames(1);
        st.frozen = true;
        await new Promise((r) => setTimeout(r, 300));
        // biome-ignore lint/security/noGlobalEval: the one wait, shared by the page's steps
        await eval(SETTLE);
        await frames(20);
        const c = window.__drawCamera ?? st.camera;
        const rect = st.viewRect();
        const v = c.position.clone();
        // (where a place is on the page, and whether it is in front of the eye: the far plane is the scene's, fitted to
        // the globe, and the line is drawn past it)
        const px = (x, y, z) => {
          const ahead = v.set(x, y, z).applyMatrix4(c.matrixWorldInverse).z < 0;
          v.set(x, y, z).project(c);
          return [((v.x + 1) / 2) * rect.width, ((1 - v.y) / 2) * rect.height, ahead];
        };
        const L = p.line();
        let out = 0;
        for (let i = 0; i < L.t.length; i++) {
          const [x, y, ahead] = px(L.p[i * 3], L.p[i * 3 + 1], L.p[i * 3 + 2]);
          if (!(ahead && x >= -1 && x <= rect.width + 1 && y >= -1 && y <= rect.height + 1)) out++;
        }
        const ship = c.position.clone();
        const vessel = st.show.vessel(ship);
        const n = L.t.length;
        const shown = p.shown;
        const others = sr.stage.show.ascent?.others(sr.clock.t).filter((o) => !o.down) ?? [];
        const mark = p.craftMark;
        const at = vessel ? px(ship.x, ship.y, ship.z) : null;
        const result = {
          rig: st.cameraMode,
          focus: st.cam.map.focus,
          // (a future to show: none for a vehicle in pieces, one come down, or one whose prediction has no path in it, and
          // then the map shows the Earth and no more)
          wanted: Boolean(p.want()) && Boolean(shown) && shown.curve.n > 1,
          points: n,
          out,
          outcome: shown?.result.outcome ?? null,
          frame: shown?.frame ?? null,
          // (how far the line's far end is from the vehicle, m, and how long it runs, in revolutions of its curve)
          closes:
            n > 1 && vessel ? Math.hypot(L.p[(n - 1) * 3] - ship.x, L.p[(n - 1) * 3 + 1] - ship.y, L.p[(n - 1) * 3 + 2] - ship.z) : null,
          round: n > 1 && shown ? (L.t[n - 1] - L.t[0]) / Math.max(1e-9, shown.curve.t[shown.curve.n - 1] - shown.curve.t[0]) : 0,
          marker: mark && at ? Math.hypot(mark.ex - rect.left - at[0], mark.ey - rect.top - at[1]) : null,
          markerSeen: mark ? !mark.el.classList.contains('gone') && !p.marksEl.hidden : false,
          others: others.length,
          otherLines: [...p.others.values()].filter((o) => o.mesh.visible && o.line.n > 1).length,
          otherMarks: [...p.others.values()].filter((o) => !o.mark.el.classList.contains('gone')).length,
          limb: p.limbMesh.visible,
          flown: p.drawn.flownOpacity,
        };
        // and out again: the chase view, and the path as its switch has it
        st.frozen = false;
        st.setMap(false);
        for (let i = 0; i < 400 && (st.cameraMode === 'map' || st.cam.blend); i++) await frames(1);
        await frames(5);
        result.back = st.cameraMode;
        result.left = p.mesh.visible || Boolean(p.shown);
        result.limbLeft = p.limbMesh.visible && p.mesh.visible;
        p.show(was, false);
        return result;
      },
      [SETTLE],
    );
    this.cases++;
    this.log(
      `  ${where}: about the ${m.focus === 'body' ? 'Earth' : 'vehicle'}, ${m.points} points${m.outcome === 'orbit' ? `, ${m.round.toFixed(2)} of a revolution, closing ${(m.closes / 1000).toFixed(1)} km from the vehicle` : ''}, ${m.others} other${m.others === 1 ? '' : 's'}`,
    );
    if (m.rig !== 'map') return this.fail(where, `no map: the view is ${m.rig}`);
    if (m.back !== 'chase') this.fail(where, `out of the map the view is ${m.back}, not the chase view it was taken from`);
    if (m.left || m.limbLeft) this.fail(where, 'out of the map, with the path switched off, something of it is still drawn');
    if (!m.wanted) return void this.log(`  ${where}: no path`);
    if (!m.limb) this.fail(where, 'the Earth has no outline on the map');
    if (m.points < 2)
      return this.fail(where, 'no path on the map, though there is one to show (its switch is off: the map draws it all the same)');
    if (m.out)
      this.fail(
        where,
        `${m.out} of the ${m.points} points of the line ahead are outside the window: the map nobody has set takes it all in`,
      );
    if (!(m.marker !== null && m.marker <= OFF && m.markerSeen))
      this.fail(
        where,
        `the vehicle's marker is ${m.marker === null ? 'missing' : `${m.marker.toFixed(1)} px off the vehicle`}${m.markerSeen ? '' : ', unseen'}`,
      );
    if (m.outcome === 'orbit') {
      if (m.frame !== 'orbit')
        this.fail(where, `an orbit is drawn on the map over the turning Earth (${m.frame}), not as it lies among the stars`);
      if (!(m.round > 0.999 && m.closes < 100_000))
        this.fail(
          where,
          `the orbit is not drawn whole: ${m.round.toFixed(3)} of a revolution, its end ${(m.closes / 1000).toFixed(0)} km from the vehicle`,
        );
    }
    if (m.otherLines !== m.others || m.otherMarks < m.others)
      this.fail(where, `${m.others} other bodies fly, ${m.otherLines} have a line and ${m.otherMarks} a marker`);
    if (m.flown < 1) this.fail(where, `the line flown is drawn at ${m.flown.toFixed(2)} on the map`);
  }

  /** A vehicle in pieces, flown no further: no path may be on show for it. */
  async none(where, broke) {
    const shown = await this.page.evaluate(async () => {
      for (let i = 0; i < 30; i++) await new Promise((r) => requestAnimationFrame(r));
      return Boolean(window.sr.path.prediction) || window.sr.path.mesh.visible;
    });
    this.log(`  ${where}: in pieces since T+${broke.t.toFixed(1)} (${broke.text.split('.')[0]}): no path`);
    if (shown) this.fail(where, `the path still shows a future for a vehicle in pieces (T+${broke.t.toFixed(1)})`);
  }

  /** Where the prediction last read (`predicted`) has the flight at `t`, in the Earth's frame: on the cubic its points fix. */
  predictedAt(t) {
    return this.page.evaluate((t) => {
      const P = window.__predicted;
      if (!P?.length || t < P[0].t || t > P.at(-1).t) return null;
      let i = 0;
      while (i + 2 < P.length && P[i + 1].t <= t) i++;
      const [a, b] = [P[i], P[i + 1]];
      const h = b.t - a.t;
      const s = Math.min(1, Math.max(0, (t - a.t) / Math.max(h, 1e-9)));
      const [s2, s3] = [s * s, s * s * s];
      const w = [2 * s3 - 3 * s2 + 1, (s3 - 2 * s2 + s) * h, -2 * s3 + 3 * s2, (s3 - s2) * h];
      const r = [0, 1, 2].map((k) => w[0] * a.r[k] + w[1] * a.v[k] + w[2] * b.r[k] + w[3] * b.v[k]);
      const turned = 7.292115e-5 * t;
      return [r[0] * Math.cos(turned) + r[1] * Math.sin(turned), -r[0] * Math.sin(turned) + r[1] * Math.cos(turned), r[2]];
    }, t);
  }

  /**
   * The prediction of a flight that stays up against the flight: where the path, made at the instant on show, has it as
   * far ahead as the path goes (once round, or at most an hour), against where the flight, run on with nothing more done,
   * is then (within `tolerance` metres of how far it has gone over the ground).
   */
  async around(where, tolerance) {
    const p = await this.predicted();
    const from = await this.here();
    const last = await this.page.evaluate(() => window.__predicted?.at(-1)?.t ?? null);
    if (!p || last === null) return this.fail(where, 'no prediction to hold the flight to');
    const until = Math.min(last, from.t + 3600);
    await this.runTo(until, 300);
    const got = await this.here();
    const said = await this.predictedAt(got.t);
    if (!said) return this.fail(where, `the flight at T+${got.t.toFixed(0)} is outside the prediction made at T+${from.t.toFixed(0)}`);
    const miss = apart(said, got.ecef);
    const way = apart(from.ecef, got.ecef);
    this.log(
      `  ${where}: predicted at T+${from.t.toFixed(0)}; at T+${got.t.toFixed(0)} it is ${(miss / 1000).toFixed(2)} km from where the path had it, over ${(way / 1000).toFixed(0)} km (${((100 * miss) / Math.max(way, 1)).toFixed(2)} %)`,
    );
    this.hands.push({ where, miss, way, dt: 0 });
    if (miss > tolerance(way))
      this.fail(where, `it is ${(miss / 1000).toFixed(2)} km from where the path had it, over ${(way / 1000).toFixed(0)} km`);
  }

  /**
   * The prediction against the outcome: where the path said the flight would end, made at the instant on show, against
   * where the flight, run on with nothing more done, does end (within `tolerance` metres, and as a share of how far it had
   * to go). A launch vehicle that breaks up on the way is flown no further and comes down nowhere: it is held instead
   * to where the path had it at the instant it broke up, and the path must then show none.
   */
  async outcome(where, end, tolerance) {
    // (in pieces already: there is nothing to predict, and the page owes no prediction to wait for)
    const before = await this.stood();
    if (before?.broke?.ended) return this.none(where, before.broke);
    const p = await this.predicted();
    const from = await this.here();
    if (!p?.ecef) return this.fail(where, `no end predicted (${p?.outcome ?? 'no prediction'})`);
    await end();
    const after = await this.stood();
    const got = await this.here();
    // (what burned after the prediction was made: on a staged vehicle, each stage lit and stopped; the path is the flight
    // with nothing more done, so anything lit since means the hands did more, and the comparison says nothing of the path)
    const since = (after?.stages ?? [])
      .map((x, i) => ({ i, ...x }))
      .filter(
        (x) => x.from !== null && (x.from > from.t + 1e-6 || ((x.to ?? Number.POSITIVE_INFINITY) > from.t + 1e-6 && x.from <= from.t)),
      )
      .map((x) => `stage ${x.i} lit ${x.from.toFixed(1)} to ${x.to !== null ? x.to.toFixed(1) : 'dry'}`);
    if (since.length)
      this.fail(where, `burned after the prediction at T+${from.t.toFixed(1)}: ${since.join('; ')} (before: ${JSON.stringify(before)})`);
    const broke = after?.broke?.ended ? after.broke : null;
    const said = broke ? await this.predictedAt(got.t) : p.ecef;
    if (!said) return this.fail(where, `it broke up at T+${got.t.toFixed(1)}, outside the prediction made at T+${from.t.toFixed(1)}`);
    const miss = apart(said, got.ecef);
    const way = apart(from.ecef, got.ecef);
    const share = `${(miss / 1000).toFixed(2)} km`;
    const over = `over ${(way / 1000).toFixed(0)} km (${((100 * miss) / Math.max(way, 1)).toFixed(2)} %)`;
    this.log(
      broke
        ? `  ${where}: predicted at T+${from.t.toFixed(0)} to end at T+${p.t.toFixed(0)}; it broke up at T+${got.t.toFixed(1)} (${broke.text.split('.')[0]}), ${share} from where the path had it then, ${over}`
        : `  ${where}: predicted at T+${from.t.toFixed(0)} to end at T+${p.t.toFixed(0)}; it ends at T+${got.t.toFixed(0)}, ${share} from the prediction ${over}`,
    );
    this.hands.push({ where, miss, way, dt: got.t - p.t });
    if (miss > tolerance(way)) {
      this.fail(
        where,
        broke
          ? `it broke up ${share} from where the path had it then, over ${(way / 1000).toFixed(0)} km`
          : `it ends ${share} from where the path said, over ${(way / 1000).toFixed(0)} km`,
      );
      this.log(`    (the vehicle when the hands let go: ${JSON.stringify(before)}; at the end: ${JSON.stringify(after)})`);
    }
    if (broke) await this.none(where, broke);
  }
}

const browser = await launch();
const tasks = [];

// (a flight whose Fly is not on this branch yet: its flight.ts has no plan, and it has no orbital record to write one from)
for (const [key, f] of Object.entries(FLIGHTS)) {
  const [nation, programme, flight] = f.id.split('/');
  const file = join('missions', nation, programme, 'flights', flight, 'flight.ts');
  const record = join('missions', nation, programme, 'flights', flight, 'orbital.ts');
  if (!existsSync(file) || !(readFileSync(file, 'utf8').includes('plan:') || existsSync(record))) {
    console.log(`${key}: ${f.id} cannot be flown on this branch: passed over`);
    delete FLIGHTS[key];
  }
}

// A flight that goes round, with the path drawn as the orbit lies among the stars (O), at its `orbit` instants: at 1280
// from every view outside the vehicle, at 820 and 390 from the chase camera and far out; and at the rates of a coast on
// rails from its `coast` instant (at 1280).
for (const [W, H] of handsOnly || at ? [] : quick ? [SIZES[0]] : SIZES) {
  for (const [key, f] of Object.entries(FLIGHTS)) {
    if ((only && only !== key) || !f.orbit) continue;
    const wide = W === 1280;
    tasks.push({
      name: `${key} ${W} orbit`,
      weight: f.orbit.length * (wide ? 3 : 2) + (wide ? 8 : 0),
      run: async (r) => {
        await r.open(W, H, f);
        await r.page.evaluate(() => window.sr.navball.setFrame('orbit', false));
        for (const t of f.orbit) {
          for (const v of wide ? ['chase', 'chase@1500', 'locked', 'far'] : ['chase@1500', 'far']) {
            const where = `${key} ${W} orbit T+${t} ${v}`;
            r.cases++;
            const s = await r.seek(t);
            await r.view(v);
            await r.turn();
            if (!s.shown) {
              r.log(`  ${where}: no path`);
              continue;
            }
            await r.inspect(where, v, 'real', W, H, t);
          }
        }
      },
    });
    // (a page of its own: the clock only goes forward, and the coast is run from early in the flight)
    if (wide && f.coast)
      tasks.push({
        name: `${key} ${W} coast`,
        weight: 10,
        run: async (r) => {
          await r.open(W, H, f);
          await r.page.evaluate(() => window.sr.navball.setFrame('orbit', false));
          await r.seek(f.coast);
          await r.coasting(`${key} ${W} orbit from T+${f.coast}`);
        },
      });
  }
}

// On the pad by hand, a page of its own at the widest and the narrowest: the record's line with nothing predicted.
for (const [W, H] of handsOnly || at ? [] : SIZES.filter(([w]) => w === 1280 || w === 390)) {
  for (const [key, f] of Object.entries(FLIGHTS)) {
    if (only && only !== key) continue;
    tasks.push({
      name: `${key} ${W} pad`,
      weight: 3,
      run: async (r) => {
        await r.open(W, H, f);
        await r.reference(`${key} ${W} pad`, f);
      },
    });
  }
}

// The record's flight through its instants: at 1280 wide every instant and view; at 820 and 390 (the tablet and the
// phone, where the panels take more of the view) every third instant from the chase camera and from far out.
for (const [W, H] of handsOnly ? [] : SIZES) {
  for (const [key, f] of Object.entries(FLIGHTS)) {
    if (only && only !== key) continue;
    const all = W === 1280 && !quick;
    const wanted = at ? at.split(',').map(Number) : null;
    // (the instants by their place in the full list, so --at takes the same looks and views as the full run)
    const instants = [...f.instants.entries()].filter(([k, t]) => (wanted ? wanted.includes(t) : all || k % 3 === 0));
    if (!instants.length) continue;
    tasks.push({
      name: `${key} ${W}`,
      weight: instants.length * (all ? 4 : 2) + (key === 'v2' ? 20 : 0),
      run: async (r) => {
        await r.open(W, H, f);
        for (const [k, t] of instants) {
          const looks = all && k % 4 === 1 ? ['real', 'cel'] : ['real'];
          for (const look of looks) {
            await r.page.evaluate((look) => window.sr.stage.setLook?.(look), look);
            for (const v of all ? VIEWS : ['chase', 'far']) {
              const where = `${key} ${W} T+${t} ${v}${look === 'cel' ? ' cel' : ''}`;
              r.cases++;
              const s = await r.seek(t);
              await r.view(v);
              await r.turn();
              if (!s.shown) {
                r.log(`  ${where}: no path`);
                continue;
              }
              await r.inspect(where, v, look, W, H, v === 'onboard' ? null : t);
            }
          }
          await r.page.evaluate(() => window.sr.stage.setLook?.('real'));
          // (and the map, at every third instant of the full run and every instant of a short one)
          if (!all || k % 3 === 0) await r.map(`${key} ${W} T+${t} map`);
        }
      },
    });
  }
}

// Taken over at seeded instants and flown by scripted hands, each step checked as the record's instants are, then run on
// to its end and held against what the path said when the hands let go.
if (!quick && !at) {
  for (const [key, f] of Object.entries(FLIGHTS)) {
    if (only && only !== key) continue;
    for (let n = 0; n < 2; n++) {
      const name = `${key} hands ${n}`;
      if (f.ballistic)
        tasks.push({
          name,
          weight: 12,
          run: async (r) => {
            // guidance off and the nose pitched hard over, then the engine cut early (the sequencer off, Space), then
            // nothing more: the booster and the spacecraft come down together
            const rand = randOf(name);
            const t1 = 20 + rand() * 100;
            await r.open(1280, 800, f);
            await r.seek(t1);
            await r.deck('guidance');
            await r.hold('KeyW', 1 + rand() * 2);
            await r.views(`${name} pitched at T+${t1.toFixed(0)}`);
            await r.runTo(t1 + 5 + rand() * 10, 2);
            await r.deck('sequence');
            await r.deck('next');
            await r.runTo((await r.now()) + 2, 1);
            await r.views(`${name} cut`);
            // (the live vehicle is a rigid body that tumbles as it falls; the path a point mass on the stack's drag, nose first)
            await r.outcome(
              `${name} cut, then down`,
              () => r.runTo(4000, 300),
              (way) => 2000 + 0.02 * way,
            );
          },
        });
      else
        tasks.push({
          name,
          weight: 12,
          run: async (r) => {
            // the ascent taken over (G), pitched by hand, a stage's engines cut early or late (the sequencer off, Space at
            // the step), and the stack let fall with nothing lit: the path is the stack's fall from the cut
            const rand = randOf(name);
            const t1 = 30 + rand() * (n === 0 ? 80 : 400);
            await r.open(1280, 800, f);
            await r.seek(t1);
            await r.deck('guidance');
            await r.hold('KeyW', 1 + rand());
            await r.views(`${name} pitched at T+${t1.toFixed(0)}`);
            await r.deck('sequence');
            // (Space walks the steps: the next is a stage's cut or its drop; each is taken until nothing is lit)
            // (every step there is, if need be: a step may light a stage as well as cut one, Block E's ignition among them, and
            // stopping after a fixed count could leave one burning, which the path, the flight with nothing more done, is not)
            const lit = () =>
              r.page.evaluate(() => {
                const c = window.sr.cockpit;
                return c.vehicle && c.state && !c.state.broke ? c.vehicle.thrust(c.state) > 0 : false;
              });
            for (let k = 0; k < 16 && (await lit()); k++) {
              await r.deck('next');
              await r.runTo((await r.now()) + 1 + rand() * 4, 1);
            }
            if (await lit()) r.fail(name, 'an engine is still lit after every step: the hands cannot let go');
            await r.views(`${name} cut`);
            // (cut fast enough to stay up, it is held to where the path has it once round, as an orbital burn's is)
            if (!(await r.stood())?.broke?.ended && (await r.predicted())?.outcome === 'orbit')
              await r.around(`${name} cut, then round`, (way) => 2000 + 0.02 * way);
            else
              await r.outcome(
                `${name} cut, then down`,
                () => r.runTo(4000, 300),
                (way) => 2000 + 0.02 * way,
              );
          },
        });
    }
    if (f.ballistic) continue;
    // in orbit: the hands freed (G), and the braking engine fired along the long axis as it lies (forward, along the
    // motion, as the record's ship lay before its burn), or turned half round first (back); then down to the height the
    // pilot leaves at, against the path's end
    for (const turnFor of [0, 70]) {
      const name = `${key} burn ${turnFor ? 'back' : 'forward'}`;
      tasks.push({
        name,
        weight: 10,
        run: async (r) => {
          const rand = randOf(name);
          const t1 = 900 + rand() * 2500;
          await r.open(1280, 800, f);
          await r.seek(t1);
          await r.deck('guidance');
          if (turnFor) await r.hold('KeyD', turnFor);
          await r.deck('next');
          await r.runTo((await r.now()) + 60, 2);
          await r.views(`${name} at T+${t1.toFixed(0)}`);
          const p = await r.predicted();
          if (p?.outcome === 'impact')
            await r.outcome(
              `${name}, then down`,
              async () => {
                await r.page.evaluate(() => window.sr.clock.seek(window.sr.path.prediction.impact.t));
                await r.runTo((await r.now()) + 0.1, 1);
              },
              // (the deck's run is flyOrbit's, the path the propagator's, on the same forces: tests/staged.test.mjs holds the two
              // to a millisecond and a metre at the ejection height; the rest is the clock's last tick and the seek's)
              (way) => 2000 + 0.001 * way,
            );
          else if (p?.outcome === 'orbit')
            // (it stays up: no end to hold the path to, so it is held to where the flight is once round, or as far as the path goes)
            await r.around(`${name}, then round`, (way) => 2000 + 0.001 * way);
          else r.fail(name, `no path after the burn (${p?.outcome ?? 'no prediction'})`);
        },
      });
    }
  }
}

// --jobs pages at once, the heaviest first; each page's lines printed together when it is done.
const began = Date.now();
const runs = [];
const queue = [...tasks].sort((a, b) => b.weight - a.weight);
await Promise.all(
  Array.from({ length: Math.min(jobs, queue.length) }, async () => {
    for (let task = queue.shift(); task; task = queue.shift()) {
      const r = new Run(task.name);
      runs.push(r);
      const t0 = Date.now();
      try {
        await task.run(r);
      } catch (e) {
        r.fail(task.name, `the run stopped: ${e?.stack ?? e}`);
      }
      await r.done().catch(() => {});
      console.log(`${task.name} (${((Date.now() - t0) / 1000).toFixed(0)} s)\n${r.lines.join('\n')}`);
    }
  }),
);
await browser.close();
const failed = runs.reduce((n, r) => n + r.failed, 0);
const cases = runs.reduce((n, r) => n + r.cases, 0);
const hands = runs.flatMap((r) => r.hands);
if (hands.length)
  console.log(
    `\nprediction against outcome: ${hands.map((h) => `${h.where.split(',')[0]} ${(h.miss / 1000).toFixed(2)} km/${(h.way / 1000).toFixed(0)} km`).join('; ')}`,
  );
const time = `${((Date.now() - began) / 60000).toFixed(1)} min on ${jobs} pages`;
console.log(failed ? `\n${failed} failure(s) in ${cases} views (${time})` : `\nall ${cases} views pass (${time})`);
process.exit(failed ? 1 : 0);
