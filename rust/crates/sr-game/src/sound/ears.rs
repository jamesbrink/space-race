//! The game's state as the sound's model wants it: where the ears are for each camera, the vehicle as a source of
//! sound at an instant, and what someone going with it is in.

use bevy::math::DVec3;
use bevy::prelude::*;
use sr_missions::Flight;
use sr_sim::{Body, air, guidance};
use sr_world::V3;

use super::air::carries;
use super::figures::{JET_THRUST, ON_GROUND};
use super::model::{Craft, Listener, Now, Seat};
use super::path::{Ears, Past};
use crate::clock::Clock;
use crate::flight::bodies::v3;
use crate::flight::{Course, Hand, Sequencer, Telemetry};
use crate::rig::Kind;

/// The land is level with the hardstand this far from the site, m (`flight/setup.rs`); past it is the sea.
const LAND: f64 = 12_000.0;
/// Ears within this of whatever is under them are standing on it, m.
const STANDING: f64 = 5.0;

/// Where a camera's ears are, as far as what they hear goes.
#[must_use]
pub fn seat(rig: Kind) -> Seat {
    match rig {
        Kind::Pad | Kind::Tracking => Seat::Standing,
        Kind::Chase => Seat::Beside,
        Kind::Onboard => Seat::Inside,
    }
}

/// How high whatever is under a place is above the sea, m: the hardstand's height near the site, nought beyond.
fn floor(course: &Course, at: V3) -> f64 {
    if at.x.hypot(at.z) < LAND { course.field.height(V3::ZERO) } else { 0.0 }
}

/// The ears at a place, going with the vehicle (at `going`, m/s) unless they stand on the ground.
#[must_use]
pub fn listener(course: &Course, seat: Seat, at: DVec3, right: Vec3, going: DVec3) -> Listener {
    let at = v3(at);
    let height = course.field.height(at);
    let above = height - floor(course, at);
    let air = air::at(height);
    let velocity = if seat == Seat::Standing { V3::ZERO } else { v3(going) };
    Listener {
        seat,
        ears: Ears { at, velocity, sound: air.sound },
        right: v3(right.as_dvec3()),
        above,
        off: course.field.range(at),
        carries: carries(height),
        pressure: air.pressure,
        reflection: if above < STANDING { ON_GROUND.value } else { 1.0 },
    }
}

/// The same ears as the sea (or the ground) reflects them: as far under it as they are over it.
#[must_use]
pub fn mirrored(course: &Course, listener: &Listener) -> Listener {
    let up = course.field.up(listener.ears.at);
    let ears = Ears { at: listener.ears.at - up * (2.0 * listener.above), ..listener.ears };
    Listener { ears, ..*listener }
}

/// A body as a source of sound.
#[derive(Debug, Clone, Copy)]
pub struct Source {
    /// When, s on the clock.
    pub t: f64,
    /// Its origin in the site's frame, m, its velocity, m/s, and its long axis.
    pub at: V3,
    /// As `at`.
    pub velocity: V3,
    /// As `at`.
    pub axis: V3,
    /// Whether its engine is on it still, and how hard that burns, 0 to 1.
    pub stack: bool,
    /// As `stack`.
    pub burn: f64,
}

impl Source {
    /// What the sound's history keeps of it: the engine's noise comes from its nozzle while it has one.
    #[must_use]
    pub fn past(&self, flight: &Flight, course: &Course) -> Past {
        let down = if self.stack { flight.flame.exit_height.value } else { 0.0 };
        let at = self.at + self.axis * down;
        let height = course.field.height(at);
        let air = air::at(height);
        let thrust = if self.stack { flight.plan.engine.thrust_at(air.pressure) * self.burn } else { 0.0 };
        Past {
            t: self.t,
            at,
            velocity: self.velocity,
            axis: self.axis,
            power: Craft::of(&flight.plan.engine).power(thrust),
            sound: air.sound,
            carries: carries(height),
            pressure: air.pressure,
            mach: self.velocity.length() / air.sound,
        }
    }
}

/// The record's flight up to `now`, as the history would have kept it: for a flight joined after liftoff, whose
/// sound from before then is still on its way.
pub fn flown(
    flight: &Flight,
    course: &Course,
    hand: &Hand,
    now: f64,
    keep: f64,
) -> impl Iterator<Item = Past> {
    let plan = &flight.plan;
    course.flown.path.iter().filter(move |sample| sample.t <= now && sample.t > now - keep).map(
        move |sample| {
            let stack = sample.t < plan.separation.value;
            let source = Source {
                t: sample.t,
                at: course.stands + sample.position,
                velocity: sample.velocity,
                axis: if stack { guidance::stack_axis(plan, course.down_range, sample.t) } else { V3::Y },
                stack,
                burn: f64::from(hand.fire(plan, sample.t)),
            };
            source.past(flight, course)
        },
    )
}

/// What someone going with the vehicle is in, at the clock's instant.
#[must_use]
pub fn now(
    (flight, clock): (&Flight, &Clock),
    (hand, sequencer, telemetry): (&Hand, &Sequencer, &Telemetry),
    (body, at, burn): (Body, V3, f64),
    listener: &Listener,
    course: &Course,
) -> Now {
    let plan = &flight.plan;
    let since = |when: Option<f64>| when.map(|when| clock.t - when).filter(|&since| since >= 0.0);
    let thrust = if body == Body::Stack { plan.engine.thrust_at(telemetry.pressure) * burn } else { 0.0 };
    // The jets answer the stick once the capsule is its own, by hand, while there is a capsule.
    let flying = !hand.guided && hand.lost.is_none() && body == Body::Capsule && sequencer.0.landed.is_none();
    let stick = f64::from(hand.stick.abs().max_element().min(1.0));
    Now {
        rise: at.y - course.stands.y,
        distance: (listener.ears.at - at).length(),
        q: telemetry.q,
        mach: telemetry.mach,
        power: Craft::of(&plan.engine).power(thrust),
        standoff: flight.flame.exit_height.value.abs(),
        carries: carries(telemetry.height),
        jets: if flying { stick * JET_THRUST.value } else { 0.0 },
        drogue: since(sequencer.0.drogue),
        main: since(sequencer.0.main),
        down: since(sequencer.0.landed),
        afloat: sequencer.0.landed.is_some() && telemetry.height < 1.0 && hand.lost.is_none(),
    }
}
