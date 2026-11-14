// A cabin's instruments as nodes of a model (src/viewer/cabin.ts): what a needle is put to the first time it is read.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { burnNow, Cabin, historyAt } from '../src/viewer/cabin.ts';

/** A cabin of the nodes given, with no flight to read: every instrument shows its own fixed `value`. */
function cabin(nodes, instruments) {
  const group = new THREE.Group();
  const full = new THREE.Group();
  group.add(full);
  for (const node of nodes) full.add(node);
  let redrawn = 0;
  const host = {
    camera: new THREE.PerspectiveCamera(),
    upAt: (_p, out) => out.set(0, 1, 0),
    redraw: () => redrawn++,
    reshade: () => {},
  };
  const flight = { site: { zone: { utcOffset: -5 }, bearingX: { value: 0 } } };
  const model = { cabin: { instruments, within: [] } };
  return { cabin: new Cabin(host, flight, model, group, full, []), redrawn: () => redrawn };
}

const node = (name, userData) => Object.assign(new THREE.Object3D(), { name, userData });
const turned = (n) => 2 * Math.acos(Math.min(1, Math.abs(n.quaternion.w)));

test('a needle is put on its first reading, with the clock stopped and nothing to ease from', () => {
  const dial = node('Dial', { turn: [0, 0, 10, 1], rest: 0 });
  const slider = node('Slider', { slide: [0, 0, 10, 0.1], rest: 0 });
  const wheel = node('Wheel', { drum: 10, place: 0 });
  const atRest = node('AtRest', { turn: [0, 0, 10, 1], rest: 5 });
  const c = cabin(
    [dial, slider, wheel, atRest],
    [
      { node: 'Dial', name: 'Dial', about: '', value: 5 },
      { node: 'Slider', name: 'Slider', about: '', value: 5 },
      { node: 'Wheel', name: 'Wheel', about: '', value: 3 },
      { node: 'AtRest', name: 'At rest', about: '', value: 5 },
    ],
  );
  c.cabin.step(0, 0, 2437424.5, 1);
  assert.ok(Math.abs(turned(dial) - 0.5) < 1e-6, `the dial is turned ${turned(dial)} rad, and its reading is at 0.5`);
  assert.ok(Math.abs(slider.position.x - 0.05) < 1e-9, `the slider is at ${slider.position.x} m, and its reading is at 0.05`);
  assert.ok(Math.abs(turned(wheel) - 0.6 * Math.PI) < 1e-6, `the wheel is turned ${turned(wheel)} rad, and its 3 is at 0.6 pi`);
  assert.ok(turned(atRest) < 1e-9, 'a needle built on its reading is left there');
  assert.ok(c.redrawn() > 0, 'and the frame is drawn again');
  // nothing has changed since: nothing more is asked for
  const before = c.redrawn();
  c.cabin.step(1 / 60, 0, 2437424.5, 1);
  assert.equal(c.redrawn(), before);
});

/** A cabin with two lamps, their tubes, a switch of the positions given, and one wall the build has shaded. */
function lit(ways, throws) {
  const group = new THREE.Group();
  const full = new THREE.Group();
  group.add(full);
  const lever = node('Ctl_Lights', { throw: throws });
  const tubes = ['Lamp_A', 'Lamp_B'].map((name) =>
    Object.assign(
      new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 0.6 })),
      { name },
    ),
  );
  const shade = new THREE.BufferGeometry();
  shade.setAttribute('color', new THREE.BufferAttribute(new Float32Array(12), 4));
  const wall = new THREE.Mesh(shade, new THREE.MeshStandardMaterial({ name: 'paint', vertexColors: true }));
  const plain = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ name: 'plain' }));
  full.add(lever, ...tubes, wall, plain);
  const lamps = [new THREE.PointLight(0xffffff, 0.7), new THREE.PointLight(0xffffff, 0.5)];
  const host = { camera: new THREE.PerspectiveCamera(), upAt: (_p, out) => out.set(0, 1, 0), redraw: () => {}, reshade: () => {} };
  const flight = { site: { zone: { utcOffset: -5 }, bearingX: { value: 0 } } };
  const lighting = { control: 'Ctl_Lights', name: 'Cabin lights', about: 'A switch.', ways, fittings: ['Lamp_A', 'Lamp_B'] };
  const cabin = new Cabin(host, flight, { cabin: { instruments: [], within: [], lighting } }, group, full, lamps);
  return { cabin, lever, tubes, wall, plain, lamps };
}

test('the cabin lights go by their switch: thrown, the lamps it names are lit, their tubes glow and the lever goes over', () => {
  const c = lit(
    [
      { says: 'On', lit: [0, 1] },
      { says: 'Off', lit: [] },
    ],
    [0, -1.19],
  );
  c.cabin.step(0, 0, 2437424.5, 1);
  assert.deepEqual(
    c.lamps.map((l) => l.intensity),
    [0.7, 0.5],
    'as built, each lamp at the strength the flight gives it',
  );
  assert.deepEqual(c.cabin.lighting, { way: 0, says: 'On', name: 'Cabin lights', built: true });
  assert.equal(c.cabin.light(), 'Off');
  // (with no time passing, as under a frozen stage, it is there at once: nothing eases from the wall's clock)
  c.cabin.step(0, 0, 2437424.5, 1);
  assert.deepEqual(
    c.lamps.map((l) => l.intensity),
    [0, 0],
  );
  assert.ok(Math.abs(turned(c.lever) - 1.19) < 1e-6, `the lever is turned ${turned(c.lever)} rad`);
  for (const tube of c.tubes) assert.equal(tube.material.emissiveIntensity, 0, 'a tube that is out does not glow');
  // and over a few frames it comes on, not in one
  assert.equal(c.cabin.light(), 'On');
  c.cabin.step(1 / 60, 0, 2437424.5, 1);
  assert.ok(c.lamps[0].intensity > 0 && c.lamps[0].intensity < 0.7, `one frame on: ${c.lamps[0].intensity}`);
  for (let i = 0; i < 60; i++) c.cabin.step(1 / 60, 0, 2437424.5, 1);
  assert.equal(c.lamps[0].intensity, 0.7);
  assert.equal(c.tubes[0].material.emissiveIntensity, 0.6);
  assert.ok(turned(c.lever) < 1e-9);
});

test('a switch of three positions lights one lamp in the middle one, and comes round to the first', () => {
  const c = lit(
    [
      { says: 'Both', lit: [0, 1] },
      { says: 'L.H. only', lit: [0] },
      { says: 'Off', lit: [] },
    ],
    [0, -0.6, -1.2],
  );
  assert.equal(c.cabin.light(), 'L.H. only');
  c.cabin.step(0, 0, 2437424.5, 1);
  assert.deepEqual(
    c.lamps.map((l) => l.intensity),
    [0.7, 0],
  );
  assert.deepEqual(
    c.tubes.map((t) => t.material.emissiveIntensity),
    [0.6, 0],
  );
  assert.equal(c.cabin.light(), 'Off');
  assert.equal(c.cabin.light(), 'Both');
  assert.equal(c.cabin.light(2), 'Off', 'or to a position asked for');
});

test('what the build shaded reads its shade by the lights: lamps on in red, lamps off in alpha; nothing else is touched', () => {
  const c = lit(
    [
      { says: 'On', lit: [0, 1] },
      { says: 'Off', lit: [] },
    ],
    [0, -1.19],
  );
  assert.match(c.wall.material.customProgramCacheKey(), /cabin-shade/);
  assert.doesNotMatch(c.plain.material.customProgramCacheKey(), /cabin-shade/);
  const shader = {
    uniforms: {},
    vertexShader: '',
    fragmentShader: '#include <common>\nvoid main() {\n#include <color_fragment>\n}',
  };
  c.wall.material.onBeforeCompile(shader, null);
  assert.match(shader.fragmentShader, /mix\( vColor\.a, vColor\.r, uCabinLit \)/);
  assert.doesNotMatch(shader.fragmentShader, /#include <color_fragment>/);
  assert.equal(shader.uniforms.uCabinLit.value, 1);
  c.cabin.light();
  c.cabin.step(0, 0, 2437424.5, 1);
  assert.equal(shader.uniforms.uCabinLit.value, 0, 'the one figure every shaded surface reads');
  // (indoors, and darker still for metal with the lamps out: it mirrors a sky the cabin cannot see)
  assert.ok(c.wall.material.aoMap, 'what is shaded as indoors is indoors');
});

test('a gauge read off the record: straight between readings, each at its instant or after its event, held beyond; an event not come is never', () => {
  const h = [
    { at: 100, value: 10 },
    { at: 0, from: 'burn', value: 10 },
    { at: 40, from: 'burn', value: 0 },
  ];
  assert.equal(historyAt(h, { burn: 200 }, 0), 10);
  assert.equal(historyAt(h, { burn: 200 }, 220), 5);
  assert.equal(historyAt(h, { burn: 200 }, 300), 0);
  assert.equal(historyAt(h, { burn: Infinity }, 300), 10, 'a burn given up: it stays where it was');
  assert.equal(historyAt(h, {}, 300), 10);
});

/** A cabin flown on a deck that tells it its news (orbitdeck.ts): two lamps on the record's events, a switch the deck's state throws, and a globe. */
function deckCabin() {
  const group = new THREE.Group();
  const full = new THREE.Group();
  group.add(full);
  const lamp = (name) =>
    Object.assign(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ emissive: 0x000000 })), { name });
  const [burn, dark] = [lamp('Tele_Burn'), lamp('Tele_Dark')];
  const lever = node('Ctl_Manual', { throw: [0, -0.8] });
  const globe = Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshStandardMaterial()), { name: 'Globe' });
  full.add(burn, dark, lever, globe);
  const host = { camera: new THREE.PerspectiveCamera(), upAt: (_p, out) => out.set(0, 1, 0), redraw: () => {}, reshade: () => {} };
  const flight = { site: { zone: { utcOffset: 3 }, bearingX: { value: 0 } } };
  const model = {
    cabin: {
      instruments: [],
      within: [],
      lamps: [
        { node: 'Tele_Burn', name: 'Burn', about: '', shows: 'event:retro-on', until: 'retro-off' },
        { node: 'Tele_Dark', name: 'Unknown', about: '' },
      ],
      controls: [{ node: 'Ctl_Manual', name: 'Manual', about: '', does: 'manual', holds: 'free' }],
      globe: { node: 'Globe', name: 'Globe', about: '' },
    },
  };
  const cabin = new Cabin(host, flight, model, group, full, []);
  cabin.piloted(true);
  return { cabin, burn, dark, lever, globe };
}
const glow = (mesh) => (mesh.userData.real ?? mesh.material).emissiveIntensity;

test('on a deck that flies no vehicle: a lamp lights between its events, one that shows nothing stays dark, a switch stands as the deck’s state', () => {
  const c = deckCabin();
  const times = { 'retro-on': 100, 'retro-off': 140 };
  const at = (t, holds) => {
    c.cabin.fly({ t, r: [6.7e6, 0, 0], v: [0, 7.7e3, 0] }, null, { times, holds: new Set(holds) });
    c.cabin.step(1, t, 2437402, 1);
  };
  at(50, []);
  assert.equal(glow(c.burn), 0, 'dark before the burn');
  assert.ok(turned(c.lever) < 1e-9, 'the switch as built while the hands are locked');
  at(120, ['free']);
  assert.ok(glow(c.burn) > 0, 'lit through the burn');
  assert.equal(glow(c.dark), 0, 'a lamp whose meaning is not known stays dark');
  for (let i = 0; i < 20; i++) c.cabin.step(0.05, 120, 2437402, 1);
  assert.ok(Math.abs(turned(c.lever) - 0.8) < 1e-3, `thrown with the hands free: ${turned(c.lever)}`);
  at(150, ['free']);
  assert.equal(glow(c.burn), 0, 'out when the burn is over');
});

test('the globe turns the point under the spacecraft under its cross, the way it goes up the board', () => {
  const c = deckCabin();
  // over 30 N 60 E at liftoff, going north-east over the ground
  const [la, lo] = [(30 * Math.PI) / 180, (60 * Math.PI) / 180];
  const place = (lon) => [Math.cos(la) * Math.cos(lon), Math.cos(la) * Math.sin(lon), Math.sin(la)];
  const up = place(lo);
  const east = [-Math.sin(lo), Math.cos(lo), 0];
  const north = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
  const R = 6.7e6;
  const spin = 7.292115e-5;
  const ground = east.map((e, i) => (e + north[i]) * 5000);
  // (in the frame that does not turn: the motion over the ground plus the Earth's own turning there)
  const v = [ground[0] - spin * R * up[1], ground[1] + spin * R * up[0], ground[2]];
  // the globe's own axes: +Y north, +Z Greenwich; a direction in them as the node is turned
  const seen = (d) => new THREE.Vector3(d[1], d[2], d[0]).applyQuaternion(c.globe.quaternion);
  c.cabin.fly({ t: 0, r: up.map((x) => x * R), v }, null, {});
  c.cabin.step(1, 0, 2437402, 1);
  const under = seen(up);
  assert.ok(under.distanceTo(new THREE.Vector3(0, 0, 1)) < 1e-6, `under the cross: ${under.toArray()}`);
  const ahead = seen(ground.map((x) => x / Math.hypot(...ground)));
  assert.ok(ahead.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-6, `the way it goes is up the board: ${ahead.toArray()}`);
  // the same point of space an hour on is over ground 15 degrees further west: that is what stands under the cross
  c.cabin.fly({ t: 3600, r: up.map((x) => x * R), v }, null, {});
  c.cabin.step(1, 3600, 2437402, 1);
  const there = seen(place(lo - spin * 3600));
  assert.ok(
    there.distanceTo(new THREE.Vector3(0, 0, 1)) < 1e-6,
    `an hour on, the ground the Earth has turned under it: ${there.toArray()}`,
  );
});

test('a thrown control steps through its positions on a click, holds there, and its lever goes over as a switch’s does', () => {
  const group = new THREE.Group();
  const full = new THREE.Group();
  group.add(full);
  const tumbler = node('Ctl_Tumbler', { throw: [0, 0.4, 0.8] });
  const ring = node('Ctl_Ring', { pull: 0.01 });
  ring.position.set(1, 0, 0);
  full.add(tumbler, ring);
  const host = { camera: new THREE.PerspectiveCamera(), upAt: (_p, out) => out.set(0, 1, 0), redraw: () => {}, reshade: () => {} };
  const flight = { site: { zone: { utcOffset: 3 }, bearingX: { value: 0 } } };
  const controls = [
    { node: 'Ctl_Tumbler', name: 'Tumbler', about: 'Three ways.', says: ['Up', 'Middle', 'Down'] },
    { node: 'Ctl_Ring', name: 'Ring', about: 'Pulled.' },
  ];
  const cabin = new Cabin(host, flight, { cabin: { instruments: [], within: [], controls } }, group, full, []);
  const thing = cabin.thingAt(new THREE.Vector3());
  assert.equal(thing?.label, 'Tumbler');
  assert.equal(thing.thrown, 0, 'the tumbler is a switch');
  assert.equal(cabin.thingAt(new THREE.Vector3(1, 0, 0))?.thrown, undefined, 'the ring is not');
  assert.deepEqual(cabin.throwSwitch(thing.thrown), { name: 'Tumbler', at: 1, says: 'Middle' });
  for (let i = 0; i < 30; i++) cabin.step(0.02, 0, 2437402, 1);
  assert.ok(Math.abs(turned(tumbler) - 0.4) < 1e-3, `over to the middle: ${turned(tumbler)}`);
  assert.equal(cabin.throwSwitch(0).says, 'Down');
  assert.equal(cabin.throwSwitch(0).says, 'Up', 'and round to the first');
  assert.equal(cabin.throwSwitch(0, 2).says, 'Down', 'or to a position asked for');
  assert.deepEqual(cabin.switched, [], 'a switch that switches nothing of the cabin’s is not in the seat’s bar');
});

test('a way of the lights can light a lamp in another colour and dimmer: its tube glows so, and the shade and the fill follow', () => {
  const c = lit(
    [
      { says: 'White', lit: [0, 1] },
      { says: 'Red', lit: [0, 1].map((light) => ({ light, colour: 0xff0000, level: 0.5 })) },
      { says: 'Duty', lit: [{ light: 0, level: 0.25 }] },
    ],
    [0, -0.6, -1.2],
  );
  const shader = {
    uniforms: {},
    vertexShader: '',
    fragmentShader: '#include <common>\n#include <color_fragment>\n#include <aomap_fragment>',
  };
  c.wall.material.onBeforeCompile(shader, null);
  assert.match(shader.fragmentShader, /indirectDiffuse \*= uCabinTint/);
  c.cabin.step(0, 0, 2437424.5, 1);
  assert.deepEqual(shader.uniforms.uCabinTint.value.toArray(), [1, 1, 1], 'lit as built, nothing is tinted');
  assert.equal(c.cabin.light(), 'Red');
  c.cabin.step(0, 0, 2437424.5, 1);
  assert.deepEqual(
    c.lamps.map((l) => l.intensity),
    [0.35, 0.25],
    'each at half its strength',
  );
  assert.deepEqual(
    c.lamps.map((l) => l.color.getHex()),
    [0xff0000, 0xff0000],
  );
  for (const tube of c.tubes) {
    assert.equal(tube.material.emissive.getHex(), 0xff0000, 'the tube glows red');
    assert.ok(Math.abs(tube.material.emissiveIntensity - 0.3) < 1e-9, 'and as brightly as its lamp is lit');
  }
  assert.equal(shader.uniforms.uCabinLit.value, 0.5, 'the shade mixed by the share of the lamps’ strength that is lit');
  const tint = shader.uniforms.uCabinTint.value;
  assert.ok(tint.r === 1 && tint.g > 0.4 && tint.g < 0.6 && tint.b === tint.g, `the fill taken halfway to red: ${tint.toArray()}`);
  assert.equal(c.cabin.light(), 'Duty');
  c.cabin.step(0, 0, 2437424.5, 1);
  assert.deepEqual(
    c.lamps.map((l) => l.intensity),
    [0.7 * 0.25, 0],
  );
  assert.deepEqual(
    c.lamps.map((l) => l.color.getHex()),
    [0xffffff, 0xffffff],
    'back to its own colour',
  );
  assert.ok(Math.abs(shader.uniforms.uCabinLit.value - (0.7 * 0.25) / 1.2) < 1e-9);
  assert.deepEqual(shader.uniforms.uCabinTint.value.toArray(), [1, 1, 1]);
  assert.deepEqual(c.cabin.switched, [{ index: 0, name: 'Cabin lights', at: 2, says: 'Duty', built: true }]);
});

/** A cabin with a globe of two modes on a tumbler, a lamp lit in the second, and a landing place given by the host. */
function modal(finder) {
  const group = new THREE.Group();
  const full = new THREE.Group();
  group.add(full);
  const tumbler = node('Ctl_Mode', { throw: [0, 0.84] });
  const globe = Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshStandardMaterial()), { name: 'Globe' });
  globe.position.set(1, 0, 0);
  const lamp = Object.assign(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ emissive: 0x000000 })), {
    name: 'Tele_Landing',
  });
  lamp.position.set(0, 1, 0);
  full.add(tumbler, globe, lamp);
  const asked = [];
  const host = {
    camera: new THREE.PerspectiveCamera(),
    upAt: (_p, out) => out.set(0, 1, 0),
    redraw: () => {},
    reshade: () => {},
    landing: (start) => {
      asked.push(start.t);
      return finder(start);
    },
  };
  const flight = { site: { zone: { utcOffset: 3 }, bearingX: { value: 0 } } };
  const model = {
    cabin: {
      instruments: [],
      within: [],
      lamps: [{ node: 'Tele_Landing', name: 'Landing', about: '' }],
      controls: [{ node: 'Ctl_Mode', name: 'Globe mode', about: '' }],
      globe: {
        node: 'Globe',
        name: 'Globe',
        about: '',
        control: 'Ctl_Mode',
        modes: [
          { says: 'Present place', shows: 'place' },
          { says: 'Landing place', shows: 'landing', lamp: 'Tele_Landing' },
        ],
      },
    },
  };
  const cabin = new Cabin(host, flight, model, group, full, []);
  cabin.piloted(true);
  return { cabin, globe, lamp, asked };
}

test('a globe of modes: thrown, it turns to where a descent begun now comes down, carried round with the ship between workings', () => {
  const R = 6.7e6;
  const w = 7700 / R;
  // an equatorial orbit; the descent begun at any instant comes down a quarter of the way round, 1500 s on
  const at = (t) => ({ t, r: [R * Math.cos(w * t), R * Math.sin(w * t), 0], v: [-7700 * Math.sin(w * t), 7700 * Math.cos(w * t), 0] });
  const c = modal((s) => {
    const a = Math.atan2(s.r[1], s.r[0]) + Math.PI / 2;
    return { t: s.t + 1500, r: [R * Math.cos(a), R * Math.sin(a), 0], v: [-7700 * Math.sin(a), 7700 * Math.cos(a), 0] };
  });
  const seen = (d) => new THREE.Vector3(d[1], d[2], d[0]).applyQuaternion(c.globe.quaternion);
  const spin = 7.292115e-5;
  /** The direction of an inertial place at `t`, in the Earth's own axes then. */
  const fixed = (r, t) => {
    const a = -spin * t;
    const n = Math.hypot(...r);
    return [(Math.cos(a) * r[0] - Math.sin(a) * r[1]) / n, (Math.sin(a) * r[0] + Math.cos(a) * r[1]) / n, r[2] / n];
  };
  const fly = (t) => {
    c.cabin.fly(at(t), null, {});
    c.cabin.step(1, t, 2437402, 1);
  };
  const under = (d) => seen(d).distanceTo(new THREE.Vector3(0, 0, 1));
  fly(100);
  assert.ok(under(fixed(at(100).r, 100)) < 1e-6, 'as built: the place under it');
  assert.equal(glow(c.lamp), 0);
  assert.deepEqual(c.cabin.globeMode, { mode: 0, says: 'Present place', shows: 'place' });
  const thing = c.cabin.thingAt(new THREE.Vector3());
  assert.equal(c.cabin.throwSwitch(thing.thrown).says, 'Landing place');
  fly(100);
  const landing = (t) => {
    const a = w * t + Math.PI / 2;
    return fixed([Math.cos(a), Math.sin(a), 0], t + 1500);
  };
  assert.ok(under(landing(100)) < 1e-6, 'thrown: where it would come down');
  assert.ok(glow(c.lamp) > 0, 'and its lamp is lit');
  // ten seconds on, not worked out again: the last answer carried round the arc flown since, and on in time
  fly(110);
  assert.deepEqual(c.asked, [100]);
  assert.ok(under(landing(110)) < 1e-6, `carried round: ${under(landing(110))}`);
  assert.deepEqual(
    c.cabin.switched.map((s) => s.says),
    ['Landing place'],
  );
  // and back to the present place
  c.cabin.throwSwitch(thing.thrown);
  fly(120);
  assert.ok(under(fixed(at(120).r, 120)) < 1e-6);
  assert.equal(glow(c.lamp), 0);
});

test('the simulator’s answer for a burn now: a Vostok fired against its way comes down, and one coming down already is let come', async () => {
  const { flight } = await import('../missions/ussr/vostok/flights/vostok-1/flight.ts');
  const { orbitalRecord } = await import('../src/viewer/ascent.ts');
  const { sampleAt } = await import('../src/sim/fly.ts');
  const find = burnNow(flight);
  const samples = orbitalRecord(flight).samples;
  const s = sampleAt(samples, 4000);
  const down = find({ t: s.t, r: s.r, v: s.v });
  assert.ok(down && !down.begun, 'in orbit: a burn is added');
  assert.ok(down.t > 4000 + 600 && down.t < 4000 + 3600, `it comes down some minutes on: ${down.t - 4000} s`);
  assert.ok(Math.hypot(...down.r) < Math.hypot(...s.r) - 150e3, 'far below where it was');
  // after the record's own burn, the descent under way
  const late = sampleAt(samples, flight.orbital.retro.off.value + 60);
  const begun = find({ t: late.t, r: late.r, v: late.v });
  assert.ok(begun?.begun, 'coming down: the descent under way, nothing added');
  assert.equal(burnNow({ ...flight, orbital: undefined }), null, 'no orbit, no answer');
});
