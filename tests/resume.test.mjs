// A run flown by hand, kept and taken up again (src/deck/tape.ts, src/app/runs.ts): what is written is what was done and
// when, and the run is flown again from it. Held here, on the simulators themselves: a run written at an instant and read
// back is flown again by the replay (in steps of up to five seconds, not the frames it was flown in) to the same state to
// the last bit, and flown on from there with the same hands it stays the same as one never left. A ballistic flight and
// one into orbit, each at several instants (powered, coasting, after a staging, the retrorockets or the braking burn, the
// entry), the throttle moved on the way (an `l` entry, as the deck writes its lever). And: what is written keeps every double; a stale stamp or a run of another version is not flown; a store that
// throws keeps nothing and breaks nothing. (The decks themselves are flown so in a browser: tools/deck-test.mjs.)
//
// "The same" is on this machine: exact doubles may differ between machines (simulator.md, "A refactor moves no figure
// unexplained"), so nothing here is a figure pinned across platforms; a kept run is only ever flown again where it was flown.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flights } from '../missions/index.ts';
import { flight as freedom7 } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { leftWhen, runs, MOST as STORE_MOST, useStore } from '../src/app/runs.ts';
import { hash, pack, readTape, replay, SAVE, stampOf, unpack } from '../src/deck/tape.ts';
import { autopilot, blend } from '../src/sim/autopilot.ts';
import { hasLeft } from '../src/sim/craft.ts';
import { ballisticOf } from '../src/sim/fly.ts';
import { coastOf } from '../src/sim/orbital.ts';
import { aboutAxis, multiply, normalize, turn } from '../src/sim/rigid.ts';
import { orbitalFlown } from '../src/sim/run.ts';
import { byHand, flyOn, givenUp, sequenceOf } from '../src/sim/staged.ts';
import { stagedPilot, stagedVehicle } from '../src/sim/stagedlive.ts';
import { TICK, vehicle } from '../src/sim/vehicle.ts';
import { Clock } from '../src/world/clock.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { DEG, scale, siteFrame, unit } from '../src/world/frames.ts';

const vostok1 = flights.find((f) => f.id === 'ussr/vostok/vostok-1');
/** The most a frame may fly, as the decks have it (deck.ts `MOST`), and the steer rate of a trimmed programme. */
const MOST = 5;
const TRIM = 3 * DEG;
const TRIM_MOST = 30 * DEG;

/**
 * The frames a visitor's page gives, s each: uneven, as a browser's are, and at times run fast (the clock's rate). The same
 * list makes a run and its continuation, so the two can be compared frame for frame.
 */
function frames(n, seed = 1) {
  let x = seed;
  const out = [];
  for (let i = 0; i < n; i++) {
    x = (x * 16807) % 2147483647;
    out.push(1 / 60 + ((x % 1000) / 1000) * (1 / 40));
  }
  return out;
}

/**
 * Something a deck flies, stripped of its page: a clock it follows (every change, as a deck's listener does), the hands
 * (keys held, as a deck's `held`), and its commands. Each kind below is the deck's own arithmetic for its simulator: the
 * ticks a frame flies (no more than `MOST` of flight a frame), and the pilot each tick hears. What `drive` does to it is
 * written down as tape.ts has it, and `replay` flies the written run again on a new one.
 */
class Flier {
  constructor(launch) {
    this.clock = new Clock(launch);
    this.clock.listen(() => this.followed());
    this.held = new Set();
    this.now = 0;
    this.entries = [];
    this.reachT = 0;
  }
  followed() {
    const ticks = this.ticks;
    this.follow();
    if (this.ticks !== ticks) this.reachT = this.clock.t;
  }
  /** Do something to it, written down first: its kind, the clock's instant and ticks, the page's time, the clock running. */
  input(kind, payload) {
    this.entries.push([kind, this.clock.t, this.ticks, this.now, this.clock.running ? 1 : 0, ...payload]);
    this.play([kind, 0, 0, 0, 0, ...payload]);
  }
  play(e) {
    const [kind, , , , , ...p] = e;
    if (kind === 'h') {
      this.held = new Set(String(p[0]));
    } else if (kind === 'l') this.lever = Number(p[0]);
    else this.command(String(p[0]));
  }
  /** The run as written at this instant (tape.ts `Taped`), through its text. */
  written() {
    const t = {
      v: SAVE,
      setup: {},
      entries: this.entries,
      end: { t: this.reachT, ticks: this.ticks, print: this.print() },
      view: { t: this.clock.t, rate: this.clock.rate, running: this.clock.running },
    };
    return readTape(pack(t));
  }
}

/** Freedom 7 on the ballistic deck's arithmetic (deck/cockpit.ts `pilot`, `follow`, `next`): guidance leaned by the keys held. */
class Ballistic extends Flier {
  constructor(f) {
    super(f.launch);
    this.f = f;
    this.v = vehicle(f.plan, siteFrame(f.site), f.site.seaLevel.value, { frame: frameOf(f) });
    this.b = ballisticOf(f.plan);
    this.state = this.v.start();
    this.guidance = true;
    this.hand = {};
    this.trim = { pitch: 0, yaw: 0 };
    /** The throttle lever, as the deck's (deck.ts `lever`): null until a hand moves it. */
    this.lever = null;
  }
  get ticks() {
    return this.state.ticks;
  }
  print() {
    return pack([this.state, this.trim, this.hand, this.guidance, this.lever]);
  }
  pilot() {
    const auto = autopilot(this.v, {
      launch: false,
      sequence: true,
      pitch: this.guidance,
      yaw: this.guidance,
      roll: this.guidance,
      trim: () => this.trim,
    });
    const axis = (plus, minus) => Number(this.held.has(plus)) - Number(this.held.has(minus));
    return (s) => {
      const [pitch, yaw, roll] = [axis('w', 's'), axis('a', 'd'), axis('e', 'q')];
      const trimmed = this.guidance && !hasLeft(s.craft, this.b.booster.id);
      if (trimmed) {
        const lean = (now, by) => Math.max(-TRIM_MOST, Math.min(TRIM_MOST, now + by * TRIM * TICK));
        this.trim = { pitch: lean(this.trim.pitch, pitch), yaw: lean(this.trim.yaw, yaw) };
      }
      const own = (x) => (x !== 0 ? x : this.guidance ? undefined : 0);
      return blend(auto(s), {
        ...this.hand,
        ...(this.lever !== null && s.t < this.b.cutoff ? { throttle: this.lever } : {}),
        pitch: trimmed ? undefined : own(pitch),
        yaw: trimmed ? undefined : own(yaw),
        roll: own(roll),
        manual: { pitch: own(pitch) !== undefined, yaw: own(yaw) !== undefined, roll: own(roll) !== undefined },
        automatic: true,
      });
    };
  }
  tick(s, pilot) {
    const next = this.v.tick(s, pilot);
    if (next.ignited) delete this.hand.throttle;
    return next;
  }
  follow() {
    let s = this.state;
    const t = this.clock.t;
    if (t < 0) this.clock.seek(0);
    const ahead = t - s.t;
    if (ahead <= 0 || !s.ignited || s.landing) return;
    const pilot = this.pilot();
    const upTo = s.t + Math.min(ahead, MOST);
    while (s.t < upTo - TICK / 2 && !s.landing) {
      const was = s;
      s = this.tick(s, pilot);
      if (s.ticks === was.ticks) break;
    }
    this.state = s;
    if (ahead > MOST) this.clock.seek(s.t);
  }
  command(what) {
    if (what === 'ignite') {
      this.hand.throttle = 1;
      this.state = this.tick(this.state, this.pilot());
      this.clock.setRate(1);
      this.clock.play(true);
    } else if (what === 'guidance') this.guidance = !this.guidance;
    else if (what.startsWith('rate:')) this.clock.setRate(Number(what.slice(5)));
    else if (what.startsWith('lever:')) this.lever = Number(what.slice(6));
    else if (what.startsWith('event:')) this.hand.events = [...(this.hand.events ?? []), what.slice(6)];
  }
}

/** Vostok 1's ascent on the orbital deck's arithmetic (deck/orbitdeck.ts `liftoff`, `begin`, `fly`): its steps asked by hand, the law leaned by the keys. */
class Orbital extends Flier {
  constructor(f) {
    super(f.launch);
    this.f = f;
    this.site = siteFrame(f.site);
    this.frame = frameOf(f);
    this.sea = f.site.seaLevel.value;
    this.solved = orbitalFlown(f).ascent.solved;
    this.v = stagedVehicle(f.plan, this.site, this.frame, this.sea, this.solved);
    this.state = this.v.start();
    this.guidance = true;
    this.trim = { pitch: 0, yaw: 0 };
    this.asked = [];
    this.lever = null;
    this.options = { guidance: true, sequence: true };
    const push = () => {
      const axis = (plus, minus) => Number(this.held.has(plus)) - Number(this.held.has(minus));
      return { pitch: axis('w', 's'), yaw: axis('a', 'd'), roll: axis('e', 'q') };
    };
    const inner = stagedPilot(this.v, this.solved, this.site, this.frame, this.sea, {
      ...this.options,
      hands: () => (this.guidance ? { pitch: 0, yaw: 0, roll: push().roll } : push()),
      steps: () => this.asked.splice(0),
    });
    const options = this.options;
    this.pilot = (st) => {
      if (this.guidance) {
        const p = push();
        const lean = (now, by) => Math.max(-TRIM_MOST, Math.min(TRIM_MOST, now + by * TRIM * TICK));
        this.trim = { pitch: lean(this.trim.pitch, p.pitch), yaw: lean(this.trim.yaw, p.yaw) };
      }
      options.trim = this.trim;
      const c = inner(st);
      // (the lever on every stage, as the orbital deck gives it)
      return this.lever === null ? c : { ...c, lever: st.stages.map(() => this.lever) };
    };
  }
  get ticks() {
    return this.state.ticks;
  }
  print() {
    return pack([this.state, this.trim, this.asked, this.guidance, this.options.memo ?? null, this.lever]);
  }
  follow() {
    let s = this.state;
    const t = this.clock.t;
    const ahead = t - s.t;
    const begun = !s.held || this.v.burning(s, 0) || this.v.burning(s, 1) || this.asked.length > 0;
    if (ahead <= 0 || !begun || s.landed || s.parted) return;
    const upTo = s.t + Math.min(ahead, MOST);
    while (s.t < upTo - TICK / 2 && !s.landed && !s.parted && !s.broke) {
      const was = s;
      s = this.v.tick(s, this.pilot);
      if (s.parted || s.broke || s.ticks === was.ticks) break;
    }
    this.state = s;
    if (ahead > MOST) this.clock.seek(s.t);
  }
  command(what) {
    if (what === 'liftoff') {
      this.asked.push(...sequenceOf(this.f.plan).stages.flatMap((k, i) => (k.from <= 0 ? [{ kind: 'ignite', stage: i }] : [])));
      this.clock.setRate(1);
      this.clock.play(true);
    } else if (what === 'guidance') {
      this.guidance = !this.guidance;
      this.options.guidance = this.guidance;
    } else if (what.startsWith('rate:')) this.clock.setRate(Number(what.slice(5)));
    else if (what.startsWith('lever:')) this.lever = Number(what.slice(6));
  }
}

/**
 * Drive `a` by frames from the clock's instant to `until` (or `n` frames), doing each of `hands` (instant, kind, payload)
 * as its instant comes, between frames as a page does. `count` frames are taken from `list` from `from`.
 */
function drive(a, hands, until, list, from = 0, record = true) {
  let i = from;
  for (; i < list.length && a.clock.t < until; i++) {
    for (const h of hands) {
      if (h.done || h.at > a.clock.t) continue;
      h.done = true;
      if (record) a.input(h.kind, h.payload);
      else a.play([h.kind, 0, 0, 0, 0, ...h.payload]);
    }
    a.now += list[i] * 1000;
    a.clock.advance(list[i]);
  }
  return i;
}

/** Fly a written run again on `b` to its end, as the deck does a slice at a time: true if it came to the same state. */
function flyAgain(taped, b) {
  const it = replay(taped, b);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}

/** Keep `a` flying and `b` (taken up from `a`'s run) beside it, frame for frame with the same hands: they must stay one. */
function flyOnBoth(a, b, hands, list, from, frames) {
  b.clock.seek(a.clock.t);
  b.clock.setRate(a.clock.rate);
  b.clock.play(a.clock.running);
  const later = (h) => hands.map((x) => ({ ...x, done: x.done }));
  const ha = later(hands);
  const hb = later(hands);
  for (let k = 0; k < frames; k++) {
    drive(a, ha, Infinity, list.slice(from + k, from + k + 1), 0, false);
    drive(b, hb, Infinity, list.slice(from + k, from + k + 1), 0, false);
  }
}

test('a written run keeps every double, an infinity, NaN and minus zero as they were', () => {
  const x = [0.1 + 0.2, -0, Infinity, -Infinity, Number.NaN, 5e-324, Number.MAX_VALUE, 1 / 3, { a: [Infinity, -0], b: '~NaN-not' }];
  const back = unpack(pack(x));
  assert.equal(back.length, x.length);
  for (let i = 0; i < 8; i++) assert.ok(Object.is(back[i], x[i]), `${i}: ${back[i]} is ${x[i]}`);
  assert.ok(Object.is(back[8].a[0], Infinity) && Object.is(back[8].a[1], -0));
  assert.equal(back[8].b, '~NaN-not');
});

test('Freedom 7 flown by hand, written and flown again at each instant: the same state, and flown on beside the run never left, the same', () => {
  const f = freedom7;
  const list = frames(60 * 60 * 3, 7);
  // the hands: lit at once; W held a while and D, leaning the programme; the throttle down a while and back; the clock run
  // fast and back; guidance off on the spacecraft alone (so the keys are the jets), Q held; the retrorockets asked for early, by hand
  const b = ballisticOf(f.plan);
  const hands = () => [
    { at: 0, kind: 'c', payload: ['ignite'] },
    { at: 20, kind: 'h', payload: ['w'] },
    { at: 22.5, kind: 'h', payload: [''] },
    { at: 30, kind: 'l', payload: [0.8] },
    { at: 36, kind: 'l', payload: [1] },
    { at: 40, kind: 'h', payload: ['d'] },
    { at: 41, kind: 'h', payload: [''] },
    { at: 50, kind: 'c', payload: ['rate:8'] },
    { at: 130, kind: 'c', payload: ['rate:1'] },
    { at: 170, kind: 'c', payload: ['guidance'] },
    { at: 171, kind: 'h', payload: ['q'] },
    { at: 174, kind: 'h', payload: [''] },
    { at: 180, kind: 'c', payload: ['guidance'] },
    { at: 185, kind: 'c', payload: ['rate:16'] },
    { at: 280, kind: 'c', payload: [`event:${b.retro.id}`] },
    { at: 281, kind: 'c', payload: ['rate:4'] },
  ];
  // (each instant: what the run is doing there, read off the state, so the instants are what they are said to be)
  const at = [
    { t: 60, is: (s) => s.ignited && !s.cutoff, what: 'powered' },
    { t: 200, is: (s) => s.cutoff && hasLeft(s.craft, b.booster.id), what: 'coasting, the booster let go' },
    { t: 290, is: (s) => s.retroAt !== null && !s.landing, what: 'the retrorockets lit by hand' },
    { t: 470, is: (s) => s.enteredAt !== null && !s.landing, what: 'in the entry' },
  ];
  for (const instant of at) {
    const a = new Ballistic(f);
    const hs = hands();
    const n = drive(a, hs, instant.t, list);
    const s = a.state;
    assert.ok(
      instant.is(s),
      `at T+${instant.t} it is ${instant.what} (T+${s.t.toFixed(1)}, ${(s.r && a.v.sample(s).altitude / 1000).toFixed(1)} km, entered ${s.enteredAt}, retro ${s.retroAt}, down ${s.landing?.t})`,
    );
    const taped = a.written();
    assert.ok(taped, 'what is written reads back');
    const b2 = new Ballistic(f);
    assert.ok(flyAgain(taped, b2), `T+${instant.t}: flown again to the same ticks and state`);
    assert.equal(b2.print(), a.print());
    flyOnBoth(a, b2, hs, list, n, 600);
    assert.equal(b2.print(), a.print(), `T+${instant.t}: and ten seconds on, the same`);
    console.log(`# Freedom 7 at T+${instant.t} (${instant.what}): ${taped.entries.length} entries, ${pack(taped).length} characters`);
  }
});

test('Vostok 1 flown by hand up to its orbit, written and flown again at each instant: the same, and the same flown on', () => {
  const f = vostok1;
  const list = frames(60 * 60 * 4, 11);
  const hands = () => [
    { at: 0, kind: 'c', payload: ['liftoff'] },
    { at: 30, kind: 'h', payload: ['w'] },
    { at: 31.5, kind: 'h', payload: [''] },
    { at: 35, kind: 'l', payload: [0.85] },
    { at: 42, kind: 'l', payload: [1] },
    { at: 45, kind: 'c', payload: ['rate:8'] },
    { at: 140, kind: 'c', payload: ['rate:1'] },
    { at: 150, kind: 'h', payload: ['a'] },
    { at: 151, kind: 'h', payload: [''] },
    { at: 155, kind: 'c', payload: ['rate:16'] },
  ];
  const seq = sequenceOf(f.plan);
  const strap = seq.stages.findIndex((k) => k.sep < 200);
  const at = [
    { t: 60, is: (s, v) => v.burning(s, 0), what: 'powered, every stage of the first lit' },
    { t: 160, is: (s) => Number.isFinite(s.stages[strap].gone), what: 'the strap-ons let go' },
    { t: 400, is: (s, v) => !s.parted && v.burning(s, s.stages.length - 1), what: 'on the last stage' },
  ];
  for (const instant of at) {
    const a = new Orbital(f);
    const hs = hands();
    const n = drive(a, hs, instant.t, list);
    assert.ok(instant.is(a.state, a.v), `at T+${instant.t} it is ${instant.what}`);
    const taped = a.written();
    const b = new Orbital(f);
    assert.ok(flyAgain(taped, b), `T+${instant.t}: flown again to the same ticks and state`);
    assert.equal(b.print(), a.print());
    flyOnBoth(a, b, hs, list, n, 600);
    assert.equal(b.print(), a.print(), `T+${instant.t}: and ten seconds on, the same`);
    console.log(`# Vostok 1 at T+${instant.t} (${instant.what}): ${taped.entries.length} entries, ${pack(taped).length} characters`);
  }
});

/**
 * Vostok 1 alone in orbit with the hands free: the attitude turned by the keys frame by frame (orbitdeck.ts `turnTo`: each
 * frame's turn is the keys' rate times the time since the frame before, so the frames themselves are part of the run, and
 * the deck writes each down while it turns, its `framed`; the keys' change is written at the frame before, where the deck
 * last followed to), the braking engine fired by hand along it, and what follows flown from that (staged.ts `byHand`,
 * `flyOn`). Taken up from what was written, the attitude, the coast, the burn and the descent are the same to the last bit.
 */
test('Vostok 1 turned and its braking engine fired by hand: the attitude, the coast, the burn and the descent flown again the same', () => {
  const f = vostok1;
  const plan = f.plan;
  const site = siteFrame(f.site);
  const frame = frameOf(f);
  const sea = f.site.seaLevel.value;
  const record = orbitalFlown(f);
  const AXES = { w: [[0, 1, 0], 1], a: [[0, 0, 1], 1], e: [[1, 0, 0], 1] };
  const rate = plan.craft[0].thrusters.find((x) => x.mode === 'manual' && x.rate).rate.value * DEG;
  const burnAt = coastOf(plan).on;
  const free = burnAt - 300;
  // (the hand's turn from where it took the attitude; the burn along the motion's reverse, turned so)
  const start = [1, 0, 0, 0];
  const retro = scale(unit(record.coast.samples.find((s) => s.t >= burnAt).v), -1);
  /** The deck's `turnTo`: the hand's attitude turned on to `t` by the keys held. */
  const turnTo = (h, keys, t) => {
    const d = t - h.t;
    h.t = t;
    const push = (k) => Number(keys.includes(k));
    if (d <= 0 || !keys) return;
    for (const k of ['w', 'a', 'e']) h.q = normalize(multiply(h.q, aboutAxis(AXES[k][0], push(k) * rate * d)));
  };
  const held = (t) => (t < free + 0.4 ? '' : t < free + 3 ? 'w' : t < free + 4 ? 'wa' : t < free + 5 ? 'e' : '');
  // flown: frame by frame, the keys changing between frames; written as the deck writes them
  const h = { q: start, t: free };
  const entries = [];
  let keys = '';
  let last = free;
  for (const dt of frames(60 * 6, 3)) {
    const t = last + dt;
    const now = held(t);
    if (now !== keys) {
      entries.push(['h', last, now]);
      keys = now;
    }
    turnTo(h, keys, t);
    if (keys) entries.push(['f', t]);
    last = t;
  }
  assert.ok(entries.length > 100, 'it turned over hundreds of frames');
  // flown again: each entry reached (followed to, if the clock is not there) and then done
  const again = { q: start, t: free };
  let at = free;
  keys = '';
  for (const e of unpack(pack(entries))) {
    if (e[1] !== at) {
      turnTo(again, keys, e[1]);
      at = e[1];
    }
    if (e[0] === 'h') keys = e[2];
  }
  assert.equal(pack(again.q), pack(h.q), 'the attitude turned by hand: the same');
  // the braking engine fired by hand along it, and the rest of the flight flown from there
  const fly = (q) => flyOn(byHand(givenUp(plan), burnAt, turn(q, retro)), site, frame, sea, record.ascent, record.ascent.separation);
  const whole = fly(h.q);
  const taken = fly(again.q);
  const sample = (w, t) => w.coast.samples.find((s) => s.t >= t);
  for (const t of [burnAt - 10, burnAt + 20, whole.coast.samples.at(-1).t])
    assert.equal(pack(sample(taken, t)), pack(sample(whole, t)), `the run at T+${t.toFixed(0)}: the same`);
  assert.ok(whole.down, 'it came down');
  assert.equal(pack(taken.down), pack(whole.down), 'and the descent, to the landing: the same');
});

test('a run written by another version, or of another flight, or not a run at all, is not read', () => {
  const t = {
    v: SAVE,
    setup: {},
    entries: [['c', 0, 0, 0, 0, 'next']],
    end: { t: 0, ticks: 0, print: '' },
    view: { t: 0, rate: 1, running: false },
  };
  assert.ok(readTape(pack(t)));
  assert.equal(readTape(pack({ ...t, v: SAVE + 1 })), null);
  assert.equal(readTape('{"v":1'), null);
  assert.equal(readTape(pack({ ...t, entries: [['c', 'zero']] })), null);
});

test('the stamp: the same flight the same, a figure of its plan changed another (and the run then refused)', () => {
  const f = freedom7;
  assert.equal(stampOf(f), stampOf(f));
  const changed = structuredClone(f.plan);
  changed.craft[0].bodies[0].mass.value *= 1.0000001;
  assert.notEqual(stampOf({ ...f, plan: changed }), stampOf(f));
  assert.notEqual(stampOf(vostok1), stampOf(f));
  assert.equal(hash('abc'), hash('abc'));
  assert.notEqual(hash('abc'), hash('abd'));
});

test('a flight stamps where its pad stands, and only one with a tower escape hull how its pad is posed', () => {
  const apollo = flights.find((flight) => flight.id === 'usa/apollo/apollo-7');
  const editPad = (flight, edit) => ({
    ...flight,
    models: flight.models.map((model) => (model.id === 'pad' ? edit(model) : model)),
  });
  const move = (pad) => ({ ...pad, position: [0, -100, 0] });
  assert.notEqual(stampOf(editPad(apollo, move)), stampOf(apollo));
  // (every flight flown by hand can strike what stands at its site, sim/sitecontact.ts: moved, the pad is another site)
  assert.notEqual(stampOf(editPad(freedom7, move)), stampOf(freedom7));
  // but how its parts are posed is the baked solids' (their own stamp, made by the build), not the flight's data here
  const posed = (pad) => ({ ...pad, parts: pad.parts.map((part) => ({ ...part, explode: [9, 9, 9] })) });
  assert.equal(stampOf(editPad(freedom7, posed)), stampOf(freedom7));
  assert.notEqual(stampOf(editPad(apollo, posed)), stampOf(apollo));
  const editCopy = (pad) => ({
    ...pad,
    name: 'Revised launch pad name',
    parts: pad.parts.map((part) => ({ ...part, summary: 'Revised part description' })),
    sequence: pad.sequence?.map((keyframe) => ({ ...keyframe, event: 'Revised caption' })),
  });
  assert.equal(stampOf(editPad(apollo, editCopy)), stampOf(apollo));
});

test('a run flown again that does not come to the same ticks is refused', () => {
  const a = new Ballistic(freedom7);
  drive(a, [{ at: 0, kind: 'c', payload: ['ignite'] }], 5, frames(400, 5));
  const taped = a.written();
  const wrong = { ...taped, end: { ...taped.end, ticks: taped.end.ticks + 1 } };
  assert.equal(flyAgain(wrong, new Ballistic(freedom7)), false);
  const moved = { ...taped, entries: taped.entries.map((e, i) => (i === 0 ? [e[0], e[1], e[2] + 3, ...e.slice(3)] : e)) };
  assert.equal(flyAgain(moved, new Ballistic(freedom7)), false);
  assert.ok(flyAgain(taped, new Ballistic(freedom7)));
});

/** A store as the browser's, in memory; `full` makes every write past `room` characters throw, as a quota does. */
function memory(room = Infinity) {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      const used = [...m.entries()].filter(([key]) => key !== k).reduce((n, [, x]) => n + x.length, 0);
      if (used + v.length > room) throw new DOMException('full', 'QuotaExceededError');
      m.set(k, String(v));
    },
    removeItem: (k) => m.delete(k),
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    clear: () => m.clear(),
  };
}

test('runs are kept one a flight, listed for the front page, read back and let go', () => {
  const m = memory();
  useStore(() => m);
  assert.ok(runs.usable());
  const one = { flight: 'a/b/c', stamp: 's', t: 12.5, phase: 'Powered flight', left: 1000, run: 'x' };
  assert.ok(runs.write(one));
  assert.ok(runs.write({ ...one, flight: 'd/e/f', t: 99 }));
  assert.deepEqual(Object.keys(runs.list()).sort(), ['a/b/c', 'd/e/f'], 'a second flight’s run does not put out the first');
  assert.ok(runs.write({ ...one, t: 20 }));
  assert.equal(runs.read('a/b/c').t, 20, 'a flight’s run is kept in place of its last');
  assert.equal(runs.list()['a/b/c'].phase, 'Powered flight');
  runs.drop('a/b/c');
  assert.equal(runs.read('a/b/c'), null);
  assert.deepEqual(Object.keys(runs.list()), ['d/e/f']);
});

test('a store that throws, or is full, keeps nothing and breaks nothing: the write says so, and the way out asks', () => {
  const throws = () => {
    throw new DOMException('denied', 'SecurityError');
  };
  useStore(throws);
  assert.equal(runs.usable(), false);
  assert.equal(runs.write({ flight: 'a', stamp: 's', t: 1, phase: 'p', left: 0, run: 'x' }), false);
  assert.equal(runs.read('a'), null);
  assert.deepEqual(runs.list(), {});
  runs.drop('a');
  useStore(() => ({ getItem: throws, setItem: throws, removeItem: throws }));
  assert.equal(runs.usable(), false);
  assert.equal(runs.write({ flight: 'a', stamp: 's', t: 1, phase: 'p', left: 0, run: 'x' }), false);
  assert.deepEqual(runs.list(), {});
  // full: the run goes in, its listing does not, and then the run is taken out again: nothing half kept
  const full = memory(200);
  useStore(() => full);
  assert.ok(JSON.stringify({ flight: 'a', stamp: 's', t: 1, phase: 'p', left: 0, run: 'x'.repeat(125) }).length < 200);
  assert.equal(runs.write({ flight: 'a', stamp: 's', t: 1, phase: 'p', left: 0, run: 'x'.repeat(125) }), false);
  assert.equal(runs.read('a'), null);
  assert.deepEqual(runs.list(), {});
  const roomy = memory();
  useStore(() => roomy);
  assert.equal(runs.write({ flight: 'a', stamp: 's', t: 1, phase: 'p', left: 0, run: 'x'.repeat(STORE_MOST) }), false, 'too large');
});

test('when a run was left, in plain words', () => {
  const now = new Date(2026, 10, 17, 15, 0).getTime();
  assert.equal(leftWhen(now - 20_000, now), 'a moment ago');
  assert.equal(leftWhen(now - 60_000, now), '1 minute ago');
  assert.equal(leftWhen(now - 5 * 60_000, now), '5 minutes ago');
  assert.equal(leftWhen(new Date(2026, 10, 17, 9, 5).getTime(), now), 'today at 09:05');
  assert.equal(leftWhen(new Date(2026, 10, 16, 22, 30).getTime(), now), 'yesterday at 22:30');
  assert.equal(leftWhen(new Date(2026, 10, 12, 8, 0).getTime(), now), 'on 12 November at 08:00');
});
