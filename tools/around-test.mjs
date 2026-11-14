// Is what stands round a site drawn at the level its size on screen calls for? At Site 1 (Site 2's assembly building)
// and at LC-5 (the neighbouring complexes): as the stage has it from where it stands, and from eyes put at a range of
// distances from each thing, every piece's level against chooseLevel's for its pixels a metre, and the fade between.
// (rendering.md, "Levels of detail"; viewer/around.ts). Needs a server running.
//   node tools/around-test.mjs [url]     (default url: http://localhost:5180/)
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? process.env.SR_URL ?? 'http://localhost:5180/';
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const fails = [];
for (const where of ['ussr/vostok/vostok-1/site/pad', 'usa/mercury/mr-3-freedom-7/site/pad']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.routeWebSocket(/.*/, () => {});
  await page.goto(`${url}#${where}`);
  await page.waitForFunction(() => window.sr && document.querySelector('.loading.done'), null, { timeout: 180000 });
  await page.waitForFunction(() => window.sr.stage.setting.levels?.[0]?.scenery?.all.length === 3, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const st = window.sr.stage;
    const a = st.setting.levels[0];
    const sc = a.scenery;
    const scale = st.renderer.domElement.height / (2 * Math.tan((st.camera.fov * Math.PI) / 360));
    const pieces = sc.pieces;
    const asIs = pieces.map((p) => ({
      name: p.name,
      ppm: scale / Math.max(1, p.box.distanceToPoint(st.camera.position)),
      shown: p.shown,
      above: p.above,
      visible: p.nodes.map((n) => n?.visible ?? null),
    }));
    // from eyes at a range of distances from each piece, along a line out of its middle, one step at a time
    const V = st.camera.position.constructor;
    const swept = [];
    for (const p of pieces) {
      const middle = p.box.getCenter(new V());
      const size = p.box.getSize(new V());
      for (const ppm of [40, 12, 9.5, 7, 4, 2.3, 1.7, 0.5, 4, 12]) {
        const d = scale / ppm;
        const eye = middle.clone().add(new V(d + size.x / 2, 0, 0));
        sc.choose(eye, scale, 1 / 60);
        // let any fade run out
        for (let i = 0; i < 60; i++) sc.choose(eye, scale, 1 / 60);
        const got = scale / Math.max(1, p.box.distanceToPoint(eye));
        swept.push({ name: p.name, ppm: got, wanted: p.wanted, shown: p.shown, drawn: p.nodes.map((n) => n?.visible ?? null) });
      }
    }
    // and back as the stage has it
    sc.choose(st.camera.position, scale, Number.POSITIVE_INFINITY);
    return { asIs, swept };
  });
  console.log(where);
  const expect = (ppm, above, was) => {
    // chooseLevel's own rule, margins and all
    let level = Math.min(was, above.length);
    while (level > 0 && ppm > above[level - 1] * 1.12) level--;
    while (level < above.length && ppm < above[level] * 0.9) level++;
    return level;
  };
  for (const p of r.asIs) {
    console.log(`  as the stage has it: ${p.name} ${p.ppm.toFixed(2)} px/m, thresholds ${p.above}, level ${p.shown} drawn (${p.visible})`);
    if (p.ppm < p.above[1] * 0.9 && p.shown !== 2) fails.push(`${where}: ${p.name} at ${p.ppm.toFixed(2)} px/m is drawn at ${p.shown}`);
    if (p.visible.filter(Boolean).length !== 1 || !p.visible[p.shown]) fails.push(`${where}: ${p.name}: drawn ${p.visible}`);
  }
  const was = {};
  for (const s of r.swept) {
    const want = expect(s.ppm, r.asIs.find((p) => p.name === s.name).above, was[s.name] ?? 0);
    was[s.name] = want;
    const ok = s.shown === want && s.drawn.filter(Boolean).length === 1 && s.drawn[want];
    console.log(`  ${s.name} at ${s.ppm.toFixed(2)} px/m: wanted ${s.wanted}, drawn ${s.shown} (${s.drawn}) ${ok ? 'ok' : 'WRONG'}`);
    if (!ok) fails.push(`${where}: ${s.name} at ${s.ppm.toFixed(2)} px/m drawn ${s.shown}, wants ${want}`);
  }
  if (errors.length) fails.push(`${where}: console errors: ${errors.slice(0, 3).join(' | ')}`);
  await page.close();
}
await browser.close();
console.log(fails.length ? `\n${fails.length} failed:\n  ${fails.join('\n  ')}` : '\nevery piece drawn at the level its size calls for');
process.exit(fails.length ? 1 : 0);
