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
use super::ab::Planted;
use super::coast::Coast;
use super::leaves::{self, Leaves, PlantMaterial};
use super::maps::Maps;
use super::material::EarthMaterial;
use super::plants::Forms;
use super::relief::Lie;
use super::sow::{self, Ring};
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
/// Past a kilometre a shrub is under three pixels and the painted ground carries it; chosen for what it costs.
const SCRUB_SEEN: Range<f32> = 900.0..1200.0;
const SKYLINE_SEEN: Range<f32> = 2500.0..3200.0;
const TUFTS_SEEN: Range<f32> = 60.0..100.0;
const FAR_TUFTS_SEEN: Range<f32> = 200.0..280.0;

/// How far from the site the open beach is looked for, m; and how far round the point of it nearest the site the
/// scrub, the near grass and the far grass are stood up there. Chosen for what they cost.
const BEACH_SEARCH: f32 = 4000.0;
const BEACH_SCRUB: f32 = 300.0;
const BEACH_NEAR: f32 = 200.0;
const BEACH_FAR: f32 = 350.0;

/// The region's coast, sorted (`earth/coast.rs`): there once the shore map has been read.
#[derive(Resource)]
pub struct Sorted(pub Coast);

/// Whether the scrub throws the engine's shadow. Off: past the first cascade (18 m) its shadow-map texels show as
/// stairs along every shrub's shadow on the sand. The ground's shader paints a soft shadow by each crown instead
/// (`earth_land.wesl` `scrub`). Turn on when the cascades are finer or filtered more.
const SCRUB_SHADOWS: bool = false;

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
            Planted,
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
    let [scrub, skyline, near, far] = kinds(leaves, blades);
    for place in places(&lie) {
        for corner in squares(place.scrub, TILE) {
            stand(sow::scrub(&lie, corner, TILE, east, north, place.scrub), corner, &scrub);
        }
        for corner in squares(place.near, TUFT_TILE) {
            stand(sow::tufts(&lie, corner, TUFT_TILE, east, north, place.near, false), corner, &near);
        }
        for corner in squares(place.far, FAR_TUFT_TILE) {
            stand(sow::tufts(&lie, corner, FAR_TUFT_TILE, east, north, place.far, true), corner, &far);
        }
    }
    let round = Ring { centre: Vec2::ZERO, reach: sow::SKYLINE, hole: 0.0 };
    for corner in squares(round, SKYLINE_TILE) {
        stand(sow::skyline(&lie, corner, SKYLINE_TILE, east, north), corner, &skyline);
    }
}

/// A place planted: its scrub, and its grass near and far.
struct Place {
    scrub: Ring,
    near: Ring,
    far: Ring,
}

/// The places planted: round the site, and round the open beach nearest it, where a person goes to stand.
fn places(lie: &Lie) -> Vec<Place> {
    let site = Place {
        scrub: Ring::site(sow::REACH),
        near: Ring::site(sow::TUFTS),
        far: Ring::site(sow::FAR_TUFTS),
    };
    let mut places = vec![site];
    let beach = lie.beach(BEACH_SEARCH);
    if let Some(centre) = beach
        && centre.length() > sow::REACH + 100.0
    {
        let hole = sow::REACH;
        places.push(Place {
            scrub: Ring { centre, reach: BEACH_SCRUB, hole },
            near: Ring { centre, reach: BEACH_NEAR, hole },
            far: Ring { centre, reach: BEACH_FAR, hole },
        });
    }
    places
}

/// How each kind of plant is stood up.
fn kinds(leaves: Handle<PlantMaterial>, blades: Handle<PlantMaterial>) -> [Kind; 4] {
    [
        Kind { material: leaves.clone(), shadow: SCRUB_SHADOWS, fade_in: 0.0..0.0, fade_out: SCRUB_SEEN },
        Kind { material: leaves, shadow: SCRUB_SHADOWS, fade_in: 0.0..0.0, fade_out: SKYLINE_SEEN },
        Kind { material: blades.clone(), shadow: false, fade_in: 0.0..0.0, fade_out: TUFTS_SEEN },
        Kind { material: blades, shadow: false, fade_in: TUFTS_SEEN, fade_out: FAR_TUFTS_SEEN },
    ]
}

/// The corners of the squares of side `side` that come within a ring.
fn squares(ring: Ring, side: f32) -> impl Iterator<Item = Vec2> {
    let low = ((ring.centre - ring.reach) / side).floor().as_ivec2();
    let high = ((ring.centre + ring.reach) / side).ceil().as_ivec2();
    (low.x..high.x)
        .flat_map(move |x| (low.y..high.y).map(move |y| Vec2::new(x as f32, y as f32) * side))
        .filter(move |corner| {
            let middle = *corner + side / 2.0;
            (middle - ring.centre).length() - side * 0.71 < ring.reach
                && middle.length() + side * 0.71 > ring.hole
        })
}
