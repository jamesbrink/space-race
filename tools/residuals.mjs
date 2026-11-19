// What every flight into orbit misses its record by, as one table: when each stage stopped and the spacecraft parted, the
// orbit it was left on, where and when it came down, and how far its velocity steps at the parting (which is the joint's
// push and nothing else: docs/agents/simulator.md, "One state, changed only by what pushes it"). A record is what a run is
// compared with, never what it is put on, so these are the run's findings; src/sim/misses.ts holds each check's reason.
//
//   node tools/residuals.mjs [flight id part] [--json]
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { heightsBall, trackedState } from '../src/sim/orbital.ts';
import { clockAt } from '../src/sim/plan.ts';
import { flyWhole, sequenceOf, stagesOf } from '../src/sim/staged.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { angleBetween, cross, dot, geodeticToEcef, length, scale, siteFrame, sub, unit } from '../src/world/frames.ts';
import { meanOf, periodsOf } from '../src/world/meanelements.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith('--'));
const json = args.includes('--json');
const km = (m) => (m / 1000).toFixed(0);
const rows = [];
for (const file of globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).sort()) {
  if (only && !file.includes(only)) continue;
  const f = (await import(pathToFileURL(join(root, file)).href)).flight;
  const plan = f.plan;
  if (plan?.kind !== 'orbital' || !plan.attitude.some((a) => 'law' in a.hold) || !f.site) continue;
  const site = siteFrame(f.site);
  const frame = frameOf(f);
  const whole = flyWhole(plan, site, frame, f.site.seaLevel.value, undefined, 10);
  const seq = sequenceOf(plan);
  const o = plan.record.orbit;
  const radius = heightsBall(plan, site);
  // the stages' stops against the record's instants of them (its cut, or its letting go where it has no cut of its own)
  const stops = stagesOf(plan).map((s, i) => ({
    stage: s.body.label,
    flown: whole.ascent.stops[i],
    record: seq.stages[i].cutAt ?? seq.stages[i].sep,
  }));
  const parting = plan.events.find((e) => e.do.some((a) => 'separate' in a && a.separate === seq.stages.at(-1).joint));
  // the orbit the spacecraft is left on: the coast's first state read as mean elements, as the published one is read
  const first = whole.coast.samples[0];
  const m = meanOf({ r: frame.toDate(first.r), v: frame.toDate(first.v) });
  const periods = periodsOf(m.a, m.e, m.i, m.argp);
  const kind = o.kind?.is ?? 'nodal';
  const last = whole.ascent.samples.at(-1);
  const landing = plan.record.landing;
  const down = whole.down ? Object.values(whole.down.landed)[0] : null;
  const where = landing ? geodeticToEcef({ latitude: landing.latitude.value, longitude: landing.longitude.value, height: 0 }) : null;
  const fixes = (plan.record.coastFixes ?? []).flatMap((fix) => {
    const t = fix.at.value;
    const samples = t <= whole.ascent.separation.t ? whole.ascent.samples : whole.coast.samples;
    const i = samples.findIndex((s) => s.t >= t - 1e-6);
    if (i < 0 || Math.abs(samples[i].t - t) > 1e-6) return [];
    const want = trackedState(fix, frame);
    const d = sub(samples[i].r, want.r);
    const up = unit(want.r);
    const along = unit(sub(want.v, scale(up, dot(want.v, up))));
    return [{ t, up: dot(d, up), along: dot(d, along), across: dot(d, cross(up, along)), speed: length(sub(samples[i].v, want.v)) }];
  });
  rows.push({
    id: f.id,
    stops,
    parted: { flown: whole.ascent.separation.t, record: parting?.at?.value ?? clockAt(plan, parting) },
    step: length(sub(first.v, last.v)),
    orbit: {
      perigee: m.a * (1 - m.e) - radius,
      apogee: m.a * (1 + m.e) - radius,
      period: periods[kind === 'osculating' ? 'nodal' : kind],
      inclination: (m.i * 180) / Math.PI,
    },
    published: { perigee: o.perigee.value, apogee: o.apogee.value, period: o.period?.value ?? null, inclination: o.inclination.value },
    landing:
      down && where
        ? {
            at: down.at - landing.at.value,
            off: angleBetween(geodeticToEcef({ latitude: down.latitude, longitude: down.longitude, height: 0 }), where) * 6_371_000,
            along: whole.coast.results.alongTrack,
            across: whole.coast.results.crossTrack,
          }
        : null,
    ends: whole.coast.samples.at(-1).phase,
    fixes,
  });
}
if (json) console.log(JSON.stringify(rows));
else {
  console.log(
    '| Flight | Stages stop, s (record) | Parted, s | Step at parting, m/s | Orbit left on, km and min (published) | Inclination | Down: late, s; from the record’s place, km (along, across) |',
  );
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) {
    const orbit = `${km(r.orbit.perigee)} × ${km(r.orbit.apogee)}, ${(r.orbit.period / 60).toFixed(2)} (${km(r.published.perigee)} × ${km(r.published.apogee)}, ${r.published.period ? (r.published.period / 60).toFixed(2) : 'none'})`;
    const down = r.landing
      ? `${r.landing.at.toFixed(0)}; ${km(r.landing.off)} (${km(r.landing.along)}, ${km(r.landing.across)})`
      : `not down: ends ${r.ends}`;
    console.log(
      `| ${r.id} | ${r.stops.map((s) => `${s.flown.toFixed(1)} (${s.record.toFixed(1)})`).join(', ')} | ${r.parted.flown.toFixed(1)} (${r.parted.record.toFixed(1)}) | ${r.step.toFixed(2)} | ${orbit} | ${r.orbit.inclination.toFixed(2)} (${r.published.inclination.toFixed(2)}) | ${down} |`,
    );
    for (const x of r.fixes)
      console.log(
        `| &nbsp; tracking at ${x.t.toFixed(1)} s | | | | up ${(x.up / 1000).toFixed(1)}, along ${(x.along / 1000).toFixed(1)}, across ${(x.across / 1000).toFixed(1)} km | | ${x.speed.toFixed(1)} m/s |`,
      );
  }
}
