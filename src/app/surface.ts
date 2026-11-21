import { LUNAR_SITES as LUNAR_SITE_DEFS } from '../../missions/usa/places/moon/sites.ts';
import type { ModelDef, SitedFlight } from '../types.ts';
import { landerAt, landerPose, lunarGround } from '../viewer/lunar/ground.ts';
import type { LunarSite } from '../world/lunar-terrain.ts';

/** How far in front of the forward pad the crew stand to start, metres, and how far apart: clear of the pad and the ladder's foot, estimated. */
const BEFORE_PAD = 2.2;
const APART = 2;
/** A crewman's half-width in the suit and its pack, metres (walker.radius): estimated from the pack's 20.5 in. */
const SUITED = 0.3;

/**
 * A flight on the Moon's surface, as the stage is to show it (Architecture 9: the surface is a phase of Fly, not a fourth
 * place): the flight itself, standing at a landing site (missions/usa/places/moon/: its `SiteDef`, `body: 'moon'`) in the
 * lunar setting (viewer/lunar/setting.ts), with what stands there: its LM (the model with `lander`), stood as its site
 * says it came to rest (`LunarSiteDef.rest`: its heading, pitch and roll; `landerPose`), its pads on the ground; and the
 * crew who went out (each model with a `walker` and `surface`), in what they wore out there, standing before its ladder.
 * Its clock is the flight's (`launch` is the flight's own), so the Sun is where the mission's clock has it. Nothing of the
 * flight's pad, its plan or its recovery is there: the stage loads it as it loads another flight (Stage.load), and loads the
 * flight again at lift-off. Until a run's landing (the descent) gives where and how the LM came down, it stands as the site
 * has it.
 *
 * What is simplified: the LM's pads are set on the ground as a whole (its height is the mean of what each pad would need, on
 * the grids' heights under them), not each on its own; the crew stand where they are put to start, and go out by the deck's
 * Go out (deck/phases/surface.ts), which puts the commander on the porch.
 */
export async function lunarStay(flight: SitedFlight, id: LunarSite): Promise<SitedFlight> {
  const def = LUNAR_SITE_DEFS.find((s) => s.id === id);
  if (!def) throw new Error(`no landing site ${id}`);
  const ground = (await lunarGround(id)).ground;
  const at = (x: number, z: number) => ground.at(x, z) ?? 0;
  const models: ModelDef[] = [];
  const lm = flight.models.find((m) => m.lander);
  const rest = { heading: def.rest.heading.value, pitch: def.rest.pitch.value, roll: def.rest.roll.value };
  const pose = landerPose(rest, lm?.lander?.pads ?? [], at);
  if (lm)
    models.push({
      ...lm,
      backdrop: 'moon',
      position: [0, pose.y, 0],
      rotationY: pose.rotationY,
      attitude: pose.attitude,
      // (what the rover's sites' gallery shows as taken off it: lunar-rover-sites.json)
      absent: [...(lm.absent ?? []), ...(landerAt(id)?.unloaded ?? [])],
      sequence: undefined,
      with: undefined,
    });
  // the crew who went out, a step apart on the ground before the forward pad, facing the LM
  const out = flight.models.filter((m) => m.walker && m.surface);
  const ahead = { x: Math.cos(pose.rotationY), z: -Math.sin(pose.rotationY) };
  const reach = Math.max(0, ...(lm?.lander?.pads ?? []).map(([x, z]) => Math.hypot(x, z))) + BEFORE_PAD;
  out.forEach((m, i) => {
    const across = (i - (out.length - 1) / 2) * APART;
    const x = ahead.x * reach + ahead.z * across;
    const z = ahead.z * reach - ahead.x * across;
    models.push({
      ...m,
      url: m.surface!.url,
      scale: m.surface!.scale,
      backdrop: 'moon',
      position: [x, at(x, z), z],
      rotationY: pose.rotationY - Math.PI / 2,
      walker: { ...m.walker!, radius: SUITED },
      sequence: undefined,
    });
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
