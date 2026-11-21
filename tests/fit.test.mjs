// A figure of the flight deck's middle panel fits its cell at every magnitude (src/deck/fit.ts): at most ROOM digits, fewer
// decimals and then a larger unit as it grows, so that far from the Earth no figure runs into the next (Apollo 10 at 110,000 km).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fit, ROOM } from '../src/deck/fit.ts';

const digits = (text) => text.replace(/[^0-9-]/g, '').length;

test('what fits is as it was: the decimals asked for', () => {
  assert.deepEqual(fit(99.94, 'km', 2), { text: '99.94', unit: 'km' });
  assert.deepEqual(fit(6378.14, 'km', 1), { text: '6378.1', unit: 'km' });
  assert.deepEqual(fit(7801.6, 'm/s', 0), { text: '7802', unit: 'm/s' });
  assert.deepEqual(fit(-6200, 'km', 0), { text: '-6200', unit: 'km' });
  assert.deepEqual(fit(88.4, 'min', 1), { text: '88.4', unit: 'min' });
});

test('far out a figure gives up decimals, then takes the next unit', () => {
  assert.deepEqual(fit(12345.6, 'km', 1), { text: '12346', unit: 'km' });
  assert.deepEqual(fit(110169.72, 'km', 1), { text: '110.17', unit: 'Mm' });
  assert.deepEqual(fit(681478, 'km', 0), { text: '681.48', unit: 'Mm' });
  assert.deepEqual(fit(150e6, 'km', 0), { text: '150.00', unit: 'Gm' });
  assert.deepEqual(fit(123456, 'm/s', 0), { text: '123.46', unit: 'km/s' });
  assert.deepEqual(fit(14400, 'min', 1), { text: '14400', unit: 'min' });
  assert.deepEqual(fit(144000, 'min', 1), { text: '2400.0', unit: 'h' });
  assert.deepEqual(fit(1.44e7, 'min', 1), { text: '10000', unit: 'd' });
});

test('no figure is wider than its cell, from a metre to twenty times the Moon’s distance, either side of nought', () => {
  for (const unit of ['km', 'm/s', 'min'])
    for (let e = -3; e <= 6.9; e += 0.01)
      for (const sign of [1, -1])
        for (const decimals of [0, 1, 2]) {
          const value = sign * 10 ** e;
          const shown = fit(value, unit, decimals);
          assert.ok(digits(shown.text) <= ROOM, `${value} ${unit}: ${shown.text} ${shown.unit}`);
        }
});
