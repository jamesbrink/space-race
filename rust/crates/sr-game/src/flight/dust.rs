//! What the fire raises off the pad: while the nozzle is near the ground its blast throws dust and steam out
//! across the concrete, less as the vehicle climbs, none once it is clear.

use avian3d::prelude::{Position, Rotation};
use bevy::math::DVec3;
use bevy::prelude::*;
use sr_render::origin::WorldPos;
use sr_render::smoke::Puff;

use super::Crewed;
use super::fire::burning;
use crate::Showing;
use crate::clock::Clock;

/// Above this the blast no longer reaches the pad, m. Estimated, from the liftoff films.
const REACH: f64 = 40.0;
/// Puffs let go a second with the nozzle on the pad. Estimated: enough to read as a cloud, few enough to draw.
const RATE: f64 = 45.0;

/// A different number each time, 0 to 1: the puffs need no better dice than these.
fn dice(seed: &mut u32) -> f32 {
    *seed = seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
    (*seed >> 8) as f32 / 16_777_216.0
}

/// Each frame: the puffs the blast has raised since the last.
pub fn raise(
    mut commands: Commands,
    showing: Res<Showing>,
    clock: Res<Clock>,
    crewed: Query<(&Position, &Rotation), With<Crewed>>,
    mut owed: Local<f64>,
    mut last: Local<f64>,
    mut seed: Local<u32>,
) {
    let passed = (clock.t - *last).clamp(0.0, 0.5);
    *last = clock.t;
    let Ok((at, turned)) = crewed.single() else { return };
    let flight = showing.0;
    let nozzle = at.0 + (turned.0 * Vec3::Y).as_dvec3() * flight.flame.exit_height.value;
    let near = (1.0 - nozzle.y / REACH).clamp(0.0, 1.0);
    *owed += RATE * passed * near * f64::from(burning(clock.t, flight.plan.cutoff.value));
    while *owed >= 1.0 {
        *owed -= 1.0;
        let bearing = dice(&mut seed) * std::f32::consts::TAU;
        let out = Vec3::new(bearing.cos(), 0.0, bearing.sin());
        let speed = 10.0 + 22.0 * dice(&mut seed);
        commands.spawn((
            Puff {
                born: clock.t as f32,
                lasts: 3.0 + 4.0 * dice(&mut seed),
                grows: [0.8, 3.5 + 4.5 * dice(&mut seed)],
                velocity: out * speed + Vec3::Y * (0.5 + 2.5 * dice(&mut seed)),
            },
            WorldPos(DVec3::new(nozzle.x, 0.6, nozzle.z) + (out * 2.5).as_dvec3()),
        ));
    }
}
