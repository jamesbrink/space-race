//! A flame's shape: a body of revolution from the nozzle's lip to its tip, one unit long and one unit in radius
//! at the lip, pointing down its own -Y. The plume scales it.

use bevy::asset::RenderAssetUsages;
use bevy::mesh::{Indices, PrimitiveTopology};
use bevy::prelude::*;

const ALONG: u32 = 28;
const ROUND: u32 = 28;

/// The flame's radius at a fraction `u` of its length: out of the nozzle it swells, then it draws to a point.
fn radius(u: f32) -> f32 {
    let swell = 1.0 + 0.85 * (u / 0.3).min(1.0).powf(0.7);
    swell * (1.0 - u.powf(1.7)).max(0.0).powf(0.65)
}

/// The mesh. Its texture coordinate is (how far along, how far round).
#[must_use]
pub fn flame() -> Mesh {
    let (mut positions, mut normals, mut uvs) = (Vec::new(), Vec::new(), Vec::new());
    for i in 0..=ALONG {
        let u = i as f32 / ALONG as f32;
        let r = radius(u);
        // (how the radius is changing along it, to lean the normal)
        let slope = (radius((u + 0.01).min(1.0)) - radius((u - 0.01).max(0.0))) / 0.02;
        for j in 0..=ROUND {
            let turn = std::f32::consts::TAU * j as f32 / ROUND as f32;
            let (sin, cos) = turn.sin_cos();
            positions.push([r * cos, -u, r * sin]);
            normals.push(Vec3::new(cos, slope, sin).normalize_or(Vec3::NEG_Y).to_array());
            uvs.push([u, j as f32 / ROUND as f32]);
        }
    }
    let mut indices = Vec::new();
    for i in 0..ALONG {
        for j in 0..ROUND {
            let (a, b) = (i * (ROUND + 1) + j, i * (ROUND + 1) + j + 1);
            let (c, d) = (a + ROUND + 1, b + ROUND + 1);
            indices.extend([a, b, c, b, d, c]);
        }
    }
    Mesh::new(PrimitiveTopology::TriangleList, RenderAssetUsages::RENDER_WORLD)
        .with_inserted_attribute(Mesh::ATTRIBUTE_POSITION, positions)
        .with_inserted_attribute(Mesh::ATTRIBUTE_NORMAL, normals)
        .with_inserted_attribute(Mesh::ATTRIBUTE_UV_0, uvs)
        .with_inserted_indices(Indices::U32(indices))
}
