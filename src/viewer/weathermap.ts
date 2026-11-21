import * as THREE from 'three';
import { DEG } from '../world/frames.ts';
import type { Day } from './day.ts';
import { later } from './later.ts';
import { queued } from './pack.ts';
import { EXTENT, FAR_SIDE, farWeatherFaces, mapDayOf } from './weather.ts';

/**
 * The weather map (weather.ts) as the shaders read it: one texture and its placing, shared by
 * reference by the clouds (clouds.ts) and the globe under them (globe.ts), so both see the same
 * weather. Each setting owns its shader slots and the texture they describe.
 * Until a site's map has arrived (and for a day that has none) it is one texel that says
 * the site's cumulus cover everywhere, and with it the high cloud the record has over the site (weather.ts:
 * weatherGlsl), so the sky a station reported whole is whole from the ground.
 */
const none = new THREE.DataTexture(new Uint8Array([26, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
none.needsUpdate = true;

/** A cube of six faces of bytes (red, green, blue, alpha), read between its texels: the far weather (weather.ts `farWeatherFaces`). */
function cubeOf(faces: Uint8Array[], side: number): THREE.CubeTexture {
  const cube = new THREE.CubeTexture(
    faces.map((data) => {
      const face = new THREE.DataTexture(data, side, side, THREE.RGBAFormat);
      face.needsUpdate = true;
      return face;
    }),
  );
  cube.format = THREE.RGBAFormat;
  cube.type = THREE.UnsignedByteType;
  cube.colorSpace = THREE.NoColorSpace;
  cube.generateMipmaps = false;
  cube.minFilter = cube.magFilter = THREE.LinearFilter;
  cube.needsUpdate = true;
  return cube;
}
/** The far weather before it is made, and on a day with no map: one texel a face, the same cover everywhere and no other cloud. */
const sameEverywhere = (cover: number): THREE.CubeTexture =>
  cubeOf(
    Array.from({ length: 6 }, () => new Uint8Array([Math.round(cover * 255), 0, 0, 0])),
    1,
  );
const noneFar = sameEverywhere(26 / 255);

export const weatherSlots = () => ({
  tWeather: { value: none as THREE.Texture },
  /** The weather past the map, anywhere on the Earth: a cube read along the way from the Earth's middle, in the scene's axes. */
  tWeatherFar: { value: noneFar as THREE.CubeTexture },
  tRecovery: { value: none as THREE.Texture },
  uRecovery: { value: 0 },
  /** The bearing of the scene's +X as its sine and cosine, one over the map's breadth, the record's cumulus cover at the site. */
  uWeather: { value: new THREE.Vector4(0, 1, 1 / EXTENT, 0.1) },
  /** How far the map has come in since it arrived, 0 to 1. */
  uWeatherIn: { value: 0 },
  /** The low wind's way and the high wind's, unit vectors in the scene's x and z. */
  uWeatherWind: { value: new THREE.Vector2(1, 0) },
  uWeatherHigh: { value: new THREE.Vector2(1, 0) },
});

/**
 * A site's weather on a day, as its setting holds it (backdrops.ts `Setting.weather`): its frame's bearing (degrees) and
 * the day (day.ts), the record's cumulus cover there and the low wind's way, written into the slots as it is made; and
 * the day's map, if it has one, fetched when it is wanted (`want`) and brought in over a second and a half. Whoever
 * draws by it listens for it (`onArrive`) and stops with the function that returns; `dispose` lets the map go with its
 * listeners, and a map still on its way is not taken up. (The day's two sheets are written into the shaders that draw
 * them: weather.ts, `highOf`.)
 */
export class WeatherMap {
  readonly uniforms = weatherSlots();
  /** Ask for the map now (the eye has risen to where the weather is seen). */
  want: () => void = () => {};
  /** Its one texel until the map has come: the record's cover everywhere. */
  private readonly blank: THREE.DataTexture;
  private map: THREE.Texture | null = null;
  private readonly blankFar: THREE.CubeTexture;
  private far: THREE.CubeTexture | null = null;
  private recovery: THREE.Texture | null = null;
  private recoveryShare = 0;
  private gone = false;
  private readonly arrived = new Set<() => void>();

  constructor(bearingX: number, day: Day) {
    const b = bearingX * DEG;
    const cover = day.cumulus?.cover ?? 0;
    const wind = day.cumulus?.wind ?? [1, 0];
    this.blank = new THREE.DataTexture(new Uint8Array([Math.round(cover * 255), 0, 0, 255]), 1, 1, THREE.RGBAFormat);
    this.blank.needsUpdate = true;
    this.uniforms.tWeather.value = this.blank;
    this.blankFar = sameEverywhere(cover);
    this.uniforms.tWeatherFar.value = this.blankFar;
    this.uniforms.uWeatherIn.value = 0;
    this.uniforms.uRecovery.value = 0;
    this.uniforms.tRecovery.value = none;
    this.uniforms.uWeather.value.set(Math.sin(b), Math.cos(b), 1 / EXTENT, cover);
    const speed = Math.hypot(wind[0], wind[1]) || 1;
    this.uniforms.uWeatherWind.value.set(wind[0] / speed, wind[1] / speed);
    // the high wind's way (day.ts `highToward`), (east, north) to the scene's (x, z): frames.ts, enuToSite
    const h = day.high.toward;
    this.uniforms.uWeatherHigh.value.set(
      Math.sin(h) * Math.sin(b) + Math.cos(h) * Math.cos(b),
      Math.sin(h) * Math.cos(b) - Math.cos(h) * Math.sin(b),
    );
    const map = day.map;
    // (not seen from the site: within 12 km the cover is the record's, and the map's part lies along the horizon)
    if (map)
      this.want = later(() => {
        void this.load(map, day);
        if (day.recovery) void this.loadRecovery(day.recovery.map);
      });
  }

  /** The share of the recovery map at the clock's instant. A seek before the handover draws the launch map again. */
  recover(share: number): void {
    this.recoveryShare = share;
    if (share > 0) this.want();
    this.uniforms.uRecovery.value = this.recovery ? share : 0;
  }

  /** Call `then` each time more of the map has come in. Returns the way to stop. */
  onArrive(then: () => void): () => void {
    this.arrived.add(then);
    return () => this.arrived.delete(then);
  }

  /** Let the map go, and its listeners: the place has left the stage (Settings.drop). */
  dispose(): void {
    this.gone = true;
    this.uniforms.tWeather.value = none;
    this.uniforms.tWeatherFar.value = noneFar;
    this.uniforms.uWeatherIn.value = 0;
    this.uniforms.tRecovery.value = none;
    this.uniforms.uRecovery.value = 0;
    this.arrived.clear();
    this.blank.dispose();
    this.blankFar.dispose();
    this.far?.dispose();
    this.far = null;
    if (this.map) {
      this.map.dispose();
      (this.map.image as ImageBitmap | null)?.close?.();
      this.map = null;
    }
    if (this.recovery) {
      this.recovery.dispose();
      (this.recovery.image as ImageBitmap).close();
      this.recovery = null;
    }
  }

  private async textureFor(map: string): Promise<THREE.Texture | null> {
    const blob = await (await fetch(`${import.meta.env.BASE_URL}globe/${map}.weather.png`)).blob();
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none', imageOrientation: 'none' });
    if (this.gone) {
      bitmap.close();
      return null;
    }
    const texture = new THREE.Texture(bitmap as unknown as HTMLImageElement);
    texture.colorSpace = THREE.NoColorSpace;
    texture.flipY = false;
    texture.generateMipmaps = false; // (its texels are 4 km: it is only ever magnified)
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  private async loadRecovery(map: string): Promise<void> {
    const texture = await this.textureFor(map);
    if (!texture) return;
    await queued(() => {
      if (this.gone) {
        texture.dispose();
        (texture.image as ImageBitmap).close();
        return;
      }
      this.recovery = texture;
      this.uniforms.tRecovery.value = texture;
      this.uniforms.uRecovery.value = this.recoveryShare;
      for (const then of this.arrived) then();
    });
  }

  /**
   * The far weather of the day (weather.ts `farWeatherAt`), made here and not fetched: a few milliseconds at a time
   * with the frames between, while the map is on its way.
   */
  private async farOf(day: Day): Promise<THREE.CubeTexture | null> {
    const making = farWeatherFaces(mapDayOf(day));
    let began = performance.now();
    for (;;) {
      const next = making.next();
      if (next.done) return this.gone ? null : cubeOf(next.value, FAR_SIDE);
      if (this.gone) return null;
      if (typeof requestAnimationFrame !== 'undefined' && performance.now() - began > 4) {
        await new Promise((r) => setTimeout(r));
        began = performance.now();
      }
    }
  }

  private async load(map: string, day: Day): Promise<void> {
    const [texture, far] = await Promise.all([this.textureFor(map), this.farOf(day)]);
    if (!texture || !far) {
      texture?.dispose();
      (texture?.image as ImageBitmap | undefined)?.close?.();
      far?.dispose();
      return;
    }
    // (taken up in a frame of its own: its upload is not to land with another map's: pack.ts)
    await queued(() => {
      if (this.gone) return;
      this.map = texture;
      this.far = far;
      this.uniforms.tWeather.value = texture;
      this.uniforms.tWeatherFar.value = far;
    });
    if (this.gone) {
      if (this.map !== texture) {
        texture.dispose();
        (texture.image as ImageBitmap).close();
        far.dispose();
      }
      return;
    }
    // It comes in over a second and a half, in a dozen steps (each has the clouds' field baked again: clouds.ts), so
    // the far cloud and its shadows change shape under the eye instead of jumping. At once where there are no frames.
    const began = performance.now();
    const step = (): void => {
      if (this.gone) return;
      const k = typeof requestAnimationFrame === 'undefined' ? 1 : Math.min(1, Math.ceil(((performance.now() - began) / 1500) * 12) / 12);
      if (k !== this.uniforms.uWeatherIn.value) {
        this.uniforms.uWeatherIn.value = k;
        for (const then of this.arrived) then();
      }
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }
}
