//! The Earth's surface as one mesh about the site: rings round the point under the site's origin, close together
//! there and doubling out to the far side (the web build's `globemesh.ts` does the same about the eye).
//!
//! Its vertices are worked in doubles and kept relative to the site, so the ground under the pad is exact while
//! the far side of the planet is a few metres out, where nobody can tell.

use bevy::asset::RenderAssetUsages;
use bevy::math::DVec3;
use bevy::mesh::{Indices, PrimitiveTopology};
use bevy::prelude::*;

/// Rings from the site to the far side, and points round each.
const RINGS: u32 = 240;
const SPOKES: u32 = 256;
/// The first ring's distance from the site, m.
const FIRST: f64 = 1.5;

/// The surface of a sphere of `radius` (m) whose top is `grade` metres from the site's origin, in the site's frame.
/// `east` and `north` are the compass in that frame. Each vertex carries its distance east and north of the site
/// over the ground, in metres, as its texture coordinate.
#[must_use]
pub fn surface(radius: f64, grade: f64, east: DVec3, north: DVec3) -> Mesh {
    let ground = radius + grade;
    let growth = (std::f64::consts::PI * ground * 0.999 / FIRST).powf(1.0 / f64::from(RINGS - 1));
    let mut positions = vec![[0.0, grade as f32, 0.0]];
    let mut normals = vec![[0.0, 1.0, 0.0]];
    let mut uvs = vec![[0.0, 0.0]];
    for ring in 0..RINGS {
        let over_ground = FIRST * growth.powi(ring as i32);
        let angle = over_ground / ground;
        for spoke in 0..SPOKES {
            let bearing = std::f64::consts::TAU * f64::from(spoke) / f64::from(SPOKES);
            let level = east * bearing.sin() + north * bearing.cos();
            // (ground * cos(angle) - radius, written so that nothing large is taken from anything large)
            let drop = grade - ground * 2.0 * (angle / 2.0).sin().powi(2);
            let at = level * (ground * angle.sin()) + DVec3::Y * drop;
            let normal = level * angle.sin() + DVec3::Y * angle.cos();
            positions.push(at.as_vec3().to_array());
            normals.push(normal.as_vec3().to_array());
            uvs.push([(over_ground * bearing.sin()) as f32, (over_ground * bearing.cos()) as f32]);
        }
    }
    Mesh::new(PrimitiveTopology::TriangleList, RenderAssetUsages::RENDER_WORLD)
        .with_inserted_attribute(Mesh::ATTRIBUTE_POSITION, positions)
        .with_inserted_attribute(Mesh::ATTRIBUTE_NORMAL, normals)
        .with_inserted_attribute(Mesh::ATTRIBUTE_UV_0, uvs)
        .with_inserted_indices(Indices::U32(indices()))
}

/// The triangles: a fan from the site to the first ring, then a band between each ring and the next.
fn indices() -> Vec<u32> {
    let at = |ring: u32, spoke: u32| 1 + ring * SPOKES + spoke % SPOKES;
    let mut indices = Vec::with_capacity((RINGS * SPOKES * 6) as usize);
    for spoke in 0..SPOKES {
        indices.extend([0, at(0, spoke + 1), at(0, spoke)]);
    }
    for ring in 0..RINGS - 1 {
        for spoke in 0..SPOKES {
            let (a, b) = (at(ring, spoke), at(ring, spoke + 1));
            let (c, d) = (at(ring + 1, spoke), at(ring + 1, spoke + 1));
            indices.extend([a, d, c, a, b, d]);
        }
    }
    indices
}

#[cfg(test)]
mod tests {
    use super::*;
    use bevy::mesh::VertexAttributeValues;

    #[test]
    fn it_is_a_sphere_whose_top_is_at_the_site() {
        let (radius, grade) = (6_373_000.0_f64, -0.12);
        let mesh = surface(radius, grade, DVec3::X, DVec3::NEG_Z);
        let Some(VertexAttributeValues::Float32x3(positions)) = mesh.attribute(Mesh::ATTRIBUTE_POSITION)
        else {
            panic!("no positions")
        };
        assert_eq!(positions[0], [0.0, grade as f32, 0.0]);
        // The first ring lies flat to a hair; the last is nearly two radii below.
        assert!((positions[1][1] - grade as f32).abs() < 1e-5);
        let centre = DVec3::new(0.0, -radius, 0.0);
        for p in positions.iter().step_by(997) {
            let from_centre = (Vec3::from_array(*p).as_dvec3() - centre).length();
            assert!((from_centre / (radius + grade) - 1.0).abs() < 1e-6);
        }
    }

    #[test]
    fn its_faces_look_outward() {
        let mesh = surface(6_373_000.0, 0.0, DVec3::X, DVec3::NEG_Z);
        let Some(VertexAttributeValues::Float32x3(p)) = mesh.attribute(Mesh::ATTRIBUTE_POSITION) else {
            panic!("no positions")
        };
        let Some(Indices::U32(i)) = mesh.indices() else { panic!("no indices") };
        for face in [0, 3 * (SPOKES as usize + 5)] {
            let [a, b, c] = [0, 1, 2].map(|k| Vec3::from_array(p[i[face + k] as usize]));
            assert!((b - a).cross(c - a).y > 0.0, "a face near the site faces down");
        }
    }
}
