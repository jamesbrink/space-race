import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { flights } from '../missions/index.ts';
import { agenaMotors } from '../missions/usa/gemini/vehicles/gemini-targets.ts';
import {
  atSite,
  entrances,
  exhibit,
  formatAddress,
  galleryFlight,
  listed,
  openingFor,
  parseAddress,
  targetNodes,
} from '../src/app/address.ts';
import { entries } from '../src/app/lineup/row.ts';
import { lodUrl } from '../src/viewer/lod.ts';
import { materialsUnder } from './glb.mjs';

const late = [
  {
    n: 10,
    launch: '1966-07-18T22:20:26.648Z',
    target: 'GATV-5005',
    atlas: -6040.517,
    landing: 254799,
    weatherHour: '1966-07-18T22:00:00Z',
    surfaceWind: [10, 6.17],
    clouds: ['cumulus', undefined, 'cirrostratus'],
    payload: 'ManeuveringSupply',
    installed: ['TDA_DischargeFingers', 'TDA_MicrometeoriteCollector', 'TDA_IonWakeSensors'],
    absent: ['TDA_TetherCanister', 'TDA_EVAWorkStation', 'RR_IndexBarCap'],
  },
  {
    n: 11,
    launch: '1966-09-12T14:42:26.546Z',
    target: 'GATV-5006',
    atlas: -5844.821,
    landing: 256628,
    weatherHour: '1966-09-12T15:00:00Z',
    surfaceWind: [200, 1.54],
    clouds: ['cumulus', 'altocumulus', 'cirrus'],
    payload: 'ApolloSumpExperiment',
    installed: ['Sump_TransparentTank', 'Sump_CameraBracket', 'TDA_IonWakeSensors', 'TDA_TetherCanister', 'TDA_TetherClamp'],
    absent: ['TDA_DischargeFingers', 'TDA_EVAWorkStation', 'RR_IndexBarCap'],
  },
  {
    n: 12,
    launch: '1966-11-11T20:46:33.419Z',
    target: 'GATV-5001',
    atlas: -5914.731,
    landing: 340470,
    weatherHour: '1966-11-11T21:00:00Z',
    surfaceWind: [80, 2.57],
    clouds: [undefined, undefined, 'cirrus'],
    payload: 'AdapterWorkstation',
    installed: ['RR_IndexBarCap', 'TDA_TetherCanister', 'TDA_EVAWorkStation', 'TDA_HandrailReceptacle'],
    absent: ['TDA_DischargeFingers', 'TDA_IonWakeSensors'],
  },
];
const id = (n) => `usa/gemini/gt-${n}`;
const forFlight = (n) => flights.find((f) => f.id === id(n));
const file = (path) => new URL(`../public/${path}`, import.meta.url);

test('Gemini X, XI and XII appear as built flights on the front page and in the Lineup', () => {
  const order = [id(10), id(11), id(12)];
  const fromFront = listed(flights).filter((f) => order.includes(f.id));
  assert.deepEqual(
    fromFront.map((f) => f.id),
    order,
  );
  assert.deepEqual(
    fromFront,
    late.map(({ n }) => forFlight(n)),
    'built entries replace the forthcoming placeholders',
  );
  const fromLineup = entries(flights).filter((e) => order.includes(e.flight.id));
  assert.deepEqual(
    fromLineup.map(({ flight }) => flight.id),
    order,
  );
  for (const { vehicle, flight } of fromLineup) assert.equal(vehicle, exhibit(flight));
});

for (const record of late) {
  const { n, launch, target, atlas, landing, weatherHour, surfaceWind, clouds, payload, installed, absent } = record;
  test(`Gemini ${n} has its own countdown, weather, and mission record`, () => {
    const flight = forFlight(n);
    assert.equal(flight.launch, launch);
    assert.deepEqual(entrances(flight), { gallery: true, site: true, fly: true });
    const { models, timeline, weather } = flight;
    const pad = models.find((m) => m.id === 'pad');
    const crew = models.filter((m) => m.walker);
    assert.equal(crew.length, 2);
    const at = pad.sequence[0].at;
    assert.deepEqual(openingFor(flight, { clockAt: 0, named: '', running: false, fly: false }), { at, model: 'pad', view: 'erector' });
    for (const m of crew) {
      assert.ok(m.with[0].at > at && m.with[0].at < 0, `${m.id}: crew boards after the pad opens and before liftoff`);
      assert.equal(m.with[0].model, pad.id);
    }
    assert.ok(pad.sequence.every((k, i) => !i || (k.at > pad.sequence[i - 1].at && k.slider > pad.sequence[i - 1].slider)));
    assert.equal(timeline[0].t, atlas);
    assert.equal(timeline[1].t, 0);
    assert.equal(timeline.at(-1).t, landing);
    assert.ok(timeline.every((e, i) => !i || e.t > timeline[i - 1].t));
    assert.equal(weather.observed.at.slice(0, 10), launch.slice(0, 10));
    assert.deepEqual([weather.wind.from.value, weather.wind.speed.value], surfaceWind);
    assert.deepEqual([weather.low?.kind, weather.middle?.kind, weather.high?.kind], clouds);
    assert.equal(weather.aloft.observed.at, weatherHour);
    assert.ok(weather.hours.some((hour) => hour.at === weatherHour));
    assert.equal(readFileSync(file(`globe/cape-canaveral.${launch.slice(0, 10)}.weather.png`)).readUInt32BE(0), 0x89504e47);
  });

  test(`Gemini ${n} keeps the right spacecraft hardware and ${target} at every level of detail`, () => {
    const vehicle = exhibit(forFlight(n));
    const payloadView = vehicle.views.find((view) => view.id === 'payload');
    assert.deepEqual(payloadView.nodes, [payload]);
    assert.equal(payloadView.isolate, true);
    assert.ok(vehicle.parts.some((p) => p.node === payload && p.inside));
    assert.ok(vehicle.views.some((view) => view.id === 'target' && view.label === target));
    assert.ok(targetNodes(vehicle).includes('TargetDockingAdapter'));

    for (const level of [0, 1, 2]) {
      const model = file(lodUrl(vehicle.url, level));
      for (const node of [payload, ...installed]) {
        assert.ok(materialsUnder(model, node)?.length, `${node}: geometry at detail ${level}`);
      }
      for (const node of [...absent, ...late.map((r) => r.payload).filter((other) => other !== payload)]) {
        assert.equal(materialsUnder(model, node), null, `${node}: absent at detail ${level}`);
      }
    }
  });
}

test('Gemini X’s dormant Agena has a gallery address and stays off LC-19 with the primary target', () => {
  const flight = forFlight(10);
  const oldAgena = flight.models.find((model) => model.id === 'agena-8');
  assert.equal(oldAgena.id, 'agena-8');
  assert.equal(oldAgena.backdrop, 'studio');
  assert.notEqual(oldAgena, exhibit(flight));
  assert.ok(oldAgena.specGroups?.length && oldAgena.motorNames?.length);
  const specs = flight.specs.filter((s) => oldAgena.specGroups.includes(s.group));
  const motors = flight.motors.filter((m) => oldAgena.motorNames.includes(m.name));
  assert.ok(specs.some((s) => s.label === 'Length in orbit, cone run out'));
  assert.ok(specs.every((s) => s.label !== 'Agena weight at launch' && s.label !== 'Agena weight at orbital insertion'));
  assert.deepEqual(
    motors.map((m) => m.name),
    agenaMotors().map((m) => m.name),
  );
  assert.equal(parseAddress(formatAddress(flight.id, 'gallery', oldAgena.id)).what, oldAgena.id);
  for (const level of [0, 1, 2]) {
    const model = file(lodUrl(oldAgena.url, level));
    assert.ok(materialsUnder(model, 'TDA_MicrometeoriteCollector')?.length);
    assert.ok(materialsUnder(model, 'TDA_DischargeFingers')?.length);
    assert.equal(materialsUnder(model, 'TitanStage1'), null);
    assert.equal(materialsUnder(model, 'TDA_IonWakeSensors'), null);
  }

  for (const { n } of late) {
    const whole = forFlight(n);
    const site = atSite(whole);
    const vehicle = exhibit(whole);
    const siteVehicle = exhibit(site);
    assert.ok(site.models.every((m) => m.backdrop === 'ground' && !m.galleryCraft));
    assert.equal(siteVehicle.target, undefined);
    for (const node of targetNodes(vehicle)) {
      assert.ok(
        siteVehicle.views.every((view) => !view.nodes?.includes(node)),
        `no launch-site view selects ${node}`,
      );
      assert.ok(siteVehicle.absent.includes(node), `${node} must be hidden`);
      assert.ok(
        siteVehicle.parts.every((p) => p.node !== node),
        `${node} must be absent from the parts list`,
      );
    }
  }
});

test('both late Gemini crew figures can be examined in the gallery and walked at the launch site', () => {
  for (const { n } of late) {
    const flight = forFlight(n);
    const site = atSite(flight);
    assert.deepEqual(
      flight.models.filter((model) => model.galleryCraft && model.walker).map((model) => model.id),
      ['crew', 'pilot'],
    );
    for (const id of ['crew', 'pilot']) {
      const figure = flight.models.find((model) => model.id === id);
      assert.ok(figure.galleryCraft && figure.walker);
      assert.deepEqual(figure.specGroups, ['Pressure suit']);
      assert.deepEqual(figure.motorNames, []);
      assert.equal(parseAddress(formatAddress(flight.id, 'gallery', id)).what, id);
      const studio = galleryFlight(flight, figure);
      assert.equal(studio.site, undefined);
      assert.equal(studio.surroundings, undefined);
      assert.equal(studio.models.length, 1);
      assert.equal(studio.models[0].backdrop, 'studio');
      assert.equal(studio.models[0].walker, undefined);
      assert.equal(studio.models[0].with, undefined);
      assert.deepEqual(
        studio.models[0].views.map((view) => view.id),
        ['gallery-whole', 'figure', 'helmet'],
      );
      const walker = site.models.find((model) => model.id === id);
      assert.equal(walker.galleryCraft, undefined);
      assert.equal(walker.with[0].model, 'pad');
      assert.deepEqual(walker.walker, figure.walker);
    }
  }
});
