// A cabin's instruments as nodes of a model (src/viewer/cabin.ts): what a needle is put to the first time it is read.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { Cabin } from '../src/viewer/cabin.ts';

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
  assert.deepEqual(c.cabin.lighting, { way: 0, says: 'On', name: 'Cabin lights' });
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
