// The share of a long list one run takes, so that a test that flies every flight can be split over several runners.
// SR_PART="2/6" keeps every sixth item beginning with the second; unset, the whole list (what `pnpm test` runs). The
// parts are disjoint and together are the list, whatever its length, so a flight added later is in exactly one of them.

/** @template T @param {T[]} list @param {string | undefined} [which] */
export function part(list, which = process.env.SR_PART) {
  if (!which) return list;
  const m = /^(\d+)\/(\d+)$/.exec(which);
  if (!m) throw new Error(`SR_PART is "${which}": it should be like 2/6`);
  const [i, n] = [Number(m[1]), Number(m[2])];
  if (i < 1 || i > n) throw new Error(`SR_PART is "${which}": the first number runs from 1 to the second`);
  return list.filter((_, k) => k % n === i - 1);
}
