import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import { CSM_MATING_HEIGHT } from '../missions/usa/apollo/vehicles/saturn-ib-plan.ts';
import { nlerp, turn } from '../src/sim/rigid.ts';
import { between, either, orbitalRecord } from '../src/sim/run.ts';
import { Sheds } from '../src/sim/shed.ts';
import { Ascent } from '../src/viewer/ascent.ts';
import { useEphemeris } from '../src/world/ephemeris.ts';
import { add, dot, scale, siteFrame, sub } from '../src/world/frames.ts';

const DE440 = new Uint8Array(readFileSync(new URL('../public/ephemeris/de440.bin', import.meta.url))).slice().buffer;

for (const file of globSync('missions/*/*/flights/*/flight.ts', { cwd: new URL('../', import.meta.url) })) {
  const { flight } = await import(`../${file}`);
  if (flight.plan?.kind !== 'orbital') continue;
  test(`${flight.designation}: released axial sections open a gap at their drawn mating planes`, () => {
    // (a flight flown out to the Moon by JPL's ephemeris, as the page flies it)
    useEphemeris(flight.plan.gravity?.sphere ? DE440 : null);
    const run = orbitalRecord(flight);
    const ascent = Ascent.of(flight);
    const up = new Vector3(0, 1, 0);
    const model = flight.models.find((m) => m.id === flight.flies.model);
    const pad = new Quaternion().setFromAxisAngle(up, model.rotationY ?? 0);
    // (a Gemini target's Atlas lets go of what it carried at `target-separation`: target-plan.ts)
    const carrier = flight.plan.craft[0].joints.some((j) => j.id === 'target-separation');
    const ids = carrier
      ? ['booster-latch', 'target-separation']
      : flight.id.includes('/soyuz/')
        ? ['stage:1', 'escape-tower', 'modules', 'orbital-module']
        : flight.id.startsWith('ussr/')
          ? ['stage:1', 'modules']
          : flight.id.includes('/gemini/')
            ? ['staging-nuts', 'equipment-section-release', 'retro-section-release']
            : // (a Saturn IB's: saturn-ib-flies.ts; its S-IVB too, where it is not flown on as the target, plan.ts `target`)
              flight.plan.craft[0].joints.some((j) => j.id === 'sib-separation')
              ? [
                  'sib-separation',
                  'les-jettison',
                  ...(flight.plan.target?.joint === 'spacecraft-separation' ? [] : ['spacecraft-separation']),
                  'cm-sm-separation',
                  'forward-shield-jettison',
                ]
              : // (a Saturn V's stages, its aft interstage and its tower: saturn-v-plan.ts; and one flown on to the sea, the
                // S-IVB the spacecraft leaves, the service module and the forward heat shield: apollo-lunar-plan.ts)
                flight.plan.craft[0].joints.some((j) => j.id === 'sii-separation')
                ? [
                    'sic-separation',
                    'sii-skirt',
                    'les-jettison',
                    'sii-separation',
                    ...(flight.plan.craft[0].joints.some((j) => j.id === 'spacecraft-separation')
                      ? ['spacecraft-separation', 'cm-sm-separation', 'forward-shield-jettison']
                      : []),
                  ]
                : ['booster-latch', 'retropack-straps'];
    for (const on of ids) {
      const body = run.sheds.get(on);
      const index = flight.flies.drops.findIndex((d) => d.on === on);
      assert.ok(body && index >= 0, `${on} has both a physics body and a rendered drop`);
      const { forward, from, to } = body.shedder.def;
      const height = (forward ? from : to).value - (flight.flies.datum ?? 0);
      let previous = -Infinity;
      for (const dt of [0, 0.05, 0.25, 0.5, 1, 2]) {
        const t = body.from + dt;
        const [p, r] = [new Vector3(), new Vector3()];
        const [q, s] = [new Quaternion(), new Quaternion()];
        assert.ok(ascent.place(t, pad, p, q) && ascent.shed(index, t, pad, r, s));
        const direction = up.clone().applyQuaternion(q);
        p.addScaledVector(direction, height);
        r.addScaledVector(up.clone().applyQuaternion(s), height);
        const gap = p.sub(r).dot(direction) * (forward ? -1 : 1);
        assert.ok(gap >= -1e-6 && (dt >= 1 ? gap > 0 : gap > previous), `${on}, +${dt} s: ${gap} m, previously ${previous}`);
        previous = gap;
      }
    }
  });
  const carried = flight.flies.drops.findIndex((drop) => drop.under);
  if (carried >= 0) {
    test(`${flight.designation}: the spent drogue carries its housing off at the main's deployment`, () => {
      const run = orbitalRecord(flight);
      const ascent = Ascent.of(flight);
      const chute = flight.flies.chutes.findIndex((c) => c.on === flight.flies.drops[carried].under);
      const { body, on } = flight.flies.chutes[chute];
      const t = run.descent.gone[body][on];
      assert.equal(ascent.drops[carried].at, t);
      const pad = new Quaternion();
      assert.equal(ascent.shed(carried, t - 0.01, pad, new Vector3(), new Quaternion()), false);
      assert.ok(ascent.shed(carried, t + 1, pad, new Vector3(), new Quaternion()));
      assert.ok(ascent.chute(chute, t + 1, pad)?.seen > 0);
    });
  }
  if (flight.id.startsWith('usa/mercury/')) {
    test(`${flight.designation}: tower foot recedes from the canister and the released retropack has its own flight`, () => {
      const run = orbitalRecord(flight);
      const tower = run.sheds.get('tower-clamp');
      const { t, centre } = tower.shedder.release;
      const foot = tower.shedder.def.from.value;
      let previous = 0;
      for (const dt of [0.1, 0.5, 1, 2]) {
        const at = t + dt;
        const a = run.at(at);
        const free = tower.at(at);
        const bottom = add(free.r, turn(free.q, [foot - centre, 0, 0]));
        const seat = add(between(run.samples, at).r, scale(a.axis, foot));
        const gap = dot(sub(bottom, seat), a.axis);
        assert.ok(gap > previous, `tower foot at +${dt} s: ${gap} m`);
        previous = gap;
      }
      const pack = run.sheds.get('retropack-straps');
      const i = flight.flies.drops.findIndex((d) => d.on === 'retropack-straps');
      assert.equal(pack.from, run.dropped[i]);
      assert.equal(pack.at(pack.from - 0.01), null);
      assert.ok(pack.at(pack.from + 1));
      assert.ok(pack.shedder.def.push.value > 0, 'the coil spring drives the pack off once the straps part');
    });
  }
  if (flight.plan.craft[0].bodies.some((b) => b.id === 'aft-section')) {
    test(`${flight.designation}: the aft skirt releases three sectors around the engine`, () => {
      const run = orbitalRecord(flight);
      const pieces = ['1', '2', '3'].map((id) => run.sheds.get(`aft-section/${id}`));
      const t = pieces[0].from;
      assert.ok(pieces.every((p) => p.from === t));
      assert.ok(
        Math.abs(
          pieces.reduce((sum, p) => sum + p.shedder.release.mass, 0) -
            flight.plan.craft[0].bodies.find((b) => b.id === 'aft-section').mass.value,
        ) < 1e-6,
      );
      for (const [i, piece] of pieces.entries()) {
        const other = pieces[(i + 1) % pieces.length];
        const span = (dt) => Math.hypot(...sub(piece.at(t + dt).r, other.at(t + dt).r));
        assert.ok(span(1) > span(0.1), `sectors ${i + 1} and ${((i + 1) % 3) + 1} move apart`);
      }
    });
  }
  if (flight.id.startsWith('ussr/')) {
    test(`${flight.designation}: the two fairing shells leave on opposite sides`, () => {
      const run = orbitalRecord(flight);
      const [left, right] = ['Left', 'Right'].map((side) => {
        const on = `fairing/${side}`;
        const drop = flight.flies.drops.find((d) => d.on === on);
        assert.deepEqual(drop.nodes, [`Fairing_${side}`]);
        return run.sheds.get(on);
      });
      const t = left.from;
      assert.equal(t, right.from);
      const out = turn(left.shedder.release.q, [0, 0, 1]);
      const apart = (dt) => dot(sub(left.at(t + dt).r, right.at(t + dt).r), out);
      const scene = new Sheds(flight.plan, siteFrame(flight.site), flight.site.seaLevel.value, { frame: run.frame });
      for (const body of run.sheds.all) scene.add(body.shedder.release);
      const centre = flight.flies.datum + flight.plan.record.centre.value;
      const pose = (at) => {
        const [a, b, k] = either(run.samples, at);
        return { ...between(run.samples, at), t: at, q: nlerp(a.attitude, b.attitude, k), w: [0, 0, 0], mass: a.mass, station: 0 };
      };
      for (const shell of [left, right]) {
        let before = pose(t);
        for (let i = 1; i <= 200; i++) {
          const after = pose(t + i * 0.02);
          assert.deepEqual(
            scene.meet(before, after, centre, shell.shedder.def.on).hits,
            [],
            `${shell.shedder.def.name} passes clear at T+${after.t}`,
          );
          before = after;
        }
      }
      const atRelease = apart(0);
      assert.ok(atRelease > 0);
      assert.ok(apart(0.5) > atRelease);
      assert.ok(apart(2) > apart(0.5));
      assert.equal(
        left.shedder.release.mass + right.shedder.release.mass,
        flight.plan.craft[0].bodies.find((b) => b.id === 'fairing').mass.value,
      );
    });
  }
  if (flight.id === 'usa/apollo/apollo-11') {
    test(`${flight.designation}: the tower let go on the record's sequence is struck by nothing; without its jettison motor the stack, still under thrust, runs into it`, () => {
      /** What strikes the tower in the two seconds after it is let go, flight `f`'s record flown. */
      const strikes = (f) => {
        const run = orbitalRecord(f);
        const tower = run.sheds.get('les-jettison');
        const scene = new Sheds(f.plan, siteFrame(f.site), f.site.seaLevel.value, { frame: run.frame });
        for (const body of run.sheds.all) scene.add(body.shedder.release);
        const centre = (f.flies.datum ?? 0) + f.plan.record.centre.value;
        const pose = (at) => {
          const [a, b, k] = either(run.samples, at);
          return { ...between(run.samples, at), t: at, q: nlerp(a.attitude, b.attitude, k), w: [0, 0, 0], mass: a.mass, station: 0 };
        };
        const hits = [];
        let before = pose(tower.from);
        for (let i = 1; i <= 100; i++) {
          const after = pose(tower.from + i * 0.02);
          hits.push(...scene.meet(before, after, centre, 'les-jettison').hits);
          before = after;
        }
        return hits;
      };
      assert.deepEqual(strikes(flight), [], 'nothing strikes it on the record');
      const plan = structuredClone(flight.plan);
      const shed = plan.craft[0].sheds.find((s) => s.on === 'les-jettison');
      assert.ok(shed.motors?.length, 'the tower has its jettison motor');
      delete shed.motors;
      const bare = strikes({ ...flight, plan });
      assert.ok(bare.length > 0, 'without it the stack strikes the tower');
      console.log(`# without its motor: ${bare[0].name} struck at ${bare[0].speed.toFixed(2)} m/s`);
    });
  }
  test(`${flight.designation}: the last stage clears the outgoing spacecraft for the first minute`, () => {
    // (a Saturn V flown to its injection and no further: the stack coasts on whole and nothing parts from it)
    if (flight.plan.record?.bound) return;
    const run = orbitalRecord(flight);
    const at = run.samples.find((s) => !s.riding);
    const target = flight.flies.target;
    // (a stage flown on as the target its burns are made on, with a track of its own: Apollo 7's S-IVB)
    if (target?.drop) {
      assert.ok(target, 'the released S-IVB has a rendezvous track');
      const ascent = Ascent.of(flight);
      const index = flight.flies.drops.findIndex((drop) => drop.on === target.drop);
      assert.ok(index >= 0, 'rendezvous stage has a rendered drop');
      const t = run.dropped[index];
      assert.equal(t, at?.t, 'the spacecraft coasts independently only after separating from the upper stage');
      const p = new Vector3(),
        r = new Vector3(),
        up = new Vector3(0, 1, 0);
      const q = new Quaternion(),
        s = new Quaternion(),
        pad = new Quaternion();
      const height = CSM_MATING_HEIGHT - (flight.flies.datum ?? 0);
      const gapAt = (when) => {
        assert.ok(ascent.place(when, pad, p, q) && ascent.shed(index, when, pad, r, s));
        const direction = up.clone().applyQuaternion(q);
        p.addScaledVector(direction, height);
        r.addScaledVector(up.clone().applyQuaternion(s), height);
        return p.sub(r).dot(direction);
      };
      assert.ok(Math.abs(gapAt(t)) < 1e-6, 'the adapter rim starts at the spacecraft mating plane');
      let previous = 0;
      for (let step = 1; step <= 240; step++) {
        const elapsed = step / 4;
        const clearance = gapAt(t + elapsed);
        assert.ok(clearance > (elapsed <= 2 ? previous : 0), `+${elapsed} s: gap ${clearance} m, previously ${previous}`);
        previous = clearance;
      }
      return;
    }
    // (a Gemini target's Agena rides its own engine on after the Atlas has gone: the Atlas is the last stage it leaves)
    const shed =
      run.sheds.all.find(
        (s) => s.from === at?.t && (s.shedder.def.push || flight.plan.craft[0].joints.find((j) => j.id === s.shedder.def.on)?.push),
      ) ?? run.sheds.get('target-separation');
    assert.ok(shed, 'last stage with a separation speed');
    // (GATV-5004 was let go falling back into the air, the Atlas tumbling: its broadside drag, estimated, slows the Agena more
    // than the Atlas's, and the two are not on one axis: what the record has of them is not enough to hold a gap to)
    if (flight.plan.planned && !flight.plan.craft[0].engines.some((e) => e.id === 'agena-engine')) return;
    const { t, q, centre } = shed.shedder.release;
    const axis = turn(q, [1, 0, 0]);
    const top = shed.shedder.def.to.value;
    let previous = -Infinity;
    for (let step = 0; step <= 240; step++) {
      const when = t + step / 4;
      const stage = shed.at(when);
      const rim = add(stage.r, turn(stage.q, [top - centre, 0, 0]));
      const joint = add(between(run.samples, when).r, scale(axis, top));
      const clearance = dot(sub(joint, rim), axis);
      assert.ok(clearance >= -1e-6 && clearance > previous, `T+${when}: gap ${clearance} m, previously ${previous}`);
      previous = clearance;
    }
  });
}
