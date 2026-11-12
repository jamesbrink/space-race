// viewer/plantsort.ts: which plants are handed to the GPU in which form. What is drawn is decided
// in the shader from each plant's true distance, so the lists may carry more than is seen but
// never less: however far the eye has gone since they were made (short of the margin), every
// plant inside a band is in that band's list, once, with its own matrix, colour and band.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sequence } from '../src/viewer/field.ts';
import { due, HAND, pack, sort, UNDER } from '../src/viewer/plantsort.ts';

const KINDS = [
  { near: 34, reach: 330 },
  { near: 30, reach: 330 },
  { near: 90, reach: 1800 },
  { near: 30, reach: 260 },
];
const VARIANTS = 3;

/** Tiles of `side` metres on a grid, each with up to `most` plants, every plant numbered (its colour's first number). */
function field(seed, side, across, most) {
  const rnd = sequence(seed);
  const plants = [];
  const tiles = [];
  for (let i = -across; i < across; i++)
    for (let j = -across; j < across; j++) {
      const here = [];
      const n = Math.floor(rnd() * most);
      for (let k = 0; k < n; k++) {
        const x = (i + rnd()) * side,
          y = 4 * rnd(),
          z = (j + rnd()) * side;
        const matrix = Array.from({ length: 16 }, () => rnd());
        matrix[12] = x;
        matrix[13] = y - 0.02;
        matrix[14] = z;
        const plant = {
          species: Math.floor(rnd() * KINDS.length),
          variant: Math.floor(rnd() * VARIANTS),
          thicket: rnd() < 0.4,
          x,
          y,
          z,
          matrix,
          colour: [plants.length, rnd(), rnd()],
        };
        plants.push(plant);
        here.push(plant);
      }
      tiles.push(pack(here));
    }
  return { plants, tiles };
}

const lists = (capacity = 100_000) =>
  KINDS.map(() => {
    const list = () => ({
      matrices: new Float32Array(capacity * 16),
      colours: new Float32Array(capacity * 3),
      bands: new Float32Array(capacity * 4),
      count: 0,
      capacity,
    });
    return { near: Array.from({ length: VARIANTS }, list), far: Array.from({ length: VARIANTS }, list) };
  });

const bandsOf = (p) => {
  const kind = KINDS[p.species];
  const hand = kind.near - HAND;
  const end = p.thicket ? UNDER : [kind.reach * 0.9, kind.reach];
  return { near: [-1, 0, hand, kind.near], far: [hand, kind.near, -end[0], -end[1]] };
};

/** The plants each list should hold for an eye and a margin, the way flora.ts did it before the tiles were packed: one by one. */
function byHand(plants, [ex, ey, ez], margin) {
  const want = new Set();
  for (const p of plants) {
    const d = Math.hypot(p.x - ex, p.y - ey, p.z - ez);
    const b = bandsOf(p);
    if (d < b.near[3] + margin) want.add(`${p.colour[0]} near`);
    if (d > b.far[0] - margin && d < -b.far[3] + margin) want.add(`${p.colour[0]} far`);
  }
  return want;
}

/** What the lists hold: each entry checked against the plant it says it is, and named. `eye`: only those the shader would draw from there. */
function held(all, plants, eye = null) {
  const got = new Set();
  all.forEach((species, k) => {
    for (const form of ['near', 'far'])
      species[form].forEach((list, v) => {
        assert.ok(list.count <= list.capacity);
        for (let i = 0; i < list.count; i++) {
          const p = plants[list.colours[i * 3]];
          assert.equal(p.species, k);
          assert.equal(p.variant, v);
          for (let e = 0; e < 16; e++)
            if (list.matrices[i * 16 + e] !== Math.fround(p.matrix[e])) assert.fail(`plant ${p.colour[0]}: matrix`);
          for (let e = 1; e < 3; e++) if (list.colours[i * 3 + e] !== Math.fround(p.colour[e])) assert.fail(`plant ${p.colour[0]}: colour`);
          const band = bandsOf(p)[form];
          for (let e = 0; e < 4; e++) if (list.bands[i * 4 + e] !== band[e]) assert.fail(`plant ${p.colour[0]}: ${form} band`);
          if (eye) {
            // as the shader has it (flora.ts: PLANT_SWAY): the near form until its band's end, the far form from its band's start to its reach
            const d = Math.hypot(p.x - eye[0], p.y - eye[1], p.z - eye[2]);
            if (form === 'near' ? !(d < band[3]) : !(d > band[0] && d < -band[3])) continue;
          }
          const name = `${p.colour[0]} ${form}`;
          assert.ok(!got.has(name), `${name} is in a list twice`);
          got.add(name);
        }
      });
  });
  return got;
}

const arrange = (tiles, eye, margin, into = lists()) => {
  for (const tile of tiles) sort(tile, eye[0], eye[1], eye[2], margin, KINDS, into);
  return into;
};

test('a tile is packed into batches of one species, variant and thicket, every plant kept, inside its box', () => {
  const { plants, tiles } = field(7, 24, 2, 60);
  let count = 0;
  for (const tile of tiles) {
    const seen = new Set();
    for (const b of tile) {
      const key = `${b.species} ${b.variant} ${b.thicket}`;
      assert.ok(!seen.has(key));
      seen.add(key);
      assert.equal(b.matrices.length, b.count * 16);
      for (let k = 0; k < b.count; k++) {
        const p = plants[b.colours[k * 3]];
        assert.deepEqual([p.species, p.variant, p.thicket], [b.species, b.variant, b.thicket]);
        assert.deepEqual([b.places[k * 3], b.places[k * 3 + 1], b.places[k * 3 + 2]], [p.x, p.y, p.z]);
        assert.ok(p.x >= b.box[0] && p.y >= b.box[1] && p.z >= b.box[2] && p.x <= b.box[3] && p.y <= b.box[4] && p.z <= b.box[5]);
        count++;
      }
    }
  }
  assert.equal(count, plants.length);
});

test('the lists hold exactly the plants sorting one by one would put in them, whatever the margin', () => {
  const { plants, tiles } = field(11, 24, 16, 40);
  const rnd = sequence(3);
  let whole = 0;
  for (const margin of [5, 12, 36]) {
    for (let n = 0; n < 12; n++) {
      const eye = [700 * (rnd() - 0.5), n % 3 === 0 ? 1.7 : 300 * rnd() ** 2, 700 * (rnd() - 0.5)];
      const got = held(arrange(tiles, eye, margin), plants);
      const want = byHand(plants, eye, margin);
      assert.equal(got.size, want.size);
      for (const name of want) assert.ok(got.has(name), `${name} missing at ${eye}, margin ${margin}`);
      whole += got.size;
    }
  }
  assert.ok(whole > 100_000, `${whole}: the field is too thin to say anything`);
});

test('until the eye has gone the margin, what is drawn from the lists is what would be drawn from lists made where it is', () => {
  const { plants, tiles } = field(23, 24, 16, 40);
  const rnd = sequence(5);
  for (const margin of [5, 12, 36]) {
    let made = null,
      at = [1e9, 0, 1e9],
      sorts = 0,
      steps = 0;
    // a walk that turns and climbs, in steps of up to three metres
    const eye = [-60, 1.7, 30];
    let heading = 0.3;
    for (let n = 0; n < 150; n++) {
      heading += 0.4 * (rnd() - 0.5);
      eye[0] += 3 * rnd() * Math.cos(heading);
      eye[2] += 3 * rnd() * Math.sin(heading);
      eye[1] = Math.max(1.7, eye[1] + 2 * (rnd() - 0.45));
      if (due(eye[0], eye[1], eye[2], at[0], at[1], at[2], margin)) {
        made = arrange(tiles, eye, margin);
        at = [...eye];
        sorts++;
      }
      assert.ok(Math.hypot(eye[0] - at[0], eye[1] - at[1], eye[2] - at[2]) < margin);
      const got = held(made, plants, eye);
      const want = byHand(plants, eye, 0); // (no margin: the bands themselves)
      assert.equal(got.size, want.size, `step ${n}, margin ${margin}`);
      for (const name of want) assert.ok(got.has(name), `${name} not drawn at step ${n}, margin ${margin}`);
      steps++;
    }
    assert.ok(sorts < steps / (margin / 4), `${sorts} sorts in ${steps} steps at a margin of ${margin} m`);
  }
});

test('a list that is full takes no more, and nothing is written past its end', () => {
  const { tiles } = field(31, 24, 8, 40);
  const small = lists(50);
  arrange(tiles, [0, 1.7, 0], 12, small);
  let full = 0;
  for (const species of small)
    for (const list of [...species.near, ...species.far]) {
      assert.ok(list.count <= 50);
      if (list.count === 50) full++;
    }
  assert.ok(full > 0);
});
