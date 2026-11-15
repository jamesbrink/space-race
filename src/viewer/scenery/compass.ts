import * as THREE from 'three';
import type { SiteDef } from '../../types.ts';
import { ecefToEnu, geodeticToEcef } from '../../world/frames.ts';

/**
 * The frame a place's ground is laid out in round the pad a flight left from (its origin): x east, z south, metres from
 * the pad, on the plane that touches the ellipsoid there (world/frames.ts: east, north, up). A place's scenery is given in
 * latitude and longitude, or in the frame of the pad it was drawn round, and is put here for whichever of its pads is the
 * origin; the whole of it is then turned by `turn` to lie round the pad model, whose own frame lies at an angle to the
 * compass (its +X on the site's `bearingX`).
 */
export interface Compass {
  /** The pad the ground is laid round. */
  origin: SiteDef;
  /** Radians about the vertical that turn the compass frame into the pad model's: the site's bearing less a quarter turn. */
  turn: number;
  /** A latitude and longitude (degrees, WGS 84) as [x, z]: metres east and south of the origin. */
  at(latitude: number, longitude: number): [number, number];
  /**
   * Where another pad's own frame lies in this one: its origin, and the turn from the compass frame to its frame (as
   * `turn` is the origin's). Its frame is taken square to its own bearing here: the meridians' convergence between two
   * pads of a place (0.014 degrees over the 6 km from Complex 5 to Complex 14) is left out.
   */
  frame(site: SiteDef): { x: number; z: number; turn: number };
}

const compasses = new Map<SiteDef, Compass>();

/** The compass round a pad (one for each, made once). */
export function compassAt(origin: SiteDef): Compass {
  let made = compasses.get(origin);
  if (made) return made;
  const ground = { latitude: origin.latitude.value, longitude: origin.longitude.value, height: origin.height.value };
  const turnOf = (site: SiteDef) => THREE.MathUtils.degToRad(site.bearingX.value - 90);
  const at = (latitude: number, longitude: number): [number, number] => {
    if (latitude === ground.latitude && longitude === ground.longitude) return [0, 0];
    // (at the origin's own height: what is wanted is where it is across the ground, not how far the Earth curves away under it)
    const [e, n] = ecefToEnu(ground, geodeticToEcef({ latitude, longitude, height: ground.height }));
    return [e, -n];
  };
  made = {
    origin,
    turn: turnOf(origin),
    at,
    frame: (site) => {
      if (site === origin) return { x: 0, z: 0, turn: turnOf(site) };
      const [x, z] = at(site.latitude.value, site.longitude.value);
      return { x, z, turn: turnOf(site) };
    },
  };
  compasses.set(origin, made);
  return made;
}
