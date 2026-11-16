import * as THREE from 'three';
import type { Dated, SiteDef } from '../../types.ts';
import { type Air, driftClouds, installAir } from '../air.ts';
import type { Day } from '../day.ts';
import { Flora, type FloraSpec } from '../flora.ts';
import { Land, type LandSpec } from '../land.ts';
import type { Levelled } from '../lod.ts';
import { type Compass, compassAt } from './compass.ts';

/**
 * A place's ground as data, laid out by `groundPlace` round whichever of its pads a flight left from: the land and what
 * grows on it (land.ts, flora.ts), what stands on it beyond the pad's own model, and how far it all reaches. Each place
 * has one, in its own folder (missions/<nation>/places/<place>/ground.ts), and `GROUNDS` (places.ts) names them.
 */
export interface GroundSpec {
  /** The land on a day (its season), laid out on the compass round the pad (compass.ts). */
  land(day: Day, compass: Compass): LandSpec;
  /** What grows on it on a day (its wind). */
  flora(day: Day): FloraSpec;
  /** How far from the pad there is something to walk to, and how far away the furthest thing placed is, metres (backdrops.ts `Setting`). */
  reach: number;
  horizon: number;
  /**
   * What stands on the land that day beyond the pad's own model (the neighbouring complexes, a far building), in the
   * compass frame: `groundAt` is the land's height at a point of it. `arrived()` is true once when something of it that
   * casts a shadow has come since it was last asked.
   */
  scenery?(at: Placing): { objects: THREE.Object3D[]; levels: Levelled[]; arrived: () => boolean };
  /** Where the ground walked on is not the land's (a pit the pad's own model is the ground of): its height there, or null. Compass frame. */
  under?(x: number, z: number): number | null;
  /** The tone of its ground seen whole, which the globe keeps round the site until the eye is well up (globe.ts); and in the cel look. */
  tone?(day: Day): THREE.Color;
  drawn?(day: Day): THREE.Color;
}

/** What a place's scenery is laid out with. */
export interface Placing {
  compass: Compass;
  day: Day;
  land: Land;
  /** The land's height at (x, z) on the compass, metres in the world (the grade included). */
  groundAt: (x: number, z: number) => number;
}

/** Whether something dated stood on a day (ISO dates compared as text: a year or a month stands for its first day). */
export const stood = (thing: Dated, date: string): boolean => (!thing.from || thing.from <= date) && (!thing.until || date < thing.until);

/**
 * The ground of a place on the Earth, built round one of its pads for one day: its land and what stands and grows on
 * it, which a ground setting puts under its sky (backdrops.ts). The same at any hour of that day.
 */
export interface Place {
  floor: THREE.Mesh;
  scenery: THREE.Object3D[];
  levels: Levelled[];
  tick: (dt: number) => void;
  /** Draw the land and its plants in full, or simplified for the cel look. */
  simplify: (on: boolean) => void;
  /** Where the eye is (world): what is near it is drawn in full. True if that changed what is drawn. */
  attend: (eye: THREE.Vector3) => boolean;
  /** Something that stands there and casts a shadow has arrived since this was last asked: true once. */
  arrived: () => boolean;
  /** The camera as it is about to draw: the ground out of its sight is not drawn. */
  view: (camera: THREE.Camera) => void;
  /** The ground's height at a point in the world (the pad's frame): flat at the grade wherever anything is built. */
  groundAt: (x: number, z: number) => number;
  plantsClear: (at: THREE.Vector3, within: number) => number;
  plantsOut: (at: THREE.Vector3, margin: number) => number;
  /** How far from the pad there is something to walk to, and how far away the furthest thing placed is, metres (Setting). */
  reach: number;
  horizon: number;
  /** The land's height under the model's zero: the origin pad's (SiteDef.grade). */
  grade: number;
  /** The tone of its ground seen whole, which the globe keeps round the site until the eye is well up (globe.ts). */
  tone?: THREE.Color;
  /** And its tone in the cel look, which the globe draws the country round it in from height (globe.ts: `colourGlsl`). */
  drawn?: THREE.Color;
}

/**
 * Lay a place's ground out round `origin`, one of its pads, under `day`'s sky: the haze installed for the day (air.ts),
 * the land and its plants on the compass round the pad, what stands on it, and the whole turned to lie round the pad
 * model, whose frame is at an angle to the compass (its +X on the site's bearing), and set at the pad's grade under it.
 */
export function groundPlace(renderer: THREE.WebGLRenderer, spec: GroundSpec, origin: SiteDef, day: Day): Place {
  const compass = compassAt(origin);
  // (the pad's own: where its model's zero stands over the land, a hand's breadth at a pad laid at grade, a deck's height on a stand)
  const groundY = origin.grade.value;
  const landSpec = spec.land(day, compass);
  // the haze lies in the lowest air, from the sea where there is one, under the cumulus, and thins upward (air.ts)
  const air: Air = { scale: day.haze, base: groundY + (landSpec.sea ?? 0), ...(day.cumulus ? { clouds: day.cumulus } : {}), day };
  installAir(air); // (the cumulus are drawn by the stage's cloud pass: clouds.ts)
  const land = new Land(renderer, landSpec, groundY, compass.turn);
  const flora = new Flora(spec.flora(day), land);
  flora.group.position.y = groundY;
  const built = spec.scenery?.({ compass, day, land, groundAt: (x, z) => groundY + land.heightAt(x, z) }) ?? null;
  // laid out on the compass, then turned as one to lie round the pad model
  const place = new THREE.Group();
  place.add(flora.group, ...(built?.objects ?? []));
  place.rotation.y = compass.turn;
  place.updateMatrixWorld(true);
  const COS = Math.cos(compass.turn);
  const SIN = Math.sin(compass.turn);
  const eye = new THREE.Vector3();
  const local = (at: THREE.Vector3) => {
    place.worldToLocal(eye.copy(at));
    eye.y -= groundY;
    return eye;
  };
  return {
    floor: land.mesh,
    scenery: [place],
    // (what stands there at its levels of detail, each chosen by its size on screen: around.ts)
    levels: built?.levels ?? [],
    reach: spec.reach,
    horizon: spec.horizon,
    grade: groundY,
    ...(spec.tone ? { tone: spec.tone(day) } : {}),
    ...(spec.drawn ? { drawn: spec.drawn(day) } : {}),
    tick: (dt) => {
      driftClouds(dt);
      land.tick(dt);
      flora.tick(dt);
    },
    simplify: (on) => {
      land.simplify(on);
      flora.simplify(on);
    },
    attend: (at) => {
      local(at);
      land.attend(eye);
      return flora.attend(eye);
    },
    // (buildings where there was nothing: the shadows are owed too)
    arrived: () => built?.arrived() ?? false,
    view: (camera) => land.view(camera),
    plantsClear: (at, within) => flora.clear(local(at), within),
    plantsOut: (at, margin) => {
      const still = flora.out(local(at), margin);
      eye.y += groundY;
      place.localToWorld(eye);
      at.x = eye.x;
      at.z = eye.z;
      return still;
    },
    groundAt: (x, z) => {
      // the world point on the compass: the inverse of the place's turn
      const cx = x * COS - z * SIN,
        cz = x * SIN + z * COS;
      return spec.under?.(cx, cz) ?? groundY + land.heightAt(cx, cz);
    },
  };
}
