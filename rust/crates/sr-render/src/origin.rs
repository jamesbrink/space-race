//! Where things are, in doubles, and where the picture's zero is.
//!
//! A flight goes 500 km down range and a float has seven figures, so nothing is drawn where it is: everything
//! carries its place in the site's frame as doubles ([`WorldPos`]), and each frame it is drawn where it stands from
//! the eye (docs/agents/rendering.md: "positions are doubles drawn from the eye"). The eye is always at the
//! picture's zero, where floats are finest.

use bevy::math::DVec3;
use bevy::prelude::*;

/// A place in the site's frame, m. Anything with one is drawn from the eye; its `Transform`'s translation is ours.
#[derive(Component, Debug, Clone, Copy, Default, PartialEq)]
#[require(Transform)]
pub struct WorldPos(pub DVec3);

/// The camera the world is drawn from.
#[derive(Component, Debug, Clone, Copy, Default)]
#[require(WorldPos)]
pub struct Eye;

/// Where the eye is: the picture's zero.
#[derive(Resource, Debug, Clone, Copy, Default)]
pub struct Origin(pub DVec3);

/// When things are placed: after everything that moves them, before their transforms are handed down.
#[derive(SystemSet, Debug, Clone, PartialEq, Eq, Hash)]
pub struct Place;

/// Draws everything from the eye.
pub struct OriginPlugin;

impl Plugin for OriginPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<Origin>()
            .configure_sets(PostUpdate, Place.before(TransformSystems::Propagate))
            .add_systems(PostUpdate, (take_origin, place).chain().in_set(Place));
    }
}

fn take_origin(eye: Query<&WorldPos, With<Eye>>, mut origin: ResMut<Origin>) {
    if let Ok(eye) = eye.single() {
        origin.0 = eye.0;
    }
}

fn place(origin: Res<Origin>, mut things: Query<(&WorldPos, &mut Transform)>) {
    for (at, mut transform) in &mut things {
        let from_eye = (at.0 - origin.0).as_vec3();
        if transform.translation != from_eye {
            transform.translation = from_eye;
        }
    }
}
