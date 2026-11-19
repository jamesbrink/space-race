//! What turns a body: the pilot's controls, and the air.
//!
//! By hand nothing is turned by decree. The stick works what the vehicle had: the Redstone's jet vanes while its
//! engine burns and its air rudders while there is air, the capsule's peroxide jets anywhere. And the air turns
//! everything: a finned booster noses into the wind, a capsule turns its blunt end to it, and both are damped
//! by it. Every strength here is an estimate, chosen so the vehicle handles as the reports describe it (slow,
//! steady, soon without authority once the engine stops); none is a measured moment.

use bevy::math::DVec3;
use sr_sim::Body;

/// The fastest turn the stick asks for when the attitude is held, rad/s: a booster is tipped over slowly (the
/// Redstone's own programme took two minutes over 41 degrees), a capsule turned about more briskly.
const BOOSTER_RATE: f64 = 0.06;
const CAPSULE_RATE: f64 = 0.16;
/// How hard the hold works to make the turn what was asked, 1/s.
const HOLD: f64 = 4.0;
/// What the jet vanes can do with the engine burning, rad/s^2: a side force of a few per cent of the thrust,
/// nine metres aft of the centre of mass, on a body of a million kg m^2.
const VANES: f64 = 0.09;
/// What the air rudders add for each pascal of dynamic pressure, rad/s^2: as much again as the vanes where the
/// air is thickest.
const RUDDERS: f64 = 2.0e-6;
/// What the capsule's jets can do, rad/s^2.
const JETS: f64 = 0.09;
/// How hard the air turns a body toward its trim for each pascal of dynamic pressure, rad/s^2 a radian, and how
/// hard it damps a turn, 1/s.
const STIFF: f64 = 4.0e-5;
const DAMPS: f64 = 1.5e-5;
/// How hard a parachute's pull rights the capsule under it, rad/s^2 for each m/s^2 of pull a radian (the lines
/// meet it well above its centre of mass), and how fast its swinging dies, 1/s.
const HANGS: f64 = 1.5;
const SWINGS: f64 = 1.2;

/// A body's attitude and what is acting on it.
#[derive(Debug, Clone, Copy)]
pub struct Turning {
    /// Which body it is.
    pub body: Body,
    /// Its long axis, toward its nose, and the axes its pitch and yaw turn about, in the site's frame.
    pub axis: DVec3,
    /// As `axis`.
    pub pitch: DVec3,
    /// How it is spinning, rad/s.
    pub spin: DVec3,
    /// Its velocity through the air, m/s, and the dynamic pressure, Pa.
    pub wind: DVec3,
    /// As `wind`.
    pub q: f64,
    /// Whether its engine is burning.
    pub burning: bool,
}

impl Turning {
    /// How hard the controls can turn it, rad/s^2.
    #[must_use]
    pub fn authority(&self) -> f64 {
        match self.body {
            Body::Stack => f64::from(u8::from(self.burning)) * VANES + RUDDERS * self.q,
            Body::Capsule => JETS,
            Body::Booster | Body::Tower => 0.0,
        }
    }

    /// The angular acceleration the stick gives: pitch, yaw and roll each -1 to 1, held or direct.
    #[must_use]
    pub fn control(&self, stick: DVec3, hold: bool) -> DVec3 {
        let yaw = self.pitch.cross(self.axis);
        let asked = self.pitch * stick.x + yaw * stick.y + self.axis * stick.z;
        let authority = self.authority();
        if hold {
            let rate = if self.body == Body::Capsule { CAPSULE_RATE } else { BOOSTER_RATE };
            ((asked * rate - self.spin) * HOLD).clamp_length_max(authority)
        } else {
            asked * authority
        }
    }

    /// The angular acceleration the air gives: toward the body's trim, and against its spin.
    #[must_use]
    pub fn air(&self) -> DVec3 {
        let Some(into_wind) = self.wind.try_normalize() else { return DVec3::ZERO };
        // A booster flies nose first on its fins; a capsule, and a tower with its motors spent, blunt end first.
        let trim = match self.body {
            Body::Stack | Body::Booster => into_wind,
            Body::Capsule | Body::Tower => -into_wind,
        };
        (self.axis.cross(trim) * STIFF - self.spin * DAMPS) * self.q
    }
}

impl Turning {
    /// The angular acceleration a parachute gives, pulling the small end with this acceleration, m/s^2.
    #[must_use]
    pub fn hung(&self, pull: DVec3) -> DVec3 {
        if pull == DVec3::ZERO { DVec3::ZERO } else { self.axis.cross(pull) * HANGS - self.spin * SWINGS }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn stack(burning: bool, q: f64) -> Turning {
        Turning {
            body: Body::Stack,
            axis: DVec3::Y,
            pitch: DVec3::Z,
            spin: DVec3::ZERO,
            wind: DVec3::Y * 100.0,
            q,
            burning,
        }
    }

    #[test]
    fn a_dead_booster_in_a_vacuum_cannot_be_steered() {
        assert_eq!(stack(false, 0.0).control(DVec3::X, false), DVec3::ZERO);
        assert!(stack(true, 0.0).control(DVec3::X, false).length() > 0.05);
    }

    #[test]
    fn the_hold_stops_a_turn_when_the_stick_is_let_go() {
        let mut turning = stack(true, 0.0);
        turning.spin = DVec3::Z * 0.1;
        assert!(turning.control(DVec3::ZERO, true).dot(turning.spin) < 0.0);
        assert_eq!(turning.control(DVec3::ZERO, false), DVec3::ZERO);
    }

    #[test]
    fn the_air_noses_a_booster_into_the_wind_and_turns_a_capsule_blunt_end_first() {
        let mut turning = stack(false, 20_000.0);
        turning.axis = DVec3::new(0.2, 1.0, 0.0).normalize();
        // Flying up with the nose leaning toward +X: the air turns it back toward +Y, which is a turn about +Z.
        assert!(turning.air().z > 0.0);
        turning.body = Body::Capsule;
        assert!(turning.air().z < 0.0);
    }
}
