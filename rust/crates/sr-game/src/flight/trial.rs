//! The flight tried without a window: the physics engine, the clock and the hand, stepped a hundredth of a second
//! at a time, and held to what a Redstone on its launcher would do.

use std::time::Duration;

use avian3d::prelude::*;
use bevy::prelude::*;
use bevy::time::TimeUpdateStrategy;
use sr_missions::Role;
use sr_sim::loads::Moment;
use sr_sim::{Body, guidance};
use sr_world::earth::G0;

use super::bodies::v3;
use super::hand::{Action, Why};
use super::{Course, Crewed, Flier, FlightPlugin, Hand, Loose, Parts, Pitches, Sequencer, Telemetry, setup};
use crate::clock::{Clock, ClockPlugin};
use crate::stage::dvec;
use crate::{Options, Showing};

/// A flight on its launcher, a second before the count runs out, with nothing drawn.
fn flight() -> (App, Entity) {
    let showing = Showing(sr_missions::flights().into_iter().next().expect("a flight"));
    let mut app = App::new();
    app.add_plugins(MinimalPlugins)
        .insert_resource(TimeUpdateStrategy::ManualDuration(Duration::from_millis(10)))
        .insert_resource(showing)
        .insert_resource(Options { at: -1.0, ..default() })
        .init_resource::<ButtonInput<KeyCode>>()
        .init_resource::<Parts>()
        .add_plugins((ClockPlugin, FlightPlugin));
    // (what `App::run` does before its first frame: the physics engine finishes setting itself up there)
    app.finish();
    app.cleanup();
    app.update();
    let stands = showing.0.model(Role::Vehicle).map_or(default(), |m| m.position);
    let vehicle = app.world_mut().spawn_empty().id();
    setup::man(app.world_mut(), vehicle, stands.into(), Quat::IDENTITY);
    (app, vehicle)
}

fn run(app: &mut App, seconds: f64) {
    for _ in 0..(seconds * 100.0).round() as u32 {
        app.update();
    }
}

fn height(app: &App, vehicle: Entity) -> f64 {
    app.world().get::<Position>(vehicle).expect("a body").0.y
}

#[test]
fn it_stands_on_its_launcher_until_its_engine_is_lit_and_then_climbs_as_its_thrust_and_weight_say() {
    let (mut app, vehicle) = flight();
    let stood = height(&app, vehicle);
    run(&mut app, 6.0);
    // Five seconds of its own weight on the launcher: it has not sunk, tipped or crept.
    assert!((height(&app, vehicle) - stood).abs() < 0.03, "{} from {stood}", height(&app, vehicle));
    let upright = app.world().get::<Rotation>(vehicle).expect("a body").0 * Vec3::Y;
    assert!(upright.y > 0.9999, "{upright}");
    let g = app.world().resource::<Telemetry>().g;
    assert!((g - 1.0).abs() < 0.1, "standing, an accelerometer reads one g: {g}");
    assert!(app.world().resource::<Clock>().t.abs() < 1e-9, "the count holds at zero for the hand");

    let lit = app.world().resource::<Clock>().t;
    app.world_mut().resource_mut::<Hand>().act(lit);
    run(&mut app, 10.0);
    // Thrust over mass less gravity: 350.8 kN on 29,980 kg is 1.9 m/s^2 at first and 2.6 after ten seconds'
    // burning, which is 108 m in the ten.
    let plan = &app.world().resource::<Showing>().0.plan;
    let first = plan.engine.thrust.value / plan.liftoff_mass.value - G0;
    let climbed = height(&app, vehicle) - stood;
    assert!(climbed > first * 50.0 && climbed < first * 50.0 * 1.25, "{climbed} m, from {first} m/s^2");
    let telemetry = app.world().resource::<Telemetry>();
    assert!(telemetry.propellant < 0.94 && telemetry.propellant > 0.92, "{}", telemetry.propellant);
}

#[test]
fn an_engine_cut_low_lets_it_fall_back_and_the_blow_breaks_it_up() {
    let (mut app, vehicle) = flight();
    run(&mut app, 1.5);
    let lit = app.world().resource::<Clock>().t;
    app.world_mut().resource_mut::<Hand>().act(lit);
    run(&mut app, 8.0);
    app.world_mut().resource_mut::<Hand>().burning = false;
    run(&mut app, 12.0);
    let hand = app.world().resource::<Hand>().clone();
    let (broke, lost) = (hand.broke.expect("the booster broke up"), hand.lost.expect("the capsule was lost"));
    assert_eq!((broke.why, lost.why), (Why::Blow, Why::Blow));
    assert!(broke.by > 15.0, "it fell some sixty metres: {}", broke.by);
    // What is left of it: the capsule, still the crew's, and the booster's three pieces lying about.
    assert_eq!(app.world().get::<Flier>(vehicle), Some(&Flier(Body::Capsule)));
    let world = app.world_mut();
    let pieces: Vec<f64> =
        world.query_filtered::<&Position, With<Loose>>().iter(world).map(|at| at.0.y).collect();
    assert_eq!(pieces.len(), 3);
    assert!(pieces.iter().all(|&y| y > -1.0 && y < 30.0), "none has gone through the ground: {pieces:?}");
    let crew = world.query_filtered::<&Position, With<Crewed>>().single(world).expect("the crewed body").0;
    assert!(crew.y > -1.0 && crew.length() < 400.0, "{:?}", dvec(sr_world::V3::ZERO) + crew);
}

#[test]
fn flown_as_the_record_has_it_the_rigid_bodies_fly_the_flight_the_simulator_makes() {
    let (mut app, vehicle) = flight();
    app.world_mut().resource_mut::<Hand>().guided = true;
    let mut top: f64 = 0.0;
    for _ in 0..1000 {
        run(&mut app, 1.0);
        top = top.max(app.world().resource::<Telemetry>().height);
        if app.world().resource::<Sequencer>().0.landed.is_some() {
            break;
        }
    }
    let world = app.world();
    let (hand, flown) = (world.resource::<Hand>(), &world.resource::<Course>().flown);
    assert!(hand.broke.is_none() && hand.lost.is_none(), "{:?} {:?}", hand.broke, hand.lost);
    assert_eq!(world.get::<Flier>(vehicle), Some(&Flier(Body::Capsule)));
    let (landed, range) = (world.resource::<Sequencer>().0.landed, world.resource::<Telemetry>().range);
    eprintln!("top {top:.0} m, range {range:.0} m, down at {landed:?}");
    // The same loads, stepped by another integrator at a hundredth of a second, and a body that stands 20 m up.
    assert!((top / flown.apogee - 1.0).abs() < 0.01, "{top} against {}", flown.apogee);
    assert!((range / flown.range - 1.0).abs() < 0.01, "{range} against {}", flown.range);
    let (down, record) =
        (landed.expect("it came down"), flown.sequence.landed.expect("so did the simulator's"));
    assert!((down - record).abs() < 15.0, "{down} against {record}");
}

/// A pilot who does what the readout shows: holds the stick toward where the record has the nose, and does each
/// step of the flight when the record did. Full stick at three degrees off.
fn pilot(app: &mut App, vehicle: Entity) {
    let world = app.world();
    let (plan, t) = (world.resource::<Showing>().0.plan, world.resource::<Clock>().t);
    let (course, sequence) = (world.resource::<Course>(), world.resource::<Sequencer>().0);
    let turned = world.get::<Rotation>(vehicle).expect("a body").0;
    let axis = (turned * Vec3::Y).as_dvec3();
    let m = Moment {
        t,
        position: v3(world.get::<Position>(vehicle).expect("a body").0),
        velocity: v3(world.get::<LinearVelocity>(vehicle).expect("a body").0.as_dvec3()),
        axis: v3(axis),
    };
    let toward = match world.get::<Flier>(vehicle).expect("a flier").0 {
        Body::Stack => guidance::stack_axis(&plan, course.down_range, t),
        _ => guidance::capsule_axis(&plan, &course.field, &sequence, &m),
    };
    let off = axis.cross(dvec(toward)) / 3.0_f64.to_radians();
    let pitch = (turned * world.get::<Pitches>(vehicle).expect("the crew's").0).as_dvec3();
    let stick = Vec3::new(off.dot(pitch) as f32, off.dot(pitch.cross(axis)) as f32, 0.0);
    let mut hand = app.world_mut().resource_mut::<Hand>();
    hand.stick = stick.clamp(Vec3::NEG_ONE, Vec3::ONE);
    let due = match hand.next() {
        Action::Light => 0.0,
        Action::Tower => plan.tower_off.value,
        Action::Separate => plan.separation.value,
        Action::Retro => plan.retro_fires[0].value,
        Action::Retropack => plan.retropack_off.value,
        Action::Nothing => f64::MAX,
    };
    if t >= due {
        hand.act(t);
    }
    if t >= plan.cutoff.value {
        hand.burning = false;
    }
}

#[test]
fn a_pilot_who_flies_to_the_record_by_hand_flies_the_flight() {
    let (mut app, vehicle) = flight();
    let (mut top, mut load, mut strain): (f64, f64, f64) = (0.0, 0.0, 0.0);
    for _ in 0..100_000 {
        pilot(&mut app, vehicle);
        app.update();
        let telemetry = app.world().resource::<Telemetry>();
        top = top.max(telemetry.height);
        strain = strain.max(telemetry.stress.part);
        if telemetry.height < 80_000.0 && telemetry.climb < 0.0 {
            load = load.max(telemetry.g);
        }
        if app.world().resource::<Sequencer>().0.landed.is_some() {
            break;
        }
    }
    let world = app.world();
    let (hand, flown) = (world.resource::<Hand>(), &world.resource::<Course>().flown);
    let (landed, range) = (world.resource::<Sequencer>().0.landed, world.resource::<Telemetry>().range);
    eprintln!(
        "by hand: top {top:.0} m, range {range:.0} m, {load:.1} g, strain {strain:.2}, down at {landed:?}"
    );
    assert!(hand.broke.is_none() && hand.lost.is_none(), "{:?} {:?}", hand.broke, hand.lost);
    // Nothing turns it but its vanes, its jets and the air, so it lags the programme a little: within five per
    // cent of the flight flown as the record has it.
    assert!((top / flown.apogee - 1.0).abs() < 0.05, "{top} against {}", flown.apogee);
    assert!((range / flown.range - 1.0).abs() < 0.05, "{range} against {}", flown.range);
    assert!(load < 1.15 * flown.entry_g, "it came down blunt end first: {load} g against {}", flown.entry_g);
    assert!(landed.is_some());
}
