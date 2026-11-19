//! The fires of the Mercury capsule's solid motors: the escape rocket and the tower's jettison rocket, the three
//! retrorockets and the three posigrades. When each burns, and how hard, is the plan's (`redstone::TOWER_MOTORS`,
//! `RETRO`); here is where each nozzle is and what its fire is drawn from.
//!
//! Where a nozzle is and how wide is measured off `vehicle.glb` (the lowest ring of each bell in the nodes named),
//! so it is as sure as the model. No chamber or exit pressure for any of them was found in anything read, nor a
//! description of their fires' colour: those are estimates, and say what they were set by.

use sr_measure::Measure;

use crate::types::{Burns, Fire, Flame, Nozzle, PadAir, Vent};

/// What a polysulfide and ammonium perchlorate grain, not aluminised, burns as (`src/viewer/flames.ts`,
/// `solid-perchlorate`): bright and yellow-white. No film of it in colour was found: estimated.
const COLOURS: [[f32; 3]; 5] =
    [[1.0, 0.97, 0.9], [1.0, 0.93, 0.8], [1.0, 0.75, 0.42], [1.0, 0.5, 0.2], [1.0, 0.85, 0.62]];

/// A small solid motor's chamber, Pa.
const CHAMBER: Measure = Measure::estimated(
    1000.0 * 6894.757,
    "1,000 psia, usual for a small solid motor of the time: none of these motors' chamber pressures was found",
);
/// The burned gas's ratio of specific heats.
const GAMMA: Measure = Measure::estimated(1.2, "as the A-7's: one figure for every fire (plume.ts, GAMMA)");
/// How bright the fire is through its heart.
const LUMINANCE: Measure = Measure::estimated(
    16_000.0,
    "twice the alcohol flame's (flames.ts, solid-perchlorate, luminous 2): its smoke glows as soot does",
);
/// How much of what is behind it the fire hides.
const HIDES: Measure = Measure::estimated(
    0.45,
    "its smoke hides about half of what is behind it at the nozzle (flames.ts, opacity 2, against the alcohol \
     flame's none): MR-1's capsule was left \"surrounded by the smoke\" of its escape rocket (TM X-53107, 8.2.1)",
);

const fn flame(
    node: &'static str,
    exit_height: Measure,
    exit_radius: Measure,
    exit_pressure: Measure,
) -> Flame {
    Flame {
        node,
        exit_height,
        exit_radius,
        exit_pressure,
        chamber_pressure: CHAMBER,
        gamma: GAMMA,
        length: Measure::estimated(40.0, "exit radii at sea level: as the A-7's, for want of film"),
        luminance: LUMINANCE,
        hides: HIDES,
        colours: COLOURS,
    }
}

const fn nozzle(across: [f64; 2], cant: Measure) -> Nozzle {
    Nozzle { across, cant }
}

/// Fired at the sea or above the air alike: a nozzle let out to about the sea's pressure.
const AT_SEA: Measure = Measure::estimated(
    101_325.0,
    "an atmosphere: the escape rocket had to pull the capsule off the pad, so its nozzles are taken as matched there",
);
/// Fired only above the air: a nozzle let out further.
const ALOFT: Measure = Measure::estimated(
    0.3 * 101_325.0,
    "three tenths of an atmosphere: a motor fired only in space is let out further than one fired at the sea",
);

const ESCAPE_CANT: Measure = Measure::documented(
    19.0,
    "McDonnell SEDR 104 (1962): the escape rocket's three nozzles, canted 19 degrees",
);
const STRAIGHT: Measure =
    Measure::derived(0.0, "the model's nozzle is straight aft: the cant of the real one was not found");

/// Every fire of the capsule but its booster's.
pub static FIRES: [Fire; 6] = [
    Fire {
        name: "Escape rocket",
        flame: flame(
            "EscapeTower",
            Measure::derived(4.834, "the lowest ring of Tower_EscapeNozzles in vehicle.glb"),
            Measure::derived(0.07, "half the width of one bell's lowest ring in Tower_EscapeNozzles"),
            AT_SEA,
        ),
        nozzles: &[
            nozzle([0.19, -0.051], ESCAPE_CANT),
            nozzle([-0.051, 0.19], ESCAPE_CANT),
            nozzle([-0.139, -0.139], ESCAPE_CANT),
        ],
        burns: Burns::Tower(0),
    },
    Fire {
        name: "Tower jettison rocket",
        flame: flame(
            "EscapeTower",
            Measure::derived(4.902, "the lowest ring of Tower_JettisonNozzle in vehicle.glb"),
            Measure::derived(0.058, "half the width of Tower_JettisonNozzle's lowest ring"),
            AT_SEA,
        ),
        // (SEDR 104 has it a tri-nozzle canted 30 degrees; the model has one bell on the axis, and so has this)
        nozzles: &[nozzle([0.0, 0.0], STRAIGHT)],
        burns: Burns::Tower(1),
    },
    Fire {
        name: "Posigrade rockets",
        flame: flame(
            "Retropack",
            Measure::derived(-0.645, "the lowest ring of Retropack_PosigradeNozzles in vehicle.glb"),
            Measure::derived(0.025, "half the width of one bell in Retropack_PosigradeNozzles"),
            ALOFT,
        ),
        nozzles: &[
            nozzle([0.236, 0.063], STRAIGHT),
            nozzle([-0.172, 0.172], STRAIGHT),
            nozzle([-0.063, -0.236], STRAIGHT),
        ],
        burns: Burns::Posigrade(Measure::documented(1.0, "NASA SP-45, Table 3-III: 400 lbf each for 1 s")),
    },
    // (each retrorocket is a fire of its own: each burns at its own time)
    retro("Retrorocket 1", 0, &[nozzle([0.046, 0.172], STRAIGHT)]),
    retro("Retrorocket 2", 1, &[nozzle([-0.172, -0.046], STRAIGHT)]),
    retro("Retrorocket 3", 2, &[nozzle([0.126, -0.126], STRAIGHT)]),
];

const fn retro(name: &'static str, which: usize, nozzles: &'static [Nozzle]) -> Fire {
    Fire {
        name,
        flame: flame(
            "Retropack",
            Measure::derived(-0.686, "the lowest ring of Retropack_RetroNozzles in vehicle.glb"),
            Measure::derived(0.088, "half the width of one bell in Retropack_RetroNozzles"),
            ALOFT,
        ),
        nozzles,
        burns: Burns::Retro(which),
    }
}

/// The air at Complex 5 as Freedom 7 left it: the day's wind at the ground, and what the blast made of the
/// apron and of its own first fire. (It is here with the fires because they are what it is drawn for.)
pub const MR3_PAD_AIR: PadAir = PadAir {
    wind_from: Measure::documented(90.0, "ISD, Cape Canaveral, 09:00 EST: the wind at the ground, from 090"),
    wind_speed: Measure::documented(
        5.1,
        "ISD, Cape Canaveral, 09:00 EST: 5.1 m/s (the flight's own report has 12 knots at liftoff)",
    ),
    dust: Measure::estimated(
        0.006,
        "set so the blast leaves a thin whitish-tan haze over the concrete for 15 to 25 m, as the stills of MR-3 \
         just off the pad have it (NASA S61-01928, 6100884): a swept apron gives up little",
    ),
    dust_over: Measure::estimated(
        6.0,
        "m/s: fine dust on a hard surface begins to lift in a wind of about that; the day's own 5 m/s raised none",
    ),
    vapour: Measure::estimated(
        4.5,
        "set so the engine's lighting throws up the compact white billow, some 10 m across and 3 m high, that \
         stands round the launcher in the still of MR-3's ignition (NASA S61-02407)",
    ),
    vapour_lasts: Measure::estimated(
        1.0,
        "s: by liftoff the billow of S61-02407 has gone to the thin haze of S61-01928",
    ),
    vents: &VENTS,
};

/// Where the oxygen tank's vent is taken to be: 6 m above the tail's foot, on the skin.
const VENT_AT: [f64; 3] = [0.9, -12.2, 0.0];

/// What the Redstone lets into the air from its oxygen tank: the boil-off vented on the pad until the tank is
/// shut for pressurising, and the vapour and frost that stream off the cold tank as it lifts.
///
/// The oxygen tank is the lower of the two, and vents through a line to a fitting on its skin
/// (heroicrelics.org, the centre unit, from "This is Redstone"). Which side the fitting is on, and exactly how
/// high, was not found: a night still of a Mercury-Redstone on the pad (NASA S61-03158) has a white plume from
/// one side some 6 m up and a white cloud lying on the ground under it. Every strength here is estimated.
const VENTS: [Vent; 2] = [
    Vent {
        name: "Oxygen tank vent",
        at: VENT_AT,
        toward: [1.0, -0.15, 0.0],
        speed: Measure::estimated(
            5.0,
            "m/s: a plume that carries a metre or two before it falls (S61-03158)",
        ),
        cold: Measure::estimated(
            45.0,
            "K colder than the air once mixed: it falls and lies on the ground (S61-03158)",
        ),
        vapour: Measure::estimated(1.6, "a plume white enough to hide the skin behind it (S61-03158)"),
        from: Measure::estimated(-1.0e9, "vented from loading"),
        until: Measure::estimated(
            -33.0,
            "TM X-53107, the countdown (p. 7-33): the firing command at T-35 s, then \"vent valves closed\", before \
             missile power at T-14 s: taken as two seconds after the command",
        ),
    },
    Vent {
        name: "Vapour off the oxygen tank at liftoff",
        at: VENT_AT,
        toward: [0.25, -1.0, 0.0],
        speed: Measure::estimated(
            6.0,
            "m/s down the skin: a white sheet streaming down one side (NASA S61-01928)",
        ),
        cold: Measure::estimated(25.0, "K: it trails below the tail and thins there (S61-01928, S61-01927)"),
        vapour: Measure::estimated(1.2, "white against the airframe for some 8 m below the vent (S61-01928)"),
        from: Measure::estimated(-0.3, "as the vehicle first moves"),
        until: Measure::estimated(5.0, "s: gone in the stills taken once the vehicle is clear of the gantry"),
    },
];
