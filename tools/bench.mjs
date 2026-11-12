// The performance benchmark: what a frame costs, what the page weighs and how long it takes to open.
//   node tools/bench.mjs [--out <dir>] [--label <name>] [--reps 3] [--frames 90] [--only <regex>]
//                        [--sizes 1440x900@1,1440x900@2,390x800@3] [--looks real,cel]
//                        [--no-build] [--profile] [--shots <dir>] [--no-load] [--no-soak] [--query <search>]
//   node tools/bench.mjs --compare old.json new.json      what moved by more than the noise
//   node tools/bench.mjs --diff-shots <dir a> <dir b>     pixels that differ between two --shots runs
//
// It builds the production bundle into node_modules/.bench/dist and serves it with `vite preview` on a free port of
// its own (never the dev server), in Chrome with vsync and the frame-rate limit off. Nothing in the page knows it is
// being measured: the script reaches in through `window.sr`, stops the page's own loop and turns it over by hand,
// one frame at a time with a fixed step of 1/60 s, so the clock, the camera and the walk are the same on every run
// whatever the machine is doing. A frame's cost is the time from calling the stage's `frame()` to the GPU having
// finished it (one pixel read back: `gl.finish()` does not wait in Chrome).
//
// For each scenario: the mean frame, the 99th percentile (the "1 % low"), the worst, draw calls, triangles, programs,
// textures, geometries, the cost of a frame in which the shadow map is drawn again, and the time in each of the
// composer's passes (each bracketed the same way, on frames of their own so the brackets cost the others nothing).
// Each scenario is run `--reps` times, the repeats spread through the run; the table shows the median of the repeats
// and their spread, and `--compare` calls a change real only when it is larger than both runs' spread.
//
// `load` opens the page cold, three times: when the first frame was drawn and the page said it was ready, what
// `Stage.load` and `Stage.warm` took, the bytes fetched by kind (as served, and as GitHub Pages would gzip them), the
// number of shader programs and how long the page stood blocked on compiling them, and the peak JavaScript heap.
// `soak` runs the record's flight for 60 s on the page's own loop and counts the hitches and the garbage collections.
// `--profile` adds a CPU profile of each scenario (top self-time functions) from a build that is not minified.
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? Boolean(args.splice(args.indexOf(name), 1)) : false);
const opt = (name, fallback) => (args.includes(name) ? args.splice(args.indexOf(name), 2)[1] : fallback);

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : Number.NaN;
};
const spreadOf = (a) => (a.length ? (Math.max(...a) - Math.min(...a)) / 2 : 0);
const fix = (v, n = 2) => (v === undefined || v === null || Number.isNaN(v) ? '–' : Number(v).toFixed(n));
const table = (rows) => {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i] ?? '').length)));
  return rows
    .map((r) => r.map((c, i) => (i ? String(c ?? '').padStart(widths[i]) : String(c ?? '').padEnd(widths[i]))).join('  '))
    .join('\n');
};

// ---------------------------------------------------------------------------------------------------------------
// --compare old.json new.json
// ---------------------------------------------------------------------------------------------------------------

/** The figures of one scenario that are compared: [key, label, exact]. An exact one (a count) is flagged at any change. */
const FIGURES = [
  ['ms', 'frame ms', false],
  ['p99', '1 % low ms', false],
  ['worst', 'worst ms', false],
  ['shadowMs', 'shadow frame ms', false],
  ['raf', 'own loop ms', false],
  ['calls', 'calls', true],
  ['shadowCalls', 'shadow calls', true],
  ['triangles', 'triangles', true],
  ['programs', 'programs', true],
  ['textures', 'textures', true],
  ['geometries', 'geometries', true],
];

function compare(oldFile, newFile) {
  const a = JSON.parse(readFileSync(oldFile, 'utf8'));
  const b = JSON.parse(readFileSync(newFile, 'utf8'));
  const rows = [['scenario', 'figure', 'old', '±', 'new', '±', 'change', '']];
  let worse = 0;
  let better = 0;
  for (const key of Object.keys(b.scenarios)) {
    const o = a.scenarios[key];
    const n = b.scenarios[key];
    if (!o) continue;
    for (const [id, label, exact] of FIGURES) {
      const x = o[id];
      const y = n[id];
      if (!x || !y || Number.isNaN(x.median) || Number.isNaN(y.median)) continue;
      const by = y.median - x.median;
      const noise = exact ? 0 : Math.max(x.spread + y.spread, 0.05 * x.median, 0.05);
      if (Math.abs(by) <= noise) continue;
      const verdict = by > 0 ? 'WORSE' : 'better';
      if (by > 0) worse++;
      else better++;
      const pct = x.median ? `${by > 0 ? '+' : ''}${((by / x.median) * 100).toFixed(1)} %` : '';
      rows.push([
        key,
        label,
        fix(x.median, exact ? 0 : 2),
        fix(x.spread, exact ? 0 : 2),
        fix(y.median, exact ? 0 : 2),
        fix(y.spread, exact ? 0 : 2),
        pct,
        verdict,
      ]);
    }
  }
  const load = (r) => r.load ?? {};
  for (const [id, label] of [
    ['ready', 'load: ready ms'],
    ['firstFrame', 'load: first frame ms'],
    ['models', 'load: models on stage ms'],
    ['warmMs', 'load: Stage.warm ms'],
    ['compileMs', 'load: compile ms'],
    ['bytes', 'load: bytes'],
    ['pagesBytes', 'load: bytes as Pages serves'],
    ['requests', 'load: requests'],
    ['programs', 'load: programs'],
    ['heapPeak', 'load: heap peak MB'],
  ]) {
    for (const net of Object.keys(load(b))) {
      const x = load(a)[net]?.[id];
      const y = load(b)[net]?.[id];
      if (!x || !y) continue;
      const by = y.median - x.median;
      if (Math.abs(by) <= Math.max(x.spread + y.spread, 0.03 * Math.abs(x.median))) continue;
      const pct = x.median ? `${by > 0 ? '+' : ''}${((by / x.median) * 100).toFixed(1)} %` : '';
      rows.push([
        `load/${net}`,
        label,
        fix(x.median, 0),
        fix(x.spread, 0),
        fix(y.median, 0),
        fix(y.spread, 0),
        pct,
        by > 0 ? 'WORSE' : 'better',
      ]);
      if (by > 0) worse++;
      else better++;
    }
  }
  console.log(`${a.label} (${a.when}) against ${b.label} (${b.when})`);
  console.log(rows.length > 1 ? table(rows) : 'nothing moved by more than the noise');
  console.log(
    `\n${better} better, ${worse} worse (a time is flagged when it moved by more than both runs' spread and 5 %; a count at any change)`,
  );
  return worse;
}

if (args[0] === '--compare') {
  process.exit(compare(args[1], args[2]) ? 1 : 0);
}

// ---------------------------------------------------------------------------------------------------------------
// the browser
// ---------------------------------------------------------------------------------------------------------------

const CHROME = [
  '--use-angle=metal',
  '--enable-gpu',
  '--ignore-gpu-blocklist',
  '--disable-gpu-vsync',
  '--disable-frame-rate-limit',
  '--enable-precise-memory-info',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
];

async function diffShots(dirA, dirB) {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  const rows = [['shot', 'pixels', 'differ', 'by 1 level', 'most', 'verdict']];
  let failed = 0;
  for (const name of readdirSync(dirA)
    .filter((f) => f.endsWith('.png'))
    .sort()) {
    let other;
    try {
      other = readFileSync(join(dirB, name)).toString('base64');
    } catch {
      continue;
    }
    const mine = readFileSync(join(dirA, name)).toString('base64');
    const d = await page.evaluate(
      async ([a, b]) => {
        const data = async (b64) => {
          const img = new Image();
          img.src = `data:image/png;base64,${b64}`;
          await img.decode();
          const c = new OffscreenCanvas(img.width, img.height);
          const g = c.getContext('2d');
          g.drawImage(img, 0, 0);
          return g.getImageData(0, 0, img.width, img.height);
        };
        const [x, y] = [await data(a), await data(b)];
        if (x.width !== y.width || x.height !== y.height) return { pixels: x.width * x.height, differ: -1, one: 0, most: 0 };
        let differ = 0;
        let one = 0;
        let most = 0;
        for (let i = 0; i < x.data.length; i += 4) {
          const by = Math.max(
            Math.abs(x.data[i] - y.data[i]),
            Math.abs(x.data[i + 1] - y.data[i + 1]),
            Math.abs(x.data[i + 2] - y.data[i + 2]),
          );
          if (by) differ++;
          if (by === 1) one++;
          most = Math.max(most, by);
        }
        return { pixels: x.width * x.height, differ, one, most };
      },
      [mine, other],
    );
    const verdict = d.differ === 0 ? 'identical' : d.differ < 0 ? 'SIZES DIFFER' : d.most <= 1 ? 'rounding' : 'DIFFERENT';
    if (verdict === verdict.toUpperCase()) failed++;
    rows.push([name, d.pixels, d.differ, d.one, d.most, verdict]);
  }
  await browser.close();
  console.log(table(rows));
  return failed;
}

if (args[0] === '--diff-shots') {
  process.exit((await diffShots(args[1], args[2])) ? 1 : 0);
}

const out = resolve(opt('--out', join(ROOT, 'node_modules/.bench/results')));
const label = opt('--label', 'run');
const REPS = Number(opt('--reps', 3));
const FRAMES = Number(opt('--frames', 90));
const only = new RegExp(opt('--only', '.'));
const sizes = opt('--sizes', '1440x900@1,1440x900@2,390x800@3')
  .split(',')
  .map((s) => {
    const [, w, h, r] = /^(\d+)x(\d+)@(\d+(?:\.\d+)?)$/.exec(s) ?? [];
    if (!w) throw new Error(`a size is <width>x<height>@<pixel ratio>, not ${s}`);
    return { name: s, width: Number(w), height: Number(h), ratio: Number(r) };
  });
const looks = opt('--looks', 'real,cel').split(',');
const profile = flag('--profile');
const shots = opt('--shots', null);
const noBuild = flag('--no-build');
const noLoad = flag('--no-load');
const noSoak = flag('--no-soak');
const SOAK = Number(opt('--soak', 60));
const query = opt('--query', ''); // added to the page's address: a switch the page reads (`?plain`), for an A/B within one build
mkdirSync(out, { recursive: true });
if (shots) mkdirSync(shots, { recursive: true });

const DIST = join(ROOT, 'node_modules/.bench', profile ? 'dist-profile' : 'dist');
const vite = join(ROOT, 'node_modules/.bin/vite');

function run(cmd, argv) {
  return new Promise((done, fail) => {
    const p = spawn(cmd, argv, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let text = '';
    p.stdout.on('data', (d) => (text += d));
    p.stderr.on('data', (d) => (text += d));
    p.on('exit', (code) => (code ? fail(new Error(`${cmd} ${argv.join(' ')}\n${text}`)) : done(text)));
  });
}

const freePort = () =>
  new Promise((done) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => done(port));
    });
  });

if (!noBuild) {
  process.stderr.write('building…\n');
  await run(vite, ['build', '--outDir', DIST, '--emptyOutDir', ...(profile ? ['--minify', 'false'] : [])]);
}
const port = await freePort();
const server = spawn(vite, ['preview', '--outDir', DIST, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
});
const stop = () => server.kill();
process.on('exit', stop);
process.on('SIGINT', () => process.exit(130));
const URL_ = `http://127.0.0.1:${port}/`;
for (let i = 0; ; i++) {
  try {
    if ((await fetch(URL_)).ok) break;
  } catch {}
  if (i > 100) throw new Error('vite preview did not start');
  await new Promise((r) => setTimeout(r, 100));
}

/** What the files of the build weigh, as they are and as GitHub Pages serves them (it gzips text, scripts, JSON and wasm; not models or images). */
function weigh(dir, base = dir, found = {}) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) weigh(path, base, found);
    else {
      const bytes = readFileSync(path);
      const zipped = /\.(js|mjs|css|html|json|svg|wasm|txt|xml)$/.test(name) ? gzipSync(bytes, { level: 6 }).length : bytes.length;
      found[path.slice(base.length)] = { raw: bytes.length, pages: zipped };
    }
  }
  return found;
}
const weights = weigh(DIST);
const KIND = {
  '.js': 'script',
  '.css': 'style',
  '.html': 'page',
  '.glb': 'model',
  '.png': 'map',
  '.json': 'data',
  '.wasm': 'wasm',
  '.svg': 'image',
  '.ktx2': 'map',
};

// ---------------------------------------------------------------------------------------------------------------
// in the page
// ---------------------------------------------------------------------------------------------------------------

/** Installed in the page once it is ready: `window.__bench`. Everything it touches is the page's own, through `window.sr`. */
function inPage(DT) {
  const sr = window.sr;
  const st = sr.stage;
  const r = st.renderer;
  const gl = r.getContext();
  const V3 = st.camera.position.constructor;
  const px = new Uint8Array(4);
  const now = () => performance.now();
  /** Wait for the GPU: everything asked of it so far is done when this returns. */
  // (`gl.finish()` does not wait in Chrome; reading a pixel back does. It is read from a buffer of the script's own, so it
  // can be asked for between passes, whatever the page has bound: a multisampled or float buffer cannot be read.)
  const probe = gl.createFramebuffer();
  const probeTexture = gl.createTexture();
  {
    const tex = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const fb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    gl.bindTexture(gl.TEXTURE_2D, probeTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, probe);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, probeTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  }
  const sync = () => {
    const read = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    const pack = gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING);
    if (pack) gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, probe);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, read);
    if (pack) gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pack);
  };
  const turn = () =>
    new Promise((done) => {
      const c = new MessageChannel();
      c.port1.onmessage = () => done();
      c.port2.postMessage(0);
    });
  // the page's time is the script's: every frame is a sixtieth of a second, however long it took
  st.timer.getDelta = () => DT;
  const own = () => r.setAnimationLoop(null);
  const loose = () => r.setAnimationLoop(() => st.frame());
  own();

  // the composer's passes, by what they are (the build has no names left)
  const passes = st.composer.passes.map((p, i) => {
    let name = `pass${i}`;
    if (p === st.backdropPass) name = 'sky';
    else if (p === st.clouds) name = 'clouds';
    else if (p === st.clouds.mark) name = 'depth';
    else if (p === st.ink) name = 'ink';
    else if (p === st.outline) name = 'outline';
    else if (p.scene === st.scene && 'clearDepth' in p && 'overrideMaterial' in p) name = 'scene';
    else if ('bloomTintColors' in p || 'nMips' in p) name = 'bloom';
    else if (i === st.composer.passes.length - 1) name = 'output';
    else if (p.scene === st.scene || 'veils' in p || i === 4) name = i === 4 ? 'exhaust' : `effect${i}`;
    return { p, name };
  });
  let timing = null;
  let within = null;
  for (const { p, name } of passes) {
    const render = p.render;
    p.render = function (...a) {
      if (!timing) return render.apply(this, a);
      sync();
      const t = now();
      within = name;
      render.apply(this, a);
      within = null;
      sync();
      timing[name] = (timing[name] ?? 0) + now() - t;
    };
  }
  // the shadow map is drawn inside whichever pass first draws the scene: its time is taken out of that pass's
  const shadowRender = r.shadowMap.render;
  r.shadowMap.render = function (...a) {
    if (!timing || !this.needsUpdate || !a[0]?.length) return shadowRender.apply(this, a);
    sync();
    const t = now();
    shadowRender.apply(this, a);
    sync();
    const took = now() - t;
    timing.shadow = (timing.shadow ?? 0) + took;
    if (within) timing[within] = (timing[within] ?? 0) - took;
  };

  /** One frame, by hand. Returns its cost in ms with the GPU finished, and whether anything was drawn. */
  const frame = (force) => {
    if (force) st.dirty = true;
    const drawn = st.drawn;
    const t = now();
    st.frame();
    sync();
    return { ms: now() - t, drew: st.drawn !== drawn };
  };
  const still = () => {
    const m = st.camera.matrixWorld.elements;
    return m[12] + m[13] * 3 + m[14] * 7 + m[0] * 11 + m[5] * 13 + m[10] * 17 + st.camera.fov;
  };
  /** Turn the page over until the camera has come to rest and nothing is still being made. */
  const settle = async (most = 900) => {
    let last = Number.NaN;
    let rest = 0;
    for (let i = 0; i < most && rest < 8; i++) {
      frame(true);
      await turn();
      const at = still();
      rest = at === last && !st.treesOwed?.size ? rest + 1 : 0;
      last = at;
    }
    return rest >= 8;
  };

  const model = (id) => sr.flight.models.find((m) => m.id === id);
  const home = new Map(st.staged.map((s, i) => [st.defs[i].id, s.group.position.clone()]));
  const walker = sr.flight.models.find((m) => m.walker)?.id;

  /** Everything back as the page opens: nobody walking or flying, the clock at liftoff and stopped, closed up, in orbit. */
  const reset = async () => {
    if (sr.cockpit.active) sr.cockpit.leave();
    if (st.walk.active) st.exitWalk();
    st.walk.stick(0, 0);
    sr.clock.reset();
    st.setCamera('orbit');
    st.onSelect(null);
    sr.ui.setCutaway?.(false);
    st.setCutaway(false);
    st.frozen = false;
    sr.show('pad', true);
    st.setAutoRotate(false);
    st.cam.settle?.();
  };

  /** A place to stand high on a structure: the first level floor found under a grid over the node, at least `above` metres up. */
  const floorOn = (node, above) => {
    const pad = st.staged[st.defs.findIndex((m) => m.id === 'pad')];
    const o = pad?.full.getObjectByName(node);
    if (!o) return null;
    const box = new st.bounds.constructor().set(new V3(), 1); // (a Sphere: only its centre's class is wanted)
    void box;
    const min = new V3(Infinity, Infinity, Infinity);
    const max = new V3(-Infinity, -Infinity, -Infinity);
    const p = new V3();
    o.traverse((m) => {
      if (!m.isMesh) return;
      m.geometry.computeBoundingBox();
      for (const x of [m.geometry.boundingBox.min.x, m.geometry.boundingBox.max.x])
        for (const y of [m.geometry.boundingBox.min.y, m.geometry.boundingBox.max.y])
          for (const z of [m.geometry.boundingBox.min.z, m.geometry.boundingBox.max.z]) {
            p.set(x, y, z).applyMatrix4(m.matrixWorld);
            min.min(p);
            max.max(p);
          }
    });
    const ray = st.raycaster;
    const down = new V3(0, -1, 0);
    for (let i = 1; i < 12; i++)
      for (let j = 1; j < 12; j++) {
        const x = min.x + ((max.x - min.x) * i) / 12;
        const z = min.z + ((max.z - min.z) * j) / 12;
        ray.set(new V3(x, max.y + 1, z), down);
        ray.far = Infinity;
        const hits = ray
          .intersectObject(o, true)
          .filter((h) => h.face && h.face.normal.clone().transformDirection(h.object.matrixWorld).y > 0.9);
        // the highest floor with headroom: nothing else within 2.2 m above it
        for (const h of hits) {
          if (h.point.y < min.y + above) continue;
          const over = hits.some((k) => k !== h && k.point.y > h.point.y + 0.05 && k.point.y < h.point.y + 2.2);
          if (!over) return h.point.clone();
        }
      }
    return null;
  };

  const chase = (t) => ({
    setup: async () => {
      sr.show(sr.flight.flies?.model ?? 'vehicle', true);
      sr.clock.seek(t);
      st.setCamera('chase');
      for (let i = 0; i < 400 && (st.lifted.t !== sr.clock.t || st.cam.journey); i++) {
        frame(true);
        await turn();
      }
      await settle();
      sr.clock.setRate(1);
      sr.clock.play(true);
    },
    force: true,
    done: () => sr.clock.pause(),
  });
  /** The flight deck: the flight flown by its own guidance from the pad to `t`, the navball and the path on. */
  const deck = (t) => ({
    setup: async () => {
      const c = sr.cockpit;
      if (!c.active) {
        c.enter();
        sr.navball.tuck?.(false, false);
        sr.path.show(true, false);
        c.eventAt = -1e9;
        c.command('next'); // ignition
      }
      // run the clock ahead as fast as the flight can be flown, to the instant asked for
      sr.clock.setRate(300);
      sr.clock.play(true);
      for (let i = 0; i < 4000 && sr.clock.t < t && !c.state?.landing; i++) {
        st.frame();
        if (i % 20 === 0) await turn();
      }
      sr.clock.setRate(1);
      for (let i = 0; i < 30; i++) {
        frame(true);
        await turn();
      }
    },
    force: true,
    keep: true, // (the next instant flies on from this one)
  });
  const part = (id) => ({
    setup: async () => {
      sr.show(id, true);
      st.onSelect(model(id).parts[0].node);
      sr.ui.setCutaway?.(true);
      st.setCutaway(true);
      st.setAutoRotate(false);
      await settle();
    },
    force: true,
  });
  const afoot = (place, move) => ({
    setup: async () => {
      const from = place();
      if (!from) throw new Error('nowhere to stand');
      st.enterWalk(walker, from);
      st.setAutoRotate(false);
      for (let i = 0; i < 90; i++) {
        frame(true);
        await turn();
      }
    },
    each: move,
    force: true,
    done: () => st.walk.stick(0, 0),
  });

  const T = [1, 5, 40, 80, 150, 300, 500, 700];
  const scenarios = {
    'pad still': {
      setup: async () => {
        await settle();
      },
      force: false,
    },
    'pad drawn': {
      setup: async () => {
        await settle();
      },
      force: true,
    },
    'pad orbit': {
      setup: async () => {
        await settle();
        st.setAutoRotate(true);
      },
      force: false,
    },
    'vehicle part cut': part('vehicle'),
    'pad part cut': part('pad'),
    'crew part cut': part('crew'),
    'foot stand': afoot(
      () => home.get(walker).clone(),
      () => {},
    ),
    'foot apron': afoot(
      () => home.get(walker).clone(),
      () => st.walk.stick(0, 1),
    ),
    'foot gantry': afoot(
      () => floorOn('ServiceStructure', 8),
      (i) => st.walk.stick(0, i % 60 < 30 ? 0.6 : -0.6),
    ),
    ...Object.fromEntries(T.map((t) => [`chase T+${t}`, chase(t)])),
    ...Object.fromEntries(T.map((t) => [`deck T+${t}`, deck(t)])),
  };

  let kept = false;
  const api = {
    names: Object.keys(scenarios),
    passes: passes.map((p) => p.name),
    reset,
    frame,
    settle,
    turn,
    own,
    loose,
    setLook: async (look) => {
      st.setLook(look);
      for (let i = 0; i < 20; i++) {
        frame(true);
        await turn();
      }
      // the other look's shaders are built the first time it is drawn: let them be, before anything is timed
      await new Promise((done) => setTimeout(done, 300));
      for (let i = 0; i < 10; i++) {
        frame(true);
        await turn();
      }
    },
    /** One scenario, once: `frames` timed frames, then one with the shadow map drawn again, then a few with each pass timed. */
    async run(name, frames) {
      const s = scenarios[name];
      if (!(s.keep && kept)) await reset();
      kept = Boolean(s.keep);
      await s.setup();
      for (let i = 0; i < 12; i++) {
        s.each?.(i);
        frame(s.force);
        await turn();
      }
      const times = [];
      let drew = 0;
      const heap = performance.memory?.usedJSHeapSize ?? 0;
      for (let i = 0; i < frames; i++) {
        s.each?.(i + 12);
        const f = frame(s.force);
        times.push(f.ms);
        if (f.drew) drew++;
        await turn();
      }
      const grew = (performance.memory?.usedJSHeapSize ?? 0) - heap;
      const info = { calls: r.info.render.calls, triangles: r.info.render.triangles };
      // a frame in which the shadow map is drawn again, against one in which it is not
      const plain = [];
      const shadowed = [];
      let shadowCalls = 0;
      for (let i = 0; i < 6; i++) {
        s.each?.(i + 12 + frames);
        if (i % 2) r.shadowMap.needsUpdate = true;
        const f = frame(true);
        (i % 2 ? shadowed : plain).push(f.ms);
        if (i % 2) shadowCalls = r.info.render.calls;
        else info.plainCalls = r.info.render.calls;
        await turn();
      }
      // where the time goes, pass by pass
      const sums = {};
      const N = 8;
      for (let i = 0; i < N; i++) {
        s.each?.(i);
        timing = {};
        frame(true);
        for (const k in timing) sums[k] = (sums[k] ?? 0) + timing[k] / N;
        timing = null;
        await turn();
      }
      // and the page's own loop, for a moment: the interval between its frames as the browser runs them
      const gaps = [];
      loose();
      await new Promise((done) => {
        let last = 0;
        let i = 0;
        const each = (t) => {
          s.each?.(i++);
          if (s.force) st.dirty = true;
          if (last) gaps.push(t - last);
          last = t;
          if (gaps.length < 40) requestAnimationFrame(each);
          else done();
        };
        requestAnimationFrame(each);
      });
      own();
      s.done?.();
      return {
        times,
        drew,
        ...info,
        shadowMs: shadowed.reduce((a, b) => a + b, 0) / shadowed.length,
        plainMs: plain.reduce((a, b) => a + b, 0) / plain.length,
        shadowCalls: Math.max(0, shadowCalls - (info.plainCalls ?? info.calls)),
        programs: r.info.programs?.length ?? 0,
        textures: r.info.memory.textures,
        geometries: r.info.memory.geometries,
        heapGrew: grew,
        passes: sums,
        raf: gaps.slice(8).reduce((a, b) => a + b, 0) / (gaps.length - 8),
        levels: st.staged.map((x) => x.shownLevel),
      };
    },
    /** A still picture of a scenario: the scene frozen, drawn the same number of times every time. */
    async still(name) {
      const s = scenarios[name];
      if (!(s.keep && kept)) await reset();
      kept = Boolean(s.keep);
      await s.setup();
      s.done?.();
      sr.clock.pause();
      st.frozen = true;
      for (let i = 0; i < 40; i++) {
        frame(true);
        await turn();
      }
    },
    unfreeze: () => {
      st.frozen = false;
    },
    /** The page's own loop for `seconds`: every interval between frames, by the browser's clock. */
    async soak(seconds) {
      await reset();
      sr.show(sr.flight.flies?.model ?? 'vehicle', true);
      st.timer.getDelta = () => DT;
      sr.clock.seek(-3);
      st.setCamera('chase');
      sr.clock.setRate(1);
      sr.clock.play(true);
      loose();
      const gaps = [];
      let last = now();
      const began = last;
      const heap = [];
      await new Promise((done) => {
        const each = () => {
          const t = now();
          gaps.push(t - last);
          last = t;
          st.dirty = true;
          if (gaps.length % 30 === 0) heap.push(performance.memory?.usedJSHeapSize ?? 0);
          if (t - began < seconds * 1000) requestAnimationFrame(each);
          else done();
        };
        requestAnimationFrame(each);
      });
      own();
      sr.clock.pause();
      return { gaps, heap };
    },
  };
  window.__bench = api;
  return { names: api.names, passes: api.passes };
}

/** Before any of the page's script: note when things happen as it opens. */
function watchLoad() {
  const marks = (window.__load = { compile: 0, compiles: 0, heapPeak: 0 });
  const t0 = performance.now();
  const seen = (name) => {
    if (!(name in marks)) marks[name] = performance.now() - t0;
  };
  const poll = setInterval(() => {
    marks.heapPeak = Math.max(marks.heapPeak, performance.memory?.usedJSHeapSize ?? 0);
    if (document.querySelector('.loading.done')) seen('done');
    if (document.body?.classList.contains('scene-ready')) {
      seen('ready');
      clearInterval(poll);
    }
  }, 4);
  let sr;
  Object.defineProperty(window, 'sr', {
    configurable: true,
    get: () => sr,
    set: (v) => {
      sr = v;
      const st = v.stage;
      seen('script');
      for (const name of ['warm']) {
        const was = st[name];
        st[name] = async function (...a) {
          const t = performance.now();
          try {
            return await was.apply(this, a);
          } finally {
            marks[`${name}Ms`] = performance.now() - t;
            marks[`${name}End`] = performance.now() - t0;
          }
        };
      }
      const compile = st.renderer.compileAsync;
      st.renderer.compileAsync = async function (...a) {
        const t = performance.now();
        try {
          return await compile.apply(this, a);
        } finally {
          marks.compile += performance.now() - t;
          marks.compiles++;
        }
      };
      // the first frame drawn (unseen, under the curtain), and the longest the page stood still while it opened
      const step = st.step;
      st.step = function (...a) {
        const drawn = this.drawn;
        const out = step.apply(this, a);
        if (this.drawn !== drawn) seen('firstFrame');
        if (this.drawn !== drawn && this.staged.length) seen('models');
        return out;
      };
    },
  });
  marks.longest = 0;
  marks.blocked = 0;
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if ('ready' in marks) continue;
        marks.longest = Math.max(marks.longest, e.duration);
        marks.blocked += e.duration;
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
}

async function ready(page) {
  await page.waitForFunction(
    () => window.sr && document.querySelector('.loading.done') && document.body.classList.contains('scene-ready'),
    null,
    {
      timeout: 120000,
    },
  );
}

// ---------------------------------------------------------------------------------------------------------------
// load
// ---------------------------------------------------------------------------------------------------------------

async function measureLoad(browser, net) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (net)
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: net.latency,
      downloadThroughput: (net.mbps * 1e6) / 8,
      uploadThroughput: (net.mbps * 1e6) / 8,
    });
  const got = new Map();
  const urls = new Map();
  cdp.on('Network.responseReceived', (e) => urls.set(e.requestId, e.response.url));
  cdp.on('Network.loadingFinished', (e) => got.set(e.requestId, e.encodedDataLength));
  await page.addInitScript(watchLoad);
  await page.goto(`${URL_}${query ? `?${query}` : ''}#pad`);
  await ready(page);
  const marks = await page.evaluate(() => {
    const st = window.sr.stage;
    return {
      ...window.__load,
      programs: st.renderer.info.programs.length,
      textures: st.renderer.info.memory.textures,
      geometries: st.renderer.info.memory.geometries,
      heap: performance.memory?.usedJSHeapSize ?? 0,
    };
  });
  // everything fetched by the time the page said it was ready (coarser levels and the place round the pad have arrived by then: `warm` waits for them)
  const kinds = {};
  let bytes = 0;
  let pagesBytes = 0;
  for (const [id, n] of got) {
    const path = new URL(urls.get(id) ?? URL_).pathname;
    const kind = KIND[extname(path)] ?? 'other';
    const w = weights[path === '/' ? '/index.html' : path];
    kinds[kind] = (kinds[kind] ?? 0) + (w?.raw ?? n);
    bytes += w?.raw ?? n;
    pagesBytes += w?.pages ?? n;
  }
  await context.close();
  return {
    script: marks.script,
    firstFrame: marks.firstFrame,
    done: marks.done,
    ready: marks.ready,
    models: marks.models,
    warmMs: marks.warmMs,
    compileMs: marks.compile,
    longest: marks.longest,
    blocked: marks.blocked,
    programs: marks.programs,
    textures: marks.textures,
    geometries: marks.geometries,
    heapPeak: marks.heapPeak / 1e6,
    heap: marks.heap / 1e6,
    requests: got.size,
    bytes,
    pagesBytes,
    ...Object.fromEntries(Object.entries(kinds).map(([k, v]) => [`bytes.${k}`, v])),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// the run
// ---------------------------------------------------------------------------------------------------------------

const browser = await chromium.launch({ channel: 'chrome', args: CHROME });
const result = {
  label,
  when: new Date().toISOString(),
  reps: REPS,
  frames: FRAMES,
  chrome: browser.version(),
  scenarios: {},
  load: {},
  soak: null,
  profiles: {},
  build: {
    files: Object.keys(weights).length,
    raw: Object.values(weights).reduce((a, w) => a + w.raw, 0),
    pages: Object.values(weights).reduce((a, w) => a + w.pages, 0),
    byKind: Object.entries(weights).reduce((a, [path, w]) => {
      const kind = KIND[extname(path)] ?? 'other';
      a[kind] = (a[kind] ?? 0) + w.raw;
      return a;
    }, {}),
  },
};
const summary = (values) => ({ median: median(values), spread: spreadOf(values), values });

if (!noLoad && only.test('load')) {
  for (const [name, net] of [
    ['local', null],
    ['20 Mbit', { mbps: 20, latency: 20 }],
  ]) {
    const runs = [];
    for (let i = 0; i < REPS; i++) {
      runs.push(await measureLoad(browser, net));
      process.stderr.write(`load ${name} ${i + 1}/${REPS}: ready ${runs.at(-1).ready.toFixed(0)} ms\n`);
    }
    result.load[name] = Object.fromEntries(Object.keys(runs[0]).map((k) => [k, summary(runs.map((r) => r[k] ?? Number.NaN))]));
  }
}

const errors = [];
for (const size of sizes) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.ratio });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${URL_}${query ? `?${query}` : ''}#pad`);
  await ready(page);
  await page.addStyleTag({ content: '.title, .callout { display: none !important }' });
  const { names, passes } = await page.evaluate(inPage, 1 / 60);
  result.passes = passes;
  const wanted = names.filter((n) => only.test(n));
  const cdp = profile ? await context.newCDPSession(page) : null;
  if (cdp) await cdp.send('Profiler.enable');
  for (const look of looks) {
    if (!wanted.length) break;
    await page.evaluate((l) => window.__bench.setLook(l), look);
    for (let rep = 0; rep < REPS; rep++) {
      for (const name of wanted) {
        const key = `${size.name} ${look} · ${name}`;
        if (cdp && rep === 0) await cdp.send('Profiler.start');
        let one;
        try {
          one = await page.evaluate(([n, f]) => window.__bench.run(n, f), [name, FRAMES]);
        } catch (e) {
          errors.push(`${key}: ${String(e).slice(0, 300)}`);
          process.stderr.write(`${key}: failed: ${String(e).slice(0, 200)}\n`);
          continue;
        }
        if (cdp && rep === 0) result.profiles[key] = top((await cdp.send('Profiler.stop')).profile);
        const sorted = [...one.times].sort((a, b) => a - b);
        const mean = one.times.reduce((a, b) => a + b, 0) / one.times.length;
        const into = (result.scenarios[key] ??= { runs: [] });
        into.runs.push({
          ms: mean,
          p99: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.99) - 1)],
          worst: sorted.at(-1),
          drew: one.drew,
          calls: one.calls,
          triangles: one.triangles,
          shadowMs: one.shadowMs,
          plainMs: one.plainMs,
          shadowCalls: one.shadowCalls,
          programs: one.programs,
          textures: one.textures,
          geometries: one.geometries,
          heapGrew: one.heapGrew,
          passes: one.passes,
          raf: one.raf,
          levels: one.levels,
        });
        process.stderr.write(`${key} [${rep + 1}/${REPS}]: ${mean.toFixed(2)} ms, ${one.calls} calls\n`);
      }
    }
    if (shots)
      for (const name of wanted) {
        await page.evaluate((n) => window.__bench.still(n), name);
        await page.addStyleTag({ content: '#ui { visibility: hidden !important }' }).then(async (tag) => {
          await page.screenshot({ path: join(shots, `${size.name} ${look} ${name}.png`.replace(/[ +·]+/g, '-')) });
          await tag.evaluate((el) => el.remove());
        });
        await page.evaluate(() => window.__bench.unfreeze());
      }
  }
  // the soak: once, at the first size, in the real look
  if (!noSoak && size === sizes[0] && only.test('soak')) {
    await page.evaluate(() => window.__bench.setLook('real'));
    const trace = await context.newCDPSession(page);
    const gcs = [];
    trace.on('Tracing.dataCollected', (e) => {
      for (const ev of e.value)
        if (/^(MinorGC|MajorGC|V8\.GC_|V8\.GCScavenger|V8\.GCFinalizeMC)/.test(ev.name) && ev.ph === 'X')
          gcs.push({ name: ev.name, ms: ev.dur / 1000 });
    });
    await trace.send('Tracing.start', {
      transferMode: 'ReportEvents',
      traceConfig: { includedCategories: ['v8', 'devtools.timeline', 'disabled-by-default-v8.gc'] },
    });
    const { gaps, heap } = await page.evaluate((s) => window.__bench.soak(s), SOAK);
    const ended = new Promise((done) => trace.once('Tracing.tracingComplete', done));
    await trace.send('Tracing.end');
    await ended;
    const sorted = [...gaps].sort((a, b) => a - b);
    const mid = median(gaps);
    const main = gcs.filter((g) => g.name === 'MinorGC' || g.name === 'MajorGC');
    result.soak = {
      seconds: SOAK,
      frames: gaps.length,
      ms: gaps.reduce((a, b) => a + b, 0) / gaps.length,
      median: mid,
      p99: sorted[Math.ceil(sorted.length * 0.99) - 1],
      p999: sorted[Math.ceil(sorted.length * 0.999) - 1],
      worst: sorted.at(-1),
      // a hitch is a frame that took three times the usual and at least 8 ms more
      hitches: gaps.filter((g) => g > 3 * mid && g > mid + 8).length,
      over33: gaps.filter((g) => g > 33.4).length,
      minorGC: main.filter((g) => g.name === 'MinorGC').length,
      majorGC: main.filter((g) => g.name === 'MajorGC').length,
      gcMs: main.reduce((a, g) => a + g.ms, 0),
      gcWorst: Math.max(0, ...main.map((g) => g.ms)),
      heapMin: Math.min(...heap) / 1e6,
      heapMax: Math.max(...heap) / 1e6,
    };
    process.stderr.write(`soak: ${result.soak.frames} frames, ${result.soak.hitches} hitches, worst ${result.soak.worst.toFixed(1)} ms\n`);
  }
  await context.close();
}
await browser.close();
stop();

/** The functions a CPU profile spent the most of its own time in. */
function top(prof, n = 25) {
  const self = new Map();
  const dt = prof.timeDeltas ?? [];
  const byId = new Map(prof.nodes.map((node) => [node.id, node]));
  let total = 0;
  prof.samples.forEach((id, i) => {
    const node = byId.get(id);
    const f = node.callFrame;
    const where = `${f.functionName || '(anonymous)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`;
    self.set(where, (self.get(where) ?? 0) + (dt[i] ?? 0));
    total += dt[i] ?? 0;
  });
  return [...self]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([where, us]) => ({ where, ms: us / 1000, share: us / total }));
}

for (const s of Object.values(result.scenarios)) {
  for (const [id] of FIGURES) s[id] = summary(s.runs.map((r) => r[id]));
  s.drew = median(s.runs.map((r) => r.drew));
  s.heapGrew = median(s.runs.map((r) => r.heapGrew));
  s.levels = s.runs[0].levels;
  s.passes = {};
  for (const k of Object.keys(s.runs[0].passes)) s.passes[k] = median(s.runs.map((r) => r.passes[k] ?? 0));
}
result.errors = [...new Set(errors)];

const lines = [];
lines.push(
  `# bench: ${label}`,
  '',
  `${result.when} · Chrome ${result.chrome} · ${REPS} repeats of ${FRAMES} frames · times in ms, GPU finished`,
  '',
);
if (Object.keys(result.load).length) {
  lines.push('## load (cold cache, 1440x900@1, #pad)', '');
  const keys = Object.keys(Object.values(result.load)[0]);
  lines.push(
    '```',
    table([
      ['', ...Object.keys(result.load).flatMap((n) => [n, '±'])],
      ...keys.map((k) => [
        k,
        ...Object.values(result.load).flatMap((l) => [
          fix(l[k].median, k.startsWith('heap') ? 1 : 0),
          fix(l[k].spread, k.startsWith('heap') ? 1 : 0),
        ]),
      ]),
    ]),
    '```',
    '',
  );
}
lines.push(
  `build: ${result.build.files} files, ${(result.build.raw / 1e6).toFixed(2)} MB (${(result.build.pages / 1e6).toFixed(2)} MB as Pages serves it): ${Object.entries(
    result.build.byKind,
  )
    .map(([k, v]) => `${k} ${(v / 1e6).toFixed(2)}`)
    .join(', ')}`,
  '',
);
if (Object.keys(result.scenarios).length) {
  lines.push('## frames', '');
  const passNames = [...new Set(Object.values(result.scenarios).flatMap((s) => Object.keys(s.passes)))];
  lines.push(
    '```',
    table([
      [
        'scenario',
        'ms',
        '±',
        '1% low',
        'worst',
        'drawn',
        'calls',
        'tris',
        'own loop',
        'shadow ms',
        'shadow calls',
        'progs',
        'tex',
        'geo',
        'lod',
        '|',
        ...passNames,
      ],
      ...Object.entries(result.scenarios).map(([key, s]) => [
        key,
        fix(s.ms.median),
        fix(s.ms.spread),
        fix(s.p99.median),
        fix(s.worst.median),
        `${s.drew}/${FRAMES}`,
        fix(s.calls.median, 0),
        fix(s.triangles.median, 0),
        fix(s.raf.median),
        fix(s.shadowMs.median),
        fix(s.shadowCalls.median, 0),
        fix(s.programs.median, 0),
        fix(s.textures.median, 0),
        fix(s.geometries.median, 0),
        s.levels.join('/'),
        '|',
        ...passNames.map((p) => fix(s.passes[p])),
      ]),
    ]),
    '```',
    '',
  );
}
if (result.soak) {
  const k = result.soak;
  lines.push(
    '## soak',
    '',
    `${k.seconds} s of the record's flight from T-3 in the chase view, on the page's own loop: ${k.frames} frames, mean ${fix(k.ms)} ms, median ${fix(k.median)}, 99 % ${fix(k.p99)}, 99.9 % ${fix(k.p999)}, worst ${fix(k.worst)}; ${k.hitches} hitches (three times the median and 8 ms over it), ${k.over33} frames over 33 ms; ${k.minorGC} minor and ${k.majorGC} major collections, ${fix(k.gcMs, 1)} ms in all, the longest ${fix(k.gcWorst, 1)} ms; heap ${fix(k.heapMin, 0)} to ${fix(k.heapMax, 0)} MB`,
    '',
  );
}
for (const [key, rows] of Object.entries(result.profiles)) {
  lines.push(
    `### profile: ${key}`,
    '',
    '```',
    table([['self ms', 'share', 'function'], ...rows.map((r) => [fix(r.ms, 1), `${(r.share * 100).toFixed(1)} %`, r.where])]),
    '```',
    '',
  );
}
if (result.errors.length) lines.push('## errors', '', ...result.errors.map((e) => `- ${e}`), '');

writeFileSync(join(out, `${label}.json`), JSON.stringify(result));
writeFileSync(join(out, `${label}.md`), lines.join('\n'));
console.log(lines.join('\n'));
console.log(`\n${join(out, `${label}.json`)}\n${join(out, `${label}.md`)}`);
process.exit(0);
