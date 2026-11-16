import type * as THREE from 'three';

/**
 * Which place's shaders are being built. A shader's text can depend on the place, its season and its day: the air
 * installs that day's cloud field and haze in three's chunks (air.ts), and the land, the plants and the globe write the
 * place into theirs (land.ts, flora.ts, globe.ts). three keeps one program for every material with the same key, and
 * the key of a built-in material does not hold the chunks' text, nor does a patched one's hold what the patch wrote;
 * with one stage showing flight after flight (app/session.ts) a second place would be drawn with the first one's
 * programs. So every material the stage draws (Looks.add) has the place's number in its key, and a new place
 * (Settings.drop, PlaceAir.install) is a new number: what is built after it is built again, under its own text.
 */
let epoch = 0;

/** A place has gone, or another day's air has been installed: shaders built from now on are another place's. */
export function newPlace(): void {
  epoch++;
}

const keyed = new WeakSet<THREE.Material>();

/** Give a material the place's number in its program's key, once: kept up as places change. */
export function placeKeyed(material: THREE.Material): void {
  if (keyed.has(material)) return;
  keyed.add(material);
  const own = material.customProgramCacheKey;
  material.customProgramCacheKey = function (this: THREE.Material): string {
    return `${own.call(this)}|place${epoch}`;
  };
}
