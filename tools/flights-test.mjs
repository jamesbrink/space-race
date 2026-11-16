// Flight to flight with no reload (`pnpm test:flights`; needs `pnpm dev`): the page goes from one flight to another and
// back, several times, through each one's gallery, launch site and flight deck (app/main.ts: a session for each flight,
// on the same two stages). At every place it checks that it is the page it was asked for and nothing else:
//   - the page was not loaded again (a mark put on the window at the start is still there);
//   - the right flight is on show: the title, the parts in the panel, and at the site the setting (its place, pad and
//     day: the sky and season are the flight's date's) with its Sun and haze as a page opened at that flight has them;
//   - what is held does not grow: GPU memory as the page accounts it (`?mem`, app/mem.ts) and the listeners on the
//     window and the document come back to where they were the last time the same place of the same flight was seen;
//   - the programs the site is drawn with are the ones a page opened fresh at that flight builds (the land, a plant, the
//     globe, the vehicle: their shaders' text is the place's, its season's and its day's, and three keeps a program by
//     its key: viewer/programs.ts); by default the hop is the Cape, Tyuratam in April (Vostok 1) and in August (Vostok 2),
//     and the two Tyuratam lands are checked to be drawn differently;
// then that Back and Forward still go where the visitor was, across flights and within one. The first round is the page
// coming to hold what it holds (each stage made, with a flight on it); each round after is held to the one before.
//   node tools/flights-test.mjs [url] [--rounds 3] [--flights a,b,c]
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const rounds = Math.max(3, Number(opt(args, '--rounds', '3')));
const FLIGHTS = opt(
  args,
  '--flights',
  'usa/mercury/mr-3-freedom-7,ussr/vostok/vostok-1,ussr/vostok/vostok-2,ussr/vostok/vostok-3,ussr/vostok/vostok-4',
).split(',');
const [A, B] = FLIGHTS.slice(-2);
const url = urlOf(args);
/**
 * How much GPU memory a place may hold over the last time it was seen, MiB: what is sent as it is first drawn comes and
 * goes with where the camera was (a level of detail, a map that came late), 45 at Site 1 between rounds. A place left
 * behind whole was 450 and more a round (the globe's maps), and grew every round.
 */
const GROWTH = 64;

// Listeners on the window and the document, counted as they are added and taken off (a signal's abort takes off
// every listener given it): installed before the page's own scripts run.
const counting = () => {
  const live = new Map();
  const ids = new WeakMap();
  let next = 0;
  const idOf = (fn) => {
    if (!ids.has(fn)) ids.set(fn, ++next);
    return ids.get(fn);
  };
  for (const target of [window, document]) {
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    target.addEventListener = (type, fn, options) => {
      add(type, fn, options);
      if (!fn) return;
      const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
      const k = `${target === window ? 'w' : 'd'}|${type}|${capture}|${idOf(fn)}`;
      if (live.has(k)) return;
      live.set(k, true);
      options?.signal?.addEventListener('abort', () => live.delete(k), { once: true });
    };
    target.removeEventListener = (type, fn, options) => {
      remove(type, fn, options);
      if (!fn) return;
      const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
      live.delete(`${target === window ? 'w' : 'd'}|${type}|${capture}|${idOf(fn)}`);
    };
  }
  window.srListeners = () => live.size;
  window.srLoaded = Math.random();
};

const browser = await launch();
const { check, failures } = checks();

/**
 * The text of the programs the site draws its land, a plant, the globe and the vehicle with, each as a short hash of
 * its vertex and fragment shaders as the GPU was given them (what three built: properties' current program).
 */
const programs = () =>
  page.evaluate(() => {
    const st = window.sr.stage;
    const r = st.renderer;
    const gl = r.getContext();
    const hash = (text) => {
      let h = 0;
      for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) | 0;
      return (h >>> 0).toString(36);
    };
    const of = (material) => {
      const program = material && r.properties.get(material).currentProgram;
      // (less the name of whichever material the program was first built for: three shares one among all with its key)
      const text = (shader) => gl.getShaderSource(shader).replace(/^#define SHADER_NAME .*$/m, '');
      return program ? hash(text(program.vertexShader) + text(program.fragmentShader)) : null;
    };
    const first = (root, test) => {
      let found = null;
      root?.traverse((o) => {
        const m = o.material && (o.userData.real ?? o.material);
        if (!found && o.isMesh && o.visible && m && !Array.isArray(m) && test(m)) found = m;
      });
      return found;
    };
    const s = st.setting;
    const scenery = { traverse: (fn) => s.scenery.forEach((o) => o.traverse(fn)) };
    return {
      land: of(s.floor && (s.floor.userData.real ?? s.floor.material)),
      plant: of(first(scenery, (m) => m.name.startsWith('plant'))),
      globe: of(s.globe && (s.globe.mesh.userData.real ?? s.globe.mesh.material)),
      vehicle: of(first(st.staged[0]?.group, (m) => m.isMeshStandardMaterial)),
    };
  });

/** What a page opened fresh at a flight's launch site says of its setting and builds: what the same flight is to be after a switch. */
async function fresh(flight) {
  const opened = await open(browser, `${url}#${flight}/site/pad`, { wait: 'ready', timeout: 240_000 });
  page = opened.page;
  await page.waitForFunction(() => document.body.classList.contains('scene-ready'), null, { timeout: 240_000 });
  await page.waitForTimeout(3000);
  const got = await page.evaluate(() => {
    const st = window.sr.stage;
    const s = st.setting;
    return {
      key: st.settingKey,
      sun: s.sunDir.toArray().map((v) => +v.toFixed(5)),
      fog: s.fog?.density ?? null,
      exposure: +s.exposure.toFixed(4),
    };
  });
  got.programs = await programs();
  await opened.close();
  return got;
}
let page;
const truth = {};
for (const f of FLIGHTS) {
  truth[f] = await fresh(f);
  console.log(`opened fresh: ${f}: ${truth[f].key}; programs ${JSON.stringify(truth[f].programs)}`);
}
const tyuratam = FLIGHTS.filter((f) => f.startsWith('ussr/vostok/'));
if (tyuratam.length === 2)
  check(
    truth[tyuratam[0]].programs.land !== truth[tyuratam[1]].programs.land,
    `the land at Tyuratam is drawn differently in ${tyuratam.map((f) => f.split('/').at(-1)).join(' and ')} (its season)`,
  );

const opened = await open(browser, null, { console: ['error'] });
page = opened.page;
const errors = opened.errors;
await page.addInitScript(counting);
await page.goto(`${url}?mem#${FLIGHTS[0]}/gallery`);
const loaded = await page.waitForFunction(() => window.srLoaded, null, { timeout: 60_000 }).then((h) => h.jsonValue());

const settle = () => page.waitForTimeout(1500);
const galleryReady = () => page.waitForFunction(() => window.sr?.gallery?.ready && window.sr.gallery.active, null, { timeout: 180_000 });
const siteReady = () =>
  page.waitForFunction(() => document.body.classList.contains('scene-ready') && !window.sr?.gallery?.active, null, { timeout: 240_000 });
const go = (hash) => page.evaluate((h) => (location.hash = h), hash);
/** What is held now, and who is on show. */
const look = () =>
  page.evaluate(() => {
    const sr = window.sr;
    const st = sr.stage;
    const s = st?.setting;
    const title = (sel) => document.querySelector(sel)?.textContent?.trim() ?? '';
    return {
      loaded: window.srLoaded,
      flight: sr.flight.id,
      title: document.title,
      siteTitle: title('#ui .title h1'),
      galleryTitle: title('#gallery .title h1'),
      parts: [...document.querySelectorAll('#ui [data-node], #gallery [data-node]')].map((b) => b.dataset.node).slice(0, 40),
      setting:
        s && sr.gallery?.active === false
          ? {
              key: st.settingKey,
              sun: s.sunDir.toArray().map((v) => +v.toFixed(5)),
              fog: s.fog?.density ?? null,
              exposure: +s.exposure.toFixed(4),
            }
          : null,
      mib: window.srMem?.report().total ?? null,
      listeners: window.srListeners(),
      fly: Boolean(sr.cockpit?.active),
      // what the stage in front is drawing, and that it is drawing at all
      drawn: (() => {
        const shown = sr.gallery?.active ? sr.gallery.stage : st;
        return { awake: Boolean(shown && !shown.sleeping), urls: (shown?.defs ?? []).map((d) => d.url) };
      })(),
    };
  });

const seen = new Map();
async function at(flight, place, round) {
  await settle();
  const got = await look();
  const name = `${flight.split('/').at(-1)} ${place}`;
  check(got.loaded === loaded, `${name}: the page was not loaded again`);
  check(got.flight === flight, `${name}: the flight on show is ${got.flight}`);
  check(got.title.startsWith(flightTitle[flight]), `${name}: the title is the flight's ("${got.title}")`);
  const names = flightParts[flight];
  check(got.parts.length > 0 && got.parts.every((n) => names.has(n)), `${name}: the parts listed are the flight's (${got.parts.length})`);
  check(
    got.drawn.awake && got.drawn.urls.length > 0 && got.drawn.urls.every((u) => flightUrls[flight].has(u)),
    `${name}: the stage in front is awake and drawing the flight's own models (${got.drawn.urls.map((u) => u.split('/').at(-1)).join(', ')})`,
  );
  const t = truth[flight];
  // (at the site the clock stands at liftoff, as a fresh page's does; on the deck it runs, and the Sun with it)
  if (place === 'site')
    check(
      got.setting && got.setting.key === t.key && JSON.stringify(got.setting.sun) === JSON.stringify(t.sun) && got.setting.fog === t.fog,
      `${name}: its place, day, Sun and haze are a fresh page's (${got.setting?.key})`,
    );
  if (place === 'site') {
    const now = await programs();
    for (const [what, text] of Object.entries(now))
      check(
        text === t.programs[what] && (text !== null || what !== 'land'),
        `${name}: its ${what} is drawn with the program a fresh page builds (${text}, ${t.programs[what]})`,
      );
  }
  if (place === 'site' && round === 0) {
    // the flown vehicle on its pad before liftoff, in the air a hundred seconds up, and hours after the record's run has
    // ended not in the scene at all (not back on its pad: ascent.ts `gone`); then the clock back at liftoff
    const where = await page.evaluate(async () => {
      const { clock, stage } = window.sr;
      const show = stage.show;
      const seen = async (t) => {
        clock.seek(t);
        for (let i = 0; i < 100 && show.lifted.t !== clock.t; i++) await new Promise((r) => requestAnimationFrame(r));
        const g = show.flier?.group;
        return { visible: Boolean(g?.visible), flying: show.lifted.flying, gone: show.lifted.gone };
      };
      const end = show.ascent?.duration ?? Number.NaN;
      const out = { before: await seen(-60), during: await seen(100), after: await seen(end + 9.8 * 3600), end };
      clock.seek(0);
      return out;
    });
    check(where.before.visible && !where.before.flying, `${name}: before liftoff the vehicle stands on its pad`);
    check(where.during.visible && where.during.flying, `${name}: a hundred seconds up it is flying`);
    check(
      !where.after.visible && where.after.gone && !where.after.flying,
      `${name}: 9.8 hours after the run's end (${where.end.toFixed(0)} s) it is not in the scene`,
    );
  }
  if (place === 'fly')
    check(got.setting && got.setting.key === t.key && got.setting.fog === t.fog, `${name}: its place, day and haze are a fresh page's`);
  if (place === 'fly') check(got.fly, `${name}: the flight deck is up`);
  // (the first round is the page coming to hold what it holds: both stages made, each with a flight on it)
  const was = round > 1 ? seen.get(name) : null;
  if (was) {
    check(got.mib <= was.mib + GROWTH, `${name}: GPU memory ${got.mib.toFixed(0)} MiB, ${was.mib.toFixed(0)} the last time here`);
    check(
      got.listeners <= was.listeners,
      `${name}: ${got.listeners} listeners on the window and document, ${was.listeners} the last time here`,
    );
  } else console.log(`  ${name}: ${got.mib?.toFixed(0)} MiB, ${got.listeners} listeners`);
  seen.set(name, got);
}

// each flight's title and parts, as the data has them
const meta = await page.evaluate(async (ids) => {
  const { flights } = await import('/missions/index.ts');
  return ids.map((id) => {
    const f = flights.find((x) => x.id === id);
    return { title: f.callsign, parts: f.models.flatMap((m) => m.parts.map((p) => p.node)), urls: f.models.map((m) => m.url) };
  });
}, FLIGHTS);
const flightTitle = Object.fromEntries(FLIGHTS.map((f, i) => [f, meta[i].title]));
const flightParts = Object.fromEntries(FLIGHTS.map((f, i) => [f, new Set(meta[i].parts)]));
const flightUrls = Object.fromEntries(FLIGHTS.map((f, i) => [f, new Set(meta[i].urls)]));

await galleryReady();
for (let round = 0; round < rounds; round++) {
  for (const flight of FLIGHTS) {
    if (!(round === 0 && flight === FLIGHTS[0])) {
      await go(`#${flight}/gallery`);
      await galleryReady();
    }
    await at(flight, 'gallery', round);
    await go(`#${flight}/site/pad`);
    await siteReady();
    await at(flight, 'site', round);
    await go(`#${flight}/fly`);
    await page.waitForFunction(() => window.sr.cockpit?.active, null, { timeout: 60_000 }).catch(() => {});
    await at(flight, 'fly', round);
  }
}

// Back and Forward: within the last flight (its deck, its site, its gallery), then across to the flight before (where it
// was left: its deck), and Forward into the last one's gallery again
const flightNow = () => page.evaluate(() => [window.sr.flight.id, location.hash]);
const arrive = (id) => page.waitForFunction((f) => window.sr?.flight?.id === f, id, { timeout: 120_000 }).catch(() => {});
for (const [step, id, place, what] of [
  ['back', B, '/site', `Back from ${B}'s deck: its launch site`],
  ['back', B, '/gallery', 'Back again: its gallery'],
  ['back', A, '/fly', `Back again: across to ${A}, where it was left`],
  ['forward', B, '/gallery', `Forward: ${B}'s gallery again`],
]) {
  await (step === 'back' ? page.goBack() : page.goForward());
  await arrive(id);
  await settle();
  const [now, hash] = await flightNow();
  check(now === id && hash.includes(place), `${what} (${hash})`);
}
// A flight that is only its vehicle (only.ts: no site, so the site's stage is let go whole: Stage.unload), and back
// to a flight with a site, which is built again as a fresh page builds it
const ONLY = opt(args, '--only', 'usa/mercury/ma-7-aurora-7'); // (Friendship 7 has its site now)
await go(`#${ONLY}/gallery`);
await arrive(ONLY);
await galleryReady().catch(() => {});
await settle();
{
  const got = await page.evaluate(() => ({
    gallery: Boolean(window.sr.gallery?.active),
    deck: 'cockpit' in window.sr,
    urls: (window.sr.gallery?.stage?.defs ?? []).map((d) => d.url),
  }));
  check(
    got.gallery && !got.deck && got.urls.length > 0,
    `${ONLY}: its gallery alone, drawing ${got.urls.map((u) => u.split('/').at(-1)).join(', ')}`,
  );
}
await go(`#${B}/site/pad`);
await arrive(B);
await siteReady();
await at(B, 'site', 0);
check((await look()).loaded === loaded, 'and through all of it the page was never loaded again');

check(
  errors.length === 0,
  `errors on the page's console: ${errors.length}${errors.length ? `\n    ${errors.slice(0, 5).join('\n    ')}` : ''}`,
);
await browser.close();
console.log(failures.length ? `flights-test: ${failures.length} FAILED` : 'flights-test: ok');
process.exit(failures.length ? 1 : 0);
