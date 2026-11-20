// SA-503's stage interfaces and payload against MSFC-MAN-503 and the mission's own exhibit figures.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { flight } from '../missions/usa/apollo/flights/apollo-8/flight.ts';
import { framesOf } from './glb.mjs';

const model = flight.models[0];
const inch = 0.0254;
const spec = (label) => {
  const entry = flight.specs.find((s) => s.label === label);
  assert.ok(entry, label);
  return entry.value;
};
const close = (value, expected, label) => assert.ok(Math.abs(value - expected) < 0.001, `${label}: ${value} m, expected ${expected} m`);

for (const suffix of ['', '.lod1', '.lod2']) {
  test(`Apollo 8: fin tips, stage joins and adapter payload at ${suffix || 'full detail'}`, () => {
    const file = fileURLToPath(new URL(`../public/${model.url.replace(/\.glb$/, `${suffix}.glb`)}`, import.meta.url));
    const frames = framesOf(file);
    const first = frames.box('SaturnFirstStage');
    const collar = frames.box('LowerInterstage');
    const taper = frames.box('SaturnInterstage');
    const ring = frames.box('InstrumentUnit');
    const adapter = frames.box('SpacecraftAdapter');
    const ballast = frames.box('LunarTestArticle');

    // (the first stage and its engines stand indexed on the launcher, turned about the axis: lunar_stack.py
    // `index_on_launcher`; their spans are measured in their own frames)
    const fins = frames.box('SaturnFirstStage', 'SaturnFirstStage');
    for (const axis of [0, 2]) {
      close(fins.hi[axis] - fins.lo[axis], spec('S-IC fin span'), 'opposed fins');
      close(taper.hi[axis] - taper.lo[axis], spec('S-IC body diameter'), 'wide end of taper');
      close(ring.hi[axis] - ring.lo[axis], spec('S-IVB body diameter'), 'instrument ring');
    }
    for (let engine = 1; engine <= 5; engine++) {
      const bell = frames.box(`F1_Mount_${engine}`, `F1_Mount_${engine}`);
      for (const axis of [0, 2]) close(bell.hi[axis] - bell.lo[axis], spec('F-1 maximum nozzle exit diameter'), 'F-1 mouth');
    }
    // The outboard engines stand out on the thrust posts and every engine reaches up to the foot of the
    // thrust structure, 233.7 in below the RP-1 tank's aft rim (MSFC-MAN-503 Fig. 4-1; saturn-v.md), at every level.
    for (let engine = 1; engine <= 4; engine++) {
      const [x, , z] = frames.point(`F1_Mount_${engine}`);
      close(Math.hypot(x, z), 182 * inch, 'outboard F-1 on its 364 in circle');
    }
    close(
      frames.box('FirstStageEngines').hi[1],
      (115 + 749 - 517 + 120 - 233.7) * inch,
      'the engines reach the foot of the thrust structure',
    );
    assert.ok(frames.box('FirstStageEngines').hi[1] > (100 + 115) * inch, 'the heat shield is forward of the gimbal plane');
    const grille = frames.box('LTAB_EndGrid');
    assert.ok(
      grille.lo[1] > ballast.lo[1] && grille.lo[1] < grille.hi[1] && grille.hi[1] < ballast.hi[1],
      'forward grille sits recessed in the rim',
    );
    // MSFC-MAN-503 pp. 5-2, 5-24. The base is at STA −115, below vehicle zero.
    close(first.hi[1], (1564 + 115) * inch, 'S-IC first separation');
    close(collar.lo[1], first.hi[1], 'interstage on S-IC');
    close(collar.hi[1], (1760 + 115) * inch, 'interstage second separation');
    close(taper.lo[1], (2519 + 115) * inch, 'S-II forward station');
    close(taper.hi[1], frames.box('SaturnThirdStage').lo[1], 'narrow end of taper');
    close(adapter.lo[1], ring.hi[1], 'adapter on instrument ring');
    close(adapter.hi[1] - adapter.lo[1], spec('Adapter length'), 'adapter axial length');
    assert.ok(
      ballast.lo[1] > adapter.lo[1] && ballast.hi[1] < frames.box('ServiceEngine').lo[1],
      'LTA-B sits below the SPS bell inside SLA-11',
    );
    for (let i = 0; i < 4; i++) close(frames.point(`SLA_Door_${i}`)[1] - adapter.lo[1], 7 * 12 * inch, 'petal pivot above fixed adapter');
  });
}

test('Apollo 8: the tank domes clear the engines and adjacent tanks in the cutaway', () => {
  const frames = framesOf(fileURLToPath(new URL(`../public/${model.url}`, import.meta.url)));
  const bounds = (name) => {
    const box = frames.box(name);
    assert.ok(box.hi[1] > box.lo[1], name);
    return box;
  };
  // Lower-stage domes are visible only in the full-detail cutaway. Check their actual exported surfaces.
  const fuel = bounds('SIC_FuelTank');
  const lox = bounds('SIC_OxidizerTank');
  const sii = bounds('SecondStageTankStructure');
  assert.ok(bounds('FirstStageEngines').hi[1] < fuel.lo[1], 'F-1 equipment below RP-1 aft dome');
  assert.ok(fuel.hi[1] < lox.lo[1], 'independent S-IC tank domes have space between them');
  close(lox.lo[1], (772 + 115) * inch, 'S-IC oxygen crown, D5-15782 Fig 1-1');
  const cluster = bounds('SecondStageEngines');
  assert.ok(lox.hi[1] < cluster.lo[1] && cluster.hi[1] < sii.lo[1], 'all five S-II engines fit between the stages’ tanks');
  const third = bounds('ThirdStageEngine');
  assert.ok(sii.hi[1] < third.lo[1], 'S-II forward dome clears the S-IVB bell');
  assert.ok(third.hi[1] < bounds('SIVB_AftTankDome').lo[1], 'S-IVB engine below its aft dome');
});
