import { LUNAR_SITES as LUNAR_SITE_DEFS } from '../../missions/usa/places/moon/sites.ts';
import type { ModelDef, SitedFlight } from '../types.ts';
import type { LunarSite } from '../world/lunar-terrain.ts';
import { landerAt, lunarGround } from '../viewer/lunar/ground.ts';

/**
 * A flight on the Moon's surface, as the stage is to show it (Architecture 9: the surface is a phase of Fly, not a fourth
 * place): the flight itself, standing at a landing site (missions/usa/places/moon/: its `SiteDef`, `body: 'moon'`) in the
 * lunar setting (viewer/lunar/setting.ts), with what stands there: the LM where a model of it landed has been built
 * (viewer/lunar/ground.ts `landerAt`), and the crew who went out (each model with a `walker` and `surface`), standing on
 * the ground beside it. Its clock is the flight's (`launch` is the flight's own), so the Sun is where the mission's clock
 * has it. Nothing of the flight's pad, its plan or its recovery is there: the stage loads it as it loads another flight
 * (Stage.load), and loads the flight again at lift-off.
 *
 * What is simplified: the LM stands on the plane its pads were measured on (the frame's own origin: SiteDef), not on the
 * grids' heights under each pad; at a site with no model of its LM built (11, 12 and 14 so far) there is none; the crew
 * stand where they are put to start, not where the record has them come down the ladder (C3).
 */
export async function lunarStay(flight: SitedFlight, id: LunarSite): Promise<SitedFlight> {
  const def = LUNAR_SITE_DEFS.find((s) => s.id === id);
  if (!def) throw new Error(`no landing site ${id}`);
  const ground = (await lunarGround(id)).ground;
  const lander = landerAt(id);
  const models: ModelDef[] = [];
  if (lander)
    models.push({
      id: 'lm',
      name: 'Lunar module',
      url: lander.url,
      backdrop: 'moon',
      scale: 'The LM as it stood on its pads',
      parts: [],
      views: [],
      absent: lander.unloaded,
      rotationY: ((90 - lander.bearing) * Math.PI) / 180,
      position: [0, 0, 0],
    });
  // the crew who went out, a step apart on the ground east of the LM (clear of its pads: 4.7 m from its middle)
  const out = flight.models.filter((m) => m.walker && m.surface);
  out.forEach((m, i) => {
    const x = lander ? 7 : 2;
    const z = (i - (out.length - 1) / 2) * 2;
    models.push({ ...m, backdrop: 'moon', position: [x, ground.at(x, z) ?? 0, z], rotationY: Math.PI / 2, sequence: undefined });
  });
  if (!models.length) throw new Error(`nothing of ${flight.callsign} stands on the Moon`);
  return {
    ...flight,
    site: def.site,
    models,
    weather: undefined,
    surroundings: undefined,
    recovery: undefined,
    plan: undefined,
    flies: undefined,
    opens: undefined,
  } as SitedFlight;
}
