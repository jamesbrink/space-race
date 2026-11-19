//! The lie of the land near the site, raised as geometry (`earth/mesh.rs`): a person standing on the Cape sees its
//! whole character in a metre or three of height. The beach rises from the water to its berm; the foredune stands
//! behind it, steep to the sea and gentle to the land, broken by blowouts and higher in places; hummocks behind it,
//! then the strand falling away to the plain of old beach ridges, each a little above the swales either side
//! (`earth/flora.rs` lays them out, as the shader paints them). Made ground (the complexes, their aprons, the roads
//! and their verges) is flat.
//!
//! Every height here is estimated: no survey of the Cape's dunes in 1961 has been read. The Cape's dunes are low
//! (photographs of the Missile Row beach show a dune line about a man's height and more over the beach); the
//! ridge-and-swale plain has a relief of about a metre (Schmalzer and Foster 2020 describe it, without heights).

use bevy::prelude::*;

use super::coast::Coast;
use super::flora::{self, Cover};
use super::maps::Maps;
use super::marks::{EarthMarks, Made};
use super::material::EarthMaterial;
use super::{Ground, mesh};
use crate::sky::Sky;

/// How far in from the waterline the foredune's crest stands, m, and how high it is over the beach, m, on the mean.
/// Estimated.
const CREST_IN: f32 = 62.0;
const CREST: f32 = 3.0;
/// Its half-width to the sea and to the land, m. Estimated.
const FACE_SEA: f32 = 13.0;
const FACE_LAND: f32 = 24.0;
/// How high the beach's berm is over the water, m. Estimated.
const BERM: f32 = 0.8;
/// How high an old ridge stands over the swales either side, m. Estimated.
const RIDGES: f32 = 0.8;

/// The Earth's surface, so that its near ground can be raised once the coast is known.
#[derive(Resource)]
pub struct Surface(pub Handle<Mesh>);

/// What the ground near the site is read from: the sorted coast and the made ground.
pub struct Lie<'a> {
    pub coast: &'a Coast,
    pub marks: &'a EarthMarks,
    /// Half the shore map's width, m.
    pub half: f32,
}

impl Lie<'_> {
    /// Metres inland of the open sea's shore and from enclosed water, and the made ground, at `p`.
    fn read(&self, p: Vec2) -> (f32, f32, Made) {
        let uv = Vec2::new(0.5 + p.x / (2.0 * self.half + 1.0), 0.5 - p.y / (2.0 * self.half + 1.0));
        let (shore, river) = self.coast.at(uv);
        (shore, river, self.marks.made_at(p, flora::grain))
    }

    /// Metres inland of the open sea's shore at `p` (negative at sea).
    pub fn shore(&self, p: Vec2) -> f32 {
        self.read(p).0
    }

    /// The point of the open beach nearest the site, a dune's breadth inland of the water, if there is one within
    /// `within` metres.
    pub fn beach(&self, within: f32) -> Option<Vec2> {
        const STEP: f32 = 20.0;
        const BEARINGS: u32 = 240;
        (1..=(within / STEP) as u32).find_map(|ring| {
            let r = ring as f32 * STEP;
            (0..BEARINGS).find_map(|k| {
                let (s, c) = (std::f32::consts::TAU * k as f32 / BEARINGS as f32).sin_cos();
                let p = Vec2::new(s, c) * r;
                // (and the sea beyond it open: a pond the map has as the sea's is passed over)
                (self.shore(p) <= 0.0 && self.shore(p * (1.0 + 300.0 / r)) < -200.0)
                    .then(|| p * (1.0 - 70.0 / r))
            })
        })
    }

    /// What covers the ground at `p`.
    pub fn cover(&self, p: Vec2) -> Cover {
        let (shore, river, made) = self.read(p);
        flora::cover(p, shore, river, &made)
    }

    /// How high the ground stands at `p` over the sphere, m.
    pub fn height(&self, p: Vec2) -> f32 {
        let (shore, river, made) = self.read(p);
        let h =
            height(p, shore, river, &made) * (1.0 - smoothstep(0.85, 1.0, p.length() / mesh::NEAR as f32));
        if h.is_finite() { h } else { 0.0 }
    }
}

fn smoothstep(a: f32, b: f32, x: f32) -> f32 {
    let t = ((x - a) / (b - a)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

/// (Nothing here is finer than about fifteen metres: the mesh's points are a few metres apart, and a plant is stood
/// on this height, not on the mesh, so a finer lump would bury it or leave it floating.)
///
/// How high the ground stands at `p` (m east and north of the site) over the sphere, m, `shore` metres inland of
/// the open sea's shore and `river` from enclosed water, on made ground `made`.
#[must_use]
pub fn height(p: Vec2, shore: f32, river: f32, made: &Made) -> f32 {
    if shore <= 0.0 || river <= 0.0 {
        return 0.0;
    }
    let beach = BERM * smoothstep(0.0, 45.0, shore);
    // the foredune: its crest wanders in and out, its height along the shore, and blowouts cut it nearly down
    let crest_in = CREST_IN + 14.0 * (flora::billow(p / 260.0, 71) - 0.5);
    let gap = smoothstep(0.64, 0.74, flora::grain(p / 110.0, 72));
    let tall = CREST * (0.55 + 0.9 * flora::billow(p / 350.0, 70)) * (1.0 - 0.75 * gap);
    let d = (shore - crest_in) / if shore < crest_in { FACE_SEA } else { FACE_LAND };
    let dune = tall * (-d * d).exp();
    // hummocks on its back, where the sea grape and the palmetto hold the sand
    let hummocks = 1.2
        * (flora::grain(p / 16.0, 73) - 0.5)
        * smoothstep(45.0, 70.0, shore)
        * (1.0 - smoothstep(140.0, 320.0, shore));
    // behind it the strand, a little above the beach, falling to the plain of ridges and swales
    let strand = beach * (1.0 - smoothstep(120.0, 350.0, shore));
    let (_, ridge) = flora::ridges(p, shore);
    let plain =
        (RIDGES * (0.5 - ridge) + 0.4 * (flora::grain(p / 45.0, 74) - 0.5)) * smoothstep(150.0, 300.0, shore);
    let wet = smoothstep(0.0, 30.0, river) * smoothstep(0.0, 10.0, shore);
    let kept = made.cleared.max(made.graded).max(made.built).max(1.0 - smoothstep(4.0, 16.0, made.way));
    (dune + hummocks + strand + plain * wet) * wet.sqrt() * (1.0 - kept)
}

/// Raises the near ground, once the coast is sorted.
pub fn raise(
    sorted: Option<Res<super::grove::Sorted>>,
    ground: Res<Ground>,
    sky: Res<Sky>,
    maps: Res<Maps>,
    surface: Option<Res<Surface>>,
    earths: Res<Assets<EarthMaterial>>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut raised: Local<bool>,
) {
    let (Some(sorted), Some(shore), Some(surface), Some(earth)) =
        (sorted, ground.shore.as_ref(), surface, earths.get(&maps.material))
    else {
        return;
    };
    if *raised {
        return;
    }
    *raised = true;
    let lie =
        Lie { coast: &sorted.0, marks: &earth.extension.marks, half: shore.half_width * sky.radius as f32 };
    let lift = |p: Vec2| lie.height(p);
    let (east, north) = (ground.east.as_dvec3(), ground.north.as_dvec3());
    let mesh = mesh::surface(sky.radius, ground.grade, east, north, Some(&lift));
    // (the mesh is replaced whole: its handle, and the entity drawing it, stay as they were)
    if meshes.insert(surface.0.id(), mesh).is_err() {
        warn!("the Earth's surface could not be raised");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const WILD: Made = Made { cleared: 0.0, graded: 0.0, built: 0.0, way: 1.0e6 };

    #[test]
    fn the_dune_stands_behind_the_beach_and_made_ground_is_flat() {
        let p = Vec2::new(1400.0, 300.0);
        assert_eq!(height(p, -5.0, 5000.0, &WILD), 0.0);
        let beach = height(p, 15.0, 5000.0, &WILD);
        let crest = (40..110).map(|s| height(p, s as f32, 5000.0, &WILD)).fold(0.0, f32::max);
        assert!(beach < 0.6 && crest > beach + 0.5, "{beach} {crest}");
        assert!(crest < CREST * 1.6);
        let made = Made { cleared: 1.0, ..WILD };
        assert_eq!(height(p, 600.0, 5000.0, &made), 0.0);
    }
}
