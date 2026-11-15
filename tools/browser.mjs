// The one browser every tool under tools/ drives, and the few things they all do with it.
//   import { launch, url, opt, flag, open, checks } from './browser.mjs';
// Read from the environment, so the same tool runs on the laptop and on a Linux machine:
//   SR_URL       the page under test when no url is given on the command line (default http://localhost:5180/)
//   SR_CHROME    a Chrome or Chromium executable (default: the installed Google Chrome, Playwright's `chrome` channel;
//                on Linux the first google-chrome-stable, google-chrome, chromium or chromium-browser on PATH)
//   SR_ANGLE     ANGLE's back end, --use-angle=<this> (default: metal on macOS, vulkan on Linux; `none` passes none)
//   SR_HEADLESS  unset: Playwright's headless (Chrome's new headless); `0`: a window; `new` or `old`: --headless=<this>
//   SR_ARGS      more switches, space-separated, after everything else (e.g. --enable-unsafe-swiftshader)
// With none of them set on macOS a tool launches exactly what it always did: the installed Chrome on ANGLE's Metal.
//
// On Linux (hal9000: NixOS, an RTX 4090, Chrome 156 from nixpkgs) the defaults draw the page correctly, headless, with
// no display: ANGLE on Vulkan reports the card and the vehicle, the launch sites and the gallery come out as on the
// laptop. `SR_ANGLE=gl-egl` draws them too, about half as fast to load. `SR_ANGLE=swiftshader` (with
// SR_ARGS=--enable-unsafe-swiftshader) is the software fallback: it reports SwiftShader, and is too slow to load a site
// in three minutes. Run there as on the laptop: SR_URL=http://localhost:<port>/ node tools/<tool>.mjs
//
// What is comparable between machines: what a check decides from what is drawn (the frozen and flicker checks, levels
// of detail chosen, wheels, positions, memory as the page accounts it) is the page's and should agree; a screenshot
// should show the same scene, though fonts differ (a list's height in px is not the same on Linux). Frame times, load
// times and anything per second are the machine's own and are compared only with themselves (bench.mjs --compare).
import { accessSync, constants } from 'node:fs';
import { delimiter, join } from 'node:path';
import { chromium, webkit } from 'playwright-core';

/** Linux's back end (see the header): what draws correctly, headless, on a Linux machine with an NVIDIA GPU. */
const LINUX_ANGLE = 'vulkan';

/** The switches a GPU-drawing Chrome is launched with here: the back end, the GPU allowed, and SR_ARGS. */
export function gpuArgs() {
  const linux = process.platform === 'linux';
  const angle = process.env.SR_ANGLE ?? (linux ? LINUX_ANGLE : 'metal');
  return [...(angle && angle !== 'none' ? [`--use-angle=${angle}`] : []), '--enable-gpu', '--ignore-gpu-blocklist'];
}

/**
 * Where Chrome is: SR_CHROME; on Linux with none given, the first Chrome or Chromium on PATH (Playwright's `chrome`
 * channel looks only in /opt/google/chrome, where Nix puts nothing); otherwise the installed Chrome.
 */
function chrome() {
  if (process.env.SR_CHROME) return { executablePath: process.env.SR_CHROME };
  if (process.platform === 'linux')
    for (const dir of (process.env.PATH ?? '').split(delimiter))
      for (const name of ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'])
        try {
          accessSync(join(dir, name), constants.X_OK);
          return { executablePath: join(dir, name) };
        } catch {}
  return { channel: 'chrome' };
}

/**
 * A browser. `args`: more switches, after the GPU's. `gpu: false` launches it with no switches of its own (a page that
 * draws nothing in WebGL: the logo, comparing pictures). `engine: 'webkit'` launches WebKit, which takes none of this.
 * Anything else is passed to Playwright's launch.
 */
export async function launch({ engine = 'chromium', gpu = true, args = [], ...rest } = {}) {
  if (engine === 'webkit') return webkit.launch({ args, ...rest });
  const headless = process.env.SR_HEADLESS;
  const extra = (process.env.SR_ARGS ?? '').split(' ').filter(Boolean);
  return chromium.launch({
    ...chrome(),
    ...(headless === '0' ? { headless: false } : {}),
    args: [...(gpu ? gpuArgs() : []), ...args, ...(headless === 'new' || headless === 'old' ? [`--headless=${headless}`] : []), ...extra],
    ...rest,
  });
}

/** The page under test: the first argument left, else SR_URL, else the dev server's own. */
export const url = (args) => args[0] ?? process.env.SR_URL ?? 'http://localhost:5180/';

/** `--name value` taken out of `args` (so what is left is positional), or `fallback`. */
export const opt = (args, name, fallback) => (args.includes(name) ? args.splice(args.indexOf(name), 2)[1] : fallback);

/** `--name` taken out of `args`: was it there? */
export const flag = (args, name) => (args.includes(name) ? Boolean(args.splice(args.indexOf(name), 1)) : false);

/** What `open` waits for, by name: the page's debug handle; a site's stage with its curtain lifted; the front page drawn; the gallery. */
const WAITS = {
  sr: () => window.sr,
  ready: () => window.sr && document.querySelector('.loading.done'),
  front: () => window.sr?.front,
  gallery: () => window.sr?.gallery?.ready,
};

/**
 * A page of its own (its own context) at `address` (null: left blank, for a tool to take where it will), and what it
 * says went wrong. Options:
 *   context   the context's options (default 1280x800 at 1); `viewport: [w, h]` is the short way to give only a size
 *   console   the console's message types counted as errors (default ['error']; [] counts none), with every pageerror
 *   socket    keep the dev server's socket from the page, so its reloads (other people's edits) do not restart it (default true)
 *   slowGlb   milliseconds every .glb is kept back by
 *   before    run with the page before it goes to the address (routes, init scripts)
 *   wait      one of WAITS, a function run in the page, or null; `timeout` for it (default 60 s). `front` also waits
 *             for the front page's picture to be ready.
 */
export async function open(
  browser,
  address,
  {
    context: options,
    viewport = [1280, 800],
    console: kinds = ['error'],
    socket = true,
    slowGlb = 0,
    before,
    wait = 'ready',
    timeout = 60000,
  } = {},
) {
  const context = await browser.newContext(options ?? { viewport: { width: viewport[0], height: viewport[1] }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => kinds.includes(m.type()) && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  if (socket) await page.routeWebSocket(/.*/, () => {});
  if (slowGlb)
    await page.route(/\.glb(\?|$)/, async (route) => {
      await new Promise((done) => setTimeout(done, slowGlb));
      await route.continue().catch(() => {});
    });
  if (before) await before(page);
  if (!address) return { page, context, errors, close: () => context.close() };
  await page.goto(address);
  if (wait) await page.waitForFunction(WAITS[wait] ?? wait, null, { timeout });
  if (wait === 'front') await page.evaluate(() => window.sr.front.ready);
  return { page, context, errors, close: () => context.close() };
}

/** A tally of promises checked: `check(ok, what)` prints a line and remembers each that failed. */
export function checks() {
  const failures = [];
  const check = (ok, what) => {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
    if (!ok) failures.push(what);
    return ok;
  };
  return { check, failures };
}
