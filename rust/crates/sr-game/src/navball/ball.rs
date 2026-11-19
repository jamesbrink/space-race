//! The attitude ball's own surface: a sphere painted as the sky above and the ground below, ruled every ten
//! degrees up and every thirty round, with north marked. It is drawn once and turned, never redrawn.

use bevy::asset::RenderAssetUsages;
use bevy::mesh::{Indices, PrimitiveTopology};
use bevy::prelude::*;
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};

/// The painting's size, texels: heading across, elevation down.
const WIDE: u32 = 1024;
const HIGH: u32 = 512;
/// How many facets the ball has round and from pole to pole.
const ROUND: u32 = 72;
const UP: u32 = 36;

// (the print's own palette, so the ball sits in the picture: slate for the sky, umber for the ground)
const SKY: [f32; 3] = [0.3, 0.42, 0.5];
const GROUND: [f32; 3] = [0.3, 0.23, 0.15];
const LINE: [f32; 3] = [0.88, 0.87, 0.8];
const NORTH: [f32; 3] = [0.82, 0.3, 0.2];

/// How far a figure is from the nearest multiple of `every`, both in the same unit.
fn off(figure: f32, every: f32) -> f32 {
    let over = figure.rem_euclid(every);
    over.min(every - over)
}

/// The ball's colour toward a bearing and an elevation, degrees.
fn colour(bearing: f32, elevation: f32) -> [f32; 3] {
    // A line's width is in degrees on the ball, so one round it is widened as the meridians close toward a pole.
    let closing = elevation.to_radians().cos().max(0.05);
    let north = off(bearing, 360.0) * closing;
    let ruled_round = off(bearing, 30.0) * closing;
    let ruled_up = off(elevation, 10.0);
    let heavy = if off(elevation, 30.0) < 0.01 { 0.55 } else { 0.3 };
    if elevation.abs() < 0.8 {
        LINE
    } else if north < 1.4 && elevation.abs() < 84.0 {
        NORTH
    } else if elevation.abs() > 88.0 || ruled_up < heavy || (ruled_round < 0.35 && elevation.abs() < 80.0) {
        LINE
    } else if elevation > 0.0 {
        SKY
    } else {
        GROUND
    }
}

/// The ball's painting: across is the bearing from north through east, down is from straight up to straight down.
#[must_use]
pub fn painting() -> Image {
    let mut data = Vec::with_capacity((WIDE * HIGH * 4) as usize);
    for y in 0..HIGH {
        for x in 0..WIDE {
            let bearing = (x as f32 + 0.5) / WIDE as f32 * 360.0;
            let elevation = 90.0 - (y as f32 + 0.5) / HIGH as f32 * 180.0;
            let [r, g, b] = colour(bearing, elevation).map(|part| (part * 255.0) as u8);
            data.extend_from_slice(&[r, g, b, 255]);
        }
    }
    let size = Extent3d { width: WIDE, height: HIGH, depth_or_array_layers: 1 };
    Image::new(
        size,
        TextureDimension::D2,
        data,
        TextureFormat::Rgba8UnormSrgb,
        RenderAssetUsages::RENDER_WORLD,
    )
}

/// Where the ball's surface is toward a bearing and an elevation (radians), in its own frame: +X east, +Y up,
/// +Z south.
#[must_use]
pub fn toward(bearing: f32, elevation: f32) -> Vec3 {
    let level = elevation.cos();
    Vec3::new(level * bearing.sin(), elevation.sin(), -level * bearing.cos())
}

/// The ball: a unit sphere whose painting lies on it as [`painting`] says.
#[must_use]
pub fn sphere() -> Mesh {
    let (mut places, mut normals, mut uvs, mut corners) = (Vec::new(), Vec::new(), Vec::new(), Vec::new());
    for row in 0..=UP {
        for column in 0..=ROUND {
            let (across, down) = (column as f32 / ROUND as f32, row as f32 / UP as f32);
            let at = toward(across * std::f32::consts::TAU, (0.5 - down) * std::f32::consts::PI);
            places.push(at.to_array());
            normals.push(at.to_array());
            uvs.push([across, down]);
        }
    }
    for row in 0..UP {
        for column in 0..ROUND {
            let a = row * (ROUND + 1) + column;
            let b = a + ROUND + 1;
            // (wound so the outside is the front: east is to the right of north seen from outside)
            corners.extend_from_slice(&[a, a + 1, b, a + 1, b + 1, b]);
        }
    }
    Mesh::new(PrimitiveTopology::TriangleList, RenderAssetUsages::RENDER_WORLD)
        .with_inserted_attribute(Mesh::ATTRIBUTE_POSITION, places)
        .with_inserted_attribute(Mesh::ATTRIBUTE_NORMAL, normals)
        .with_inserted_attribute(Mesh::ATTRIBUTE_UV_0, uvs)
        .with_inserted_indices(Indices::U32(corners))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_ball_s_frame_is_east_up_south() {
        let quarter = std::f32::consts::FRAC_PI_2;
        assert!((toward(0.0, 0.0) - Vec3::NEG_Z).length() < 1e-6, "north is -Z");
        assert!((toward(quarter, 0.0) - Vec3::X).length() < 1e-6, "east is +X");
        assert!((toward(1.0, quarter) - Vec3::Y).length() < 1e-6, "up is +Y");
    }

    #[test]
    fn it_is_sky_above_ground_below_and_north_is_marked() {
        assert_eq!(colour(47.0, 25.0), SKY);
        assert_eq!(colour(47.0, -25.0), GROUND);
        assert_eq!(colour(47.0, 0.0), LINE);
        assert_eq!(colour(0.3, 25.0), NORTH);
        assert_eq!(colour(47.0, 30.2), LINE);
    }

    #[test]
    fn its_outside_is_its_front() {
        let mesh = sphere();
        let Some(Indices::U32(corners)) = mesh.indices() else { panic!("no corners") };
        let places = mesh.attribute(Mesh::ATTRIBUTE_POSITION).and_then(|a| a.as_float3()).unwrap();
        // A facet off the poles: its winding's normal points away from the centre.
        let start = (UP / 2 * ROUND * 6) as usize;
        let [a, b, c] = [0, 1, 2].map(|k| Vec3::from_array(places[corners[start + k] as usize]));
        assert!((b - a).cross(c - a).dot(a + b + c) > 0.0);
    }
}
