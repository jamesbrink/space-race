// A vehicle that was laid on its azimuth by turning the launcher's table (Mercury-Redstone: sites/lc-5.md, "Which way
// round the vehicle stood") stands turned in the scene, and three things must then agree: the turn the flight gives its
// vehicle (`rotationY`), the turn its pad was built with (the launcher's `turn`, the cable masts' places) and the
// azimuth it flew, which the capsule's periscope must lie on.
import assert from 'node:assert/strict';
import { existsSync, globSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEG = Math.PI / 180;
const FT = 0.3048;
/** How near the periscope's objective must lie to the flight's azimuth, degrees: the model has it on the meridian itself. */
const ON_AZIMUTH = 2;
/** Where the two cable masts stand round the vehicle (lc5/site.py `MASTS`): degrees from the hatch's middle, feet from the axis. */
const MASTS = { UmbilicalMast: [115, 3.55], BoosterMast: [241, 3.7] };

/** A GLB's nodes with each one's place in the model's own frame (metres; +Y up), from its JSON chunk. */
function placed(file) {
  const glb = readFileSync(file);
  const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  const parent = new Map();
  gltf.nodes.forEach((n, i) => {
    for (const c of n.children ?? []) parent.set(c, i);
  });
  const turned = ([x, y, z], [qx, qy, qz, qw]) => {
    // v + 2 q x (q x v + w v)
    const cx = qy * z - qz * y + qw * x;
    const cy = qz * x - qx * z + qw * y;
    const cz = qx * y - qy * x + qw * z;
    return [x + 2 * (qy * cz - qz * cy), y + 2 * (qz * cx - qx * cz), z + 2 * (qx * cy - qy * cx)];
  };
  const at = (i) => {
    let p = [0, 0, 0];
    for (let k = i; k !== undefined; k = parent.get(k)) {
      const n = gltf.nodes[k];
      if (k !== i && n.rotation) p = turned(p, n.rotation);
      if (k !== i) p = p.map((v, j) => v + (n.translation?.[j] ?? 0));
      else p = [...(n.translation ?? [0, 0, 0])];
    }
    return p;
  };
  return new Map(gltf.nodes.map((n, i) => [n.name, { at: at(i), extras: n.extras ?? {} }]));
}
/** Degrees round from +X toward the model's +Y as Blender has it (the viewer's -Z): anticlockwise from above. */
const round = ([x, , z]) => (((Math.atan2(-z, x) / DEG) % 360) + 360) % 360;
/** The least angle between two directions, degrees. */
const apart = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

for (const file of globSync('missions/*/*/flights/*/flight.ts', { cwd: root })) {
  const { flight } = await import(pathToFileURL(join(root, file)).href);
  const pad = flight.models.find((m) => m.id === 'pad');
  const vehicle = flight.models.find((m) => m.id === 'vehicle');
  const padGlb = pad && join(root, 'public', pad.url);
  if (!pad || !vehicle || !existsSync(padGlb)) continue;
  const turn = placed(padGlb).get('LaunchPedestal')?.extras.turn;
  if (turn === undefined) continue; // a launcher that was not turned to an azimuth
  const azimuth = flight.trajectory?.azimuth.value ?? flight.specs.find((s) => s.label === 'Launch azimuth')?.value;

  test(`${flight.id}: the vehicle stands as its launcher is turned`, () => {
    assert.ok(
      Math.abs((vehicle.rotationY ?? 0) / DEG - turn) < 0.01,
      `the vehicle is turned ${(vehicle.rotationY ?? 0) / DEG}, the launcher ${turn}`,
    );
    const spec = flight.specs.find((s) => s.label === 'Vehicle turned on the launcher');
    assert.ok(spec, 'no spec says how the vehicle stood on the launcher');
    assert.equal(spec.value, turn);
    assert.equal(spec.confidence, 'derived', 'the turn is worked from the azimuth and the site’s bearing: derived, no more');
  });

  for (const level of ['', '.lod1', '.lod2']) {
    const glb = padGlb.replace(/\.glb$/, `${level}.glb`);
    test(`${flight.id}: the cable masts stand round the vehicle as it is turned (pad${level})`, () => {
      const nodes = placed(glb);
      assert.equal(nodes.get('LaunchPedestal')?.extras.turn, turn, 'this level of detail was built with another turn');
      for (const [name, [degrees, feet]] of Object.entries(MASTS)) {
        const p = nodes.get(name)?.at;
        assert.ok(p, `no ${name}`);
        assert.ok(apart(round(p), degrees + turn) < 0.05, `${name} stands ${round(p).toFixed(2)} round, not ${degrees} + ${turn}`);
        assert.ok(
          Math.abs(Math.hypot(p[0], p[2]) / FT - feet) < 0.005,
          `${name} is ${(Math.hypot(p[0], p[2]) / FT).toFixed(3)} ft from the axis`,
        );
      }
    });
  }

  test(`${flight.id}: the periscope lies on the launch azimuth`, () => {
    assert.ok(azimuth !== undefined, 'the flight gives no azimuth');
    const objective = placed(join(root, 'public', vehicle.url)).get('Periscope_Objective')?.at;
    assert.ok(objective, 'no Periscope_Objective in the vehicle');
    // the site's +X bears `bearingX`, and its angles fall on the compass as they grow
    const bears = flight.site.bearingX.value - (round(objective) + (vehicle.rotationY ?? 0) / DEG);
    assert.ok(apart(bears, azimuth) < ON_AZIMUTH, `the periscope bears ${((bears % 360) + 360) % 360}, the azimuth is ${azimuth}`);
    // and the side the simulator keeps toward the Earth is then the one that lay down range: half a turn from the body's +Z
    const earthward = flight.trajectory?.body?.capsule.earthward;
    if (earthward) assert.equal(earthward.value, 180);
  });
}
