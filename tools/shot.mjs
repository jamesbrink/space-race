// One screenshot of the running viewer, from its own headless browser.
//   node tools/shot.mjs <out.png> <model> "<js run in the page>" [width height] [--ui] [--hover x,y]
//   node tools/shot.mjs /tmp/pad.png pad "sr.stage.pose(215, 9, 150, 14)"
// The page's UI is hidden unless --ui is given. `sr` is the viewer's debug handle (see AGENTS.md).
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const ui = args.includes('--ui');
const hoverAt = args.indexOf('--hover'); // --hover x,y moves the mouse there before the shot
const hover = hoverAt >= 0 ? args.splice(hoverAt, 2)[1].split(',').map(Number) : null;
const [out, model = 'vehicle', js = '', w = '1600', h = '1000'] = args.filter((a) => a !== '--ui');
if (!out) {
  console.error('usage: shot.mjs <out.png> <model> "<js>" [width height] [--ui]');
  process.exit(2);
}
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${process.env.SR_URL ?? 'http://localhost:5180/'}#${model}`);
await page.waitForFunction(() => window.sr && document.querySelector('.loading.done'), null, { timeout: 60000 });
if (!ui) await page.addStyleTag({ content: '#ui { display: none !important }' });
await page.evaluate(`(async () => { const sr = window.sr; sr.stage.setAutoRotate(false); ${js}; })()`);
await page.waitForTimeout(1200);
if (hover) {
  await page.mouse.move(hover[0] - 3, hover[1] - 3);
  await page.mouse.move(hover[0], hover[1]);
  await page.waitForTimeout(500);
}
await page.screenshot({ path: out });
await browser.close();
if (errors.length) console.log(`console: ${errors.length}\n  ${errors.slice(0, 6).join('\n  ')}`);
console.log(out);
