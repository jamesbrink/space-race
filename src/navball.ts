import { prefs } from './prefs.ts';
import { type Quat, turn } from './sim/rigid.ts';
import { EARTH_ROTATION_RATE } from './world/bodies.ts';
import {
  cross,
  DEG,
  dot,
  ecefToGeodetic,
  ecefToInertial,
  enuAxes,
  inertialToEcef,
  length,
  scale,
  sub,
  unit,
  type Vec3,
} from './world/frames.ts';

/**
 * The navball: the vehicle's attitude against the local horizon, and on it the directions that
 * matter to whoever is flying: where it is going (prograde) and the opposite, the orbit's radial
 * and normal directions, and where guidance wants the nose.
 *
 * The ball is the sphere of directions round the vehicle, fixed to the ground under it: north,
 * east and down at the place below (the ellipsoid's normal there, so "level" is the plumb line's
 * level). It is seen from inside, from the middle, looking along the nose: what is at the middle
 * of the disc is where the nose points, a direction to the pilot's right is to the right of it,
 * and the half of the sphere behind is not seen. So the ball turns the opposite way to the
 * vehicle, as an attitude indicator does.
 *
 * The pilot's axes are the body's (sim/vehicle.ts): forward is +X, the nose; up is +Z, which on
 * the pad points against the launch azimuth; right is -Y. So as the stack tips downrange the
 * horizon comes up from the bottom of the ball with the sky above it, and the keys read as an
 * aeroplane's do: W tips the nose toward the bottom of the ball, A swings it left.
 *
 * `ballOf` is the whole of the mathematics and draws nothing. The frame of its inputs is the
 * simulator's: Earth-centred and not turning, its axes the Earth's at liftoff, `t` seconds on.
 */

/** A direction on the ball: x to the right and y up on the disc, z toward the nose (seen when positive). A unit vector. */
export type OnBall = Vec3;

export interface Ball {
  /** The pilot's right, up and forward, in the frame that does not turn: the rows that take a direction onto the ball. */
  right: Vec3;
  up: Vec3;
  forward: Vec3;
  /** North, east and straight up at the place under the vehicle, on the ball. */
  north: OnBall;
  east: OnBall;
  zenith: OnBall;
  /** Where the nose points: degrees clockwise from north, and degrees above the level. Straight up or down, the heading is the way the nose would go if pitched forward. */
  heading: number;
  pitch: number;
  /** How far the pilot's up is rolled from the plumb line's, degrees: positive is right side down. 0 with the nose straight up or down. */
  roll: number;
  /** Through the air that turns with the Earth (Earth-fixed): the speed, m/s, and the ways it is going and coming from. Null when standing still. */
  surface: { speed: number; prograde: OnBall | null; retrograde: OnBall | null };
  /** In the frame that does not turn (space-fixed): the same, with the orbit's own directions: radial is at right angles to the motion in the orbit's plane, out away from the Earth; normal is the orbit's axis (north of an eastward orbit). */
  orbit: {
    speed: number;
    prograde: OnBall | null;
    retrograde: OnBall | null;
    radialOut: OnBall | null;
    radialIn: OnBall | null;
    normal: OnBall | null;
    antinormal: OnBall | null;
  };
  /** Where guidance wants the nose, if it was given. */
  target: OnBall | null;
}

const X: Vec3 = [1, 0, 0];
const Y: Vec3 = [0, 1, 0];
const Z: Vec3 = [0, 0, 1];
const SPIN: Vec3 = [0, 0, EARTH_ROTATION_RATE];
const flip = (v: OnBall | null): OnBall | null => (v ? scale(v, -1) : null);

/**
 * The ball for a state: position and velocity in the frame that does not turn, the attitude (body
 * to that frame) and seconds from liftoff. `target` is a direction in the same frame.
 */
export function ballOf(r: Vec3, v: Vec3, attitude: Quat, t: number, target?: Vec3 | null): Ball {
  const forward = turn(attitude, X);
  const right = scale(turn(attitude, Y), -1);
  const up = turn(attitude, Z);
  const on = (d: Vec3): OnBall => [dot(d, right), dot(d, up), dot(d, forward)];
  // the ground's axes under the vehicle, carried into the frame that does not turn
  const angle = EARTH_ROTATION_RATE * t;
  const axes = enuAxes(ecefToGeodetic(inertialToEcef(r, angle)));
  const north = on(ecefToInertial(axes.north, angle));
  const east = on(ecefToInertial(axes.east, angle));
  const zenith = on(ecefToInertial(axes.up, angle));

  const pitch = Math.asin(Math.max(-1, Math.min(1, zenith[2]))) / DEG;
  // the nose's bearing; straight up or down it has none, and the way the pilot's feet point (where pitching forward takes it) stands in
  const level = Math.hypot(north[2], east[2]);
  const bearing = level > 2e-3 ? Math.atan2(east[2], north[2]) : Math.atan2(-east[1], -north[1]);
  const heading = (((bearing / DEG) % 360) + 360) % 360;
  const roll = Math.hypot(zenith[0], zenith[1]) > 1e-6 ? Math.atan2(-zenith[0], zenith[1]) / DEG : 0;

  const going = (velocity: Vec3): OnBall | null => (length(velocity) > 0.5 ? on(unit(velocity)) : null);
  const wind = sub(v, cross(SPIN, r));
  const prograde = going(v);
  // the orbit's axis, and what is left of "away from the Earth" at right angles to the motion
  const h = cross(r, v);
  const turning = length(h) > 1e-3 * length(r) && prograde !== null;
  const normal = turning ? on(unit(h)) : null;
  const radialOut = turning ? on(unit(cross(v, h))) : null;
  return {
    right,
    up,
    forward,
    north,
    east,
    zenith,
    heading,
    pitch,
    roll,
    surface: { speed: length(wind), prograde: going(wind), retrograde: flip(going(wind)) },
    orbit: {
      speed: length(v),
      prograde,
      retrograde: flip(prograde),
      radialOut,
      radialIn: flip(radialOut),
      normal,
      antinormal: flip(normal),
    },
    target: target ? on(unit(target)) : null,
  };
}

/** The point of the ball at a bearing and a height above the level, radians. */
export function ballPoint(ball: Pick<Ball, 'north' | 'east' | 'zenith'>, bearing: number, elevation: number): OnBall {
  const [c, s] = [Math.cos(elevation), Math.sin(elevation)];
  const [n, e] = [c * Math.cos(bearing), c * Math.sin(bearing)];
  return [
    n * ball.north[0] + e * ball.east[0] + s * ball.zenith[0],
    n * ball.north[1] + e * ball.east[1] + s * ball.zenith[1],
    n * ball.north[2] + e * ball.east[2] + s * ball.zenith[2],
  ];
}

// ---------------------------------------------------------------------------------------------
// The instrument: a canvas for the ball (an orthographic drawing of its lines, at the screen's own
// density) with the markers laid over it as elements, each with its name. It is drawn only when
// the attitude has changed by enough to see, and not at all while it is tucked away or the flight
// deck is empty.

export type Frame = 'surface' | 'orbit';

/** What the instrument reads: the flight deck (cockpit.ts), or anything that shows samples the same way. */
export interface NavSource {
  readonly active: boolean;
  listen(fn: (sample: NavSample, live: unknown) => void): void;
}
export interface NavSample {
  t: number;
  r: Vec3;
  v: Vec3;
  attitude: Quat;
  centre?: Vec3;
  phase?: string;
}

const SVG = (body: string, box = '0 0 24 24'): string =>
  `<svg viewBox="${box}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
/** The markers: a class, what it is called, and its sign. Prograde is a circle with three ticks and retrograde a circle with a cross, as flight instruments have them. */
const MARKS = {
  prograde: [
    'Prograde: the way it is going',
    SVG('<circle cx="12" cy="12" r="5"/><path d="M12 7V2M7 12H2M17 12h5"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/>'),
  ],
  retrograde: [
    'Retrograde: the way it has come from',
    SVG('<circle cx="12" cy="12" r="5"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7M12 7V2M7.7 14.5L3.3 17M16.3 14.5l4.4 2.5"/>'),
  ],
  radialOut: [
    'Radial out: away from the Earth, at right angles to the motion',
    SVG(
      '<circle cx="12" cy="12" r="4.5"/><path d="M15.2 8.8L19 5M8.8 8.8L5 5M15.2 15.2L19 19M8.8 15.2L5 19"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/>',
    ),
  ],
  radialIn: [
    'Radial in: toward the Earth, at right angles to the motion',
    SVG('<circle cx="12" cy="12" r="6.5"/><path d="M7.4 7.4l2.6 2.6M16.6 7.4L14 10M7.4 16.6L10 14M16.6 16.6L14 14"/>'),
  ],
  normal: [
    "Normal: the orbit's axis, north of an eastward orbit",
    SVG('<path d="M12 4.5l7 12H5z"/><circle cx="12" cy="12.5" r="0.6" fill="currentColor"/>'),
  ],
  antinormal: [
    "Antinormal: against the orbit's axis",
    SVG(
      '<path d="M12 19.5l7-12H5z"/><path d="M12 19.5V23M5 7.5L2.5 5M19 7.5L21.5 5"/><circle cx="12" cy="11.5" r="0.6" fill="currentColor"/>',
    ),
  ],
  target: [
    'Guidance: where the tilt programme, with your trim, wants the nose',
    SVG('<path d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4"/><path d="M12 9v6M9 12h6"/>'),
  ],
} as const;
type Mark = keyof typeof MARKS;

/** The ball's colours: the sky and the ground as flat tones, lines in the page's ink. */
const SKY = '#2f7fc4';
const GROUND = '#77502c';
const INK = '#f3efe6';
const POINTS = ['N', '30', '60', 'E', '120', '150', 'S', '210', '240', 'W', '300', '330'];

export class Navball {
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly marks = new Map<Mark, HTMLElement>();
  private readonly cells = new Map<string, HTMLElement>();
  private readonly source: NavSource;
  private readonly watchers: ((frame: Frame) => void)[] = [];
  private mode: Frame = prefs.get('orbitFrame') ? 'orbit' : 'surface';
  private tucked = prefs.get('navballTucked');
  /** The sample last given, and what the ball was last drawn from. */
  private last: NavSample | null = null;
  private drawn: number[] = [];
  private size = 0;
  /** Where guidance wants the nose at a sample, or null: given by the page, which knows the flight deck. */
  target: (s: NavSample) => Vec3 | null = () => null;
  /** Something of another's to show beside the ball (the predicted path's figures). */
  readonly aside: HTMLElement;

  /** `parent` is the flight deck's own panel: the ball stands on its top edge. `button` is the deck's switch for it, if it has one. */
  constructor(parent: HTMLElement, source: NavSource, button?: HTMLElement | null) {
    this.source = source;
    const root = (this.root = document.createElement('div'));
    root.className = 'navball';
    const mark = (id: Mark): string => `<i class="nav-mark nav-${id}" data-mark="${id}" title="${MARKS[id][0]}" hidden>${MARKS[id][1]}</i>`;
    root.innerHTML = `
      <button class="navball-tuck chevron" data-nav="tuck" aria-label="Show or hide the navball" aria-expanded="true" title="Navball (I)"></button>
      <div class="navball-side navball-read">
        <button data-nav="mode" title="Which speed the markers show: over the turning Earth (Surface) or in the frame that does not turn (Orbit)"><kbd>O</kbd> <b data-cell="mode"></b></button>
        <p class="navball-speed" title="Speed in that frame"><b data-cell="speed">0</b><i>m/s</i></p>
        <p class="navball-att"><span title="Where the nose points, degrees from north">HDG <b data-cell="heading">–</b></span><span title="The nose above the level">PIT <b data-cell="pitch">–</b></span><span title="Roll: positive is right side down">ROL <b data-cell="roll">–</b></span></p>
      </div>
      <div class="navball-ball" role="img" aria-label="Attitude ball">
        <canvas></canvas>
        ${(Object.keys(MARKS) as Mark[]).map(mark).join('')}
        <i class="nav-nose" title="The nose: where the vehicle points">${SVG('<path d="M3 12h9M28 12h9M12 12l8 7 8-7"/><circle cx="20" cy="12" r="1.1" fill="currentColor"/>', '0 0 40 24')}</i>
      </div>
      <div class="navball-side navball-aside"></div>`;
    parent.append(root);
    this.canvas = root.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d');
    this.aside = root.querySelector('.navball-aside')!;
    for (const el of root.querySelectorAll<HTMLElement>('[data-cell]')) this.cells.set(el.dataset.cell!, el);
    for (const el of root.querySelectorAll<HTMLElement>('[data-mark]')) this.marks.set(el.dataset.mark as Mark, el);
    root.addEventListener('click', (e) => {
      const what = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]')?.dataset.nav;
      if (what === 'tuck') this.tuck(!this.tucked);
      if (what === 'mode') this.setFrame(this.mode === 'surface' ? 'orbit' : 'surface');
    });
    button?.addEventListener('click', () => this.tuck(!this.tucked));
    this.button = button ?? null;
    window.addEventListener('keydown', (e) => {
      const typing = (e.target as HTMLElement).matches?.('input:not([type=range]), textarea');
      if (!source.active || e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing) return;
      const key = e.key.toLowerCase();
      if (key === 'i') this.tuck(!this.tucked);
      if (key === 'o') this.setFrame(this.mode === 'surface' ? 'orbit' : 'surface');
    });
    new ResizeObserver(() => this.draw(true)).observe(this.canvas);
    source.listen((s) => {
      this.last = s;
      this.draw(false);
    });
    this.tuck(this.tucked, false);
    this.setFrame(this.mode, false);
  }

  private readonly button: HTMLElement | null;

  /** Surface or Orbit: which velocity the markers and the speed are of. */
  get frame(): Frame {
    return this.mode;
  }

  /** Told whenever the frame is changed, and once at the start. */
  onFrame(fn: (frame: Frame) => void): void {
    this.watchers.push(fn);
    fn(this.mode);
  }

  setFrame(frame: Frame, remember = true): void {
    this.mode = frame;
    if (remember) prefs.set('orbitFrame', frame === 'orbit');
    this.root.classList.toggle('orbit', frame === 'orbit');
    this.cells.get('mode')!.textContent = frame === 'orbit' ? 'Orbit' : 'Surface';
    for (const fn of this.watchers) fn(frame);
    this.draw(true);
  }

  /** Tuck the ball away (to its chevron), or bring it back. Remembered. */
  tuck(on: boolean, remember = true): void {
    this.tucked = on;
    if (remember) prefs.set('navballTucked', on);
    this.root.classList.toggle('tucked', on);
    this.root.querySelector('.navball-tuck')!.setAttribute('aria-expanded', String(!on));
    this.button?.setAttribute('aria-pressed', String(!on));
    if (!on) this.draw(true);
  }

  /** Draw the sample last given, if it would look any different. Nothing is worked out while the ball is away. */
  private draw(force: boolean): void {
    const s = this.last;
    if (!s || this.tucked || !this.source.active) return;
    const ball = ballOf(s.centre ?? s.r, s.v, s.attitude, s.t, this.target(s));
    const side = this.mode === 'orbit' ? ball.orbit : ball.surface;
    const set = (id: string, text: string) => {
      const el = this.cells.get(id)!;
      if (el.textContent !== text) el.textContent = text;
    };
    set('speed', side.speed.toFixed(0));
    set('heading', `${(Math.round(ball.heading) % 360).toString().padStart(3, '0')}°`);
    set('pitch', `${ball.pitch.toFixed(0)}°`);
    set('roll', `${ball.roll.toFixed(0)}°`);

    const css = this.canvas.clientWidth;
    if (!css) return;
    const R = css / 2;
    const place = (id: Mark, at: OnBall | null): void => {
      const el = this.marks.get(id)!;
      // a marker on the half behind is not shown: its opposite is on this one
      const seen = at !== null && at[2] > 0.02;
      if (el.hidden === seen) el.hidden = !seen;
      if (!seen || !at) return;
      const k = R * 0.94;
      el.style.transform = `translate(${(R + at[0] * k).toFixed(1)}px, ${(R - at[1] * k).toFixed(1)}px)`;
      el.style.opacity = Math.min(1, 0.35 + at[2] * 2).toFixed(2);
    };
    const orbit = this.mode === 'orbit';
    place('prograde', side.prograde);
    place('retrograde', side.retrograde);
    place('radialOut', orbit ? ball.orbit.radialOut : null);
    place('radialIn', orbit ? ball.orbit.radialIn : null);
    place('normal', orbit ? ball.orbit.normal : null);
    place('antinormal', orbit ? ball.orbit.antinormal : null);
    place('target', ball.target);

    // the ball itself: only if it has turned by a twentieth of a degree, or changed size
    const now = [...ball.north, ...ball.east, ...ball.zenith];
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const px = Math.round(css * dpr);
    if (!force && px === this.size && this.drawn.length && now.every((x, i) => Math.abs(x - this.drawn[i]!) < 9e-4)) return;
    this.drawn = now;
    this.size = px;
    if (this.canvas.width !== px) this.canvas.width = this.canvas.height = px;
    if (this.ctx) paint(this.ctx, ball, px, dpr);
  }
}

/** Paint the ball on a square canvas `px` across: the sphere of directions, drawn straight on (orthographic), the nose at the middle. */
function paint(ctx: CanvasRenderingContext2D, ball: Ball, px: number, dpr: number): void {
  const c = px / 2;
  const R = c - dpr;
  const x = (p: OnBall): number => c + p[0] * R;
  const y = (p: OnBall): number => c - p[1] * R;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, px, px);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, R, 0, 2 * Math.PI);
  ctx.clip();

  // the sky, and over it the ground: the half of the disc on the nadir's side of the horizon, which is seen as half an ellipse
  const nadir = scale(ball.zenith, -1);
  ctx.fillStyle = nadir[2] > 0.99999 ? GROUND : SKY;
  ctx.fillRect(0, 0, px, px);
  const flat = Math.hypot(nadir[0], nadir[1]);
  if (flat > 1e-5 && Math.abs(nadir[2]) <= 0.99999) {
    // the horizon meets the disc's edge at two opposite points: `e` is one; `m` is the horizon's nearest point to the eye
    const e: Vec3 = [-nadir[1] / flat, nadir[0] / flat, 0];
    let m = cross(nadir, e);
    if (m[2] < 0) m = scale(m, -1);
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (Math.PI * i) / 48;
      const p: OnBall = [e[0] * Math.cos(a) + m[0] * Math.sin(a), e[1] * Math.cos(a) + m[1] * Math.sin(a), 0];
      if (i === 0) ctx.moveTo(x(p), y(p));
      else ctx.lineTo(x(p), y(p));
    }
    // back round the edge, through the point of it nearest the nadir (in the canvas's angles, y is down)
    const from = Math.atan2(e[1], -e[0]);
    const through = Math.atan2(-nadir[1], nadir[0]);
    const ahead = (((through - from) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) < Math.PI;
    ctx.arc(c, c, R * 1.02, from, from + Math.PI, !ahead);
    ctx.closePath();
    ctx.fillStyle = GROUND;
    ctx.fill();
  }

  /** A line on the sphere, through points at these bearings and elevations: only the part on the near half is drawn. */
  const line = (points: OnBall[], width: number, alpha: number): void => {
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      if (p[2] <= 0) {
        pen = false;
        continue;
      }
      if (pen) ctx.lineTo(x(p), y(p));
      else ctx.moveTo(x(p), y(p));
      pen = true;
    }
    ctx.lineWidth = width * dpr;
    ctx.strokeStyle = INK;
    ctx.globalAlpha = alpha;
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  const ring = (elevation: number, step = 4): OnBall[] => {
    const out: OnBall[] = [];
    for (let b = 0; b <= 360; b += step) out.push(ballPoint(ball, b * DEG, elevation * DEG));
    return out;
  };
  // the ladder: a ring every 10 degrees, the 30s and 60s stronger; a meridian every 30 degrees; the horizon
  for (let el = -80; el <= 80; el += 10)
    if (el !== 0) line(ring(el, el % 30 === 0 ? 4 : 6), el % 30 === 0 ? 1 : 0.75, el % 30 === 0 ? 0.6 : 0.34);
  for (let b = 0; b < 360; b += 30) {
    const out: OnBall[] = [];
    for (let el = -80; el <= 80; el += 4) out.push(ballPoint(ball, b * DEG, el * DEG));
    line(out, b % 90 === 0 ? 1 : 0.75, b % 90 === 0 ? 0.6 : 0.34);
  }
  line(ring(0, 3), 2, 1);

  /** Words on the sphere: upright along the meridian there, fading toward the edge. */
  const text = (words: string, bearing: number, elevation: number, size: number, weight: number): void => {
    const p = ballPoint(ball, bearing * DEG, elevation * DEG);
    if (p[2] < 0.22) return;
    const above = ballPoint(ball, bearing * DEG, (elevation + 1) * DEG);
    ctx.save();
    ctx.translate(x(p), y(p));
    ctx.rotate(Math.atan2(above[0] - p[0], above[1] - p[1]));
    ctx.globalAlpha = Math.min(1, (p[2] - 0.22) * 3.2);
    ctx.font = `${weight} ${(size * dpr).toFixed(1)}px ui-monospace, 'SF Mono', Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2.5 * dpr;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.strokeText(words, 0, 0);
    ctx.fillStyle = INK;
    ctx.fillText(words, 0, 0);
    ctx.restore();
  };
  const small = Math.max(7.5, (px / dpr) * 0.058);
  // numerals on the ladder, between the meridians; near the poles, where the rings are small, on two sides only
  for (let el = 10; el <= 80; el += 10) {
    for (const b of Math.abs(el) >= 70 ? [45, 225] : [45, 135, 225, 315]) {
      text(String(el), b, el, small, 500);
      text(String(-el), b, -el, small, 500);
    }
  }
  // the compass along the horizon, standing on the line
  POINTS.forEach((p, i) => text(p, i * 30, 4.6, i % 3 === 0 ? small * 1.25 : small, i % 3 === 0 ? 700 : 500));
  // the zenith and the nadir
  for (const pole of [ball.zenith, nadir]) {
    if (pole[2] <= 0) continue;
    ctx.beginPath();
    ctx.arc(x(pole), y(pole), 2.2 * dpr, 0, 2 * Math.PI);
    ctx.fillStyle = INK;
    ctx.fill();
  }

  // a sphere, not a disc: darker toward the edge
  const shade = ctx.createRadialGradient(c - R * 0.15, c - R * 0.2, R * 0.2, c, c, R);
  shade.addColorStop(0, 'rgba(255, 255, 255, 0.07)');
  shade.addColorStop(0.62, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, px, px);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(c, c, R, 0, 2 * Math.PI);
  ctx.lineWidth = dpr;
  ctx.strokeStyle = 'rgba(243, 239, 230, 0.35)';
  ctx.stroke();
}
