import * as THREE from 'three';
import { cross, DEG, dot, type Mat3, type Vec3 } from '../../world/frames.ts';
import type { LunarSite } from '../../world/lunar-terrain.ts';
import { fromSelenographic, MOON_RADIUS, selenographic } from '../../world/moon.ts';
import { skyAt } from '../../world/moonsky.ts';
import { yearsFrom2000 } from '../../world/stars.ts';
import { julianDate, terrestrialTime } from '../../world/time.ts';
import { makeAtmosphere, ownAtmosphere } from '../atmosphere.ts';
import type { Setting } from '../backdrops.ts';
import { DAY_EXPOSURE, SUN_LUX } from '../daysky.ts';
import { disposeTree } from '../dispose.ts';
import { limitUnder, SPACE_GROUND } from '../eye.ts';
import { FAR_HAZE, FarEarth } from '../farearth.ts';
import { landingDetail } from '../flightmoon.ts';
import { starsAlone } from '../heavens.ts';
import { MoonBody } from '../moon.ts';
import { EARTHSHINE } from '../moonground.ts';
import { OrbitBackdrop } from '../space.ts';
import { tier } from '../tier.ts';
import { type LunarGroundData, LunarNear } from './ground.ts';
import { disc, exposureFor, NOON_GROUND, SUN_RADIUS } from './light.ts';

/**
 * Standing on the Moon at a landing site: the setting a flight's place becomes once it is on the surface (app/session.ts
 * swaps it in for the pad's, as a flight is swapped for another: Stage.load), and the one the rover's gallery scene is
 * driven in (viewer/lunar-driving-ground.ts, with a state of its own). It knows no flight: it is given the site (a
 * `SiteDef` with `body: 'moon'` and its ground, fetched: ground.ts) and an instant to open at, and then moves with the
 * clock (`Setting.at`).
 *
 * **The ground** is in three parts, each where it is the best there is. Near at hand, the nested grids of LROC's stereo
 * (ground.ts `LunarNear`: 2 m a square round the LM, out to 32.8 km), as meshes that take the Sun's shadows, with the
 * soil's grain and the stones a boot kicks. Past them, for the horizon, the whole Moon: the front page's and the flight
 * scene's body (viewer/moon.ts `MoonBody`, its flight mode, with the site's finest map, 481 m a texel, and its descent
 * strip from SLDEM2015), not drawn over the grids' square (`MoonBody.hole`), the gap between under a skirt hung from
 * the grids' edge. From a mare the horizon is two or three kilometres off and all of it is the grids'; from Hadley or
 * Taurus-Littrow the massifs beyond are the whole Moon's.
 *
 * **The sky** is black. The Sun, the Earth and the stars are where the ephemeris has them at the clock's instant, from
 * the site (world/moonsky.ts `skyAt`, the front page's sky: DE440's places once loaded, Meeus's mean-Earth axes, 0.03
 * degrees from DE440's): the Sun's disc at its size, the Earth the front page's ball with its phase, turned to the hour,
 * and the day's cloud where it has been baked for the landing (`DAY`), the stars the bright table's, as many as an eye
 * adapted to the sunlit ground can see (`limitUnder`, as the front page does: none by day). Nothing is placed by hand
 * and nothing steps: every figure is a smooth function of the instant, worked out again whenever the clock moves.
 *
 * **The light.** The Sun's above the air (the globe's own figure: atmosphere.ts `uAtmSunLight`), white, at the share of
 * its disc above the level horizon (`disc`); what fills a shadow is the sunlit ground round it, as a bake of a black sky
 * over ground of one radiance (`environment`, made once: it does not change with the Sun's place, only its strength,
 * which is `environmentIntensity`, every frame), and the earthshine, a few hundred-thousandths of it. The exposure is
 * the eye's on the sunlit ground (`exposureFor`): estimated.
 *
 * What is simplified: the near ground is lit as a matte surface (the Moon's own photometry, Lommel and Seeliger's with
 * its surge toward opposition, is the far body's: moonground.ts `LIGHT_GLSL`), with an albedo a little above the Moon's
 * normal one for that (ground.ts `SOIL`); it has one colour, not the site's; the grids' heights between their 2 m
 * points are flat triangles; the light the ground throws into a shadow is the level ground's, not the slopes' round it;
 * the Earth's cloud is one hour's, the landing's, for the whole stay; the Earth's light is not in the shadows' fill
 * beyond a fixed share; the Sun is not dimmed by the Earth (no landing was in an eclipse).
 */

/** When a setting opens: an instant, ISO 8601, UTC (a flight's launch, whose clock it then follows; the rover gallery's own). */
export interface LunarOccasion {
  launch: string;
}

/** What the lunar setting adds to a `Setting`: its near ground and the site it is at. */
export interface LunarSetting extends Setting {
  readonly lunar: { id: LunarSite; near: LunarNear; body: MoonBody; earth: FarEarth };
}

/** The day's cloud on the Earth, where it has been baked for a landing (tools/front-earth.mjs `--lunar`, for the hour its LM landed): public/lunar/<site>.earth.day.jpg. */
const DAY = (base: string, id: LunarSite): string => `${base}lunar/${id}.earth.day.jpg`;
/** How far the Earth is put from the sky's camera (which only turns): scaled to it, it covers what it covers at 384,000 km. */
const EARTH_AT = 150;
/** How far past the grids' square the whole Moon is left undrawn, metres: the grids' skirt fills the gap (ground.ts). */
const MARGIN = 250;

/** The near ground's linear albedo (ground.ts `SOIL` with its grain): what the eye adapts to and what it throws into a shadow. */
const ALBEDO = 0.15;

/** The rows of the turn from the Moon's frame to the site's (+X east, +Y up, +Z south), and the site's ground in the Moon's frame. */
function siteAxes(latitude: number, longitude: number, height: number): { M: Mat3; origin: Vec3; up: Vec3; east: Vec3; north: Vec3 } {
  const up = fromSelenographic(longitude, latitude);
  const east: Vec3 = [-Math.sin(longitude * DEG), Math.cos(longitude * DEG), 0];
  const north = cross(up, east);
  const M: Mat3 = [east, up, [-north[0], -north[1], -north[2]]];
  const r = MOON_RADIUS + height;
  return { M, origin: [up[0] * r, up[1] * r, up[2] * r], up, east, north };
}

const turn = (M: Mat3, v: Vec3): Vec3 => [dot(M[0], v), dot(M[1], v), dot(M[2], v)];
const back = (M: Mat3, v: Vec3): Vec3 => [
  M[0][0] * v[0] + M[1][0] * v[1] + M[2][0] * v[2],
  M[0][1] * v[0] + M[1][1] * v[1] + M[2][1] * v[2],
  M[0][2] * v[0] + M[1][2] * v[1] + M[2][2] * v[2],
];
const times = (M: Mat3, N: Mat3): Mat3 =>
  [0, 1, 2].map((i) => [0, 1, 2].map((j) => M[i]![0] * N[0][j] + M[i]![1] * N[1][j] + M[i]![2] * N[2][j])) as unknown as Mat3;

/** The setting itself. `data`: the site's ground, fetched (ground.ts `lunarGround`). */
export function lunarSetting(renderer: THREE.WebGLRenderer, when: LunarOccasion, data: LunarGroundData): LunarSetting {
  const base = import.meta.env.BASE_URL;
  const { lighter } = tier();
  const site = data.site;
  const [latitude, longitude] = site.landing as [number, number];
  const frame = siteAxes(latitude, longitude, site.height);
  const near = new LunarNear(data);

  // the sky: the stars, the Sun's disc (space.ts, as above the Earth's air) and the Earth
  const stars = starsAlone(renderer.getPixelRatio()) as THREE.Points;
  stars.matrixAutoUpdate = false;
  const starry = (stars.material as THREE.ShaderMaterial).uniforms;
  const sunDir = new THREE.Vector3(0, 1, 0);
  const backdrop = new OrbitBackdrop(sunDir, stars);
  const air = ownAtmosphere();
  makeAtmosphere(renderer, FAR_HAZE, air);
  const sunlight = air.uAtmSunLight.value as THREE.Color;
  const strength = Math.max(sunlight.r, sunlight.g, sunlight.b);
  const earth = new FarEarth(air, base, lighter, DAY(base, data.id));
  backdrop.scene.add(earth.mesh);
  const earthSize = earth.mesh.scale.clone();

  // the whole Moon past the grids, for the horizon
  const body = new MoonBody(
    `${base}front/`,
    new THREE.Color(sunlight.r / Math.PI, sunlight.g / Math.PI, sunlight.b / Math.PI),
    lighter,
    renderer.capabilities.getMaxAnisotropy(),
    true,
  );
  body.apronShown = false;
  // (the grids' square on the site's plane: east of the LM from west to east, north from -half to half)
  const sq = near.square;
  body.hole({ west: sq.west - MARGIN, east: sq.east + MARGIN, south: -sq.half - MARGIN, north: sq.half + MARGIN });
  body.turn(new THREE.Matrix3().set(...frame.M[0], ...frame.M[1], ...frame.M[2]));
  body.fade(1);
  let gone = false;
  void landingDetail(base, data.id).then((d) => {
    if (d && !gone) body.detail(d);
  });

  // what fills a shadow: the sunlit ground below the level (one radiance, made once), a black sky above
  const environment = (() => {
    const scene = new THREE.Scene();
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(10, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            // the ground to the horizon, which is level here (its dip from eye height, under a hundredth of a degree, left out)
            gl_FragColor = vec4(vec3(smoothstep(0.02, -0.02, d.y)), 1.0);
          }`,
      }),
    );
    scene.add(sphere);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const target = pmrem.fromScene(scene, 0, 0.1, 100);
    pmrem.dispose();
    disposeTree(scene);
    return target;
  })();

  const exposure = exposureFor(0, ALBEDO, NOON_GROUND);
  const setting: LunarSetting = {
    lunar: { id: data.id, near, body, earth },
    backdrop,
    environment: environment.texture,
    environmentIntensity: 0,
    sunDir,
    sunColor: new THREE.Color(sunlight.r / strength, sunlight.g / strength, sunlight.b / strength),
    sunIntensity: 0,
    fill: [0x9db4d8, 0x000000, 0],
    floor: near.meshes[0]!,
    scenery: [...near.meshes.slice(1), near.stones],
    selfDrawn: [body.group],
    maxPolar: Math.PI / 2 - 0.015,
    exposure,
    fog: null,
    reach: near.reach,
    // (a massif beyond the grids is seen over the horizon from 130 km: Mount Hadley's 4.5 km from the Apennine Front's foot)
    horizon: 300_000,
    grade: 0,
    lamps: 0,
    space: 1,
    groundAt: (x, z) => groundAt(x, z),
    simplify: (on) => body.cel(on),
    release: () => {
      gone = true;
      body.dispose();
      earth.dispose();
      near.dispose();
      environment.dispose();
      stars.geometry.dispose();
      (stars.material as THREE.Material).dispose();
      // (the air's tables are drawn into targets: a target's picture goes only with its target)
      for (const t of [air.tAtmT.value, air.tAtmMS.value]) ((t as THREE.Texture | null)?.renderTarget ?? t)?.dispose();
    },
  };

  /** The ground's height at a place in the site's frame: the grids', and past them the whole Moon's as its ground is known (the descent strip, then the sphere). */
  const groundAt = (x: number, z: number): number => {
    if (x > sq.west && x < sq.east && Math.abs(z) < sq.half) return near.height(x, z);
    const { origin, east, north, up } = frame;
    const p: Vec3 = [0, 1, 2].map((i) => origin[i]! + east[i]! * x - north[i]! * z) as unknown as Vec3;
    const at = selenographic(p);
    const r = MOON_RADIUS + data.ground.height(at.latitude, at.longitude);
    const l = Math.hypot(...p);
    return dot([(p[0] / l) * r - origin[0], (p[1] / l) * r - origin[1], (p[2] / l) * r - origin[2]], up);
  };

  // where the Sun and the Earth are, and the light, at the instant `at` was last given
  let jd = Number.NaN;
  const shadowed = new THREE.Vector3(0, -1, 0);
  let sunMoon: Vec3 = [1, 0, 0];
  let earthMoon: Vec3 = [-1, 0, 0];
  let earthLit = 0;
  setting.at = (jdUT, _height = 0, atOnce = false) => {
    if (jdUT === jd) return null;
    const jumped = Number.isNaN(jd) || Math.abs(jdUT - jd) * 86_400 > 600;
    jd = jdUT;
    const sky = skyAt(jdUT);
    sunMoon = sky.sun;
    earthMoon = sky.earth;
    earthLit = sky.earthLit;
    const toSun = turn(frame.M, [sky.sun[0] - frame.origin[0], sky.sun[1] - frame.origin[1], sky.sun[2] - frame.origin[2]]);
    sunDir.set(toSun[0], toSun[1], toSun[2]).normalize();
    backdrop.sunlight(sunDir, SUN_RADIUS);
    const elevation = Math.asin(THREE.MathUtils.clamp(sunDir.y, -1, 1));
    const shown = disc(elevation);
    setting.sunIntensity = strength * shown;
    const ground = setting.sunIntensity * Math.max(sunDir.y, 0);
    // the sunlit ground's light in a shadow (its radiance, the bake being of one), and the earthshine
    setting.environmentIntensity = (ALBEDO * ground) / Math.PI;
    const earthlight = EARTHSHINE * strength * earthLit;
    setting.fill[2] = earthlight;
    setting.exposure = exposureFor(ground + ALBEDO * earthlight, ALBEDO, NOON_GROUND);
    // the stars an eye on the sunlit ground sees, drawn as bright as it sees them (heavens.ts; the front page's rule)
    const veil = Math.max((ALBEDO * SUN_LUX * shown * Math.max(sunDir.y, 0)) / Math.PI, SPACE_GROUND);
    starry.uLimit!.value = limitUnder(veil);
    starry.uGain!.value = DAY_EXPOSURE / setting.exposure;
    starry.uYears!.value = yearsFrom2000(terrestrialTime(jdUT));
    const s = times(frame.M, sky.starAxes);
    stars.matrix.set(s[0][0], s[0][1], s[0][2], 0, s[1][0], s[1][1], s[1][2], 0, s[2][0], s[2][1], s[2][2], 0, 0, 0, 0, 1);
    stars.matrixWorldNeedsUpdate = true;
    // the Earth, from the site, turned to the hour (FarEarth draws it from where it is from the eye: put nearer and smaller, the same)
    const e = turn(frame.M, [sky.earth[0] - frame.origin[0], sky.earth[1] - frame.origin[1], sky.earth[2] - frame.origin[2]]);
    const fromEarth = turn(frame.M, [sky.sun[0] - sky.earth[0], sky.sun[1] - sky.earth[1], sky.sun[2] - sky.earth[2]]);
    const l = Math.hypot(...fromEarth);
    earth.place(
      e,
      times(frame.M, sky.earthAxes),
      [fromEarth[0] / l, fromEarth[1] / l, fromEarth[2] / l],
      atOnce ? Number.POSITIVE_INFINITY : performance.now(),
    );
    const k = EARTH_AT / Math.hypot(...e);
    earth.mesh.position.multiplyScalar(k);
    earth.mesh.scale.copy(earthSize).multiplyScalar(k);
    const shadows = sunDir.angleTo(shadowed) > 0.05 * DEG;
    if (shadows) shadowed.copy(sunDir);
    return { shadows, jumped };
  };
  setting.attend = (eye, frozen) => {
    near.follow(eye.x, eye.z);
    const at = back(frame.M, [eye.x, eye.y, eye.z]);
    const o = frame.origin;
    return body.place(
      [o[0] + at[0], o[1] + at[1], o[2] + at[2]],
      sunMoon,
      earthMoon,
      earthLit,
      frozen ? Number.POSITIVE_INFINITY : performance.now(),
    );
  };
  setting.at(julianDate(when.launch));
  return setting;
}
