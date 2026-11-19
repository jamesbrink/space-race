//! The flight set up: its course charted before anything is drawn, the vehicle made a body when its model
//! arrives, and each body drawn where the physics has it.

use avian3d::prelude::*;
use bevy::prelude::*;
use bevy::world_serialization::WorldInstanceReady;
use sr_missions::Role;
use sr_render::origin::WorldPos;
use sr_sim::Field;
use sr_sim::fly::fly;
use sr_world::V3;

use super::{Course, Crewed, Flier, Parts, Sequencer, bodies};
use crate::clock::Clock;
use crate::stage::Cast;
use crate::{Options, Showing};

pub fn chart(mut commands: Commands, showing: Res<Showing>) {
    let flight = showing.0;
    let site = flight.site.site();
    let above_sea = flight.site.above_sea();
    commands.insert_resource(Course {
        field: Field::at(&site, above_sea),
        down_range: site.toward(flight.plan.azimuth.value, 0.0),
        stands: flight
            .model(Role::Vehicle)
            .map_or(V3::ZERO, |m| V3::new(m.position[0], m.position[1], m.position[2])),
        flown: fly(&flight.plan, &site, above_sea),
    });
}

/// When the vehicle's model has arrived: its parts are found, it is made a body, and the clock may run.
pub fn ready(
    arrived: On<WorldInstanceReady>,
    mut commands: Commands,
    cast: Query<(&Cast, &WorldPos, &Transform)>,
    children: Query<&Children>,
    names: Query<&Name>,
    course: Res<Course>,
    showing: Res<Showing>,
    options: Res<Options>,
    mut clock: ResMut<Clock>,
    mut sequencer: ResMut<Sequencer>,
) {
    let Ok((Cast(Role::Vehicle), stands, turned)) = cast.get(arrived.entity) else { return };
    let mut parts = Parts::default();
    for part in children.iter_descendants(arrived.entity) {
        if let Ok(name) = names.get(part) {
            parts.0.entry(name.as_str().to_owned()).or_insert(part);
        }
    }
    commands.insert_resource(parts);
    let start = bodies::start(&course, &showing.0.plan, stands.0, turned.rotation, options.at);
    sequencer.0 = start.sequence;
    clock.t = start.t;
    clock.ready = true;
    commands.entity(arrived.entity).insert((
        Flier(start.body),
        Crewed,
        bodies::body(&start.state, start.mass),
    ));
}

/// Each body is drawn where the physics has it.
pub fn show(mut bodies: Query<(&Position, &Rotation, &mut WorldPos, &mut Transform), With<RigidBody>>) {
    for (at, turned, mut place, mut transform) in &mut bodies {
        place.0 = at.0;
        transform.rotation = turned.0;
    }
}
