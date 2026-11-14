// Sits in every seat of every flight's vehicle in the gallery, as a visitor would, and checks what is promised of it
// (docs/agents/gallery.md, "A seat"; camera.md): the control and C put the camera at the seat's eyes, inside the cabin,
// with the inside at full detail, the man in that seat not drawn where his eyes are and the other beside him drawn; the
// cabin's lights switch; each numbered view leans to what it says and back; getting up puts the camera back where the
// hands had it; the address names the seat and is rewritten, never a step, and Back and Forward follow it; and at 390
// wide the control is there in the sheet with nothing in the control block hidden.
//   node tools/seat-test.mjs [url] [--only <flight id part>] [--shots <dir>]     (default url: http://localhost:5180/)
// `--shots` also writes a picture from every seat in both looks, and of each seated man's visor from beside him.
import { mkdirSync } from 'node:fs';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { exhibit } from '../src/address.ts';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args.splice(args.indexOf(name), 2)[1] : fallback);
const only = opt('--only', null);
const shots = opt('--shots', null);
const url = args[0] ?? process.env.SR_URL ?? 'http://localhost:5180/';
if (shots) mkdirSync(shots, { recursive: true });

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const flights = [];
for (const file of globSync('missions/*/*/flights/*/flight.ts', { cwd: root })) {
  const { flight } = await import(pathToFileURL(join(root, file)).href);
  const vehicle = exhibit(flight);
  if (vehicle?.seats?.length && (!only || flight.id.includes(only)))
    flights.push({ id: flight.id, seats: vehicle.seats, cabin: vehicle.cabin });
}
flights.sort((a, b) => a.id.localeCompare(b.id));
if (!flights.length) {
  console.error('no flight has a seat to sit in');
  process.exit(1);
}

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const fails = [];
const fail = (what) => {
  fails.push(what);
  console.log(`  FAIL ${what}`);
};
const HANDOVER = 1800; // ms: a change of rig fades over at most 1.4 s (camera/index.ts handOver)

async function open(hash, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.routeWebSocket(/.*/, () => {});
  await page.goto(`${url}#${hash}`);
  await page.waitForFunction(() => window.sr?.gallery?.ready, null, { timeout: 180000 });
  // (still: the turntable off, so a view the hands set stays where it was set)
  await page.evaluate(() => {
    const g = window.sr.gallery;
    g.setTurntable(false);
  });
  await page.waitForTimeout(400);
  return { page, errors, close: () => context.close() };
}

/** In the page: the gallery's stage as a test needs it. */
const state = () => {
  const st = window.sr.gallery.stage;
  const g = window.sr.gallery;
  const at = st.current;
  const def = st.defs[at];
  const staged = st.staged[at];
  const cam = st.camera;
  cam.updateMatrixWorld();
  const eye = cam.position;
  const craft = st.exhibited();
  const seatEye = craft?.seat ? [craft.seat.elements[12], craft.seat.elements[13], craft.seat.elements[14]] : null;
  // inside the cabin: within the box round what the cabin calls indoors (or, with no cabin, round the seat's part)
  const THREEBox = cam.position.constructor; // (a Vector3: the box is made by hand)
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  const names = def.cabin?.within ?? [st.partOf(def.seats[g.seat ?? 0].node)];
  for (const n of names) {
    staged.full.getObjectByName(n)?.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox;
      for (const x of [b.min.x, b.max.x])
        for (const y of [b.min.y, b.max.y])
          for (const z of [b.min.z, b.max.z]) {
            const p = new THREEBox(x, y, z).applyMatrix4(o.matrixWorld);
            [p.x, p.y, p.z].forEach((v, k) => {
              lo[k] = Math.min(lo[k], v);
              hi[k] = Math.max(hi[k], v);
            });
          }
    });
  }
  const inside = [eye.x, eye.y, eye.z].every((v, k) => v > lo[k] && v < hi[k]);
  const drawn = (o) => !o || (o.visible && drawn(o.parent));
  const hiddenOf = (seat) => seat.hide?.filter((n) => drawn(staged.full.getObjectByName(n))).length ?? 0;
  const seats = def.seats.map((s) => ({ node: s.node, drawnOfHidden: hiddenOf(s) }));
  return {
    rig: st.cam.rig,
    seat: g.seat,
    eye: [eye.x, eye.y, eye.z],
    q: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
    seatEye,
    inside,
    full: staged.shown === staged.full,
    interiorHidden: st.cabin ? st.cabin.interior.filter((i) => !i.mesh.visible).length : 0,
    seats,
    hash: location.hash,
    history: history.length,
    leaning: st.leaning,
    lighting: st.cabin?.lighting ?? null,
    lightGoals: st.cabin ? st.cabin.lights.map((l) => l.goal) : [],
    sitPressed: document.querySelector('#gallery [data-sit]')?.getAttribute('aria-pressed'),
    bar: !document.querySelector('#gallery > .lookouts').hidden,
  };
};
const read = (page) => page.evaluate(state);
const far = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const turned = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])));

/** Checks that the camera is in seat `n` as promised. */
function seated(s, flight, n, how) {
  const tag = `${flight.id} seat ${n} (${how})`;
  if (s.rig !== 'onboard' || s.seat !== n) return fail(`${tag}: rig ${s.rig}, seat ${s.seat}`);
  if (!s.seatEye || far(s.eye, s.seatEye) > 2e-3)
    fail(`${tag}: the eye is ${s.seatEye ? far(s.eye, s.seatEye).toFixed(3) : '?'} m from the seat's eyes`);
  if (!s.inside) fail(`${tag}: the eye is not inside the cabin`);
  if (!s.full) fail(`${tag}: the model is not at full detail`);
  if (s.interiorHidden) fail(`${tag}: ${s.interiorHidden} of the inside's meshes are not drawn`);
  s.seats.forEach((x, i) => {
    if (i === n && x.drawnOfHidden) fail(`${tag}: ${x.drawnOfHidden} of his own helmet's meshes are drawn`);
    if (i !== n && flight.seats[i].hide?.length && x.drawnOfHidden !== flight.seats[i].hide.length)
      fail(`${tag}: the man in seat ${i} is not all drawn (${x.drawnOfHidden} of ${flight.seats[i].hide.length})`);
  });
  if (!s.hash.endsWith(`/gallery/${flight.seats[n].node}`)) fail(`${tag}: the address is ${s.hash}`);
  if (s.sitPressed !== 'true') fail(`${tag}: the switch is not lit`);
  if (!s.bar) fail(`${tag}: the bar of what can be done from the seat is not shown`);
}

async function picture(page, name) {
  if (!shots) return;
  const hide = await page.addStyleTag({ content: '#gallery > :not(.loading) { visibility: hidden !important }' });
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(shots, `${name}.jpg`), type: 'jpeg', quality: 85 });
  await hide.evaluate((el) => el.remove());
}

for (const flight of flights) {
  console.log(`${flight.id}: ${flight.seats.length} seat(s)`);
  const slug = flight.id.split('/').pop();
  // --- 1280 wide: the whole of it ---
  {
    const { page, errors, close } = await open(`${flight.id}/gallery`, 1280, 800);
    // a view the hands have set
    await page.evaluate(() => window.sr.gallery.stage.pose(205, 12, 9, 2.5));
    await page.waitForTimeout(500);
    const was = await read(page);
    // by the control
    await page.click('#gallery [data-sit]');
    await page.waitForTimeout(HANDOVER);
    let s = await read(page);
    seated(s, flight, 0, 'the control');
    if (s.history !== was.history) fail(`${flight.id}: sitting down added to the history (${was.history} to ${s.history})`);
    await picture(page, `${slug}-seat0-real`);
    // the numbered views
    const lookouts = await page.evaluate(() => window.sr.gallery.stage.lookouts().map((l) => l.name));
    for (let i = 0; i < lookouts.length; i++) {
      const before = await read(page);
      await page.keyboard.press(String(i + 1));
      await page.waitForTimeout(2600);
      const leant = await read(page);
      const target = await page.evaluate((i) => {
        const st = window.sr.gallery.stage;
        const l = st.lookouts()[i];
        const def = st.defs[st.current];
        if (l.periscope) return st.cabin?.screen ? st.cabin.screen.point.toArray() : null;
        const p = new st.camera.position.constructor(...def.cabin.windows[l.window].at);
        return p.applyMatrix4(st.staged[st.current].group.matrixWorld).toArray();
      }, i);
      if (leant.leaning !== i) fail(`${flight.id}: ${i + 1} did not lean to the ${lookouts[i]} (leaning ${leant.leaning})`);
      else if (target && far(leant.eye, target) >= far(before.eye, target) - 0.01)
        fail(`${flight.id}: leaning to the ${lookouts[i]} did not bring the eye nearer it`);
      if (shots && i === 0) await picture(page, `${slug}-seat0-lean-${lookouts[i].toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(2200);
      const back = await read(page);
      if (back.leaning !== null || back.rig !== 'onboard')
        fail(`${flight.id}: Esc did not bring him back from the ${lookouts[i]} into the seat`);
      else if (far(back.eye, back.seatEye) > 2e-3) fail(`${flight.id}: back from the ${lookouts[i]}, the eye is not at the seat`);
    }
    // every switch: each thrown through all its positions and round, by a click on it where it stands on the console (the
    // stage's own handler for a click on a thing of the cabin) and, for one that switches something, by its button in the
    // bar; its lever goes over and stays, and what it switches follows (the lamps lit, out or coloured; the globe's mode)
    const switches = await page.evaluate(() =>
      window.sr.gallery.stage.cabin.switches.map((sw) => ({
        name: sw.title ?? sw.name,
        n: sw.says.length,
        sets: sw.sets ?? null,
        node: sw.node?.name ?? null,
      })),
    );
    const thrown = flight.cabin?.controls?.filter((c) => switches.some((sw) => sw.node === c.node)).length ?? 0;
    for (const [i, sw] of switches.entries()) {
      for (let k = 1; k <= sw.n; k++) {
        const by = sw.sets && k % 2 ? 'bar' : sw.node ? 'console' : 'bar';
        if (by === 'bar') await page.click(`#gallery > .lookouts [data-switch="${i}"]`);
        else
          await page.evaluate((name) => {
            const st = window.sr.gallery.stage;
            const node = st.staged[st.current].full.getObjectByName(name);
            st.onCabin(st.cabin.thingAt(node.getWorldPosition(node.position.clone())));
          }, sw.node);
        await page.waitForTimeout(250);
        const got = await page.evaluate((i) => {
          const st = window.sr.gallery.stage;
          const c = st.cabin;
          const x = c.switches[i];
          const lever = x.node ? 2 * Math.acos(Math.min(1, Math.abs(x.home.dot(x.node.quaternion)))) : null;
          return {
            at: x.at,
            lever,
            goal: x.node ? Math.abs(x.throws[x.at] ?? 0) : null,
            lights: c.lights.map((l) => ({ goal: l.goal, colour: l.light.color.getHex() })),
            globe: c.globeMode,
            bar: document.querySelector(`#gallery > .lookouts [data-switch="${i}"] span`)?.textContent ?? null,
            says: x.says[x.at],
          };
        }, i);
        const want = k % sw.n;
        const tag = `${flight.id}: ${sw.name} thrown ${k} time(s) by the ${by}`;
        if (got.at !== want) fail(`${tag}: it is at ${got.at}, not ${want}`);
        if (got.lever !== null && Math.abs(got.lever - got.goal) > 0.02)
          fail(`${tag}: its lever is over ${got.lever.toFixed(3)} rad, not ${got.goal.toFixed(3)}`);
        if (sw.sets && got.bar !== `${sw.name} · ${got.says}`) fail(`${tag}: the bar says "${got.bar}"`);
        if (sw.sets === 'lighting') {
          const way = flight.cabin.lighting.ways[want];
          const lamps = got.lights.map((l, li) => {
            const lamp = way.lit.map((x) => (typeof x === 'number' ? { light: x } : x)).find((x) => x.light === li);
            const level = lamp ? (lamp.level ?? 1) : 0;
            const colour = lamp?.colour ?? null;
            return Math.abs(l.goal - level) < 1e-9 && (colour === null || l.colour === colour);
          });
          if (!lamps.every(Boolean)) fail(`${tag}: at "${way.says}" the lamps are ${JSON.stringify(got.lights)}`);
          if (shots && (way.lit.length === 0 || way.lit.some((x) => typeof x !== 'number')))
            await picture(page, `${slug}-seat0-lights-${way.says.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
        }
        if (sw.sets === 'globe' && got.globe?.mode !== want) fail(`${tag}: the globe's mode is ${got.globe?.mode}`);
      }
    }
    console.log(
      `  ${switches.length} switch(es) thrown round (${thrown} of the controls listed; ${
        switches
          .filter((x) => x.sets)
          .map((x) => x.sets)
          .join(', ') || 'none'
      } switched)`,
    );
    // the cel look, from the seat
    if (shots) {
      await page.evaluate(() => window.sr.gallery.setCel(true));
      await page.waitForTimeout(600);
      await picture(page, `${slug}-seat0-cel`);
      await page.evaluate(() => window.sr.gallery.setCel(false));
      await page.waitForTimeout(300);
    }
    // C goes round the seats, then out to where the hands had the view
    for (let n = 1; n < flight.seats.length; n++) {
      await page.keyboard.press('c');
      await page.waitForTimeout(HANDOVER);
      s = await read(page);
      seated(s, flight, n, 'C');
      if (s.history !== was.history) fail(`${flight.id}: moving to seat ${n} added to the history`);
      await picture(page, `${slug}-seat${n}-real`);
      if (shots) {
        await page.evaluate(() => window.sr.gallery.setCel(true));
        await page.waitForTimeout(600);
        await picture(page, `${slug}-seat${n}-cel`);
        await page.evaluate(() => window.sr.gallery.setCel(false));
      }
    }
    await page.keyboard.press('c');
    await page.waitForTimeout(HANDOVER);
    s = await read(page);
    if (s.rig !== 'orbit') fail(`${flight.id}: C past the last seat left the camera ${s.rig}`);
    if (far(s.eye, was.eye) > 1e-3 || turned(s.q, was.q) > 1e-3)
      fail(
        `${flight.id}: up out of the seat, the camera is ${far(s.eye, was.eye).toFixed(3)} m and ${turned(s.q, was.q).toFixed(4)} rad from where it was`,
      );
    if (!s.hash.endsWith('/gallery') || s.sitPressed !== 'false' || s.bar)
      fail(`${flight.id}: up, the address is ${s.hash} and the switch ${s.sitPressed}`);
    for (const [i, x] of s.seats.entries())
      if (flight.seats[i].hide?.length && x.drawnOfHidden !== flight.seats[i].hide.length)
        fail(`${flight.id}: up, seat ${i}'s man is not all drawn`);
    // by C from the orbiting view, and out with Esc
    await page.keyboard.press('c');
    await page.waitForTimeout(HANDOVER);
    seated(await read(page), flight, 0, 'C from outside');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(HANDOVER);
    s = await read(page);
    if (s.rig !== 'orbit' || far(s.eye, was.eye) > 1e-3) fail(`${flight.id}: Esc did not get up to where the camera was`);
    if (s.history !== was.history) fail(`${flight.id}: sitting and getting up left ${s.history - was.history} more entries in the history`);
    // Back and Forward: an address typed that names the gallery gets up; Back sits again; Forward gets up again
    await page.click('#gallery [data-sit]');
    await page.waitForTimeout(HANDOVER);
    await page.evaluate((id) => (location.hash = `#${id}/gallery`), flight.id);
    await page.waitForTimeout(HANDOVER);
    s = await read(page);
    if (s.rig !== 'orbit') fail(`${flight.id}: an address that names no seat left him in it`);
    await page.goBack();
    await page.waitForTimeout(HANDOVER);
    seated(await read(page), flight, 0, 'Back');
    await page.goForward();
    await page.waitForTimeout(HANDOVER);
    s = await read(page);
    if (s.rig !== 'orbit' || !s.hash.endsWith('/gallery')) fail(`${flight.id}: Forward did not get up (${s.rig}, ${s.hash})`);
    // a link straight into the last seat
    await page.evaluate(([id, node]) => (location.hash = `#${id}/gallery/${node}`), [flight.id, flight.seats.at(-1).node]);
    await page.waitForTimeout(HANDOVER);
    seated(await read(page), flight, flight.seats.length - 1, 'a link');
    if (errors.length) fail(`${flight.id}: console errors: ${errors.slice(0, 3).join(' | ')}`);
    await close();
  }
  // --- 390 wide, a phone held upright: the control is in the sheet, and nothing in the control block is hidden ---
  {
    const { page, errors, close } = await open(`${flight.id}/gallery`, 390, 844);
    await page.click('#gallery .handle-open');
    await page.waitForTimeout(500);
    // (the View tab, which on a phone is the control block; pressed again while open it would put the sheet away)
    if ((await page.getAttribute('#gallery [data-tab=View]', 'aria-selected')) !== 'true') await page.click('#gallery [data-tab=View]');
    await page.waitForTimeout(600);
    const hidden = await page.evaluate(() =>
      // (the button that opens every view is not needed in the sheet, where the views scroll sideways: gallery.css)
      [...document.querySelectorAll('#gallery :is(.shows, .views, .models) button:not([data-views])')]
        .filter((b) => !b.closest('[hidden]') && (b.offsetParent === null || b.offsetWidth === 0))
        .map((b) => b.textContent.trim()),
    );
    if (hidden.length) fail(`${flight.id} at 390: hidden in the control block: ${hidden.join(', ')}`);
    await page.evaluate(() => document.querySelector('#gallery [data-sit]').scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    // (where the camera is with the sheet open: opening it frames again a view nobody has taken, as it should)
    await page.waitForTimeout(1200);
    const was = await read(page);
    await page.click('#gallery [data-sit]');
    await page.waitForTimeout(HANDOVER);
    seated(await read(page), flight, 0, 'the control at 390');
    if (shots) await page.screenshot({ path: join(shots, `${slug}-seat0-390-ui.jpg`), type: 'jpeg', quality: 85 });
    const box = await page.evaluate(() => {
      const r = document.querySelector('#gallery > .lookouts').getBoundingClientRect();
      return [r.left, r.top, r.right, r.bottom];
    });
    if (box[0] < 0 || box[2] > 390 || box[1] < 0 || box[3] > 844)
      fail(`${flight.id} at 390: the seat's bar is off the page (${box.map(Math.round)})`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(HANDOVER);
    const s = await read(page);
    if (s.rig !== 'orbit' || far(s.eye, was.eye) > 1e-3) fail(`${flight.id} at 390: Esc did not get up to where the camera was`);
    if (errors.length) fail(`${flight.id} at 390: console errors: ${errors.slice(0, 3).join(' | ')}`);
    await close();
  }
}
await browser.close();
console.log(
  fails.length ? `\n${fails.length} failed` : `\nall seats sat in: ${flights.map((f) => `${f.id} (${f.seats.length})`).join(', ')}`,
);
process.exit(fails.length ? 1 : 0);
