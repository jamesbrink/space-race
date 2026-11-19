//! What people had made of the ground round a site: its ways (shell roads, a rail line's ballast) and the patches
//! kept clear (a fenced and mown complex, sand worn bare round a pad's concrete, ground a model stands on). The game
//! hands them over from the place's own record, in the site's frame; nothing here knows a place. Painted in the
//! ground's shader, as the web build paints them (`missions/usa/places/cape-canaveral/ground.ts`: `way`, `lc56`,
//! `apron`, `built`).

use bevy::prelude::*;
use bevy::render::render_resource::ShaderType;

/// The most ways the shader takes.
pub const WAYS: usize = 32;
/// The most patches.
pub const PATCHES: usize = 24;

/// What a way is surfaced with.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Surface {
    /// A rail line's bed of grey stone.
    Ballast,
    /// Crushed shell, two wheel ruts pressed darker.
    Shell,
    /// A strip cut through the scrub and harrowed to bare sand.
    Firebreak,
}

/// A straight length of a made way.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Way {
    /// Its ends, in the site's frame: metres along +X and +Z.
    pub ends: [Vec2; 2],
    /// Half its width, m.
    pub half_width: f32,
    /// What it is made of.
    pub surface: Surface,
}

/// What a patch of kept ground is.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kept {
    /// A clearing: no scrub, thin mown grass with sand showing through.
    Cleared,
    /// Sand graded bare and worn, as round a pad's concrete.
    Graded,
    /// Ground a model stands on: nothing grows, and nothing is painted that the model would have to agree with.
    Built,
    /// The same, where the patch's edge is the edge of the model's own paving: the join is drawn as a dirty one,
    /// stained, with weeds along it.
    Paved,
}

/// A patch of kept ground: a box with rounded corners (a disc is a box of no size with a corner of its radius).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Patch {
    /// Its middle, in the site's frame: metres along +X and +Z.
    pub centre: Vec2,
    /// Half its size along its own two axes, m, before the corners are rounded.
    pub half: Vec2,
    /// The radius its corners are rounded to, m, added outside `half`.
    pub corner: f32,
    /// How far its axes are turned from the site's, radians from +X toward +Z.
    pub turn: f32,
    /// What it is.
    pub ground: Kept,
}

/// The made ground round the site. The game sets it; left out, the land is as it grew.
#[derive(Resource, Debug, Clone, PartialEq, Default)]
pub struct Marks {
    /// The ways, [`WAYS`] at most.
    pub ways: Vec<Way>,
    /// The patches, [`PATCHES`] at most.
    pub patches: Vec<Patch>,
}

/// The marks as the shader takes them, in metres east and north of the site.
#[derive(ShaderType, Debug, Clone, Copy, Default)]
pub struct EarthMarks {
    /// Each way's two ends: east and north of one, then of the other.
    pub ways: [Vec4; WAYS],
    /// Each way's half-width (m) and surface (0 ballast, 1 shell, 2 firebreak).
    pub way_kinds: [Vec4; WAYS],
    /// Each patch's middle (east, north) and half its size.
    pub patches: [Vec4; PATCHES],
    /// Each patch's first axis (east, north), its corner's radius (m) and what it is (0 cleared, 1 graded, 2 built,
    /// 3 paved).
    pub patch_kinds: [Vec4; PATCHES],
    /// How many ways, how many patches.
    pub counts: Vec4,
}

impl Marks {
    /// For the shader. `east` and `north` are the compass in the site's frame.
    #[must_use]
    pub fn uniform(&self, east: Vec3, north: Vec3) -> EarthMarks {
        let compass = |p: Vec2| Vec2::new(p.x * east.x + p.y * east.z, p.x * north.x + p.y * north.z);
        let mut marks = EarthMarks::default();
        for (i, way) in self.ways.iter().take(WAYS).enumerate() {
            let [a, b] = way.ends.map(compass);
            marks.ways[i] = Vec4::new(a.x, a.y, b.x, b.y);
            let surface = match way.surface {
                Surface::Ballast => 0.0,
                Surface::Shell => 1.0,
                Surface::Firebreak => 2.0,
            };
            marks.way_kinds[i] = Vec4::new(way.half_width, surface, 0.0, 0.0);
        }
        for (i, patch) in self.patches.iter().take(PATCHES).enumerate() {
            let centre = compass(patch.centre);
            let axis = compass(Vec2::from_angle(patch.turn));
            marks.patches[i] = Vec4::new(centre.x, centre.y, patch.half.x, patch.half.y);
            let ground = match patch.ground {
                Kept::Cleared => 0.0,
                Kept::Graded => 1.0,
                Kept::Built => 2.0,
                Kept::Paved => 3.0,
            };
            marks.patch_kinds[i] = Vec4::new(axis.x, axis.y, patch.corner, ground);
        }
        // (and how far from the site the furthest patch reaches, with its frayed edge: past it the shader need not
        // look at any)
        let reach = self
            .patches
            .iter()
            .map(|p| p.centre.length() + p.half.length() + p.corner + 30.0)
            .fold(0.0_f32, f32::max);
        marks.counts =
            Vec4::new(self.ways.len().min(WAYS) as f32, self.patches.len().min(PATCHES) as f32, reach, 0.0);
        marks
    }
}

/// The made ground at a point, as the shader works it out (`earth.wesl` `made_at`, which this follows).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Made {
    /// How much of it is a clearing, 0 to 1.
    pub cleared: f32,
    /// How much is graded sand.
    pub graded: f32,
    /// How much is built on.
    pub built: f32,
    /// Metres from the nearest way's edge, negative on it.
    pub way: f32,
}

impl EarthMarks {
    /// The made ground at a point, metres east and north of the site. `grain` is the ground's noise
    /// (`earth/flora.rs`), which frays the edges of the clearings.
    #[must_use]
    pub fn made_at(&self, p: Vec2, grain: impl Fn(Vec2, u32) -> f32) -> Made {
        let step = |a: f32, b: f32, x: f32| {
            let t = ((x - a) / (b - a)).clamp(0.0, 1.0);
            t * t * (3.0 - 2.0 * t)
        };
        let mut made = Made { cleared: 0.0, graded: 0.0, built: 0.0, way: 1.0e6 };
        let (ways, patches) = (self.counts.x as usize, self.counts.y as usize);
        for (way, kind) in self.ways.iter().zip(&self.way_kinds).take(ways) {
            let (a, ab) = (way.xy(), way.zw() - way.xy());
            let along = ((p - a).dot(ab) / ab.length_squared().max(1.0e-6)).clamp(0.0, 1.0);
            made.way = made.way.min((p - a - ab * along).length() - kind.x);
        }
        for (patch, kind) in self.patches.iter().zip(&self.patch_kinds).take(patches) {
            let off = p - patch.xy();
            let q = Vec2::new(off.dot(kind.xy()), off.dot(Vec2::new(-kind.y, kind.x))).abs() - patch.zw();
            let d = q.max(Vec2::ZERO).length() + q.x.max(q.y).min(0.0) - kind.z;
            if kind.w < 0.5 {
                made.cleared = made.cleared.max(1.0 - step(-2.0, 4.0, d + 3.0 * (grain(p * 0.2, 39) - 0.5)));
            } else if kind.w < 1.5 {
                made.graded = made.graded.max(1.0 - step(-6.0, 6.0, d + 8.0 * (grain(p * 0.08, 44) - 0.5)));
            } else {
                made.built = made.built.max(1.0 - step(-0.5, 0.5, d));
            }
        }
        if ways + patches == 0 {
            made.cleared = 1.0 - step(230.0, 290.0, p.length() + 40.0 * (grain(p * 0.02, 39) - 0.5));
        }
        made
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_way_is_laid_on_the_compass() {
        // A frame whose +X bears due north and whose +Z bears east.
        let (east, north) = (Vec3::Z, Vec3::X);
        let way = Way { ends: [Vec2::ZERO, Vec2::new(100.0, 0.0)], half_width: 3.5, surface: Surface::Shell };
        let patch = Patch {
            centre: Vec2::new(0.0, 50.0),
            half: Vec2::ZERO,
            corner: 20.0,
            turn: 0.0,
            ground: Kept::Graded,
        };
        let marks = Marks { ways: vec![way], patches: vec![patch] }.uniform(east, north);
        assert_eq!(marks.ways[0], Vec4::new(0.0, 0.0, 0.0, 100.0));
        assert_eq!(marks.way_kinds[0], Vec4::new(3.5, 1.0, 0.0, 0.0));
        assert_eq!(marks.patches[0], Vec4::new(50.0, 0.0, 0.0, 0.0));
        assert_eq!(marks.patch_kinds[0], Vec4::new(0.0, 1.0, 20.0, 1.0));
        assert_eq!(marks.counts, Vec4::new(1.0, 1.0, 100.0, 0.0));
    }
}
