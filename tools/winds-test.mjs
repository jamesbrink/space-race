// The drawn sky follows the day's hours (DayWeather.hours; day.ts `windsOf`): checked in the running page.
//   pnpm dev, then: node tools/winds-test.mjs [url] [--flights mr-3-freedom-7,vostok-1]
// Each flight with hours is opened at its launch site and its clock put at its first recorded hour, at liftoff and at its
// last hour, and then two hours past the last; at each, what the shaders are given is read: the plants' wind (flora.ts
// `uWind`), the wind the low cloud drifts on (air.ts `PlaceAir`) and the sea's waves (globe.ts `uGlobeSea`). Each must be
// what day.ts works out from the flight's own record and hours for that instant (worked here, outside the page), the
// three hours must differ as the record's hours do, at liftoff each must be the record's to the last bit, and past the
// last hour the last hour holds and the setting says so. Put from one hour to another, the clock is jumped: what is
// drawn is the new hour's in the next frame, not eased to.
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';
import { flights } from '../missions/index.ts';
import { breeze, dayOf, windsOf } from '../src/viewer/day.ts';
import { seaSlopes } from '../src/viewer/globe.ts';
import { julianDate } from '../src/world/time.ts';

const args = process.argv.slice(2);
const only = opt(args, '--flights', null)?.split(',');
const url = urlOf(args);
const chosen = flights.filter((f) => f.weather?.hours?.length && (!only || only.includes(f.id.split('/').at(-1))));

/** What the page should give its shaders at `t` seconds from liftoff. */
function expected(flight, t) {
  const day = dayOf(flight);
  const now = windsOf(flight, day)(julianDate(flight.launch) + t / 86_400);
  const b = breeze(now);
  const k = 0.05 * b.strength;
  return {
    plants: [Math.sin(b.toward) * k, 0, -Math.cos(b.toward) * k],
    cloud: now.cloud ?? [0, 0],
    sea: Number(seaSlopes(now.wind.speed).toFixed(5)),
    speed: now.wind.speed,
    held: now.held,
  };
}

const { check, failures } = checks();
const browser = await launch();

for (const flight of chosen) {
  const id = flight.id.split('/').at(-1);
  const { page, errors, close } = await open(browser, `${url}#${flight.id}/site/vehicle`, { timeout: 180000 });
  const hours = flight.weather.hours.map((h) => (Date.parse(h.at) - Date.parse(flight.launch)) / 1000);
  const instants = [
    { name: `the first hour (${flight.weather.hours[0].at.slice(11, 16)} UTC)`, t: hours[0] },
    { name: 'liftoff', t: 0 },
    { name: `the last hour (${flight.weather.hours.at(-1).at.slice(11, 16)} UTC)`, t: hours.at(-1) },
    { name: 'two hours past the last', t: hours.at(-1) + 7200 },
  ];
  const read = [];
  for (const at of instants) {
    const got = await page.evaluate(async (t) => {
      const sr = window.sr;
      const st = sr.stage;
      sr.clock.pause();
      sr.clock.seek(t);
      st.dirty = true;
      await new Promise((r) => requestAnimationFrame(r));
      const setting = st.setting;
      let plants = null;
      for (const o of setting.scenery ?? [])
        o.traverse((x) => {
          if (x.userData.flora && !plants) plants = x.userData.flora.shared.wind.value.toArray();
        });
      return {
        t: sr.clock.t,
        plants,
        cloud: setting.air?.drifting ? [...setting.air.drifting] : null,
        sea: setting.globe?.uniforms.uGlobeSea?.value.x ?? null,
        held: setting.blowing ? setting.blowing.held : 'none',
        speed: setting.blowing?.wind.speed ?? null,
      };
    }, at.t);
    const want = expected(flight, at.t);
    read.push(got);
    const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= 1e-9 + 1e-9 * Math.abs(b[i]));
    check(
      same(got.plants, want.plants) && same(got.cloud, want.cloud) && got.sea === want.sea && got.held === want.held,
      `${id} at ${at.name}, T${got.t >= 0 ? '+' : ''}${got.t.toFixed(0)} s: the wind ${got.speed?.toFixed(2)} m/s (the record and hours say ${want.speed.toFixed(2)})${got.held ? `, held (${got.held})` : ''}; the plants' ${got.plants?.map((v) => v.toFixed(4)).join(', ')}; the cloud's ${got.cloud?.map((v) => v.toFixed(2)).join(', ')}; the sea's slopes ${got.sea?.toFixed(5)}`,
    );
  }
  // at liftoff, the record's exactly: what the place was built with
  const lift = read[1];
  const day = dayOf(flight);
  const b = breeze(day);
  // (as flora.ts multiplies it, and with the page's own sine and cosine: Node's and the browser's V8 may round Math.cos a
  // unit in the last place apart, as they do for Voskhod 1's 220°, so the record's breeze is turned into the plants' push in
  // the page and only the breeze, which is the record's, is compared across the two)
  const built = await page.evaluate(
    ({ toward, strength }) => [Math.sin(toward), 0, -Math.cos(toward)].map((v) => v * (0.05 * strength)),
    b,
  );
  check(
    lift.plants.every((v, i) => v === built[i]) && lift.sea === Number(seaSlopes(day.wind.speed).toFixed(5)),
    `${id}: at liftoff the plants and the sea are given the record's wind to the bit`,
  );
  // the three hours differ as the record's do
  const apart = (a, b) => Math.hypot(...a.plants.map((v, i) => v - b.plants[i]));
  check(
    apart(read[0], read[1]) > 1e-4 && apart(read[1], read[2]) > 1e-4,
    `${id}: the first hour, liftoff and the last hour each draw another wind`,
  );
  if (errors.length) check(false, `${id}: the page said ${errors.length} thing(s) went wrong: ${errors.slice(0, 3).join(' | ')}`);
  await close();
}
await browser.close();
console.log(failures.length ? `${failures.length} failed` : 'all passed');
process.exit(failures.length ? 1 : 0);
