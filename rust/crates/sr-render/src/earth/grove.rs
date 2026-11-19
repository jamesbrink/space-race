//! What grows round the site, stood on the ground as plants (`earth/plants.rs`) where the ground's shader paints
//! their crowns (`earth/flora.rs` has the same rules): the scrub out to [`REACH`] metres, so that from the pad it
//! has an outline against the sky and not a stain's, and the grass's tufts near the site's middle. Beyond that the
//! painted ground stands alone; the plants grow smaller toward the edge, so there is no line where they stop.
//!
//! Estimated throughout: which crown is a palmetto, an oak or a palm follows the painted crown's own number, and
//! the share of each is read off photographs, not counted.

use bevy::camera::visibility::VisibilityRange;
use bevy::light::NotShadowCaster;
use bevy::math::DVec3;
use bevy::prelude::*;

use super::Ground;
use super::coast::Coast;
use super::flora::{self, Cover};
use super::maps::Maps;
use super::marks::EarthMarks;
use super::material::EarthMaterial;
use super::plants::Forms;
use crate::origin::WorldPos;
use crate::sky::Sky;

/// A switch for measuring what the plants cost (`rust/docs/terrain.md`, "Measuring"): off, none are stood up.
const PLANTS: bool = true;
/// How far from the site the scrub is stood up, m, and the grass's tufts.
const REACH: f32 = 400.0;
const TUFTS: f32 = 150.0;
/// The side of the squares the plants are gathered by, m: each is one mesh. The grass's are small, because a
/// square comes and goes as one and a large one would be seen to.
const TILE: f32 = 50.0;
const TUFT_TILE: f32 = 25.0;
/// The tufts' cell, m (`earth_land.wesl` `herbs`).
const TUFT_CELL: f32 = 0.55;
/// Leaves and grass, linear (`missions/usa/places/cape-canaveral/ground.ts` PALETTE: estimated).
const LEAF_LIT: Vec3 = Vec3::new(0.127, 0.254, 0.059);
const LEAF_OTHER: Vec3 = Vec3::new(0.095, 0.195, 0.042);
const HERB_DRY: Vec3 = Vec3::new(0.397, 0.376, 0.133);
const HERB_GREEN: Vec3 = Vec3::new(0.202, 0.296, 0.080);

/// The region's coast, sorted (`earth/coast.rs`): there once the shore map has been read.
#[derive(Resource)]
pub struct Sorted(pub Coast);

/// What the planting reads the ground from.
struct Lie<'a> {
    coast: &'a Coast,
    marks: &'a EarthMarks,
    /// Half the shore map's width, m.
    half: f32,
}

impl Lie<'_> {
    fn cover(&self, p: Vec2) -> Cover {
        let uv = Vec2::new(0.5 + p.x / (2.0 * self.half + 1.0), 0.5 - p.y / (2.0 * self.half + 1.0));
        let (shore, river) = self.coast.at(uv);
        flora::cover(p, shore, river, &self.marks.made_at(p, flora::grain))
    }
}

fn smoothstep(a: f32, b: f32, x: f32) -> f32 {
    let t = ((x - a) / (b - a)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

/// The scattered points of the cells of side `cell` that fall in the square at `corner`: where each is (metres
/// east and north) and its own number.
fn points(corner: Vec2, side: f32, cell: f32, seed: u32) -> impl Iterator<Item = (Vec2, f32)> {
    let (low, high) = ((corner / cell).floor().as_ivec2() - 1, ((corner + side) / cell).ceil().as_ivec2());
    (low.y..=high.y)
        .flat_map(move |y| (low.x..=high.x).map(move |x| flora::point(IVec2::new(x, y), seed)))
        .map(move |(at, own)| (at * cell, own))
        .filter(move |(p, _)| p.cmpge(corner).all() && p.cmplt(corner + side).all())
}

/// The scrub of one square, in the square's own frame: `east` and `north` are the compass in the site's.
fn scrub(lie: &Lie, corner: Vec2, east: Vec3, north: Vec3) -> Forms {
    let mut forms = Forms::default();
    let height = lie.cover(corner + TILE / 2.0).height();
    // (the crowns' cell, as the shader has it)
    let cell = 1.3 + 0.75 * height;
    for (p, own) in points(corner, TILE, cell, 12) {
        let grown = 1.0 - smoothstep(REACH - 90.0, REACH, p.length());
        if grown <= 0.05 || own >= lie.cover(p).woody * 1.1 {
            continue;
        }
        let foot = east * (p.x - corner.x) + north * (p.y - corner.y);
        let radius = (0.55 + 0.4 * (own * 13.0).fract()) * cell * 0.8 * grown;
        let tall = height * (0.7 + 0.5 * (own * 53.0).fract()) * grown;
        let kind = (own * 29.0).fract();
        let leaf = LEAF_LIT.lerp(LEAF_OTHER, flora::grain(p * 0.03, 60))
            * (0.75 + 0.5 * flora::billow(p * 0.0025, 64));
        if (own * 97.0).fract() < 0.005 {
            // (a cabbage palm stands over the scrub here and there)
            forms.palm(foot, (3.5 + 3.5 * (own * 71.0).fract()) * grown, leaf * 0.8, own);
        } else if kind < 0.45 {
            forms.fans(foot, radius, tall * 0.75, leaf * 1.5, own);
        } else {
            forms.mound(foot, radius, tall * 0.85, if kind < 0.6 { leaf } else { LEAF_OTHER } * 1.35, own);
        }
    }
    forms
}

/// The grass's tufts in one square.
fn tufts(lie: &Lie, corner: Vec2, east: Vec3, north: Vec3) -> Forms {
    let mut forms = Forms::default();
    for (p, own) in points(corner, TUFT_TILE, TUFT_CELL, 9) {
        let grown = 1.0 - smoothstep(TUFTS - 40.0, TUFTS, p.length());
        if grown <= 0.05 {
            continue;
        }
        let cover = lie.cover(p);
        if own >= cover.herb * (0.15 + 1.5 * flora::grain(p * 0.3, 52)) {
            continue;
        }
        let size = (own * 17.0).fract();
        let radius = (0.14 + 0.38 * size * size) * TUFT_CELL;
        let lush = (0.25
            + 0.5 * cover.swale
            + 0.6 * cover.marsh
            + 0.5 * flora::grain(p * 0.02, 50)
            + ((own * 7.0).fract() - 0.5) * 0.7)
            .clamp(0.0, 1.0);
        let foot = east * (p.x - corner.x) + north * (p.y - corner.y);
        forms.tuft(foot, radius, radius * 1.3 * grown, HERB_DRY.lerp(HERB_GREEN, lush), own);
    }
    forms
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
    mut materials: ResMut<Assets<StandardMaterial>>,
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
    let leaves = materials.add(StandardMaterial {
        perceptual_roughness: 0.75,
        reflectance: 0.25,
        double_sided: true,
        cull_mode: None,
        ..default()
    });
    // (a blade is lit as the ground is from either side; a leaf by the side that is seen)
    let blades = materials.add(StandardMaterial { perceptual_roughness: 0.85, cull_mode: None, ..default() });
    let (east, north) = (ground.east, ground.north);
    let mut stand =
        |forms: Forms, corner: Vec2, material: &Handle<StandardMaterial>, seen: std::ops::Range<f32>| {
            if !forms.is_empty() {
                commands.spawn((
                    Mesh3d(meshes.add(forms.mesh())),
                    MeshMaterial3d(material.clone()),
                    WorldPos((east * corner.x + north * corner.y).as_dvec3() + DVec3::Y * ground.grade),
                    NotShadowCaster,
                    VisibilityRange { start_margin: 0.0..0.0, end_margin: seen, use_aabb: true },
                ));
            }
        };
    // (from far enough off a crown is under a pixel, and the painted ground is all there is to see)
    for corner in squares(REACH, TILE) {
        stand(scrub(&lie, corner, east, north), corner, &leaves, 2400.0..3000.0);
    }
    for corner in squares(TUFTS, TUFT_TILE) {
        stand(tufts(&lie, corner, east, north), corner, &blades, 45.0..110.0);
    }
}

/// The corners of the squares of side `side` that come within `reach` of the site.
fn squares(reach: f32, side: f32) -> impl Iterator<Item = Vec2> {
    let n = (reach / side).ceil() as i32;
    (-n..n)
        .flat_map(move |x| (-n..n).map(move |y| Vec2::new(x as f32, y as f32) * side))
        .filter(move |corner| (*corner + side / 2.0).length() - side * 0.71 < reach)
}
