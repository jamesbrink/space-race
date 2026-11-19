//! What the air does to a body at speed, drawn: the glowing gas a blunt body brings to rest ahead of it as it
//! comes back in ([`Glow`]), and the collar of condensed vapour at a shoulder near the speed of sound
//! ([`Collar`]). The game hangs each on a node of the vehicle and says, from its own figures, how hot and how
//! dense; nothing here knows a flight.

mod collar;
mod glow;
pub mod light;

use bevy::prelude::*;

pub use glow::standoff;

use crate::origin::Place;

/// The shock layer over a blunt shield. Hung at the middle of the shield's rim, its blunt face toward -Y.
#[derive(Component, Debug, Clone, Copy, PartialEq)]
#[require(Transform, Visibility)]
pub struct Glow {
    /// The shield's radius at its rim, m.
    pub rim: f32,
    /// How far the middle of its face stands ahead of the rim, m.
    pub depth: f32,
    /// The face's radius of curvature, m.
    pub nose: f32,
    /// The Mach number of the air it meets.
    pub mach: f32,
    /// How hot the gas behind the shock is, K.
    pub gas: f32,
    /// How much of a black body's light the layer gives through its middle, 0 to 1: none when there is none.
    pub emissivity: f32,
}

/// A collar of vapour round a shoulder. Hung at the middle of the shoulder, the flow coming from +Y.
#[derive(Component, Debug, Clone, Copy, PartialEq)]
#[require(Transform, Visibility)]
pub struct Collar {
    /// The shoulder's radius, m.
    pub radius: f32,
    /// How dense the vapour is, 0 to 1: none when there is none.
    pub density: f32,
}

/// Whether the glow and the collar are drawn at all: an A/B switch, for measuring what they cost a frame.
pub const ON: bool = true;

/// Draws every [`Glow`] and [`Collar`].
pub struct ShockPlugin;

impl Plugin for ShockPlugin {
    fn build(&self, app: &mut App) {
        if !ON {
            return;
        }
        app.add_plugins((
            MaterialPlugin::<glow::GlowMaterial>::default(),
            MaterialPlugin::<collar::CollarMaterial>::default(),
        ))
        .add_systems(Update, (glow::kindle, collar::kindle))
        .add_systems(PostUpdate, (glow::burn, collar::show).before(Place));
    }
}
