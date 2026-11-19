//! The Mercury-Redstone stack: what is the same on every flight of it
//! (`missions/usa/mercury/vehicles/mercury-redstone.ts`; the prose is `redstone-mrlv.md` and `mercury-capsule.md`).

use std::f64::consts::PI;

use sr_measure::{Confidence, Measure};
use sr_sim::plan::{Chute, Motor};
use sr_sim::{Curve, Limits};
use sr_world::earth::G0;

use crate::types::{Flame, Fragment, Parts, Solid, Solids};

/// An inch, a foot, a pound-force and a pound, in SI.
pub const IN: f64 = 0.0254;
/// A foot, m.
pub const FT: f64 = 0.3048;
/// A pound-force, N.
pub const LBF: f64 = 4.448_221_6;
/// A pound, kg.
pub const LB: f64 = 0.453_592_37;

/// The capsule's greatest cross-section, 74.5 in across: what TM X-491's coefficients are referred to.
pub const AREA: Measure = Measure::derived(
    PI * (74.5 * IN) * (74.5 * IN) / 4.0,
    "the capsule is 74.5 in across at its widest (CR-649): 30.27 sq ft",
);

/// What is left at a cutoff: everything, less the propellant the engine has passed.
#[must_use]
pub const fn cutoff_mass(liftoff: f64, thrust: f64, isp: f64, cutoff: f64) -> f64 {
    liftoff - thrust / (G0 * isp) * cutoff
}

/// The A-7's nozzle exit area, derived on MR-3's cutoff: the same engine on every flight.
pub const EXIT_AREA: Measure = Measure::derived(
    (6.3 * G0 * cutoff_mass(66_098.0 * LB, 78_860.0 * LBF, 214.8, 141.8) - 78_860.0 * LBF) / 101_325.0,
    "MR-3 Postlaunch Report, 4.2: the load at cutoff was 6.3 g, so the thrust there, in near vacuum, was 6.3 times \
     the weight left: 88,450 lbf, 9,590 lbf more than at sea level, which over one atmosphere is 652 sq in",
);

/// How long the A-7 can burn before a propellant runs out.
pub const BURN_LIMIT: Measure = Measure::estimated(
    143.5,
    "NASA TM X-53107, section 4: a nominal burning time of 143.5 s, taken as when a propellant would have run out, \
     which the report does not say: documented as a burning time, an estimate as this input",
);

/// The tilt programme as TM X-53107 draws it (Figure 4-9), stretched to begin at 15.0 s as MR-3's did.
const fn stretched(t: f64) -> f64 {
    15.0 + (t - 24.3) * (131.7 - 15.0) / (131.7 - 24.3)
}

/// Degrees from the launch vertical against seconds, in the plane of the azimuth.
pub const TILT: Curve = Curve {
    points: &[
        (stretched(24.3), 0.0),
        (stretched(30.0), 1.4),
        (stretched(40.0), 3.3),
        (stretched(50.0), 6.8),
        (stretched(60.0), 10.6),
        (stretched(70.0), 16.3),
        (stretched(80.0), 21.0),
        (stretched(90.0), 26.7),
        (stretched(100.0), 31.0),
        (stretched(110.0), 34.9),
        (stretched(120.0), 37.9),
        (stretched(130.0), 40.7),
        (stretched(131.7), 41.0),
    ],
    confidence: Confidence::Estimated,
    source: "documented: begins 15.0 s, arrested 131.7 s (NASA TM X-53107, Table 3-1), 41 degrees at the end (Figure \
             4-9; Table 8-1). Estimated: the curve between, which is Figure 4-9 stretched from its 24.3 s beginning",
};

/// Drag coefficient against Mach number going up on the booster.
pub const ASCENT_DRAG: Curve = Curve {
    points: &[
        (0.0, 0.52),
        (0.5, 0.56),
        (0.8, 0.66),
        (1.0, 0.9),
        (1.1, 0.92),
        (1.5, 0.8),
        (2.0, 0.7),
        (2.5, 0.58),
        (3.0, 0.48),
        (4.0, 0.36),
        (5.0, 0.31),
        (6.0, 0.3),
        (7.0, 0.3),
    ],
    confidence: Confidence::Estimated,
    source: "NASA TM X-491 (Brown and Moseley, 1961), Figure 20: the capsule with its escape tower, alone in the \
             tunnel, read to about 0.02. The booster's skin, fins and base are taken to cancel the capsule's missing \
             wake, which nobody measured for us",
};

/// Drag coefficient against Mach number coming down heat shield first.
pub const ENTRY_DRAG: Curve = Curve {
    points: &[
        (0.0, 1.0),
        (0.5, 1.05),
        (0.8, 1.2),
        (1.0, 1.3),
        (1.5, 1.42),
        (2.0, 1.52),
        (3.0, 1.57),
        (4.0, 1.6),
        (20.0, 1.6),
    ],
    confidence: Confidence::Documented,
    source: "NASA TM X-491, Figure 22: the re-entry configuration at no angle of attack, Mach 0.5 to 20, read to \
             about 0.03",
};

/// One retrorocket.
pub const RETRO: Motor = Motor {
    thrust: Measure::documented(992.0 * LBF, "McDonnell SEDR 104: 992 lbf"),
    burn: Measure::documented(13.2, "McDonnell SEDR 104: 13.2 s"),
};

/// The motors that carry the tower away on a normal flight: both fire (Hammack and Heberlig, p. 15).
pub const TOWER_MOTORS: [Motor; 2] = [
    Motor {
        thrust: Measure::documented(52_000.0 * LBF, "NASA SP-45, Table 3-III: the escape rocket, 52,000 lbf"),
        burn: Measure::documented(
            0.78,
            "the same table: 56,500 lb-s, so 0.78 s at that thrust (the web build flies its curve)",
        ),
    },
    Motor {
        thrust: Measure::documented(
            800.0 * LBF,
            "NASA SP-45, Table 3-III: the tower jettison motor, 800 lbf nominal",
        ),
        burn: Measure::documented(1.5, "the same table: 1.5 s"),
    },
];

/// The drogue: a 6 ft conical ribbon parachute, out at 21,000 ft.
pub const DROGUE: Chute = Chute {
    below: Measure::documented(
        21_000.0 * FT,
        "Results of the First U.S. Manned Suborbital Space Flight, p. 7",
    ),
    drag_area: Measure::estimated(
        0.5 * PI * (3.0 * FT) * (3.0 * FT),
        "a 6 ft conical ribbon parachute (Hammack p. 9) at a drag coefficient of 0.5, the usual figure for the type",
    ),
    fills: Measure::estimated(1.0, "a small ribbon parachute fills in about a second: not recorded"),
    diameter: Measure::documented(6.0 * FT, "Hammack p. 9: a 6 ft conical ribbon drogue"),
};

/// The main parachute: a 63 ft ringsail, out at 10,000 ft.
pub const MAIN: Chute = Chute {
    below: Measure::documented(10_000.0 * FT, "Results, p. 7; Hammack p. 9: main parachute at 10,000 ft"),
    drag_area: Measure::derived(
        2.0 * 2579.0 * LB * G0 / (1.225 * (29.0 * FT) * (29.0 * FT)) - AREA.value,
        "what brings Freedom 7's re-entry weight (2,579.0 lb) down at 29 ft/s at sea level (Hammack p. 25), less the \
         capsule's own drag",
    ),
    fills: Measure::estimated(
        9.0,
        "out reefed at 10:15, full at 10:28 by Shepard's calls: nine seconds, evenly, is ours",
    ),
    diameter: Measure::documented(63.0 * FT, "Hammack p. 9: a 63 ft ringsail main parachute"),
};

/// The spent booster's drag area as it tumbles.
pub const BOOSTER_DRAG_AREA: Measure = Measure::estimated(
    20.0,
    "between nose-on (2.8 sq m at 0.8) and broadside (42 sq m, the web build's side area): it tumbled, and nobody \
     measured it",
);

/// How the stack's model comes apart, by its top-level nodes (`vehicles/mercury-redstone-stack.ts`).
pub const PARTS: Parts = Parts {
    tower: &["EscapeTower"],
    capsule: &[
        "AntennaCanister",
        "RecoveryCompartment",
        "Hatch",
        "Afterbody",
        "CrewCabin",
        "HeatShield",
        "Retropack",
    ],
    booster: &[
        "RedstoneAdapter",
        "RedstoneAftUnit",
        "RedstoneCenterUnit",
        "RedstoneTailUnit",
        "RedstoneEngine",
    ],
    retropack: "Retropack",
    canister: "AntennaCanister",
    chute_height: 2.08,
};

/// What the stack stands. None of it is a published limit: each is set where the flights that were flown stayed
/// well inside it and a careless one does not.
pub const LIMITS: Limits = Limits {
    bending: Measure::estimated(
        4000.0,
        "five degrees off the wind at the greatest dynamic pressure: launch vehicles are flown to limits of this \
         order (the Shuttle's was about 3,000 psf degrees, 2,500 Pa rad); the Redstone's own has not been found",
    ),
    stack_load: Measure::estimated(
        12.0,
        "twice the 6.3 g of cutoff (the Postlaunch Report, 4.2): the booster's own limit has not been found",
    ),
    capsule_load: Measure::estimated(
        25.0,
        "past the 20 g the couch and the man were tried to on the centrifuge, and twice Freedom 7's 11 g",
    ),
};

/// The stack as the physics takes it: sizes off vehicle.glb, the centres of mass estimated.
pub const SOLIDS: Solids = Solids {
    tower: Solid {
        span: [2.036, 7.228],
        radius: 0.43,
        pointed: false,
        balance: Measure::estimated(
            4.3,
            "a little below the middle of the truss: the rocket is at its top, the ring at its foot",
        ),
    },
    // The capsule is a 20 degree cone from the heat shield to where the canister ends.
    capsule: Solid {
        span: [-0.297, 2.687],
        radius: 0.947,
        pointed: true,
        balance: Measure::estimated(
            0.55,
            "low in the cabin, above the heat shield: the couch, the batteries and the shield",
        ),
    },
    booster: Solid {
        span: [-18.186, -0.203],
        radius: 0.889,
        pointed: false,
        balance: Measure::estimated(-11.5, "empty, the engine and the tail unit carry it aft of the middle"),
    },
    retropack: Solid {
        span: [-0.686, -0.297],
        radius: 0.5,
        pointed: false,
        balance: Measure::estimated(-0.49, "its middle"),
    },
    canister: Solid {
        span: [2.062, 2.687],
        radius: 0.305,
        pointed: false,
        balance: Measure::estimated(2.37, "its middle"),
    },
    balance: Measure::estimated(
        -9.3,
        "loaded, the tanks' middle: the propellant is four fifths of the weight",
    ),
    foot: 1.371,
    breaks: &BREAKS,
};

/// Where the booster parts if it breaks up: at the joints of its three units. That it would part there, and each
/// piece's share of the weight, are estimates: no Mercury-Redstone broke up in the air.
const BREAKS: [Fragment; 3] = [
    Fragment {
        nodes: &["RedstoneAdapter", "RedstoneAftUnit"],
        solid: Solid {
            span: [-3.931, 0.039],
            radius: 0.932,
            pointed: false,
            balance: Measure::estimated(-2.0, "its middle"),
        },
        share: Measure::estimated(0.2, "the instrument compartment and the adapter: light for their length"),
    },
    Fragment {
        nodes: &["RedstoneCenterUnit"],
        solid: Solid {
            span: [-15.742, -3.55],
            radius: 0.895,
            pointed: false,
            balance: Measure::estimated(-9.6, "its middle"),
        },
        share: Measure::estimated(0.35, "the two tanks, empty"),
    },
    Fragment {
        nodes: &["RedstoneTailUnit", "RedstoneEngine"],
        solid: Solid {
            span: [-18.186, -15.361],
            radius: 0.889,
            pointed: false,
            balance: Measure::estimated(-17.0, "the engine, low in it"),
        },
        share: Measure::estimated(0.45, "the engine, its frame and the fins"),
    },
];

/// The A-7's fire: alcohol and liquid oxygen (`src/viewer/flames.ts`, `plume.ts`).
pub const FLAME: Flame = Flame {
    node: "RedstoneEngine",
    exit_height: Measure::derived(
        -17.855,
        "the bell's lip in vehicle.glb (node Engine_A7), below the capsule's widest plane",
    ),
    exit_radius: Measure::derived(0.366, "the radius of a circle of the exit area: sqrt(0.4207 / pi)"),
    exit_pressure: Measure::estimated(
        0.9 * 101_325.0,
        "about nine tenths of an atmosphere: the chamber's 318 psia over the nozzle's pressure ratio, as first \
         estimated for the fire",
    ),
    length: Measure::estimated(38.0, "exit radii at sea level, judged against film of the launches"),
    colours: [[1.0, 0.93, 0.78], [1.0, 0.9, 0.62], [1.0, 0.56, 0.15], [1.0, 0.3, 0.05], [0.7, 0.8, 1.0]],
};

/// The main canopy's two colours, linear: orange and natural white gores (`flight.ts`, the canopy: #ee7a30 and
/// #efeadc, from the recovery photographs).
pub const CANOPY: [[f32; 3]; 2] = [[0.855, 0.195, 0.03], [0.863, 0.823, 0.716]];
