//! The engine's fire: hung at the nozzle the flight's data names, burning while the plan has the engine burn,
//! and spreading as the air the vehicle is in thins.

use bevy::prelude::*;
use sr_render::plume::Plume;
use sr_sim::air;

use super::{Parts, Telemetry};
use crate::Showing;
use crate::clock::Clock;

/// The engine is lit this long before liftoff and takes this long to come to its thrust, s. Estimated: the
/// Redstone's count has ignition in the last seconds, and the films show the fire build before it lifts.
const LIT_BEFORE: f64 = 2.2;
const BUILDS: f64 = 1.4;
/// How long the fire takes to die at cutoff, s. Estimated.
const DIES: f64 = 0.35;

/// Hang the fire on the engine once the vehicle's parts are known.
pub fn kindle(mut commands: Commands, showing: Res<Showing>, parts: Res<Parts>) {
    let flame = &showing.0.flame;
    let Some(&engine) = parts.0.get(flame.node) else { return };
    let radius = flame.exit_radius.value as f32;
    commands.spawn((
        Plume {
            radius,
            length: flame.length.value as f32 * radius,
            colours: flame.colours.map(Vec3::from_array),
            burning: 0.0,
            spread: 1.0,
        },
        Transform::from_xyz(0.0, flame.exit_height.value as f32, 0.0),
        ChildOf(engine),
    ));
}

/// How hard the engine burns at an instant, 0 to 1.
#[must_use]
pub fn burning(t: f64, cutoff: f64) -> f32 {
    let lit = ((t + LIT_BEFORE) / BUILDS).clamp(0.0, 1.0);
    let out = ((t - cutoff) / DIES).clamp(0.0, 1.0);
    (lit * (1.0 - out)) as f32
}

/// Each frame: the fire as the clock and the air have it.
pub fn stoke(
    showing: Res<Showing>,
    clock: Res<Clock>,
    telemetry: Res<Telemetry>,
    mut plumes: Query<&mut Plume>,
) {
    let flight = showing.0;
    let ambient = if clock.t > 0.0 { telemetry.pressure } else { air::P0 };
    for mut plume in &mut plumes {
        plume.burning = if clock.ready { burning(clock.t, flight.plan.cutoff.value) } else { 0.0 };
        plume.spread = (flight.flame.exit_pressure.value / ambient.max(1.0)).clamp(1.0, 60.0) as f32;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_fire_builds_before_liftoff_and_dies_at_cutoff() {
        assert_eq!(burning(-5.0, 141.8), 0.0);
        assert!(burning(-1.5, 141.8) > 0.0 && burning(-1.5, 141.8) < 1.0);
        assert_eq!(burning(0.0, 141.8), 1.0);
        assert_eq!(burning(100.0, 141.8), 1.0);
        assert_eq!(burning(143.0, 141.8), 0.0);
    }
}
