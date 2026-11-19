//! The pad's parts posed for a place on its slider: every motion played from where each node was built, as the web
//! build's `Sequence` plays them (`src/viewer/explode.ts`): swings turn a node in its parent's frame, slides move it
//! and roll its wheels, drives take it along a route with its wheels rolling and steering. Pure: it knows nodes by
//! their index and their place as built, not the engine's entities.
//!
//! Simplified against the web build: what runs on something moves level as built (the web build stands each wheel
//! on the surface under it, `runs.ts`), as the unpacker's liftoff pose always did.

use bevy::math::{DQuat, DVec3};
use sr_missions::morning::{Axle, Drive, Motion, Move, Rolls};

use super::route::{Route, ease, steer_along};

/// Where a node stands in its parent's frame, and how it is turned.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Pose {
    /// Its place, m.
    pub at: DVec3,
    /// Its turn.
    pub turn: DQuat,
}

/// A motion, bound to the node it moves.
#[derive(Debug, Clone)]
enum Kind {
    Swing { axis: DVec3, angle: f64 },
    Slide { by: DVec3 },
    Drive(Box<Driver>),
}

#[derive(Debug, Clone)]
struct Step {
    node: usize,
    from: f64,
    to: f64,
    kind: Kind,
}

/// A vehicle driven along its route: its wheels, those that steer, and how they roll.
#[derive(Debug, Clone)]
struct Driver {
    route: Route,
    drive: Drive,
    wheels: Vec<(usize, bool)>,
    spin: f64,
}

/// Wheels that roll with what their node has slid.
#[derive(Debug, Clone)]
struct Roller {
    node: usize,
    rolls: Rolls,
    /// Each wheel, and its axle in the frame the node slides in.
    wheels: Vec<(usize, DVec3)>,
}

/// The pad's motions, bound to its nodes.
#[derive(Debug, Clone)]
pub struct Posing {
    rests: Vec<Pose>,
    steps: Vec<Step>,
    rollers: Vec<Roller>,
}

fn axle(axle: Axle) -> DVec3 {
    match axle {
        Axle::X => DVec3::X,
        Axle::Z => DVec3::Z,
    }
}

/// Whether `name` is `prefix` and a number (`_1`, or `1`).
fn numbered(prefix: &str, name: &str) -> bool {
    !prefix.is_empty()
        && name.strip_prefix(prefix).is_some_and(|rest| {
            let digits = rest.strip_prefix('_').unwrap_or(rest);
            !digits.is_empty() && digits.bytes().all(|b| b.is_ascii_digit())
        })
}

impl Posing {
    /// The moves bound to the nodes found by `find` (a name to its index in `rests`); a move whose node is not there
    /// is left out and named in what is returned with it.
    #[must_use]
    pub fn bind(moves: &[Move], names: &[String], rests: Vec<Pose>) -> (Self, Vec<&'static str>) {
        let find = |name: &str| names.iter().position(|n| n == name);
        let mut missing = Vec::new();
        let (mut steps, mut rollers) = (Vec::new(), Vec::<Roller>::new());
        for m in moves {
            let Some(node) = find(m.node) else {
                missing.push(m.node);
                continue;
            };
            let kind = match m.motion {
                Motion::Swing { axis, angle } => {
                    Kind::Swing { axis: DVec3::from_array(axis).normalize(), angle }
                }
                Motion::Slide { by, rolls } => {
                    if let Some(rolls) = rolls.filter(|_| rollers.iter().all(|r| r.node != node)) {
                        let wheels = (0..names.len())
                            .filter(|&w| numbered(rolls.prefix, &names[w]))
                            .map(|w| (w, rests[node].turn * rests[w].turn * axle(rolls.axle)))
                            .collect();
                        rollers.push(Roller { node, rolls, wheels });
                    }
                    Kind::Slide { by: DVec3::from_array(by) }
                }
                Motion::Drive(drive) => Kind::Drive(Box::new(Driver::new(drive, names))),
            };
            steps.push(Step { node, from: m.from, to: m.to, kind });
        }
        (Self { rests, steps, rollers }, missing)
    }

    /// Every node's pose at `k` on the slider, by the same index as the names it was bound with.
    #[must_use]
    pub fn at(&self, k: f64) -> Vec<Pose> {
        let mut poses = self.rests.clone();
        let mut slid = vec![DVec3::ZERO; poses.len()];
        for step in &self.steps {
            let u = ease((k - step.from) / (step.to - step.from).max(1e-6));
            let pose = &mut poses[step.node];
            match &step.kind {
                // (in the parent's frame, so it goes before whatever turn the node already has)
                Kind::Swing { axis, angle } => {
                    pose.turn = DQuat::from_axis_angle(*axis, angle * u) * pose.turn;
                }
                Kind::Slide { by } => {
                    pose.at += *by * u;
                    slid[step.node] += *by * u;
                }
                Kind::Drive(driver) => driver.set(u, step.node, &self.rests, &mut poses),
            }
        }
        for roller in &self.rollers {
            let by = slid[roller.node];
            for &(wheel, across) in &roller.wheels {
                // the contact does not slip: the turn is (up x travel) / r about the axle
                let roll = (across.x * by.z - across.z * by.x) / roller.rolls.radius;
                poses[wheel].turn =
                    self.rests[wheel].turn * DQuat::from_axis_angle(axle(roller.rolls.axle), roll);
            }
        }
        poses
    }
}

impl Driver {
    fn new(drive: Drive, names: &[String]) -> Self {
        let wheels = (0..names.len())
            .filter_map(|w| {
                let steered = numbered(drive.steered, &names[w]);
                (steered || numbered(drive.wheels, &names[w])).then_some((w, steered))
            })
            .collect();
        // the top of a wheel moves along axle x up; rolling forward is positive when that is the way it faces
        let forward = DVec3::new(drive.forward[0], 0.0, drive.forward[1]);
        let way =
            axle(drive.axle).cross(DVec3::Y).dot(forward).signum() * if drive.reverse { -1.0 } else { 1.0 };
        Self { route: Route::new(drive.path), drive, wheels, spin: if way == 0.0 { 1.0 } else { way } }
    }

    /// The vehicle `k` of the way along its route, turned about its rear axle, its wheels rolled and steered.
    fn set(&self, k: f64, node: usize, rests: &[Pose], poses: &mut [Pose]) {
        let d = &self.drive;
        let distance = k * self.route.length;
        let p = self.route.at(distance);
        let pivot = DVec3::from_array(d.pivot);
        let turned = DQuat::from_rotation_y(p.heading) * pivot;
        let home = rests[node].at;
        poses[node].at = home + DVec3::new(p.x + pivot.x - turned.x, 0.0, p.z + pivot.z - turned.z);
        poses[node].turn = DQuat::from_rotation_y(p.heading) * rests[node].turn;
        let roll = self.spin * distance / d.wheel_radius;
        let steer = steer_along(&self.route, distance, d.wheelbase) * if d.reverse { -1.0 } else { 1.0 };
        for &(wheel, steered) in &self.wheels {
            let steer = if steered { steer } else { 0.0 };
            poses[wheel].turn = rests[wheel].turn
                * DQuat::from_rotation_y(steer)
                * DQuat::from_axis_angle(axle(d.axle), roll);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sr_missions::usa::mercury::mr3_morning;

    fn still(n: usize) -> Vec<Pose> {
        vec![Pose { at: DVec3::ZERO, turn: DQuat::IDENTITY }; n]
    }

    #[test]
    fn a_name_and_a_number_is_a_wheel_and_a_name_and_more_is_not() {
        assert!(numbered("CherryPicker_Wheel", "CherryPicker_Wheel_2"));
        assert!(numbered("ServiceStructure_Wheel_", "ServiceStructure_Wheel_8"));
        assert!(!numbered("CherryPicker_Wheel", "CherryPicker_Wheel_2_Tyre"));
        assert!(!numbered("", "anything"));
    }

    #[test]
    fn the_structure_rolls_back_its_whole_travel_and_its_wheels_turn_with_it() {
        let morning = mr3_morning::morning();
        let names: Vec<String> = ["ServiceStructure", "ServiceStructure_Wheel_1"].map(String::from).to_vec();
        let (posing, missing) = Posing::bind(&morning.moves, &names, still(2));
        assert!(missing.contains(&"CherryPicker_Jib"));
        let liftoff = posing.at(mr3_morning::STOPS.liftoff);
        assert!((liftoff[0].at.z + 33.53 + 19.2).abs() < 1e-9, "{:?}", liftoff[0].at);
        // rolled 52.73 m on a 0.457 m wheel
        let (axis, angle) = liftoff[1].turn.to_axis_angle();
        let rolled = (52.73 / 0.457) % std::f64::consts::TAU;
        assert!(
            axis.x.abs() > 0.99
                && (angle - rolled).abs().min((angle + rolled - std::f64::consts::TAU).abs()) < 1e-6
        );
        let before = posing.at(0.0);
        assert_eq!(before[0].at, DVec3::ZERO);
    }

    #[test]
    fn the_cab_hangs_level_whatever_the_jib_does() {
        let morning = mr3_morning::morning();
        let names: Vec<String> = ["CherryPicker_Jib", "CherryPicker_Cab"].map(String::from).to_vec();
        let (posing, _) = Posing::bind(&morning.moves, &names, still(2));
        for k in [0.0, 0.3, 0.37, 0.5, 0.63, 0.75] {
            let p = posing.at(k);
            assert!((p[0].turn * p[1].turn).angle_between(DQuat::IDENTITY) < 1e-9, "at {k}");
        }
        // standing by clear of the structure at first, then at the hatch, then lowered
        let angle = |k: f64| posing.at(k)[0].turn.to_axis_angle().1.to_degrees();
        assert!((angle(0.1) - 31.77).abs() < 1e-6);
        assert!(angle(0.45).abs() < 1e-6);
        assert!((angle(0.75) - 71.94).abs() < 1e-6);
    }
}
