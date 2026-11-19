// A flight flown from its pad by the live simulator, as flown, through what stands at its site (sim/sitecontact.ts):
// shared by the test that every flight clears its site (sitecontact.test.mjs) and by whoever wants to look at one.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { autopilot } from '../src/sim/autopilot.ts';
import { SiteContact } from '../src/sim/sitecontact.ts';
import { SiteWorld, solidModels, solidUrl } from '../src/sim/siteworld.ts';
import { decodeSolids } from '../src/sim/solids.ts';
import { sequenceOf, steer } from '../src/sim/staged.ts';
import { stagedPilot, stagedVehicle } from '../src/sim/stagedlive.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { siteFrame } from '../src/world/frames.ts';

const root = join(import.meta.dirname, '..');
export const loadSolids = (url) => decodeSolids(readFileSync(join(root, 'public', url)));

/** A flight's site and its flown model's hull, from the baked files; `world` may be given instead (a site made for a test). */
export function siteOf(flight, world = SiteWorld.of(flight, loadSolids)) {
  const flown = solidModels(flight).find((m) => m.kind === 'vehicle');
  return { world, hull: loadSolids(solidUrl(flight, flown.def)) };
}

/**
 * Fly `flight` as flown from liftoff for `seconds`, each tick put to the site: every strike said, with how the state
 * stood when it was struck, and the pose it ended in (the simulator's state as the contact reads it). `world`: the site to fly through (default: its own). `nudge(state)`: a change made to each
 * tick's outcome before the site is asked (a test's drift), or nothing.
 */
export function flyThroughSite(flight, { seconds = 40, world, nudge } = {}) {
  const site = siteFrame(flight.site);
  const frame = frameOf(flight);
  const sea = flight.site.seaLevel.value;
  const { world: stands, hull } = siteOf(flight, world);
  const strikes = [];
  let ticks = 0;
  const gone = (released) => {
    const nodes = new Set(flight.flies.drops.filter((d) => released(d)).flatMap((d) => d.nodes));
    return (node) => nodes.has(node);
  };
  if (flight.plan.kind === 'orbital') {
    const x = steer(flight.plan, site, frame, sea);
    const v = stagedVehicle(flight.plan, site, frame, sea, x);
    const pilot = stagedPilot(v, x, site, frame, sea, { guidance: true, sequence: true, prescribed: true });
    const seq = sequenceOf(flight.plan);
    let s = v.start();
    const contact = new SiteContact(flight, stands, hull, site, frame, s.q);
    // (lit as the deck lights a flight flown as flown: every stage the record has burning at liftoff, deck/orbitdeck.ts)
    s = v.tick(s, { pitch: 0, yaw: 0, roll: 0, steps: seq.stages.flatMap((k, stage) => (k.from <= 0 ? [{ kind: 'ignite', stage }] : [])) });
    while (!s.parted && !s.landed && s.t < seconds) {
      const was = s;
      s = v.tick(s, pilot);
      if (s.ticks === was.ticks) break;
      if (s.held) continue;
      if (nudge) s = { ...s, ...nudge(s) };
      ticks++;
      const left = gone((d) => {
        const on = d.on?.split('/')[0];
        const stage = seq.stages.findIndex((k) => k.joint === on);
        return (s.drops[on] ?? (stage >= 0 ? s.stages[stage].gone : Infinity)) <= s.t;
      });
      const met = contact.meet({ ...was, station: 0, mass: v.mass(was) }, { ...s, station: 0, mass: v.mass(s) }, left);
      if (met.r !== s.r) s = { ...s, r: met.r, v: met.v, q: met.q, w: met.w };
      for (const hit of met.hits) strikes.push({ ...hit, height: v.sample(s, 0).altitude });
    }
    return { strikes, ticks, state: s, contact, pose: { ...s, station: 0, mass: v.mass(s) } };
  }
  const v = vehicle(flight.plan, site, sea, { frame });
  const pilot = autopilot(v);
  const centre = flight.plan.craft[0].rigid.capsule.centre.value;
  const pose = (s) => {
    const m = v.mass(s);
    const station = m.centre + (s.separation ? centre : 0);
    return { ...s, station, centre: station, mass: m.mass, inertia: [m.roll, m.across, m.across] };
  };
  let s = v.start();
  const contact = new SiteContact(flight, stands, hull, site, frame, s.q);
  while (!s.landing && s.t < seconds) {
    const was = s;
    s = v.tick(s, pilot);
    if (s.ticks === was.ticks) break;
    if (s.held) continue;
    if (nudge) s = { ...s, ...nudge(s) };
    ticks++;
    const let_go = new Set(s.released.map((r) => r.on));
    const met = contact.meet(
      pose(was),
      pose(s),
      gone((d) => let_go.has(d.on)),
    );
    if (met.r !== s.r) s = { ...s, r: met.r, v: met.v, q: met.q, w: met.w };
    for (const hit of met.hits) strikes.push({ ...hit, height: v.sample(s).altitude });
  }
  return { strikes, ticks, state: s, contact, pose: pose(s) };
}
