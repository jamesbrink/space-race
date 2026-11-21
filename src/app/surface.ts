import { LUNAR_SITES as LUNAR_SITE_DEFS } from '../../missions/usa/places/moon/sites.ts';
import * as THREE from 'three';
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
 * has it. `whole` is the flight with its gallery's exhibits, the LM among them (address.ts `atSite` leaves them out of the pad).
 *
 * What is simplified: the LM's pads are set on the ground as a whole (its height is the mean of what each pad would need, on
 * the grids' heights under them), not each on its own; the crew stand where they are put to start, and go out by the deck's
 * Go out (deck/phases/surface.ts), which puts the commander on the porch.
 */
export async function lunarStay(flight: SitedFlight, id: LunarSite, whole: SitedFlight = flight): Promise<SitedFlight> {
  const def = LUNAR_SITE_DEFS.find((s) => s.id === id);
  if (!def) throw new Error(`no landing site ${id}`);
  const ground = (await lunarGround(id)).ground;
  const at = (x: number, z: number) => ground.at(x, z) ?? 0;
  const models: ModelDef[] = [];
  // (the LM is an exhibit of its own in the gallery, not at the pad: it is found in the whole flight, and stands here as itself)
  const found = whole.models.find((m) => m.lander);
  const lm = found && (({ galleryCraft: _craft, galleryAlias: _alias, galleryFrom: _from, ...rest }) => rest)(found);
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
  // its rover, where it flew one: stowed in its quadrant of the LM, to be taken out by hand (ModelDef.lunarRover.deploy)
  const rover = whole.models.find((m) => m.lunarRover?.deploy && m.lunarRover.site === id);
  if (rover && lm) models.push(stowedRover(rover, pose));
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

/**
 * The rover as it stood at its site on the day: stowed in quadrant I of its LM, the model's vehicle node where it will
 * stand once deployed (`deploy.from`, in the LM's frame), the LM's pose carried over to it, so that stowed it is in the
 * LM's bay however the LM came to rest; its slider is its deployment, worked by hand (its parts' `functions`), and
 * once it is off its saddle it is driven (`drives`) and stands on the ground on its own suspension.
 */
function stowedRover(rover: ModelDef, lm: ReturnType<typeof landerPose>): ModelDef {
  const deploy = rover.lunarRover!.deploy!;
  const [x, y, z, yaw] = deploy.from;
  const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(lm.attitude.roll, lm.rotationY, lm.attitude.pitch, 'YZX'));
  const at = new THREE.Vector3(x, y, z).applyQuaternion(turn);
  const own = new THREE.Euler().setFromQuaternion(turn.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)), 'YZX');
  return {
    id: rover.id,
    name: rover.name,
    url: rover.url,
    scale: rover.scale,
    backdrop: 'moon',
    slider: deploy.slider,
    parts: deploy.parts,
    views: [],
    position: [at.x, lm.y + at.y, at.z],
    rotationY: own.y,
    attitude: { pitch: own.z, roll: own.x },
    absent: deploy.absent,
  };
}
