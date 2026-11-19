//! The plants' forms, as the look asks (AGENTS.md, "Designed, not photographic"): a shrub is one clean mound,
//! a saw palmetto a handful of fans on their stalks, a cabbage palm a trunk and a head of arched fronds, a tuft of
//! grass four blades. Few faces, a strong outline, no leaf cards. Many are gathered into one mesh, each vertex
//! carrying its own colour. Every proportion is estimated from photographs of the Cape's scrub.

use std::f32::consts::TAU;

use bevy::asset::RenderAssetUsages;
use bevy::mesh::{Indices, PrimitiveTopology};
use bevy::prelude::*;

/// A cabbage palm's trunk, linear: grey-brown bark. Estimated.
const BARK: Vec3 = Vec3::new(0.13, 0.11, 0.085);

/// A number in [0, 1) from a plant's own and which part of it is asked about.
fn part(own: f32, which: u32) -> f32 {
    (own * 61.7 + which as f32 * 0.618_034).fract()
}

/// Plants, gathered into one mesh.
#[derive(Default)]
pub struct Forms {
    positions: Vec<[f32; 3]>,
    normals: Vec<[f32; 3]>,
    colours: Vec<[f32; 4]>,
    /// Each vertex's height above its plant's foot (m) and its plant's own number, for the wind
    /// (`shaders/earth_sway.wesl`).
    sway: Vec<[f32; 2]>,
    indices: Vec<u32>,
    /// Whether the plants are for seeing from far off only, with fewer faces.
    pub coarse: bool,
    /// The foot and own number of the plant being built.
    foot: Vec3,
    own: f32,
}

impl Forms {
    fn vertex(&mut self, at: Vec3, normal: Vec3, colour: Vec3) -> u32 {
        self.positions.push(at.to_array());
        self.normals.push(normal.normalize_or(Vec3::Y).to_array());
        self.colours.push(colour.extend(1.0).to_array());
        self.sway.push([(at.y - self.foot.y).max(0.0), self.own]);
        (self.positions.len() - 1) as u32
    }

    /// Begins a plant standing at `foot`.
    fn begin(&mut self, foot: Vec3, own: f32) {
        self.foot = foot;
        self.own = own;
    }

    /// Whether nothing has been planted.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.indices.is_empty()
    }

    /// A shrub: a mound `radius` across its widest and `height` high, widest below its middle, its outline broken
    /// into lobes (a crown is several clumps of leaves, not one ball) and its sides rounded, not faceted.
    pub fn mound(&mut self, foot: Vec3, radius: f32, height: f32, leaf: Vec3, own: f32) {
        const FINE: [(f32, f32); 5] = [(0.0, 0.78), (0.22, 0.98), (0.48, 1.0), (0.72, 0.82), (0.9, 0.48)];
        const COARSE: [(f32, f32); 3] = [(0.0, 0.8), (0.45, 1.0), (0.85, 0.55)];
        // (seen only from far off, a shrub is a third of the faces)
        let (sides, rings): (u32, &[(f32, f32)]) = if self.coarse { (6, &COARSE) } else { (11, &FINE) };
        self.begin(foot, own);
        let heart = foot + Vec3::Y * (0.3 * height);
        let first = self.positions.len() as u32;
        // (three to five lobes round it, each its own size)
        let lobes = 3.0 + (part(own, 60) * 3.0).floor();
        for (ring, &(up, out)) in rings.iter().enumerate() {
            for side in 0..sides {
                let n = ring as u32 * sides + side;
                let angle = TAU * (side as f32 + 0.5 * ring as f32 + part(own, 0)) / sides as f32;
                let lobe = 0.86 + 0.2 * (angle * lobes + part(own, 61) * TAU).sin();
                let reach = radius * out * lobe * (0.9 + 0.2 * part(own, n + 1));
                let lift = up * height * (0.9 + 0.2 * part(own, n + 20)) * (0.92 + 0.12 * lobe);
                let at = foot + Vec3::new(angle.cos() * reach, lift, angle.sin() * reach);
                // (a crown is leaves, not a ball: its sides take nearly the light its top does)
                let facing = (at - heart).normalize_or(Vec3::Y) + Vec3::Y * 1.2;
                self.vertex(
                    at,
                    facing,
                    leaf * (0.7 + 0.5 * up.powf(0.7)) * (0.88 + 0.24 * part(own, n + 40)),
                );
            }
        }
        let top = self.vertex(foot + Vec3::Y * height, Vec3::Y, leaf * 1.2);
        let last = rings.len() as u32 - 1;
        for ring in 0..last {
            for side in 0..sides {
                let (a, b) = (first + ring * sides + side, first + ring * sides + (side + 1) % sides);
                self.indices.extend([a, a + sides, b, b, a + sides, b + sides]);
            }
        }
        for side in 0..sides {
            self.indices.extend([
                first + last * sides + side,
                top,
                first + last * sides + (side + 1) % sides,
            ]);
        }
    }

    /// A saw palmetto: five to seven fans, each a pleated half-disc on the end of its stalk, leaning out.
    pub fn fans(&mut self, foot: Vec3, radius: f32, height: f32, leaf: Vec3, own: f32) {
        const RIM: u32 = 7;
        self.begin(foot, own);
        let fans = 5 + (part(own, 0) * 3.0) as u32;
        for fan in 0..fans {
            let angle = TAU * (fan as f32 + part(own, fan + 1)) / fans as f32;
            let lean = 0.3 + 0.75 * part(own, fan + 11);
            let out = Vec3::new(angle.cos(), 0.0, angle.sin());
            let stalk = out * lean.sin() + Vec3::Y * lean.cos();
            let across = Vec3::new(-angle.sin(), 0.0, angle.cos());
            let hub = foot + stalk * (height * (0.5 + 0.4 * part(own, fan + 21)));
            let blade = radius * (0.42 + 0.2 * part(own, fan + 31));
            let face = stalk.cross(across) + Vec3::Y * 0.6;
            let tone = leaf * (0.85 + 0.4 * part(own, fan + 41));
            // (its stalk, a thin blade of its own from the foot)
            let stem = self.vertex(foot - across * 0.012, face, tone * 0.5);
            self.vertex(foot + across * 0.012, face, tone * 0.5);
            self.indices.extend([stem, stem + 1, stem + 2]);
            let centre = self.vertex(hub, face, tone * 0.75);
            for point in 0..RIM {
                let sweep = (point as f32 / (RIM - 1) as f32 - 0.5) * 3.4;
                // (pleated: every other point of the rim is drawn in)
                let reach = blade * if point % 2 == 0 { 1.0 } else { 0.72 };
                self.vertex(hub + (stalk * sweep.cos() + across * sweep.sin()) * reach, face, tone);
            }
            for point in 0..RIM - 1 {
                self.indices.extend([centre, centre + 1 + point, centre + 2 + point]);
            }
        }
    }

    /// A cabbage palm: a straight trunk, and a head of nine fronds arching out and down from its top.
    pub fn palm(&mut self, foot: Vec3, height: f32, leaf: Vec3, own: f32) {
        const SIDES: u32 = 5;
        self.begin(foot, own);
        let first = self.positions.len() as u32;
        for (up, girth) in [(0.0, 0.2), (height, 0.15)] {
            for side in 0..SIDES {
                let angle = TAU * side as f32 / SIDES as f32;
                let out = Vec3::new(angle.cos(), 0.0, angle.sin());
                self.vertex(foot + out * girth + Vec3::Y * up, out, BARK * (0.8 + 0.4 * part(own, side)));
            }
        }
        for side in 0..SIDES {
            let (a, b) = (first + side, first + (side + 1) % SIDES);
            self.indices.extend([a, a + SIDES, b, b, a + SIDES, b + SIDES]);
        }
        let head = foot + Vec3::Y * height;
        let reach = 1.2 + 0.08 * height;
        for frond in 0..9 {
            let angle = TAU * (frond as f32 + part(own, frond + 7)) / 9.0;
            let out = Vec3::new(angle.cos(), 0.0, angle.sin());
            let across = Vec3::new(-angle.sin(), 0.0, angle.cos());
            let lift = 0.2 + 0.9 * part(own, frond + 17);
            let start = self.positions.len() as u32;
            for (along, width) in [(0.0_f32, 0.12), (0.55, 0.5), (1.0, 0.22)] {
                // (it rises from the head, arches over and hangs)
                let spine =
                    head + out * (reach * along) + Vec3::Y * (reach * (lift * along - 0.75 * along * along));
                let slope = Vec3::Y - out * (lift - 1.5 * along);
                let tone = leaf * (0.7 + 0.4 * along) * (0.85 + 0.3 * part(own, frond + 27));
                self.vertex(spine - across * (width * reach * 0.5), slope, tone);
                self.vertex(spine + across * (width * reach * 0.5), slope, tone);
            }
            for strip in 0..2 {
                let a = start + 2 * strip;
                self.indices.extend([a, a + 2, a + 1, a + 1, a + 2, a + 3]);
            }
        }
    }

    /// A tuft of grass: `blades` blades from one foot, each leaning its own way and its own height, the taller
    /// ones bent over at their middle, their tips paler and drier than their bases; now and then a seed stalk
    /// standing above the rest.
    pub fn tuft(&mut self, foot: Vec3, radius: f32, height: f32, colour: Vec3, own: f32, blades: u32) {
        self.begin(foot, own);
        for blade in 0..blades {
            let angle = TAU * (blade as f32 + part(own, blade)) / blades as f32;
            let out = Vec3::new(angle.cos(), 0.0, angle.sin());
            let across = Vec3::new(-angle.sin(), 0.0, angle.cos())
                * (0.2 * radius * (0.7 + 0.6 * part(own, blade + 3)));
            let stalk = part(own, blade + 30) < 0.08;
            let tall = height * if stalk { 1.9 } else { 0.5 + 0.8 * part(own, blade + 13) };
            let lean = radius * (0.4 + 0.9 * part(own, blade + 5)) * if stalk { 0.3 } else { 1.0 };
            let base = foot + out * (0.2 * radius);
            // (it rises, then bends over toward its tip: the more, the taller it is)
            let mid = base + out * (lean * 0.35) + Vec3::Y * (tall * 0.6);
            let tip = base + out * lean + Vec3::Y * (tall * (0.75 + 0.2 * part(own, blade + 17)));
            // (lit as the ground it stands on is, whichever side is seen: a blade does not flash or go black)
            let tone = colour * (0.8 + 0.4 * part(own, blade + 9));
            let dry = tone.lerp(Vec3::new(0.45, 0.42, 0.25), 0.35 + 0.3 * part(own, blade + 21));
            let a = self.vertex(base - across, Vec3::Y, tone * 0.75);
            self.vertex(base + across, Vec3::Y, tone * 0.75);
            self.vertex(mid - across * 0.6, Vec3::Y, tone);
            self.vertex(mid + across * 0.6, Vec3::Y, tone);
            self.vertex(tip, Vec3::Y, dry * 1.15);
            self.indices.extend([a, a + 2, a + 1, a + 1, a + 2, a + 3, a + 2, a + 4, a + 3]);
        }
    }

    /// The mesh of everything planted, in a square whose corner is `corner` (metres east and north of the site),
    /// `east` and `north` the compass in the site's frame: each vertex carries its own place as its texture
    /// coordinate, by which the plants' shader finds the clouds' shadows on it.
    #[must_use]
    pub fn mesh(self, corner: Vec2, east: Vec3, north: Vec3) -> Mesh {
        let places: Vec<[f32; 2]> = self
            .positions
            .iter()
            .map(|p| {
                (corner + Vec2::new(Vec3::from_array(*p).dot(east), Vec3::from_array(*p).dot(north)))
                    .to_array()
            })
            .collect();
        Mesh::new(PrimitiveTopology::TriangleList, RenderAssetUsages::RENDER_WORLD)
            .with_inserted_attribute(Mesh::ATTRIBUTE_UV_0, places)
            .with_inserted_attribute(Mesh::ATTRIBUTE_UV_1, self.sway)
            .with_inserted_attribute(Mesh::ATTRIBUTE_POSITION, self.positions)
            .with_inserted_attribute(Mesh::ATTRIBUTE_NORMAL, self.normals)
            .with_inserted_attribute(Mesh::ATTRIBUTE_COLOR, self.colours)
            .with_inserted_indices(Indices::U32(self.indices))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn each_form_stands_on_its_foot_and_closes_its_faces() {
        let foot = Vec3::new(3.0, 0.0, -2.0);
        let mut forms = Forms::default();
        forms.mound(foot, 1.5, 2.0, Vec3::ONE, 0.37);
        forms.fans(foot, 1.2, 1.4, Vec3::ONE, 0.81);
        forms.palm(foot, 6.0, Vec3::ONE, 0.12);
        forms.tuft(foot, 0.2, 0.3, Vec3::ONE, 0.55, 5);
        assert_eq!(forms.indices.len() % 3, 0);
        assert!(forms.indices.iter().all(|i| (*i as usize) < forms.positions.len()));
        let lowest = forms.positions.iter().map(|p| p[1]).fold(f32::MAX, f32::min);
        let highest = forms.positions.iter().map(|p| p[1]).fold(f32::MIN, f32::max);
        assert!(lowest >= -1e-4 && (6.0..8.5).contains(&highest), "{lowest} to {highest}");
    }
}
