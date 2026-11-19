//! What pushes on each body at an instant: its engine or motors and the air. The field (gravity and the turning
//! frame) is [`crate::Field`]'s and is the same for all of them.

use sr_world::V3;

use crate::{Field, Plan, Sequence, air};

/// The bodies a ballistic flight comes apart into.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Body {
    /// Booster, capsule and (until it leaves) tower, together.
    Stack,
    /// The capsule alone, after separation.
    Capsule,
    /// The spent booster, after separation.
    Booster,
    /// The escape tower, after it leaves.
    Tower,
}

/// A body's state at an instant, as the loads need it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Moment {
    /// Seconds from liftoff.
    pub t: f64,
    /// Position in the site's frame, m.
    pub position: V3,
    /// Velocity in the site's frame (so over the turning Earth, and through its air), m/s.
    pub velocity: V3,
    /// The body's long axis, toward its nose.
    pub axis: V3,
}

/// A body's mass and the forces on it other than the field's.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Loads {
    /// Mass, kg.
    pub mass: f64,
    /// Thrust, N, in the site's frame.
    pub thrust: V3,
    /// Drag, N, in the site's frame.
    pub drag: V3,
    /// Mach number.
    pub mach: f64,
    /// Dynamic pressure, Pa.
    pub q: f64,
    /// Ambient pressure, Pa.
    pub pressure: f64,
}

impl Loads {
    /// What an accelerometer aboard would read, m/s^2: everything but the field.
    #[must_use]
    pub fn felt(&self) -> V3 {
        (self.thrust + self.drag) * (1.0 / self.mass)
    }
}

/// The loads on a body.
#[must_use]
pub fn loads(plan: &Plan, body: Body, field: &Field, sequence: &Sequence, m: &Moment) -> Loads {
    let air = air::at(field.height(m.position));
    let speed = m.velocity.length();
    let mach = speed / air.sound;
    let q = 0.5 * air.density * speed * speed;
    let (mass, thrust, drag_area) = match body {
        Body::Stack => {
            let burning = (0.0..plan.cutoff.value).contains(&m.t);
            let thrust = if burning { plan.engine.thrust_at(air.pressure) } else { 0.0 };
            (plan.stack_mass(m.t), m.axis * thrust, plan.ascent_drag.at(mach) * plan.area.value)
        }
        Body::Capsule => {
            let own = plan.entry_drag.at(mach) * plan.area.value;
            let thrust = retro_direction(plan, field, m) * plan.retro_thrust(m.t);
            (plan.capsule_mass_at(m.t), thrust, own + sequence.chute_area(plan, m.t))
        }
        Body::Booster => (plan.booster_mass.value, V3::ZERO, plan.booster_drag_area.value),
        Body::Tower => {
            let since = m.t - plan.tower_off.value;
            let thrust: f64 = plan.tower_motors.iter().map(|motor| motor.thrust_after(since)).sum();
            (plan.tower_mass.value, m.axis * thrust, plan.ascent_drag.at(mach) * plan.area.value * 0.3)
        }
    };
    let drag = if speed > 0.0 { m.velocity * (-q * drag_area / speed) } else { V3::ZERO };
    Loads { mass, thrust, drag, mach, q, pressure: air.pressure }
}

/// Which way the retrorockets push the capsule: rearward, and below the level by the retro attitude's pitch.
#[must_use]
pub fn retro_direction(plan: &Plan, field: &Field, m: &Moment) -> V3 {
    let up = field.up(m.position);
    let level = (m.velocity - up * m.velocity.dot(up)).normalized();
    let (sin, cos) = plan.retro_pitch.value.to_radians().sin_cos();
    -(level * cos) - up * sin
}
