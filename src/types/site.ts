/** Where a site is on the Earth, what stands round it, and the region its map is baked for. */
import type { Confidence, Measure } from '../measure.ts';
import type { Engine } from './model.ts';
import type { DayWeather } from './weather.ts';

/**
 * Where a site is on the Earth, and how its own frame lies there (src/world/frames.ts: Site). The
 * origin is the model's origin (the launcher's centre on the pad's surface); from it and the
 * launch instant the Sun, the Moon and the stars are put where they were (src/world/ephemeris.ts).
 */
export interface SiteDef {
  name: string;
  /**
   * The body it stands on, by its id in src/world/bodies.ts (`bodyOf`): the Earth unless given. Its figure is what the
   * latitude, longitude and height are on (`figureOf`), and what falls there falls by its `gravityOn`.
   */
  body?: string;
  /** The place the site is in (missions/<nation>/places/<place>/place.ts): its country, its usual sky, its quiet, its ground. */
  place: PlaceDef;
  /** Degrees north, WGS 84 (on another body, on its own figure and in its own frame: the Moon's mean Earth/polar axis). */
  latitude: Measure;
  /** Degrees east, WGS 84: negative in the Americas. */
  longitude: Measure;
  /** Metres above the WGS 84 ellipsoid, which is not sea level (on the Moon, above its sphere of 1737.4 km). */
  height: Measure;
  /** Where mean sea level is there, metres above the ellipsoid (the geoid's height: negative where the sea is below it). */
  seaLevel: Measure;
  /** The bearing of the site frame's +X, degrees clockwise from true north. +Y is up; +Z bears 90 degrees more. */
  bearingX: Measure;
  /**
   * Where the pad's model frame sits on the land: the land's height under the model's zero, metres (negative: the land is
   * under it). A hand's breadth where the pad was laid at grade (Complex 5, Site 1); the deck's height where it stands
   * up on a stand (Complex 14's 22 ft). The place's ground is laid at it (viewer/scenery/ground.ts), and the near plane,
   * the walker and the eye's height over the ground read it from there (backdrops.ts `Setting.grade`); a neighbour's
   * model is stood on the land by its own. The pad's builders take the same figure (`GROUND` in its site.py): change both together.
   */
  grade: Measure;
  /** The civil time kept there on the day: what its clocks were called, and their hours ahead of UTC (negative west of Greenwich). */
  zone: { name: string; utcOffset: number };
  /**
   * Where a rocket's exhaust goes at liftoff (viewer/trail.ts `blast`). Left out, it strikes a deflector under the stand
   * and is thrown out over the concrete all round (LC-5's). `pit`: down through an opening in the deck into a flame pit
   * and along its floor to its open side, where the cloud rises: `toward` that side's bearing, degrees true; the pit's
   * `depth` under the deck; how far from the rocket's axis the gas comes along the floor (`out`) before it can rise; and
   * the width of the slot it is held in, metres.
   */
  exhaust?: { way: 'pit'; toward: Measure; depth: Measure; out: Measure; width: Measure };
  /** When its floods were lit, and how they came up (viewer/lamps.ts `lampsLit`). Left out: `DUTY` there, every figure estimated. */
  lamps?: LampDuty;
}

/**
 * A landing site on the Moon (missions/usa/places/moon/): where its lunar module stood, as a `SiteDef` on the Moon
 * (`body: 'moon'`), and what its ground is baked from (tools/lunar-terrain.py, which reads all of it through
 * src/world/lunar-sites.json, written from these by tools/lunar-sites.mjs).
 */
export interface LunarSiteDef {
  /** Its id: the stem of its files under public/lunar/ (`<id>.terrain.bin`, `<id>.descent.bin`). */
  id: string;
  site: SiteDef;
  /** The LROC NAC stereo terrain models round the LM, by area (the PDS product NAC_DTM_<area>), each laid over those before it. */
  stereo: string[];
  /** How far east of the LM the nested grids are centred, metres: where the rover was parked at 15 to 17, the LM itself elsewhere. */
  centre: Measure;
  /** The descent's ground track at the LM: the heading it was flown on there, degrees clockwise from north. The descent strip lies along it. */
  approach: Measure;
}

/**
 * When a pad's floods are lit: switched on as the Sun goes down past `on` (its apparent elevation, degrees) and off as it
 * comes up past `off`, coming up to their light over `warm` seconds once switched on.
 */
export interface LampDuty {
  on: Measure;
  off: Measure;
  warm: Measure;
}

/**
 * A place on the Earth that holds one pad or many (Cape Canaveral, Tyuratam): what is the same for every pad in it and
 * every flight from them. Its ground, and what stands on it, the viewer draws from the place's own module beside this
 * one (ground.ts: viewer/scenery/ground.ts `GroundSpec`), placed round whichever of its pads a flight left from.
 */
export interface PlaceDef {
  /** Its folder under missions/<nation>/places/, by which the viewer finds its ground. */
  name: string;
  /** The country round it seen in its flights, which the globe draws from a finer map than its own (RegionDef). */
  region?: RegionDef;
  /**
   * The sky a flight from here stands under when it gives none of its own (`Flight.weather`): the place's usual fair
   * morning, every figure of it `estimated`. A flight's own day replaces all of it, never part.
   */
  weather?: DayWeather;
  /**
   * The place's quiet as it is heard (sound/model.ts `Place`): gains for the wind, the surf, a far hum of machinery, and
   * the water round a spacecraft that has come down. All estimated. Every place says, so that a rocket is never heard in
   * a surf that is not there.
   */
  quiet: { wind: number; surf: number; hum: number; sea: number };
  /** The frequency its mains ran at, Hz: what its far hum of machinery hums at, with its second harmonic (sound/engine.ts `humOf`). */
  mains: Measure;
  /** What a tyre runs on here (sound/model.ts `tyreVoice`): the land, and the made surfaces by their material. */
  tread: Tread;
  /** The engines of the road vehicles and locomotives that worked here, by the name a vehicle's model or a move's machine gives (types/model.ts Machine). */
  engines: Record<string, Engine>;
}

/** What a tyre or a wheel is heard running on. */
export type TreadKind = 'concrete' | 'gravel' | 'earth' | 'sand' | 'steppe' | 'steel' | 'timber';

/**
 * What a place's ground is to a tyre: the land off its made surfaces (the terrain, which is a height and has no
 * material), each made surface by the name its material has in the models (the first `prefix` its name begins with),
 * and each made surface the place paints on its land (a road, an apron, a track's bed) by the name its ground gives it
 * (viewer/scenery/ground.ts `GroundSpec.painted`, which finds it where the land's shader draws it).
 */
export interface Tread {
  land: { kind: TreadKind; confidence: Confidence; source: string };
  materials: { prefix: string; kind: TreadKind }[];
  /** What each surface the land paints is to a tyre, by its name, with how sure that is and why. */
  painted: Record<string, { kind: TreadKind; confidence: Confidence; source: string }>;
  /** How the materials were sorted. */
  source: string;
}

/**
 * When something stood as it is drawn, as ISO dates (a year or a month stands for its first day): from `from`, until
 * `until` (the day it was gone or changed); either left out where nothing says (tools/blender/sitelib.py's `stood`, the
 * same rule for what a place's models hold). A place's ground draws what stood on its flight's day
 * (viewer/scenery/ground.ts `stood`).
 */
export interface Dated {
  from?: string;
  until?: string;
}

/**
 * A `Dated` that says how sure its dates are and on what they rest: what a place draws round a pad on a flight's day
 * (missions/usa/places/cape-canaveral/scenery.ts `COMPLEXES`). Where a date is not known it is left out and the
 * confidence says what was assumed (drawn as it stood on the one day it is known for, and not known to have changed).
 */
export interface Stood extends Dated {
  confidence: Confidence;
  source: string;
}

/**
 * A model of things round a site (a path under public/, as a flight's model urls are), built in the site's frame with
 * each thing's node origin at its middle on the ground; the nodes to draw; every material it wears, by name; and when
 * it stood so. A place's ground lists them (missions/<nation>/places/<place>/ground.ts).
 */
export interface SiteAround extends Dated {
  model: string;
  nodes: string[];
  wears: string[];
}

/**
 * The country round a site, drawn on the globe from a finer coast than Natural Earth's:
 * tools/globe-region.mjs bakes it from OpenStreetMap to public/globe/<name>.*, and viewer/globe.ts
 * draws it where it covers and its own 1:10 million map elsewhere.
 */
export interface RegionDef {
  /** The stem of its files. */
  name: string;
  /** Its bounds, degrees north and east (WGS 84). */
  south: number;
  north: number;
  west: number;
  east: number;
  /** The pad its near plane is centred on (tools/globe-region.mjs): its module beside place.ts. */
  pad: string;
  /** Why these bounds: what the flights from the site see. */
  why: string;
  /** What the globe's relief and its land's colours are baked over for it (tools/globe-surface.mjs), wider than the coast's bounds above. */
  surface: RegionSurface;
  /** The date the shore is drawn as (ISO): works in `later` built after it are undone. Today's map is the shore as it stands. */
  asOf: string;
  /** What has been built since that changed the shore: each undone in the bake if built after `asOf`. */
  later: LaterWork[];
  /**
   * Rivers drawn as their channel along OpenStreetMap's middle line (waterway=river), where its water areas leave gaps:
   * `match` a pattern for the way's name, `width` the channel's, metres.
   */
  rivers?: { match: string; width: number; source: string }[];
}

/** A region's relief and colours as tools/globe-surface.mjs bakes them: on one gnomonic plane (world/region.ts). */
export interface RegionSurface {
  /** Its bounds, degrees north and east. */
  south: number;
  north: number;
  west: number;
  east: number;
  /** Where its plane touches the sphere, [latitude, longitude] degrees. */
  centre: [number, number];
  /** A texel's size, metres. */
  metres: number;
  /** Blue Marble's month its colours are of: May (the globe's own) unless said. */
  month?: 'april' | 'may';
  /** Where shallow water is turquoise over pale sand: [latitude, longitude, radius in km], each estimated. */
  banks?: [number, number, number][];
}

/**
 * A causeway filled or a channel dug: the shore as it was before, along a line. Or a change over a whole area (a sea
 * that has shrunk): what was there before, inside a closed `ring`, from a source of that time.
 */
export interface LaterWork {
  what: string;
  /** The year it was finished (for an area: the first year it was no longer as the ring has it). */
  built: number;
  /** What was there before it: water where a causeway now stands, land where a canal is now cut. */
  was: 'water' | 'land';
  /** The line it follows, [latitude, longitude] degrees, and the width put back along it, metres. */
  path?: [number, number][];
  width?: number;
  /** Or the area it was, as one closed ring of [latitude, longitude] degrees: inside it the bake puts back what `was`. */
  ring?: [number, number][];
  /** For the date, and for the line (read off OpenStreetMap unless it says otherwise). */
  source: string;
}
