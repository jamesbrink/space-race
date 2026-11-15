// One screenshot of the running viewer, from its own headless browser.
//   node tools/shot.mjs <out.png> <model> "<js run in the page>" [width height] [--ui] [--hover x,y] [--click x,y]
//   node tools/shot.mjs /tmp/pad.png pad "sr.stage.pose(215, 9, 150, 14)"
//   node tools/shot.mjs /tmp/gallery.png usa/mercury/mr-3-freedom-7/gallery "sr.gallery.stage.pose(215, 9, 60, 12)" --ui
//   node tools/shot.mjs /tmp/front.png "" "sr.front.seek(80)" 1440 900 --ui      the front page (an address that names nothing), 80 s along its path
// The page's UI is hidden unless --ui is given. `sr` is the viewer's debug handle (see AGENTS.md).
import { launch, open } from './browser.mjs';

const args = process.argv.slice(2);
const ui = args.includes('--ui');
const hoverAt = args.indexOf('--hover'); // --hover x,y moves the mouse there before the shot
const hover = hoverAt >= 0 ? args.splice(hoverAt, 2)[1].split(',').map(Number) : null;
const clickAt = args.indexOf('--click'); // --click x,y clicks there before the script runs: a real gesture, which sound waits for
const click = clickAt >= 0 ? args.splice(clickAt, 2)[1].split(',').map(Number) : null;
const [out, model = 'vehicle', js = '', w = '1600', h = '1000'] = args.filter((a) => a !== '--ui');
if (!out) {
  console.error('usage: shot.mjs <out.png> <model> "<js>" [width height] [--ui]');
  process.exit(2);
}
const browser = await launch();
// (the front page has no curtain and no stage: its own picture, held still for a script until it is told where to be)
const front = model === '';
const { page, errors } = await open(browser, `${process.env.SR_URL ?? 'http://localhost:5180/'}#${model}`, {
  viewport: [Number(w), Number(h)],
  console: ['error', 'warning'],
  wait: front ? 'front' : 'ready',
});
if (!ui) await page.addStyleTag({ content: '#ui, #gallery, #title { display: none !important }' });
if (click) await page.mouse.click(click[0], click[1]);
// (the stage that is on show: the gallery has its own)
await page.evaluate(
  front
    ? `(async () => { const sr = window.sr; ${js}; })()`
    : `(async () => { const sr = window.sr; (sr.gallery?.active ? sr.gallery.stage : sr.stage).setAutoRotate(false); ${js}; })()`,
);
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
