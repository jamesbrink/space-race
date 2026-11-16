// src/viewer/day.ts `windsOf`: the wind drawn through the day. The record's at liftoff, exactly; changed as the surface's
// hours change (DayWeather.hours, world/aloft.ts hourAt), smoothly with the clock; outside the hours the nearest held
// and said so. Only a flight whose weather has hours is moved by it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { breeze, dayOf, windsOf } from '../src/viewer/day.ts';
import { hourAt } from '../src/world/aloft.ts';
import { julianDate } from '../src/world/time.ts';

const flightsDir = new URL('../missions/', import.meta.url);
const load = async (path) => (await import(new URL(path, flightsDir).href)).flight;
const WITH_HOURS = await Promise.all(
  [
    'usa/mercury/flights/mr-3-freedom-7/flight.ts',
    'usa/mercury/flights/mr-4-liberty-bell-7/flight.ts',
    'ussr/vostok/flights/vostok-1/flight.ts',
    'ussr/vostok/flights/vostok-2/flight.ts',
  ].map(load),
);
const name = (f) => f.name ?? f.id;
/** A Julian date `s` seconds from the flight's liftoff, as the clock makes it (Clock.jdUT). */
const at = (f, s) => julianDate(f.launch) + s / 86_400;
/** The east and north parts of a wind given as the bearing it blows toward and its speed. */
const parts = (w) => [w.speed * Math.sin(w.toward), w.speed * Math.cos(w.toward)];
/** a over b, east and north as a complex number's real and imaginary parts: how b is turned and scaled into a. */
const over = (a, b) => {
  const h = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / h, (a[1] * b[0] - a[0] * b[1]) / h];
};

test('at liftoff the wind drawn is the record’s, to the bit: the picture at T-0 is what it was', () => {
  for (const f of WITH_HOURS) {
    assert.ok(f.weather?.hours?.length, `${name(f)} has its hours`);
    const day = dayOf(f);
    const now = windsOf(f, day)(at(f, 0));
    assert.equal(now.wind, day.wind, name(f));
    assert.equal(now.cloud, day.cumulus?.wind ?? null, name(f));
    assert.equal(now.held, null);
    assert.deepEqual(breeze(now), breeze(day));
  }
});

test('through the hours it is the record’s turned and scaled as the hours’ wind is since liftoff, and so moves as the record says', () => {
  for (const f of WITH_HOURS) {
    const day = dayOf(f);
    const winds = windsOf(f, day);
    const zero = hourAt(f.weather.hours, Date.parse(f.launch)).wind;
    const record = parts(day.wind);
    for (const hour of f.weather.hours) {
      const t = (Date.parse(hour.at) - Date.parse(f.launch)) / 1000;
      const want = over(hourAt(f.weather.hours, hour.at).wind, zero);
      const got = over(parts(winds(at(f, t)).wind), record);
      for (const k of [0, 1])
        assert.ok(Math.abs(got[k] - want[k]) < 1e-6, `${name(f)} at ${hour.at}: turned and scaled by ${got}, the hours by ${want}`);
    }
  }
});

test('it never steps: a minute of the clock moves it by a minute’s share of an hour’s change at most', () => {
  for (const f of WITH_HOURS) {
    const winds = windsOf(f, dayOf(f));
    const hours = f.weather.hours.map((h) => Date.parse(h.at));
    const from = (hours[0] - Date.parse(f.launch)) / 1000 - 3600;
    const to = (hours.at(-1) - Date.parse(f.launch)) / 1000 + 3600;
    let last = parts(winds(at(f, from)).wind);
    let most = 0;
    for (let t = from + 60; t <= to; t += 60) {
      const now = parts(winds(at(f, t)).wind);
      most = Math.max(most, Math.hypot(now[0] - last[0], now[1] - last[1]));
      last = now;
    }
    // (the hours change by under 3 m/s an hour: 5 cm/s a minute)
    assert.ok(most < 0.05, `${name(f)}: ${most.toFixed(4)} m/s in a minute`);
  }
});

test('outside the hours the nearest hour holds, and it says so', () => {
  for (const f of WITH_HOURS) {
    const winds = windsOf(f, dayOf(f));
    const hours = f.weather.hours.map((h) => (Date.parse(h.at) - Date.parse(f.launch)) / 1000);
    const early = winds(at(f, hours[0] - 7200));
    const first = winds(at(f, hours[0]));
    const late = winds(at(f, hours.at(-1) + 7200));
    const final = winds(at(f, hours.at(-1)));
    assert.equal(early.held, 'before');
    assert.equal(late.held, 'after');
    assert.equal(first.held, null);
    assert.deepEqual(early.wind, first.wind);
    assert.deepEqual(late.wind, final.wind);
    assert.deepEqual(late.cloud, final.cloud);
  }
});

test('the low cloud drifts on its own wind turned and scaled alike', () => {
  for (const f of WITH_HOURS.filter((f) => f.weather.low)) {
    const day = dayOf(f);
    const winds = windsOf(f, day);
    const t = (Date.parse(f.weather.hours[0].at) - Date.parse(f.launch)) / 1000;
    const now = winds(at(f, t));
    // (both in the scene's frame, which is the compass turned: a turn and a scale are the same in either)
    const ground = over(parts(now.wind), parts(day.wind));
    const flip = (v) => [v[1], v[0]]; // (z then x: the scene's frame is the compass turned, and a mirror of it taken x then z)
    const cloud = over(flip(now.cloud), flip(day.cumulus.wind));
    assert.ok(Math.hypot(cloud[0] - ground[0], cloud[1] - ground[1]) < 1e-9, `${name(f)}: the cloud's ${cloud}, the ground's ${ground}`);
  }
});

test('a flight with no hours is drawn in the day’s wind all day', async () => {
  const f = await load('usa/mercury/flights/ma-6-friendship-7/flight.ts');
  const day = dayOf(f);
  const winds = windsOf(f, day);
  for (const s of [-30_000, 0, 30_000]) {
    const now = winds(at(f, s));
    assert.equal(now.wind, day.wind);
    assert.equal(now.held, null);
  }
});
