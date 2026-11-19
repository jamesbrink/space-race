//! A model stood in the world: one of the repo's GLBs (unpacked by `rust/tools/unpack-models.mjs`), at a place in
//! the site's frame, turned about the vertical.

use bevy::math::DVec3;
use bevy::prelude::*;

use crate::origin::WorldPos;

/// A GLB, by its path under `models/`, standing at `at` and turned `turn` degrees about the vertical.
#[must_use]
pub fn model(assets: &AssetServer, path: &str, at: DVec3, turn: f32) -> impl Bundle {
    (
        WorldAssetRoot(assets.load(GltfAssetLabel::Scene(0).from_asset(format!("models/{path}")))),
        WorldPos(at),
        Transform::from_rotation(Quat::from_rotation_y(turn.to_radians())),
    )
}
