import * as THREE from 'three';
import { makeAtmosphere, ownAtmosphere } from '../viewer/atmosphere.ts';
import { starsAlone } from '../viewer/heavens.ts';
import { tier } from '../viewer/tier.ts';
import { EARTH } from '../world/bodies.ts';
import { length, sub, unit } from '../world/frames.ts';
import { yearsFrom2000 } from '../world/stars.ts';
import { terrestrialTime } from '../world/time.ts';
import { FarEarth } from './earth.ts';
import { FarMoon } from './moon.ts';
import { cameraFor, FIELD, type FrontCamera, type FrontSky, instantAt, PATH, pathAt, skyAt } from './view.ts';

/**
 * The front page's scene: the Earth seen from out by the Moon, on a canvas and a renderer of its
 * own. It shares no object with a flight's stages, so when a flight has arrived it is let go
 * whole (`dispose`: every texture and buffer, then the context itself) and a flight holds nothing
 * of it.
 *
 * Everything is where front/view.ts puts it for the moment on show: the Earth and how it is
 * turned, the Sun's direction, the stars, the camera along its path. Positions are doubles in the
 * Moon's frame and are handed to the GPU from the eye (the camera stays at the origin and only
 * turns; the Earth is placed by where it is from the eye, the Moon's ground by the eye's place
 * over it), so a float never holds 370,000 km and a metre together.
 *
 * It is drawn in two goes: the stars, on a camera of their own (they are points at no distance:
 * heavens.ts); then the Earth and, over it, the Moon, whose ground is the only thing with depth,
 * between a near plane kept at half the camera's height over the highest ground and a far one
 * past the Earth. Straight to the canvas, multisampled; the Earth's own edge is softened in its
 * shader, where no triangle's edge is.
 *
 * It draws only when the picture would change: every frame while the camera is on its way, and
 * once it has settled, when the Earth has turned a quarter of a pixel (two to five frames a
 * second at the page's pace, a minute of the world a second).
 *
 * The brightnesses are one exposure for both worlds, as a photograph's is: the Sun's light is the
 * same figure the globe is lit by above the air (atmosphere.ts), and `EXPOSURE` is set so that the
 * brightest cloud is just under white. The Moon is then as dark beside the Earth as it is.
 */

/** The exposure: for the look (estimated). */
const EXPOSURE = 0.72;
/** The Sun's light above the air, in the scene's units: the globe's own figure (atmosphere.ts: atmosphereUniforms). */
const SUNLIGHT = [4.5, 4.3, 4.0] as const;
/**
 * The haze over the whole Earth: what it takes from a beam at the sea, per metre, and the height it thins by e
 * over. An optical depth of 0.12 straight up, about the world's mean at 550 nm: estimated (for 1961, more so).
 */
const HAZE = { extinction: 8e-5, scale: 1500 };
/** The faintest star drawn, and how bright: with the camera set for sunlit ground and cloud a photograph has none and an eye a few; estimated. */
const STARS = { limit: 4.5, gain: 0.55 };

export interface FrontStats {
  /** Frames drawn in the last second, and the loop's rate. */
  drawn: number;
  fps: number;
  /** Milliseconds the page spent on the last drawn frame (not the GPU's time: `cost` measures that). */
  ms: number;
  triangles: number;
  calls: number;
}

export class FrontScene {
  readonly canvas: HTMLCanvasElement;
  /** Resolves when the first whole picture is on the canvas (or eight seconds have gone by: it is shown as far as it has come). */
  readonly ready: Promise<void>;
  /**
   * Where in the picture the Earth's centre is to be, as shares of the half breadth and half height from the middle
   * (right and up). The picture is eased there over a few seconds whenever this changes (the page's words going
   * away, or coming back): never a jump. The first frame is drawn with it as it then stands.
   */
  aim: [number, number] = [0, 0];
  /** Where it is now. */
  private readonly aimed: [number, number] = [Number.NaN, 0];
  /** Seconds along the path, and of the world's time at the page's pace. */
  t = 0;
  /** A still picture: the camera `PATH.still` along and the clock stopped at the instant (asked for with the system's "reduce motion"). */
  still = false;
  /** Held where it is (a script taking pictures). */
  held = false;
  sky: FrontSky = skyAt(instantAt(0));
  eye: FrontCamera = cameraFor(this.sky, PATH.from * 1000, 0);

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(6, 1, 1, 1e9);
  private readonly starScene = new THREE.Scene();
  private readonly starCamera = new THREE.PerspectiveCamera(6, 1, 1, 200);
  private readonly stars: THREE.Points;
  private readonly earth: FarEarth;
  private readonly moon: FarMoon;
  private readonly air = ownAtmosphere();
  private raf = 0;
  private last = 0;
  private gone = false;
  private dirty = true;
  private began = false;
  /** How far the Earth had turned, and the aim, when last drawn. */
  private drawnAt = { turn: Number.NaN, aimX: Number.NaN, aimY: Number.NaN };
  private readonly counted = { drawn: 0, frames: 0, since: 0, perSecond: 0, loop: 0, ms: 0 };
  private readonly measure: ResizeObserver;
  private shown: () => void = () => {};

  constructor(parent: HTMLElement) {
    const canvas = (this.canvas = document.createElement('canvas'));
    canvas.id = 'front';
    canvas.setAttribute('aria-hidden', 'true');
    parent.prepend(canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    const renderer = this.renderer;
    renderer.setPixelRatio(Math.min(devicePixelRatio, tier().pixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = EXPOSURE;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 1);
    // (a lost context here is not the page's end: the list of flights is still there, over black)
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.stop();
      canvas.classList.remove('on');
    });

    makeAtmosphere(renderer, HAZE, this.air);
    this.air.uAtmSunLight.value.setRGB(SUNLIGHT[0], SUNLIGHT[1], SUNLIGHT[2]);
    const base = import.meta.env.BASE_URL;
    const lighter = tier().lighter;
    this.earth = new FarEarth(this.air, base, lighter);
    this.moon = new FarMoon(
      base,
      new THREE.Color(SUNLIGHT[0] / Math.PI, SUNLIGHT[1] / Math.PI, SUNLIGHT[2] / Math.PI),
      lighter,
      renderer.capabilities.getMaxAnisotropy(),
    );
    this.scene.add(this.earth.mesh, this.moon.mesh);
    this.stars = starsAlone(renderer.getPixelRatio()) as THREE.Points;
    this.stars.matrixAutoUpdate = false;
    const starry = (this.stars.material as THREE.ShaderMaterial).uniforms;
    starry.uLimit!.value = STARS.limit;
    starry.uGain!.value = STARS.gain;
    this.starScene.add(this.stars);

    this.measure = new ResizeObserver(() => this.resize());
    this.measure.observe(canvas);
    this.resize();
    this.ready = new Promise((done) => {
      this.shown = done;
      setTimeout(done, 8000);
    });
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private resize(): void {
    const w = Math.max(1, this.canvas.clientWidth),
      h = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(w, h, false);
    // the lens sees FIELD across the picture's shorter side
    const aspect = w / h;
    const fov = (aspect >= 1 ? FIELD : 2 * Math.atan(Math.tan(FIELD / 2) / aspect)) * (180 / Math.PI);
    for (const camera of [this.camera, this.starCamera]) {
      camera.aspect = aspect;
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    this.dirty = true;
  }

  /** The Earth's breadth in the picture, CSS pixels. */
  get earthPixels(): number {
    const side = Math.min(this.canvas.clientWidth, this.canvas.clientHeight);
    return (
      (side * Math.tan(Math.asin(EARTH.equatorialRadius.value / length(sub(this.sky.earth, this.eye.position))))) / Math.tan(FIELD / 2)
    );
  }

  /** Go to a moment of the path, seconds from its start. */
  seek(t: number): void {
    this.t = Math.max(0, t);
    this.dirty = true;
  }

  private readonly frame = (now: number): void => {
    if (this.gone) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const c = this.counted;
    c.frames++;
    if (now - c.since >= 1000) {
      c.perSecond = (c.drawn * 1000) / (now - c.since);
      c.loop = (c.frames * 1000) / (now - c.since);
      c.drawn = c.frames = 0;
      c.since = now;
    }
    // (the path does not start until there is something to see)
    if (this.began && !this.still && !this.held) this.t += dt;
    const moving = !this.still && !this.held && this.began && this.t < PATH.seconds + 0.5;
    this.place(now, moving, dt);
  };

  /** Put everything where it is now and draw it if the picture has changed. */
  private place(now: number, moving: boolean, dt: number): void {
    // the Earth's place in the picture, eased toward where it is asked to be (all of the way at the first frame, for
    // a script, and for anyone who has asked for less motion)
    const a = this.aimed;
    const k = Number.isNaN(a[0]) || this.still || this.held ? 1 : 1 - Math.exp(-dt * 1.1);
    for (const i of [0, 1] as const) {
      const from = Number.isNaN(a[i]) ? this.aim[i] : a[i];
      a[i] = Math.abs(this.aim[i] - from) < 2e-4 ? this.aim[i] : from + (this.aim[i] - from) * k;
    }
    const along = this.still ? PATH.still : this.t;
    const sky = (this.sky = skyAt(instantAt(this.still ? 0 : this.t)));
    const { height, rise } = pathAt(along);
    const camera = this.camera;
    const tanY = Math.tan((camera.fov * Math.PI) / 360);
    const eye = (this.eye = cameraFor(sky, height, rise, [a[0] * tanY * camera.aspect, a[1] * tanY]));
    // the camera stays at the origin and turns: its axes are the rotation's columns (it looks along its own -Z)
    const turn = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(...eye.right),
      new THREE.Vector3(...eye.up),
      new THREE.Vector3(-eye.forward[0], -eye.forward[1], -eye.forward[2]),
    );
    camera.quaternion.setFromRotationMatrix(turn);
    this.starCamera.quaternion.copy(camera.quaternion);
    // the ground has depth; the Earth, beyond it, has none to speak of
    camera.near = Math.max(1000, 0.5 * (height - 12_000));
    camera.far = 2 * length(sky.earth);
    camera.updateProjectionMatrix();

    const toSun = unit(sky.sun);
    let coming = this.earth.place(sub(sky.earth, eye.position), sky.earthAxes, unit(sub(sky.sun, sky.earth)), now);
    coming = this.moon.place(eye.position, toSun, now) || coming;
    const s = sky.starAxes;
    this.stars.matrix.set(s[0][0], s[0][1], s[0][2], 0, s[1][0], s[1][1], s[1][2], 0, s[2][0], s[2][1], s[2][2], 0, 0, 0, 0, 1);
    this.stars.matrixWorldNeedsUpdate = true;
    (this.stars.material as THREE.ShaderMaterial).uniforms.uYears!.value = yearsFrom2000(terrestrialTime(sky.jdUT));

    // has the picture changed? The camera on its way, a map coming in, the window, where the Earth is put; or the
    // Earth turned a quarter of a (drawn) pixel at its middle since it was last drawn
    const turned = (sky.jdUT * 2 * Math.PI * 1.0027379) % (2 * Math.PI);
    const quarter = 0.25 / Math.max(1, 0.5 * this.earthPixels * this.renderer.getPixelRatio());
    const d = this.drawnAt;
    let off = Math.abs(turned - d.turn);
    if (off > Math.PI) off = 2 * Math.PI - off;
    const changed = this.dirty || moving || coming || !(off < quarter) || a[0] !== d.aimX || a[1] !== d.aimY || !this.began;
    const whole = this.earth.ready && this.moon.ready;
    if (!changed) return;
    this.dirty = false;
    d.turn = turned;
    d.aimX = a[0];
    d.aimY = a[1];
    const began = performance.now();
    this.draw();
    const c = this.counted;
    c.drawn++;
    c.ms = performance.now() - began;
    if (whole && !this.began) {
      this.began = true;
      this.shown();
    }
  }

  private draw(): void {
    const renderer = this.renderer;
    renderer.clear();
    renderer.render(this.starScene, this.starCamera);
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }

  /** What the last second cost. */
  stats(): FrontStats {
    const info = this.renderer.info.render;
    return { drawn: this.counted.perSecond, fps: this.counted.loop, ms: this.counted.ms, triangles: info.triangles, calls: info.calls };
  }

  /**
   * What a frame costs, milliseconds: `frames` drawn one after another where the path is now, each waited for (a
   * pixel read back: `finish` does not wait in Chrome). For `pnpm test:front` and anyone asking; it stops nothing.
   */
  cost(frames = 60): number {
    const gl = this.renderer.getContext();
    const pixel = new Uint8Array(4);
    const one = (): void => {
      this.draw();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    };
    one();
    const began = performance.now();
    for (let i = 0; i < frames; i++) one();
    return (performance.now() - began) / frames;
  }

  private stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Let all of it go: every texture and buffer, the renderer, the context, the canvas. */
  dispose(): void {
    if (this.gone) return;
    this.gone = true;
    this.stop();
    this.measure.disconnect();
    this.earth.dispose();
    this.moon.dispose();
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.air.tAtmT.value?.dispose();
    this.air.tAtmMS.value?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
