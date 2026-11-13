import * as THREE from 'three';
import { DEG } from '../world/frames.ts';
import type { Day } from './day.ts';
import { later } from './later.ts';
import { queued } from './pack.ts';
import { EXTENT } from './weather.ts';

/**
 * The weather map (weather.ts) as the shaders read it: one texture and its placing, shared by
 * reference by the clouds (clouds.ts) and the globe under them (globe.ts), so both see the same
 * weather. Until a site's map has arrived (and for a day that has none) it is one texel that says
 * the site's cumulus cover everywhere, and with it the high cloud the record has over the site (weather.ts:
 * weatherGlsl), so the sky a station reported whole is whole from the ground.
 */
const pixel = new Uint8Array([26, 0, 0, 255]);
const blank = new THREE.DataTexture(pixel, 1, 1, THREE.RGBAFormat);
blank.needsUpdate = true;

export const weatherUniforms = {
  tWeather: { value: blank as THREE.Texture },
  /** The bearing of the scene's +X as its sine and cosine, one over the map's breadth, the record's cumulus cover at the site. */
  uWeather: { value: new THREE.Vector4(0, 1, 1 / EXTENT, 0.1) },
  /** How far the map has come in since it arrived, 0 to 1. */
  uWeatherIn: { value: 0 },
  /** The low wind's way and the high wind's, unit vectors in the scene's x and z. */
  uWeatherWind: { value: new THREE.Vector2(1, 0) },
  uWeatherHigh: { value: new THREE.Vector2(1, 0) },
};

/** Ask for the map now (the eye has risen to where the weather is seen). */
export let wantWeather: () => void = () => {};

/** Called when the map arrives: whoever draws by it draws again. */
const arrived: (() => void)[] = [];
export const onWeather = (then: () => void): void => {
  arrived.push(then);
};

/**
 * The high wind's way, as a bearing it blows toward, degrees: from the west-south-west, as the upper westerlies
 * are over Florida in May and over the Syr Darya in April on the whole. Estimated: no sounding at the cirrus's height
 * has been read for any day, and it is only the way the high cloud's fibres and streaks lie.
 */
const HIGH_WIND = 70;

/**
 * Place the weather for a site on a day: its frame's bearing (degrees) and the day (day.ts): the record's cumulus
 * cover there and the low wind's way; and fetch the day's map, if it has one. (The day's two sheets are written into
 * the shaders that draw them: weather.ts, `highOf`.)
 */
export function placeWeather(bearingX: number, day: Day): void {
  const b = bearingX * DEG;
  const cover = day.cumulus?.cover ?? 0;
  const wind = day.cumulus?.wind ?? [1, 0];
  weatherUniforms.uWeather.value.set(Math.sin(b), Math.cos(b), 1 / EXTENT, cover);
  const speed = Math.hypot(wind[0], wind[1]) || 1;
  weatherUniforms.uWeatherWind.value.set(wind[0] / speed, wind[1] / speed);
  // (east, north) to the scene's (x, z): frames.ts, enuToSite
  const h = HIGH_WIND * DEG;
  weatherUniforms.uWeatherHigh.value.set(
    Math.sin(h) * Math.sin(b) + Math.cos(h) * Math.cos(b),
    Math.sin(h) * Math.cos(b) - Math.cos(h) * Math.sin(b),
  );
  pixel[0] = Math.round(cover * 255);
  blank.needsUpdate = true;
  const map = day.map;
  if (!map) return;
  // (not seen from the site: within 12 km the cover is the record's, and the map's part lies along the horizon)
  const load = async (): Promise<void> => {
    const blob = await (await fetch(`${import.meta.env.BASE_URL}globe/${map}.weather.png`)).blob();
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none', imageOrientation: 'none' });
    const texture = new THREE.Texture(bitmap as unknown as HTMLImageElement);
    texture.colorSpace = THREE.NoColorSpace;
    texture.flipY = false;
    texture.generateMipmaps = false; // (its texels are 4 km: it is only ever magnified)
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    // (taken up in a frame of its own: its upload is not to land with another map's: pack.ts)
    await queued(() => {
      weatherUniforms.tWeather.value = texture;
    });
    // It comes in over a second and a half, in a dozen steps (each has the clouds' field baked again: clouds.ts), so
    // the far cloud and its shadows change shape under the eye instead of jumping. At once where there are no frames.
    const began = performance.now();
    const step = (): void => {
      const k = typeof requestAnimationFrame === 'undefined' ? 1 : Math.min(1, Math.ceil(((performance.now() - began) / 1500) * 12) / 12);
      if (k !== weatherUniforms.uWeatherIn.value) {
        weatherUniforms.uWeatherIn.value = k;
        for (const then of arrived) then();
      }
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  };
  wantWeather = later(() => void load());
}
