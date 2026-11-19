// The Gemini targets lost on the way up fail as the record has them whoever flies them (missions/usa/gemini/vehicles/
// target-plan.ts; sim/stagedlive.ts `stagedPilot`): GATV-5002's engine shuts down 0.91 s after it is lit, by the
// sequence or by a hand at any instant (plan.ts `EngineDef.fails`), and GATV-5004's Atlas turns as the record has it from
// the loss of control until it was regained, with the guidance off and the hands on the stick (orbital.ts `Guidance.lost`).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as gatv5002 } from '../missions/usa/gemini/flights/gatv-5002/flight.ts';
import { flight as gatv5004 } from '../missions/usa/gemini/flights/gatv-5004/flight.ts';
import { guidanceOf, lawOf, stagesOf, steer } from '../src/sim/staged.ts';
import { stagedPilot, stagedVehicle } from '../src/sim/stagedlive.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { DEG, siteFrame } from '../src/world/frames.ts';
import { turn } from '../src/sim/rigid.ts';

/** A target flown by hand: no guidance, no sequencer, its steps given at the record's instants (`late` moves one). */
function byHand(flight, { until, late = {}, hands = () => ({ pitch: 0, yaw: 0, roll: 0 }), each = () => {} }) {
  const site = siteFrame(flight.site);
  const dated = frameOf(flight);
  const sea = flight.site.seaLevel.value;
  const x = steer(flight.plan, site, dated, sea);
  const v = stagedVehicle(flight.plan, site, dated, sea, x);
  const queue = v.sequence.map((k) => ({ ...k, at: late[k.event] ?? k.at, done: false }));
  const pilot = stagedPilot(v, x, site, dated, sea, { guidance: false, sequence: false, hands });
  let s = v.tick(v.start(), { pitch: 0, yaw: 0, roll: 0, steps: [0, 1, 2].map((stage) => ({ kind: 'ignite', stage })) });
  while (s.t < until && !s.broke && !s.landed) {
    const due = queue.filter((k) => !k.done && k.at <= s.t + 1e-9);
    for (const k of due) k.done = true;
    const c = pilot(s);
    const was = s;
    s = v.tick(s, { ...c, steps: [...(c.steps ?? []), ...due.map((k) => k.step)] });
    if (s.ticks === was.ticks) break;
    each(s, v, x, site, dated);
  }
  return { s, v };
}

test('GATV-5002: its engine lit by a hand twenty seconds late still shuts down 0.91 s after it lights', () => {
  const engine = stagesOf(gatv5002.plan).findIndex((st) => st.engine.id === 'agena-engine');
  assert.ok(engine >= 0);
  const fails = gatv5002.plan.craft[0].engines.find((e) => e.id === 'agena-engine').fails;
  assert.equal(fails.after.value, 0.91);
  assert.equal(fails.after.confidence, 'documented');
  const { s } = byHand(gatv5002, { until: 420, late: { 'agena-engine:ignite': 390 } });
  const st = s.stages[engine];
  assert.equal(st.from, 390, 'lit when the hand lit it');
  assert.ok(Math.abs(st.to - st.from - 0.91) < 0.06, `stopped ${(st.to - st.from).toFixed(2)} s after (one tick)`);
});

test('GATV-5004: out of control from 120.63 s to 150 s whatever the hands do', () => {
  const lost = guidanceOf(gatv5004.plan).lost;
  assert.equal(lost.at.value, 120.63);
  assert.equal(lost.until.value, 150);
  // the hands held hard over, either way, from just before control was lost: the stack still turns to the record's tilt
  for (const pitch of [1, -1]) {
    let now = 0;
    let at140 = null;
    byHand(gatv5004, {
      until: 141,
      hands: () => ({ pitch: now >= 120 ? pitch : 0, yaw: 0, roll: 0 }),
      each: (s, v, x, site, dated) => {
        now = s.t;
        if (at140 !== null || s.t < 140) return;
        const law = lawOf(gatv5004.plan, site, dated, x);
        const nose = turn(s.q, [1, 0, 0]);
        const along = (a) => nose[0] * a[0] + nose[1] * a[1] + nose[2] * a[2];
        at140 = (Math.atan2(along(law.down0), along(law.up0)) / DEG + 360) % 360;
      },
    });
    const want = 67 + ((298 - 67) * (140 - 120.63)) / (150 - 120.63);
    assert.ok(
      Math.abs(at140 - want) < 20,
      `hands at ${pitch}: ${at140?.toFixed(0)} degrees from the vertical at 140 s, the record's ${want.toFixed(0)}`,
    );
  }
});
