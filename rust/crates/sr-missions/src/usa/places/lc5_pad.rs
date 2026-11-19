//! Launch Complex 5's pad as it moves: the parts of `pad.glb` that move through a launch morning, what drives each
//! and how far (`missions/usa/places/cape-canaveral/lc-5.parts.ts`, `lc5Parts`). The hardware is the site's and the
//! same for every flight from it; a flight gives the day ([`PadDay`]): where its count falls on the slider, how the
//! cherry picker waited, what was cleared off the pad and when. `lc-5.md` has every pivot, travel and source.
//!
//! Each figure here is the model scripts' own (`places/cape-canaveral/lc5/*.py`), so the motion meets the geometry;
//! where the record does not say how a thing moved, the machine says so.

use sr_measure::Confidence::{Derived, Documented, Estimated};

use super::cape_canaveral::LC5;
use crate::morning::{Axle, Drive, Machine, Motion, Move, Rolls, Works};

/// Where things happen on the pad's slider (0 to 1), from the pilot going aboard to the pad standing empty. Layout,
/// chosen so each event can be seen; the flight's keyframes say when each fell on the clock.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PadStops {
    /// The work platforms part, two halves each.
    pub platforms: f64,
    /// T-55 minutes: the structure rolls to the edge of the pad.
    pub rollback: f64,
    /// The cherry picker's cab comes to the hatch.
    pub cab_in: f64,
    /// T-8:45: the structure rolls on to its launch position.
    pub launch_position: f64,
    /// The cab is lowered "away and down" by remote control.
    pub cab_away: f64,
    /// T-35 s: the capsule's mast is pulled over by its bungee.
    pub umbilical: f64,
    /// About T-14 s: "boom drop".
    pub boom: f64,
    /// Liftoff.
    pub liftoff: f64,
    /// Afterwards (not documented): the tower is folded down onto its truck.
    pub stow: f64,
    /// And driven off.
    pub drive: f64,
}

/// One morning at the pad (`PadDay`).
#[derive(Debug, Clone, PartialEq)]
pub struct PadDay {
    /// Where its count falls on the slider.
    pub stops: PadStops,
    /// When each level's two halves part: the level, and where on the slider they start and end, in that order.
    pub platforms: Vec<(u32, f64, f64)>,
    /// How the cherry picker waits while the structure stands round the vehicle, and comes to the hatch.
    pub tower: Vec<Move>,
    /// What is taken off the pad before the structure leaves, and when.
    pub cleared: Vec<Move>,
    /// The flight's azimuth, degrees true: what the launcher's table, and the two cable masts with it, were turned to.
    pub azimuth: f64,
}

const fn machine(works: Works, confidence: sr_measure::Confidence, source: &'static str) -> Machine {
    Machine { works, confidence, source }
}

/// What drives each of the pad's motions (`BY`): the record's where it says, ours where it does not.
pub mod by {
    use super::{Derived, Documented, Estimated, Machine, Works, machine};

    /// The platforms, parted from the blockhouse once the structure had remote control; the drive is ours.
    pub const PLATFORMS: Machine = machine(
        Works::Motor,
        Estimated,
        "parted from the blockhouse (the part's words); an electric drive is ours",
    );
    /// The structure on its four powered rail trucks.
    pub const STRUCTURE: Machine = machine(
        Works::Rails,
        Documented,
        "it moved on its rails under its own power, on four powered rail trucks (the part's words)",
    );
    /// The cherry picker's rams.
    pub const HYDRAULICS: Machine = machine(
        Works::Hydraulic,
        Derived,
        "the truck carries its hydraulic tank and valve bank, worked from the levers at its tail (lc-5.md: cherry_picker.py)",
    );
    /// The tower's truck driving off.
    pub const TOWER: Machine = machine(
        Works::Road,
        Estimated,
        "its folding and driving off are how such a tower travels, not something the record shows",
    );
    /// The trailer's tractor.
    pub const TRACTOR: Machine = machine(
        Works::Road,
        Estimated,
        "an Army M275 of the kind photographed coupled to the trailer; that it drove the trailer off is ours",
    );
    /// The huts' pickups.
    pub const PICKUP: Machine =
        machine(Works::Road, Estimated, "nothing records how the huts were moved: a pickup is ours");
    /// The trailer behind its tractor.
    pub const TRAILER: Machine =
        machine(Works::Towed, Estimated, "taken away behind its tractor (lc-5.md, \"Moving parts\")");
    /// A hut on its skids.
    pub const SKIDS: Machine = machine(
        Works::Skids,
        Estimated,
        "each hut dragged off on its skids: nothing records how the huts were moved",
    );
    /// By hand.
    pub const HAND: Machine =
        machine(Works::Hand, Estimated, "wheeled, carried or folded by hand: how is not recorded");
    /// The capsule mast's bungee.
    pub const BUNGEE: Machine = machine(
        Works::Release,
        Documented,
        "a release valve and a bungee pulled the capsule's mast over, hinged on the launcher's table (lc-5.md, \"Moving parts\")",
    );
    /// Boom drop.
    pub const BOOM: Machine = machine(
        Works::Release,
        Estimated,
        "\"boom drop\": the booster's mast falling over about its pin (lc-5.md); what pulled it over is taken to be the capsule mast's",
    );
    /// A pose held from before the slider begins.
    pub const HELD: Machine = machine(
        Works::Held,
        Derived,
        "a pose held from before the slider begins: it never moves while it is seen",
    );
}

/// The model's +X and +Z, which the hinges here lie along.
pub const X: [f64; 3] = [1.0, 0.0, 0.0];
/// As [`X`].
pub const Z: [f64; 3] = [0.0, 0.0, 1.0];

/// A hinged piece turning `degrees` about `axis` between two places on the slider.
#[must_use]
pub fn swing(node: &'static str, axis: [f64; 3], degrees: f64, from: f64, to: f64, machine: Machine) -> Move {
    Move { node, motion: Motion::Swing { axis, angle: degrees.to_radians() }, from, to, machine }
}

/// A pose held from the start: the piece is built somewhere else and stands here until it moves.
#[must_use]
pub fn held(node: &'static str, axis: [f64; 3], degrees: f64) -> Move {
    swing(node, axis, degrees, -1.0, -0.5, by::HELD)
}

/// A piece moved by `by`, m, between two places on the slider.
#[must_use]
pub fn slide(
    node: &'static str,
    by: [f64; 3],
    rolls: Option<Rolls>,
    from: f64,
    to: f64,
    machine: Machine,
) -> Move {
    Move { node, motion: Motion::Slide { by, rolls }, from, to, machine }
}

/// The meridian of a capsule that lay down range on the launcher, degrees round from the hatch's middle
/// (anticlockwise from above): the periscope's, with a fin's (`lc5/site.py` `PITCH_PLANE`).
pub const PITCH_PLANE: f64 = 135.0;

/// How far the launcher's table stood turned for a flight on `azimuth` (degrees true): degrees about the vertical,
/// anticlockwise from above, from the site's +X to the hatch's middle. Derived: the Redstone had no roll programme,
/// so it was "positioned to flight azimuth" on the launcher (TM X-53107 4.4, 7.1.3); the site's bearing is estimated.
#[must_use]
pub fn launcher_turn(azimuth: f64) -> f64 {
    (LC5.bearing_x.value - azimuth - PITCH_PLANE).rem_euclid(360.0)
}

/// Where each cable mast stands round the vehicle, degrees from the hatch's middle (`lc5/site.py` `MASTS`).
const BOOSTER_MAST_AT: f64 = 241.0;
/// As [`BOOSTER_MAST_AT`].
const CAPSULE_MAST_AT: f64 = 115.0;

/// The axis a mast standing `degrees` round from the site's +X falls about, straight out from the vehicle.
fn fall_axis(degrees: f64) -> [f64; 3] {
    let (sin, cos) = degrees.to_radians().sin_cos();
    [-sin, 0.0, -cos]
}

/// The cherry picker's angles, degrees about its pins (`lc5/cherry_picker.py` `pose`): the jib lowering the cab to
/// the pad from the hatch; the jib swung clear of the closed structure; the mast laid forward on its rest; the jib's
/// last fold onto it.
pub mod tower {
    /// From the hatch to the pad.
    pub const LOWER: f64 = 71.94;
    /// Clear of the closed structure.
    pub const STANDBY: f64 = 31.77;
    /// The mast laid forward.
    pub const STOW: f64 = 66.81;
    /// The jib's last fold.
    pub const FOLD: f64 = 0.86;
}

/// The structure's roll, m along its rails: to the edge of the pad, then on to its launch position (`lc-5.md`: 173 ft
/// in all, derived from TM X-53107 Figure 7-6).
const ROLL: [f64; 2] = [33.53, 19.2];

/// The structure's eight rail wheels, 0.457 m in radius (the model's, `lc5/service_structure.py`).
const ON_RAILS: Rolls = Rolls { prefix: "ServiceStructure_Wheel_", radius: 0.457, axle: Axle::X };

/// The emergency shower's four castors, 10 in across (estimated, `lc5/ground_equipment.py`).
pub const SHOWER_WHEELS: Rolls =
    Rolls { prefix: "GroundEquipment_Shower_Wheel_", radius: 0.42 * 0.3048, axle: Axle::Z };

/// The cherry picker's drive off, out along the apron on the blockhouse side and round toward the blockhouse road.
const TOWER_ROUTE: [[f64; 2]; 4] = [[12.0, 0.0], [26.0, 1.0], [40.0, 8.0], [50.0, 24.0]];

/// The structure: its platforms part, each pair when the day says, and it rolls back in two goes.
fn structure(day: &PadDay) -> Vec<Move> {
    let t = day.stops;
    let mut moves = Vec::new();
    for &(level, from, to) in &day.platforms {
        let (left, right) = platform(level);
        moves.push(slide(left, [-1.372, 0.0, 0.0], None, from, to, by::PLATFORMS));
        moves.push(slide(right, [1.372, 0.0, 0.0], None, from, to, by::PLATFORMS));
    }
    moves.push(slide(
        "ServiceStructure",
        [0.0, 0.0, -ROLL[0]],
        Some(ON_RAILS),
        t.rollback,
        t.cab_in - 0.01,
        by::STRUCTURE,
    ));
    moves.push(slide(
        "ServiceStructure",
        [0.0, 0.0, -ROLL[1]],
        Some(ON_RAILS),
        t.launch_position,
        t.cab_away - 0.02,
        by::STRUCTURE,
    ));
    moves
}

/// A level's two platform halves, by their nodes.
fn platform(level: u32) -> (&'static str, &'static str) {
    match level {
        1 => ("ServiceStructure_Platform1_Left", "ServiceStructure_Platform1_Right"),
        2 => ("ServiceStructure_Platform2_Left", "ServiceStructure_Platform2_Right"),
        3 => ("ServiceStructure_Platform3_Left", "ServiceStructure_Platform3_Right"),
        _ => ("ServiceStructure_Platform4_Left", "ServiceStructure_Platform4_Right"),
    }
}

/// The cherry picker: how it waits (the day's), away and down by remote control, and afterwards folded and driven off.
fn cherry_picker(day: &PadDay) -> Vec<Move> {
    let t = day.stops;
    let (h, after) = (by::HYDRAULICS, t.stow + 0.06);
    let mut moves = day.tower.clone();
    moves.extend([
        swing("CherryPicker_Jib", Z, tower::LOWER, t.cab_away, t.cab_away + 0.12, h),
        swing("CherryPicker_Cab", Z, -tower::LOWER, t.cab_away, t.cab_away + 0.12, h),
        swing("CherryPicker_Jib", Z, -tower::FOLD, t.stow, t.stow + 0.03, h),
        swing("CherryPicker_Mast", Z, -tower::STOW, t.stow, t.stow + 0.07, h),
        swing("CherryPicker_Cab", Z, tower::FOLD + tower::STOW, t.stow, t.stow + 0.07, h),
        swing("CherryPicker_Outrigger_1", X, -105.0, after, t.drive, h),
        swing("CherryPicker_Outrigger_3", X, -105.0, after, t.drive, h),
        swing("CherryPicker_Outrigger_2", X, 105.0, after, t.drive, h),
        swing("CherryPicker_Outrigger_4", X, 105.0, after, t.drive, h),
    ]);
    let drive = Drive {
        path: &TOWER_ROUTE,
        pivot: [0.0, 0.527, 0.0],
        forward: [1.0, 0.0],
        wheel_radius: 0.527,
        wheelbase: 5.029,
        wheels: "CherryPicker_Wheel",
        steered: "CherryPicker_SteerWheel",
        axle: Axle::Z,
        reverse: false,
    };
    moves.push(Move {
        node: "CherryPicker",
        motion: Motion::Drive(drive),
        from: t.drive,
        to: 1.0,
        machine: by::TOWER,
    });
    moves
}

/// The two cable masts, each straight out from the vehicle about its pin until its head is on the pad; the
/// umbilical swings on over the capsule mast's head as it goes (estimated: how it fell is not recorded).
fn masts(day: &PadDay) -> Vec<Move> {
    let (t, turn) = (day.stops, launcher_turn(day.azimuth));
    let capsule = fall_axis(CAPSULE_MAST_AT + turn);
    vec![
        swing("UmbilicalMast", capsule, 94.9, t.umbilical, t.umbilical + 0.035, by::BUNGEE),
        swing("UmbilicalMast_Cable", capsule, 49.0, t.umbilical, t.umbilical + 0.035, by::BUNGEE),
        swing("BoosterMast", fall_axis(BOOSTER_MAST_AT + turn), 93.7, t.boom, t.boom + 0.035, by::BOOM),
    ]
}

/// Every motion of the pad for one morning, in the order they are played.
#[must_use]
pub fn lc5_moves(day: &PadDay) -> Vec<Move> {
    let mut moves = structure(day);
    moves.extend(cherry_picker(day));
    moves.extend(masts(day));
    moves.extend(day.cleared.iter().copied());
    moves
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_launcher_is_turned_as_the_web_build_turns_it() {
        assert!((launcher_turn(105.0) - 55.0).abs() < 1e-12);
        let [x, _, z] = fall_axis(170.0);
        assert!(
            (x + 170f64.to_radians().sin()).abs() < 1e-12 && (z + 170f64.to_radians().cos()).abs() < 1e-12
        );
    }
}
