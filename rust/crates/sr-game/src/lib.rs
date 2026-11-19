//! The game: a flight flown as rigid bodies, the clock, the cameras and the readout.
//!
//! One module to a thing; this file only wires them. What is drawn is `sr-render`'s, what is flown is `sr-sim`'s
//! and what flight it is comes from `sr-missions`: nothing here names a flight.

pub mod bench;
pub mod clock;
pub mod debrief;
pub mod diag;
pub mod flight;
pub mod hud;
pub mod navball;
pub mod options;
pub mod rig;
pub mod script;
pub mod shot;
pub mod stage;

use std::path::PathBuf;

use bevy::asset::io::AssetSourceBuilder;
use bevy::prelude::*;
use bevy::window::WindowResolution;
use sr_missions::Flight;
use sr_render::RenderPlugins;
use sr_render::look::Look;

pub use bevy::app::AppExit;
pub use options::Options;

/// The flight being shown.
#[derive(Resource, Clone, Copy)]
pub struct Showing(pub &'static Flight);

/// `rust/assets`: the shaders and the unpacked models. `SR_ASSETS` moves it, for a build that is installed.
fn assets() -> PathBuf {
    std::env::var_os("SR_ASSETS")
        .map_or_else(|| PathBuf::from(concat!(env!("CARGO_MANIFEST_DIR"), "/../../assets")), PathBuf::from)
}

/// `public/globe`: the Earth's maps, read where the web build keeps them.
fn globe() -> PathBuf {
    std::env::var_os("SR_GLOBE").map_or_else(
        || PathBuf::from(concat!(env!("CARGO_MANIFEST_DIR"), "/../../../public/globe")),
        PathBuf::from,
    )
}

/// Open the window on a flight and run until it is closed.
#[must_use]
pub fn run(options: Options) -> AppExit {
    let Some(flight) = sr_missions::flights().into_iter().next() else { return AppExit::error() };
    let window = Window {
        title: format!("Space Race · {}", flight.name),
        resolution: WindowResolution::new(options.size.0, options.size.1),
        ..default()
    };
    App::new()
        .register_asset_source(
            "globe",
            AssetSourceBuilder::platform_default(&globe().to_string_lossy(), None),
        )
        .add_plugins(
            DefaultPlugins
                .set(AssetPlugin { file_path: assets().to_string_lossy().into_owned(), ..default() })
                .set(WindowPlugin { primary_window: Some(window), ..default() }),
        )
        .insert_resource(Showing(flight))
        .insert_resource(stage::sky(flight, 0.0))
        .insert_resource(stage::ground(flight))
        .insert_resource(stage::air(flight, 0.0))
        .insert_resource(if options.reference { Look::Reference } else { Look::Film })
        .insert_resource(options)
        .add_plugins((RenderPlugins, clock::ClockPlugin, stage::StagePlugin, flight::FlightPlugin))
        .add_plugins(navball::NavballPlugin)
        .add_plugins((
            rig::RigPlugin,
            hud::HudPlugin,
            diag::DiagPlugin,
            script::ScriptPlugin,
            shot::ShotPlugin,
            bench::BenchPlugin,
        ))
        .run()
}
