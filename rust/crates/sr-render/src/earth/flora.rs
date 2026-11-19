//! What grows where, worked out on the processor as the ground's shader works it out on the screen
//! (`shaders/earth_land.wesl` `cover`, `shaders/earth_noise.wesl`): the same noise, the same scattered points,
//! the same rules, so that a plant stood on the ground (`earth/grove.rs`) stands on its own painted crown. Keep
//! the two in step, line for line.

use bevy::prelude::*;

use super::grain;
use super::marks::Made;

/// The turn and shift a use of the noise's tile is given (`earth_noise.wesl` `turn`, `grain`).
#[must_use]
pub fn grain(p: Vec2, seed: u32) -> f32 {
    let (sin, cos) = (seed as f32 * 2.399_963_2).sin_cos();
    let q = Vec2::new(cos * p.x - sin * p.y, sin * p.x + cos * p.y) + seed as f32 * 0.713;
    grain::value(q)
}

/// Three octaves of it (`earth_noise.wesl` `billow`).
#[must_use]
pub fn billow(p: Vec2, seed: u32) -> f32 {
    (grain(p, seed) * 4.0 + grain(p * 2.03, seed + 1) * 2.0 + grain(p * 4.11, seed + 2)) / 7.0
}

/// Three numbers for a lattice point, each in [0, 1) (`earth_noise.wesl` `lattice3`).
#[must_use]
pub fn lattice3(c: IVec2, seed: u32) -> Vec3 {
    let mut h = (c.x as u32).wrapping_mul(0x9E37_79B1)
        ^ (c.y as u32).wrapping_mul(0x85EB_CA77)
        ^ seed.wrapping_mul(0x27D4_EB2F);
    h ^= h >> 15;
    h = h.wrapping_mul(0x2C1B_3C6D);
    h ^= h >> 12;
    h = h.wrapping_mul(0x297A_2D39);
    h ^= h >> 15;
    Vec3::new((h & 0x7FF) as f32, ((h >> 11) & 0x7FF) as f32, (h >> 22) as f32 * 2.0) / 2048.0
}

/// The scattered point of a unit cell and its own number (`earth_noise.wesl` `nearest`).
#[must_use]
pub fn point(cell: IVec2, seed: u32) -> (Vec2, f32) {
    let own = lattice3(cell, seed);
    (cell.as_vec2() + 0.15 + 0.7 * own.xy(), own.z)
}

fn smoothstep(a: f32, b: f32, x: f32) -> f32 {
    let t = ((x - a) / (b - a)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

fn mix(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

/// What covers a point of the ground.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Cover {
    /// How much is scrub, 0 to 1.
    pub woody: f32,
    /// How much is grass and herbs.
    pub herb: f32,
    /// The community's order, coast to lagoon: 0 the surf line, 0.75 the scrub inland, 1 the lagoon's hammock.
    pub zone: f32,
    /// How much it is a grassy swale between two ridges.
    pub swale: f32,
    /// How much it is a lagoon's marsh.
    pub marsh: f32,
    /// How much it is the foredune behind the beach.
    pub dune: f32,
}

impl Cover {
    /// How high a closed stand of woody plants grows here, m (`earth_land.wesl` `scrub`).
    #[must_use]
    pub fn height(&self) -> f32 {
        mix(mix(0.9, 2.1, smoothstep(0.12, 0.42, self.zone)), 6.0, smoothstep(0.82, 0.98, self.zone))
    }
}

/// How much `p` is a swale between two old beach ridges, `shore` metres inland (`earth_land.wesl` `cover`): long,
/// curving, broken lines along the shore, each its own width and strength; and where it is between a ridge's crest
/// (0) and a swale's floor (1).
#[must_use]
pub fn ridges(p: Vec2, shore: f32) -> (f32, f32) {
    let wander = 9.0 * (billow(p * 0.0025, 35) - 0.5) + 3.0 * (billow(p * 0.011, 46) - 0.5);
    let spacing = 0.057 * (0.8 + 0.4 * billow(p * 0.0007, 48));
    let phase = shore * spacing + wander;
    let ridge = phase.sin() * 0.5 + 0.5;
    let which = lattice3(IVec2::new((phase / std::f32::consts::TAU + 0.25).floor() as i32, 7), 50);
    let pieces = smoothstep(0.48, 0.62, grain(p * 0.0026 + Vec2::new(which.y, which.z) * 40.0, 49));
    (smoothstep(0.78 + 0.16 * which.x, 0.995, ridge) * pieces * which.z * which.z, ridge)
}

/// What covers the ground at `p` (metres east and north of the site), `shore` metres inland of the open sea's
/// shore and `river` metres from enclosed water (`earth_land.wesl` `cover`).
#[must_use]
pub fn cover(p: Vec2, shore: f32, river: f32, made: &Made) -> Cover {
    let zone = 0.75 * (shore / 400.0).clamp(0.0, 1.0) + 0.25 * (1.0 - smoothstep(150.0, 700.0, river));
    let (swale, _) = ridges(p, shore);
    let (big, mid, small) = (billow(p / 330.0, 31), billow(p / 85.0, 47), grain(p / 22.0, 57));
    let drift = smoothstep(0.35, 0.65, billow(p / 1300.0, 58));
    let opening = smoothstep(0.63, 0.68, big + 0.12 * (mid - 0.5) + 0.06 * (small - 0.5))
        .max(smoothstep(0.65, 0.7, mid + 0.14 * (small - 0.5) + 0.1 * (drift - 0.5)) * (0.4 + 0.6 * drift))
        .max(smoothstep(0.72, 0.78, small + 0.1 * (mid - 0.5)) * drift * 0.8);
    let burn = smoothstep(0.6, 0.7, billow(p / 1700.0 + 5.3, 85) + 0.08 * (big - 0.5));
    let mut woody = 0.95 - 0.8 * opening - 0.3 * swale - 0.25 * burn;
    let mut herb = 0.2 + 0.7 * (1.0 - woody) * (0.75 + 0.35 * grain(p * 0.04, 34));
    let beach = 1.0 - smoothstep(38.0, 48.0, shore);
    let dune = smoothstep(38.0, 48.0, shore) * (1.0 - smoothstep(70.0, 95.0, shore));
    let strand_edge = 160.0 + 140.0 * billow(p / 600.0, 59);
    let strand =
        smoothstep(55.0, 90.0, shore) * (1.0 - smoothstep(strand_edge - 40.0, strand_edge + 40.0, shore));
    woody *= smoothstep(55.0, 110.0, shore) * (1.0 - 0.35 * strand);
    woody = woody.max(dune * 0.5 * smoothstep(0.55, 0.7, grain(p * 0.05, 37)));
    let oats = 0.85 + 0.15 * grain(p * 0.1, 38) - 0.55 * smoothstep(0.62, 0.75, grain(p * 0.03, 39));
    herb = mix(herb, oats, dune) * (1.0 - beach);
    let marsh = 1.0 - smoothstep(20.0, 90.0, river);
    woody = mix(woody, 0.15, marsh);
    herb = mix(herb, 0.8, marsh);
    let mown = 0.82 + 0.4 * (billow(p * 0.06, 41) - 0.5) - 0.5 * smoothstep(0.62, 0.78, grain(p * 0.025, 42));
    woody *= 1.0 - made.cleared;
    herb = mix(herb, mown, made.cleared);
    herb = mix(herb, 0.12 + 0.2 * grain(p * 0.3, 45), made.graded);
    woody *= 1.0 - made.graded;
    let on_way = 1.0 - smoothstep(-0.5, 1.5, made.way);
    let verge = 1.0 - smoothstep(4.0, 12.0 + 8.0 * grain(p * 0.03, 43), made.way);
    woody *= 1.0 - verge;
    herb = mix(herb, 0.45, verge) * (1.0 - on_way);
    let dry = (1.0 - made.built) * smoothstep(0.0, 1.5, shore) * smoothstep(0.0, 1.5, river);
    Cover { woody: woody.clamp(0.0, 1.0) * dry, herb: herb.clamp(0.0, 1.0) * dry, zone, swale, marsh, dune }
}

#[cfg(test)]
mod tests {
    use super::*;

    const WILD: Made = Made { cleared: 0.0, graded: 0.0, built: 0.0, way: 1.0e6 };

    #[test]
    fn the_beach_is_bare_and_the_scrub_is_not() {
        let p = Vec2::new(300.0, -120.0);
        let beach = cover(p, 20.0, 5000.0, &WILD);
        assert!(beach.woody == 0.0 && beach.herb == 0.0);
        // Inland the ground is mostly scrub, with openings: over many points, more than half.
        let mean: f32 = (0..200)
            .map(|i| cover(p + Vec2::new(i as f32 * 37.0, i as f32 * 11.0), 1500.0, 3000.0, &WILD).woody)
            .sum::<f32>()
            / 200.0;
        assert!((0.5..0.95).contains(&mean), "{mean}");
    }

    #[test]
    fn a_clearing_has_no_scrub_and_a_building_nothing() {
        let p = Vec2::new(40.0, 60.0);
        let cleared = cover(p, 1500.0, 3000.0, &Made { cleared: 1.0, ..WILD });
        assert!(cleared.woody == 0.0 && cleared.herb > 0.2);
        let built = cover(p, 1500.0, 3000.0, &Made { built: 1.0, ..WILD });
        assert!(built.woody == 0.0 && built.herb == 0.0);
    }

    #[test]
    fn a_cell_has_one_point_inside_it() {
        let (at, own) = point(IVec2::new(-3, 7), 12);
        assert!((-3.0..-2.0).contains(&at.x) && (7.0..8.0).contains(&at.y) && (0.0..1.0).contains(&own));
    }
}
