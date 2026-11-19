//! Mercury-Redstone 3, Freedom 7: Alan Shepard, 5 May 1961
//! (`missions/usa/mercury/flights/mr-3-freedom-7/flight.ts`, `weather.ts`).

use sr_measure::Measure;
use sr_sim::Plan;
use sr_sim::plan::Engine;

use super::heat;
use super::redstone::{self, FT, LB, LBF};
use crate::types::{Check, Cloud, Event, Figure, Flight, Model, Role, Weather};
use crate::usa::places::cape_canaveral::{LC5, LC5_SURROUNDINGS_1961_05};

// "The Postlaunch Report" below is the Postlaunch Report for Mercury-Redstone No. 3 (NASA STG, 16 June 1961).
/// A nautical mile, m.
const NMI: f64 = 1852.0;

/// The vehicle's origin is the capsule's widest plane; its fins stand on the launcher's ring, 5.5 ft up, and the
/// fin trailing edges are 716 in below the origin.
const STANDS_AT: f64 = 5.5 * FT + 716.0 * redstone::IN;
/// The launcher's table was turned until the tilt plane lay on the azimuth (`lc-5.parts.ts` `launcherTurn(105)`).
const TURN: f64 = 55.0;

const LIFTOFF_MASS: f64 = 66_098.0 * LB;
const THRUST: f64 = 78_860.0 * LBF;
const ISP: f64 = 214.8;
const CUTOFF: f64 = 141.8;
const CAPSULE_LAUNCH: f64 = 4040.28 * LB;
const CAPSULE_ORBIT: f64 = 2855.14 * LB;

/// What the simulator flies Freedom 7 from: this flight's day on the stack's hardware. Every figure is an input
/// from a report; none was adjusted against the record.
pub const PLAN: Plan = Plan {
    azimuth: Measure::documented(105.0, "NASA TM X-53107, section 7.2: a 105-degree launch azimuth"),
    engine: Engine {
        thrust: Measure::documented(THRUST, "NASA TM X-53107, Table 8-1: thrust, sea level, 78,860 lb"),
        isp: Measure::documented(ISP, "the same table: engine specific impulse, sea level, 214.8 s"),
        exit_area: redstone::EXIT_AREA,
    },
    liftoff_mass: Measure::documented(
        LIFTOFF_MASS,
        "NASA TM X-53107, Table 8-1: weight at liftoff 66,098 lb",
    ),
    cutoff: Measure::documented(CUTOFF, "the Postlaunch Report, 4.1: booster cut-off at 02:21.8"),
    burn_limit: redstone::BURN_LIMIT,
    tilt: redstone::TILT,
    area: redstone::AREA,
    ascent_drag: redstone::ASCENT_DRAG,
    entry_drag: redstone::ENTRY_DRAG,
    tower_off: Measure::documented(142.2, "the Postlaunch Report, 4.1: the escape tower released at 02:22.2"),
    tower_mass: Measure::derived(
        CAPSULE_LAUNCH - CAPSULE_ORBIT,
        "the Postlaunch Report, 3.1: the launch weight (4040.28 lb) less the weight in orbit configuration",
    ),
    tower_motors: redstone::TOWER_MOTORS,
    separation: Measure::documented(152.3, "the Postlaunch Report, 4.1: capsule separation at 02:32.3"),
    capsule_mass: Measure::documented(
        CAPSULE_ORBIT,
        "the Postlaunch Report, 3.1: 2855.14 lb in orbit configuration",
    ),
    booster_mass: Measure::derived(
        redstone::cutoff_mass(LIFTOFF_MASS, THRUST, ISP, CUTOFF) - CAPSULE_LAUNCH,
        "the liftoff weight, less the flow for 141.8 s, less the capsule and tower at launch",
    ),
    booster_drag_area: redstone::BOOSTER_DRAG_AREA,
    push: Measure::documented(30.0 * FT, "the Postlaunch Report, 4.2: separation velocity about 30 ft/s"),
    retro_fires: [
        Measure::documented(314.1, "the Postlaunch Report, 4.1: retro no. 1 fire"),
        Measure::documented(318.8, "the Postlaunch Report, 4.1: retro no. 2 fire"),
        Measure::documented(323.6, "the Postlaunch Report, 4.1: retro no. 3 fire"),
    ],
    retro: redstone::RETRO,
    retro_pitch: Measure::derived(
        20.0,
        "the Postlaunch Report, 4.2: an average retro-attitude angle of 20 degrees above the local horizontal (34 was \
         planned): the blunt end's elevation, so the push is rearward and 20 degrees below the level",
    ),
    retropack_off: Measure::documented(
        373.6,
        "the Postlaunch Report, 4.1: retro-package jettison at 06:13.6",
    ),
    entry_mass: Measure::documented(
        2579.0 * LB,
        "the Postlaunch Report, 3.1: 2579.00 lb in re-entry configuration",
    ),
    drogue: redstone::DROGUE,
    main: redstone::MAIN,
    aloft: Some(super::mr3_aloft::ALOFT),
    limits: redstone::LIMITS,
    heating: heat::heated(Measure::estimated(
        300.0,
        "a May morning at the Cape, about 27 C: what the shield and skin stood at on the pad is not in anything read",
    )),
};

/// The sky at liftoff: the flight's own report and the Skid Strip at 09:00 EST.
pub const WEATHER: Weather = Weather {
    low: Cloud {
        cover: Measure::documented(0.1, "\"1/10 cumulus\" at liftoff (the Postlaunch Report, 10.3, p. 87)"),
        base: Measure::documented(
            720.0,
            "ISD: the median base of the low cloud on May mornings, 1959 to 1963",
        ),
        depth: Measure::estimated(650.0, "not recorded: heaps of 250 m and a few towers of 500"),
        size: Measure::estimated(
            1500.0,
            "not recorded: across a cloud, as fair-weather cumulus are photographed",
        ),
        wind_from: Measure::documented(
            90.0,
            "ISD, 09:00 EST: the wind at the ground, taken for the cloud's height",
        ),
        wind_speed: Measure::estimated(
            7.0,
            "the wind at the ground was 5.1 m/s: taken a little stronger at the bases",
        ),
    },
    middle: Cloud {
        cover: Measure::documented(
            0.125,
            "one okta of altocumulus at Patrick AFB at 10:00 EST (ISD station 74795012867)",
        ),
        base: Measure::documented(3600.0, "the same observation: 3,600 m"),
        depth: Measure::estimated(300.0, "not recorded: a thin deck, as altocumulus are"),
        size: Measure::estimated(400.0, "not recorded: the cloudlets of an altocumulus deck"),
        wind_from: Measure::estimated(90.0, "not recorded at that height: the ground's taken"),
        wind_speed: Measure::estimated(10.0, "not recorded at that height"),
    },
    visibility: Measure::estimated(
        80_000.0,
        "at the station's 16 km limit at 09:00 EST, so how far past is not recorded",
    ),
    haze: Measure::estimated(
        1400.0,
        "mixed up to the cumulus bases, 720 m: taken to fall off over about twice that",
    ),
    map: "cape-canaveral.1961-05-05.weather.png",
};

const MODELS: [Model; 4] = [
    Model {
        role: Role::Vehicle,
        path: "usa/mercury/mr-3-freedom-7/vehicle.glb",
        position: [0.0, STANDS_AT, 0.0],
        turn: TURN,
    },
    Model { role: Role::Pad, path: "usa/mercury/mr-3-freedom-7/pad.glb", position: [0.0; 3], turn: 0.0 },
    Model {
        role: Role::Crew,
        path: "usa/mercury/mr-3-freedom-7/crew.glb",
        position: [-9.4, 0.0, 3.2],
        // atan2(9.4, -3.2): he stands facing the vehicle (flight.ts).
        turn: 108.8,
    },
    Model { role: Role::Surroundings, path: LC5_SURROUNDINGS_1961_05, position: [0.0; 3], turn: 0.0 },
];

/// The record's clock (the Postlaunch Report, 4.1).
const EVENTS: [Event; 12] = [
    Event { at: 0.0, label: "Liftoff" },
    Event { at: 84.0, label: "Max q, 586 psf" },
    Event { at: 141.8, label: "Cutoff" },
    Event { at: 142.2, label: "Tower jettisoned" },
    Event { at: 152.3, label: "Capsule separation" },
    Event { at: 157.0, label: "Turnaround" },
    Event { at: 311.0, label: "Apogee, 187.4 km" },
    Event { at: 314.1, label: "Retrofire" },
    Event { at: 373.6, label: "Retropack jettisoned" },
    Event { at: 468.2, label: "0.05 g" },
    Event { at: 578.1, label: "Drogue" },
    Event { at: 614.8, label: "Main parachute" },
];

/// Where this build's simulator misses the record. Nothing is fitted: the tilt curve between its documented ends
/// and the whole vehicle's drag are estimates, and the flight is sensitive to both (the web build's simulator, on
/// the same inputs and the day's own air, misses the same way: its README, "What the simulator makes of it").
pub const MISSES: [Check; 5] = [
    Check {
        figure: Figure::Top,
        label: "Greatest height",
        recorded: Measure::documented(
            101.2 * NMI,
            "the Postlaunch Report, 4.2: maximum altitude 101.2 n. mi.",
        ),
        simulated: 198_488.9,
        why: "it leaves the booster fast: see the speed at separation",
    },
    Check {
        figure: Figure::Range,
        label: "Range",
        recorded: Measure::documented(263.1 * NMI, "the Postlaunch Report, 4.2: range 263.1 n. mi."),
        simulated: 538_378.4,
        why: "as the height",
    },
    Check {
        figure: Figure::SeparationSpeed,
        label: "Earth-fixed speed at separation",
        recorded: Measure::documented(
            6414.0 * FT,
            "the Postlaunch Report, 4.2: Earth-fixed velocity 6414 ft/s",
        ),
        simulated: 2_042.5,
        why: "the tilt curve is Figure 4-9 stretched, not MR-3's own, and the ascent's drag is the capsule's alone",
    },
    Check {
        figure: Figure::EntryLoad,
        label: "Greatest load, coming down",
        recorded: Measure::documented(
            11.0,
            "the Postlaunch Report, 4.2: maximum re-entry load factor 11.0 g",
        ),
        simulated: 11.6,
        why: "it comes down from higher and so steeper and faster",
    },
    Check {
        figure: Figure::Landing,
        label: "Liftoff to landing",
        recorded: Measure::documented(
            922.0,
            "the Postlaunch Report, 4.1: main chute disconnect, at landing, 15:22.0",
        ),
        simulated: 928.4,
        why: "as the height",
    },
];

/// Freedom 7.
pub static FLIGHT: Flight = Flight {
    id: "usa/mercury/mr-3-freedom-7",
    name: "Freedom 7",
    line: "Mercury-Redstone 3, Alan B. Shepard Jr., 5 May 1961",
    launch: (1961, 5, 5, 14, 34, 13.0),
    site: LC5,
    weather: WEATHER,
    models: &MODELS,
    parts: redstone::PARTS,
    solids: redstone::SOLIDS,
    flame: redstone::FLAME,
    fires: &super::fires::FIRES,
    pad_air: super::fires::MR3_PAD_AIR,
    canopy: redstone::CANOPY,
    plan: PLAN,
    events: &EVENTS,
    misses: &MISSES,
    morning: Some(crate::morning::Plays(super::mr3_morning::morning)),
};
