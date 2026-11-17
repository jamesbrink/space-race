/** A day's weather over a site, as recorded: the wind, each layer of cloud, the visibility. */
import type { Confidence, Measure } from '../measure.ts';

/** A wind as a station reports it: the bearing it blows from, degrees clockwise from true north, and its speed, m/s. */
export interface Wind {
  from: Measure;
  speed: Measure;
}

/**
 * One layer of cloud, as an observer under it reports it. `cover` is the fraction of the sky it hides, 0 to 1 (a
 * station's okta is an eighth, and means that eighth give or take a sixteenth); `base` is metres above the station's
 * ground. `kind` is the observer's genus: the viewer draws cumulus as heaps, altocumulus as a deck of cloudlets,
 * cirrus as fibres and cirrostratus as a veil.
 */
export interface CloudLayer {
  kind: 'cumulus' | 'altocumulus' | 'cirrus' | 'cirrostratus';
  cover: Measure;
  base: Measure;
  /** What the record says of it that the figures do not: how it was coded, what else was said of it. */
  note?: string;
}

/** What a report says of the sky over a stretch of country, not over one station: "northern Florida obscured by high cirrus". */
export interface WeatherBeyond {
  /** The words of the record. */
  what: string;
  /** The country it speaks of, degrees north and east (WGS 84): our reading of the words, so `estimated` unless the record gives bounds. */
  south: number;
  north: number;
  west: number;
  east: number;
  /** How much of the sky there the high cloud hides, and the low: either left out where the record says nothing of it. */
  high?: Measure;
  low?: Measure;
  confidence: Confidence;
  source: string;
}

/**
 * The weather a flight stood under: what was observed at or nearest its site at the hour nearest its liftoff, layer by
 * layer, each figure with its confidence and source like any other (`documented`: station, hour and document;
 * `derived`: how; `estimated`: says so). The viewer draws the sky from this (viewer/day.ts) and nothing else: a layer
 * left out is a layer the record does not have, and no cumulus and no deck are drawn at the site without one. What lay
 * beyond the station's own sky is estimated (viewer/weather.ts), except where `beyond` has the record's word for it.
 */
export interface DayWeather {
  /** The observation the documented figures are documented for: where, and when (ISO 8601, UTC). */
  observed: { where: string; at: string; source: string };
  /**
   * The low cloud: cumulus. `depth`: how far the tallest tops stand over the bases, metres; `size`: across a cloud,
   * metres; `wind`: what the layer drifts on, which is the wind at its own height.
   */
  low?: CloudLayer & { depth: Measure; size: Measure; wind: Wind };
  /** The middle deck: altocumulus. */
  middle?: CloudLayer;
  /**
   * The high cloud. `depth`: its optical depth looked straight up through (as the classes of Sassen and Cho, 1992, are
   * commonly quoted: to 0.3 thin cirrus, to 3 cirrostratus the Sun's disc still shows through). A station does not
   * measure it, so it is `estimated`, within what the report implies (a thin layer: no ceiling). Left out: no high
   * cloud is recorded at the site, and what the map's own estimate has there stands.
   */
  high?: CloudLayer & { depth: Measure };
  /** The wind at the surface. */
  wind: Wind;
  /** How far the eye sees along the ground, metres. A station reports it up to a limit: past the limit it is estimated, and says so. */
  visibility: Measure;
  /** The height over which the haze thins by e, metres (viewer/air.ts). */
  haze: Measure;
  /** What the record says of the sky away from the station. */
  beyond?: WeatherBeyond[];
  /**
   * The air over the site at the hour, from the ground up: a sounding's levels where the record has one (`documented`),
   * else ERA5's at the hour nearest liftoff (tools/era5-aloft.mjs: `derived`). world/aloft.ts reads it at any height
   * between its lowest level and its top; outside that, and where there is none, the air is the standard atmosphere's.
   */
  aloft?: Aloft;
  /** The weather at the surface hour by hour round liftoff, earliest first: what changed through the count. */
  hours?: WeatherHour[];
  /** The sea where it came down (sim/sea.ts): what a body afloat there rises and falls on. Left out, a calm sea. */
  sea?: SeaState;
}

/** The air at one height over a site: a level of a sounding, or of a reanalysis. */
export interface AloftLevel {
  /** Pa. */
  pressure: Measure;
  /** Metres above mean sea level, geometric. */
  height: Measure;
  /** Kelvin. */
  temperature: Measure;
  /** The wind there; left out where the record does not give it. */
  wind?: Wind;
}

/** A column of air over a site: where and when it was observed or worked out, and its levels from the lowest up. */
export interface Aloft {
  observed: { where: string; at: string; source: string };
  levels: AloftLevel[];
}

/** The surface's weather at one hour (ISO 8601, UTC): the wind at 10 m, the air's temperature at 2 m (K), the pressure at the ground (Pa). */
export interface WeatherHour {
  at: string;
  wind?: Wind;
  temperature?: Measure;
  pressure?: Measure;
}

/** One train of waves: its significant height, m (crest to trough of the highest third), its period, s, and the bearing it comes from, degrees true. */
export interface WaveTrain {
  label: string;
  height: Measure;
  period: Measure;
  from: Measure;
}

/** The sea where a flight came down, at the hour nearest its landing: the swell and the waves the wind raised there. */
export interface SeaState {
  observed: { where: string; at: string; source: string };
  trains: WaveTrain[];
}
