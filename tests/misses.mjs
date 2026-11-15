// One rule for holding a run to its checks, for every simulator: src/sim/misses.ts is the one table of misses.
import assert from 'node:assert/strict';
import { MISSES } from '../src/sim/misses.ts';

/** The misses recorded for a flight's (or a fixture's) run: by check id. */
export const missesOf = (id, run) => MISSES[id]?.[run] ?? {};

/**
 * Hold a run's figures to checks (`{ id, value, tolerance, label?, unit? }`; `value(id)` is what the run gives): every
 * figure outside its tolerance must be in `misses` with how far out it is (`by`, a fraction of the check's value, or in
 * its unit where `absolute`), give or take `slack`; the test fails on a miss nobody recorded, on one that has moved past
 * its slack, on one that has come within tolerance (take it off), on a check the run gives no figure for, and on a miss
 * that names no check. Each check is said through `log`, a miss with its reason.
 */
export function holdChecks(checks, value, misses = {}, { name = '', log = (line) => console.log(`  #   ${line}`) } = {}) {
  const wrong = [];
  const said = (c) => (name ? `${name}, ${c.id}` : c.id);
  for (const c of checks) {
    const got = value(c.id);
    if (!Number.isFinite(got)) {
      wrong.push(`${said(c)}: the run gives no figure`);
      continue;
    }
    const out = got - c.value;
    const within = Math.abs(out) <= c.tolerance;
    const miss = misses[c.id];
    const unit = c.unit ? ` ${c.unit}` : '';
    const line = `${c.label ?? c.id}: ${got.toPrecision(6)}${unit} against ${c.value.toPrecision(6)} ± ${c.tolerance}, out by ${out.toPrecision(4)}${c.value ? ` (${((out / c.value) * 100).toFixed(1)} %)` : ''}`;
    if (within) {
      if (miss) wrong.push(`${said(c)} is within its tolerance now: take it off the misses (src/sim/misses.ts). ${line}`);
      log(`holds  ${line}`);
      continue;
    }
    if (!miss) {
      wrong.push(`${said(c)} misses and no reason is recorded (src/sim/misses.ts). ${line}`);
      log(`MISSES ${line}`);
      continue;
    }
    const measured = miss.absolute ? out : out / c.value;
    if (Math.abs(measured - miss.by) > miss.slack)
      wrong.push(
        `${said(c)}: the miss has moved from the ${miss.by} recorded, give or take ${miss.slack}, to ${measured.toPrecision(4)}. ${line}`,
      );
    log(`MISSES ${line}: ${miss.why}`);
  }
  for (const id of Object.keys(misses))
    if (!checks.some((c) => c.id === id)) wrong.push(`the misses name ${id}${name ? ` for ${name}` : ''}, which is not a check`);
  assert.deepEqual(wrong, []);
}
