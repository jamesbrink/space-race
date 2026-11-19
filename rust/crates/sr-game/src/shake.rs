//! The camera shaken by what shakes a camera: the engine's noise through the air near it, and the air's buffet
//! on the vehicle it rides. Every strength here is an estimate, set against the films (a camera at the pad's edge
//! at liftoff, the onboard cameras through the greatest dynamic pressure). K holds it still, and a frame taken
//! for a file is never shaken.

use avian3d::prelude::Position;
use bevy::prelude::*;
use sr_render::origin::{Eye, Place, WorldPos};
use sr_sim::air;

use crate::Options;
use crate::clock::Clock;
use crate::flight::{Crewed, Telemetry};
use crate::rig::{Kind, Rig, aim};

/// The most the engine's noise turns a camera, radians, standing `NEAR` metres from a thrust of `LOUD` newtons at
/// sea level; it falls off as the square of the distance and with the air's thinning.
const NOISE: f32 = 0.006;
const NEAR: f64 = 60.0;
const LOUD: f64 = 350_000.0;
/// What the air's buffet turns a camera fixed to the vehicle, radians for each pascal of dynamic pressure, and
/// what the engine under it adds at full thrust.
const BUFFET: f32 = 1.6e-7;
const RUMBLE: f32 = 0.0025;
/// It is never turned more than this, radians.
const MOST: f32 = 0.012;

/// Whether the camera is shaken.
#[derive(Resource, Debug, Clone, Copy, PartialEq, Eq)]
pub struct Shaken(pub bool);

/// Shakes the camera.
pub struct ShakePlugin;

impl Plugin for ShakePlugin {
    fn build(&self, app: &mut App) {
        app.insert_resource(Shaken(true))
            .add_systems(Update, hold)
            .add_systems(PostUpdate, shake.after(aim).before(Place));
    }
}

/// A restless figure between -1 and 1 for an instant: three tones that never fall into step.
fn tremble(t: f32, voice: f32) -> f32 {
    ((t * 71.3 + voice).sin() + (t * 113.7 + voice * 1.7).sin() + (t * 173.1 + voice * 2.9).sin()) / 3.0
}

fn hold(keys: Res<ButtonInput<KeyCode>>, mut shaken: ResMut<Shaken>) {
    if keys.just_pressed(KeyCode::KeyK) {
        shaken.0 = !shaken.0;
    }
}

/// How hard a camera this far from the vehicle is shaken, radians.
#[must_use]
pub fn strength(kind: Kind, away: f64, thrust: f64, q: f64, thinning: f64) -> f32 {
    let through_the_air = NOISE * (thrust / LOUD * thinning * (NEAR / away.max(NEAR)).powi(2)) as f32;
    let aboard =
        if kind == Kind::Onboard { BUFFET * q as f32 + RUMBLE * (thrust / LOUD) as f32 } else { 0.0 };
    (through_the_air + aboard).min(MOST)
}

fn shake(
    options: Res<Options>,
    shaken: Res<Shaken>,
    clock: Res<Clock>,
    rig: Res<Rig>,
    telemetry: Res<Telemetry>,
    crewed: Query<&Position, With<Crewed>>,
    mut eye: Query<(&WorldPos, &mut Transform), With<Eye>>,
) {
    let (Ok(vehicle), Ok((at, mut placed))) = (crewed.single(), eye.single_mut()) else { return };
    if !shaken.0 || options.shot.is_some() || clock.stopped {
        return;
    }
    let thinning = air::at(telemetry.height).density / air::at(0.0).density;
    let away = (at.0 - vehicle.0).length();
    let by = strength(rig.kind, away, telemetry.thrust, telemetry.q, thinning);
    if by > 1.0e-5 {
        let t = clock.t as f32;
        let turn = Vec3::new(tremble(t, 0.0), tremble(t, 2.1), 0.4 * tremble(t, 4.3)) * by;
        placed.rotate_local(Quat::from_scaled_axis(turn));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_noise_falls_off_with_distance_and_with_the_air() {
        let near = strength(Kind::Pad, 68.0, 350_000.0, 0.0, 1.0);
        let far = strength(Kind::Tracking, 250.0, 350_000.0, 0.0, 1.0);
        assert!(near > 0.003 && near < 0.007, "{near}");
        assert!(far < near / 10.0, "{far}");
        assert_eq!(strength(Kind::Chase, 90.0, 350_000.0, 0.0, 0.0), 0.0, "nothing is heard out of the air");
    }

    #[test]
    fn a_camera_on_the_vehicle_feels_the_air_and_the_engine_whatever_the_air() {
        let riding = strength(Kind::Onboard, 2.0, 380_000.0, 40_000.0, 0.2);
        assert!(riding > 0.008, "{riding}");
        assert!(strength(Kind::Onboard, 2.0, 0.0, 0.0, 0.0) < 1.0e-6);
        assert!(tremble(12.3, 0.0).abs() <= 1.0);
    }
}
