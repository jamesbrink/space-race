/**
 * The orbit attitude and manoeuvre system's eight attitude chambers as the simulator flies the spacecraft's attitude with
 * them alone in orbit (sim/attitude.ts), with the attitude control electronics' figures: what is the type's and names no
 * flight. Gemini spacecraft No. 3 and later alike.
 *
 * SEDR 300, Section VIII, Figure 8-72 (p. 8-256), numbers each chamber and what it does: 5 and 6 pitch up, 1 and 2 pitch
 * down, 3 and 4 yaw right, 7 and 8 yaw left, 3 and 7 roll clockwise, 4 and 8 roll counterclockwise. It draws them on the
 * adapter's aft rim in four pairs, 6 and 7, 4 and 5, 2 and 3, 1 and 8, each pair one chamber firing up or down and one
 * firing to the side: read so, the pairs stand at 45 degrees from the vertical and every chamber fires outward, so that
 * a pitch chamber gives pitch alone in its pair and a side chamber gives both yaw and roll, its partner in yaw cancelling
 * its roll and its partner in roll its yaw, as the figure's table has them. A side chamber is listed once for each
 * command that opens it (sim/attitude.ts opens it once for both). The body's axes: +X to the nose, +Y to the right, +Z up.
 */
import { assumed, doc, estimated } from '../../../../src/measure.ts';
import type { ThrusterSet } from '../../../../src/sim/plan.ts';
import type { Thruster } from '../../../../src/types.ts';

const IN = 0.0254;
const LB = 0.45359237;
const LBF = 4.448221615;

const SEDR = 'Project Gemini Familiarization Manual, SEDR 300, vol. 1, Section VIII (McDonnell, 30 September 1965)';
const SP121 = 'Gemini Midprogram Conference, NASA SP-121 (1966), Table 4-I, p. 29';
/** Where the pairs stand: on the aft rim, this far from the axis and this far aft of the centre of mass, m. Ours. */
const RIM = 58 * IN;
const AFT = -85 * IN;
const PLACED =
  'on the adapter’s aft rim as Figure 8-72 draws them, the pairs read at 45 degrees from the vertical: 58 in from the axis (the adapter is 120 in across at its base) and 85 in aft of the centre of mass, neither dimensioned in anything read. Ours';

const THRUST = doc(
  23 * LBF,
  `${SP121}: the orbit attitude and manoeuvre system's attitude chambers, 8 × 23 lb at 258 s (SEDR 300, p. 8-260, rounds them to "twenty-five pound")`,
);

/** Chamber `n` at the pair standing at `side` (+1 right, -1 left) and `up` (+1, -1), firing out vertically (`vertical`) or to the side. */
function chamber(n: number, side: 1 | -1, up: 1 | -1, vertical: boolean, command: Thruster['axis'], label: string): Thruster {
  const c = RIM / Math.SQRT2;
  const at: Thruster['at'] = [AFT, side * c, up * c];
  const push: Thruster['push'] = vertical ? [0, 0, -up] : [0, -side, 0];
  const torque = [at[1] * push[2] - at[2] * push[1], at[2] * push[0] - at[0] * push[2], at[0] * push[1] - at[1] * push[0]];
  const i = { roll: 0, pitch: 1, yaw: 2 }[command];
  return {
    name: `TCA ${n}`,
    supply: 'oams',
    axis: command,
    sense: torque[i]! > 0 ? 1 : -1,
    at,
    push,
    thrust: THRUST.value,
    confidence: 'estimated',
    source: `${SEDR}, Figure 8-72 (p. 8-256): TCA ${n}, ${label}. Placed ${PLACED}. ${THRUST.source}`,
  };
}

/** The eight attitude chambers, each side chamber once for yaw and once for roll. */
export const OAMS_ATTITUDE: Thruster[] = [
  chamber(5, -1, 1, true, 'pitch', 'pitch up'),
  chamber(6, 1, 1, true, 'pitch', 'pitch up'),
  chamber(1, 1, -1, true, 'pitch', 'pitch down'),
  chamber(2, -1, -1, true, 'pitch', 'pitch down'),
  chamber(3, -1, -1, false, 'yaw', 'yaw right'),
  chamber(4, -1, 1, false, 'yaw', 'yaw right'),
  chamber(7, 1, 1, false, 'yaw', 'yaw left'),
  chamber(8, 1, -1, false, 'yaw', 'yaw left'),
  chamber(3, -1, -1, false, 'roll', 'roll clockwise'),
  chamber(7, 1, 1, false, 'roll', 'roll clockwise'),
  chamber(4, -1, 1, false, 'roll', 'roll counterclockwise'),
  chamber(8, 1, -1, false, 'roll', 'roll counterclockwise'),
];

/** What the orbit attitude and manoeuvre system's attitude control adds to its thruster set. */
export const OAMS_ATTITUDE_SET: Pick<ThrusterSet, 'chambers' | 'supplies' | 'inertia' | 'minimum' | 'deadband' | 'rateband'> = {
  chambers: OAMS_ATTITUDE,
  supplies: [
    {
      name: 'oams',
      mode: 'manual',
      propellant: estimated(
        (120 + 246) * LB,
        'Gemini Program Mission Planning Report, Working Paper 5019 (TM X-69194), Table 3-I, p. 3-15: spacecraft 3’s planned load, 120 lb of fuel and 246 lb of oxidizer, taken for every ship: the later ones carried more (not read), and what the manoeuvres drew before a hand takes the attitude is not taken off',
      ),
      isp: doc(258, `${SP121}: the attitude chambers' specific impulse`),
    },
  ],
  // (no mass properties of a Gemini spacecraft have been read)
  inertia: [
    {
      mass: estimated(3600, 'a Gemini spacecraft in orbit, about 8,000 lb'),
      roll: estimated(
        2700,
        'a solid frustum of the spacecraft’s envelope, 19 ft long and 10 ft across the adapter’s base (SEDR 300, Figure 2-3), at 3,600 kg: 0.3 m (R^5 - r^5)/(R^3 - r^3). No mass properties of a Gemini spacecraft read',
      ),
      pitch: estimated(
        8000,
        'the same frustum about its centre across the long axis, its mass taken nearer the wide end. No mass properties read',
      ),
      yaw: estimated(8000, 'as pitch: the spacecraft is near enough round'),
    },
  ],
  minimum: doc(
    0.018,
    `${SEDR}, p. 8-28: "An 18 millisecond switch on time control is provided by the minimum pulse" circuit; the horizon scan mode's pulses are 18 ms, p. 8-24`,
  ),
  deadband: assumed(
    5,
    `${SEDR}, p. 8-24: the horizon scan mode holds pitch and roll "to within ±5 degrees", its "5 degree control deadband"; taken for the hold, which the platform mode's own figure (not read) may have held closer`,
  ),
  rateband: doc(
    0.2,
    `${SEDR}, p. 8-23: in rate command, with the hand controller let go, "spacecraft rates about each axis are damped to within ±0.2 degrees/second with OAMS attitude control"`,
  ),
};
