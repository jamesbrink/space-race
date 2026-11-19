//! The fires: one hung at every nozzle the flight's data names (the engine's, and each solid motor's), burning
//! while its motor does (by the hand's switches, or the record's clock), in the air the vehicle is in, and
//! striking what is under it.

use bevy::math::DVec3;
use bevy::prelude::*;
use sr_missions::types::{Burns, Flame};
use sr_render::origin::Origin;
use sr_render::plume::{Nozzle, Plume};
use sr_sim::{Plan, air};

use super::{Hand, Parts, Telemetry};
use crate::Showing;
use crate::clock::Clock;

/// The engine is lit this long before liftoff and takes this long to come to its thrust, s. Estimated: the
/// Redstone's count has ignition in the last seconds, and the films show the fire build before it lifts.
pub const LIT_BEFORE: f64 = 2.2;
const BUILDS: f64 = 1.4;
/// At cutoff the fire falls to this part of itself in `DROPS` s, and what is left dies away by `DIES` s after
/// the cutoff. `DIES` is documented (TM X-53107, 4.2: thrust is gone about 3.2 s after the cutoff signal); how
/// the fire falls in that time is estimated.
const LINGERS: f64 = 0.12;
const DROPS: f64 = 0.2;
const DIES: f64 = 3.2;
/// How fast the fire drawn follows a motor a hand lights, and one that is cut, 1/s. Estimated.
const CATCHES: f32 = 6.0;
const FADES: f32 = 1.3;

/// The booster's engine's fire.
#[derive(Component, Debug, Clone, Copy)]
pub struct Engine;

/// A solid motor's fire at one of its nozzles.
#[derive(Component, Debug, Clone, Copy)]
pub struct Motor(Burns);

/// A fire as the picture takes it, out and in sea-level air.
fn plume(flame: &Flame) -> Plume {
    let radius = flame.exit_radius.value as f32;
    Plume {
        nozzle: Nozzle {
            radius,
            chamber: flame.chamber_pressure.value as f32,
            exit: flame.exit_pressure.value as f32,
            gamma: flame.gamma.value as f32,
        },
        length: flame.length.value as f32 * radius,
        colours: flame.colours.map(Vec3::from_array),
        luminance: flame.luminance.value as f32,
        hides: flame.hides.value as f32,
        burning: 0.0,
        ambient: air::P0 as f32,
        ground: f32::INFINITY,
    }
}

/// Hang every fire on its node once the vehicle's parts are known.
pub fn kindle(mut commands: Commands, showing: Res<Showing>, parts: Res<Parts>, alive: Query<()>) {
    let flight = showing.0;
    let node = |name: &str| parts.0.get(name).copied().filter(|&node| alive.contains(node));
    if let Some(engine) = node(flight.flame.node) {
        let at = Transform::from_xyz(0.0, flight.flame.exit_height.value as f32, 0.0);
        commands.spawn((Engine, plume(&flight.flame), at, ChildOf(engine)));
    }
    for fire in flight.fires {
        let Some(on) = node(fire.flame.node) else { continue };
        for nozzle in fire.nozzles {
            let [x, z] = nozzle.across.map(|v| v as f32);
            // Its jet goes aft, tilted out from the axis by its cant.
            let (sin, cos) = (nozzle.cant.value as f32).to_radians().sin_cos();
            let jet = Vec3::NEG_Y * cos + Vec3::new(x, 0.0, z).normalize_or_zero() * sin;
            let at = Transform::from_xyz(x, fire.flame.exit_height.value as f32, z)
                .with_rotation(Quat::from_rotation_arc(Vec3::NEG_Y, jet.normalize()));
            commands.spawn((Motor(fire.burns), plume(&fire.flame), at, ChildOf(on)));
        }
    }
}

/// How hard the engine burns at an instant on the record's clock, 0 to 1.
#[must_use]
pub fn burning(t: f64, cutoff: f64) -> f32 {
    let lit = ((t + LIT_BEFORE) / BUILDS).clamp(0.0, 1.0);
    let since = t - cutoff;
    let left = if since <= 0.0 {
        1.0
    } else {
        let dying = (1.0 - since / DIES).clamp(0.0, 1.0);
        dying * dying * (LINGERS + (1.0 - LINGERS) * (-since / DROPS).exp())
    };
    (lit * left) as f32
}

/// Whether a solid motor is burning at an instant: lit when the plan (or the hand) has it lit, for as long as
/// the plan has it burn.
#[must_use]
pub fn firing(burns: Burns, hand: &Hand, plan: &Plan, t: f64) -> bool {
    let [tower_off, separated, _] = hand.leaves(plan);
    match burns {
        // (an escape rocket spent pulling the capsule clear does not fire again when the tower goes)
        Burns::Tower(which) => {
            let lit = if which == 0 { hand.aborted.or(tower_off) } else { tower_off };
            let motor = plan.tower_motors.get(which);
            lit.zip(motor).is_some_and(|(lit, motor)| motor.thrust_after(t - lit) > 0.0)
        }
        Burns::Retro(which) => {
            let first = plan.retro_fires[0].value;
            let Some(fires) = plan.retro_fires.get(which) else { return false };
            let lit =
                if hand.guided { Some(fires.value) } else { hand.retro.map(|lit| lit + fires.value - first) };
            lit.is_some_and(|lit| plan.retro.thrust_after(t - lit) > 0.0)
        }
        Burns::Posigrade(burn) => {
            hand.aborted.is_none() && separated.is_some_and(|at| (0.0..burn.value).contains(&(t - at)))
        }
    }
}

/// How far down a jet the hardstand it strikes is, m; infinite for a jet that points away from it. (The
/// launcher's table is a ring: the fire goes through it onto the deflector and the concrete under it.)
fn strikes(from: DVec3, toward: DVec3) -> f32 {
    if toward.y > -1.0e-3 { f32::INFINITY } else { (from.y / -toward.y).max(0.0) as f32 }
}

/// Each frame: the engine's fire as the engine and the air have it, and what it strikes; and every solid
/// motor's, burning while its motor does.
pub fn stoke(
    showing: Res<Showing>,
    clock: Res<Clock>,
    time: Res<Time>,
    hand: Res<Hand>,
    telemetry: Res<Telemetry>,
    origin: Option<Res<Origin>>,
    mut engines: Query<(&mut Plume, &GlobalTransform), With<Engine>>,
    mut motors: Query<(&mut Plume, &Motor), Without<Engine>>,
) {
    let flight = showing.0;
    let ambient = if clock.t > 0.0 { telemetry.pressure } else { air::P0 };
    let wanted = if clock.ready { hand.fire(&flight.plan, clock.t) } else { 0.0 };
    for (mut plume, placed) in &mut engines {
        plume.burning = if hand.guided { wanted } else { follow(plume.burning, wanted, time.delta_secs()) };
        plume.ambient = ambient as f32;
        // (where it is drawn from the eye says where it is; with no picture there is no eye, and nothing to strike)
        if let Some(origin) = &origin {
            let from = origin.0 + placed.translation().as_dvec3();
            plume.ground = strikes(from, (placed.rotation() * Vec3::NEG_Y).as_dvec3());
        }
    }
    for (mut plume, motor) in &mut motors {
        let wanted = f32::from(clock.ready && firing(motor.0, &hand, &flight.plan, clock.t));
        // (a solid motor is lit and out in a few hundredths of a second)
        plume.burning = follow(plume.burning, wanted, time.delta_secs() * 4.0);
        plume.ambient = ambient as f32;
    }
}

/// A fire a hand has lit or cut: up at once, down fast to what lingers and then slowly out.
fn follow(now: f32, wanted: f32, passed: f32) -> f32 {
    let rate = if wanted > now || now > LINGERS as f32 { CATCHES } else { FADES };
    let next = now + (wanted - now) * (1.0 - (-rate * passed).exp());
    if next < 4.0e-3 && wanted <= 0.0 { 0.0 } else { next }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sr_measure::Measure;
    use sr_missions::usa::mercury::mr3::PLAN;

    #[test]
    fn the_fire_builds_before_liftoff_and_dies_after_cutoff() {
        assert_eq!(burning(-5.0, 141.8), 0.0);
        assert!(burning(-1.5, 141.8) > 0.0 && burning(-1.5, 141.8) < 1.0);
        assert_eq!(burning(0.0, 141.8), 1.0);
        assert_eq!(burning(100.0, 141.8), 1.0);
        assert!(burning(142.3, 141.8) < 0.2 && burning(142.3, 141.8) > 0.0);
        assert_eq!(burning(141.9 + DIES, 141.8), 0.0);
    }

    #[test]
    fn each_motor_fires_when_the_record_has_it_fire() {
        let hand = Hand::new(&PLAN, 30.0);
        let tower = PLAN.tower_off.value;
        assert!(firing(Burns::Tower(0), &hand, &PLAN, tower + 0.3));
        assert!(!firing(Burns::Tower(0), &hand, &PLAN, tower + 1.0));
        assert!(firing(Burns::Tower(1), &hand, &PLAN, tower + 1.0));
        assert!(!firing(Burns::Tower(1), &hand, &PLAN, tower - 0.1));
        let posigrade = Burns::Posigrade(Measure::documented(1.0, "test"));
        assert!(firing(posigrade, &hand, &PLAN, PLAN.separation.value + 0.5));
        assert!(!firing(posigrade, &hand, &PLAN, PLAN.separation.value + 1.5));
        // The second retrorocket is lit while the first still burns, and the third outlasts both.
        let second = PLAN.retro_fires[1].value;
        assert!(firing(Burns::Retro(0), &hand, &PLAN, second + 1.0));
        assert!(firing(Burns::Retro(1), &hand, &PLAN, second + 1.0));
        assert!(!firing(Burns::Retro(2), &hand, &PLAN, second + 1.0));
        assert!(!firing(Burns::Retro(1), &hand, &PLAN, second - 1.0));
    }

    #[test]
    fn by_hand_nothing_fires_until_it_is_lit_and_an_abort_spends_the_escape_rocket() {
        let mut hand = Hand::new(&PLAN, -12.0);
        assert!(!firing(Burns::Tower(0), &hand, &PLAN, 200.0));
        assert!(!firing(Burns::Retro(0), &hand, &PLAN, 320.0));
        hand.act(0.0);
        assert!(hand.abort(20.0));
        assert!(firing(Burns::Tower(0), &hand, &PLAN, 20.3));
        hand.tower = Some(40.0);
        assert!(!firing(Burns::Tower(0), &hand, &PLAN, 40.3));
        assert!(firing(Burns::Tower(1), &hand, &PLAN, 40.3));
    }

    #[test]
    fn a_cut_fire_falls_fast_and_then_lingers() {
        let mut level = 1.0;
        for _ in 0..30 {
            level = follow(level, 0.0, 1.0 / 60.0);
        }
        assert!(level < 0.15 && level > 0.01, "{level}");
        for _ in 0..600 {
            level = follow(level, 0.0, 1.0 / 60.0);
        }
        assert_eq!(level, 0.0);
    }
}
