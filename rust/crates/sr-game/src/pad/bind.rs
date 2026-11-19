//! The pad's motions bound to its model's nodes when it arrives, and the nodes posed from the clock each frame the
//! slider moves; and where a node stands in the site's frame, for what follows it.

use std::collections::HashMap;

use bevy::gltf::GltfSceneExtras;
use bevy::math::{DQuat, DVec3};
use bevy::prelude::*;
use bevy::world_serialization::WorldInstanceReady;
use sr_missions::Role;
use sr_missions::morning::{Key, slider_at};
use sr_render::origin::{Eye, WorldPos};

use super::pose::{Pose, Posing};
use crate::Showing;
use crate::clock::Clock;
use crate::stage::Cast;

/// What the unpacker writes in the scene's extras of a model it left as built.
const AS_BUILT: &str = "\"as built\"";

/// The pad's named nodes, for whatever follows them (the opening's cameras).
#[derive(Resource, Debug, Default, Clone)]
pub struct PadNodes(pub HashMap<String, Entity>);

/// When the pad is posed for the frame: what follows its nodes goes after it.
#[derive(SystemSet, Debug, Clone, PartialEq, Eq, Hash)]
pub struct Posed;

/// The pad's motions bound to its entities, and where on its slider it was last posed.
#[derive(Resource)]
pub(super) struct Bound {
    keys: &'static [Key],
    posing: Posing,
    entities: Vec<Entity>,
    last: Option<f64>,
}

pub(super) fn bind(
    arrived: On<WorldInstanceReady>,
    mut commands: Commands,
    showing: Res<Showing>,
    cast: Query<&Cast>,
    children: Query<&Children>,
    named: Query<(&Name, &Transform)>,
    extras: Query<&GltfSceneExtras>,
) {
    if cast.get(arrived.entity) != Ok(&Cast(Role::Pad)) {
        return;
    }
    let mut nodes = PadNodes::default();
    let (mut names, mut rests, mut entities) = (Vec::new(), Vec::new(), Vec::new());
    let mut as_built = false;
    for entity in children.iter_descendants(arrived.entity) {
        as_built |= extras.get(entity).is_ok_and(|e| e.value.contains(AS_BUILT));
        let Ok((name, transform)) = named.get(entity) else { continue };
        nodes.0.entry(name.as_str().to_owned()).or_insert(entity);
        names.push(name.as_str().to_owned());
        rests.push(Pose { at: transform.translation.as_dvec3(), turn: transform.rotation.as_dquat() });
        entities.push(entity);
    }
    commands.insert_resource(nodes);
    let Some(plays) = showing.0.morning else { return };
    if !as_built {
        warn!(
            "pad: unpacked as at liftoff by an older unpacker; its morning is not played (pnpm rust:models)"
        );
        return;
    }
    let morning = plays.morning();
    let (posing, missing) = Posing::bind(&morning.moves, &names, rests);
    for node in missing {
        warn!("pad: the model has no node named {node}");
    }
    commands.insert_resource(Bound { keys: morning.keys, posing, entities, last: None });
}

/// Each frame the slider has moved: every moving node where the morning has it.
pub(super) fn stand(clock: Res<Clock>, bound: Option<ResMut<Bound>>, mut transforms: Query<&mut Transform>) {
    let Some(mut bound) = bound else { return };
    let k = slider_at(bound.keys, clock.t);
    if bound.last.is_some_and(|last| (last - k).abs() < 1e-12) {
        return;
    }
    bound.last = Some(k);
    for (pose, &entity) in bound.posing.at(k).iter().zip(&bound.entities) {
        let Ok(mut transform) = transforms.get_mut(entity) else { continue };
        let (at, turn) = (pose.at.as_vec3(), pose.turn.as_quat());
        if transform.translation != at || transform.rotation != turn {
            transform.translation = at;
            transform.rotation = turn;
        }
    }
}

/// Where a pad node stands in the site's frame now, with the way it is turned, from the transforms down to it (the
/// model's own place is its [`WorldPos`], not its transform, which is drawn from the eye).
#[must_use]
pub fn placed(
    entity: Entity,
    parents: &Query<&ChildOf>,
    transforms: &Query<(&Transform, Option<&WorldPos>), Without<Eye>>,
) -> Option<(DVec3, DQuat)> {
    let (mut at, mut turn) = (DVec3::ZERO, DQuat::IDENTITY);
    let mut node = entity;
    loop {
        let (transform, world) = transforms.get(node).ok()?;
        let local = transform.rotation.as_dquat();
        if let Some(world) = world {
            return Some((world.0 + local * at, local * turn));
        }
        at = transform.translation.as_dvec3() + local * (transform.scale.as_dvec3() * at);
        turn = local * turn;
        node = parents.get(node).ok()?.parent();
    }
}
