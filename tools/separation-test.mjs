// Read the positions of the actual GLB nodes in the flight viewer, after the stage has drawn the clock's requested instant.
// pnpm test:separation [url] [--flight usa/gemini/gt-3]
import assert from 'node:assert/strict';
import { launch, open, opt, url } from './browser.mjs';

const args = process.argv.slice(2);
const only = opt(args, '--flight', null);
const base = url(args);
const cases = [
  ['usa/apollo/apollo-7', 'SaturnFirstStage'],
  ['usa/apollo/apollo-7', 'LaunchEscape'],
  ['usa/apollo/apollo-7', 'ServiceModule'],
  ['usa/apollo/apollo-7', 'ForwardShield'],
  ['ussr/vostok/vostok-1', 'Fairing_Left', 'Fairing_Right'],
  ['ussr/voskhod/voskhod-2', 'Fairing_Left', 'Fairing_Right'],
  ['ussr/voskhod/voskhod-2', 'AftSection_1', 'AftSection_2'],
  ['ussr/voskhod/voskhod-2', 'AftSection_2', 'AftSection_3'],
  ['ussr/voskhod/voskhod-2', 'Airlock'],
  ['ussr/soyuz/soyuz-3', 'ParachuteCover'],
  ['ussr/soyuz/soyuz-t-2', 'ParachuteCover'],
  ['usa/gemini/gt-3', 'NoseFairing', 'ScannerFairing'],
  ['usa/gemini/gt-3', 'EquipmentSection'],
  ['usa/gemini/gt-3', 'RetroSection'],
  ['usa/gemini/gt-3', 'RendezvousRecovery'],
  ['usa/mercury/ma-6-friendship-7', 'EscapeTower'],
  ['usa/mercury/ma-6-friendship-7', 'AtlasAdapter'],
  ['usa/mercury/ma-6-friendship-7', 'Retropack'],
  ['usa/mercury/ma-6-friendship-7', 'AntennaCanister'],
];
const flights = [...new Set(cases.map(([flight]) => flight))].filter((f) => !only || f === only);
assert.ok(flights.length, `no separation checks for ${only}`);
const browser = await launch();
try {
  for (const flight of flights) {
    const { page, close, errors } = await open(browser, `${base}#${flight}/site/vehicle`, { timeout: 180000 });
    try {
      for (const [, first, second] of cases.filter(([id]) => id === flight)) {
        const at = await page.evaluate((node) => window.sr.stage.show.ascent.drops.find((d) => d.nodes.includes(node))?.at, first);
        assert.ok(Number.isFinite(at), `${flight} has no drop for ${first}`);
        const gaps = [];
        const adapter = first === 'AtlasAdapter';
        for (const dt of adapter ? [0.1, 5, 60] : [0.1, 2]) {
          const t = at + dt;
          await page.evaluate((t) => {
            window.sr.clock.pause();
            window.sr.clock.seek(t);
          }, t);
          await page.waitForFunction((t) => Math.abs(window.sr.stage.lifted.t - t) < 1e-6, t, { timeout: 90000 });
          const gap = await page.evaluate(
            ({ first, second }) => {
              const { stage } = window.sr;
              const piece = (name) => stage.debris.find((d) => d.node.name === name && d.holder.visible);
              const a = piece(first);
              const b = second ? piece(second) : null;
              if (!a || (second && !b)) return null;
              if (first === 'AtlasAdapter') {
                const { flight } = window.sr;
                const body = flight.plan.craft[0].sheds.find((d) => d.on === 'adapter-clamp');
                const rim = stage.main.position.clone().set(0, body.to.value - flight.flies.datum, 0);
                const detached = a.holder.matrix.clone().multiply(a.rel.clone().invert());
                const axis = rim.clone().set(0, 1, 0).transformDirection(detached);
                return rim.clone().applyMatrix4(stage.main.matrix).sub(rim.applyMatrix4(detached)).dot(axis);
              }
              // The holder includes the mesh's original transform. Remove it to compare the two placements of the same
              // model coordinate, so moving thousands of kilometres together cannot look like relative separation.
              const point = (d) =>
                stage.main.position.clone().setFromMatrixPosition(d.holder.matrix.clone().multiply(d.rel.clone().invert()));
              return point(a).distanceTo(b ? point(b) : stage.main.position);
            },
            { first, second },
          );
          assert.ok(gap !== null, `${first} or ${second ?? 'the vehicle'} invisible at T+${t}`);
          gaps.push(gap);
        }
        assert.ok(
          gaps[0] >= 0 && gaps.every((g, i) => i === 0 || g > gaps[i - 1] + 0.1),
          `${first} / ${second ?? 'spacecraft'}: ${gaps} m`,
        );
        console.log(
          `${flight} ${first} / ${second ?? 'spacecraft'}: ${adapter ? 'signed rim clearance' : 'measured model offsets'} ${gaps.map((g) => g.toFixed(2)).join(' → ')} m`,
        );
      }
      assert.deepEqual(errors, []);
    } finally {
      await close();
    }
  }
} finally {
  await browser.close();
}
