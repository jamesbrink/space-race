//! An engine's fire: a volume of glowing gas, shaped by the air it burns in, that lights what is round it and
//! goes out when the engine does.
//!
//! The game puts a [`Plume`] where a nozzle's exit is, pointing down its own -Y, and says how hard it burns, what
//! the air's pressure is and how far down the jet the ground lies; this works the jet's shape ([`jet`]), marches
//! it as a volume (`shaders/plume.wesl`) and hangs the light it throws ([`glare`]). Any motor is drawn by the
//! same rule from its own figures: nothing here knows an engine by name.

mod draw;
mod glare;
pub mod jet;
mod material;

use bevy::prelude::*;

pub use glare::candela;
pub use jet::Nozzle;
use material::PlumeMaterial;

use crate::origin::Place;

/// A motor's fire.
#[derive(Component, Debug, Clone, Copy, PartialEq)]
#[require(Transform, Visibility)]
pub struct Plume {
    /// The nozzle and the gas it passes.
    pub nozzle: Nozzle,
    /// Length of the visible fire in sea-level air at full thrust, m.
    pub length: f32,
    /// Linear colours from the heart out: core, hot, warm, cool, and what is left in a vacuum.
    pub colours: [Vec3; 5],
    /// How bright it is seen through its heart at the exit, cd/m^2.
    pub luminance: f32,
    /// How much of what is behind its heart at the exit it hides, 0 to 1: its soot and its smoke.
    pub hides: f32,
    /// How hard it burns, 0 to 1.
    pub burning: f32,
    /// The pressure of the air it burns in, Pa.
    pub ambient: f32,
    /// How far down the jet the ground it strikes is, m; infinite when there is none.
    pub ground: f32,
}

/// Whether the fires are drawn at all: an A/B switch, for measuring what they cost a frame.
pub const ON: bool = true;

/// Draws every [`Plume`].
pub struct PlumePlugin;

impl Plugin for PlumePlugin {
    fn build(&self, app: &mut App) {
        if !ON {
            return;
        }
        app.add_plugins(MaterialPlugin::<PlumeMaterial>::default())
            .add_systems(Update, draw::kindle)
            .add_systems(PostUpdate, (draw::burn, glare::shine).before(Place));
    }
}
