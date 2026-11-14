// Every wheel stays on what it runs on (types.ts Runs; viewer/runs.ts): checked in the running viewer at each launch site.
//   node tools/wheels-test.mjs [url] [--flight <id>] [--report] [--tolerance <mm>]      (default url: http://localhost:5180/)
// For every flight with a launch site, every `slide` and `drive` that has wheels or says what it runs on (its slider
// moves and its `clocked` ones) is played through its whole move in small steps (every half metre of travel, and at
// least 60), at every level of detail, and at each step each wheel's gap to what it runs on is measured: across its
// tread, centimetre by centimetre along its axle, the lowest point of the wheel there (its true radius about its axle,
// read off its own triangles) against the first surface under it, cast down from half a metre over it, among the meshes
// the move's `runs` names and the land if it runs on the land; where an end of a wheel bears on something named (a rail's
// head), the land beside it (a flange over a flangeway the land only paints) is not counted. A wheel's gap is the least over its tread: positive it hangs
// over what it runs on, negative it is in it. A thing with no wheels (a hut on skids) is measured the same way off the
// lowest of its own vertices in each 10 cm square under it. The worst gap of each move is printed; the test fails if
// any is more than `--tolerance` (default 5 mm) either way, or if something wheeled moves without saying what it runs
// on. `--report` prints and never fails (to measure before a change).
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args.splice(args.indexOf(name), 2)[1] : fallback);
const flag = (name) => (args.includes(name) ? (args.splice(args.indexOf(name), 1), true) : false);
const only = opt('--flight', null);
const tolerance = Number(opt('--tolerance', 5)) / 1000;
const report = flag('--report');
const url = args[0] ?? process.env.SR_URL ?? 'http://localhost:5180/';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/** What of a part's moves are to be checked: a slide or a drive with wheels or with `runs`. */
const flights = [];
for (const file of globSync('missions/*/*/flights/*/flight.ts', { cwd: root })) {
  const { flight } = await import(pathToFileURL(join(root, file)).href);
  if (!flight.surroundings || (only && flight.id !== only)) continue;
  const moving = [];
  flight.models.forEach((model, m) => {
    for (const part of model.parts)
      for (const [clocked, moves] of [
        [false, part.moves ?? []],
        [true, part.clocked ?? []],
      ])
        moves.forEach((move, i) => {
          if (move.kind === 'slide' || move.kind === 'drive') moving.push({ model: m, part: part.node, clocked, index: i });
        });
  });
  if (moving.length) flights.push({ id: flight.id, moving });
}
flights.sort((a, b) => a.id.localeCompare(b.id));

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const fails = [];
const rows = [];
for (const flight of flights) {
  const page = await browser.newPage({ viewport: { width: 800, height: 500 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${url}#${flight.id}/site/pad`);
  await page.waitForFunction(() => window.sr?.stage && document.querySelector('.loading.done'), null, { timeout: 180_000 });
  const result = await page.evaluate(async (moving) => {
    const { stage, clock } = window.sr;
    stage.setAutoRotate(false);
    clock.pause();
    await Promise.allSettled(stage.arriving ?? []);
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { MeshBVH } = await import('/node_modules/three-mesh-bvh/src/index.js');
    const defs = stage.defs;
    const staged = stage.staged;
    const fulls = [...staged.map((s) => s.full), ...(stage.surroundings ? [stage.surroundings] : [])];
    stage.root.updateMatrixWorld(true);
    stage.surroundings?.updateMatrixWorld(true);
    const trees = new Map();
    const tree = (g) => {
      if (!trees.has(g)) trees.set(g, new MeshBVH(g, { indirect: true }));
      return trees.get(g);
    };
    /** The meshes `runs.on` names, across the flight's models and the place, each with its inverse. */
    const surfaceOf = (runs) => {
      const meshes = [];
      for (const spec of runs?.on ?? []) {
        const [name, material] = spec.split('/');
        for (const f of fulls) {
          const node = f.getObjectByName(name);
          node?.traverse((o) => {
            if (!o.isMesh || o.isInstancedMesh) return;
            const m = Array.isArray(o.material) ? o.material[0] : (o.userData.real ?? o.material);
            if (material && !m?.name?.startsWith(material)) return;
            meshes.push({ mesh: o, box: new THREE.Box3().setFromObject(o) });
          });
        }
      }
      return meshes;
    };
    const TURNS = Array.from({ length: 17 }, (_, i) => ((i - 8) * 3 * Math.PI) / 180);
    const ray = new THREE.Ray();
    const DOWN = new THREE.Vector3(0, -1, 0);
    const inv = new THREE.Matrix4();
    const pt = new THREE.Vector3();
    /** The first surface straight down from (x, y, z) among `meshes`, and the land if `ground`. */
    /** The first surface straight down from (x, y, z) among `meshes`; null where there is none. */
    const below = (meshes, x, y, z) => {
      let best = null;
      for (const { mesh, box } of meshes) {
        if (x < box.min.x || x > box.max.x || z < box.min.z || z > box.max.z || box.min.y > y) continue;
        ray.origin.set(x, y, z);
        ray.direction.copy(DOWN);
        ray.applyMatrix4(inv.copy(mesh.matrixWorld).invert());
        const hit = tree(mesh.geometry).raycastFirst(ray, THREE.DoubleSide);
        if (!hit) continue;
        const h = pt.copy(hit.point).applyMatrix4(mesh.matrixWorld).y;
        if (h <= y && (best === null || h > best)) best = h;
      }
      return best;
    };
    /**
     * The least gap over points (each { x, y, z }, its lowest) of one tread: against the highest of what `runs.on` names
     * and the land (if it runs on the land) under each point. Where it bears on something it names (a rail's head), the
     * land is not what it runs on and is not counted (a flange over a flangeway the land only paints); where it bears on
     * the land, both are. Points with nothing under them within half a metre are left out; null if none has anything.
     */
    const gapOf = (points, meshes, ground) => {
      const on = points.map((p) => below(meshes, p.x, p.y + 0.5, p.z));
      const land = points.map((p) => (ground ? stage.groundAt(p.x, p.z) : null));
      const top = (i) => (on[i] === null ? land[i] : land[i] === null ? on[i] : Math.max(on[i], land[i]));
      let high = -Infinity;
      let bearsOn = false;
      points.forEach((_, i) => {
        const h = top(i);
        if (h === null || h <= high) return;
        high = h;
        bearsOn = on[i] !== null && on[i] >= h;
      });
      let gap = null;
      let at = null;
      points.forEach((p, i) => {
        const h = bearsOn ? on[i] : top(i);
        if (h === null || p.y - h > 0.5) return;
        if (gap === null || p.y - h < gap) {
          gap = p.y - h;
          at = { x: +p.x.toFixed(3), z: +p.z.toFixed(3), low: +p.y.toFixed(4), on: on[i], land: land[i] };
        }
      });
      lastAt = at;
      return gap;
    };
    let lastAt = null;
    let lastWhere = null;
    const named = (prefix, name) => name.startsWith(prefix) && /^_?\d+$/.test(name.slice(prefix.length));
    /** Each wheel's own triangles in its frame, its axle and its middle, and its radius centimetre by centimetre: read once a level. */
    const wheelsOf = (object, prefixes, axle) => {
      const out = [];
      object.traverse((o) => {
        if (!prefixes.some((p) => named(p, o.name))) return;
        o.updateWorldMatrix(true, true);
        const toWheel = new THREE.Matrix4().copy(o.matrixWorld).invert();
        const tris = [];
        o.traverse((m) => {
          if (!m.isMesh) return;
          const pos = m.geometry.getAttribute('position');
          const index = m.geometry.getIndex();
          const into = new THREE.Matrix4().multiplyMatrices(toWheel, m.matrixWorld);
          const p = [];
          for (let i = 0; i < pos.count; i++) p.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(into));
          const n = index ? index.count : pos.count;
          for (let i = 0; i < n; i += 3) tris.push([0, 1, 2].map((j) => p[index ? index.getX(i + j) : i + j]));
        });
        if (!tris.length) return;
        const k = axle === 'x' ? 0 : axle === 'y' ? 1 : 2;
        const others = [0, 1, 2].filter((j) => j !== k);
        const lo = [Infinity, Infinity];
        const hi = [-Infinity, -Infinity];
        for (const t of tris)
          for (const v of t)
            others.forEach((j, n) => {
              lo[n] = Math.min(lo[n], v.getComponent(j));
              hi[n] = Math.max(hi[n], v.getComponent(j));
            });
        const mid = others.map((_, n) => (lo[n] + hi[n]) / 2);
        // its radius at each centimetre along its axle: the furthest from the axle its surface comes there, along each
        // edge of its triangles that crosses that centimetre (a lathed tread between two rings has vertices only at them)
        const bins = new Map();
        const rho = (v) => Math.hypot(v.getComponent(others[0]) - mid[0], v.getComponent(others[1]) - mid[1]);
        const put = (u, r) => bins.set(u, Math.max(bins.get(u) ?? 0, r));
        for (const t of tris)
          for (let e = 0; e < 3; e++) {
            const a = t[e];
            const b = t[(e + 1) % 3];
            const ua = a.getComponent(k) * 100;
            const ub = b.getComponent(k) * 100;
            put(Math.round(ua), rho(a));
            if (Math.abs(ub - ua) < 1e-9) continue;
            for (let u = Math.ceil(Math.min(ua, ub)); u <= Math.floor(Math.max(ua, ub)); u++)
              put(u, rho(a.clone().lerp(b, (u - ua) / (ub - ua))));
          }
        const rmax = Math.max(...bins.values());
        const tread = [...bins].filter(([, r]) => r > 0.8 * rmax);
        out.push({ node: o, k, others, mid, tread });
      });
      return out;
    };
    const wheelGap = (w, meshes, ground) => {
      const m = w.node.matrixWorld;
      const axis = new THREE.Vector3().setComponent(w.k, 1).transformDirection(m);
      const drop = Math.sqrt(Math.max(0, 1 - axis.y * axis.y));
      // a wheel set's two ends each on its own rail; a single wheel across its breadth
      const us = w.tread.map(([u]) => u);
      const lo = Math.min(...us);
      const hi = Math.max(...us);
      const sides =
        hi - lo > 60
          ? [
              [lo, (lo + hi) / 2],
              [(lo + hi) / 2, hi + 1],
            ]
          : [[lo, hi + 1]];
      let gap = null;
      for (const [from, to] of sides) {
        // its rim's lowest line, and round its rim ahead and behind to 24 degrees, every 3 (a step's edge)
        const ahead = new THREE.Vector3(-axis.z, 0, axis.x).normalize();
        const points = w.tread
          .filter(([u]) => u >= from && u < to)
          .flatMap(([u, r]) => {
            const c = new THREE.Vector3();
            c.setComponent(w.k, u / 100);
            c.setComponent(w.others[0], w.mid[0]);
            c.setComponent(w.others[1], w.mid[1]);
            c.applyMatrix4(m);
            return TURNS.map((t) => ({
              x: c.x + ahead.x * r * Math.sin(t),
              y: c.y - r * Math.cos(t) * drop,
              z: c.z + ahead.z * r * Math.sin(t),
            }));
          });
        const g = gapOf(points, meshes, ground);
        if (g !== null && (gap === null || g < gap)) {
          gap = g;
          lastWhere = lastAt;
        }
      }
      return gap;
    };
    const boxGap = (object, meshes, ground) => {
      // every face of it that looks down, sampled 10 cm apart (a skid's underside has vertices only at its ends)
      const cells = new Map();
      const put = (v) => {
        const key = `${Math.round(v.x * 10)},${Math.round(v.z * 10)}`;
        const was = cells.get(key);
        if (!was || v.y < was.y) cells.set(key, { x: v.x, y: v.y, z: v.z });
      };
      object.traverse((m) => {
        if (!m.isMesh || !m.visible) return;
        const pos = m.geometry.getAttribute('position');
        const index = m.geometry.getIndex();
        const p = [];
        for (let i = 0; i < pos.count; i++) p.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
        const count = index ? index.count : pos.count;
        for (let i = 0; i + 2 < count; i += 3) {
          const [a, b, c] = [0, 1, 2].map((e) => p[index ? index.getX(i + e) : i + e]);
          const normal = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
          if (normal.y > -0.3 * normal.length() && normal.y < 0.3 * normal.length()) continue; // (a wall's face: its edges are enough)
          const n = Math.max(1, Math.ceil(Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)) / 0.1));
          if (n > 60) {
            put(a);
            put(b);
            put(c);
            continue;
          }
          for (let u = 0; u <= n; u++)
            for (let w = 0; u + w <= n; w++)
              put(
                new THREE.Vector3()
                  .addScaledVector(a, (n - u - w) / n)
                  .addScaledVector(b, u / n)
                  .addScaledVector(c, w / n),
              );
        }
      });
      return gapOf([...cells.values()], meshes, ground);
    };
    const out = [];
    for (const mv of moving) {
      const def = defs[mv.model];
      const part = def.parts.find((p) => p.node === mv.part);
      const move = (mv.clocked ? part.clocked : part.moves)[mv.index];
      const nodeName = move.node ?? part.node;
      const s = staged[mv.model];
      const levels = s.levels.filter(Boolean);
      const runs =
        move.runs ??
        (move.kind === 'slide' ? (mv.clocked ? part.clocked : part.moves).find((m) => m.node === move.node && m.runs)?.runs : null);
      const prefixes = move.kind === 'drive' ? [move.wheels, move.steered] : runs?.wheels ? [runs.wheels] : [`${nodeName}_Wheel_`];
      const axle = move.kind === 'drive' ? move.axle : (runs?.axle ?? 'z');
      const perLevel = levels.map((level) => {
        const object = level.getObjectByName(nodeName);
        return object ? { object, wheels: wheelsOf(object, prefixes, axle) } : null;
      });
      const wheeled = perLevel.some((l) => l?.wheels.length);
      if (!runs && !wheeled) continue; // (a hatch thrown off, people put out of sight: nothing it runs on)
      const meshes = surfaceOf(runs);
      const ground = Boolean(runs?.ground);
      const travel =
        move.kind === 'slide'
          ? Math.hypot(...move.by)
          : move.path.reduce((a, p, i) => a + Math.hypot(p[0] - (move.path[i - 1]?.[0] ?? 0), p[1] - (move.path[i - 1]?.[1] ?? 0)), 0);
      const steps = Math.max(60, Math.ceil(travel / 0.5));
      let worst = 0;
      let worstAt = null;
      let checked = 0;
      const levelWorst = perLevel.map(() => 0);
      for (let i = 0; i <= steps; i++) {
        const at = move.from + ((move.to - move.from) * i) / steps;
        if (mv.clocked) s.clock(at);
        else s.explode(at);
        stage.root.updateMatrixWorld(true);
        perLevel.forEach((l, li) => {
          if (!l) return;
          const whereOf = {};
          const gaps = l.wheels.length
            ? l.wheels.map((w) => {
                const g = wheelGap(w, meshes, ground);
                whereOf[w.node.name] = lastWhere;
                return [w.node.name, g];
              })
            : [[nodeName, boxGap(l.object, meshes, ground)]];
          if (!l.wheels.length) whereOf[nodeName] = lastAt;
          for (const [name, g] of gaps) {
            if (g === null) continue;
            checked++;
            if (Math.abs(g) > Math.abs(levelWorst[li])) levelWorst[li] = g;
            if (Math.abs(g) > Math.abs(worst)) {
              worst = g;
              worstAt = { level: li, wheel: name, at: Number(at.toFixed(4)), step: i, where: whereOf[name] };
            }
          }
        });
      }
      out.push({
        model: def.id,
        node: nodeName,
        kind: move.kind,
        clocked: mv.clocked,
        span: [move.from, move.to],
        travel: Number(travel.toFixed(1)),
        runs: Boolean(runs),
        wheeled,
        worst,
        worstAt,
        levelWorst,
        checked,
      });
    }
    // put the clock and the slider back as the page had them
    for (const st of staged) st.explode(0);
    return out;
  }, flight.moving);
  for (const r of result) {
    const mm = (r.worst * 1000).toFixed(1);
    const tag = `${flight.id} ${r.model}/${r.node} ${r.kind}${r.clocked ? ' (clocked)' : ''} ${r.span.map((v) => +v.toFixed(4)).join('..')} ${r.travel} m`;
    const where = r.worstAt
      ? ` at ${r.worstAt.at} (level ${r.worstAt.level}, ${r.worstAt.wheel}${process.env.WHERE ? ` ${JSON.stringify(r.worstAt.where)}` : ''})`
      : '';
    const levels = r.levelWorst.map((g) => (g * 1000).toFixed(1)).join(' / ');
    console.log(`${tag}: worst ${mm} mm${where}; by level ${levels}${r.checked ? '' : ' (nothing under it found)'}`);
    rows.push({ flight: flight.id, ...r });
    if (!r.runs && r.wheeled) fails.push(`${tag}: it has wheels and says nothing of what it runs on`);
    else if (Math.abs(r.worst) > tolerance)
      fails.push(`${tag}: a wheel is ${mm} mm ${r.worst > 0 ? 'over' : 'into'} what it runs on${where}`);
    else if (!r.checked) fails.push(`${tag}: nothing it runs on was found under it`);
  }
  if (errors.length) fails.push(`${flight.id}: page errors: ${errors.slice(0, 3).join(' | ')}`);
  await page.close();
}
await browser.close();
for (const f of fails) console.log(`  ${report ? 'over' : 'FAIL'} ${f}`);
console.log(
  fails.length
    ? `\n${fails.length} ${report ? 'over tolerance (report only)' : 'failed'}`
    : `\nevery wheel within ${tolerance * 1000} mm: ${rows.length} moves`,
);
process.exit(fails.length && !report ? 1 : 0);
