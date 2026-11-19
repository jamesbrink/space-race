//! The print: the last thing done to a developed frame, after the tone curve, as a film's print is made from its
//! negative. Colour held back, the shade toned one way and the light another, the darks pressed down on a black
//! that is not quite black, the corners let go, and grain: finest in the middle greys, different every frame.
//! The grade ([`crate::look`]) says how much of each.

use bevy::core_pipeline::Core3dSystems;
use bevy::core_pipeline::fullscreen_material::{FullscreenMaterial, FullscreenMaterialPlugin};
use bevy::core_pipeline::tonemapping::tonemapping;
use bevy::ecs::schedule::ScheduleConfigs;
use bevy::ecs::system::BoxedSystem;
use bevy::prelude::*;
use bevy::render::RenderApp;
use bevy::render::extract_component::ExtractComponent;
use bevy::render::render_resource::ShaderType;
use bevy::shader::ShaderRef;

/// How an eye's frames are printed. Everything is in the screen's own coding, where equal steps look equal.
#[derive(Component, ExtractComponent, ShaderType, Debug, Clone, Copy, PartialEq)]
#[extract_app(RenderApp)]
pub struct Print {
    /// What the shade is toned toward, and how strongly (alpha): a colour laid over the darks as a soft light.
    pub shade: Vec4,
    /// What the light is toned toward, and how strongly (alpha).
    pub light: Vec4,
    /// How much of its colour the frame keeps: 1 all of it, 0 none.
    pub colour: f32,
    /// How hard the middle is pulled apart, about `pivot`: 0 leaves the frame as it was; 6 is a hard print.
    pub contrast: f32,
    /// The grey the contrast turns about.
    pub pivot: f32,
    /// How far the black is lifted off black.
    pub lift: f32,
    /// How bright the corners are left, against 1 in the middle, and how tight the darkening is drawn in (1 is
    /// even from the middle out; less keeps the middle clear).
    pub corners: f32,
    /// As `corners`.
    pub falloff: f32,
    /// How strong the grain is, as a fraction of the screen's range at middle grey: film is 0.02 to 0.06.
    pub grain: f32,
    /// Which frame this is: the grain's seed. Kept by this module.
    pub frame: f32,
}

impl Print {
    /// The frame as it was developed: nothing done.
    pub const STRAIGHT: Self = Self {
        shade: Vec4::ZERO,
        light: Vec4::ZERO,
        colour: 1.0,
        contrast: 0.0,
        pivot: 0.5,
        lift: 0.0,
        corners: 1.0,
        falloff: 1.0,
        grain: 0.0,
        frame: 0.0,
    };
}

impl Default for Print {
    fn default() -> Self {
        Self::STRAIGHT
    }
}

impl FullscreenMaterial for Print {
    fn fragment_shader() -> ShaderRef {
        "shaders/print.wesl".into()
    }

    /// After the tone curve: this is the print, not the scene.
    fn schedule_configs(system: ScheduleConfigs<BoxedSystem>) -> ScheduleConfigs<BoxedSystem> {
        system.in_set(Core3dSystems::PostProcess).after(tonemapping)
    }
}

/// Prints the frames of any eye that carries a [`Print`].
pub struct PrintPlugin;

impl Plugin for PrintPlugin {
    fn build(&self, app: &mut App) {
        app.add_plugins(FullscreenMaterialPlugin::<Print>::default()).add_systems(Update, roll);
    }
}

/// A new seed each frame, round and round: the numbers stay small enough for the shader's arithmetic.
fn roll(mut prints: Query<&mut Print>) {
    for mut print in &mut prints {
        print.frame = (print.frame + 1.0) % 1024.0;
    }
}
