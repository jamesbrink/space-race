//! Freedom 7's morning at the pad: when each stop on the pad's slider fell on the clock of 5 May 1961, and what this
//! flight says of the pad (`missions/usa/mercury/flights/mr-3-freedom-7/flight.ts`: `T`, `MORNING`, `padParts`).
//!
//! The count did not run straight: after the gantry's removal at T-55 it was held a minute at T-30, 86 minutes at
//! T-15 and recycled to T-35, 17 minutes at T-15 again and a minute at T-2 (Postlaunch Report, section 10.2). So a
//! time in the count is a time before liftoff only once the holds after it are added: the events of the last two
//! minutes are fixed, those between T-15 and T-2 are a minute earlier than they read, and the reports give 05:20
//! and 06:37 by the wall clock. How long each motion took is nowhere recorded (`lc-5.md`, "Where things stood").

use sr_measure::Measure;

use crate::morning::{Key, Morning};
use crate::usa::places::lc5_cleared::{hut_leaves, spare_trailer_leaves};
use crate::usa::places::lc5_pad::{
    PadDay, PadStops, SHOWER_WHEELS, Z, by, held, lc5_moves, slide, swing, tower,
};

/// Where things happen on the pad's slider: layout, not history.
pub const STOPS: PadStops = PadStops {
    platforms: 0.0,
    rollback: 0.13,
    cab_in: 0.33,
    launch_position: 0.48,
    cab_away: 0.58,
    umbilical: 0.72,
    boom: 0.76,
    liftoff: 0.8,
    stow: 0.82,
    drive: 0.91,
};

/// Seconds from liftoff (09:34:13 EST) of a time on the Cape's clocks that morning.
#[must_use]
pub const fn est(hours: f64, minutes: f64) -> f64 {
    (hours * 60.0 + minutes) * 60.0 - (9.0 * 3600.0 + 34.0 * 60.0 + 13.0)
}

const MIN: f64 = 60.0;
/// 06:37 EST, T-55 minutes: the structure starts for the edge of the pad.
pub const GANTRY_REMOVED: f64 = est(6.0, 37.0);
/// The structure stands at the edge of the pad.
pub const ROLLED_BACK: f64 = GANTRY_REMOVED + 5.0 * MIN;

const NOT_RECORDED: &str =
    "not recorded: how long the motion took is ours, from its distance at a walking pace";
const AFTERWARDS: &str = "not documented: when the pad was cleared afterwards is ours";

/// The morning on the clock: when each stop on the pad's slider happened, in seconds from liftoff.
pub const MORNING: [Key; 19] = [
    Key {
        at: Measure::documented(
            est(5.0, 20.0),
            "Results of the First U.S. Manned Suborbital Space Flight, p. 77; Postlaunch Report timeline: 05:20 EST",
        ),
        slider: STOPS.platforms,
        event: "Pilot aboard: insertion begun from the white room",
    },
    Key {
        at: Measure::estimated(
            GANTRY_REMOVED - 37.0 * MIN,
            "NASA TM X-53107, section 7.5: T-85 to T-60 in the MR-4 standard count; placed 30 minutes of count and the 7 minute hold at T-80 before the gantry's removal at T-55",
        ),
        slider: STOPS.platforms,
        event: "T-85: the work platforms begin to open",
    },
    Key {
        at: Measure::estimated(
            GANTRY_REMOVED - 5.0 * MIN,
            "NASA TM X-53107, section 7.5: placed 5 minutes before the gantry's removal, the same way",
        ),
        slider: STOPS.platforms + 0.125,
        event: "T-60: the platforms are open",
    },
    Key {
        at: Measure::documented(
            GANTRY_REMOVED,
            "Results, p. 77: 06:37 EST; Postlaunch Report 7.1: \"gantry removal at -55 minutes\"",
        ),
        slider: STOPS.rollback,
        event: "Gantry removed: the structure starts for the edge of the pad",
    },
    Key {
        at: Measure::estimated(ROLLED_BACK, NOT_RECORDED),
        slider: STOPS.cab_in - 0.01,
        event: "The structure stands at the edge of the pad",
    },
    Key {
        at: Measure::estimated(
            ROLLED_BACK + 0.5 * MIN,
            "NASA TM X-53107, p. 7-29: once the structure had gone; the minute is ours",
        ),
        slider: STOPS.cab_in,
        event: "The cherry picker's cab starts for the hatch",
    },
    Key {
        at: Measure::estimated(ROLLED_BACK + 2.5 * MIN, NOT_RECORDED),
        slider: STOPS.cab_in + 0.09,
        event: "The cab is at the hatch",
    },
    Key {
        at: Measure::derived(
            -(8.0 * MIN + 45.0) - MIN,
            "NASA TM X-53107, p. 7-32 (Hammack: T-9), less the minute's hold at T-2",
        ),
        slider: STOPS.launch_position,
        event: "T-8:45: the structure is driven on to its launch position",
    },
    Key {
        at: Measure::estimated(-(6.0 * MIN + 45.0) - MIN, NOT_RECORDED),
        slider: STOPS.cab_away - 0.02,
        event: "The structure is at its launch position",
    },
    Key {
        at: Measure::derived(
            -(2.0 * MIN + 30.0) - MIN,
            "NASA TM X-53107, p. 7-33, and Hammack (7.3.3.1 has T-4), less the minute's hold at T-2",
        ),
        slider: STOPS.cab_away,
        event: "T-2:30: the cab is lowered away and down",
    },
    Key {
        at: Measure::estimated(-(MIN + 30.0) - MIN, NOT_RECORDED),
        slider: STOPS.cab_away + 0.12,
        event: "The cab is down",
    },
    Key {
        at: Measure::derived(-35.0, "NASA TM X-53107, p. 7-33: in the count, and nothing was held after T-2"),
        slider: STOPS.umbilical,
        event: "T-35 s: the capsule umbilical is dropped",
    },
    Key {
        at: Measure::estimated(-33.0, "a mast pulled over by a bungee falls in a second or two"),
        slider: STOPS.umbilical + 0.035,
        event: "The capsule mast is down",
    },
    Key {
        at: Measure::derived(
            -14.0,
            "NASA TM X-53107, p. 7-33 (\"about\"); Hammack p. 21: in the count, and nothing was held after T-2",
        ),
        slider: STOPS.boom,
        event: "T-14 s: boom drop",
    },
    Key {
        at: Measure::estimated(-12.0, "as the capsule mast"),
        slider: STOPS.boom + 0.035,
        event: "The booster mast is down",
    },
    Key {
        at: Measure::documented(0.0, "Postlaunch Report for Mercury-Redstone No. 3: 09:34:13 EST"),
        slider: STOPS.liftoff,
        event: "Liftoff",
    },
    Key {
        at: Measure::estimated(10.0 * MIN, AFTERWARDS),
        slider: STOPS.stow,
        event: "The cherry picker is folded down",
    },
    Key { at: Measure::estimated(13.0 * MIN, AFTERWARDS), slider: STOPS.drive, event: "It drives off" },
    Key {
        at: Measure::estimated(13.5 * MIN, "not documented, as above; half a minute to cross the apron"),
        slider: 1.0,
        event: "The pad is clear",
    },
];

/// What this morning says of the pad: the platforms part lowest first and the white room last; the cherry picker
/// stands by clear of the structure until it has gone, its cab hanging level whatever the jib does; what is cleared
/// off the pad's north edge before the gantry is removed (estimated: nothing records it).
#[must_use]
pub fn day() -> PadDay {
    let t = STOPS;
    let p = t.platforms;
    let platforms = [1, 2, 4, 3]
        .iter()
        .enumerate()
        .map(|(i, &level)| (level, p + i as f64 * 0.025, p + 0.05 + i as f64 * 0.025));
    let h = by::HYDRAULICS;
    let tower = vec![
        held("CherryPicker_Jib", Z, tower::STANDBY),
        held("CherryPicker_Cab", Z, -tower::STANDBY),
        swing("CherryPicker_Jib", Z, -tower::STANDBY, t.cab_in, t.cab_in + 0.09, h),
        swing("CherryPicker_Cab", Z, tower::STANDBY, t.cab_in, t.cab_in + 0.09, h),
    ];
    let mut cleared = vec![
        slide("GroundEquipment_Shower", [5.49, 0.0, 45.4], Some(SHOWER_WHEELS), p + 0.02, p + 0.11, by::HAND),
        slide("GroundEquipment_Case", [2.51, 0.0, 42.4], None, p + 0.03, p + 0.12, by::HAND),
        // the trailer's door steps fold up first, so nothing hangs below its frame while it is towed
        swing("GroundEquipment_TrailerSteps", Z, 95.0, p, p + 0.008, by::HAND),
    ];
    cleared.extend(spare_trailer_leaves(p + 0.01, p + 0.12));
    for k in 1..=2 {
        let from = p + 0.03 * k as f64;
        cleared.extend(hut_leaves(k, from, from + 0.08));
    }
    PadDay { stops: t, platforms: platforms.collect(), tower, cleared, azimuth: 105.0 }
}

/// The pad's morning, for the game to play on the clock.
#[must_use]
pub fn morning() -> Morning {
    Morning { keys: &MORNING, moves: lc5_moves(&day()) }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::morning::{faults, slider_at};

    #[test]
    fn the_morning_is_in_order_and_liftoff_falls_where_the_web_build_has_it() {
        assert_eq!(faults(&MORNING), Vec::<String>::new());
        assert_eq!(slider_at(&MORNING, 0.0), STOPS.liftoff);
        assert_eq!(GANTRY_REMOVED, -10_633.0);
        assert_eq!(morning().moves.len(), 8 + 2 + 4 + 10 + 3 + 3 + 2 + 4);
    }
}
