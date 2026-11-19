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
}

impl Cover {
    /// How high a closed stand of woody plants grows here, m (`earth_land.wesl` `scrub`).
    #[must_use]
    pub fn height(&self) -> f32 {
        mix(mix(0.9, 2.1, smoothstep(0.12, 0.42, self.zone)), 6.0, smoothstep(0.82, 0.98, self.zone))
    }
}

/// What covers the ground at `p` (metres east and north of the site), `shore` metres inland of the open sea's
/// shore and `river` metres from enclosed water (`earth_land.wesl` `cover`).
#[must_use]
pub fn cover(p: Vec2, shore: f32, river: f32, made: &Made) -> Cover {
    let zone = 0.75 * (shore / 400.0).clamp(0.0, 1.0) + 0.25 * (1.0 - smoothstep(150.0, 700.0, river));
    let wander = 7.0 * (billow(p * 0.004, 35) - 0.5) + 3.0 * (billow(p * 0.013, 46) - 0.5);
    let spacing = 0.057 * (0.82 + 0.36 * billow(p * 0.0009, 48));
    let ridge = (shore * spacing + wander).sin() * 0.5 + 0.5;
    let swale = smoothstep(0.62, 0.95, ridge)
        * smoothstep(0.5, 0.6, billow(p * 0.0035, 36))
        * smoothstep(0.38, 0.62, grain(p * 0.011, 49));
    let opening =
        billow(p * 0.009, 31) + 0.14 * (billow(p * 0.002, 47) - 0.5) + 0.09 * (grain(p * 0.04, 57) - 0.5);
    let mut woody = 0.93 - 0.75 * smoothstep(0.62, 0.74, opening) - 0.3 * swale;
    woody -= 0.25 * smoothstep(0.55, 0.75, grain(p * 0.07, 33));
    let mut herb = 0.2 + 0.7 * (1.0 - woody) * (0.75 + 0.35 * grain(p * 0.04, 34));
    let beach = 1.0 - smoothstep(38.0, 48.0, shore);
    let dune = smoothstep(38.0, 48.0, shore) * (1.0 - smoothstep(70.0, 95.0, shore));
    woody *= smoothstep(55.0, 110.0, shore);
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
    let verge = 1.0 - smoothstep(1.5, 4.5, made.way);
    woody *= 1.0 - verge;
    herb = mix(herb, 0.35, verge) * (1.0 - on_way);
    let dry = (1.0 - made.built) * smoothstep(0.0, 1.5, shore) * smoothstep(0.0, 1.5, river);
    Cover { woody: woody.clamp(0.0, 1.0) * dry, herb: herb.clamp(0.0, 1.0) * dry, zone, swale, marsh }
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
