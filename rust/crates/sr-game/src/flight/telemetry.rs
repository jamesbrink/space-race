//! What the crewed body is doing, for the readout: read off its state each step, nothing kept.

use avian3d::prelude::{LinearVelocity, Position};
use bevy::math::DVec3;
use bevy::prelude::*;
use sr_sim::loads::Moment;
use sr_sim::{Loads, Stress};
use sr_world::earth::G0;

use super::bodies::v3;
use super::heat::Warmth;
use super::{Course, Crewed};
use crate::stage::dvec;

/// The crewed body's figures.
#[derive(Resource, Debug, Clone, Copy, Default)]
pub struct Telemetry {
    /// Height above the sea, m.
    pub height: f64,
    /// Speed over the turning Earth, m/s, and how much of it is climb.
    pub speed: f64,
    /// As `speed`.
    pub climb: f64,
    /// Distance over the sea from the pad, m.
    pub range: f64,
    /// The top of the path it is on, m above the sea, if only the Earth acted on it from here.
    pub apogee: Option<f64>,
    /// Mach number, and dynamic pressure, Pa.
    pub mach: f64,
    /// As `mach`.
    pub q: f64,
    /// What an accelerometer aboard reads, in g, and the speed the body gained or lost in the last step of the
    /// physics, m/s: both measured off its motion, so whatever it stands on or strikes is in them.
    pub g: f64,
    /// As `g`.
    pub jolt: f64,
    /// Thrust, N, and ambient pressure, Pa.
    pub thrust: f64,
    /// As `thrust`.
    pub pressure: f64,
    /// The nose's elevation above the level, and its true bearing, degrees.
    pub pitch: f64,
    /// As `pitch`.
    pub heading: f64,
    /// The same of the way it is going.
    pub path: f64,
    /// As `path`.
    pub track: f64,
    /// How much of the propellant is left, 0 to 1.
    pub propellant: f64,
    /// How near its structure is to what it stands.
    pub stress: Stress,
    /// The air's heat on it.
    pub heat: Warmth,
    /// Where the record has its nose just now, as `pitch` and `heading`: what the flight intended, for a hand to
    /// fly to or not.
    pub cue: Option<[f64; 2]>,
}

impl Course {
    /// A direction from a place as an elevation above the level there and a true bearing, degrees.
    #[must_use]
    pub fn points(&self, position: sr_world::V3, toward: sr_world::V3) -> [f64; 2] {
        let enu = self.site.to_enu(toward);
        let elevation = toward.dot(self.field.up(position)).clamp(-1.0, 1.0).asin().to_degrees();
        [elevation, enu.x.atan2(enu.y).to_degrees().rem_euclid(360.0)]
    }
}

impl Telemetry {
    /// The figures at a moment. What is measured off the motion ([`feel`]) is kept.
    #[must_use]
    pub fn read(&self, course: &Course, m: &Moment, l: &Loads, climb: f64) -> Self {
        let speed = m.velocity.length();
        let [pitch, heading] = course.points(m.position, m.axis);
        let [path, track] =
            if speed > 0.5 { course.points(m.position, m.velocity * (1.0 / speed)) } else { [0.0; 2] };
        Self {
            height: course.field.height(m.position),
            speed,
            climb,
            range: course.field.range(m.position),
            apogee: course.field.apogee(m.position, m.velocity),
            mach: l.mach,
            q: l.q,
            g: self.g,
            jolt: self.jolt,
            thrust: l.thrust.length(),
            pressure: l.pressure,
            pitch,
            heading,
            path,
            track,
            propellant: self.propellant,
            stress: self.stress,
            heat: self.heat,
            cue: self.cue,
        }
    }
}

/// The accelerometer: what the crewed body's motion over the last step says it felt, the field taken out.
pub fn feel(
    course: Res<Course>,
    time: Res<Time>,
    crewed: Query<(&Position, &LinearVelocity), With<Crewed>>,
    mut before: Local<Option<DVec3>>,
    mut telemetry: ResMut<Telemetry>,
) {
    let Ok((at, velocity)) = crewed.single() else { return };
    let now = velocity.0.as_dvec3();
    if let Some(was) = before.replace(now) {
        let field = dvec(course.field.acceleration(v3(at.0), v3(now)));
        let step = time.delta_secs_f64().max(1e-6);
        telemetry.jolt = (now - was).length();
        telemetry.g = ((now - was) / step - field).length() / G0;
    }
}
