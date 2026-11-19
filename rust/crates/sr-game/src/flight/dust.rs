//! What the fire does to the air at the pad: while its jet reaches the ground it is thrown out along it, raising
//! the hardstand's dust and, as it lights, a billow of its own vapour; the day's wind carries both away. This
//! says what feeds the air each frame; `sr-render`'s fumes work it as a fluid and draw it.
//!
//! How hard the jet strikes is worked from the engine's thrust: a round turbulent jet's speed on its axis, far
//! down it, is 6.8 sqrt(J / rho) / x, J its thrust and rho the air's density (the far field of a jet keeps its
//! momentum: Pope, Turbulent Flows, 5.1, with a decay constant of 6), and the sheet it throws out along the ground
//! falls off as one over the distance from the strike. Both are derived; how much of that the grid can carry is
//! not, and says so.

use avian3d::prelude::LinearVelocity;
use bevy::math::DVec3;
use bevy::prelude::*;
use sr_missions::types::PadAir;
use sr_render::fumes::{Fumes, Lamp, Push, Source};
use sr_render::origin::Origin;
use sr_render::plume::{Plume, candela};
use sr_sim::air;
use sr_world::V3;

use super::fire::{self, Engine};
use super::{Course, Crewed, Hand};
use crate::Showing;
use crate::clock::Clock;
use crate::stage::dvec;

/// A jet's speed on its axis far down it, as a multiple of sqrt(J / rho) / x.
const DECAY: f64 = 6.8;
/// The speed of the sheet along the ground at a distance from the strike, as a multiple of sqrt(J / rho) / r
/// (a radial wall jet from a round jet's strike keeps about this much: Poreh, Tsuei and Cermak, 1967).
const SHEET: f64 = 1.1;
/// The ring the blast is fed to the air from is no smaller than this, m, and no faster than this, m/s: some
/// two cells of the grid, and what a step of it can carry. The real sheet at that ring is several times faster.
const RING: f64 = 3.0;
const FASTEST: f64 = 45.0;
/// Below this the air at the ground is no blast, m/s.
const SLOWEST: f64 = 12.0;
/// The ring widens by this much of the nozzle's height, as the jet does before it strikes (a jet's half-width
/// is a tenth of how far it has gone).
const WIDENS: f64 = 0.12;
/// The exhaust's water is laid along the ground only while the jet that strikes it is still the fire's own gas,
/// within about the fire's length of the nozzle (13.9 m at the sea): above that the jet reaching the ground is
/// mostly air it has taken in, still a wind that raises dust but carrying little to condense. The share falls by e
/// over this much of the nozzle's height, m. Estimated, against the stills of MR-3 and MR-4 just off the pad
/// (NASA 6100884, S61-01928, S61-03248: a low haze over the apron and no great bank once the vehicle is up).
const LADEN: f64 = 6.0;
/// The air in the sheet is this much hotter than the day's where it leaves the ring at its fastest, K.
/// Estimated: the gas is 1,800 K at the nozzle and has mixed with many times its mass of air by there.
const HOT: f32 = 20.0;

/// The billow of the engine's first fire: how far from the launcher's middle it is fed to the air and how high
/// over the hardstand, m, and how fast it is lifted, m/s. Estimated from the still of MR-3's ignition (NASA
/// S61-02407): some 10 m across and 3 m high.
const BILLOW: [f64; 2] = [3.4, 1.6];
const RISES: f32 = 1.2;

/// A vent is fed to the air from a ball of this radius, m: the grid's cell, which is as fine as it can be.
const VENT: f32 = 1.0;
/// Nothing the vehicle does feeds the pad's air once it is this high, m: the jet has stopped reaching the
/// ground by half that (`blast`).
const REACH: f64 = 900.0;

/// A blast: the ring it leaves from (m), how fast (m/s), how thick the sheet is (m).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Blast {
    /// The ring's radius, m.
    pub ring: f32,
    /// How fast the sheet leaves it, m/s.
    pub speed: f32,
    /// How thick the sheet is there, m.
    pub thick: f32,
}

/// What a jet of `thrust` N does at the ground `height` m under its nozzle, burning this hard; nothing once the
/// air there is slower than a fresh wind.
#[must_use]
pub fn blast(thrust: f64, height: f64, burning: f64) -> Option<Blast> {
    let strength = (thrust * burning / air::at(0.0).density).sqrt();
    let on_axis = DECAY * strength / height.max(0.1);
    if burning <= 0.0 || on_axis < SLOWEST {
        return None;
    }
    let ring = RING.max(WIDENS * height);
    // (the sheet at the ring, from a strike that far up: no faster than the jet arrives)
    let speed = (SHEET * strength / ring.hypot(0.3 * height)).min(on_axis).min(FASTEST);
    Some(Blast { ring: ring as f32, speed: speed as f32, thick: (0.5 + 0.1 * ring) as f32 })
}

/// The pad's air as the flight's day has it, with nothing yet feeding it.
fn still(course: &Course, air: &PadAir) -> Fumes {
    let (sin, cos) = air.wind_from.value.to_radians().sin_cos();
    Fumes {
        pad: DVec3::new(course.stands.x, 0.0, course.stands.z),
        downwind: dvec(course.site.from_enu(V3::new(-sin, -cos, 0.0))).as_vec3(),
        wind: air.wind_speed.value as f32,
        raises: air.dust.value as f32,
        over: air.dust_over.value as f32,
        sources: Vec::new(),
        lamp: None,
    }
}

/// What the engine's jet feeds the air while it reaches the ground: the sheet thrown out along the hardstand,
/// carrying the exhaust's water as it condenses, and as the engine lights the billow of its first fire, which is
/// mostly vapour, stands round the launcher over the sheet and is soon gone.
fn struck(nozzle: DVec3, thrust: f64, burning: f64, since_lit: f64, air: &PadAir, into: &mut Vec<Source>) {
    let Some(blast) = blast(thrust, nozzle.y, burning) else { return };
    // (the less of the jet reaches the ground, the less of its water is laid along it)
    let strength = blast.speed / FASTEST as f32 * (-(nozzle.y.max(0.0)) / LADEN).exp() as f32;
    into.push(Source {
        at: DVec3::new(nozzle.x, 0.0, nozzle.z),
        radius: blast.ring,
        push: Push::Blast { speed: blast.speed, thick: blast.thick },
        dust: 0.0,
        vapour: air.condenses.value as f32 * strength,
        heat: HOT * blast.speed / FASTEST as f32 * 30.0,
    });
    let vapour = air.vapour.value * (-since_lit.max(0.0) / air.vapour_lasts.value).exp();
    if vapour > 0.01 * air.vapour.value {
        into.push(Source {
            at: DVec3::new(nozzle.x, BILLOW[1], nozzle.z),
            radius: BILLOW[0] as f32,
            push: Push::Blow { velocity: Vec3::Y * RISES, hold: 1.0 },
            dust: 0.0,
            vapour: vapour as f32,
            heat: 0.0,
        });
    }
}

/// What the vehicle's vents feed the air: cold vapour, let out of its side while each is open, which falls.
fn vented(at: DVec3, turned: Quat, moving: Vec3, t: f64, air: &PadAir, into: &mut Vec<Source>) {
    for vent in air.vents.iter().filter(|vent| (vent.from.value..vent.until.value).contains(&t)) {
        let place = DVec3::from_array(vent.at).as_vec3();
        let way = DVec3::from_array(vent.toward).as_vec3().normalize_or_zero();
        into.push(Source {
            at: at + (turned * place).as_dvec3(),
            radius: VENT,
            push: Push::Blow { velocity: moving + turned * way * vent.speed.value as f32, hold: 10.0 },
            dust: 0.0,
            vapour: vent.vapour.value as f32,
            heat: -(vent.cold.value as f32) * 10.0,
        });
    }
}

/// Each frame: what the engine's jet and the vehicle's vents feed the air at the pad, and the light the fire
/// throws into it.
pub fn raise(
    mut commands: Commands,
    showing: Res<Showing>,
    clock: Res<Clock>,
    hand: Res<Hand>,
    course: Res<Course>,
    fumes: Option<ResMut<Fumes>>,
    origin: Option<Res<Origin>>,
    crewed: Query<&LinearVelocity, With<Crewed>>,
    engines: Query<(&Plume, &GlobalTransform), With<Engine>>,
) {
    let flight = showing.0;
    let Some(mut fumes) = fumes else {
        commands.insert_resource(still(&course, &flight.pad_air));
        return;
    };
    fumes.sources.clear();
    fumes.lamp = None;
    // Where the engine is drawn from the eye says where it is, whatever body carries it now.
    let (Some(origin), Ok(moving), Ok((plume, placed))) = (origin, crewed.single(), engines.single()) else {
        return;
    };
    let nozzle = origin.0 + placed.translation().as_dvec3();
    if !clock.ready || nozzle.y > REACH {
        return;
    }
    let turned = placed.rotation();
    let at = nozzle - (turned * Vec3::Y).as_dvec3() * flight.flame.exit_height.value;
    let lit = if hand.guided { hand.lit.or(Some(-fire::LIT_BEFORE)) } else { hand.lit };
    let since = lit.map_or(f64::MAX, |lit| clock.t - lit);
    let thrust = flight.plan.engine.thrust.value;
    struck(nozzle, thrust, f64::from(plume.burning), since, &flight.pad_air, &mut fumes.sources);
    vented(at, turned, moving.0, clock.t, &flight.pad_air, &mut fumes.sources);
    if plume.burning > 0.0 {
        let [_, hot, warm, ..] = plume.colours;
        fumes.lamp = Some(Lamp {
            at: nozzle - DVec3::Y * nozzle.y.min(4.0) * 0.8,
            candela: candela(plume),
            colour: hot.lerp(warm, 0.3),
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The A-7's thrust at the sea, N.
    const THRUST: f64 = 350_787.0;

    #[test]
    fn on_the_pad_the_blast_is_as_fast_as_the_grid_carries_and_leaves_from_its_smallest_ring() {
        let low = blast(THRUST, 0.5, 1.0).unwrap();
        assert_eq!((low.ring, low.speed), (RING as f32, FASTEST as f32));
        assert!(blast(THRUST, 0.5, 0.0).is_none());
    }

    #[test]
    fn it_weakens_and_widens_as_the_vehicle_climbs_and_is_gone_a_few_hundred_metres_up() {
        let (at_30, at_120) = (blast(THRUST, 30.0, 1.0).unwrap(), blast(THRUST, 120.0, 1.0).unwrap());
        assert!(at_30.speed <= FASTEST as f32 && at_120.speed < 0.5 * at_30.speed, "{at_30:?} {at_120:?}");
        assert!(at_120.ring > 4.0 * at_30.ring.min(3.0));
        assert!(blast(THRUST, 250.0, 1.0).is_some() && blast(THRUST, 400.0, 1.0).is_none());
    }
}
