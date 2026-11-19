// Follow shared and replaced suit models through gallery/site navigation, including a load that finishes after eviction.
import assert from 'node:assert/strict';
import { launch, open, url as urlOf } from './browser.mjs';

const browser = await launch();
try {
  const { page, errors } = await open(browser, urlOf(process.argv.slice(2)) + '#usa/apollo/apollo-8/site/pad', {
    wait: 'ready',
    timeout: 180000,
  });
  await page.evaluate(async () => {
    const stage = window.sr.stage;
    await Promise.all(stage.arriving);
    const crew = stage.staged.find((_, i) => stage.defs[i].id === 'crew');
    const pilot = stage.staged.find((_, i) => stage.defs[i].id === 'pilot');
    window.departure = { stage, commander: crew.group.children.slice(), pilot: pilot.group.children.slice() };
  });
  let arrived;
  const loading = new Promise((resolve) => {
    arrived = resolve;
  });
  let finish;
  const gate = new Promise((resolve) => {
    finish = resolve;
  });
  await page.route('**/a7l-iv.glb?late-scale-model', async (route) => {
    arrived();
    await gate;
    await route.continue();
  });
  await page.evaluate(() => {
    const stage = window.sr.stage;
    const suit = stage.defs.find((m) => m.id === 'crew').url;
    window.departure.late = stage.model(suit + '?late-scale-model');
  });
  await loading;
  await page.evaluate(() => {
    location.hash = '#usa/apollo/apollo-9/site/pad';
  });
  await page.waitForFunction(
    () =>
      window.sr.flight.id.endsWith('/apollo-9') &&
      window.sr.stage.defs.some((d) => d.url.includes('a7l-ev.glb')) &&
      document.body.classList.contains('scene-ready'),
    null,
    { timeout: 180000 },
  );
  finish();
  const result = await page.evaluate(async () => {
    const { stage, commander, pilot, late } = window.departure;
    const orphan = await late;
    await Promise.all(stage.arriving);
    const registered = stage.looks.roots;
    const oldPanes = [];
    for (const object of commander)
      object.traverse((node) => {
        if (stage.glazing.split.has(node)) oldPanes.push(node.name);
      });
    const live = stage.staged[stage.defs.findIndex((m) => m.id === 'pilot')];
    return {
      reusedStage: stage === window.sr.stage,
      oldLevels: commander.length,
      keptLevels: pilot.length,
      retained: commander.filter((root) => registered.has(root)).length,
      oldPanes,
      reused: pilot.every((root) => registered.has(root) && root.parent === live.group),
      lateRegistered: registered.has(orphan),
      lateShells: [...stage.shellMaterials.keys()].some((key) => key.includes('late-scale-model')),
    };
  });
  assert.deepEqual(result, {
    reusedStage: true,
    oldLevels: 3,
    keptLevels: 3,
    retained: 0,
    oldPanes: [],
    reused: true,
    lateRegistered: false,
    lateShells: false,
  });
  assert.deepEqual(errors, []);
  console.log('All three departed suit levels and the late model were released. All three shared pilot levels remained live.');
} finally {
  await browser.close();
}
