//! The grade: how a finished frame is developed. One place, named looks, flipped with a key by the game.
//!
//! `Film` is the art direction: the naturalistic daylight of Arma 3 printed the way Operation Flashpoint: Dragon
//! Rising printed its island, a little bleached, cool in the shade and warm in the light, as 1961's film stock was.
//! `Reference` is the same frame developed straight, for judging colours against a source.

use bevy::core_pipeline::tonemapping::Tonemapping;
use bevy::post_process::bloom::Bloom;
use bevy::post_process::effect_stack::Vignette;
use bevy::prelude::*;
use bevy::render::view::{ColorGrading, ColorGradingGlobal, ColorGradingSection};

use crate::origin::Eye;

/// A way of developing the frame.
#[derive(Resource, Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Look {
    /// The game's own.
    #[default]
    Film,
    /// Straight, for checking.
    Reference,
}

impl Look {
    /// The other one.
    #[must_use]
    pub fn next(self) -> Self {
        match self {
            Self::Film => Self::Reference,
            Self::Reference => Self::Film,
        }
    }

    /// What it is called on the screen.
    #[must_use]
    pub fn name(self) -> &'static str {
        match self {
            Self::Film => "Film",
            Self::Reference => "Reference",
        }
    }
}

/// What a look is made of.
struct Recipe {
    curve: Tonemapping,
    grading: ColorGrading,
    bloom: Bloom,
    vignette: Vignette,
}

fn recipe(look: Look) -> Recipe {
    match look {
        Look::Reference => Recipe {
            curve: Tonemapping::AcesFitted,
            grading: ColorGrading::default(),
            bloom: Bloom { intensity: 0.08, ..Bloom::NATURAL },
            vignette: Vignette { intensity: 0.0, ..default() },
        },
        // A print, not a transparency: the shade a little thin and cool, the light a little warm, the colours
        // held back from their brightest, and the corners let go.
        Look::Film => Recipe {
            curve: Tonemapping::AcesFitted,
            grading: ColorGrading {
                global: ColorGradingGlobal { post_saturation: 0.86, ..default() },
                shadows: ColorGradingSection { saturation: 0.82, contrast: 1.04, gain: 1.03, ..default() },
                midtones: ColorGradingSection { saturation: 0.96, contrast: 1.05, ..default() },
                highlights: ColorGradingSection { saturation: 0.9, ..default() },
            },
            bloom: Bloom { intensity: 0.12, ..Bloom::NATURAL },
            vignette: Vignette { intensity: 0.3, radius: 0.92, smoothness: 0.75, ..default() },
        },
    }
}

/// Lays the chosen look on the eye whenever it changes.
pub struct LookPlugin;

impl Plugin for LookPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<Look>().add_systems(Update, develop);
    }
}

fn develop(
    look: Res<Look>,
    eyes: Query<Entity, With<Eye>>,
    new: Query<(), Added<Eye>>,
    mut commands: Commands,
) {
    if !look.is_changed() && new.is_empty() {
        return;
    }
    let made = recipe(*look);
    for eye in &eyes {
        commands.entity(eye).insert((
            made.curve,
            made.grading.clone(),
            made.bloom.clone(),
            made.vignette.clone(),
        ));
    }
}
