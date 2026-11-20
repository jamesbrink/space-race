// A flight of days is held as a run that fits a phone (issue #173): Gemini VII's record run, fourteen days, flown once as
// the app flies it (sim/run.ts `orbitalRecord`), by how many samples it keeps and how much heap it holds. Until November
// 2026 it kept every step of its coast: 120,998 samples and 156 MB here, 530 MB in the page beside Gemini 3's 369.
// Its coast is kept by how fast its motion changes (sim/orbital.ts `flyOrbit`, sim/rails.ts), and read between the
// samples kept as the run that kept them all (tests/rails.test.mjs holds that on a flight short enough to fly twice).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import v8 from 'node:v8';
import vm from 'node:vm';
import { flight } from '../missions/usa/gemini/flights/gt-7/flight.ts';
import { between, orbitalFlown, orbitalRecord } from '../src/sim/run.ts';
import { length, sub } from '../src/world/frames.ts';

v8.setFlagsFromString('--expose-gc');
const collect = vm.runInNewContext('gc');
const held = () => {
  collect();
  return process.memoryUsage().heapUsed / 2 ** 20;
};

/** The most samples a fourteen-day record run may keep, and the most heap it may hold, MiB (measured when set: 8,916 and 13.2). */
const SAMPLES = 12_000;
const HEAP = 30;

test('a fourteen-day record run is a few thousand samples and a few tens of megabytes', () => {
  const before = held();
  const whole = orbitalFlown(flight);
  const run = orbitalRecord(flight);
  const heap = held() - before;
  const days = run.duration / 86_400;
  console.log(
    `# Gemini VII's record run, ${days.toFixed(2)} days: ${run.samples.length} samples (${whole.coast.samples.length} of the coast), ${heap.toFixed(1)} MiB of heap`,
  );
  assert.ok(days > 13.5, `${days} days`);
  assert.ok(run.samples.length < SAMPLES, `${run.samples.length} samples, ${SAMPLES} allowed`);
  assert.ok(heap < HEAP, `${heap.toFixed(1)} MiB of heap, ${HEAP} allowed`);
  // and it is still the whole flight: a state anywhere in it, a revolution's worth of instants ten days in
  const from = 10 * 86_400;
  let last = between(run.samples, from, (s) => s.centre);
  for (let t = from + 30; t < from + 5400; t += 30) {
    const now = between(run.samples, t, (s) => s.centre);
    const moved = length(sub(now.r, last.r));
    // (30 s of a low orbit: 230 km, give or take the orbit's shape; a curve laid straight across a stretch would stand still or leap)
    assert.ok(moved > 220_000 && moved < 240_000, `${moved} m in 30 s at ${t}`);
    const height = length(now.r) - 6_371_000;
    assert.ok(height > 150_000 && height < 400_000, `${height} m up at ${t}`);
    last = now;
  }
});
