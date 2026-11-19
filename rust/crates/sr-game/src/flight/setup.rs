//! The flight set up: its course charted before anything is drawn, the ground and the launcher made solid, the
//! vehicle made a body when its model arrives, and each body drawn where the physics has it.

use avian3d::prelude::*;
use bevy::math::DVec3;
use bevy::prelude::*;
use bevy::world_serialization::WorldInstanceReady;
use sr_missions::Role;
use sr_render::origin::WorldPos;
use sr_sim::fly::fly;
use sr_sim::{Body, Field};
use sr_world::V3;

use super::bodies::{self, Outline};
use super::{Course, Crewed, Flier, Parts, Pitches, Sequencer};
use crate::clock::Clock;
use crate::stage::{Cast, dvec};
use crate::{Options, Showing};

/// How far the land round the pad is solid, m each way, and how deep. Beyond it everything comes down in the sea
/// (`rust/README.md`, "What is simplified").
const LAND: f32 = 24_000.0;
const DEEP: f32 = 40.0;

pub fn chart(mut commands: Commands, showing: Res<Showing>) {
    let flight = showing.0;
    let site = flight.site.site();
    let above_sea = flight.site.above_sea();
    commands.insert_resource(Course {
        site,
        field: Field::at(&site, above_sea),
        down_range: site.toward(flight.plan.azimuth.value, 0.0),
        stands: flight
            .model(Role::Vehicle)
            .map_or(V3::ZERO, |m| V3::new(m.position[0], m.position[1], m.position[2])),
        flown: fly(&flight.plan, &site, above_sea),
    });
}

/// What does not move: the land round the pad, level with the hardstand, and the launcher the vehicle stands on
/// (a Redstone was not held down: it stood on its table until its engine lifted it).
pub fn found(mut commands: Commands, showing: Res<Showing>, course: Res<Course>) {
    let land = Collider::cuboid(LAND, DEEP, LAND);
    commands.spawn(bodies::fixed(DVec3::Y * f64::from(-DEEP / 2.0), land));
    let solids = &showing.0.solids;
    let table = course.stands.y + solids.booster.span[0];
    let launcher = Collider::cylinder(solids.foot as f32, table as f32);
    commands.spawn(bodies::fixed(DVec3::new(course.stands.x, table / 2.0, course.stands.z), launcher));
}

/// The vehicle is made a body where it stands, turned as it stands, and the clock may run.
pub fn man(world: &mut World, vehicle: Entity, stands: DVec3, turned: Quat) {
    let (flight, at) = (world.resource::<Showing>().0, world.resource::<Options>().at);
    let course = world.resource::<Course>();
    let start = bodies::start(course, &flight.plan, stands, turned, at);
    let tips = dvec(V3::Y.cross(course.down_range)).as_vec3();
    world.resource_mut::<Sequencer>().0 = start.sequence;
    let mut clock = world.resource_mut::<Clock>();
    clock.t = start.t;
    clock.ready = true;
    // It starts whole; on a late start what has left by then leaves at the first step (`staging`).
    let whole = Outline::body(&flight.solids, Body::Stack, true);
    world.entity_mut(vehicle).insert((
        Flier(start.body),
        Crewed,
        Pitches(turned.inverse() * tips),
        bodies::body(&start.state, start.mass, &whole),
    ));
}

/// When the vehicle's model has arrived: its parts are found, and it is made a body.
pub fn ready(
    arrived: On<WorldInstanceReady>,
    mut commands: Commands,
    cast: Query<(&Cast, &WorldPos, &Transform)>,
    children: Query<&Children>,
    names: Query<&Name>,
) {
    let Ok((Cast(Role::Vehicle), stands, turned)) = cast.get(arrived.entity) else { return };
    let mut parts = Parts::default();
    for part in children.iter_descendants(arrived.entity) {
        if let Ok(name) = names.get(part) {
            parts.0.entry(name.as_str().to_owned()).or_insert(part);
        }
    }
    commands.insert_resource(parts);
    let (vehicle, stands, turned) = (arrived.entity, stands.0, turned.rotation);
    commands.queue(move |world: &mut World| man(world, vehicle, stands, turned));
}

/// Each body is drawn where the physics has it.
pub fn show(mut bodies: Query<(&Position, &Rotation, &mut WorldPos, &mut Transform), With<RigidBody>>) {
    for (at, turned, mut place, mut transform) in &mut bodies {
        place.0 = at.0;
        transform.rotation = turned.0;
    }
}
