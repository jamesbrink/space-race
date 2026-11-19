//! Every figure the sound is worked from, each with its confidence and where it came from (`AGENTS.md`: "every
//! number carries a confidence"). The path a sound takes is physics and is in `air` and `path`; these are the
//! source levels, the losses and the choices, and nearly all of them are estimates. [`all`] lists them.
//!
//! What was read for them was read by search in November 2026 and is quoted as found; the web build's own
//! figures (`src/sound/model.ts`) are kept where nothing better was found, and say so.

use sr_measure::Measure;

/// The share of a jet's mechanical power (thrust times exhaust speed over two) that leaves as sound.
pub const EFFICIENCY: Measure = Measure::estimated(
    0.005,
    "NASA SP-8072 (1971), 2.1.1: rockets' acoustic efficiencies \"range between 0.2 and 1.0 percent\", with \"0.5 \
     percent as the most probable value\"; the A-7's own was not found measured. The web build's figure",
);
/// The Strouhal number, on the nozzle's exit diameter and exhaust speed, at which the engine's spectrum peaks.
pub const STROUHAL: Measure = Measure::estimated(
    0.02,
    "SP-8072, 2.1.2 and Figure 5: \"the maximum at a Strouhal number of approximately 0.02\"; a broad peak, and \
     the slopes either side of it are a curve that was not read",
);
/// The angle from the exhaust's direction at which the noise is strongest, degrees, how much stronger it is
/// there than abeam, dB, and how much weaker straight ahead of the vehicle, dB.
pub const LOBE: Measure = Measure::estimated(
    60.0,
    "SP-8072: strongest \"approximately 50 to 70 degrees\" from the direction of the flow (\"about 50\" elsewhere \
     in it)",
);
/// As [`LOBE`].
pub const LOBE_GAIN: Measure =
    Measure::estimated(4.0, "ours: SP-8072's directivity curves were not read, only the angle of their peak");
/// As [`LOBE`].
pub const SHADOW: Measure = Measure::estimated(8.0, "ours: how much less is heard from ahead of the vehicle");
/// No source is nearer than this, m: an engine's noise comes from tens of metres of plume, not a point.
pub const NEAR: Measure = Measure::estimated(10.0, "the web build's figure: ours");
/// The exhaust speed taken for the small solid rockets, and for the peroxide jets, m/s.
pub const SMALL_EXHAUST: Measure = Measure::estimated(
    2400.0,
    "the web build's figure: typical of a solid motor of the time, none is in the plan",
);
/// As [`SMALL_EXHAUST`].
pub const JET_EXHAUST: Measure =
    Measure::estimated(1000.0, "the web build's figure: decomposed peroxide's, to the nearest hundred");
/// The thrust of the jets a stick held over fires, N.
pub const JET_THRUST: Measure = Measure::estimated(
    107.0,
    "24 lbf, the high pitch and yaw jets' as remembered (McDonnell SEDR 104, not read for this); which jets a \
     stick fires and how hard is not modelled",
);

/// The level put at full scale, dB, how many decibels of level make one of gain, and the level under which
/// nothing is played: a choice, not physics. 140 dB at the pad and 60 dB of surf cannot both be reproduced.
pub const FULL: Measure = Measure::estimated(140.0, "the web build's choice (`loudness`)");
/// As [`FULL`].
pub const SQUEEZE: Measure = Measure::estimated(2.0, "the web build's choice");
/// As [`FULL`].
pub const FLOOR: Measure = Measure::estimated(38.0, "the web build's choice");

/// What the cabin's wall takes from the noise outside it, and what the helmet takes from the cabin's, dB.
pub const WALL: Measure = Measure::assumed(
    20.0,
    "NASA SP-45, Table 10-IV, p. 188: \"150 db outside spacecraft, 130 db inside spacecraft\" for Redstone and \
     Atlas launches, the design environment, taken for this flight; NASA TM X-53107, Table 6-1, has 123 dB \
     outside and 101 dB inside a boilerplate capsule at 1000 c/s in a static firing. (The web build guesses 34.)",
);
/// As [`WALL`].
pub const HELMET: Measure = Measure::assumed(20.0, "the same table of SP-45: 130 inside, \"110 db at ear\"");
/// What the structure loses carrying the engine's sound to the cabin, and a small rocket bolted to the
/// spacecraft its own, dB.
pub const STRUCTURE: Measure = Measure::estimated(46.0, "the web build's guess: nothing measured was found");
/// As [`STRUCTURE`].
pub const BOLTED: Measure = Measure::estimated(24.0, "the web build's guess");
/// What the air's noise loses on its way to ears under the drogue, and under the main parachute, dB.
pub const CANOPY: [Measure; 2] = [
    Measure::estimated(22.0, "the web build's guess: heard in the open through the recovery section"),
    Measure::estimated(12.0, "the web build's guess: heard in the lines and the canopy"),
];
/// The pressure that fluctuates on the skin under an attached boundary layer, over dynamic pressure.
pub const SKIN: Measure = Measure::estimated(
    0.006,
    "Robertson, Wyle WR 71-10 (NASA CR-119947, 1971): 0.006 for attached flow; its fall with Mach number, \
     1 / (1 + 0.14 M^2), is Lowson's as remembered, not read",
);
/// The same under separated flow, before its own fall with Mach number, 1 / (1 + M^2).
pub const SEPARATED: Measure = Measure::estimated(
    0.045,
    "the same report: expansion-induced separation, p_rms / q = 0.045 / (1 + M^2). That the capsule's shoulder \
     and tower shed such a flow from Mach 0.6 up is ours; at Mach 1 it makes the 150 dB outside of SP-45",
);
/// What a camera's own windscreen takes from the wind on it, dB.
pub const WINDSCREEN: Measure =
    Measure::estimated(20.0, "ours: a chase camera is an idea, and how it would be shielded is not a fact");

/// Carlson's shape factor for the whole vehicle, and for the capsule alone. His Sample Problem 1 has it as
/// `0.685 sqrt(A) / (l^(3/4) le^(1/4))` for a body `l` long whose greatest effective section, `A`, is `le` from its nose.
pub const SHAPE_STACK: Measure = Measure::estimated(
    0.09,
    "NASA TP-1122, Appendix B: 0.06 by that formula for the bare vehicle (25.4 m long, its greatest section the \
     capsule's, 2.82 sq m some 8 m from the tower's tip). Its plume, which made the Saturn V's 0.68, is not \
     sized here: 0.09 taken, the aircraft of his examples being 0.087 and 0.088",
);
/// As [`SHAPE_STACK`].
pub const SHAPE_CAPSULE: Measure = Measure::estimated(
    0.75,
    "the same formula for the capsule (2.98 m long, 2.82 sq m), with the effective length a ninth of its \
     diameter as TP-1122 (p. 14) has the Apollo command module's (0.42 m). It says those predictions are \"far \
     from exact\"; this one makes 27 Pa and a third of a second at the sea from 25 km, where Apollo 15 and 16's \
     larger capsules measured 17 to 38 Pa and 0.14 to 0.39 s (NASA TN D-6950, TN D-7606)",
);
/// How long an N-wave's shocks take to rise, s.
pub const RISE: Measure = Measure::assumed(
    0.005,
    "NASA TN D-6950: Apollo 15's booms rose in 5 to 6 ms on ascent and 5 to 10 ms at entry (Apollo 16's: 4 to 43)",
);
/// What standing on the ground adds to a boom, and what the sea sends back up, as shares of the wave's own.
pub const ON_GROUND: Measure =
    Measure::assumed(1.9, "TP-1122: the reflection factor \"assumed to be 2.0\", measured 1.8 to 2.0");
/// As [`ON_GROUND`].
pub const SEA_ECHO: Measure = Measure::estimated(0.95, "ours: calm water sends nearly all of it back");

/// The three posigrade rockets' thrust together, N, and their burning time, s.
pub const POSIGRADE: [Measure; 2] = [
    Measure::documented(3.0 * 400.0 * 4.448_221_6, "NASA SP-45, Table 3-III, p. 53: three of 400 lb"),
    Measure::documented(1.0, "NASA SP-45, Table 3-III: 1 s"),
];
/// How long after the main parachute comes out it is let open fully, s.
pub const REEFED: Measure = Measure::estimated(
    4.0,
    "the reefing's time as remembered, not read. Results of the First U.S. Manned Suborbital Space Flight has \
     \"two closely timed, brief acceleration spikes with a maximum of 4g\" at deployment and unreefing",
);

/// The inverters' frequency, Hz.
pub const INVERTER: Measure = Measure::documented(
    400.0,
    "NASA TM X-58054, Table II: Mercury's three inverters, \"400 +/- 1 percent\" Hz, 115 V",
);
/// The level at the ear of the cabin's and suit's fans, of the inverters' whine, and of the jets, dB.
pub const FANS: Measure = Measure::estimated(
    62.0,
    "ours. Shepard remarked on neither the fans nor the inverters; he \"did not even have to turn up my radio \
     receiver to full volume\"",
);
/// As [`FANS`].
pub const WHINE: Measure = Measure::estimated(50.0, "ours");
/// As [`FANS`].
pub const JETS_INSIDE: Measure = Measure::estimated(
    58.0,
    "Shepard's debriefing (Results of the Second U.S. Manned Suborbital Space Flight, p. 38): \"I did not hear the \
     noise of the manual jets firing\": so under the cabin's own bed, where it is put",
);

/// The peak level a metre from each kind of thing that happens once, dB: a bolt or a ring of them fired, the
/// drogue's mortar, the main parachute snatching open, a booster breaking up, a relay, and (at 1 m/s, growing with
/// the square of the speed) something striking the ground or the sea.
pub const BANGS: [Measure; 6] = [
    Measure::estimated(150.0, "ours: explosive bolts; no level was found"),
    Measure::estimated(154.0, "ours: a mortar"),
    Measure::estimated(128.0, "ours: 63 ft of ringsail filling"),
    Measure::estimated(166.0, "ours: tanks bursting"),
    Measure::estimated(66.0, "ours: a relay, at the ear, heard in the cabin only"),
    Measure::estimated(112.0, "ours"),
];

/// A place's quiet, as gains of full scale: wind, surf, a far hum of machinery, and the water round a spacecraft
/// that has come down. The place's own data, which `sr-missions` does not yet carry.
pub const CAPE_QUIET: [Measure; 4] = [
    Measure::estimated(0.05, "the web build's `PlaceDef.quiet` for Cape Canaveral: wind"),
    Measure::estimated(0.035, "the same: surf"),
    Measure::estimated(0.006, "the same: hum"),
    Measure::estimated(0.12, "the same: the sea round a spacecraft that is down"),
];
/// The mains' frequency at the place, Hz.
pub const CAPE_MAINS: Measure =
    Measure::documented(60.0, "the web build's `PlaceDef.mains`: the Cape's grid was American");

/// Faster than this the flight is not played as it sounds but kept as a low bed, with nothing that happens once.
pub const FASTEST: f64 = 2.0;

/// Every figure above, for a test to hold to the rule and for anyone asking what was guessed.
#[must_use]
pub fn all() -> Vec<Measure> {
    let mut all = vec![
        EFFICIENCY,
        STROUHAL,
        LOBE,
        LOBE_GAIN,
        SHADOW,
        NEAR,
        SMALL_EXHAUST,
        JET_EXHAUST,
        JET_THRUST,
        FULL,
        SQUEEZE,
        FLOOR,
        WALL,
        HELMET,
        STRUCTURE,
        BOLTED,
        SKIN,
        SEPARATED,
        WINDSCREEN,
        SHAPE_STACK,
        SHAPE_CAPSULE,
        RISE,
        ON_GROUND,
        SEA_ECHO,
        REEFED,
        INVERTER,
        FANS,
        WHINE,
        JETS_INSIDE,
        CAPE_MAINS,
    ];
    all.extend(CANOPY);
    all.extend(POSIGRADE);
    all.extend(BANGS);
    all.extend(CAPE_QUIET);
    all
}

#[cfg(test)]
mod tests {
    use super::*;
    use sr_measure::Confidence;

    #[test]
    fn every_figure_says_where_it_came_from_and_a_documented_one_names_a_document() {
        for figure in all() {
            assert!(figure.source.len() > 3, "{figure:?}");
            if figure.confidence == Confidence::Documented {
                assert!(
                    ["NASA", "Table", "web build"].iter().any(|named| figure.source.contains(named)),
                    "{figure:?}"
                );
            }
        }
        // Most of sound is guessed, and says so.
        let guessed = all().iter().filter(|figure| figure.is_estimate()).count();
        assert!(guessed > 25, "{guessed}");
    }
}
