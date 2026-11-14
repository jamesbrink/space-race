// What the page allocates on the GPU at a phone's size, counted and held to a budget (`pnpm test:mem`; needs `pnpm dev`).
//   node tools/mem-test.mjs [url]                  the launch site at 390x844@3, as a phone: ready, late maps in, on foot, in flight, aboard
//   node tools/mem-test.mjs --wait 8               how long the late maps are given, seconds (30)
//   node tools/mem-test.mjs --table [n]            print the n largest allocations at each stage (30)
//   node tools/mem-test.mjs --browser webkit       in WebKit (an iPhone's descriptor); chromium is the default
//   node tools/mem-test.mjs --size 1440x900@2 --desktop    another size, with a mouse: no budget is held there
//   node tools/mem-test.mjs --query lighter=0      more for the address's query (the tier's switch)
//   node tools/mem-test.mjs --gallery              come in through the gallery, then go to the site (two stages alive?)
//   node tools/mem-test.mjs --json out.json        keep the whole account
//   node tools/mem-test.mjs --flight ussr/vostok/vostok-1    another flight's launch site (Freedom 7's by default): one with no
//                                                  flight deck is held to the budget ready, late, on foot and at its peak
// The page counts for itself (src/mem.ts, `?mem`): every texture, renderbuffer and buffer by the bytes its format
// says, and each canvas's drawing buffer. A phone's browser kills a tab by what it holds and says nothing, and a
// desktop browser does not reproduce the kill, so the account is the evidence and the budget is the test.
//
// The budget (MiB, accounted GPU memory, the launch site as a phone): see BUDGET below and rendering.md, "Memory".
import { chromium, webkit } from 'playwright-core';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, otherwise) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : otherwise);
const top = flag('table') ? Number(value('table', '30')) || 30 : 0;
const [, w, h, dpr] = /^(\d+)x(\d+)@([\d.]+)$/.exec(value('size', '390x844@3')) ?? [];
const desktop = flag('desktop');
const url = args.find((a) => /^https?:\/\//.test(a)) ?? process.env.SR_URL ?? 'http://localhost:5180/';
const query = ['mem', value('query', '')].filter(Boolean).join('&');
const flightId = value('flight', 'usa/mercury/mr-3-freedom-7');

/**
 * Accounted GPU memory the launch site may hold as a phone, MiB: with the curtain up, half a minute later, on foot,
 * in flight (followed to T+150 s), from the couch, and at the most seen at any moment between. Measured when set
 * (the lighter tier): 309, 317, 388, 409, 473, 473. The full tier at the same size: 728, 902, 1091, 1095, 1172; as
 * it was, 838, 1011 and 1091 at the first three, and killed on a phone. Why these figures: rendering.md, "Memory".
 */
export const BUDGET = { ready: 350, late: 350, foot: 400, flight: 450, aboard: 500, peak: 500 };

const engine = value('browser', 'chromium') === 'webkit' ? webkit : chromium;
const browser = await engine.launch(
  engine === chromium ? { channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : {},
);
const context = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: Number(dpr),
  hasTouch: !desktop,
  isMobile: !desktop && engine === chromium ? true : undefined,
});
const page = await context.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

const account = () =>
  page.evaluate(() => {
    const sr = window.sr;
    // (three's own textures are named by the material that wears them: the stage's fields are private to TypeScript only)
    for (const stage of [sr?.stage, sr?.gallery?.made?.stage])
      if (stage?.renderer) window.srMem.label(stage.renderer, [stage.scene, stage.setting?.backdrop?.scene].filter(Boolean));
    const r = window.srMem.report();
    return { ...r, list: r.list.slice(0, 400), three: sr?.stage?.renderer?.info?.memory ?? null };
  });
/** The largest total seen while `ms` go by, sampled as they do: what is held for a moment counts as much as what stays. */
async function watch(ms, peak) {
  for (let t = 0; t < ms; t += 500) {
    await page.waitForTimeout(500);
    peak.value = Math.max(peak.value, await page.evaluate(() => window.srMem.report().total));
  }
}

const stages = [];
const peak = { value: 0 };
const note = async (name) => {
  const r = await account();
  peak.value = Math.max(peak.value, r.total);
  stages.push({ name, ...r });
  const line = `${name.padEnd(22)} ${r.total.toFixed(0).padStart(5)} MiB  textures ${r.textures.toFixed(0)}, renderbuffers ${r.renderbuffers.toFixed(0)}, buffers ${r.buffers.toFixed(0)}, canvases ${r.canvases.toFixed(0)}; ${r.contexts} context(s), ${r.count} objects; bitmaps ${r.bitmaps.toFixed(0)}, heap ${r.heap?.toFixed(0) ?? '?'}`;
  console.log(line);
  if (top) {
    for (const a of r.list.slice(0, top))
      console.log(
        `  ${(a.bytes / 2 ** 20).toFixed(1).padStart(7)}  ${a.kind.padEnd(12)} c${a.context}  ${a.what.padEnd(36)} ${a.name ?? ''}${a.name && a.owner ? '  <-  ' : ''}${a.owner}`,
      );
  }
  return r;
};

const start = flag('gallery') ? `${flightId}/gallery` : `${flightId}/site/vehicle`;
await page.goto(`${url}?${query}#${start}`);
// (sampled while it loads: what is held for a moment during the load is where a phone is killed)
const loading = (async () => {
  while (!(await page.evaluate(() => Boolean(document.querySelector('.loading.done') && window.sr)).catch(() => false))) {
    peak.value = Math.max(peak.value, await page.evaluate(() => window.srMem?.report().total ?? 0).catch(() => 0));
    await page.waitForTimeout(250);
  }
})();
await page.waitForFunction(() => window.sr && document.querySelector('.loading.done'), null, { timeout: 180000 });
await loading;
const device = await page.evaluate(() => ({
  dpr: devicePixelRatio,
  coarse: matchMedia('(pointer: coarse)').matches,
  screen: `${screen.width}x${screen.height}`,
  memory: navigator.deviceMemory ?? null,
  maxTexture: window.sr.stage.renderer.capabilities.maxTextureSize,
  tier: window.sr.stage.tier.lighter ? `lighter (${window.sr.stage.tier.why})` : `full (${window.sr.stage.tier.why})`,
}));
console.log(`${engine.name()} ${w}x${h}@${dpr}: ${JSON.stringify(device)}`);
/** Wait until the total has stood still for three seconds (maps arriving a piece a frame), or `most` ms. */
async function settle(most) {
  let last = -1;
  let still = 0;
  for (let t = 0; t < most && still < 6; t += 500) {
    await page.waitForTimeout(500);
    const total = await page.evaluate(() => window.srMem.report().total);
    peak.value = Math.max(peak.value, total);
    still = Math.abs(total - last) < 0.01 ? still + 1 : 0;
    last = total;
  }
}

if (flag('gallery')) {
  await note('gallery ready');
  await watch(4000, peak);
  await page.evaluate((id) => (location.hash = `#${id}/site/vehicle`), flightId);
  await page.waitForFunction(() => document.body.classList.contains('scene-ready'), null, { timeout: 180000 });
  await note('site, from gallery');
} else await note('ready');
await watch(Number(value('wait', '30')) * 1000, peak);
await note('later (late maps)');
await page.evaluate(() => window.sr.stage.enterWalk(window.sr.flight.models.find((m) => m.walker)?.id ?? 'crew'));
await page.waitForTimeout(1500);
await page.keyboard.down('w');
await watch(5000, peak);
await page.keyboard.up('w');
await note('on foot');
// the flight, straight from the walk (the walk's maps are still held): followed up to where the whole Earth's maps are wanted
// (a flight with no flight deck yet has nothing to follow: its launch site is all there is)
const flies = await page.evaluate(() =>
  Boolean(window.sr.flight.flies && (window.sr.flight.trajectory?.body || window.sr.flight.orbital?.ascent)),
);
if (flies) {
  await page.evaluate(() => {
    const sr = window.sr;
    sr.stage.exitWalk();
    sr.clock.seek(150);
    sr.clock.play();
    sr.stage.setCamera('chase');
  });
  await settle(60000);
  await note('in flight');
  await page.evaluate(() => window.sr.stage.setCamera('onboard'));
  await settle(20000);
  await note('aboard, in flight');
} else console.log('(no flight deck: not followed into flight or aboard)');
console.log(`peak ${peak.value.toFixed(0)} MiB`);
if (value('json')) (await import('node:fs')).writeFileSync(value('json'), JSON.stringify({ device, peak: peak.value, stages }, null, 1));
await browser.close();
if (errors.length) console.log(`console errors: ${errors.length}\n  ${errors.slice(0, 6).join('\n  ')}`);

if (!desktop && !flag('no-budget')) {
  const of = (name) => stages.find((s) => s.name.startsWith(name))?.total ?? 0;
  const over = [
    ['ready', of('ready') || of('site')],
    ['late', of('later')],
    ['foot', of('on foot')],
    ['flight', of('in flight')],
    ['aboard', of('aboard')],
    ['peak', peak.value],
  ].filter(([k, v]) => v > BUDGET[k] && (flies || (k !== 'flight' && k !== 'aboard')));
  if (over.length || errors.length) {
    for (const [k, v] of over) console.error(`over budget at ${k}: ${v.toFixed(0)} MiB, ${BUDGET[k]} allowed`);
    process.exit(1);
  }
  console.log(
    `within budget: ${Object.entries(BUDGET)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')} MiB`,
  );
}
