/**
 * Entry guidance: a lifting capsule's bank commanded from the entry's own state by its computer's law, flown by its
 * autopilot's roll, and taken by a hand's stick. What a plan asks for with `Hold.entry` (sim/plan.ts), and what the coast
 * (orbital.ts `flyOrbit`, `flyEntry`) and the predicted path (fliers.ts `spacecraft`) fly an entry body's lift by.
 *
 * Three things, kept apart so another capsule's computer can be put in the first's place:
 *
 *   the law    `EntryLaw`: one command each cycle from what the computer navigates (`EntryNav`). The Apollo command
 *              module computer's is here (`apolloLaw`): its entry programs P63 to P67 as its flight program has them,
 *              equation for equation, in the program's own units (feet, seconds, nautical miles where it says).
 *   the pilot  `entryPilot`: who has the bank at each instant (the crew's backup bank, the computer through the
 *              autopilot, a hand's stick), the roll that takes the capsule there, and what it flew (`EntryFlown`).
 *   the data   `EntryDef`: the target, the banks the record's crew held, the computer and its pad loads, the roll's
 *              limits, each a `Measure`.
 *
 * The computer navigates on the run's own state: no platform or accelerometer error is modelled, so what the real
 * computers missed their targets by (a mile or two) is not in a run. Nothing is fitted: the law's constants are the
 * program's, the target and the banks the record's.
 */
import type { Confidence, Measure } from '../measure.ts';
import { G0 } from '../world/bodies.ts';
import type { EarthFrame } from '../world/earthframe.ts';
import { cross, DEG, dot, geodeticToEcef, length, scale, sub, unit, type Vec3 } from '../world/frames.ts';

const FT = 0.3048;

/** What a plan's `Hold.entry` holds: an entry steered to a place. */
export interface EntryDef {
  /** Where its computer steers it to: degrees north and east. */
  target: { latitude: Measure; longitude: Measure };
  /**
   * The bank held from the event that sets the hold until something commands another, degrees (orbital.ts `liftOf`: lift
   * up at 0, to the right of the motion at 90, down at 180).
   */
  initial: Measure;
  /**
   * The computer whose law commands the bank. Left out, nothing commands it: the entry is flown open, on `initial` and
   * then the `backup` bank to the end, which is what a ground computes a braking burn's instant on (orbital.ts `openLoop`).
   */
  computer?: EntryComputer;
  /**
   * A bank the record's crew held by hand before the computer's commands were flown, degrees: rolled to as the load first
   * reaches `from` (in g), and held for at least `least` seconds and until the computer first commands a bank other
   * than `initial`, when the autopilot is given the commands. Left out, the autopilot flies the computer from the start.
   */
  backup?: { bank: Measure; from: Measure; least: Measure };
  /** The autopilot's roll about the motion through the air: its greatest rate, degrees a second, and its acceleration, degrees a second squared. */
  roll: { rate: Measure; acceleration: Measure };
}

/** An entry computer by its kind: each has its law (`lawOf`). A new capsule's computer is a new kind here and a law of its own. */
export type EntryComputer = ApolloComputer;

/** The Apollo command module computer's entry programs (`apolloLaw`). */
export interface ApolloComputer {
  kind: 'apollo';
  /** LAD: the lift over drag the program takes the capsule to have, a pad load. */
  lad: Measure;
  /** LOD: the lift over drag, in the plane of the motion, that the final phase's stored reference was flown at, a pad load. */
  lod: Measure;
  /** Whose flight program the fixed constants and the stored reference (`CMC`, `REFERENCE`) are taken to be this flight's, and how sure. */
  program: { confidence: Confidence; source: string };
}

/** What a hand gives an entry (orbital.ts `DescentHands`): the stick's roll, and whether the computer has the bank. */
export interface EntryHands {
  /**
   * Each change of the stick's roll, s from liftoff: `stick` from -1 (to the left) to 1, and Hold as it stood. With Hold the
   * stick asks a roll rate (the autopilot's greatest at full throw) and the bank stays where the stick leaves it; without, it
   * works the roll jets themselves, and nothing stops the roll but the stick.
   */
  rolls?: readonly { t: number; stick: number; hold: boolean }[];
  /** The guidance switch as thrown: whether the computer (and the record's crew) has the bank from `t`. Left out, it has. */
  steered?: readonly { t: number; on: boolean }[];
  /** The bank it has as a run begins part-way through the entry, degrees (the run it is taken from flew it there). Left out, the first attitude. */
  bank?: number;
}

/** What a computer navigates each cycle: the run's own state, in the flight's frame (world/earthframe.ts), SI. */
export interface EntryNav {
  /** Seconds from liftoff. */
  t: number;
  r: Vec3;
  v: Vec3;
  /** What its accelerometers read over the cycle, m/s^2: everything but gravity. */
  sensed: number;
  /** The Earth's turning, rad/s, as a vector in the frame. */
  spin: Vec3;
  /** The unit vector to the target at an instant, in the frame: the place carried round by the Earth. */
  target(at: number): Vec3;
}

/** One cycle's command. */
export interface EntryCommand {
  /** The bank commanded, degrees (orbital.ts `liftOf`). */
  bank: number;
  /** Whether the roll to it is to be made through lift up, not by the shorter way (the Apollo program's LATSW, under a high load). */
  overTop: boolean;
  /**
   * A steady roll asked for in place of a bank, degrees a second (to the right, positive): a computer that spins the lift
   * round to make none of it (a Gemini's, with range in hand). Left out, the bank is rolled to and held.
   */
  rolling?: number;
  /** The computer's own name for what it is doing, and whether it has stopped steering (the bank is then held). */
  phase: EntryPhase;
  ended: boolean;
  /** How far the target is along and across, m at the Earth's surface (to the right of the motion, positive), as the computer has it. */
  range: number;
  cross: number;
}

export type EntryPhase = 'initial' | 'constant drag' | 'huntest' | 'down control' | 'up control' | 'kepler' | 'final' | 'ended';

/** A computer's law as the pilot runs it. */
export interface EntryLaw {
  /** Seconds between its commands. */
  readonly cycle: number;
  /** One cycle: the navigated state in, the command out. */
  command(nav: EntryNav): EntryCommand;
  /** How many times it has reversed the bank's side. */
  readonly reversals: number;
}

/**
 * The Apollo command module computer's fixed entry constants, in the program's units (feet, seconds, radians; nautical
 * miles where named): Colossus 2A (Comanche 055, Apollo 11's), REENTRY CONTROL, pp. 879 to 881 of the listing, each
 * descaled as its own comment gives it. Its nautical mile is 1/21600 of the circle.
 */
export const CMC = {
  VSAT: 25766.1973,
  RE: 21_202_900,
  HS: 28_500,
  GS: 32.2,
  ATK: 21_600 / (2 * Math.PI),
  DT: 2,
  C1: 1.25,
  C16: 0.01,
  C17: 0.001,
  C18: 500,
  C20: 175,
  C21: 140,
  CHOOK: 0.25,
  CH1: 1,
  COS15: 0.965,
  DLEWD0: -0.05,
  GMAX: 8 * 32.2,
  KA1: 1.3,
  KA2: 0.2,
  KA3: 90,
  KA4: 40,
  KALIM: 1.5,
  KB1: 3.4,
  KB2: 0.0034,
  KDMIN: 0.5,
  KTETA: 1000,
  K44: 19_749_550,
  /** KLAT is LAD times this (LATSLOPE, halved as the program halves it). */
  LATSLOPE: 1 / 24,
  /** LATBIAS, radians: the listing's .00003, of a quarter of the angle. */
  LATBIAS: 0.00012,
  LEWD1: 0.15,
  POINT1: 0.1,
  /** Q2 is Q22 + Q21 LAD, nautical miles. */
  Q21: 500,
  Q22: -1152,
  Q3: 0.07,
  Q5: 7050,
  Q6: 0.0349,
  Q7F: 6,
  Q7MIN: 40,
  Q19: 0.5,
  VFINAL: 26_600,
  VFINAL1: 27_000,
  VLMIN: 18_000,
  VQUIT: 1000,
  VRCONT: 700,
  /** The range within which HUNTEST takes its prediction, nautical miles. */
  NEAR: 25,
  /** The load at which the entry is taken to have begun, g. */
  G05: 0.05,
  /** The nominal time of an entry, s, for the target's place before any range is known (500SEC). */
  NOMINAL: 500,
} as const;

/**
 * The final phase's stored reference trajectory (the same listing, pp. 876 to 878, VREFER and the six functions after it),
 * descaled: speed, ft/s; the range's slope on drag, n. mi. per ft/s^2, and on altitude rate, n. mi. per ft/s; the
 * reference altitude rate, ft/s; the range to go, n. mi.; the reference drag, ft/s^2; the range's slope on lift over drag, n. mi.
 */
const TWO_VS = 2 * CMC.VSAT;
export const REFERENCE = {
  v: [0.019288, 0.040809, 0.076107, 0.122156, 0.165546, 0.196012, 0.271945, 0.309533, 0.356222, 0.404192, 0.448067, 0.456023, 0.67918].map(
    (x) => x * TWO_VS,
  ),
  onDrag: [
    -0.010337, -0.01655, -0.026935, -0.042039, -0.058974, -0.070721, -0.098538, -0.107482, -0.147762, -0.193289, -0.602557, -0.99999,
    -0.99999,
  ].map((x) => (x * 2700) / 805),
  onRate: [
    0.0478599, 0.0683663, 0.1343468, 0.2759846, 0.4731437, 0.6472087, 1.171693, 1.466382, 1.905171, 2.54799, 4.15122, 5.813617, 5.813617,
  ].map((x) => (x * 2700) / TWO_VS),
  rate: [
    -0.0134001, -0.013947, -0.013462, -0.011813, -0.0095631, -0.00806946, -0.006828, -0.00806946, -0.0109791, -0.0151498, -0.0179817,
    -0.0159061, -0.0159061,
  ].map((x) => x * TWO_VS),
  range: [
    0.0008067, 0.0032963, 0.0081852, 0.017148, 0.027926, 0.037, 0.063298, 0.077889, 0.098815, 0.127519, 0.186963, 0.238148, 0.294185185,
  ].map((x) => x * 2700),
  drag: [0.051099, 0.074534, 0.101242, 0.116646, 0.12236, 0.127081, 0.147453, 0.155528, 0.149565, 0.118509, 0.034907, 0.00795, 0.00795].map(
    (x) => x * 805,
  ),
  onLift: [
    0.004491, 0.008081, 0.01603, 0.035815, 0.069422, 0.104519, 0.122, 0.172407, 0.252852, 0.363148, 0.512963, 0.558519, 0.558519,
  ].map((x) => x * 2700),
} as const;

/** The stored reference at a speed, ft/s: each function between its two points, as the program interpolates it. */
export function referenceAt(v: number): { onDrag: number; onRate: number; rate: number; range: number; drag: number; onLift: number } {
  const t = REFERENCE.v;
  let k = t.length - 2;
  while (k > 0 && t[k]! > v) k--;
  const grad = (v - t[k]!) / (t[k + 1]! - t[k]!);
  const at = (f: readonly number[]): number => f[k]! + grad * (f[k + 1]! - f[k]!);
  return {
    onDrag: at(REFERENCE.onDrag),
    onRate: at(REFERENCE.onRate),
    rate: at(REFERENCE.rate),
    range: at(REFERENCE.range),
    drag: at(REFERENCE.drag),
    onLift: at(REFERENCE.onLift),
  };
}

const sign = (x: number): number => (x < 0 ? -1 : 1);
const clamp = (x: number, low: number, high: number): number => Math.max(low, Math.min(high, x));

/**
 * The Apollo command module computer's entry guidance, programs P63 to P67 (Colossus 2A, REENTRY CONTROL, pp. 844 to
 * 878; Morth, MIT/IL R-532; Graves and Harpold, NASA TN D-6725, "Entry guidance"): every two seconds, from the navigated
 * state, the lift over drag wanted in the plane of the motion and the side the lift is rolled to, as a bank.
 *
 * Its phases, by the listing's own labels. INITROLL holds the first attitude to 0.05 g, then (P64) to a load KAT, then
 * flies constant drag until the descent slows to VRCONT; an entry slower than VFINAL1 goes straight to wait for 0.2 g.
 * HUNTEST predicts the range the rest would make (down to pull-out, up at a reference lift over drag LEWD to a load Q7,
 * a ballistic arc, the final phase) and finds the LEWD that makes it the range to go, flying constant drag (CONSTD)
 * while there is energy to lose. DOWNCNTL and UPCONTRL fly that reference. KEP2 waits out the arc. PREDICT3 (P67) flies
 * the stored reference to the target, its range potential held on the range to go; GLIMITER turns the lift up against
 * a load past GMAX. LIMITL/D keeps the side: it reverses the bank where the target lies further across than the lift
 * can be expected to take it.
 *
 * Roll, in the program, is positive to the left of the motion; a bank here is positive to the right (orbital.ts `liftOf`).
 */
export function apolloLaw(computer: ApolloComputer, initial: number): EntryLaw {
  const C = CMC;
  const lad = computer.lad.value;
  const lod = computer.lod.value;
  const ldMin = lad * C.COS15;
  const klat = lad * C.LATSLOPE;
  const q2 = C.Q22 + C.Q21 * lad;
  let mode: 'initroll' | 'huntest' | 'upcontrl' | 'kep2' | 'predict3' | 'off' = 'initroll';
  let phase: EntryPhase = 'initial';
  // (the listing's switches, by its names)
  let gonepast = true;
  let relvel = false;
  let egsw = false;
  let noswitch = false;
  let hind = false;
  let inrl = false;
  let latsw = true;
  let g05 = false;
  let begun = false;
  let k2roll = 1;
  let reversals = 0;
  // (its erasables: lift over drag commanded, the roll, the range angle, and HUNTEST's reference)
  let ld = lad * Math.cos(initial * DEG);
  let rollc = 0;
  let thetah = 0;
  let q7: number = C.Q7F;
  let factor = 1;
  let [kat, d0, lewd, dlewd, diffold] = [0, 0, C.LEWD1 as number, C.DLEWD0 as number, 0];
  let [a0, a1, v1, vl, vs1, alp, fact1, fact2, dhook, ahookdv, dvl] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  // (this cycle's navigation)
  let [V, vsq, leq, rdot, D, latang] = [0, 0, 0, 0, 0, 0];
  let goneby = false;

  /** LIMITL/D: the side kept or reversed, and the roll. */
  const limit = (): void => {
    let ld1 = ld;
    if (!gonepast) {
      let y = klat * vsq + C.LATBIAS;
      const across = latang * k2roll;
      let small = false;
      if (Math.abs(ld) - ldMin >= 0) {
        if (across < 0) {
          // (all the lift asked for, up or down: fifteen degrees of it turned toward the target)
          ld1 = ldMin * sign(ld);
          small = true;
        } else y /= 2;
      }
      if (!small && across - y >= 0 && !noswitch) {
        k2roll = -k2roll;
        reversals++;
      }
    }
    rollc = k2roll * Math.acos(clamp(ld1 / lad, -1, 1));
    noswitch = false;
  };
  /** NEGTESTS: under a load past C20 the roll goes over the top, and no lift is turned down. */
  const negtests = (): void => {
    if (D - C.C20 >= 0) {
      latsw = false;
      if (ld < 0) ld = 0;
    }
    limit();
  };
  /** GLIMITER: lift up where the load would pass GMAX. */
  const glimiter = (): void => {
    if (C.GMAX / 2 - D < 0) {
      if (C.GMAX - D < 0) ld = lad;
      else {
        const xlim = Math.sqrt(Math.max(0, 2 * C.HS * (C.GMAX - D) * ((leq * C.GS) / C.GMAX + lad) + ((2 * C.HS * C.GMAX) / V) ** 2));
        if (rdot + xlim < 0) ld = lad;
      }
    }
    limit();
  };
  /** CONSTD: the lift that holds the drag at D0. */
  const constd = (): void => {
    phase = 'constant drag';
    ld = (-leq * C.GS) / d0 + C.C16 * (D - d0) - C.C17 * (rdot + (2 * C.HS * d0) / V);
    negtests();
  };
  /** PREDICT3: the final phase, on the stored reference. */
  const predict3 = (): void => {
    phase = 'final';
    if (V - C.VQUIT < 0) {
      mode = 'off';
      phase = 'ended';
      return;
    }
    const ref = referenceAt(V);
    const predicted = ref.range + ref.onRate * (rdot - ref.rate) + ref.onDrag * (D - ref.drag);
    if (gonepast || goneby) {
      gonepast = true;
      ld = -lad;
    } else ld = clamp(lod + (4 * (thetah * C.ATK - predicted)) / ref.onLift, -1, 1);
    glimiter();
  };
  const prefinal = (): void => {
    egsw = true;
    mode = 'predict3';
    predict3();
  };
  /** KEP2: the ballistic arc, the roll kept (lift up where no air is felt), until the drag is back. */
  const kep2 = (): void => {
    phase = phase === 'initial' ? 'initial' : 'kepler';
    if (C.Q7F + C.KDMIN - D < 0) return void prefinal();
    if (!g05) rollc = 0;
  };
  /** DOWNCNTL: down to pull-out with the lift up, on drag and altitude rate against speed. */
  const downcntl = (): void => {
    phase = 'down control';
    const rdtr = lad * (v1 - V);
    const dref = (V / v1) ** 2 * a0 - rdtr ** 2 / (2 * C.C1 * C.HS * lad);
    ld = lad + C.C16 * (D - dref) - C.C17 * (rdot - rdtr);
    negtests();
  };
  /** UPCONTRL: up from pull-out on the reference HUNTEST found, speed and altitude rate against drag. */
  const upcontrl = (): void => {
    if (D - C.C21 >= 0) noswitch = true;
    if (V - v1 >= 0) return void downcntl();
    phase = 'up control';
    if (D - q7 < 0) {
      mode = 'kep2';
      return void kep2();
    }
    if (rdot < 0 && V - vl - C.C18 < 0) return void prefinal();
    if (D - a0 >= 0) {
      ld = lad;
      return void limit();
    }
    const vref = fact1 * (1 - Math.sqrt(Math.max(0, fact2 * D + alp)));
    let rdotref = lewd * (v1 - vref);
    if (vs1 - vref >= 0) {
      const dv = vs1 - vref;
      rdotref -= (C.CH1 * C.GS * dv ** 2 * (1 + (ahookdv * dv) / dvl)) / (dhook * vref);
    }
    if (D - C.Q7MIN >= 0) factor = (D - q7) / (a1 - q7);
    let more = -C.KB2 * factor * (C.KB1 * factor * (rdot - rdotref) + V - vref);
    if (Math.abs(more) - C.POINT1 >= 0) more = sign(more) * (C.POINT1 + C.POINT1 * (Math.abs(more) - C.POINT1));
    ld = lewd + more;
    negtests();
  };
  /**
   * HUNTEST: the range the rest of the entry would make, and the up-control reference that makes it the range to go.
   * The program works this over as many passes as it takes, set aside from its two-second cycle; here they are all
   * made in the cycle that begins them (sixty at the most: it settles in a handful).
   */
  const huntest = (): void => {
    for (let pass = 0; pass < 60; pass++) {
      phase = 'huntest';
      a1 = D;
      const tem1b = rdot < 0 ? lad : lewd;
      v1 = V + rdot / tem1b;
      a0 = (v1 / V) ** 2 * (D + rdot ** 2 / (tem1b * 2 * C.C1 * C.HS));
      if (rdot < 0) a1 = a0;
      if (ld < 0) v1 -= C.VQUIT;
      alp = (2 * C.C1 * C.HS * a0) / (lewd * v1 ** 2);
      fact1 = v1 / (1 - alp);
      fact2 = (alp * (alp - 1)) / a0;
      vl = fact1 * (1 - Math.sqrt(Math.max(0, q7 * fact2 + alp)));
      let gammal1 = (lewd * (v1 - vl)) / vl;
      if (vl - C.VLMIN < 0) return void prefinal();
      let vbars = (vl / C.VSAT) ** 2;
      if (C.VSAT - vl < 0) {
        mode = 'huntest';
        return void constd();
      }
      dvl = C.VSAT - vl;
      vs1 = C.VSAT;
      if (vs1 - v1 >= 0) {
        dvl -= C.VSAT - v1;
        vs1 = v1;
      }
      dhook = ((1 - vs1 / fact1) ** 2 - alp) / fact2;
      ahookdv = C.CHOOK * (dhook / q7 - 1);
      let gammal = gammal1 - (C.CH1 * C.GS * dvl ** 2 * (1 + ahookdv)) / (dhook * vl ** 2);
      if (gammal < 0) {
        // (NEGAMA: no skip, so the speed and the load at the top of the arc are found for a level exit)
        vl += (gammal * vl) / (lewd - ((3 * ahookdv + 2) * dvl * C.CH1 * C.GS) / (dhook * vl));
        q7 = ((1 - vl / fact1) ** 2 - alp) / fact2;
        vbars = (vl / C.VSAT) ** 2;
        gammal = 0;
      }
      gammal1 += C.Q19 * (gammal - gammal1);
      // (RANGER: the arc, the final phase, the up phase, the angle's correction and the way down to pull-out, radians)
      const cosg = 1 - gammal ** 2 / 2;
      const e = Math.sqrt(Math.max(0, 1 + (vbars - 2) * cosg ** 2 * vbars));
      const askep = 2 * Math.asin(clamp((vbars * cosg * gammal) / e, -1, 1));
      const asp1 = (q2 + C.Q3 * vl) / C.ATK;
      const aspup = ((C.HS / C.RE) * Math.log((a0 * vl ** 2) / (q7 * v1 ** 2))) / gammal1;
      const asp3 = (C.Q5 * (C.Q6 - gammal)) / C.ATK;
      const aspdwn = (-rdot * V) / (a0 * lad * C.RE);
      const diff = askep + asp1 + aspup + asp3 + aspdwn - thetah;
      if (!Number.isFinite(diff)) {
        mode = 'huntest';
        return void constd();
      }
      if (Math.abs(diff) - C.NEAR / C.ATK < 0) {
        mode = 'upcontrl';
        return void upcontrl();
      }
      if (!hind && diff >= 0) {
        // (it would go too far: constant drag, and HUNTEST again next cycle)
        diffold = diff;
        q7 = C.Q7F;
        mode = 'huntest';
        return void constd();
      }
      dlewd = diffold - diff === 0 ? -dlewd : (dlewd * diff) / (diffold - diff);
      if (lewd + dlewd < 0) dlewd = -lewd / 2;
      if (lewd + dlewd >= 1) {
        lewd = 1 - 2 ** -28;
        diffold = diff;
        q7 = C.Q7F;
        mode = 'huntest';
        return void constd();
      }
      lewd += dlewd;
      diffold = diff;
      hind = true;
      q7 = C.Q7F;
    }
    mode = 'huntest';
    constd();
  };
  /** INITROLL: the first attitude to 0.05 g and to the load KAT, then constant drag until the descent has slowed. */
  const initroll = (): void => {
    if (!inrl) {
      if (g05) {
        kat = Math.min(C.KA1 * leq ** 3 + C.KA2, C.KALIM) * C.GS;
        gonepast = false;
        if (V - C.VFINAL1 < 0) mode = 'kep2';
        else {
          d0 = C.KA3 * leq + C.KA4;
          // (lift down for an entry so shallow it might not be caught)
          ld = V - C.VFINAL + C.K44 * (rdot / V) ** 3 > 0 ? -lad : lad;
        }
        inrl = true;
      }
      return void limit();
    }
    if (rdot + C.VRCONT < 0) return void (kat - D > 0 ? limit() : constd());
    diffold = 0;
    dlewd = C.DLEWD0;
    lewd = C.LEWD1;
    mode = 'huntest';
    huntest();
  };

  return {
    cycle: C.DT,
    get reversals() {
      return reversals;
    },
    command(nav) {
      // TARGETNG: the state as the program scales it, the drag led by half a cycle, and the target where the Earth will
      // have carried it by the time it is reached
      const r = scale(nav.r, 1 / FT);
      const up = unit(r);
      const inertial = scale(nav.v, 1 / FT);
      const vel = relvel ? sub(inertial, cross(nav.spin, r)) : inertial;
      V = length(vel);
      vsq = (V / C.VSAT) ** 2;
      leq = vsq - 1;
      rdot = dot(vel, up);
      D = Math.max(nav.sensed / FT, 1e-9);
      const uni = unit(cross(vel, up));
      if (!begun) {
        const first = nav.target(nav.t + C.NOMINAL);
        thetah = Math.acos(clamp(dot(first, up), -1, 1));
        k2roll = -sign(dot(first, uni));
        begun = true;
      }
      let ahead = 0;
      if (!relvel) {
        D += D * (-rdot / C.HS - (2 * D) / V) * (C.DT / 2);
        D = Math.max(D, 1e-9);
        if (egsw) {
          if (V - C.VSAT / 2 < 0) relvel = true;
          ahead = (C.RE * thetah) / V;
        } else ahead = C.KTETA * thetah;
      }
      const rt = nav.target(nav.t + ahead);
      latang = dot(rt, uni);
      goneby = dot(cross(rt, up), uni) < 0;
      thetah = Math.acos(clamp(dot(rt, up), -1, 1));
      g05 = D - C.G05 * C.GS >= 0;
      if (mode === 'initroll') initroll();
      else if (mode === 'huntest') huntest();
      else if (mode === 'upcontrl') upcontrl();
      else if (mode === 'kep2') kep2();
      else if (mode === 'predict3') predict3();
      const overTop = !latsw;
      latsw = true;
      return {
        bank: -rollc / DEG,
        overTop,
        phase,
        ended: mode === 'off',
        range: (goneby ? -1 : 1) * thetah * C.RE * FT,
        cross: latang * C.RE * FT,
      };
    },
  };
}

/** The law of a plan's computer. */
export function lawOf(computer: EntryComputer, initial: number): EntryLaw {
  return apolloLaw(computer, initial);
}

/** What an entry flew (`EntryPilot.flown`): for the run's figures, its attitude and the path that follows it. */
export interface EntryFlown {
  /** The bank it flew, degrees, from each instant it changed (held until the next). */
  banks: { t: number; bank: number }[];
  /** When the load first reached 0.05 g; the crew rolled to the backup bank; the autopilot was given the computer's commands;
   * the computer began its final phase; it stopped steering: s from liftoff, NaN for what never came. */
  sensed: number;
  backup: number;
  takeover: number;
  final: number;
  ended: number;
  /** The computer's phases in the order it came to them, and how many times it reversed the bank's side. */
  phases: { t: number; phase: EntryPhase }[];
  reversals: number;
  /** How far the target was when it stopped steering, m: along the motion (beyond it, negative) and to the right of it, as the computer had it. */
  range: number;
  cross: number;
}

/** Who has an entry's bank and how it rolls, as the coast steps it: `advance` after each step, `bank` the lift's bank for the next. */
export interface EntryPilot {
  /** The bank now, degrees (orbital.ts `liftOf`). */
  readonly bank: number;
  /** Taken on to `t`, s from liftoff, at the state there, with what the accelerometers read there, m/s^2. */
  advance(t: number, s: { r: Vec3; v: Vec3 }, sensed: number): void;
  readonly flown: EntryFlown;
}

/** The roll's own step, s: finer than any step of the coast through the air. */
const ROLL_STEP = 0.05;
/** A command this near the first attitude is not a command to leave it, degrees. */
const SAME = 0.5;
const wrap = (x: number): number => x - 360 * Math.round(x / 360);

/** The last of a hand's entries at or before `t`. */
function lastAt<T extends { t: number }>(list: readonly T[] | undefined, t: number): T | undefined {
  let found: T | undefined;
  for (const x of list ?? []) if (x.t <= t + 1e-9) found = x;
  return found;
}

/**
 * The pilot of an entry from `from`, s from liftoff (the event that set the hold, or where a run begins after it), in
 * `frame`. Each cycle of the computer's (begun at `from`) the law is given the state and its command kept. Who the roll
 * then follows: a hand's stick while the guidance switch is off (`hands.steered`); else the record's crew, on the
 * first attitude and then the backup bank until they give the autopilot the commands (`EntryDef.backup`); else the
 * computer's command, or with no computer the backup bank to the end. The roll to a commanded bank is the autopilot's at
 * its limits: it gathers rate at its acceleration, holds its greatest rate, and brakes to arrive at rest (its dead zones
 * and its single-jet braking are not modelled), by the shorter way unless the command says over the top; a command to
 * roll steadily is rolled at that rate. `law`: the computer's, where it is not the plan's own kind (a law under test).
 */
export function entryPilot(
  def: EntryDef,
  frame: Pick<EarthFrame, 'toInertial' | 'spin'>,
  from: number,
  hands?: EntryHands,
  law: EntryLaw | null = def.computer ? lawOf(def.computer, def.initial.value) : null,
): EntryPilot {
  const cycle = law?.cycle ?? CMC.DT;
  const place = unit(geodeticToEcef({ latitude: def.target.latitude.value, longitude: def.target.longitude.value, height: 0 }));
  const target = (at: number): Vec3 => unit(frame.toInertial(place, at));
  const [most, accel] = [def.roll.rate.value, def.roll.acceleration.value];
  let bank = hands?.bank ?? def.initial.value;
  let rate = 0;
  let wanted = bank;
  let overTop = false;
  let rolling: number | null = null;
  let t = from;
  let next = from;
  let [sum, span, before] = [0, 0, Number.NaN];
  let last: EntryCommand | null = null;
  const flown: EntryFlown = {
    banks: [{ t: from, bank }],
    sensed: Number.NaN,
    backup: Number.NaN,
    takeover: Number.NaN,
    final: Number.NaN,
    ended: Number.NaN,
    phases: [],
    reversals: 0,
    range: Number.NaN,
    cross: Number.NaN,
  };
  const steered = (at: number): boolean => lastAt(hands?.steered, at)?.on ?? true;

  /** The roll over `dt` from `at`: the stick's, or the autopilot's to the bank wanted. */
  const roll = (at: number, dt: number): void => {
    if (!steered(at)) {
      const stick = lastAt(hands?.rolls, at);
      const push = stick?.stick ?? 0;
      if (stick && !stick.hold) rate += push * accel * dt;
      else {
        const want = push * most;
        rate += clamp(want - rate, -accel * dt, accel * dt);
      }
      bank += rate * dt;
      wanted = bank;
      rolling = null;
      return;
    }
    if (rolling !== null) {
      rate += clamp(rolling - rate, -accel * dt, accel * dt);
      bank += rate * dt;
      wanted = bank;
      return;
    }
    const error = overTop ? wrap(wanted) - wrap(bank) : wrap(wanted - bank);
    // (the rate from which its braking brings it to rest on the bank wanted)
    const want = sign(error) * Math.min(most, Math.sqrt(2 * accel * Math.abs(error)));
    const change = clamp(want - rate, -accel * dt, accel * dt);
    if (Math.abs(error) <= Math.abs(rate + change) * dt && Math.abs(rate + change) <= accel * dt * 2) {
      bank += error;
      rate = 0;
      return;
    }
    rate += change;
    bank += rate * dt;
  };

  return {
    get bank() {
      return bank;
    },
    flown,
    advance(to, s, sensed) {
      const dt = Math.max(0, to - t);
      if (dt > 0) {
        sum += 0.5 * ((Number.isNaN(before) ? sensed : before) + sensed) * dt;
        span += dt;
        const steps = Math.ceil(dt / ROLL_STEP - 1e-9);
        for (let i = 0; i < steps; i++) roll(t + (i * dt) / steps, dt / steps);
        if (Math.abs(bank - flown.banks[flown.banks.length - 1]!.bank) > 1e-9) flown.banks.push({ t: to, bank });
      }
      before = sensed;
      t = to;
      if (to < next - 1e-9) return;
      // (the cycle: what the accelerometers gathered over it, as the computer reads them)
      const drag = span > 0 ? sum / span : sensed;
      [sum, span] = [0, 0];
      next = to - next > cycle ? to + cycle : next + cycle;
      if (Number.isNaN(flown.sensed) && drag >= CMC.G05 * G0) flown.sensed = to;
      const was = last;
      if (law && !(was?.ended ?? false)) {
        last = law.command({ t: to, r: s.r, v: s.v, sensed: drag, spin: frame.spin, target });
        flown.reversals = law.reversals;
        if (last.phase !== flown.phases[flown.phases.length - 1]?.phase) flown.phases.push({ t: to, phase: last.phase });
        if (last.phase === 'final' && Number.isNaN(flown.final)) flown.final = to;
        if (last.ended && Number.isNaN(flown.ended)) {
          flown.ended = to;
          flown.range = last.range;
          flown.cross = last.cross;
        }
      }
      if (!steered(to)) return;
      // (the record's crew, until they give the autopilot the commands: not on an entry a hand has had)
      const crew = hands?.steered?.some((x) => !x.on && x.t <= to) ? undefined : def.backup;
      if (crew && Number.isNaN(flown.takeover)) {
        if (Number.isNaN(flown.backup)) {
          if (drag < crew.from.value * G0) {
            wanted = def.initial.value;
            return;
          }
          // (begun part-way down with the load already past it: the crew's part is over, and the autopilot has the commands)
          if (to === from && law) flown.takeover = to;
          else flown.backup = to;
        }
        if (Number.isNaN(flown.takeover)) {
          const own = last && !last.ended && (last.rolling !== undefined || Math.abs(wrap(last.bank - def.initial.value)) > SAME);
          const given = own && to - flown.backup >= crew.least.value;
          if (!given) {
            wanted = crew.bank.value;
            overTop = false;
            return;
          }
          flown.takeover = to;
        }
      }
      if (last && !last.ended) {
        wanted = last.bank;
        overTop = last.overTop;
        rolling = last.rolling ?? null;
      } else if (!law) wanted = def.initial.value;
    },
  };
}

/** The bank an entry flew at `t`, degrees: the last it changed to at or before it; null before it began. */
export function bankFlown(banks: readonly { t: number; bank: number }[], t: number): number | null {
  let [low, high] = [0, banks.length - 1];
  if (high < 0 || banks[0]!.t > t) return null;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (banks[mid]!.t <= t) low = mid;
    else high = mid - 1;
  }
  return banks[low]!.bank;
}
