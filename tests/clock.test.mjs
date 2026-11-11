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
  clock.setRate(-600);
  clock.step(1);
  assert.equal(clock.rate, -3600, 'backwards keeps its direction');
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
