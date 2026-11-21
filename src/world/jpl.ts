/**
 * JPL's DE440 as baked (tools/ephemeris-bake.mjs: public/ephemeris/de440.bin, 1957 to 2035): Chebyshev segments for the
 * Moon from the Earth's centre, the Earth-Moon barycentre, the Sun and each planet's system from the solar system's
 * barycentre, each fitted to the JPL kernel to the accuracy its header records (the Moon within 6 m and 0.08 mm/s, the
 * Sun and the Earth-Moon barycentre within 0.4 km, the planets within 5 km). Pure: it is handed the file's bytes and
 * answers positions and velocities, metres and metres a second, in the ICRF (frames.ts's J2000), argued in TDB Julian
 * dates (time.ts `barycentricTime`). Nothing here fetches: ephemeris.ts does, when something asks for it.
 */
import type { Vec3 } from './frames.ts';

/**
 * What the baked file holds, by id. The planets are their systems' barycentres: within the size of their moons' orbits of
 * the planet. `moonpa` is not a place: its three figures are the Euler angles (3-1-3, radians, and radians a second)
 * that take the ICRF to the Moon's principal axes, DE440's own integration of its turning with its physical librations
 * (world/moon.ts `principalAxes`); a file baked before they were added has none.
 */
export type Series =
  | 'moon'
  | 'emb'
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'moonpa';

interface SeriesHeader {
  id: Series;
  what: string;
  /** The first segment's start, a TDB Julian date. */
  start: number;
  days: number;
  degree: number;
  /** How many of each coordinate's coefficients are kept as doubles; the rest are singles. */
  doubled: number;
  count: number;
  /** Where its coefficients begin among the doubles and among the singles. */
  wide: number;
  narrow: number;
  /** The worst disagreement with DE440 the bake measured: metres, metres a second. */
  accuracy: { position: number; velocity: number };
}

interface Header {
  source: string;
  frame: string;
  /** The Earth's mass over the Moon's, DE440's. */
  emrat: number;
  /** The span baked, TDB Julian dates. */
  from: number;
  to: number;
  series: SeriesHeader[];
  doubles: number;
  singles: number;
}

/** A state: position and velocity, m and m/s. */
export interface State {
  r: Vec3;
  v: Vec3;
}

export interface Ephemeris {
  readonly source: string;
  readonly emrat: number;
  /** The span it covers, TDB Julian dates. */
  readonly from: number;
  readonly to: number;
  /** Each series's measured accuracy against DE440. */
  accuracy(id: Series): { position: number; velocity: number };
  /**
   * A series's state at a TDB Julian date, ICRF: undefined outside the span. `plus`: days on from that date, for an
   * instant kept in two parts (a Julian date in one double steps by 40 microseconds, which is 4 cm of the Moon).
   */
  state(id: Series, jdTDB: number, plus?: number): State | undefined;
}

const DAY = 86_400;

/** The baked file read: its header checked and its coefficients laid over the bytes. */
export function readEphemeris(bytes: ArrayBuffer): Ephemeris {
  const view = new DataView(bytes);
  const magic = new TextDecoder().decode(new Uint8Array(bytes, 0, 8));
  if (magic !== 'SRDE440\0') throw new Error('not a baked DE440 ephemeris (tools/ephemeris-bake.mjs)');
  const length = view.getUint32(8, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 12, length))) as Header;
  const wide = new Float64Array(bytes, 12 + length, header.doubles);
  const narrow = new Float32Array(bytes, 12 + length + header.doubles * 8, header.singles);
  const byId = new Map(header.series.map((s) => [s.id, s]));
  // (the polynomials and their derivatives, made once for the highest degree)
  const most = Math.max(...header.series.map((s) => s.degree));
  const T = new Float64Array(most + 1);
  const D = new Float64Array(most + 1);

  const state = (id: Series, jd: number, plus = 0): State | undefined => {
    const s = byId.get(id);
    if (!s || !(jd + plus >= s.start) || !(jd + plus <= header.to)) return undefined;
    const i = Math.min(s.count - 1, Math.floor((jd - s.start + plus) / s.days));
    const x = (2 * (jd - (s.start + i * s.days) + plus)) / s.days - 1;
    const n = s.degree;
    T[0] = 1;
    T[1] = x;
    D[0] = 0;
    D[1] = 1;
    for (let k = 2; k <= n; k++) {
      T[k] = 2 * x * T[k - 1]! - T[k - 2]!;
      D[k] = 2 * T[k - 1]! + 2 * x * D[k - 1]! - D[k - 2]!;
    }
    const scale = 2 / (s.days * DAY);
    const r = [0, 0, 0];
    const v = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const row = i * 3 + c;
      const a = s.wide + row * s.doubled;
      const b = s.narrow + row * (n + 1 - s.doubled);
      let p = 0;
      let q = 0;
      // (smallest first)
      for (let k = n; k >= s.doubled; k--) {
        const coefficient = narrow[b + k - s.doubled]!;
        p += coefficient * T[k]!;
        q += coefficient * D[k]!;
      }
      for (let k = s.doubled - 1; k >= 0; k--) {
        const coefficient = wide[a + k]!;
        p += coefficient * T[k]!;
        q += coefficient * D[k]!;
      }
      r[c] = p;
      v[c] = q * scale;
    }
    return { r: r as unknown as Vec3, v: v as unknown as Vec3 };
  };

  return {
    source: header.source,
    emrat: header.emrat,
    from: header.from,
    to: header.to,
    accuracy(id) {
      const s = byId.get(id);
      if (!s) throw new Error(`no ${id} in the baked ephemeris`);
      return s.accuracy;
    },
    state,
  };
}
