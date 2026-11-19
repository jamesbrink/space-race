//! The grade: how a finished frame is developed and printed. One place, named looks, flipped with a key by the
//! game.
//!
//! `Film` is the art direction, chosen by the owner from mock-ups set beside stills of Operation Flashpoint:
//! Dragon Rising: a hard, bleached print. The colour is held far back; the shade is toned teal and the light
//! cream; the darks are pressed down under a sky that glows and blooms into whatever stands against it; the
//! corners are let go; and it has grain.
//! `Reference` is the same frame developed straight, for judging colours against a source.
//!
//! Every figure here is a judgement of the eye, set against those stills (`rust/docs/look.md`): none is measured.

use bevy::core_pipeline::tonemapping::Tonemapping;
use bevy::post_process::bloom::{Bloom, BloomCompositeMode, BloomPrefilter};
use bevy::prelude::*;
use bevy::render::view::{ColorGrading, ColorGradingGlobal};

use crate::origin::Eye;
use crate::print::Print;

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
    print: Print,
}

/// The film's print: the arithmetic of the owner's chosen mock-up ("A: Skira", made with `ImageMagick` from a
/// frame of this build beside stills of Operation Flashpoint: Dragon Rising), done to every frame: exposure down to
/// four fifths, colour to 0.42, a sigmoidal contrast of 7 about 52 per cent grey, the grey mapped from deep teal
/// to warm cream and laid over as a soft light, the corners darkened to 0.35 along a 0.6 power, and grain.
const FILM: Print = Print {
    shade: Vec4::new(0.02, 0.165, 0.2, 1.0),
    light: Vec4::new(1.0, 0.894, 0.69, 0.0),
    colour: 0.42,
    contrast: 7.0,
    pivot: 0.52,
    gain: 0.8,
    corners: 0.35,
    falloff: 0.6,
    grain: 0.05,
    frame: 0.0,
};

fn recipe(look: Look) -> Recipe {
    match look {
        Look::Reference => Recipe {
            curve: Tonemapping::AcesFitted,
            grading: ColorGrading::default(),
            bloom: Bloom { intensity: 0.08, ..Bloom::NATURAL },
            print: Print::STRAIGHT,
        },
        Look::Film => Recipe {
            curve: Tonemapping::AcesFitted,
            // (the print does the grading; the negative is developed straight)
            grading: ColorGrading { global: ColorGradingGlobal { exposure: 0.0, ..default() }, ..default() },
            // The sky's glow: wide, and laid over the frame, so a bright sky spills round the edge of whatever
            // stands against it and the Sun, the flame and a glint on the sea burn.
            bloom: Bloom {
                intensity: 0.38,
                low_frequency_boost: 0.85,
                low_frequency_boost_curvature: 0.9,
                prefilter: BloomPrefilter { threshold: 0.85, threshold_softness: 0.7 },
                composite_mode: BloomCompositeMode::Additive,
                ..Bloom::NATURAL
            },
            print: FILM,
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
        commands.entity(eye).insert((made.curve, made.grading.clone(), made.bloom.clone(), made.print));
    }
}
