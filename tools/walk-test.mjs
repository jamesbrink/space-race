// Walks a launch site on foot in the running page, with the real W key held, along ways a person could really have
// gone, and checks that each can be gone: every leg arrives, nobody falls, and the feet are where the ground or the
// floor is said to be (docs/agents/walking.md; AGENTS.md, "Being there": if something can be seen it can be gone to).
//   node tools/walk-test.mjs [url] [--flight <id>] [--only <regex of route names>] [--shots <dir>]      (default url: http://localhost:5180/)
// A route is a place to start and a list of legs. A leg goes to a point over the ground (`to`: metres east and south
// of the site's origin, the viewer's x and z), or works something on the way:
//   to      walk there (`run`: at a run); arrived within `within` metres (default 0.6)
//   y       where the feet must be on arrival, metres from the deck's level, to within `tol` (default 0.35)
//   climb   a ladder is in the way: keep walking into it until the feet are at this height (`down`: from its top)
//   lift    ride the lift this leg stands on to a stop of an action of a part: { model, part, action, stop }
//   falls   a drop of this many metres in one frame on the way is meant (a kerb, the last rung): default 0.45; and no leg
//           may be more than 0.7 s in the air, which is a fall whatever it lands on
// --shots writes a still from the walker's eyes at the end of every leg.
// The ways are a site's, and walked at any flight from it: each is walked at a reading of the place's slider (`slider`, the
// hardware where the way wants it), put on the clock by that flight's own morning (its model's `sequence`).
import { globSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const flight = opt(args, '--flight', 'ussr/vostok/vostok-1');
const only = opt(args, '--only', null);
const shots = opt(args, '--shots', null);
const url = urlOf(args);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { timeAt } = await import(pathToFileURL(join(root, 'src/world/sequence.ts')).href);
const flown = await (async () => {
  for (const file of globSync('missions/*/*/flights/*/flight.ts', { cwd: root })) {
    const { flight: f } = await import(pathToFileURL(join(root, file)).href);
    if (f.id === flight) return f;
  }
  return null;
})();
if (!flown) {
  console.error(`walk-test: no flight ${flight}`);
  process.exit(2);
}

/**
 * Readings of Site 1's pad slider (the layout every flight from it lays its morning out on: the bus stops at 0.03, the pilot
 * is in his seat at 0.1, the fillers are off the pad at 0.136, the erector is drawn off from 0.19): where the hardware is
 * for a way, whatever the flight. On Vostok 1's morning they are 06:55, 07:10 and 08:20.
 */
const SITE1 = {
  /** The bus has stopped and nobody has gone up yet: the concrete round its door. */
  arrived: 0.045,
  /** The pilot in his seat: the erector at the rocket, its lift at the landing, the trusses up. */
  seated: 0.1,
  /** The fillers have left the north and south tracks; the erector still stands. */
  fillersGone: 0.15,
};

/**
 * The ways walked, by site (SiteDef.name). Site 1 is in the site's own frame: x east, z south, y up from the deck
 * (places/tyuratam/site-1.md); where each thing stands is from the modules that build it (missions/ussr/places/tyuratam/site1/).
 */
const ROUTES = {
  'Tyuratam (Baikonur), Site 1': [
    {
      name: 'the pilot’s own way: from the bus’s door past the State Commission to the stair’s foot',
      slider: SITE1.arrived, // the bus has stopped; on Vostok 1's morning the send-off and the Commission stand on the concrete
      from: [-46.4, -0.12, 17.6],
      legs: [
        { to: [-38.6, 17.5], y: -0.12, tol: 0.2, note: 'east from the door to the Commission, ten metres off' },
        { to: [-33.6, 15.0], y: -0.12, tol: 0.2, note: 'round the knot, between it and the south track' },
        { to: [-26.8, 9.0], y: -0.03, tol: 0.2, note: 'over the tracks onto the abutment' },
        { to: [-20.0, 5.6], y: 0, note: 'onto the deck' },
        { to: [-16.6, 3.3], y: 0, note: 'to the foot of the fifteen steps' },
      ],
    },
    {
      name: 'the erector: fifteen steps, the lift, the upper platform at the hatch',
      slider: SITE1.seated,
      // (the stair and the lift are on the erector's south side: the film of the morning)
      from: [-19, 0, 3.25],
      legs: [
        { to: [-16.2, 3.25], y: 0 },
        { to: [-11.6, 3.25], y: 3.0, note: 'up the stair to the landing at the lift’s door' },
        { to: [-11.3, 2.1], y: 3.0, note: 'into the car, between its open doors' },
        { lift: { model: 'pad', part: 'Erector', action: 'lift', stop: 2 }, y: 26.12, note: 'the lift, to the upper platform' },
        { to: [-5.5, 3.25], y: 26.12, note: 'out of the car, south, onto the walk' },
        { to: [-3.9, 3.2], y: 26.12 },
        { to: [-3.6, -0.3], y: 26.12, note: 'across the boom’s face' },
        { to: [-2.0, -0.3], y: 26.12, note: 'out along the platform to the hatch' },
      ],
    },
    {
      name: 'round the deck: the abutment, the three sides over the pit, the rails',
      slider: SITE1.fillersGone,
      from: [-19.5, 0, 6.5],
      legs: [
        { to: [-17, 14], y: 0 },
        { to: [0, 14.5], y: 0, note: 'along the south side, inside the fence' },
        { to: [13.5, 12], y: 0 },
        { to: [14.5, 0], y: 0, note: 'between the opening and the east fence' },
        { to: [13.5, -12], y: 0 },
        { to: [0, -14.5], y: 0, note: 'along the north side, over its track' },
        { to: [-17, -13], y: 0 },
        { to: [-24, -4.5], y: 0, note: 'back over the abutment, north of the erector' },
      ],
    },
    {
      name: 'down the road into the pit, the sump, the pit base, a trench and out again',
      slider: SITE1.seated,
      from: [248, -5.7, 0],
      legs: [
        { to: [236, 0], run: true, tol: 0.8, y: -5.3, note: 'off the road round the pit’s point' },
        { to: [150, 0], run: true, y: -20.2, tol: 0.5, note: 'down the road' },
        { to: [64, 0], run: true, y: -35.6, tol: 0.5 },
        { to: [42, 8.34], y: -39.5, tol: 0.5, note: 'over the sump’s roof to its face, at the pit base’s south edge' },
        { to: [39.6, 8.34], y: -39.9, tol: 0.5 },
        { climb: -43.0, down: true, to: [38.2, 8.34], note: 'down the ladder on the sump’s face' },
        { to: [36, 4], y: -43.12, note: 'out onto the pit base' },
        { to: [23, 0], y: -43.12, note: 'to the foot of the launching structure' },
        { to: [36.9, -8.2], y: -43.12, note: 'to the head of the north trench’s ladder' },
        { climb: -47.6, down: true, to: [36.9, -10.2], note: 'down into the trench' },
        { to: [24, -12], y: -47.69, note: 'along the trench to its west end' },
        { to: [36.9, -10.4], y: -47.69 },
        { climb: -43.2, to: [36.9, -8.0], note: 'and up out of it' },
      ],
    },
    {
      name: 'the cut in the north rim: from the steppe down into the pit and back',
      slider: SITE1.seated,
      from: [0, -8, -124],
      legs: [
        { to: [0, -112], y: -8.12, tol: 0.4, note: 'into the cut’s head' },
        { to: [-1, -104], y: -8.3, tol: 0.4, note: 'along its shallow head to where the floor starts down' },
        { to: [-2.6, -92], tol: 3, note: 'down the cut' },
        { to: [-2, -74], tol: 6, note: 'out of its mouth onto the pit’s side' },
        { to: [-2.6, -92], tol: 3 },
        { to: [-1, -104], y: -8.3, tol: 0.4, note: 'and back up' },
        { to: [0, -124], y: -8.12, tol: 0.3, note: 'onto the steppe' },
      ],
    },
    {
      name: 'from the pad down the road’s ramp to the bunker and round the buildings',
      slider: SITE1.seated,
      from: [-30, 0, -20],
      legs: [
        { to: [-78, -20], run: true, y: -0.12, tol: 0.2, note: 'west along the apron, between the spurs' },
        { to: [-83.4, -40], run: true, y: -0.12, tol: 0.3, note: 'to the head of the road' },
        { to: [-82.6, -145], run: true, y: -7.9, tol: 0.5, note: 'down its ramp' },
        { to: [-60, -207.4], run: true, y: -8.12, tol: 0.2, note: 'to the storage bunker’s middle gate' },
        { to: [-55.5, -207.4], y: -8.12, tol: 0.25 },
        { to: [-82.5, -207.4], run: true, y: -8.12, tol: 0.2, note: 'back to the road' },
        { to: [-82.5, -249.4], run: true, y: -8.12, tol: 0.2 },
        { to: [-30, -250], run: true, y: -8.12, tol: 0.2, note: 'east along the road, north of the storage bunker' },
        { to: [-30, -224], run: true, y: -8.12, tol: 0.3 },
        { to: [-16, -222], y: -8.12, tol: 0.3, note: 'to the command bunker’s door' },
        { to: [-30, -250], run: true, y: -8.12, tol: 0.2 },
        { to: [-84, -249.4], run: true, y: -8.12, tol: 0.2 },
        { to: [-84, -230.3], run: true, y: -8.12, tol: 0.2 },
        { to: [-96, -230.3], y: -8.12, tol: 0.25, note: 'to the check-out shop’s gate' },
        { to: [-84, -230.3], run: true, y: -8.12, tol: 0.2 },
        { to: [-84, -112], run: true, y: -5.3, tol: 0.6, note: 'back down the road to the foot of its ramp' },
        { to: [-95, -76], run: true, y: -5.66, tol: 0.4, note: 'off the ramp’s side' },
        { to: [-105.4, -78.5], y: -8.12, tol: 0.25, note: 'to the support building’s door' },
        { to: [-47, -91.6], run: true, y: -8.12, tol: 0.25, note: 'over the road’s ramp to the work shop’s door' },
        { to: [-52, -60], run: true, y: -4.4, tol: 0.6 },
        { to: [-40.7, -53], y: -4.27, tol: 0.4, note: 'up to the pump house’s door, on its plot' },
        { to: [-52, -43], run: true, y: -0.2, tol: 0.4, note: 'up the fall to the propellant shed’s open side' },
      ],
    },
    {
      // (site1/south.py: what one photograph of July 1959 shows south of the tracks, inside the inner fence)
      name: 'south of the embankment: round the two buildings to the pump hut',
      slider: SITE1.seated,
      from: [-60, -0.12, 30],
      legs: [
        { to: [-150, 45], run: true, y: -0.12, tol: 0.3, note: 'south-west off the apron' },
        { to: [-170, 60.3], y: -0.12, tol: 0.3, note: 'to the north wall of the gable-roofed building' },
        { to: [-187, 66], y: -0.12, tol: 0.3, note: 'round its west end' },
        { to: [-187, 81], y: -0.12, tol: 0.3 },
        { to: [-161, 81], run: true, y: -0.12, tol: 0.3, note: 'between it and the store, clear of the store’s extensions' },
        { to: [-144.8, 96], y: -0.12, tol: 0.3, note: 'to the door in the store’s east end' },
        { to: [-117, 135.6], run: true, y: -0.12, tol: 0.3, note: 'to the pump hut’s door, the inner fence behind it' },
      ],
    },
    {
      name: 'outside the south fence: the vehicle shed, the building with a mast, the tents, the yard',
      slider: SITE1.seated,
      from: [-60, -0.12, 240],
      legs: [
        { to: [-92, 250.4], run: true, y: -0.12, tol: 0.3, note: 'to the shed’s doors, along its north side' },
        { to: [-116, 250.4], run: true, y: -0.12, tol: 0.3 },
        { to: [-116, 270], y: -0.12, tol: 0.3, note: 'round its west end' },
        { to: [-100, 277.6], y: -0.12, tol: 0.3, note: 'to the north wall of the building with a mast' },
        { to: [-80, 277.6], run: true, y: -0.12, tol: 0.3 },
        { to: [-80, 296], y: -0.12, tol: 0.3, note: 'round its east end, past the mast’s stays' },
        { to: [-91, 318], run: true, y: -0.12, tol: 0.3, note: 'to the first tent’s end' },
        { to: [-84, 362], run: true, y: -0.12, tol: 0.3, note: 'down the line of tents' },
        { to: [-120, 414], run: true, y: -0.12, tol: 0.3, note: 'to the gap in the yard’s fence' },
        { to: [-120, 427], y: -0.12, tol: 0.3, note: 'and in' },
      ],
    },
  ],
};

/** The instant a way is walked at on this flight: its reading of the slider on the flight's own morning. */
const atOf = (route) => {
  const sequence = flown.models.find((m) => m.id === (route.model ?? 'pad'))?.sequence;
  return sequence ? timeAt(sequence, route.slider) : 0;
};
const routes = (ROUTES[flown.site?.name] ?? []).filter((r) => !only || new RegExp(only).test(r.name));
if (!routes.length) {
  console.error(`walk-test: no routes for ${flight}'s site (${flown.site?.name ?? 'none'})${only ? ` matching ${only}` : ''}`);
  process.exit(2);
}
if (shots) mkdirSync(shots, { recursive: true });

const browser = await launch();
let failed = 0;
let legsGone = 0;
for (const [n, route] of routes.entries()) {
  // (the dev server's reloads are kept from the page under test)
  const { page, errors, context } = await open(browser, `${url}#${flight}/site/${route.model ?? 'pad'}`, { console: [], timeout: 90000 });
  await page.evaluate(() => Promise.allSettled(window.sr.stage.arriving ?? []));
  await page.addStyleTag({ content: '#ui, #gallery, #title { display: none !important }' });
  // the morning's hardware where the route wants it, then on foot there
  await page.evaluate(
    async ({ at, from }) => {
      const sr = window.sr;
      sr.stage.setAutoRotate(false);
      sr.clock.pause();
      sr.clock.seek(at);
      await new Promise((done) => setTimeout(done, 4000)); // (the hardware hurries to where the clock was put)
      const walker = sr.flight.models.find((m) => m.walker).id;
      sr.stage.enterWalk(walker, { x: from[0], y: from[1], z: from[2] });
      await new Promise((done) => setTimeout(done, 1500));
    },
    { at: atOf(route), from: route.from },
  );
  console.log(`${route.name} (T${atOf(route) < 0 ? '' : '+'}${Math.round(atOf(route))} s)`);
  let ok = true;
  for (const [k, leg] of route.legs.entries()) {
    if (leg.lift) {
      const got = await page.evaluate(async ({ model, part, action, stop }) => {
        const sr = window.sr;
        const def = sr.flight.models
          .find((m) => m.id === model)
          .parts.find((p) => p.node === part)
          .actions.find((a) => a.id === action);
        const body = sr.stage.walk.body;
        if (!sr.stage.onFoot.workings.riding(model, def.do.node, def)) return { error: 'not standing on the lift', y: body.position.y };
        sr.stage.onFoot.workAction(model, def.do.node, def, stop);
        const t0 = performance.now();
        let last = body.position.y;
        let still = 0;
        while (performance.now() - t0 < 180000 && still < 1.5) {
          await new Promise((done) => setTimeout(done, 250));
          still = Math.abs(body.position.y - last) < 1e-4 ? still + 0.25 : 0;
          last = body.position.y;
        }
        return { y: body.position.y, x: body.position.x, z: body.position.z, s: (performance.now() - t0) / 1000 };
      }, leg.lift);
      const bad =
        got.error ??
        (leg.y !== undefined && Math.abs(got.y - leg.y) > (leg.tol ?? 0.35) ? `the feet are at ${got.y.toFixed(2)} m, not ${leg.y}` : null);
      console.log(
        `  ${bad ? 'FAIL' : 'ok  '} ${String(k + 1).padStart(2)} ${leg.note ?? 'the lift'}: ${bad ?? `${got.s.toFixed(0)} s, feet at ${got.y.toFixed(2)} m`}`,
      );
      if (bad) ok = false;
    } else {
      await page.keyboard.down('w');
      if (leg.run) await page.keyboard.down('Shift');
      const got = await page.evaluate(
        async ({ to, within, climb, down, run }) => {
          const walk = window.sr.stage.walk;
          const body = walk.body;
          const start = body.position.clone();
          const far = Math.hypot(to[0] - start.x, to[1] - start.z);
          const limit = 8 + (far / (run ? 3 : 0.5)) * 1.5 + (climb !== undefined ? 60 : 0);
          const t0 = performance.now();
          let drop = 0;
          let air = 0;
          let lastY = body.position.y;
          let lastT = t0;
          let best = far;
          let since = t0;
          let onLadder = false;
          let low = body.position.y;
          let high = body.position.y;
          for (;;) {
            await new Promise((done) => requestAnimationFrame(done));
            const now = performance.now();
            const p = body.position;
            const dx = to[0] - p.x;
            const dz = to[1] - p.z;
            const d = Math.hypot(dx, dz);
            if (body.on) onLadder = true;
            // steer: forward is (-sin yaw, -cos yaw) over the ground; from a ladder's top, looking down it
            if (!body.on) walk.yaw = Math.atan2(-dx, -dz);
            walk.pitch = down && !body.on && d < 1.5 ? -0.9 : 0;
            if (!body.on && !body.grounded) air += (now - lastT) / 1000;
            if (!body.on) drop = Math.max(drop, lastY - p.y);
            lastY = p.y;
            lastT = now;
            low = Math.min(low, p.y);
            high = Math.max(high, p.y);
            if (d < best - 0.05 || body.on) {
              best = Math.min(best, d);
              since = now;
            }
            const there =
              climb === undefined ? d < within : !body.on && onLadder && Math.abs(p.y - climb) < 0.5 && d < Math.max(within, 1.2);
            if (there) return { ok: true, x: p.x, y: p.y, z: p.z, s: (now - t0) / 1000, drop, air, low, high, onLadder };
            if (now - since > 6000 || now - t0 > limit * 1000)
              return {
                ok: false,
                why: now - since > 6000 ? 'stopped' : 'too long',
                x: p.x,
                y: p.y,
                z: p.z,
                s: (now - t0) / 1000,
                drop,
                air,
                low,
                high,
                onLadder,
                d,
              };
          }
        },
        { to: leg.to, within: leg.within ?? 0.6, climb: leg.climb, down: !!leg.down, run: !!leg.run },
      );
      await page.keyboard.up('w');
      if (leg.run) await page.keyboard.up('Shift');
      await page.waitForTimeout(400);
      const feet = await page.evaluate(() => window.sr.stage.walk.body.position.y);
      const allowed = leg.falls ?? 0.45;
      const bad = !got.ok
        ? `${got.why} at ${got.x.toFixed(1)}, ${got.z.toFixed(1)} (feet ${got.y.toFixed(2)} m), ${got.d.toFixed(1)} m short`
        : got.drop > allowed
          ? `fell ${got.drop.toFixed(2)} m in one frame on the way`
          : got.air > 0.7
            ? `was ${got.air.toFixed(1)} s in the air on the way (down to ${got.low.toFixed(1)} m)`
            : leg.climb !== undefined && !got.onLadder
              ? 'never took hold of the ladder'
              : leg.y !== undefined && Math.abs(feet - leg.y) > (leg.tol ?? 0.35)
                ? `the feet are at ${feet.toFixed(2)} m, not ${leg.y}`
                : null;
      const where = leg.climb !== undefined ? `the ladder to ${leg.climb} m` : `to ${leg.to[0]}, ${leg.to[1]}`;
      console.log(
        `  ${bad ? 'FAIL' : 'ok  '} ${String(k + 1).padStart(2)} ${where}${leg.note ? ` (${leg.note})` : ''}: ${bad ?? `${got.s.toFixed(0)} s, feet at ${feet.toFixed(2)} m (${got.low.toFixed(1)} to ${got.high.toFixed(1)} on the way)`}`,
      );
      if (bad) ok = false;
    }
    if (shots) await page.screenshot({ path: join(shots, `walk-${n + 1}-${String(k + 1).padStart(2, '0')}.png`) });
    legsGone++;
    if (!ok) break; // (the rest of the way is from where this leg should have ended)
  }
  if (errors.length) {
    console.log(`  FAIL the page threw: ${errors[0]}`);
    ok = false;
  }
  if (!ok) failed++;
  await context.close();
}
await browser.close();
console.log(`walk-test: ${failed ? `${failed} of ${routes.length} routes FAILED` : `ok, ${routes.length} routes, ${legsGone} legs`}`);
process.exit(failed ? 1 : 0);
