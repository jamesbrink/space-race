// Drives a vehicle and works the site's machines in the running page, and reads what the sound is playing as it does
// (`sr.sound.voices`: the works' voices, slot by slot), since nothing headless can be heard (docs/agents/sound.md).
//   node tools/sound-test.mjs [url] [--flight <id>]      (default url: http://localhost:5180/; flight: Vostok 1, at Site 1; another
//   flight at Site 1 is run at its own morning's times, and its car is driven only if its morning had one)
// It checks: at the wheel the footfalls stop and an engine and tyres are heard, the engine turning faster as it gathers
// speed, the tyres on what is under them; out again the footfalls come back and the vehicle runs down to silence; a
// machine worked by hand is heard while it moves and is silent once it has stopped; a vehicle on the clock is heard
// while the clock drives it and is silent with the clock stopped; the clock put back, the hardware's replay of the stretch
// before it (at four times life) is not heard. Then Liberty Bell 7's helicopter: heard from the chase view by its rotor, tail
// rotor and engine, through the cabin's wall from the seat, louder there once the hatch is gone, and silent with the clock stopped.
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const flight = opt(args, '--flight', 'ussr/vostok/vostok-1');
const url = urlOf(args);
/** Seconds from the flight's liftoff of a Moscow time that morning (Moscow's is three hours on UTC): set once the page is open. */
let MSK = (_h, _m, _s = 0) => Number.NaN;

const browser = await launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const { page, errors, close } = await open(browser, `${url}#${flight}/site/pad`, { console: [], timeout: 120000 });
const { check, failures } = checks();
const wait = (ms) => page.waitForTimeout(ms);
/** What the works play now: each voice as `what part kind gain metres [rpm] [tread]`. */
const voices = () =>
  page.evaluate(() =>
    window.sr.sound.voices.filter(Boolean).map((v) => ({ ...v, gain: Number(v.gain.toPrecision(3)), metres: Number(v.metres.toFixed(1)) })),
  );
const say = (label, list) =>
  console.log(
    `    ${label}: ${list.length ? list.map((v) => `${v.what} ${v.part} (${v.kind}) ${v.gain}${v.rpm ? ` ${Math.round(v.rpm)} rpm` : ''}${v.tread ? ` on ${v.tread}` : ''} at ${v.metres} m`).join('; ') : 'silent'}`,
  );

try {
  await page.evaluate(() => Promise.allSettled(window.sr.stage.arriving ?? []));
  {
    const liftoff = Date.parse(await page.evaluate(() => window.sr.flight.launch));
    const day = new Date(liftoff);
    MSK = (h, m, s = 0) => (Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h - 3, m, s) - liftoff) / 1000;
  }
  // (left alone, the page would start its idle show and run the clock: not here)
  await page.evaluate(() => {
    window.sr.demo.stop(true);
    window.sr.demo.start = () => {};
  });
  // the page must be touched before anything sounds (browsers insist)
  await page.mouse.click(640, 120);
  await page.waitForFunction(() => window.sr.sound.meter().state === 'running', null, { timeout: 15000 });
  check(true, 'the sound is running');
  // the place's far hum at its own mains (#29: it was 60 and 120 Hz everywhere)
  const hum = await page.evaluate(() => ({ hum: window.sr.sound.hum, mains: window.sr.flight.site.place.mains?.value }));
  check(
    hum.hum?.length === 2 && hum.hum[0] === hum.mains && hum.hum[1] === 2 * hum.mains,
    `the far hum is at the place's mains: ${hum.hum?.join(' and ')} Hz (${hum.mains} Hz)`,
  );

  // ---- #2: drive the saloon car that stood by the bus, before it left at 08:05 ----
  const start = await page.evaluate(
    ({ at }) => {
      const { sr } = window;
      sr.stage.setAutoRotate?.(false);
      sr.clock.pause();
      sr.clock.seek(at);
      // the car as drawn: the level of detail on show
      let car = null;
      sr.stage.scene.traverse((o) => {
        if (car || o.name !== 'Saloon_Car') return;
        for (let p = o; p; p = p.parent) if (!p.visible) return;
        car = o;
      });
      if (!car) return { error: 'no saloon car on show' };
      const p = car.getWorldPosition(car.position.clone());
      const walker = sr.flight.models.find((m) => m.walker).id;
      sr.stage.enterWalk(walker, { x: p.x, y: p.y, z: p.z + 3.5 });
      // count what the walk is heard as, and pass it on
      const sounds = sr.stage.walk.sounds;
      window.heardWalk = { footfalls: 0, breaths: 0 };
      sr.stage.walk.sounds = {
        footfall: (e) => {
          window.heardWalk.footfalls++;
          sounds.footfall(e);
        },
        breath: (b) => {
          window.heardWalk.breaths++;
          sounds.breath(b);
        },
        driving: (d) => sounds.driving(d),
      };
      window.theCar = car;
      return { at: [p.x, p.y, p.z] };
    },
    { at: MSK(7, 50) },
  );
  // (a car is driven only where the flight's morning had one: Vostok 1's saloon; Vostok 2's pad has none, so there the
  // drive is not tried and the rest is)
  if (start.error) console.log(`  --   ${start.error} on this flight's morning: the drive is not tried`);
  else {
    // walk a few steps first: footfalls
    await page.keyboard.down('a');
    await wait(1500);
    await page.keyboard.up('a');
    const walked = await page.evaluate(() => window.heardWalk.footfalls);
    check(walked > 0, `on foot: ${walked} footfalls in 1.5 s`);
    // in at the driver's door (as a look at it and E would: the aim is the car)
    const boarded = await page.evaluate(() => {
      const { stage } = window.sr;
      stage.onFoot.aim = { vehicle: window.theCar };
      return stage.onFoot.walkDrive();
    });
    check(boarded, 'got in at the wheel');
    await wait(2500);
    const idle = await voices();
    say('at the wheel, standing', idle);
    check(
      idle.some((v) => v.part === 'engine' && v.kind === 'road'),
      'its engine is heard idling',
    );
    const steps0 = await page.evaluate(() => window.heardWalk);
    const speed = () => page.evaluate(() => window.sr.stage.onFoot.wheel?.motion.speed ?? Number.NaN);
    const place = () => page.evaluate(() => ({ ...window.sr.stage.onFoot.wheel?.motion }));
    // forward, off to the right as it went at 08:05: it stands by a building's corner with the bus beside it, and clears
    // the corner (#29: measured with its door open as it was got into, it was a metre wider on that side and would not)
    const from = await place();
    await page.keyboard.down('w');
    await page.keyboard.down('d');
    const going = [];
    /** How far it has got along the way its nose first pointed (held on the right lock it goes round, and comes back). */
    let ahead = 0;
    for (let i = 0; i < 8; i++) {
      await wait(700);
      going.push({ list: await voices(), speed: await speed() });
      const to = await place();
      ahead = Math.max(ahead, (to.x - from.x) * Math.cos(from.heading) - (to.z - from.z) * Math.sin(from.heading));
    }
    await page.keyboard.up('w');
    await page.keyboard.up('d');
    check(ahead > 3, `it drives forward from where it stood: ${ahead.toFixed(1)} m along its nose`);
    for (const { list, speed: v } of going) say(`driving at ${v.toFixed(1)} m/s`, list);
    const rpm = going.map(({ list }) => list.find((v) => v.part === 'engine')?.rpm ?? 0);
    const fastest = going.reduce((a, b) => (Math.abs(b.speed) > Math.abs(a.speed) ? b : a));
    check(fastest.speed > 2, `it goes: up to ${fastest.speed.toFixed(1)} m/s`);
    check(
      rpm.at(-1) > (idle.find((v) => v.part === 'engine')?.rpm ?? Infinity),
      `the engine turns faster as it goes: ${rpm.map(Math.round).join(', ')} rpm`,
    );
    const tyres = fastest.list.find((v) => v.part === 'tyres');
    check(Boolean(tyres?.tread), `its tyres are heard, on ${tyres?.tread}`);
    const steps1 = await page.evaluate(() => window.heardWalk);
    check(
      steps1.footfalls === steps0.footfalls && steps1.breaths === steps0.breaths,
      `no footfall or breath at the wheel (${steps1.footfalls - steps0.footfalls}, ${steps1.breaths - steps0.breaths})`,
    );
    // out again, and on foot
    await wait(1500);
    await page.evaluate(() => window.sr.stage.onFoot.walkAlight());
    await wait(2500);
    await page.keyboard.down('a');
    await wait(1500);
    await page.keyboard.up('a');
    const steps2 = await page.evaluate(() => window.heardWalk);
    check(steps2.footfalls > steps1.footfalls, `out of it, the footfalls come back: ${steps2.footfalls - steps1.footfalls}`);
    await wait(1500);
    const after = await voices();
    say('out of it, after', after);
    check(!after.some((v) => v.kind === 'road'), 'the car has run down to silence');
  }

  // ---- #4: a machine worked by hand: the erector's boom ----
  await page.evaluate(() => window.sr.stage.walk.active && window.sr.stage.onFoot.exitWalk());
  await wait(500);
  const refused = await page.evaluate(() => window.sr.stage.hands.push('pad', 'Erector', 'Erector_Boom', 1));
  check(refused === null, `the boom is worked by hand${refused ? `: refused, ${refused}` : ''}`);
  await wait(2500);
  const boom = await voices();
  say('the boom worked by hand', boom);
  check(
    boom.some((v) => v.kind === 'hydraulic' && v.what === 'Erector_Boom'),
    'its hydraulics are heard while it moves',
  );
  await page.evaluate(() => window.sr.stage.hands.push('pad', 'Erector', 'Erector_Boom', 0));
  await wait(2500);
  const boomAfter = await voices();
  say('let go', boomAfter);
  check(!boomAfter.some((v) => v.what === 'Erector_Boom'), 'silent once it has stopped');

  // ---- #4: a vehicle on the clock: the bus coming in, 06:49 to 06:50 ----
  // (put a minute back, the hardware glides there, and is heard doing it: let it arrive first, then run the clock at life)
  await page.evaluate(({ at }) => window.sr.clock.seek(at), { at: MSK(6, 49, 20) });
  // (the hardware's instant chases the clock's: stage.ts `follow`, the last 20 s at four times life, which the bus drives
  // in through: #29, that replay is seen and not heard)
  let replay = { gain: 0, what: '', polls: 0 };
  for (let i = 0; i < 600; i++) {
    const now = await page.evaluate(() => ({
      catching: Math.abs(window.sr.stage.shownT - window.sr.clock.t) >= 1e-6,
      shown: window.sr.stage.shownT,
      list: window.sr.sound.voices.filter(Boolean),
    }));
    if (!now.catching) break;
    replay.polls++;
    for (const v of now.list) if (v.gain > replay.gain) replay = { ...replay, gain: v.gain, what: `${v.what} ${v.part}` };
    await wait(100);
  }
  console.log(
    `    the catch-up: ${replay.polls} looks, the loudest of the works ${replay.gain.toPrecision(3)}${replay.what ? ` (${replay.what})` : ''}`,
  );
  check(replay.polls > 3, 'the hardware caught the clock up over a while');
  check(replay.gain < 1e-3, `the replay is not heard: at the most ${replay.gain.toPrecision(3)}`);
  await wait(2500);
  const settled = await voices();
  say('the clock put back, settled', settled);
  check(!settled.some((v) => v.what === 'Bus_In'), 'the bus is silent standing');
  await page.evaluate(() => {
    const { clock } = window.sr;
    clock.setRate(1);
    clock.play();
  });
  await wait(3000);
  const bus = await voices();
  say('the bus on the clock', bus);
  // (its tyres too, but at a bus's walking pace a hundred metres off they are under what is played)
  check(
    bus.some((v) => v.what === 'Bus_In' && v.part === 'engine'),
    'its engine is heard while the clock drives it',
  );
  const was = await page.evaluate(() => window.sr.clock.t);
  await page.evaluate(() => window.sr.clock.pause());
  await wait(3000);
  const now = await page.evaluate(() => ({ t: window.sr.clock.t, running: window.sr.clock.running }));
  check(!now.running && Math.abs(now.t - was) < 0.5, `the clock stopped at ${now.t.toFixed(1)} s`);
  const engineAt = bus.find((v) => v.what === 'Bus_In' && v.part === 'engine');
  check((engineAt?.rpm ?? Infinity) < 2389, `at life's pace the bus's engine is in its range: ${Math.round(engineAt?.rpm ?? 0)} rpm`);
  const stopped = await voices();
  say('the clock stopped', stopped);
  check(!stopped.some((v) => v.what === 'Bus_In'), 'silent with the clock stopped');
  check(errors.length === 0, `no errors on the page${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
} catch (e) {
  check(false, String(e));
} finally {
  await close();
}

// ---- #13: Liberty Bell 7's helicopter, heard on the clock from the chase view and from the seat ----
const lb7 = await open(browser, `${url}#usa/mercury/mr-4-liberty-bell-7/site/vehicle`, { console: [], timeout: 180000 });
try {
  const p = lb7.page;
  await p.evaluate(() => Promise.allSettled(window.sr.stage.arriving ?? []));
  await p.evaluate(() => {
    window.sr.demo.stop(true);
    window.sr.demo.start = () => {};
  });
  await p.mouse.click(640, 120);
  await p.waitForFunction(() => window.sr.sound.meter().state === 'running', null, { timeout: 15000 });
  const heli = () =>
    p.evaluate(() =>
      window.sr.sound.voices.filter((v) => v && v.kind === 'rotorcraft').map((v) => ({ ...v, gain: Number(v.gain.toPrecision(3)) })),
    );
  /** Put the clock at `t` and run it at life's pace from `rig`, and read the helicopter's voices once it has settled. */
  const at = async (t, rig) => {
    await p.evaluate(
      ([t, rig]) => {
        const { clock, stage } = window.sr;
        clock.pause();
        clock.seek(t);
        stage.setCamera(rig);
        clock.setRate(1);
        clock.play();
      },
      [t, rig],
    );
    await p.waitForTimeout(3500);
    const list = await heli();
    say(`${rig} at ${t} s`, list);
    return list;
  };
  const rotor = (list) => list.find((v) => v.what === 'Hunt Club 1' && v.part === 'rotor');
  // hovering over the capsule before the hatch went: its rotor, tail rotor and engine from the chase view, and through the wall from the seat
  const chase = await at(1570, 'chase');
  check(
    ['rotor', 'tail', 'engine'].every((part) => chase.some((v) => v.what === 'Hunt Club 1' && v.part === part)),
    'Hunt Club 1’s rotor, tail rotor and engine heard from the chase view',
  );
  check((rotor(chase)?.metres ?? Infinity) < 400, `from ${rotor(chase)?.metres.toFixed(0)} m`);
  const seat = await at(1570, 'onboard');
  check(
    (rotor(seat)?.gain ?? 0) < 0.5 * (rotor(chase)?.gain ?? 0),
    `through the cabin’s wall, quieter: ${rotor(seat)?.gain} against ${rotor(chase)?.gain}`,
  );
  const open = await at(1595, 'onboard');
  check((rotor(open)?.gain ?? 0) > (rotor(seat)?.gain ?? 0), `the hatch gone and it overhead, louder in the seat: ${rotor(open)?.gain}`);
  await p.evaluate(() => window.sr.clock.pause());
  await p.waitForTimeout(1500);
  const still = await heli();
  say('the clock stopped', still);
  check(still.length === 0, 'silent with the clock stopped');
  check(lb7.errors.length === 0, `no errors on Liberty Bell 7’s page${lb7.errors.length ? `: ${lb7.errors.slice(0, 3).join(' | ')}` : ''}`);
} catch (e) {
  check(false, String(e));
} finally {
  await lb7.close();
  await browser.close();
}
console.log(failures.length ? `${failures.length} failed` : 'all held');
process.exit(failures.length ? 1 : 0);
