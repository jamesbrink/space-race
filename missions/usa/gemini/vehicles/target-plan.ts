/**
 * A Gemini target's launch from Complex 14 as the simulator flies it: the Atlas SLV-3 (the Mercury-Atlas flights' Atlas,
 * vehicles/mercury-atlas-plan.ts `atlasPieces`, with its two verniers burning on alone after the sustainer) and what it
 * carried: an Agena that put itself in orbit with its own engine after a coast, or the ATDA, put in orbit by the Atlas
 * alone. Each flight's orbital.ts writes its record (`targetRecord`, from the mission report's own weights, times and
 * states) and its flight.ts flies the plan written from it (`targetPlan`). Nothing in src/ names a target.
 *
 * A target is uncrewed and stays up: its coast has no burn of the record's and nothing comes down (sim/orbital.ts
 * `shipOf`). One that never reached orbit is flown as the record had it fail, on the plan as planned for the law
 * (`FlightPlan.planned`): GATV-5002's engine shut down 0.91 s after it was started, and GATV-5004's Atlas lost control
 * of a booster chamber at 120.63 s (`Guidance.lost`). The ascent's steering is the stated law (sim/staged.ts), not the
 * Atlas's radio guidance or the Agena's own: none of their programmes was read.
 */
import { assumed, derived, doc, estimated, type Measure } from '../../../../src/measure.ts';
import type { Guidance, OrbitResults } from '../../../../src/sim/orbital.ts';
import type { BodyDef, Craft, EngineDef, EventDef, FlightPlan, JointDef, Nozzle, PlanCheck, TankDef } from '../../../../src/sim/plan.ts';
import { MA5_NOZZLES } from '../../mercury/vehicles/mercury-atlas.ts';
import type { Curve, ShedBody } from '../../../../src/types.ts';
import { orbital as friendship7 } from '../../mercury/flights/ma-6-friendship-7/orbital.ts';
import {
  type AtlasEngine,
  type AtlasRecord,
  atlasPieces,
  type Instant,
  type RecordCheck,
} from '../../mercury/vehicles/mercury-atlas-plan.ts';

const IN = 0.0254;
const FT = 0.3048;
const LB = 0.45359237;
const LBF = 4.4482216;
const NMI = 1852;

/** The Launch Systems Final Report, which every target's record leans on for the type. */
export const LSFR =
  'Gemini Program Launch Systems Final Report: Gemini/Titan Launch Vehicle, Gemini/Agena Target Vehicle, Atlas SLV-3 (Aerospace Corporation, January 1967; NTRS 19670076796)';
const GVIII = 'Gemini Program Mission Report, Gemini VIII, MSC-G-R-66-4 (April 1966)';
const SLV3A = 'Wikipedia, "Atlas SLV-3", the SLV-3A’s MA-5 engines (secondary, no primary source read)';
const XLR81 = 'Wikipedia, "XLR81", the Bell 8247 (XLR81-BA-13) of the Gemini Agena: 293 s in vacuum (secondary, no primary source read)';
const CATALOG = 'Lockheed, NASA Agena D Mission Capabilities and Restraints Catalog, LMSC-A604166-2 (8 October 1965; NTRS 19660009137)';

/** A state the report's trajectory table gives: geodetic altitude, ft; space-fixed speed, ft/s; space-fixed flight-path angle, deg. */
export interface TableState {
  altitude: number;
  speed: number;
  climb: number;
}

/** One target launch's figures as its report prints them, in the report's units, each set with where it is printed. */
export interface LaunchFigures {
  /** The Atlas and what it carried, lb, as the report's weight table has them; `payload` the target at launch with its shroud and its share of the adapter, and as it left the Atlas. */
  weights: {
    source: string;
    liftoff: number;
    beco: number;
    seco: number;
    veco?: number;
    payload: number;
    separated: number;
    inOrbit?: number;
    /** Whose they are, where they are a sister flight's (its own report gives none). */
    taken?: string;
  };
  /** The Atlas's and the target's sequence, s from liftoff. */
  times: {
    source: string;
    beco: number;
    staging: number;
    seco: number;
    veco: number;
    separation: number;
    /** The Agena's: its engine's start (90 % chamber pressure, or the gas generator's valve where that is all the record has), the shroud thrown off, the engine's cutoff. */
    ignition?: number;
    shroud?: number;
    cutoff?: number;
    /**
     * The speed the main engine is cut at, ft/s, space-fixed: the planned insertion's, which the Agena's velocity meter was set
     * to give (its own setting is a sensed increment the run's integrator does not reproduce: GATV-5003's 8,246.5 ft/s);
     * left out, it is cut at `cutoff`.
     */
    speed?: { value: number; source: string };
    /** The space-fixed speed the guidance cut the sustainer at, ft/s, where the Atlas put its payload in orbit itself (the ATDA's); left out, it is cut at `seco`. */
    secoSpeed?: { value: number; source: string };
  };
  /** The trajectory table's actual states, for the checks. */
  states: { source: string; beco?: TableState; seco?: TableState; veco?: TableState; ignition?: TableState; insertion?: TableState };
  /** The insertion's osculating elements: semi-major axis and heights, nmi; inclination, deg; period, min; true anomaly, deg; range from the pad, nmi. */
  insertion: {
    source: string;
    axis: number;
    perigee: number;
    apogee: number;
    inclination: number;
    period: number;
    anomaly: number;
    range: number;
    altitude: number;
    climb: number;
  };
  /** Where they are the type's or a sister's, whose: a figure taken from another flight's report says so here. */
  taken?: string;
  /**
   * For a target that never reached orbit: where the record has it come down, if it gives a place (the range's impact
   * prediction, its source), and the Atlas's loss of control (`Guidance.lost`) where it lost it. Its `insertion` is then the
   * planned one, flown by nothing but the law's solution (`FlightPlan.planned`).
   */
  fell?: { impact?: { latitude: number; longitude: number; tolerance: number; source: string }; lost?: Guidance['lost'] };
}

/** The record a target's plan is written from (`targetPlan`): each figure a Measure. */
export interface TargetRecord {
  liftoffMass: Measure;
  atlas: AtlasRecord;
  /** What the Atlas carried, as it left the Atlas. */
  payload: {
    id: 'agena' | 'atda';
    name: string;
    nodes: string[];
    mass: Measure;
    /** Its own engine, where it had one, the propellant it drew on, and when it was started and stopped. */
    engine?: {
      name: string;
      thrust: Measure;
      isp: Measure;
      starts: EngineDef['starts'];
      propellant: Measure;
      ignition: Measure;
      /** The record's instant of its cutoff; and the space-fixed speed it is cut at, m/s, where it is (then the instant is a check). */
      cutoff: Measure;
      speed?: Measure;
    };
    /** The nose shroud over the docking adapter, where it was thrown off. */
    shroud?: { mass: Measure; at: Measure };
    /** How it meets the air on its own (a target that fell), and in the free-molecule flow of its orbit. */
    aero: { area: Measure; drag: Curve; rarefied: Measure };
    rarefied: NonNullable<Craft['rarefied']>;
  };
  separation: { at: Measure; push: Measure };
  ascent: {
    guidance: Guidance;
    drag: { until: Measure; area: Measure; curve: Curve }[];
    steering: { authority: Measure };
    centre: Measure;
    sheds: ShedBody[];
    checks: RecordCheck[];
  };
  /** The orbit at insertion, as the report's osculating elements give it (or, for a target that never reached one, as planned). */
  orbit: { radius: Measure; perigee: Measure; apogee: Measure; inclination: Measure; period: Measure };
  injection: { at: Measure; heading: 'north'; arc: Measure; anomaly: Measure };
  /** The target in orbit, kg (or, for one that fell, as it fell). */
  mass: Measure;
  events: Instant[];
  checks: (Omit<RecordCheck, 'id'> & { id: keyof OrbitResults })[];
  /** The record as it was to be flown, for one whose flight went otherwise: what the law is solved on. */
  planned?: TargetRecord;
}

// The type's engines, as Atlas 5302's report prints them (Gemini VIII, 5.5.2.1, "TLV Engine Performance", actual): lbf at
// liftoff (the pad's air) and at booster engine cutoff (32 nautical miles up, where the air's pressure is a few pascals:
// taken as the vacuum figure)
const ENGINES = `${GVIII}, 5.5.2.1, "TLV Engine Performance" (actual)`;
const SUSTAINER = { sea: 56_100, vac: 80_100 };
const BOOSTER = { sea: 324_440, vac: 375_840 };
const VERNIERS = { sea: 1_150, vac: 1_445 };
const SUSTAINER_ISP = 308.9;

/** One engine's figures from its two thrusts (lbf) and its vacuum impulse: the sea-level impulse in the same ratio, the flow being the same. */
function atlasEngine(
  name: string,
  count: number,
  thrust: { sea: number; vac: number },
  isp: Measure,
  note: string,
  nozzle: Nozzle,
): AtlasEngine {
  return {
    name,
    nozzle,
    count,
    thrust: {
      seaLevel: doc((thrust.sea / count) * LBF, `${note}: ${thrust.sea.toLocaleString('en-US')} lbf at liftoff (${ENGINES})`),
      vacuum: doc(
        (thrust.vac / count) * LBF,
        `${note}: ${thrust.vac.toLocaleString('en-US')} lbf at booster engine cutoff, taken as vacuum (${ENGINES})`,
      ),
    },
    isp: {
      seaLevel: derived(
        (isp.value * thrust.sea) / thrust.vac,
        `the vacuum impulse in the ratio of the two thrusts, the flow being the same: ${((isp.value * thrust.sea) / thrust.vac).toFixed(1)} s`,
      ),
      vacuum: isp,
    },
  };
}

/**
 * The Agena flights' planned ascent, as Gemini VIII's report prints it (Tables 4.2-II, 4.3-V and 4.3-VI, planned), with its
 * weights: what a target that never reached orbit was to fly, and what its law is solved on (`FlightPlan.planned`), taken
 * for it where its own report gives no planned figure. Every planned GAATV went to the same 161 nautical mile circle at
 * 28.87 degrees (${LSFR}, III.D-1).
 */
export const PLANNED_GAATV: LaunchFigures = {
  weights: { source: `${GVIII}, 3.6`, liftoff: 279_387, beco: 73_565, seco: 26_815, payload: 18_097, separated: 17_686, inOrbit: 7_116 },
  times: {
    source: `${GVIII}, Table 4.2-II (planned)`,
    beco: 131.0,
    staging: 134.0,
    seco: 279.96,
    veco: 300.18,
    separation: 303.0,
    ignition: 371.88,
    shroud: 381.33,
    cutoff: 556.08,
    speed: { value: 25_367, source: `the planned insertion, 25,367 ft/s space-fixed (${GVIII}, Table 4.3-V)` },
  },
  states: { source: `${GVIII}, Table 4.3-V (planned)` },
  insertion: {
    source: `${GVIII}, Tables 4.3-V and 4.3-VI (planned)`,
    axis: 3603.3,
    perigee: 161.4,
    apogee: 166.18,
    inclination: 28.87,
    period: 90.49,
    anomaly: 4.34,
    range: 1102.6,
    altitude: 980_432,
    climb: 0.003,
  },
  taken: "(Gemini VIII's: taken for a target that never reached orbit)",
};

/** A target's record, from its report's figures. `payload` says what the Atlas carried and how it is flown. */
export function targetRecord(f: LaunchFigures, payload: 'agena' | 'atda'): TargetRecord {
  const w = f.weights;
  const t = f.times;
  const taken = f.taken ? ` ${f.taken}` : '';
  const sustainerIsp = assumed(SUSTAINER_ISP, `${SUSTAINER_ISP} s in vacuum, the MA-5 sustainer’s (${SLV3A}); the reports read give none`);
  const vernierIsp = estimated(
    SUSTAINER_ISP,
    'the sustainer’s: NOT FOUND for the verniers, fed by its pumps until its cutoff and from their own tanks after',
  );
  // (the flows the record's weights leave: what all five burned from liftoff to booster engine cutoff, less the sustainer's
  // and the verniers' at their impulse, is the booster chambers'; what fell from that cutoff to the sustainer's, less what the
  // sustainer and the verniers burned, is the booster section)
  const sustainerFlow = SUSTAINER.vac / SUSTAINER_ISP;
  const vernierFlow = VERNIERS.vac / SUSTAINER_ISP;
  const allFlow = (w.liftoff - w.beco) / t.beco;
  const boosterIsp = BOOSTER.vac / (allFlow - sustainerFlow - vernierFlow);
  const boosterSection = w.beco - w.seco - (sustainerFlow + vernierFlow) * (t.seco - t.beco);
  const veco = w.veco ?? w.seco - vernierFlow * (t.veco - t.seco);
  const tankMass = w.liftoff - boosterSection - w.separated;
  const dry = veco - w.separated;
  const weights = w.taken ? `${w.source}, ${w.taken}` : `${w.source}${taken}`;
  const weighed = w.taken ? assumed : doc;
  const times = `${t.source}${taken}`;
  const atlas: AtlasRecord = {
    booster: {
      name: 'Booster section',
      nodes: ['AtlasBoosterSection', 'AtlasBoosterEngines'],
      mass: derived(
        boosterSection * LB,
        `${boosterSection.toFixed(0)} lb: the weight at booster engine cutoff (${w.beco.toLocaleString('en-US')} lb) less that at the sustainer's (${w.seco.toLocaleString('en-US')} lb), less what the sustainer and the verniers burned between at their thrust and impulse (${weights})`,
      ),
      engine: atlasEngine(
        'Booster engines (Rocketdyne MA-5)',
        2,
        BOOSTER,
        derived(
          boosterIsp,
          `${boosterIsp.toFixed(1)} s: their vacuum thrust over the flow the record's weights leave them, what all five burned from liftoff (${w.liftoff.toLocaleString('en-US')} lb) to their cutoff (${w.beco.toLocaleString('en-US')} lb, ${weights}) less the sustainer's and the verniers' (${SLV3A} has 296.8 s)`,
        ),
        'the two chambers',
        MA5_NOZZLES.booster,
      ),
      cutoff: doc(t.beco, `booster engine cutoff (${times})`),
      separation: doc(t.staging, `booster section jettison, cutoff + 3 s (${times})`),
    },
    tank: {
      name: 'Atlas, its tank section and sustainer',
      nodes: ['AtlasTank', 'AtlasSustainer', 'AtlasVerniers', 'AtlasPods', 'AtlasTargetAdapter'],
      mass: derived(
        tankMass * LB,
        `liftoff (${w.liftoff.toLocaleString('en-US')} lb) less the booster section and the target as it left: ${tankMass.toFixed(0)} lb (${weights})`,
      ),
      dry: derived(
        dry * LB,
        `${w.veco ? `the weight at vernier engine cutoff (${w.veco.toLocaleString('en-US')} lb)` : `the weight at the sustainer's cutoff (${w.seco.toLocaleString('en-US')} lb) less what the verniers burned to theirs`} less the target as it left (${w.separated.toLocaleString('en-US')} lb): ${dry.toFixed(0)} lb, the adapter and the propellant that was never burned with it (${weights})`,
      ),
      propellant: derived(
        (tankMass - dry) * LB,
        'the tank section at liftoff less what it weighed at vernier engine cutoff: what the five engines burned, all drawn here from the one tank (the verniers’ own start tanks are not flown)',
      ),
      engine: atlasEngine('Sustainer (Rocketdyne MA-5)', 1, SUSTAINER, sustainerIsp, 'the sustainer', MA5_NOZZLES.sustainer),
      cutoff: doc(t.seco, `sustainer engine cutoff, by the guidance's command (${times})`),
      ...(t.secoSpeed ? { velocity: doc(t.secoSpeed.value * FT, t.secoSpeed.source) } : {}),
    },
    verniers: {
      engine: atlasEngine(
        'Verniers',
        2,
        VERNIERS,
        vernierIsp,
        'the two together (LMSC’s catalog has each derated to 670 lbf at sea level, which 1,150 each would contradict)',
        MA5_NOZZLES.vernier,
      ),
      cutoff: doc(t.veco, `vernier engine cutoff, by the guidance's command (${times})`),
    },
  };
  const ins = f.insertion;
  const rad = (ins.axis - (ins.perigee + ins.apogee) / 2) * NMI;
  const agena = payload === 'agena';
  const shroudMass = assumed(
    374 * LB,
    `374 lb, the standard Agena shroud’s whole drop weight (${CATALOG}, 10.1): the Gemini target’s modified A-12 shroud’s own was not read (${LSFR}, III.E-4)`,
  );
  const engine = agena && t.ignition !== undefined && t.cutoff !== undefined;
  const shrouded = agena && t.shroud !== undefined;
  const separatedMass = (w.separated - (shrouded ? shroudMass.value / LB : 0)) * LB;
  const record: TargetRecord = {
    liftoffMass: weighed(w.liftoff * LB, `${w.liftoff.toLocaleString('en-US')} lb at liftoff, the target with it (${weights})`),
    atlas,
    payload: {
      id: payload,
      name: agena ? 'Agena' : 'ATDA',
      nodes: agena
        ? [
            'AgenaTankSection',
            'AgenaForwardSection',
            'AgenaRunningLights',
            'AgenaAftSection',
            'AgenaSecondaryPropulsion',
            'AgenaEngine',
            'TargetCollar',
          ]
        : ['AtdaEquipmentSection', 'AtdaRunningLights', 'TargetCollar', 'TargetAscentShroud'],
      mass: agena
        ? derived(
            separatedMass,
            `as it left the Atlas, ${w.separated.toLocaleString('en-US')} lb with its shroud (${weights}), less the shroud`,
          )
        : derived(
            separatedMass,
            `${w.separated.toLocaleString('en-US')} lb: the ATDA's launch weight, its shroud on, which it kept (${weights}; no separation or in-orbit weight is given, the shroud not having gone)`,
          ),
      ...(engine
        ? {
            engine: {
              name: 'Main engine (Bell 8247)',
              thrust: doc(
                16_000 * LBF,
                `"turbopump-fed 16,000-pound thrust engine" (${LSFR}, p. III.C-13); "16,000 pounds in a vacuum" (${CATALOG}, 14.2.1)`,
              ),
              isp: assumed(293, `293 s, the 8247's (${XLR81})`),
              starts: {
                count: 5,
                ground: false,
                confidence: 'documented',
                source: `restarts "up to 4" for the Agena D (${CATALOG}, 14.2.1); the Gemini Agena's 8247 was fired nine times on GATV-5003 (${GVIII}, 5.4.2.1)`,
              },
              propellant: derived(
                (w.separated - shroudMass.value / LB - w.inOrbit!) * LB,
                `the Agena as it left the Atlas less its shroud and less in orbit (${weights}): an upper bound on what its ascent burned, the secondary engines' among it`,
              ),
              ignition: doc(t.ignition!, `the main engine's start (${times})`),
              cutoff: doc(t.cutoff!, `the main engine's cutoff (${times})`),
              ...(t.speed ? { speed: doc(t.speed.value * FT, t.speed.source) } : {}),
            },
          }
        : {}),
      ...(shrouded ? { shroud: { mass: shroudMass, at: doc(t.shroud!, `the nose shroud's squibs fired (${times})`) } } : {}),
      aero: {
        area: agena
          ? derived(7.95 * 1.524, 'a 7.95 m Agena 1.52 m across, side on: falling, it tumbles')
          : derived(3.73 * 1.524, 'the 3.73 m ATDA 1.52 m across, side on'),
        drag: {
          points: [
            [0, 1.0],
            [1, 1.4],
            [3, 1.2],
            [10, 1.1],
          ],
          confidence: 'estimated',
          source: 'NOT FOUND: a cylinder broadside, chosen. Read only by a target that fell',
        },
        rarefied: estimated(2.2, 'Vostok’s free-molecule figure (vostok-3ka.ts), taken for a cylinder'),
      },
      rarefied: {
        drag: estimated(2.2, 'NOT FOUND for the targets: the free-molecule figure of a body turning every way, Vostok’s, taken'),
        area: agena
          ? estimated(1.52 * 7.95 * 0.8, 'its side and its ends, as it is held: chosen')
          : estimated(1.52 * 3.73 * 0.8, 'its side and its ends: chosen'),
        length: agena
          ? derived(7.95, 'its length from nozzle to cone, 7.95 m (target-flight.ts)')
          : derived(3.73, 'its length from antenna to cone, 3.73 m (target-flight.ts)'),
      },
    },
    separation: {
      at: doc(t.separation, `the target let go of the Atlas (${times})`),
      push: agena
        ? assumed(
            40 * IN,
            `40 in/s apart, measured on GATV-5002's separation (Gemini VI-A mission report, MSC-G-R-65-5, 5.4.1): two 500 lb retrorockets on the adapter for 0.9 s`,
          )
        : doc(2.3 * FT, '2.3 ft/s, the bungee’s push with the shroud on (Gemini IX-A mission report, MSC-G-R-66-6, 4.3.2.2)'),
    },
    ascent: {
      guidance: {
        vertical: doc(15, `the pitch programme begun at 15 s (${times})`),
        kick: estimated(15, 's: the Atlas’s pitch programme was not found; the Mercury-Atlas flights’ chosen pitch-over'),
        turn: agena
          ? assumed(
              97.3,
              `booster pitch steering by the ground's guidance began at 97.3 s on Atlas 5303 (Gemini IX-A mission report, 12.7, Table 2-1); before, the autopilot's programme, flown here as the turn`,
            )
          : doc(95, `"Revises the guidance enable time to L + 95 sec" for the ATDA's Atlas (${LSFR}, Table IV.D-1)`),
        ...(f.fell?.lost ? { lost: f.fell.lost } : {}),
        target: {
          // (the last cutoff: the Agena's own engine's, or the ATDA's Atlas's verniers', 16 s before it was let go)
          // (one that fell is flown on its planned flight's solution: its target here is only the last instant it was flown to)
          at: f.fell ? (engine ? 'shutdown' : 'target-parted') : agena ? 'insertion' : 'veco',
          altitude: doc(
            ins.altitude * FT,
            `${ins.altitude.toLocaleString('en-US')} ft at ${agena ? 'insertion' : 'vernier engine cutoff'} (${ins.source})`,
          ),
          climb: doc(ins.climb, `the space-fixed flight-path angle at ${agena ? 'insertion' : 'vernier engine cutoff'} (${ins.source})`),
          inclination: doc(ins.inclination, `the insertion's osculating inclination (${ins.source})`),
        },
      },
      drag: [
        {
          until: doc(t.separation, `to the target's separation (${times})`),
          area: derived(Math.PI * (5 * FT) ** 2, `the 10 ft tank's disc (${CATALOG}, 5.3.1: 120 in)`),
          curve: {
            ...friendship7.ascent.drag[1]!.curve,
            source: `the Mercury-Atlas flights' chosen curve, taken: ${friendship7.ascent.drag[1]!.curve.source}`,
          },
        },
      ],
      steering: { authority: friendship7.ascent.steering.authority },
      centre: estimated(
        agena ? (808.5 + 526 - 343) * IN : (808 + 198.38 - 26.3) * IN,
        'the target’s centre of mass in orbit above the Atlas’s exit plane, its report’s station: taken for the record’s run',
      ),
      sheds: targetSheds(agena, w, boosterSection),
      checks: ascentChecks(f, agena),
    },
    orbit: {
      radius: derived(rad, `the ball the insertion's elements are over: their semi-major axis less the heights' mean (${ins.source})`),
      perigee: doc(ins.perigee * NMI, `${ins.perigee} nautical miles at insertion (${ins.source})`),
      apogee: doc(ins.apogee * NMI, `${ins.apogee} nautical miles at insertion (${ins.source})`),
      inclination: doc(ins.inclination, `the insertion's osculating inclination (${ins.source})`),
      period: doc(ins.period * 60, `${ins.period} min, osculating at insertion (${ins.source})`),
    },
    injection: {
      at: doc(agena ? t.cutoff! : t.separation, `insertion (${times})`),
      heading: 'north',
      arc: derived(
        ((ins.range * NMI) / 6_371_000) * (180 / Math.PI),
        `${ins.range} nautical miles of range at insertion over a mean Earth (${ins.source})`,
      ),
      anomaly: doc(ins.anomaly, `the true anomaly at insertion (${ins.source})`),
    },
    mass:
      w.inOrbit && !f.fell
        ? doc(w.inOrbit * LB, `${w.inOrbit.toLocaleString('en-US')} lb in orbit (${weights})`)
        : derived(
            separatedMass,
            f.fell
              ? 'what it weighed as it left the Atlas: it never reached orbit'
              : 'what it weighed as it left the Atlas: no in-orbit weight is given',
          ),
    events: [
      { id: 'liftoff', label: 'Liftoff', at: doc(0, times) },
      { id: 'beco', label: 'Booster engine cutoff', at: doc(t.beco, times) },
      { id: 'staging', label: 'Booster section jettison', at: doc(t.staging, times) },
      { id: 'seco', label: 'Sustainer engine cutoff', at: doc(t.seco, times) },
      { id: 'veco', label: 'Vernier engine cutoff', at: doc(t.veco, times) },
      { id: 'target-parted', label: `${agena ? 'Agena' : 'ATDA'} separation`, at: doc(t.separation, times) },
      ...(engine ? [{ id: 'agena-start', label: 'Main engine start', at: doc(t.ignition!, times) }] : []),
      ...(shrouded ? [{ id: 'shroud', label: 'Nose shroud thrown off', at: doc(t.shroud!, times) }] : []),
      ...(engine
        ? [
            {
              id: f.fell ? 'shutdown' : 'insertion',
              label: f.fell ? 'Main engine shut down' : 'Main engine cutoff: in orbit',
              at: doc(t.cutoff!, times),
            },
          ]
        : []),
    ],
    checks: f.fell?.impact
      ? [
          {
            id: 'ejectionLatitude',
            label: 'Down in the sea: latitude',
            value: f.fell.impact.latitude,
            unit: '°',
            tolerance: f.fell.impact.tolerance,
            confidence: 'documented',
            source: f.fell.impact.source,
          },
          {
            id: 'ejectionLongitude',
            label: 'Down in the sea: longitude',
            value: f.fell.impact.longitude,
            unit: '°',
            tolerance: f.fell.impact.tolerance,
            confidence: 'documented',
            source: f.fell.impact.source,
          },
        ]
      : [],
  };
  return record;
}

/** The ascent's checks: each state the report's trajectory table gives (its actual), and the insertion's orbit. Tolerances set with the record, before it was flown. */
function ascentChecks(f: LaunchFigures, agena: boolean): RecordCheck[] {
  const out: RecordCheck[] = [];
  const s = f.states;
  const add = (event: string, name: string, x: TableState | undefined) => {
    if (!x) return;
    out.push(
      {
        id: `${event}.altitude`,
        label: `${name}: altitude`,
        value: x.altitude * FT,
        unit: 'm',
        tolerance: 3000,
        confidence: 'documented',
        source: s.source,
      },
      {
        id: `${event}.speed`,
        label: `${name}: space-fixed speed`,
        value: x.speed * FT,
        unit: 'm/s',
        tolerance: 60,
        confidence: 'documented',
        source: s.source,
      },
      {
        id: `${event}.climb`,
        label: `${name}: space-fixed flight-path angle`,
        value: x.climb,
        unit: '°',
        tolerance: 1,
        confidence: 'documented',
        source: s.source,
      },
    );
  };
  add('beco', 'Booster engine cutoff', s.beco);
  add('seco', 'Sustainer engine cutoff', s.seco);
  add('veco', 'Vernier engine cutoff', s.veco);
  if (agena) add('agena-start', 'Main engine start', s.ignition);
  if (s.insertion) {
    const i = f.insertion;
    out.push(
      {
        id: 'cutoffSpeed',
        label: 'Last cutoff: space-fixed speed',
        value: s.insertion.speed * FT,
        unit: 'm/s',
        tolerance: 25,
        confidence: 'documented',
        source: s.source,
      },
      ...(agena && f.times.cutoff !== undefined
        ? [
            {
              id: 'cutoffAt',
              label: 'Main engine cutoff',
              value: f.times.cutoff,
              unit: 's',
              tolerance: 3,
              confidence: 'documented' as const,
              source: f.times.source,
            },
          ]
        : []),
      {
        id: 'perigee',
        label: 'Perigee at insertion',
        value: i.perigee * NMI,
        unit: 'm',
        tolerance: 8000,
        confidence: 'documented',
        source: i.source,
      },
      {
        id: 'apogee',
        label: 'Apogee at insertion',
        value: i.apogee * NMI,
        unit: 'm',
        tolerance: 8000,
        confidence: 'documented',
        source: i.source,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: i.inclination,
        unit: '°',
        tolerance: 0.1,
        confidence: 'documented',
        source: i.source,
      },
    );
  }
  return out;
}

/** What leaves the stack, flown on in the scene: the booster section, the Atlas, and an Agena's shroud. Stations in from the Atlas's exit plane. */
function targetSheds(agena: boolean, w: LaunchFigures['weights'], boosterSection: number): ShedBody[] {
  const staging = (1310 - 1133) * IN;
  const top = (agena ? 808.5 + 142 : 808 + 198.38 - 117) * IN;
  const sheds: ShedBody[] = [
    {
      on: 'booster-latch',
      name: 'Booster section',
      from: doc(0, 'the booster engines’ exit plane'),
      to: derived(staging, 'the staging plane, station 1133 (vehicles/atlas_lv3b.py)'),
      radius: derived(60.6 * IN, 'its skin, on the tank’s own line (vehicles/atlas_lv3b.py)'),
      mass: derived(boosterSection * LB, 'as the plan’s booster section'),
      centre: estimated(2, 'about the booster engines’ gimbals, where its weight is'),
      gyration: { roll: estimated(1.3, 'a ring 1.5 m across its fairings'), across: estimated(1.6, 'a short drum, its engines low') },
      ahead: estimated(7.3, 'its open top, the tank’s 7.3 m² disc, at 1.0'),
      astern: estimated(8, 'its engines and fairings, at 1.0'),
      side: {
        dragArea: estimated(20, '4.5 m by 4.9 m across the fairings, at 0.9'),
        from: doc(0, 'its stretch along the stack, as above'),
        to: derived(staging, 'its stretch along the stack, as above'),
      },
    },
    {
      on: 'target-separation',
      name: 'Atlas',
      from: derived(2 * IN, 'the sustainer’s exit, station 1308 (vehicles/atlas_lv3b.py)'),
      to: derived(top, 'the top of the target adapter that stayed on it (vehicles/atlas_slv3.py)'),
      radius: derived(60 * IN, 'the 10 ft tank'),
      mass: derived((w.veco ?? w.seco) * LB - w.separated * LB, 'as the plan’s tank section at vernier engine cutoff'),
      centre: estimated(9, 'about halfway up, its engines and thrust cone below'),
      gyration: { roll: estimated(1.4, 'a thin shell 3 m across'), across: estimated(6.8, 'a 24 m tube, its tanks empty') },
      ahead: estimated(3, 'the adapter’s open top, at 0.8'),
      astern: estimated(7.3, 'the thrust cone and sustainer, on the 7.3 m² disc at 1.0'),
      side: {
        dragArea: estimated(70, '23 m by 3.05 m, at 1.0'),
        from: derived(2 * IN, 'its stretch along the stack, as above'),
        to: derived(top, 'its stretch along the stack, as above'),
      },
    },
  ];
  if (agena)
    sheds.push({
      on: 'shroud-band',
      name: 'Nose shroud',
      from: derived((1244.2 - 117) * IN, 'the shroud’s 117 in below the stack’s tip, 1,244.2 in (atlas-slv3.md)'),
      to: derived(1244.2 * IN, 'the stack’s tip'),
      radius: derived(32.5 * IN, 'about 65 in across (atlas-slv3.md)'),
      mass: assumed(374 * LB, `the standard Agena shroud’s drop weight (${CATALOG}, 10.1)`),
      centre: estimated((1244.2 - 70) * IN, 'about its middle, a little low'),
      gyration: { roll: estimated(0.7, 'a thin shell of fibreglass'), across: estimated(0.9, 'a 3 m shell, light throughout') },
      ahead: estimated(1.2, 'its round nose, at 0.4'),
      astern: estimated(3, 'its open base, at 1.3'),
      side: {
        dragArea: estimated(4.5, '3 m by 1.65 m, at 0.9'),
        from: derived((1244.2 - 117) * IN, 'its stretch along the stack, as above'),
        to: derived(1244.2 * IN, 'its stretch along the stack, as above'),
      },
    });
  return sheds;
}

/** A target's plan, from its record. */
export function targetPlan(o: TargetRecord): FlightPlan {
  const record = (at: Measure) => {
    const e = o.events.find((x) => Math.abs(x.at.value - at.value) < 1e-6);
    return e ? { record: { id: e.id, label: e.label } } : {};
  };
  const atlas = atlasPieces(o.atlas, o.ascent.steering.authority, record);
  const p = o.payload;
  const bodies: BodyDef[] = [
    ...atlas.bodies,
    ...(p.shroud ? [{ id: 'nose-shroud', label: 'Nose shroud', count: 1, mass: p.shroud.mass, nodes: ['TargetAscentShroud'] }] : []),
    {
      id: p.id,
      label: p.name,
      count: 1,
      mass: p.mass,
      ...(p.engine
        ? { dry: derived(p.mass.value - p.engine.propellant.value, 'as it left the Atlas less the propellant its ascent burned') }
        : {}),
      nodes: p.nodes,
      aero: { area: p.aero.area, drag: p.aero.drag, rarefied: p.aero.rarefied },
    },
  ];
  const joints: JointDef[] = [
    atlas.latch,
    {
      id: 'target-separation',
      label: `${p.name} separation`,
      gone: ['atlas-booster-section', 'atlas'],
      push: o.separation.push,
      at: o.separation.at,
      after: derived(p.mass.value + (p.shroud?.mass.value ?? 0), `the ${p.name} as it left the Atlas`),
    },
    ...(p.shroud ? [{ id: 'shroud-band', label: 'Nose shroud thrown off', gone: ['nose-shroud'], at: p.shroud.at }] : []),
  ];
  const engines: EngineDef[] = [
    ...atlas.engines,
    ...(p.engine
      ? [
          {
            id: 'agena-engine',
            label: p.engine.name,
            body: p.id,
            count: 1,
            tanks: ['agena-propellant'],
            thrust: { vacuum: p.engine.thrust },
            isp: { vacuum: p.engine.isp },
            kind: 'liquid' as const,
            starts: p.engine.starts,
            burns: 'amine-nitric' as const,
          },
        ]
      : []),
  ];
  const tanks: TankDef[] = [
    ...atlas.tanks,
    ...(p.engine
      ? [{ id: 'agena-propellant', label: 'Agena propellant', body: p.id, load: p.engine.propellant, holds: 'propellant' as const }]
      : []),
  ];
  const timed = atlas.timed;
  const events: EventDef[] = [
    atlas.events.liftoff,
    atlas.events.boosterCut,
    atlas.events.staging,
    atlas.events.sustainerCut,
    atlas.events.vernierCut!,
    timed('target-separation:separate', `Separate the ${p.name}`, o.separation.at, [{ separate: 'target-separation' }]),
    ...(p.engine ? [timed('agena-engine:ignite', 'Start the main engine', p.engine.ignition, [{ ignite: 'agena-engine' }])] : []),
    ...(p.shroud ? [timed('shroud-band:separate', 'Throw off the nose shroud', p.shroud.at, [{ separate: 'shroud-band' }])] : []),
    ...(p.engine
      ? [
          p.engine.speed
            ? {
                id: 'agena-engine:cut',
                label: 'Main engine cutoff',
                when: [{ speed: p.engine.speed.value }],
                do: [{ cut: 'agena-engine' }],
                automatic: true,
                at: p.engine.cutoff,
                source: p.engine.speed.source,
              }
            : timed('agena-engine:cut', 'Main engine cutoff', p.engine.cutoff, [{ cut: 'agena-engine' }]),
        ]
      : []),
  ];
  // (the record's instants an event of the plan is set off at on the clock; the rest are marks: an engine cut on its meter's is the run's)
  const actionAt = new Set(events.flatMap((e) => (e.at && e.when.some((w) => 'time' in w) ? [e.at.value] : [])));
  const craft: Craft = {
    id: 'atlas-target',
    label: 'The stack',
    mass: o.liftoffMass,
    bodies,
    joints,
    engines,
    tanks,
    thrusters: [atlas.thruster],
    chutes: [],
    limits: [],
    drag: o.ascent.drag,
    rarefied: p.rarefied,
    lands: { on: 'sea', ship: 'the target vehicle' },
    sheds: o.ascent.sheds,
  };
  const checks: PlanCheck[] = [
    ...o.ascent.checks.map((c): PlanCheck => ({ ...c, of: 'ascent' })),
    ...o.checks.map((c): PlanCheck => ({ ...c, of: 'orbit' })),
  ];
  return {
    kind: 'orbital',
    craft: [craft],
    events,
    attitude: [
      {
        id: 'steering-law',
        label: 'Steering law',
        hold: { law: o.ascent.guidance },
        source: 'sim/staged.ts: a stated law, solved for its targets',
      },
      { id: 'orbit-attitude', label: 'Orbit attitude', hold: { free: true }, source: 'in orbit its attitude is not flown' },
    ],
    checks,
    record: {
      orbit: {
        ...o.orbit,
        kind: { is: 'osculating', confidence: 'documented', source: o.orbit.period.source },
        injection: o.injection,
        mass: o.mass,
      },
      centre: o.ascent.centre,
      marks: o.events.filter((e) => !actionAt.has(e.at.value)).map((e) => ({ id: e.id, label: e.label, at: e.at })),
    },
    ...(o.planned ? { planned: targetPlan(o.planned) } : {}),
  };
}
