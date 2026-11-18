// The gallery's views of a cabin's inside, in a real browser, at 1280, 820 and 390 wide.
//   node tools/studio-test.mjs [url] [--flight <id>]     (default: http://localhost:5180/, every flight that has such a view)
// A view of a cabin's inside is one whose parts are all held in the cabin (`cabin.within`): Apollo 7's main console,
// its DSKY and its couches, Voskhod's couches. Read from each flight's own data, so a view renamed or added is followed.
// For each flight: going to such a view opens the cutaway by itself, going back to the whole closes that opening again,
// an opening made by hand is kept, and choosing one of those parts opens it too. Then, for each such view, in both
// looks: what the view is of is on the screen and lit. Its meshes are drawn once as they are and once in flat red,
// and the red pixels are where it shows: an outline, or a shader that compiled, cannot say whether a surface can be
// read. (The Apollo DSKY faces down into the cabin: the closed exhibit's limit on how far the eye goes below the level,
// and a lamp aimed at the middle of the whole rocket, each hid it.)
import { flights } from '../missions/index.ts';
import { exhibit, galleryFlight, WHOLE_VIEW } from '../src/app/address.ts';
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const only = opt(args, '--flight', null);
const base = urlOf(args).split('#')[0];

/** Each flight's gallery views of its cabin's inside, as its gallery has them. */
const subjects = flights.flatMap((f) => {
  if (only && f.id !== only) return [];
  return [exhibit(f), ...f.models.filter((m) => m.galleryCraft)].filter(Boolean).flatMap((vehicle) => {
    const model = galleryFlight(f, vehicle).models[0];
    const held = new Set(model.cabin?.within ?? []);
    const views = model.views.filter((v) => v.nodes?.length && v.nodes.every((n) => held.has(n)));
    const route = f.id + '/gallery' + (vehicle.galleryCraft ? '/' + vehicle.id : '');
    return views.length ? [{ id: route, views, part: views[0].nodes[0] }] : [];
  });
});
if (!subjects.length)
  throw new Error(only ? `${only} has no gallery view of its cabin's inside` : 'no flight has a gallery view of its cabin');

const { check, failures } = checks();
const browser = await launch();
try {
  for (const { id, views, part } of subjects)
    for (const width of [1280, 820, 390]) {
      console.log(`${id} at ${width}: ${views.map((v) => v.label).join(', ')}`);
      const { page, errors, close } = await open(browser, `${base}#${id}`, {
        viewport: [width, 900],
        console: ['error', 'warning'],
        wait: 'gallery',
      });
      const narrow = width < 960;
      if (narrow) await page.locator('#gallery .handle-open').click();
      const cut = page.locator('#gallery [data-cut]');
      const cutOpen = async () => (await cut.getAttribute('aria-pressed')) === 'true';
      const view = async (v) => {
        const button = page.locator(`#gallery [data-view="${v}"]`);
        if (!(await button.isVisible())) await page.locator('#gallery [data-views]').click();
        await button.click();
      };
      for (const isolated of views.filter((v) => v.isolate)) {
        const visible = () =>
          page.evaluate(() => {
            const stage = window.sr.gallery.stage;
            return stage.defs[stage.current].parts
              .filter((p) => stage.staged[stage.current].full.getObjectByName(p.node)?.visible)
              .map((p) => p.node)
              .sort();
          });
        const assembled = await visible();
        await view(isolated.id);
        check(
          JSON.stringify(await visible()) === JSON.stringify([...isolated.nodes].sort()),
          `${isolated.label}: its instruments stand exposed`,
        );
        await view(WHOLE_VIEW);
        check(JSON.stringify(await visible()) === JSON.stringify(assembled), 'Whole: the surrounding assembly returns');
      }
      const first = views[0].id;
      await view(first);
      check(await cutOpen(), `${views[0].label}: going to it opens the cutaway, with nothing chosen`);
      await view(WHOLE_VIEW);
      check(!(await cutOpen()), 'Whole: that opening closes again');
      await cut.click();
      const intact = await page.evaluate(() => {
        const stage = window.sr.gallery.stage;
        const opaque = [];
        stage.staged[stage.current].full.traverse((part) => {
          if (!part.userData.shell || part.isMesh) return;
          for (const primitive of part.children) {
            if (primitive.isMesh && !primitive.material.clippingPlanes?.length) opaque.push(primitive.name);
          }
        });
        return opaque;
      });
      check(!intact.length, 'the section passes through every material of each compound shell: ' + intact.join(', '));
      const fits = await page.locator('#gallery .explode').evaluate((slider) => {
        const box = slider.getBoundingClientRect();
        return [...slider.querySelectorAll('span')].every((end) => {
          const text = document.createRange();
          text.selectNodeContents(end);
          return [...text.getClientRects()].every((r) => r.left >= box.left - 1 && r.right <= box.right + 1);
        });
      });
      check(fits, 'both staging captions fit within the control');
      await view(first);
      await view(WHOLE_VIEW);
      check(await cutOpen(), 'an opening made by hand is kept');
      await cut.click();
      if (narrow) await page.locator('#gallery [data-tab="Parts"]').click();
      await page.locator(`#gallery [data-node="${part}"]`).first().click();
      check(await cutOpen(), `choosing ${part} opens it too`);
      if (narrow) await page.locator('#gallery [data-tab="View"]').click();
      for (const v of views) {
        await view(v.id);
        await page.waitForFunction(() => !window.sr.gallery.stage.cam.travelling);
        await page.evaluate(() => {
          window.sr.gallery.stage.setAutoRotate(false);
          window.sr.gallery.stage.highlight(null, null);
        });
        // (the panels are not drawn while the canvas is read, and nothing about the view changes for it)
        const bare = await page.addStyleTag({ content: '#gallery > :not(.loading), #title { visibility: hidden !important }' });
        for (const look of ['real', 'cel']) {
          const seen = await shown(page, look, v.nodes);
          check(
            seen.visible > 100 && seen.brightness > 40,
            `${v.label}, ${look}: ${seen.visible} pixels of it on the screen, mean brightness ${seen.brightness.toFixed(1)}`,
          );
        }
        await page.evaluate(() => window.sr.gallery.stage.setLook('real'));
        await bare.evaluate((el) => el.remove());
      }
      // (not the machine's own: three warns that ANGLE on Linux offers no KHR_parallel_shader_compile, and compiles anyway)
      const own = errors.filter((e) => !e.includes('KHR_parallel_shader_compile'));
      check(own.length === 0, `no errors or warnings${own.length ? `: ${own[0]}` : ''}`);
      await close();
    }
} finally {
  await browser.close();
}
if (failures.length) {
  console.log(`${failures.length} failed`);
  process.exit(1);
}

/** How many pixels of the meshes under `nodes` are on the screen in `look`, and how bright they are there (0 to 255). */
async function shown(page, look, nodes) {
  await page.evaluate((look) => window.sr.gallery.stage.setLook(look), look);
  await page.waitForTimeout(300);
  const canvas = page.locator('#gallery-stage');
  const drawn = await canvas.screenshot();
  await page.evaluate((nodes) => {
    const stage = window.sr.gallery.stage;
    window.studioMasked = [];
    for (const node of nodes)
      stage.scene.traverse((o) => {
        if (o.name !== node) return;
        o.traverse((mesh) => {
          if (!mesh.isMesh || !mesh.userData.real?.color) return;
          const real = mesh.userData.real;
          const mask = real.clone();
          mask.color.set(0);
          mask.map = null;
          mask.emissive?.set(0xff0000);
          mask.emissiveMap = null;
          mask.emissiveIntensity = 1;
          mask.toneMapped = false;
          stage.looks.give(mesh, mask);
          window.studioMasked.push([mesh, real, mask]);
        });
      });
    stage.dirty = true;
  }, nodes);
  await page.waitForTimeout(150);
  const masked = await canvas.screenshot();
  await page.evaluate(() => {
    const stage = window.sr.gallery.stage;
    for (const [mesh, real, mask] of window.studioMasked) {
      stage.looks.give(mesh, real);
      mask.dispose();
    }
    stage.dirty = true;
  });
  return page.evaluate(
    async ([drawnPng, maskedPng]) => {
      const pixels = async (png) => {
        const image = new Image();
        image.src = `data:image/png;base64,${png}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const normal = await pixels(drawnPng);
      const mask = await pixels(maskedPng);
      let visible = 0;
      let sum = 0;
      for (let i = 0; i < mask.length; i += 4) {
        if (!(mask[i] > 150 && mask[i + 1] < 80 && mask[i + 2] < 80)) continue;
        visible++;
        sum += (normal[i] + normal[i + 1] + normal[i + 2]) / 3;
      }
      return { visible, brightness: visible ? sum / visible : 0 };
    },
    [drawn.toString('base64'), masked.toString('base64')],
  );
}
