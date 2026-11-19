//! What grows round the site, stood on the ground as plants (`earth/plants.rs`, planted by `earth/sow.rs`) where
//! the ground's shader paints their crowns (`earth/flora.rs` has the same rules): the scrub out to
//! [`sow::REACH`] metres, so that from the pad it has an outline against the sky and not a stain's; taller clumps
//! and palms beyond it, which break the skyline; and the grass's tufts near the site's middle, with a sparer far
//! form round them. Beyond that the painted ground stands alone; the plants grow smaller toward each edge, and each
//! square fades in and out with distance from the eye, so there is no line where they stop.

use std::ops::Range;

use bevy::camera::visibility::VisibilityRange;
use bevy::light::NotShadowCaster;
use bevy::math::DVec3;
use bevy::prelude::*;

use super::Ground;
use super::coast::Coast;
use super::leaves::{self, Leaves, PlantMaterial};
use super::maps::Maps;
use super::material::EarthMaterial;
use super::plants::Forms;
use super::relief::Lie;
use super::sow;
use crate::origin::WorldPos;
use crate::sky::Sky;

/// A switch for measuring what the plants cost (`rust/docs/terrain.md`, "Measuring"): off, none are stood up.
const PLANTS: bool = true;
/// The side of the squares the plants are gathered by, m: each is one mesh, and comes and goes as one, so the
/// grass's are small.
const TILE: f32 = 50.0;
const SKYLINE_TILE: f32 = 200.0;
const TUFT_TILE: f32 = 25.0;
const FAR_TUFT_TILE: f32 = 50.0;
/// Over what distance from the eye each kind fades out, m (and the far tufts fade in over the near ones' fading).
const SCRUB_SEEN: Range<f32> = 2400.0..3000.0;
const SKYLINE_SEEN: Range<f32> = 3500.0..4500.0;
const TUFTS_SEEN: Range<f32> = 60.0..100.0;
const FAR_TUFTS_SEEN: Range<f32> = 200.0..280.0;

/// The region's coast, sorted (`earth/coast.rs`): there once the shore map has been read.
#[derive(Resource)]
pub struct Sorted(pub Coast);

/// How a kind of plant is stood up: its material, whether it throws a shadow, and over what distances from the eye
/// it fades in and out.
struct Kind {
    material: Handle<PlantMaterial>,
    shadow: bool,
    fade_in: Range<f32>,
    fade_out: Range<f32>,
}

/// The leaves' material: lit by the side that is seen.
fn leaf(earth: &EarthMaterial) -> PlantMaterial {
    let base = StandardMaterial {
        perceptual_roughness: 0.75,
        reflectance: 0.25,
        double_sided: true,
        cull_mode: None,
        ..default()
    };
    leaves::material(base, earth)
}

/// The grass's: a blade is lit as the ground is from either side.
fn blade(earth: &EarthMaterial) -> PlantMaterial {
    leaves::material(StandardMaterial { perceptual_roughness: 0.85, cull_mode: None, ..default() }, earth)
}

/// Stands the plants round the site, once the coast is sorted.
pub fn plant(
    mut commands: Commands,
    sorted: Option<Res<Sorted>>,
    ground: Res<Ground>,
    sky: Res<Sky>,
    maps: Res<Maps>,
    earths: Res<Assets<EarthMaterial>>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<PlantMaterial>>,
    mut planted: Local<bool>,
) {
    let (Some(sorted), Some(shore), Some(earth)) =
        (sorted, ground.shore.as_ref(), earths.get(&maps.material))
    else {
        return;
    };
    if *planted || !PLANTS {
        return;
    }
    *planted = true;
    let lie =
        Lie { coast: &sorted.0, marks: &earth.extension.marks, half: shore.half_width * sky.radius as f32 };
    let (leaves, blades) = (materials.add(leaf(earth)), materials.add(blade(earth)));
    commands.insert_resource(Leaves(vec![leaves.clone(), blades.clone()]));
    let (east, north) = (ground.east, ground.north);
    let mut stand = |forms: Forms, corner: Vec2, kind: &Kind| {
        if forms.is_empty() {
            return;
        }
        let mut plant = commands.spawn((
            Mesh3d(meshes.add(forms.mesh(corner, east, north))),
            MeshMaterial3d(kind.material.clone()),
            WorldPos((east * corner.x + north * corner.y).as_dvec3() + DVec3::Y * ground.grade),
            VisibilityRange {
                start_margin: kind.fade_in.clone(),
                end_margin: kind.fade_out.clone(),
                use_aabb: true,
            },
        ));
        if !kind.shadow {
            plant.insert(NotShadowCaster);
        }
    };
    let scrub = Kind { material: leaves.clone(), shadow: true, fade_in: 0.0..0.0, fade_out: SCRUB_SEEN };
    for corner in squares(0.0, sow::REACH, TILE) {
        stand(sow::scrub(&lie, corner, TILE, east, north), corner, &scrub);
    }
    let skyline = Kind { material: leaves, shadow: true, fade_in: 0.0..0.0, fade_out: SKYLINE_SEEN };
    for corner in squares(sow::REACH - 150.0, sow::SKYLINE, SKYLINE_TILE) {
        stand(sow::skyline(&lie, corner, SKYLINE_TILE, east, north), corner, &skyline);
    }
    let near = Kind { material: blades.clone(), shadow: false, fade_in: 0.0..0.0, fade_out: TUFTS_SEEN };
    for corner in squares(0.0, sow::TUFTS, TUFT_TILE) {
        stand(sow::tufts(&lie, corner, TUFT_TILE, east, north, false), corner, &near);
    }
    let far = Kind { material: blades, shadow: false, fade_in: TUFTS_SEEN, fade_out: FAR_TUFTS_SEEN };
    for corner in squares(0.0, sow::FAR_TUFTS, FAR_TUFT_TILE) {
        stand(sow::tufts(&lie, corner, FAR_TUFT_TILE, east, north, true), corner, &far);
    }
}

/// The corners of the squares of side `side` that come between `from` and `reach` of the site.
fn squares(from: f32, reach: f32, side: f32) -> impl Iterator<Item = Vec2> {
    let n = (reach / side).ceil() as i32;
    (-n..n).flat_map(move |x| (-n..n).map(move |y| Vec2::new(x as f32, y as f32) * side)).filter(
        move |corner| {
            let middle = (*corner + side / 2.0).length();
            middle - side * 0.71 < reach && middle + side * 0.71 > from
        },
    )
}
