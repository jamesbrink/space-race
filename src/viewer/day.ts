/**
 * A day's weather as the viewer draws it: a flight's record (types.ts: DayWeather) turned once into the numbers the
 * air (air.ts), the clouds (clouds.ts), the weather's map (weather.ts) and the light (backdrops.ts) take. Nothing
 * here is a figure of the record's: those are in the flight's `weather`, each with its confidence and source. What is
 * here is how a layer of the record becomes a layer drawn, and each such rule is stated where it is.
 *
 * A day is a place's setting's (backdrops.ts: one setting for each pad and day, its air and its weather's map held by
 * it), so what is compiled into a shader from a day is compiled once for that setting, and another day on the same
 * stage is built again under its own text (programs.ts).
 *
 * No three.js here: tools/globe-weather.mjs and the tests run it.
 */
import type { DayWeather, SiteDef } from '../types.ts';
import { aloftAt, hourAt } from '../world/aloft.ts';
import { DEG } from '../world/frames.ts';
import { julianDate } from '../world/time.ts';

/** The cumulus as air.ts takes them (its `Clouds`): bases and depth in metres, cover 0 to 1, a cloud's breadth, the wind toward (the scene's x and z), m/s. */
export interface Cumulus {
  height: number;
  depth: number;
  cover: number;
  size: number;
  wind: [number, number];
}

export interface Day {
  /** The low cloud, or none. */
  cumulus: Cumulus | null;
  /** The middle deck round the site: how much of the sky its patches cover (not its cloud: `deckPatches`), and its height above the sea, metres. */
  deck: { cover: number; height: number };
  /**
   * The high cloud. `cover`: how much of the sky it hides at the site, or null where the record has none there and
   * the map's own stands; `height`: metres above the sea; `veil`: it is a sheet (cirrostratus), not fibres (cirrus);
   * `depth`: its optical depth looked straight up through, where it covers; `toward`: the bearing the wind at its height
   * blows toward, radians from north, which its fibres and streaks lie along (`highToward`).
   */
  high: { cover: number | null; height: number; veil: boolean; depth: number; toward: number };
  /** How far the eye sees at the ground, metres, and the height over which the haze thins by e. */
  visibility: number;
  haze: number;
  /** The wind at the ground: the bearing it blows toward, radians clockwise from north, and its speed, m/s. */
  wind: { toward: number; speed: number };
  /** The bearing the low cloud's wind blows toward, radians from north: the map's streets lie along it (weather.ts). */
  drift: number;
  /** What the record says of the sky away from the site (the map paints it: weather.ts). */
  beyond: NonNullable<DayWeather['beyond']>;
  /** How many days after the first map's day (5 May 1961) this is: the estimated part of each day's map is taken from another part of the same noise. */
  apart: number;
  /** The stem of the day's baked map under public/globe/ (`<region>.<date>`), or null: the site has no region, or the day is the site's own default. */
  map: string | null;
  /** The day itself, 'YYYY-MM-DD' (UTC): the land's season is read from it (missions/ussr/places/tyuratam/steppe.ts `seasonOf`). */
  date: string;
}

/**
 * Where the map's own decks and high cloud lie when the record has none at the site, metres above the sea: altocumulus
 * at 3,600 m (as Patrick had it on 5 May 1961) and cirrus at 10,500 m. Estimated: the map is (weather.ts).
 */
export const DECK_HEIGHT = 3600;
export const HIGH_HEIGHT = 10_500;

/**
 * The bearing the wind blows toward at the high cloud's height, radians from north: the day's column's (`DayWeather.aloft`,
 * world/aloft.ts) where it reaches that height and gives a wind there; else from the west-south-west, toward 070, as
 * the upper westerlies are over Florida in May and over the Syr Darya in April on the whole (estimated: the way the high
 * cloud's fibres were first drawn).
 */
export function highToward(w: DayWeather, height: number): number {
  const wind = w.aloft && aloftAt(w.aloft, height)?.wind;
  return wind && Math.hypot(wind[0], wind[1]) > 0 ? Math.atan2(wind[0], wind[1]) : 70 * DEG;
}

/**
 * How much of the sky the middle deck's patches must cover for its cloud to cover each share of it: the cloudlets
 * cover 0.45 of a thin patch and 0.9 of a thick one, and from 0.62 of patches the deck is going over to a solid sheet
 * (weather.ts: deckFill, deckAt). [patches, cloud], measured with a JS copy of deckPatch and deckFill over 200,000
 * points of a square 120 km across (the cloud's share of a patch below 0.75, its opacity from there). Measure again
 * after changing either.
 */
const DECK_SHARE: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.1, 0.037],
  [0.2, 0.08],
  [0.3, 0.126],
  [0.4, 0.213],
  [0.45, 0.287],
  [0.5, 0.369],
  [0.55, 0.446],
  [0.6, 0.51],
  [0.65, 0.563],
  [0.7, 0.61],
  [0.75, 0.659],
  [0.8, 0.733],
  [0.85, 0.805],
  [0.9, 0.868],
  [0.95, 0.944],
  [1, 0.98],
];

/**
 * The cover of the deck's patches whose cloud covers `share` of the sky: DECK_SHARE read the other way, to a
 * hundredth (the measure is good to no better). One okta of altocumulus is patches over 0.30 of the sky.
 */
export function deckPatches(share: number): number {
  if (share <= 0) return 0;
  for (let i = 1; i < DECK_SHARE.length; i++) {
    const [p0, s0] = DECK_SHARE[i - 1]!;
    const [p1, s1] = DECK_SHARE[i]!;
    if (share <= s1) return Math.round((p0 + ((p1 - p0) * (share - s0)) / (s1 - s0)) * 100) / 100;
  }
  return 1;
}

/** A wind from a bearing (degrees) at a speed, as the way it blows toward: east and north parts. Parts under a millionth of a millimetre a second are nothing. */
const blowing = (from: number, speed: number): [number, number] => {
  const toward = (from + 180) * DEG;
  const tidy = (v: number) => Math.round(v * 1e12) / 1e12 || 0;
  return [tidy(speed * Math.sin(toward)), tidy(speed * Math.cos(toward))];
};

/** A clear, still day: what a flight with no record at a site with none of its own is shown under. Estimated, all of it. */
const CLEAR: DayWeather = {
  observed: { where: 'nowhere', at: '', source: 'no record of the day has been read: a clear sky is assumed' },
  wind: {
    from: { value: 0, confidence: 'estimated', source: 'not recorded: calm assumed' },
    speed: { value: 0, confidence: 'estimated', source: 'not recorded: calm assumed' },
  },
  visibility: { value: 60_000, confidence: 'estimated', source: 'not recorded: clear air assumed' },
  haze: { value: 1500, confidence: 'estimated', source: 'not recorded' },
};

const DAY_MS = 86_400_000;
/** The day the first map was made for: Freedom 7's. */
const FIRST = Date.UTC(1961, 4, 5);

/** The weather a flight is shown under: its own, else its place's, else a clear sky. */
export const weatherOf = (when: { site: SiteDef; weather?: DayWeather }): DayWeather => when.weather ?? when.site.place.weather ?? CLEAR;

/** The day as the viewer draws it, for a flight's site, launch and weather. */
export function dayOf(when: { site: SiteDef; launch: string; weather?: DayWeather }): Day {
  const w = weatherOf(when);
  const bearing = when.site.bearingX.value * DEG;
  const low = w.low;
  let cumulus: Cumulus | null = null;
  let drift = (w.wind.from.value + 180) * DEG;
  if (low) {
    const [e, n] = blowing(low.wind.from.value, low.wind.speed.value);
    drift = (low.wind.from.value + 180) * DEG;
    cumulus = {
      height: low.base.value,
      depth: low.depth.value,
      cover: low.cover.value,
      size: low.size.value,
      // east and north to the scene's x and z (frames.ts: enuToSite; weather.ts: toScene)
      wind: [e * Math.sin(bearing) + n * Math.cos(bearing), e * Math.cos(bearing) - n * Math.sin(bearing)],
    };
  }
  const date = when.launch.slice(0, 10);
  const region = when.site.place.region?.name;
  return {
    cumulus,
    deck: { cover: w.middle ? deckPatches(w.middle.cover.value) : 0, height: w.middle?.base.value ?? DECK_HEIGHT },
    high: {
      cover: w.high ? w.high.cover.value : null,
      height: w.high?.base.value ?? HIGH_HEIGHT,
      veil: w.high?.kind === 'cirrostratus',
      depth: w.high?.depth.value ?? 0,
      toward: highToward(w, w.high?.base.value ?? HIGH_HEIGHT),
    },
    visibility: w.visibility.value,
    haze: w.haze.value,
    wind: { toward: (w.wind.from.value + 180) * DEG, speed: w.wind.speed.value },
    drift,
    beyond: w.beyond ?? [],
    apart: Math.round((Date.parse(`${date}T00:00:00Z`) - FIRST) / DAY_MS),
    // (the day's own map only for a day of the flight's own: a site's default has none, and its cover stands everywhere)
    map: region && when.weather ? `${region}.${date}` : null,
    date,
  };
}

/**
 * The wind at the ground as the plants take it (flora.ts: the bearing it blows toward, and a strength that is 1 for
 * the breeze their sway was drawn in, the 10 knots of 5 May 1961), up to twice that.
 */
export const breeze = (day: Pick<Day, 'wind'>): { toward: number; strength: number } => ({
  toward: day.wind.toward,
  strength: Math.min(2, day.wind.speed / 5.1),
});

/** The wind at an instant of the day, as drawn (`windsOf`). */
export interface Blowing {
  /** At the ground: the bearing it blows toward, radians clockwise from north, and its speed, m/s (as `Day.wind`). */
  wind: { toward: number; speed: number };
  /** The low cloud's, toward (the scene's x and z), m/s (as `Cumulus.wind`); null on a day with no low cloud. */
  cloud: [number, number] | null;
  /** Outside the recorded hours the hour nearest is held: which side of them the instant is; null within them, or on a day with none. */
  held: 'before' | 'after' | null;
}

const UNIX_EPOCH = 2_440_587.5;

/**
 * The wind through the day as drawn, at a Julian date (UT, the clock's `jdUT`). The record's wind is for the hour of
 * liftoff (`DayWeather.wind`, and the low cloud's `low.wind`); the surface's hours (`DayWeather.hours`, ERA5's 10 m wind
 * between the four cells round the pad, world/aloft.ts `hourAt`, straight between the hours) say how it changed
 * through the day. Their own figure is a quarter-degree cell's, not the station's: at Freedom 7's liftoff ERA5 had
 * 3.7 m/s from 099 where the Skid Strip had 5.1 from 090, and at Vostok 1's 3.6 from 235 where Tyuratam had 2.1 from
 * 140. So it is their change that is taken, not their value: the hours' wind is turned and scaled once, by what turns
 * and scales theirs at liftoff into the record's, and the wind drawn at any instant is theirs then, so turned and
 * scaled. The record's wind turns as theirs turns and strengthens as theirs strengthens; at liftoff it is the record's
 * exactly, and it follows the clock with no step (it is the hours, straight between them, times one number). Where the
 * hours were all but calm at liftoff (under 1 m/s), that would multiply their every gust, so their change is added
 * instead. Outside the hours the nearest is held, and `held` says so. The low cloud's wind is turned and scaled alike
 * (estimated: the hours are at 10 m, the bases hundreds of metres up). The hours give no cloud, so the cover is the
 * record's all day. Derived from the hours; `Day.wind` and `Cumulus.wind` are the liftoff hour's.
 */
export function windsOf(when: { site: SiteDef; launch: string; weather?: DayWeather }, day: Day): (jdUT: number) => Blowing {
  const w = weatherOf(when);
  const hours = w.hours ?? [];
  const times = hours.map((h) => Date.parse(h.at));
  const first = Math.min(...times);
  const last = Math.max(...times);
  // (the instant as the clock has it: its epoch is the launch as a Julian date, so at T-0 this is the same number twice)
  const msOf = (jd: number): number => Math.min(last, Math.max(first, (jd - UNIX_EPOCH) * DAY_MS));
  const zero = hours.length ? hourAt(hours, msOf(julianDate(when.launch)))?.wind : null;
  const record = { wind: day.wind, cloud: day.cumulus?.wind ?? null };
  if (!zero) return () => ({ ...record, held: null });
  const bearing = when.site.bearingX.value * DEG;
  const ground = blowing(w.wind.from.value, w.wind.speed.value);
  const low = w.low ? blowing(w.low.wind.from.value, w.low.wind.speed.value) : null;
  // what takes the hours' wind at liftoff to the record's, as a complex number (east the real part, north the imaginary)
  const calm = Math.hypot(zero[0], zero[1]) < 1;
  const turn = (to: readonly [number, number]): [number, number] => {
    const h = zero[0] * zero[0] + zero[1] * zero[1];
    return [(to[0] * zero[0] + to[1] * zero[1]) / h, (to[1] * zero[0] - to[0] * zero[1]) / h];
  };
  const groundTurn = calm ? null : turn(ground);
  const lowTurn = calm || !low ? null : turn(low);
  const drawn = (now: readonly [number, number], k: [number, number] | null, own: readonly [number, number]): [number, number] =>
    k ? [k[0] * now[0] - k[1] * now[1], k[0] * now[1] + k[1] * now[0]] : [own[0] + now[0] - zero[0], own[1] + now[1] - zero[1]];
  return (jdUT) => {
    const ms = (jdUT - UNIX_EPOCH) * DAY_MS;
    const held = ms < first ? 'before' : ms > last ? 'after' : null;
    const now = hourAt(hours, msOf(jdUT))?.wind ?? zero;
    if (now[0] === zero[0] && now[1] === zero[1]) return { ...record, held };
    const [e, n] = drawn(now, groundTurn, ground);
    const cloud = low && drawn(now, lowTurn, low);
    return {
      wind: { toward: Math.atan2(e, n), speed: Math.hypot(e, n) },
      // (east and north to the scene's x and z, as `dayOf` turns the cloud's)
      cloud: cloud && [
        cloud[0] * Math.sin(bearing) + cloud[1] * Math.cos(bearing),
        cloud[0] * Math.cos(bearing) - cloud[1] * Math.sin(bearing),
      ],
      held,
    };
  };
}

/**
 * How far from a station its report of a layer is taken to hold, metres: an observer judges how much of the sky is
 * covered down to some ten degrees over the horizon (lower, every layer runs together and into the haze), so a layer
 * `height` metres up is spoken for out to its height over the tangent of that, and the report gives way to the map
 * over half as far again. [held to, given up by]. Estimated: the ten degrees are. For a veil 10.5 km up, 60 and 90 km.
 */
export const reportReach = (height: number): [number, number] => {
  const seen = height / Math.tan(10 * DEG);
  return [seen, 1.5 * seen];
};

/**
 * What the high cloud does to the Sun's light under it. Ice crystals send most of what they scatter on within a
 * degree or two of the beam (diffraction: about half of it), and that light still casts a shadow; so the beam that
 * lights the ground and throws shadows is dimmed as by half the layer's optical depth (the delta scaling of
 * radiative transfer), along the slant the Sun's light takes through it. `mu`: the sine of the Sun's height, held
 * to 0.08 (the layer is on a curved Earth: the slant does not go to infinity). Estimated, and the same rule on
 * the site's ground (air.ts), the far cloud (clouds.ts) and the globe (globe.ts): `veilShadeGlsl`.
 */
export const VEIL_FORWARD = 0.5;
export const veilShade = (depth: number, cover: number, mu: number): number =>
  Math.exp((-(1 - VEIL_FORWARD) * depth * cover) / Math.max(mu, 0.08));

/**
 * And what becomes of the light it takes from the beam: thin ice cloud absorbs almost nothing, and sends most of
 * what it scatters on downward, so most of it reaches the ground as the sky's own light, from the whole veil. That
 * share, estimated (the rest goes back up, which is why the veil is white from above).
 */
export const VEIL_DOWN = 0.75;
