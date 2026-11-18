// The walker's real starting position, footing, arm's reach and first steps in the model of each flight.
import { flights } from '../missions/index.ts';
import { lacks } from '../src/app/address.ts';
import { launch, open, opt, url } from './browser.mjs';

const args = process.argv.slice(2);
const flightFilter = opt(args, '--flight', '');
const siteUrl = url(args);
// Ends are the paved approaches to the vehicle or to its boarding structure. The ramp and lift continue in walk-test.mjs.
const routes = {
  'Cape Kennedy, Launch Complex 19': [
    [13, -6.55],
    [6, -6.55],
    [1.2, -6.7],
  ],
  'Cape Canaveral, Launch Complex 14': [[37.55 * 0.3048, -7.5 * 0.3048]],
  'Cape Canaveral, Launch Complex 5': [[0, 3.5]],
  'Tyuratam (Baikonur), Site 1': [
    [-19, 5.6],
    [-16.6, 3.3],
  ],
};
const browser = await launch();
let failures = 0;
try {
  for (const flight of flights.filter((f) => !lacks(f, 'site') && f.id.includes(flightFilter))) {
    if (!flight.models.some((m) => m.walker)) throw Error(`No crew to walk as on ${flight.id}`);
    const { page, context, errors } = await open(browser, `${siteUrl}#${flight.id}/site/pad`, { timeout: 120000 });
    try {
      await page.evaluate(() => Promise.allSettled(window.sr.stage.arriving ?? []));
      for (const figure of flight.models.filter((m) => m.walker)) {
        const result = await page.evaluate(
          ({ id, route }) => {
            const { clock, stage } = window.sr;
            clock.pause();
            if (!stage.enterWalk(id)) throw Error(`Cannot walk as ${id}`);
            const { body, solids, yaw } = stage.walk;
            const start = body.position.clone();
            const chest = start.clone();
            chest.y += 1.15;
            solids.gather(chest, 1.5, 2, 1);
            const clearance = solids.clear(chest, 1);
            const grounded = body.grounded;
            const craft = stage.staged[window.sr.flight.models.findIndex((m) => m.id === 'vehicle')];
            const target = craft.box;

            const middle = target.getCenter(start.clone());
            const heading = start.clone().set(-Math.sin(yaw), 0, -Math.cos(yaw));
            const towards = middle.sub(start);
            const facing = heading.x * towards.x + heading.z * towards.z > 0;
            for (let i = 0; i < 100; i++) body.move(-Math.sin(yaw) * 0.03, -Math.cos(yaw) * 0.03, 1 / 50);
            const advanced = Math.hypot(body.position.x - start.x, body.position.z - start.z);
            body.place(start.x, start.y, start.z);
            const eye = start.clone();
            eye.y += stage.walk.eye;
            const middleOfCraft = target.getCenter(start.clone());
            const size = target.getSize(start.clone());
            solids.gather(eye, Math.hypot(eye.x - middleOfCraft.x, eye.z - middleOfCraft.z) + size.length(), 1, size.y + 10);
            const tanY = Math.tan((stage.camera.fov * Math.PI) / 360);
            let inSight = false;
            for (let i = 1; i < 16 && !inSight; i++) {
              const ray = middleOfCraft.clone();
              ray.y = target.min.y + (size.y * i) / 16;
              ray.sub(eye);
              const forward = ray.dot(heading);
              if (
                forward <= 0 ||
                Math.abs(ray.y) > forward * tanY ||
                Math.abs(ray.x * heading.z - ray.z * heading.x) > forward * tanY * stage.camera.aspect
              )
                continue;
              const hit = solids.cast(eye, ray.normalize(), eye.distanceTo(middleOfCraft) + size.length());
              for (let node = hit?.mesh; node; node = node.parent) if (node === craft.group) inSight = true;
            }
            let blocked = null;
            for (const [x, z] of route) {
              let distance = Math.hypot(x - body.position.x, z - body.position.z);
              while (distance > 0.25) {
                body.move(((x - body.position.x) / distance) * 0.12, ((z - body.position.z) / distance) * 0.12, 0.08);
                const next = Math.hypot(x - body.position.x, z - body.position.z);
                if (next >= distance - 0.005 || body.position.y < start.y - 0.5 || body.on) {
                  blocked = [body.position.x, body.position.z];
                  break;
                }
                distance = next;
              }
              if (blocked) break;
            }
            body.place(start.x, start.y, start.z);
            stage.onFoot.exitWalk();
            return { grounded, clearance, facing, advanced, inSight, blocked };
          },
          { id: figure.id, route: flight.id.includes('mr-4-') ? [[4, 2]] : routes[flight.launchSite] },
        );
        const ok =
          result.grounded && result.clearance >= 0.75 && result.facing && result.advanced > 2.8 && result.inSight && !result.blocked;
        if (!ok) failures++;
        console.log(`${ok ? 'ok' : 'FAIL'} ${flight.id} ${figure.id}`, result);
      }
      if (errors.length) throw Error(errors.join('\n'));
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
process.exitCode = failures ? 1 : 0;
