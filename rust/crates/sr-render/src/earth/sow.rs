//! What is planted in one square of the ground (`earth/grove.rs` stands the squares up): the scrub's plants where
//! the ground's shader paints their crowns, the taller clumps and palms that break the far skyline, and the grass's
//! tufts, near and far. Each stands on the ground's relief (`earth/relief.rs`).
//!
//! Estimated throughout: which crown is a palmetto, an oak or a palm follows the painted crown's own number, the
//! share of each and every size is read off photographs, not counted, and each plant's tone is set so that from
//! a kilometre off the plants and the painted scrub round them are one tone.

use bevy::prelude::*;

use super::flora;
use super::plants::Forms;
use super::relief::Lie;

/// How far from the site the scrub is stood up, m; the taller clumps beyond it, out to [`SKYLINE`]; the grass's
/// tufts, near and in their far form.
pub const REACH: f32 = 400.0;
pub const SKYLINE: f32 = 1600.0;
pub const TUFTS: f32 = 150.0;
pub const FAR_TUFTS: f32 = 320.0;
/// The cell the scrub's crowns are scattered by, m (`earth_land.wesl` `CROWN_CELL`).
const CROWN_CELL: f32 = 2.2;
/// The tufts' cell, m (`earth_land.wesl` `herbs`), and the far tufts', which stand one to four near cells.
const TUFT_CELL: f32 = 0.55;
const FAR_TUFT_CELL: f32 = 1.1;
/// The cell the taller clumps are scattered by, m, and the share of cells of closed scrub that have one.
const CLUMP_CELL: f32 = 14.0;
const CLUMPS: f32 = 0.35;
/// Leaves and grass, linear (`missions/usa/places/cape-canaveral/ground.ts` PALETTE: estimated).
const LEAF_LIT: Vec3 = Vec3::new(0.127, 0.254, 0.059);
const LEAF_OTHER: Vec3 = Vec3::new(0.095, 0.195, 0.042);
const HERB_DRY: Vec3 = Vec3::new(0.397, 0.376, 0.133);
const HERB_GREEN: Vec3 = Vec3::new(0.202, 0.296, 0.080);
/// Sea oats on the dune: how many times taller than the grass inland, and their straw colour, linear. Estimated
/// (they stand knee to waist high, their heads above them).
const SEA_OATS: f32 = 2.5;
const OATS: Vec3 = Vec3::new(0.42, 0.38, 0.2);
/// A plant's leaves against the painted scrub's own green: a crown in the Sun shades its own inside and the
/// ground under it, which the painted scrub counts in its tone and a plant's leaves do not. Set by looking from a
/// kilometre off until the planted ring and the painted scrub round it were one tone. Estimated.
const FANS: f32 = 1.0;
const MOUNDS: f32 = 0.95;
const PALMS: f32 = 0.75;

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

/// A round piece of ground planted: its middle (metres east and north of the site), how far out the plants reach,
/// growing smaller over their last 90 m, and how far round the site is left out (planted already).
#[derive(Debug, Clone, Copy)]
pub struct Ring {
    pub centre: Vec2,
    pub reach: f32,
    pub hole: f32,
}

impl Ring {
    /// The ground round the site, out to `reach`.
    #[must_use]
    pub fn site(reach: f32) -> Self {
        Self { centre: Vec2::ZERO, reach, hole: 0.0 }
    }

    /// How grown a plant at `p` is, 0 to 1.
    fn grown(&self, p: Vec2) -> f32 {
        let kept = if p.length() < self.hole { 0.0 } else { 1.0 };
        kept * (1.0
            - smoothstep(self.reach - 90.0_f32.min(self.reach * 0.3), self.reach, (p - self.centre).length()))
    }
}

/// Where a plant at `p` stands in its square's frame, on the ground's relief.
fn foot(lie: &Lie, p: Vec2, corner: Vec2, east: Vec3, north: Vec3) -> Vec3 {
    east * (p.x - corner.x) + north * (p.y - corner.y) + Vec3::Y * lie.height(p)
}

/// The scrub's green at `p`, as the shader has it (`earth_land.wesl` `scrub`).
fn leaf(p: Vec2) -> Vec3 {
    LEAF_LIT.lerp(LEAF_OTHER, flora::grain(p * 0.03, 60)) * (0.75 + 0.5 * flora::billow(p * 0.0025, 64))
}

/// The scrub of one square of side `side`, in the square's own frame: `east` and `north` are the compass in the
/// site's.
pub fn scrub(lie: &Lie, corner: Vec2, side: f32, east: Vec3, north: Vec3, ring: Ring) -> Forms {
    let mut forms = Forms::default();
    let height = lie.cover(corner + side / 2.0).height();
    // (the crowns' cell, and how much smaller they are where the scrub is low, as the shader has them)
    let cell = CROWN_CELL;
    let small = 0.6 + 0.4 * smoothstep(0.9, 2.1, height);
    for (p, own) in points(corner, side, cell, 12) {
        let grown = ring.grown(p);
        if grown <= 0.05 || own >= lie.cover(p).woody * 1.1 {
            continue;
        }
        let at = foot(lie, p, corner, east, north);
        let radius = (0.55 + 0.4 * (own * 13.0).fract()) * small * cell * 0.8 * grown;
        let tall = height * (0.7 + 0.5 * (own * 53.0).fract()) * grown;
        let kind = (own * 29.0).fract();
        let green = leaf(p);
        if (own * 97.0).fract() < 0.005 {
            // (a cabbage palm stands over the scrub here and there)
            forms.palm(at, (3.5 + 3.5 * (own * 71.0).fract()) * grown, green * PALMS, own);
        } else if kind < 0.45 {
            forms.fans(at, radius, tall * 0.75, green * FANS, own);
        } else {
            forms.mound(at, radius, tall * 0.85, if kind < 0.6 { green } else { LEAF_OTHER } * MOUNDS, own);
        }
    }
    forms
}

/// The taller clumps of one square past the scrub's reach: an oak's dome over the scrub, a cabbage palm, so that
/// the skyline seen from the pad is broken as the Cape's is and not ruled.
pub fn skyline(lie: &Lie, corner: Vec2, side: f32, east: Vec3, north: Vec3) -> Forms {
    let mut forms = Forms::default();
    for (p, own) in points(corner, side, CLUMP_CELL, 13) {
        let reach = p.length();
        let grown =
            smoothstep(REACH - 120.0, REACH, reach) * (1.0 - smoothstep(SKYLINE - 300.0, SKYLINE, reach));
        let cover = lie.cover(p);
        if grown <= 0.05 || own >= CLUMPS * smoothstep(0.55, 0.85, cover.woody) {
            continue;
        }
        let at = foot(lie, p, corner, east, north);
        let tall = cover.height() * (1.3 + 0.9 * (own * 53.0).fract());
        if (own * 97.0).fract() < 0.12 {
            forms.palm(at, 4.0 + 4.0 * (own * 71.0).fract(), leaf(p) * PALMS, own);
        } else {
            let radius = tall * (0.9 + 0.6 * (own * 13.0).fract());
            forms.mound(at, radius, tall, leaf(p) * MOUNDS * 0.85, own);
        }
    }
    forms
}

/// The grass's tufts in one square of side `side`: `far` gives the far form, one to four near cells, and fewer
/// blades.
pub fn tufts(lie: &Lie, corner: Vec2, side: f32, east: Vec3, north: Vec3, ring: Ring, far: bool) -> Forms {
    let mut forms = Forms::default();
    let cell = if far { FAR_TUFT_CELL } else { TUFT_CELL };
    for (p, own) in points(corner, side, cell, if far { 19 } else { 9 }) {
        let grown = ring.grown(p);
        if grown <= 0.05 {
            continue;
        }
        let cover = lie.cover(p);
        if own >= cover.herb * (0.15 + 1.5 * flora::grain(p * 0.3, 52)) {
            continue;
        }
        let size = (own * 17.0).fract();
        let radius = (0.14 + 0.38 * size * size) * TUFT_CELL * if far { 1.3 } else { 1.0 };
        let lush = (0.25
            + 0.5 * cover.swale
            + 0.6 * cover.marsh
            + 0.5 * flora::grain(p * 0.02, 50)
            + ((own * 7.0).fract() - 0.5) * 0.7)
            .clamp(0.0, 1.0);
        let at = foot(lie, p, corner, east, north);
        let blades = if far { 2 } else { 3 + ((own * 41.0).fract() * 4.0) as u32 };
        // (on the dune they are sea oats: taller, straw-pale, standing over the sand)
        let tall = radius * (1.0 + 1.2 * (own * 23.0).fract()) * (1.0 + SEA_OATS * cover.dune) * grown;
        let tone = HERB_DRY.lerp(HERB_GREEN, lush).lerp(OATS, cover.dune);
        forms.tuft(at, radius, tall, tone, own, blades);
    }
    forms
}
