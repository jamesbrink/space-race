//! The Earth's surface as one mesh about the site: rings round the point under the site's origin, close together
//! there and growing apart out to the far side (the web build's `globemesh.ts` does the same about the eye).
//! Within [`NEAR`] of the site the rings are a few metres apart and their points as close round them, so that the
//! ground can carry its own relief there (`earth/relief.rs`): the dunes, the ridges and the swales.
//!
//! Its vertices are worked in doubles and kept relative to the site, so the ground under the pad is exact while
//! the far side of the planet is a few metres out, where nobody can tell.

use bevy::asset::RenderAssetUsages;
use bevy::math::DVec3;
use bevy::mesh::{Indices, PrimitiveTopology};
use bevy::prelude::*;

/// How far from the site the ground is fine enough to carry relief, m.
pub const NEAR: f64 = 2000.0;
/// There, the rings' spacing and the most the points round each are apart, m: fine enough for a dune thirty
/// metres across. Estimated.
const STEP: f64 = 6.0;
const SPAN: f64 = 10.0;
/// The first ring's distance from the site, m.
const FIRST: f64 = 1.5;
/// Past [`NEAR`], each ring this much further from the last than the one before, out to the far side.
const GROWTH: f64 = 1.06;
/// The fewest and the most points round a ring.
const FEWEST: u32 = 16;
const MOST: u32 = 2048;
/// Out past the near ground the rings halve their points down to this.
const FAR_SPOKES: u32 = 256;

/// The rings: each one's distance from the site over the ground, m, and its points.
fn rings(ground: f64) -> Vec<(f64, u32)> {
    let half = std::f64::consts::PI * ground * 0.999;
    let mut rings = Vec::new();
    let mut r = FIRST;
    let mut step = FIRST;
    let mut spokes = FEWEST;
    while r < half {
        if r <= NEAR {
            // (doubled when the points are too far apart round: a ring never has fewer than the one inside it)
            if f64::from(spokes) * SPAN < std::f64::consts::TAU * r && spokes < MOST {
                spokes *= 2;
            }
            step = (r * 0.5).clamp(FIRST, STEP);
        } else {
            spokes = (spokes / 2).max(FAR_SPOKES);
            step *= GROWTH;
        }
        rings.push((r, spokes));
        r += step;
    }
    rings
}

/// What the ground carries near the site: its height over the sphere (m) at a point metres east and north of it.
pub type Lift<'a> = &'a dyn Fn(Vec2) -> f32;

/// Each ring's heights, read from `lift` within [`NEAR`] and naught beyond.
fn heights(rings: &[(f64, u32)], lift: Option<Lift>) -> Vec<Vec<f32>> {
    rings
        .iter()
        .map(|&(r, n)| {
            (0..n)
                .map(|s| {
                    let bearing = std::f64::consts::TAU * f64::from(s) / f64::from(n);
                    let en = Vec2::new((r * bearing.sin()) as f32, (r * bearing.cos()) as f32);
                    lift.filter(|_| r <= NEAR).map_or(0.0, |lift| lift(en))
                })
                .collect()
        })
        .collect()
}

/// The slope of the relief east and north at ring `k`'s point `s`, from its neighbours round the ring and on the
/// rings either side (which may have twice or half its points).
fn slope(rings: &[(f64, u32)], heights: &[Vec<f32>], k: usize, s: u32) -> Vec2 {
    let (r, n) = rings[k];
    let fraction = f64::from(s) / f64::from(n);
    // (the height on ring `k` at a fraction of the way round)
    let at = |k: usize| {
        let n = rings[k].1;
        f64::from(heights[k][((fraction * f64::from(n)).round() as u32 % n) as usize])
    };
    let h = &heights[k];
    let round = f64::from(h[((s + 1) % n) as usize] - h[((s + n - 1) % n) as usize])
        / (2.0 * r * std::f64::consts::TAU / f64::from(n));
    let (inner, outer) = (k.saturating_sub(1), (k + 1).min(rings.len() - 1));
    let across = (at(outer) - at(inner)) / (rings[outer].0 - rings[inner].0).max(1.0e-3);
    let (sin, cos) = (std::f64::consts::TAU * fraction).sin_cos();
    Vec2::new((across * sin + round * cos) as f32, (across * cos - round * sin) as f32)
}

/// The surface of a sphere of `radius` (m) whose top is `grade` metres from the site's origin, in the site's frame.
/// `east` and `north` are the compass in that frame. Each vertex carries its distance east and north of the site
/// over the ground, in metres, as its first texture coordinate, and the slope of the relief there as its second;
/// its normal is the sphere's, by which the shader finds where on the Earth it is. `lift` raises the near ground.
#[must_use]
pub fn surface(radius: f64, grade: f64, east: DVec3, north: DVec3, lift: Option<Lift>) -> Mesh {
    let ground = radius + grade;
    let rings = rings(ground);
    let heights = heights(&rings, lift);
    let mut positions = vec![[0.0, grade as f32, 0.0]];
    let mut normals = vec![[0.0, 1.0, 0.0]];
    let mut uvs = vec![[0.0, 0.0]];
    let mut slopes = vec![[0.0, 0.0]];
    for (k, &(over_ground, spokes)) in rings.iter().enumerate() {
        let angle = over_ground / ground;
        for spoke in 0..spokes {
            let bearing = std::f64::consts::TAU * f64::from(spoke) / f64::from(spokes);
            let level = east * bearing.sin() + north * bearing.cos();
            let height = heights[k][spoke as usize];
            // (ground * cos(angle) - radius, written so that nothing large is taken from anything large)
            let drop = grade - ground * 2.0 * (angle / 2.0).sin().powi(2);
            let normal = level * angle.sin() + DVec3::Y * angle.cos();
            let at = level * (ground * angle.sin()) + DVec3::Y * drop + normal * f64::from(height);
            positions.push(at.as_vec3().to_array());
            normals.push(normal.as_vec3().to_array());
            uvs.push([(over_ground * bearing.sin()) as f32, (over_ground * bearing.cos()) as f32]);
            let tilt = if over_ground <= NEAR { slope(&rings, &heights, k, spoke) } else { Vec2::ZERO };
            slopes.push(tilt.to_array());
        }
    }
    if let Some(&h) = heights.first().and_then(|h| h.first()) {
        positions[0][1] += h;
    }
    Mesh::new(PrimitiveTopology::TriangleList, RenderAssetUsages::RENDER_WORLD)
        .with_inserted_attribute(Mesh::ATTRIBUTE_POSITION, positions)
        .with_inserted_attribute(Mesh::ATTRIBUTE_NORMAL, normals)
        .with_inserted_attribute(Mesh::ATTRIBUTE_UV_0, uvs)
        .with_inserted_attribute(Mesh::ATTRIBUTE_UV_1, slopes)
        .with_inserted_indices(Indices::U32(indices(&rings)))
}

/// The triangles: a fan from the site to the first ring, then a band between each ring and the next, which has the
/// same points, twice as many or half as many.
fn indices(rings: &[(f64, u32)]) -> Vec<u32> {
    let mut indices = Vec::new();
    let first = rings.first().map_or(0, |r| r.1);
    for spoke in 0..first {
        indices.extend([0, 1 + (spoke + 1) % first, 1 + spoke]);
    }
    let mut start = 1;
    for pair in rings.windows(2) {
        let (n, m) = (pair[0].1, pair[1].1);
        let a = |s: u32| start + s % n;
        let b = |s: u32| start + n + s % m;
        if m == n {
            for s in 0..n {
                indices.extend([a(s), b(s + 1), b(s), a(s), a(s + 1), b(s + 1)]);
            }
        } else if m == 2 * n {
            for s in 0..n {
                let o = 2 * s;
                indices.extend([
                    a(s),
                    b(o + 1),
                    b(o),
                    a(s),
                    a(s + 1),
                    b(o + 1),
                    a(s + 1),
                    b(o + 2),
                    b(o + 1),
                ]);
            }
        } else {
            for s in 0..m {
                let i = 2 * s;
                indices.extend([
                    a(i),
                    a(i + 1),
                    b(s),
                    a(i + 1),
                    b(s + 1),
                    b(s),
                    a(i + 1),
                    a(i + 2),
                    b(s + 1),
                ]);
            }
        }
        start += n;
    }
    indices
}

#[cfg(test)]
mod tests {
    use super::*;
    use bevy::mesh::VertexAttributeValues;

    fn positions(mesh: &Mesh) -> Vec<Vec3> {
        let Some(VertexAttributeValues::Float32x3(p)) = mesh.attribute(Mesh::ATTRIBUTE_POSITION) else {
            panic!("no positions")
        };
        p.iter().map(|p| Vec3::from_array(*p)).collect()
    }

    #[test]
    fn it_is_a_sphere_whose_top_is_at_the_site() {
        let (radius, grade) = (6_373_000.0_f64, -0.12);
        let mesh = surface(radius, grade, DVec3::X, DVec3::NEG_Z, None);
        let positions = positions(&mesh);
        assert_eq!(positions[0], Vec3::new(0.0, grade as f32, 0.0));
        // The first ring lies flat to a hair; the last is nearly two radii below.
        assert!((positions[1].y - grade as f32).abs() < 1e-5);
        let centre = DVec3::new(0.0, -radius, 0.0);
        for p in positions.iter().step_by(997) {
            let from_centre = (p.as_dvec3() - centre).length();
            assert!((from_centre / (radius + grade) - 1.0).abs() < 1e-6);
        }
    }

    #[test]
    fn every_face_near_the_site_looks_outward_and_the_rings_close() {
        let mesh = surface(6_373_000.0, 0.0, DVec3::X, DVec3::NEG_Z, None);
        let p = positions(&mesh);
        let Some(Indices::U32(i)) = mesh.indices() else { panic!("no indices") };
        assert!(i.iter().all(|&k| (k as usize) < p.len()));
        for face in i.chunks(3) {
            let [a, b, c] = [0, 1, 2].map(|k| p[face[k] as usize]);
            if a.length() < 30_000.0 {
                assert!((b - a).cross(c - a).y > 0.0, "a face near the site faces down");
            }
        }
        // Near the site the points are close enough round for the relief, and there are not too many of them.
        assert!(p.len() < 450_000, "{} points", p.len());
        let rings = rings(6_373_000.0);
        let (r, n) = rings.iter().rev().find(|(r, _)| *r <= NEAR).copied().unwrap_or_default();
        assert!(std::f64::consts::TAU * r / f64::from(n) <= SPAN * 1.1);
    }

    #[test]
    fn the_lift_raises_only_the_near_ground() {
        let lift = |p: Vec2| 2.0 + 0.1 * p.x;
        let flat = positions(&surface(6_373_000.0, 0.0, DVec3::X, DVec3::NEG_Z, None));
        let raised = positions(&surface(6_373_000.0, 0.0, DVec3::X, DVec3::NEG_Z, Some(&lift)));
        assert!((raised[0].y - flat[0].y - 2.0).abs() < 1e-3);
        let far = flat.iter().position(|p| p.length() > 3.0 * NEAR as f32).unwrap_or(0);
        assert_eq!(raised[far], flat[far]);
    }
}
