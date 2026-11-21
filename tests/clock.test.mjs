// The simulation clock (src/world/clock.ts): stopped at the launch until asked, and what it reads.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Clock, localTime, missionTime, RATES } from '../src/world/clock.ts';
import { julianDate } from '../src/world/time.ts';

const LAUNCH = '1961-05-05T14:34:13Z';

test('it starts stopped at the launch instant, so nothing moves until it is asked to', () => {
  const clock = new Clock(LAUNCH);
  assert.equal(clock.t, 0);
  assert.equal(clock.jdUT, julianDate(LAUNCH));
  assert.equal(clock.running, false);
  assert.equal(clock.rate, 1);
  assert.equal(clock.advance(1 / 60), false, 'a frame passing does not move a stopped clock');
  assert.equal(clock.t, 0);
});

test('running, it advances by the rate, either way', () => {
  const clock = new Clock(LAUNCH);
  clock.play();
  assert.equal(clock.advance(0.5), true);
  assert.equal(clock.t, 0.5);
  clock.setRate(3600);
  clock.advance(2);
  assert.equal(clock.t, 7200.5);
  assert.ok(Math.abs((clock.jdUT - julianDate(LAUNCH)) * 86400 - 7200.5) < 1e-4);
  clock.setRate(-60);
  clock.advance(1);
  assert.equal(clock.t, 7140.5);
  clock.pause();
  assert.equal(clock.advance(1), false);
  clock.reset();
  assert.deepEqual([clock.t, clock.rate, clock.running], [0, 1, false]);
});

test('rate steps walk the published list and stop at its ends', () => {
  const clock = new Clock(LAUNCH);
  const seen = [clock.rate];
  for (let i = 0; i < RATES.length + 1; i++) {
    clock.step(1);
    seen.push(clock.rate);
  }
  assert.deepEqual(seen, [...RATES, RATES.at(-1), RATES.at(-1)]);
  clock.step(-1);
  assert.equal(clock.rate, RATES.at(-2));
  clock.setRate(-512);
  clock.step(1);
  assert.equal(clock.rate, -1024, 'backwards keeps its direction');
});

test('listeners hear seeks, play, pause, rate and each advance, and can leave', () => {
  const clock = new Clock(LAUNCH);
  let heard = 0;
  const leave = clock.listen(() => heard++);
  clock.seek(-525);
  clock.seek(-525); // no change, no call
  clock.play();
  clock.play();
  clock.advance(1);
  clock.setRate(10);
  clock.pause();
  assert.equal(heard, 5);
  leave();
  clock.seek(0);
  assert.equal(heard, 5);
});

test('the countdown reads as a countdown', () => {
  assert.equal(missionTime(0), 'T+00:00:00');
  assert.equal(missionTime(-0.4), 'T+00:00:00', 'no minus zero');
  assert.equal(missionTime(-525), 'T−00:08:45');
  assert.equal(missionTime(142.4), 'T+00:02:22');
  assert.equal(missionTime(922), 'T+00:15:22');
  assert.equal(missionTime(-(86400 + 3661)), 'T−1d 01:01:01');
});

test('local time at the Cape: liftoff was at 09:34:13 EST', () => {
  const at = localTime(julianDate(LAUNCH), -5);
  assert.equal(at.text, '09:34:13');
  assert.equal(at.date, '1961-05-05');
  assert.ok(Math.abs(at.dayFraction - (9 * 3600 + 34 * 60 + 13) / 86400) < 1e-6);
  assert.equal(localTime(julianDate('1961-05-05T04:59:59Z'), -5).text, '23:59:59');
  assert.equal(localTime(julianDate('1961-05-05T04:59:59Z'), -5).date, '1961-05-04');
  assert.equal(localTime(julianDate('1961-05-05T05:00:00Z'), -5).text, '00:00:00');
  assert.equal(localTime(julianDate('1961-04-12T06:07:00Z'), 3).text, '09:07:00', 'Moscow time at Vostok 1');
});

test('each rate is twice the one before it, up to the limit it ends on', async () => {
  const { COAST_RATES } = await import('../src/world/clock.ts');
  const all = [...RATES, ...COAST_RATES];
  assert.equal(all[0], 1, 'from real time');
  assert.equal(RATES.at(-1), 3600, 'to an hour a second on the ground');
  assert.equal(COAST_RATES.at(-1), 100_000, 'and a day in under a second on a coast');
  for (let i = 1; i < all.length; i++) {
    const limit = all[i] === RATES.at(-1) || all[i] === COAST_RATES.at(-1);
    // (a limit is where the doubling stops short: never more than twice the rate before it)
    if (limit) assert.ok(all[i] > all[i - 1] && all[i] <= 2 * all[i - 1], `${all[i - 1]} to ${all[i]}`);
    else assert.equal(all[i], 2 * all[i - 1], `${all[i - 1]} to ${all[i]}`);
  }
});

test('faster than an hour a second only when let, for a coast flown on rails, and never past what is due', async () => {
  const { COAST_RATES } = await import('../src/world/clock.ts');
  const clock = new Clock('1969-07-16T13:32:00Z');
  clock.setRate(100_000);
  assert.equal(clock.rate, 3600, 'held to an hour a second until something lets it go faster');
  for (let i = 0; i < 4; i++) clock.step(1);
  assert.equal(clock.rate, 3600, 'and the steps stop there');
  clock.allow(COAST_RATES.at(-1));
  clock.step(1);
  assert.equal(clock.rate, 7200, 'two hours a second');
  for (let i = 0; i < COAST_RATES.length - 1; i++) clock.step(1);
  assert.equal(clock.rate, 100_000, 'a day in under a second');
  clock.step(1);
  assert.equal(clock.rate, 100_000, 'and no further');
  // the coast to the Moon from Apollo 11's translunar injection to its lunar orbit insertion, 73 hours, in 2.6 s
  clock.seek(10_213.2);
  clock.hold(272_990.4);
  clock.play();
  let frames = 0;
  while (clock.t < 272_990.4 && frames < 1000) {
    clock.advance(1 / 60);
    frames++;
  }
  assert.equal(clock.t, 272_990.4, 'it stops on the instant held, not a frame past it');
  assert.equal(clock.rate, 1, 'and goes on at real time');
  assert.ok(Number.isNaN(clock.dueAt), 'the instant is let go');
  assert.equal(frames, 158, 'in 158 frames at 60 a second');
  clock.allow(3600);
  assert.equal(clock.fastest, 3600);
  clock.setRate(-100_000);
  assert.equal(clock.rate, -3600, 'brought back, a rate past the limit comes down to it');
  clock.reset();
  assert.equal(clock.fastest, 3600, 'and a reset forgets what was let');
});

test('past a day a second, in ones, twos and fives to ten million, only as far as it is let; and a warp rides what it is let', async () => {
  const { COAST_RATES, DEEP_RATES, DEEPEST } = await import('../src/world/clock.ts');
  assert.deepEqual(DEEP_RATES, [200_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000]);
  assert.equal(DEEPEST, 10_000_000);
  const clock = new Clock('1968-12-21T12:51:00Z');
  clock.allow(COAST_RATES.at(-1));
  clock.setRate(100_000);
  clock.step(1);
  assert.equal(clock.rate, 100_000, 'a coast let go to a day a second goes no further');
  clock.allow(DEEPEST);
  for (const r of DEEP_RATES) {
    clock.step(1);
    assert.equal(clock.rate, r);
  }
  clock.step(1);
  assert.equal(clock.rate, DEEPEST, 'and no further than ten million');
  clock.allow(2_400_000);
  assert.equal(clock.rate, 2_400_000, 'brought down to what is let, whatever it is');
  clock.step(-1);
  assert.equal(clock.rate, 1_000_000, 'a step down from there is a step down the list');
  // a warp: as fast as it is let, up and down, to its instant
  clock.seek(10_000);
  clock.warpTo(20_000, 'there');
  assert.equal(clock.rate, 2_400_000, 'the warp goes at what is let');
  assert.ok(clock.running);
  clock.allow(5_000_000);
  assert.equal(clock.rate, 5_000_000, 'and rises with it');
  clock.allow(4000);
  assert.equal(clock.rate, 4000, 'and comes down with it');
  assert.deepEqual(clock.warp, { t: 20_000, what: 'there' });
  clock.warpTo(5000, 'gone');
  assert.deepEqual(clock.warp, { t: 20_000, what: 'there' }, 'a warp to what has gone is not one');
  while (clock.warp) clock.advance(1 / 60);
  assert.equal(clock.t, 20_000, 'it lands on its instant');
  assert.equal(clock.rate, 1, 'at real time, still running');
  assert.ok(clock.running);
  // a step of the rate ends one, as does setting it, going back past it or a reset
  clock.allow(DEEPEST);
  clock.warpTo(90_000, 'on');
  clock.step(-1);
  assert.equal(clock.warp, null, 'a step ends it');
  clock.warpTo(90_000, 'on');
  clock.setRate(1);
  assert.equal(clock.warp, null, 'so does setting the rate');
  clock.warpTo(90_000, 'on');
  clock.seek(95_000);
  assert.equal(clock.warp, null, 'or going past it');
  clock.warpTo(190_000, 'on');
  clock.reset();
  assert.equal(clock.warp, null, 'or a reset');
});

test('a rate as the time bar writes it, and a mission time as typed', async () => {
  const { rateText, parseMissionTime } = await import('../src/world/clock.ts');
  assert.equal(rateText(1), '1×');
  assert.equal(rateText(3600), '3600×');
  assert.equal(rateText(100_000), '100,000×');
  assert.equal(rateText(2_371_234.5), '2,370,000×');
  assert.equal(rateText(-7200), '−7200×');
  assert.equal(parseMissionTime('61:30'), 61 * 3600 + 30 * 60);
  assert.equal(parseMissionTime('61:30:15'), 61 * 3600 + 30 * 60 + 15);
  assert.equal(parseMissionTime('T+2d 13:30'), 2 * 86_400 + 13 * 3600 + 30 * 60);
  assert.equal(parseMissionTime('+2d 13:30:01.5'), 2 * 86_400 + 13 * 3600 + 30 * 60 + 1.5);
  assert.equal(parseMissionTime('61'), 61 * 3600);
  for (const bad of ['', 'soon', '12:61', '1:2:3:4']) assert.ok(Number.isNaN(parseMissionTime(bad)), bad);
});
