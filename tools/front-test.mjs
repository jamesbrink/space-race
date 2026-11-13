// The front page in the running page, as a visitor has it: what an address that names nothing shows, what going into
// a flight and coming back out do, what it draws when, and what it holds (`pnpm test:front`; needs `pnpm dev`).
//   node tools/front-test.mjs [url] [--only <name>] [--no-idle]      (default url: http://localhost:5180/)
// It checks what the page promises (docs/agents/gallery.md, "The front page"; rendering.md, "The front page's picture"):
//   opens      a bare address is the front page: its own picture, the list over it, and no flight's page behind it
//   moves      the camera goes out along its path and the Earth turns; settled, it draws only as the Earth turns
//   still      asked for less motion, the picture is one still frame and the clock is stopped
//   enters     a flight chosen is named in the address at once; its curtain is a card over the picture, which goes on
//              moving; no key acts under it; when it lifts the picture's canvas and context are let go
//   leaves     the Space Race crumb comes back to the front page, with nothing of the flight held
//   steady     the list scrolled end to end by wheel and by touch moves nothing sideways, and there is nothing to scroll sideways
//   old links  #pad is still Freedom 7's launch site, with no front page in the way
//   idle       left alone half a minute the words make way for the picture, and come back at a touch (--no-idle skips the wait)
//   holds      as a phone (390x844 at 3, touch): what the front page holds on the GPU, and the most while a flight
//              arrives over it, against the budget below
// and says what a frame of it costs here (not held to a figure: it is this machine's, now).
// The dev server's reloads are kept from the page under test, so other people's edits do not restart it.
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args.splice(args.indexOf(name), 2)[1] : fallback);
const only = opt('--only', null);
const noIdle = args.includes('--no-idle') && Boolean(args.splice(args.indexOf('--no-idle'), 1));
const url = args[0] ?? process.env.SR_URL ?? 'http://localhost:5180/';
const FLIGHT = 'usa/mercury/mr-3-freedom-7';

/**
 * Accounted GPU memory as a phone, MiB (src/mem.ts; rendering.md, "Memory"): the front page by itself, and the most
 * at any moment while a flight's gallery arrives over it (the picture is let go only when the flight is there to
 * be seen). Measured when set: 71 and 257 (the gallery alone, after: 186).
 */
export const BUDGET = { front: 90, entering: 350 };

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });

/** A page at `hash`. `search`: the address's query (`?demo`: not treated as a script, so the picture moves). */
async function open(hash = '', { search = '', reduced = false, phone = false, slow = 0, size = [1280, 800] } = {}) {
  const context = await browser.newContext(
    phone
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }
      : { viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' },
  );
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.routeWebSocket(/.*/, () => {});
  if (slow)
    await page.route(/\.glb(\?|$)/, async (route) => {
      await new Promise((done) => setTimeout(done, slow));
      await route.continue().catch(() => {});
    });
  await page.goto(`${url}${search}#${hash}`);
  return { page, errors, context };
}
const front = async (page) => {
  await page.waitForFunction(() => window.sr?.front, null, { timeout: 60000 });
  await page.evaluate(() => window.sr.front.ready);
};

const failures = [];
const check = (ok, what) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
};
async function scenario(name, run) {
  if (only && only !== name) return;
  console.log(name);
  try {
    await run();
  } catch (e) {
    check(false, `${name}: ${e.message.split('\n')[0]}`);
  }
}

await scenario('opens', async () => {
  const { page, errors, context } = await open('');
  await front(page);
  const s = await page.evaluate(() => ({
    title: Boolean(document.querySelector('#title:not([hidden])')),
    flights: document.querySelectorAll('#title [data-flight]').length,
    canvas: document.querySelector('#front')?.classList.contains('on'),
    flightPage: Boolean(window.sr.stage || window.sr.gallery),
    instant: window.sr.instant,
    earth: window.sr.front.earthPixels,
    hash: location.hash,
  }));
  check(s.title && s.flights > 0, `the list is up, ${s.flights} flights to go into`);
  check(s.canvas, 'its own picture is on show');
  check(!s.flightPage, 'no flight’s page is behind it');
  check(s.instant.startsWith('1961-04-12T06:0'), `the moment on show is ${s.instant}`);
  check(Math.abs(s.earth / 800 - 0.315) < 0.01, `the Earth is a third of the shorter side across (${s.earth.toFixed(0)} px of 800)`);
  check(s.hash === '', 'the address names nothing');
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await context.close();
});

await scenario('moves', async () => {
  const { page, errors, context } = await open('', { search: '?demo' });
  await front(page);
  await page.waitForTimeout(3000);
  const a = await page.evaluate(() => ({ t: window.sr.front.t, h: window.sr.front.eye.height, ...window.sr.front.stats() }));
  await page.waitForTimeout(2000);
  const b = await page.evaluate(() => ({ t: window.sr.front.t, h: window.sr.front.eye.height, ...window.sr.front.stats() }));
  check(
    b.t > a.t + 1.5 && b.h > a.h,
    `the camera is on its way out (${a.t.toFixed(1)} s to ${b.t.toFixed(1)} s, ${(a.h / 1000).toFixed(1)} km to ${(b.h / 1000).toFixed(1)} km)`,
  );
  check(b.drawn > 0.8 * b.fps, `and every frame is drawn while it is (${b.drawn.toFixed(0)} of ${b.fps.toFixed(0)} a second)`);
  // settled: the camera has stopped, the Earth still turns
  await page.evaluate(() => window.sr.front.seek(window.sr.path.seconds + 5));
  await page.waitForTimeout(3500);
  const c = await page.evaluate(() => ({ h: window.sr.front.eye.height, ...window.sr.front.stats() }));
  check(Math.abs(c.h - 100_000_000) < 1, 'it settles 100,000 km out');
  check(
    c.drawn > 0.4 && c.drawn < 0.5 * c.fps,
    `settled, it draws only as the Earth turns (${c.drawn.toFixed(1)} of ${c.fps.toFixed(0)} a second)`,
  );
  for (const [t, what] of [
    [0, 'at the start'],
    [150, 'half way'],
    [305, 'settled'],
  ]) {
    const ms = await page.evaluate((t) => {
      window.sr.front.seek(t);
      return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(window.sr.front.cost(60)))));
    }, t);
    console.log(`       a frame ${what}: ${ms.toFixed(2)} ms (1280x800 at 1, this machine, now)`);
  }
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await context.close();
});

await scenario('still', async () => {
  const { page, errors, context } = await open('', { search: '?demo', reduced: true });
  await front(page);
  await page.waitForTimeout(2500);
  const shot = () => page.locator('#front').screenshot();
  const a = await shot();
  const s1 = await page.evaluate(() => ({ still: window.sr.front.still, t: window.sr.front.t, instant: window.sr.instant }));
  await page.waitForTimeout(2500);
  const b = await shot();
  const s2 = await page.evaluate(() => ({ t: window.sr.front.t, ...window.sr.front.stats() }));
  check(s1.still && s2.t === 0, 'asked for less motion, the path is not run');
  check(s1.instant.startsWith('1961-04-12T06:06:59'), `and the clock is stopped at the instant (${s1.instant})`);
  check(a.equals(b), 'the picture is one still frame');
  check(s2.drawn === 0, `and nothing is drawn again (${s2.drawn} a second)`);
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await context.close();
});

await scenario('enters', async () => {
  const { page, errors, context } = await open('', { search: '?demo&mem', slow: 2500 });
  await front(page);
  await page.waitForTimeout(1500);
  await page.locator(`#title [data-flight="${FLIGHT}"]`).click();
  const at = await page.evaluate(() => location.hash);
  check(at === `#${FLIGHT}/gallery`, `the address names the flight at once (${at})`);
  await page.waitForFunction(() => document.querySelector('#gallery .loading.began'), null, { timeout: 60000 });
  const t1 = await page.evaluate(() => window.sr.front?.t ?? -1);
  // no key acts under a curtain: T would change the look, H clear the panels
  for (const key of ['t', 'h', 'c']) await page.keyboard.press(key);
  await page.waitForTimeout(1200);
  const during = await page.evaluate(() => ({
    fronted: document.body.classList.contains('fronted'),
    words: Boolean(document.querySelector('#title:not([hidden]):not(.leaving)')),
    card: getComputedStyle(document.querySelector('#gallery .loading')).backgroundColor,
    picture: Boolean(document.querySelector('#front.on:not(.leaving)')),
    t: window.sr.front?.t ?? -1,
    contexts: window.srMem.report().contexts,
  }));
  check(during.fronted && !during.words, 'the list is away and the flight is arriving');
  check(during.picture && during.t > t1 + 0.5, `the picture holds, and goes on moving (${t1.toFixed(1)} s to ${during.t.toFixed(1)} s)`);
  check(during.card === 'rgba(0, 0, 0, 0)', 'the flight’s curtain is a card over it, not a black page');
  await page.waitForFunction(() => document.querySelector('#gallery .loading.done'), null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => ({
    front: Boolean(document.querySelector('#front')),
    fronted: document.body.classList.contains('fronted'),
    gallery: Boolean(window.sr.gallery?.active),
    cel: document.querySelector('#gallery')?.classList.contains('cel'),
    bare: document.querySelector('#gallery')?.classList.contains('bare'),
    contexts: window.srMem.report().contexts,
    owners: [...new Set(window.srMem.report().list.map((a) => a.context))].length,
    hash: location.hash,
  }));
  check(after.gallery && after.hash === `#${FLIGHT}/gallery`, 'the flight’s gallery is the place on show');
  check(!after.front && !after.fronted, 'the picture’s canvas is gone');
  check(after.contexts < during.contexts, `and its context with it (${during.contexts} while arriving, ${after.contexts} after)`);
  check(!after.cel && !after.bare, 'no key pressed under the curtain acted');
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);

  if (!only || only === 'enters') {
    console.log('leaves');
    await page.locator('#gallery [data-home]').first().click();
    await page.waitForFunction(() => window.sr?.front && !window.sr.gallery, null, { timeout: 60000 });
    await front(page);
    const back = await page.evaluate(() => ({
      hash: location.hash,
      title: Boolean(document.querySelector('#title:not([hidden])')),
      contexts: window.srMem.report().contexts,
      gallery: Boolean(document.querySelector('#gallery, #gallery-stage')),
      t: window.sr.front.t,
    }));
    check(back.hash === '' && back.title, 'the crumb comes back to the front page, and the address names nothing');
    check(!back.gallery && back.contexts === 1, `nothing of the flight is held (${back.contexts} context)`);
    check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  }
  await context.close();
});

await scenario('steady', async () => {
  // the list scrolled end to end and back, as a trackpad does it (wheel, with a little sideways in it, the pointer
  // resting on the rows as they pass) and as a thumb does (a swipe that drifts); every frame, where everything stands
  for (const [width, height, phone] of [
    [1440, 900, false],
    [820, 1180, false],
    [390, 844, true],
  ]) {
    const { page, errors, context } = await open('', { phone, size: [width, height] });
    await front(page);
    await page.evaluate(() => {
      const t = document.querySelector('#title');
      const things = [
        t,
        document.querySelector('.title-mark'),
        ...document.querySelectorAll('.title-flights > *'),
        document.querySelector('.title-foot'),
      ];
      const at = () => things.map((e) => e.getBoundingClientRect().left);
      const first = at();
      window.__steady = { shift: 0, sideways: 0, wider: t.scrollWidth - t.clientWidth, top: 0 };
      const tick = () => {
        const s = window.__steady;
        s.shift = Math.max(s.shift, ...at().map((x, i) => Math.abs(x - first[i])));
        s.sideways = Math.max(
          s.sideways,
          t.scrollLeft,
          document.documentElement.scrollLeft,
          document.documentElement.scrollWidth - innerWidth,
        );
        s.wider = Math.max(s.wider, t.scrollWidth - t.clientWidth);
        s.top = Math.max(s.top, t.scrollTop);
        window.__steadyFrame = requestAnimationFrame(tick);
      };
      tick();
    });
    if (phone) {
      const cdp = await context.newCDPSession(page);
      for (const dy of [-700, -700, -700, 700, 700, 700])
        await cdp.send('Input.synthesizeScrollGesture', {
          x: 200,
          y: dy < 0 ? 760 : 120,
          xDistance: dy < 0 ? -14 : 14,
          yDistance: dy,
          gestureSourceType: 'touch',
        });
    } else {
      await page.mouse.move(width / 2, height * 0.7);
      for (const dy of [60, -60])
        for (let i = 0; i < 45; i++) {
          await page.mouse.wheel(i % 3 ? -2 : 4, dy);
          await page.waitForTimeout(16);
        }
    }
    await page.waitForTimeout(300);
    const s = await page.evaluate(() => {
      cancelAnimationFrame(window.__steadyFrame);
      return { ...window.__steady, room: document.querySelector('#title').scrollHeight - innerHeight };
    });
    const at = `${width}x${height}${phone ? ', by touch' : ''}`;
    check(s.top >= s.room - 1, `${at}: the list scrolls end to end (${s.top.toFixed(0)} of ${s.room} px)`);
    check(
      s.wider <= 0 && s.sideways <= 0.5,
      `and there is nothing to scroll sideways (${s.wider} px wider than the window, moved ${s.sideways} px)`,
    );
    check(s.shift <= 0.5, `and nothing on it moves sideways as it goes (${s.shift.toFixed(2)} px at most)`);
    check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
    await context.close();
  }
});

await scenario('old links', async () => {
  const { page, errors, context } = await open('pad');
  await page.waitForFunction(() => window.sr && document.querySelector('.loading.done'), null, { timeout: 120000 });
  const s = await page.evaluate(() => ({
    flight: window.sr.flight?.id,
    front: Boolean(document.querySelector('#front, #title')),
    hash: location.hash,
  }));
  check(s.flight === FLIGHT && !s.front, `#pad is still ${FLIGHT}’s launch site, with no front page in the way (${s.hash})`);
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await context.close();
});

if (!noIdle)
  await scenario('idle', async () => {
    const { page, errors, context } = await open('', { search: '?demo' });
    await front(page);
    await page.mouse.move(400, 300);
    await page.waitForTimeout(31500);
    const tucked = await page.evaluate(() => ({
      tucked: document.querySelector('#title').classList.contains('tucked'),
      flightPage: Boolean(window.sr.stage || window.sr.gallery),
      hash: location.hash,
    }));
    check(tucked.tucked, 'left alone half a minute, the words make way for the picture');
    check(!tucked.flightPage && tucked.hash === '', 'and nothing else starts: no flight is picked for the visitor');
    await page.mouse.move(420, 320);
    await page.waitForTimeout(300);
    check(await page.evaluate(() => !document.querySelector('#title').classList.contains('tucked')), 'they come back at a movement');
    check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
    await context.close();
  });

await scenario('holds', async () => {
  const { page, errors, context } = await open('', { search: '?demo&mem', phone: true });
  await front(page);
  await page.waitForTimeout(6000); // (every map in)
  const r = await page.evaluate(() => ({ ...window.srMem.report(), tier: window.sr.front.stats() }));
  console.log(
    `       the front page as a phone: ${r.total.toFixed(0)} MiB (textures ${r.textures.toFixed(0)}, buffers ${r.buffers.toFixed(0)}, canvas ${r.canvases.toFixed(0)}); ${(r.tier.triangles / 1e6).toFixed(2)} M triangles, ${r.tier.calls} calls`,
  );
  check(r.total <= BUDGET.front, `the front page holds ${r.total.toFixed(0)} MiB of ${BUDGET.front}`);
  let peak = r.total;
  await page.locator(`#title [data-flight="${FLIGHT}"]`).tap();
  while (!(await page.evaluate(() => Boolean(document.querySelector('#gallery .loading.done'))).catch(() => false))) {
    peak = Math.max(peak, await page.evaluate(() => window.srMem.report().total).catch(() => 0));
    await page.waitForTimeout(200);
  }
  for (let i = 0; i < 12; i++) {
    peak = Math.max(peak, await page.evaluate(() => window.srMem.report().total));
    await page.waitForTimeout(250);
  }
  const after = await page.evaluate(() => window.srMem.report());
  check(peak <= BUDGET.entering, `the most while a flight arrives over it: ${peak.toFixed(0)} MiB of ${BUDGET.entering}`);
  console.log(`       in the gallery, the picture let go: ${after.total.toFixed(0)} MiB on ${after.contexts} context(s)`);
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await context.close();
});

await browser.close();
console.log(failures.length ? `\n${failures.length} failed:\n  ${failures.join('\n  ')}` : '\nthe front page keeps its promises');
process.exit(failures.length ? 1 : 0);
