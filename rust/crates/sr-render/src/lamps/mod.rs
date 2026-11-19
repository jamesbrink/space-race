//! The pad's lamps: every floodlight a model draws becomes a light after dark (the web build's `lamps.ts`).
//!
//! A model draws a lamp's lens in the material `lamp` (a flood or a work lamp) or `lamp-flood-search` (a
//! searchlight). The lenses of one fitting (the floods on a crossarm) are found by where their vertices gather, and
//! each fitting is one spot light, aimed the way its lenses face, hung on the mesh so it follows hardware that moves.
//! With it go its beam in the air ([`beam`]), the glare of its head seen from the eye ([`glare`]) and its lens's
//! glow. They are lit as the Sun goes ([`crate::night::Dusk::lamps`]) and cost nothing by day.

mod beam;
mod find;
mod glare;
mod shine;

use bevy::prelude::*;

/// What kind of lamp a fitting is, and so how strong and how wide.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    /// A bank of floodlights on a pole's crossarm or a screen.
    Flood,
    /// A carbon-arc searchlight on its trailer.
    Search,
    /// A work lamp on a structure or a truck.
    Work,
}

impl Kind {
    /// Luminous intensity along the beam, cd. Estimated: what lit the pad is not recorded. A bank is three 1,500 W
    /// floods of some hundred thousand candela each (the web build's `FLOOD_CANDELA`); a 60-inch carbon-arc
    /// searchlight is near a billion candela in its own 1.25-degree beam, which crews spread to flood a vehicle: it
    /// is drawn at six floods' worth over the narrowest beam the web build draws (`STRONGEST`, `MIN_BEAM`); a work
    /// lamp a tenth of a flood.
    #[must_use]
    pub fn candela(self) -> f32 {
        match self {
            Self::Flood => 3.0e5,
            Self::Search => 6.0e5,
            Self::Work => 1.0e4,
        }
    }

    /// Half the beam, out to where it has gone and where it is still whole, radians: a flood's beam is wide and
    /// soft-edged (48 degrees across: the web build's `SPREAD`); a searchlight's 7 at the least; a work lamp wider.
    #[must_use]
    pub fn cone(self) -> (f32, f32) {
        match self {
            Self::Flood => (24f32.to_radians(), 12f32.to_radians()),
            Self::Search => (3.5f32.to_radians(), 2.0f32.to_radians()),
            Self::Work => (55f32.to_radians(), 30f32.to_radians()),
        }
    }

    /// The light's colour. A flood: incandescent, about 3,200 K (`stars::colour` of B-V 1.2), the warm thing in the
    /// night; the web build's floods are drawn as warm (0xffe2b0). A searchlight: a carbon arc, about 5,500 K.
    /// Estimated, both: the lamps' kind is not recorded (the web build's warm-up time takes them as mercury-vapour,
    /// which would be a cold blue-green).
    #[must_use]
    pub fn colour(self) -> Color {
        let b_v = if self == Self::Search { 0.55 } else { 1.2 };
        let [r, g, b] = sr_world::stars::colour(b_v);
        let peak = r.max(g).max(b);
        Color::linear_rgb((r / peak) as f32, (g / peak) as f32, (b / peak) as f32)
    }

    /// How far its light is worked, m.
    #[must_use]
    pub fn range(self) -> f32 {
        match self {
            Self::Flood => 180.0,
            Self::Search => 400.0,
            Self::Work => 40.0,
        }
    }
}

/// A lamp's light: hung on its lens's mesh at the fitting, looking the way it shines.
#[derive(Component, Debug, Clone, Copy)]
pub struct Lamp {
    /// What it is.
    pub kind: Kind,
}

/// A lens that glows when its lamp is lit: its material, and the glow the model gave it, which it keeps by day.
#[derive(Component, Debug, Clone)]
struct Lens(Handle<StandardMaterial>, LinearRgba);

/// The lamps.
pub struct LampsPlugin;

impl Plugin for LampsPlugin {
    fn build(&self, app: &mut App) {
        app.add_observer(find::fittings);
        beam::build(app);
        glare::build(app);
        shine::build(app);
    }
}
