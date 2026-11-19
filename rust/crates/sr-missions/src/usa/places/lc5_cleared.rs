//! What was taken off Launch Complex 5's pad that morning, as motions a flight's day can use: the trailer NASA
//! SP-No 1 behind its tractor, and each hut dragged off on its skids by a pickup (`lc-5.parts.ts`
//! `spareTrailerLeaves`, `hutLeaves`). Estimated throughout: nothing records how they left, or that they did
//! (`lc-5.md`, "Moving parts").

use super::lc5_pad::{by, slide};
use crate::morning::{Axle, Drive, Motion, Move};

/// The tractor's route off the pad, in the frame of the bay it stands in: straight ahead, easing 12 ft to its left
/// over 40 m clear of the structure's stair (estimated throughout: lc-5.md, "Moving parts").
const TRACTOR_ROUTE: [[f64; 2]; 7] =
    [[4.0, 0.0], [10.0, -0.4], [20.0, -1.83], [30.0, -3.26], [36.0, -3.6], [44.0, -3.66], [82.6, -3.66]];
/// The trailer's bogie, heading always for the kingpin 6.54 m ahead on the tractor's fifth wheel: the tractor's
/// route worked through as a trailer follows it, so the two stay coupled to within 2 cm.
const TRAILER_ROUTE: [[f64; 2]; 22] = [
    [0.0, 5.01],
    [0.05, 8.01],
    [0.17, 11.0],
    [0.38, 13.99],
    [0.67, 16.97],
    [1.02, 19.95],
    [1.41, 22.93],
    [1.82, 25.91],
    [2.24, 28.88],
    [2.63, 31.86],
    [2.95, 34.84],
    [3.2, 37.82],
    [3.36, 40.81],
    [3.47, 43.81],
    [3.54, 46.81],
    [3.59, 49.81],
    [3.62, 52.81],
    [3.64, 55.81],
    [3.65, 58.81],
    [3.67, 66.81],
    [3.67, 74.82],
    [3.66, 82.6],
];

/// The trailer NASA SP-No 1 taken away behind its tractor, north off the pad past the cherry picker (estimated).
#[must_use]
pub fn spare_trailer_leaves(from: f64, to: f64) -> [Move; 2] {
    let tractor = Drive {
        path: &TRACTOR_ROUTE,
        pivot: [0.0, 0.513, 0.0],
        forward: [1.0, 0.0],
        wheel_radius: 0.513,
        wheelbase: 3.607,
        wheels: "GroundEquipment_Tractor_Wheel",
        steered: "GroundEquipment_Tractor_SteerWheel",
        axle: Axle::Z,
        reverse: false,
    };
    let trailer = Drive {
        path: &TRAILER_ROUTE,
        pivot: [0.0, 0.472, 0.0],
        forward: [0.0, 1.0],
        wheel_radius: 0.472,
        wheelbase: 6.54,
        wheels: "GroundEquipment_Trailer_Wheel",
        steered: "GroundEquipment_Trailer_NoSteer",
        axle: Axle::X,
        reverse: false,
    };
    [
        Move {
            node: "GroundEquipment_Tractor",
            motion: Motion::Drive(tractor),
            from,
            to,
            machine: by::TRACTOR,
        },
        Move {
            node: "GroundEquipment_Trailer",
            motion: Motion::Drive(trailer),
            from,
            to,
            machine: by::TRAILER,
        },
    ]
}

/// A pickup's route: straight out across the pad's edge to the road behind.
const TOW_ROUTE: [[f64; 2]; 3] = [[24.0, 0.0], [48.0, 0.0], [72.0, 0.0]];
/// Each hut and its pickup, by their nodes: the hut, the pickup, its wheels and its steered wheels.
const HUTS: [[&str; 4]; 2] = [
    [
        "GroundEquipment_Hut1",
        "GroundEquipment_Tow1",
        "GroundEquipment_Tow1_Wheel",
        "GroundEquipment_Tow1_SteerWheel",
    ],
    [
        "GroundEquipment_Hut2",
        "GroundEquipment_Tow2",
        "GroundEquipment_Tow2_Wheel",
        "GroundEquipment_Tow2_SteerWheel",
    ],
];

/// Hut `k` (1 or 2) dragged off on its skids by its pickup, 72 m straight out across the pad's edge (estimated).
#[must_use]
pub fn hut_leaves(k: usize, from: f64, to: f64) -> [Move; 2] {
    let [hut, tow, wheels, steered] = HUTS[k.clamp(1, 2) - 1];
    let drive = Drive {
        path: &TOW_ROUTE,
        pivot: [0.0, 0.361, 0.0],
        forward: [1.0, 0.0],
        wheel_radius: 0.361,
        wheelbase: 2.794,
        wheels,
        steered,
        axle: Axle::Z,
        reverse: false,
    };
    [
        slide(hut, [72.0, 0.0, 0.0], None, from, to, by::SKIDS),
        Move { node: tow, motion: Motion::Drive(drive), from, to, machine: by::PICKUP },
    ]
}
