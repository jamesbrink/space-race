//! A model's morning: how its named parts move (platforms part, a structure rolls on its rails, a jib lowers, a
//! truck drives off), each timed on the model's slider, and the slider joined to the flight's clock. The web build's
//! `Move` (`src/types.ts`) and `src/world/sequence.ts`, carried over as data; nothing here knows a flight.
//!
//! The slider (0 to 1) lays a run of events out so that each can be seen: hours of waiting and fourteen seconds of
//! a boom falling each get a stretch of it. Its stops are layout, not history; the keyframes say which instant of
//! the clock is which place on it, each with its confidence, and between them both run evenly.

use sr_measure::{Confidence, Measure};

/// An instant of the flight's clock and where the model's slider stands then.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Key {
    /// Seconds from liftoff (negative before it), and how that is known.
    pub at: Measure,
    /// Where the slider is then, 0 to 1.
    pub slider: f64,
    /// What happened.
    pub event: &'static str,
}

/// Where the slider is at `t`, seconds from liftoff: still before the first keyframe and after the last, and
/// even between two (`sliderAt`).
#[must_use]
pub fn slider_at(keys: &[Key], t: f64) -> f64 {
    let (Some(first), Some(last)) = (keys.first(), keys.last()) else { return 0.0 };
    if t <= first.at.value {
        return first.slider;
    }
    for pair in keys.windows(2) {
        let (a, b) = (pair[0], pair[1]);
        if t <= b.at.value {
            let span = b.at.value - a.at.value;
            return if span <= 0.0 {
                b.slider
            } else {
                a.slider + (b.slider - a.slider) * (t - a.at.value) / span
            };
        }
    }
    last.slider
}

/// The instant at which the slider reads `slider`; where it stands still a while, the start of that while
/// (`timeAt`).
#[must_use]
pub fn time_at(keys: &[Key], slider: f64) -> f64 {
    let Some(first) = keys.first() else { return 0.0 };
    if slider <= first.slider {
        return first.at.value;
    }
    for pair in keys.windows(2) {
        let (a, b) = (pair[0], pair[1]);
        if slider <= b.slider {
            let span = b.slider - a.slider;
            return if span <= 0.0 {
                a.at.value
            } else {
                a.at.value + (b.at.value - a.at.value) * (slider - a.slider) / span
            };
        }
    }
    keys.last().map_or(0.0, |last| last.at.value)
}

/// What is wrong with a run of keyframes, as sentences; none if it is sound (`faults`).
#[must_use]
pub fn faults(keys: &[Key]) -> Vec<String> {
    let mut out = Vec::new();
    if keys.len() < 2 {
        out.push("a sequence needs at least two keyframes".to_owned());
    }
    for (i, k) in keys.iter().enumerate() {
        if !(0.0..=1.0).contains(&k.slider) {
            out.push(format!("keyframe {i}: slider {} is not between 0 and 1", k.slider));
        }
        if let Some(before) = i.checked_sub(1).map(|j| keys[j]) {
            if k.at.value < before.at.value {
                out.push(format!("keyframe {i}: earlier than the one before it"));
            }
            if k.slider < before.slider {
                out.push(format!("keyframe {i}: the slider goes backwards"));
            }
        }
    }
    out
}

/// What drives a motion (`Machine.kind`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Works {
    /// An electric drive.
    Motor,
    /// A structure's own trucks on its rails.
    Rails,
    /// A lift's cage.
    Lift,
    /// A hinged leaf.
    Door,
    /// Rams and a valve bank.
    Hydraulic,
    /// A vehicle on the road under its own power.
    Road,
    /// Towed behind another.
    Towed,
    /// Dragged on its skids.
    Skids,
    /// Wheeled, carried or folded by hand.
    Hand,
    /// Let go and pulled over (a bungee, a release valve).
    Release,
    /// A pose held from before the slider begins: it never moves while it is seen.
    Held,
}

/// What drives a motion, how sure we are of that, and on what.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Machine {
    /// What it is.
    pub works: Works,
    /// How it is known.
    pub confidence: Confidence,
    /// Where that comes from.
    pub source: &'static str,
}

/// Which of a wheel's own axes it turns about.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Axle {
    /// Its +X.
    X,
    /// Its +Z.
    Z,
}

/// Wheels that roll as the node they hang on slides: every node under it named `prefix` and a number.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rolls {
    /// What its wheels are called, less their number.
    pub prefix: &'static str,
    /// Their radius, m.
    pub radius: f64,
    /// What they turn about.
    pub axle: Axle,
}

/// A part that leaves under its own power (`Drive`): its rear axle follows a smooth route from where it stands,
/// it turns with it, and its wheels roll and steer.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Drive {
    /// The route, m in the frame of what carries it, from where it stands: x and z of each point after the first.
    pub path: &'static [[f64; 2]],
    /// The rear axle's middle in the vehicle's own frame, m: what follows the route.
    pub pivot: [f64; 3],
    /// The way it faces, x and z.
    pub forward: [f64; 2],
    /// Its wheels' radius, m.
    pub wheel_radius: f64,
    /// From the rear axle to the front, m.
    pub wheelbase: f64,
    /// Its wheels, less their number.
    pub wheels: &'static str,
    /// Those of them that steer, less their number.
    pub steered: &'static str,
    /// What they turn about.
    pub axle: Axle,
    /// Whether it backs along the route.
    pub reverse: bool,
}

/// One motion of a node.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Motion {
    /// Turned by `angle` radians about `axis`, in the frame of what carries it.
    Swing {
        /// The hinge's direction.
        axis: [f64; 3],
        /// How far, radians, anticlockwise about the axis.
        angle: f64,
    },
    /// Moved by `by`, m, in the frame of what carries it; its wheels roll if it has any.
    Slide {
        /// How far.
        by: [f64; 3],
        /// Its wheels.
        rolls: Option<Rolls>,
    },
    /// Driven along a route.
    Drive(Drive),
}

/// A motion of a named node over a stretch of its model's slider, eased in and out (`Move`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Move {
    /// The node, by its name in the model.
    pub node: &'static str,
    /// What it does.
    pub motion: Motion,
    /// Where on the slider it begins and ends.
    pub from: f64,
    /// As `from`.
    pub to: f64,
    /// What drives it.
    pub machine: Machine,
}

/// A model's morning: its slider on the clock, and its parts' motions on the slider.
#[derive(Debug, Clone, PartialEq)]
pub struct Morning {
    /// Which instant is which place on the slider.
    pub keys: &'static [Key],
    /// Every motion, in the order they are played.
    pub moves: Vec<Move>,
}

/// How a flight's morning is made: kept as the function that makes it, since its motions are worked from the day.
#[derive(Debug, Clone, Copy)]
pub struct Plays(pub fn() -> Morning);

impl Plays {
    /// The morning.
    #[must_use]
    pub fn morning(self) -> Morning {
        (self.0)()
    }
}

impl PartialEq for Plays {
    /// Two are the same if they make the same morning.
    fn eq(&self, other: &Self) -> bool {
        self.morning() == other.morning()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const KEYS: [Key; 4] = [
        Key { at: Measure::documented(-100.0, "a"), slider: 0.0, event: "a" },
        Key { at: Measure::estimated(-50.0, "b"), slider: 0.5, event: "b" },
        Key { at: Measure::estimated(-20.0, "c"), slider: 0.5, event: "c" },
        Key { at: Measure::documented(0.0, "d"), slider: 0.8, event: "d" },
    ];

    #[test]
    fn the_slider_runs_evenly_between_keyframes_and_waits_outside_them() {
        assert_eq!(slider_at(&KEYS, -200.0), 0.0);
        assert!((slider_at(&KEYS, -75.0) - 0.25).abs() < 1e-12);
        assert_eq!(slider_at(&KEYS, -30.0), 0.5);
        assert!((slider_at(&KEYS, -10.0) - 0.65).abs() < 1e-12);
        assert_eq!(slider_at(&KEYS, 60.0), 0.8);
        assert_eq!(faults(&KEYS), Vec::<String>::new());
    }

    #[test]
    fn a_slider_standing_still_is_timed_from_when_it_came_to_rest() {
        assert_eq!(time_at(&KEYS, 0.5), -50.0);
        assert!((time_at(&KEYS, 0.65) + 10.0).abs() < 1e-9);
        let mut bad = KEYS;
        bad[2].slider = 0.4;
        assert_eq!(faults(&bad).len(), 1);
    }
}
