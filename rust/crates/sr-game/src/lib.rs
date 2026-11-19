//! The game: a flight flown as rigid bodies, the clock, the cameras and the readout.
//!
//! One module to a thing; this file only wires them. What is drawn is `sr-render`'s, what is flown is `sr-sim`'s
//! and what flight it is comes from `sr-missions`: nothing here names a flight.

pub mod bench;
pub mod clock;
pub mod curtain;
pub mod debrief;
pub mod diag;
pub mod flight;
pub mod hud;
pub mod navball;
pub mod opening;
pub mod options;
pub mod pad;
pub mod path;
pub mod rig;
pub mod script;
pub mod shake;
pub mod shot;
pub mod sound;
pub mod stage;

use std::path::PathBuf;

use bevy::asset::io::AssetSourceBuilder;
use bevy::prelude::*;
use bevy::window::{ExitCondition, WindowResolution};
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

/// With this set in the environment the frames are not held to the screen's refresh, so that `--bench` says what
/// a frame costs rather than how many refreshes it waited for: a measuring switch, never for play (it tears).
const UNCAPPED: &str = "SR_UNCAPPED";

/// Open the window on a flight and run until it is closed.
#[must_use]
pub fn run(options: Options) -> AppExit {
    let Some(flight) = sr_missions::flights().into_iter().next() else { return AppExit::error() };
    let window = Window {
        title: format!("Space Race · {}", flight.name),
        resolution: WindowResolution::new(options.size.0, options.size.1),
        present_mode: if std::env::var_os(UNCAPPED).is_some() {
            bevy::window::PresentMode::AutoNoVsync
        } else {
            bevy::window::PresentMode::default()
        },
        // (a frame measured is drawn only while the window is shown: keep it in front)
        window_level: if options.bench {
            bevy::window::WindowLevel::AlwaysOnTop
        } else {
            bevy::window::WindowLevel::Normal
        },
        ..default()
    };
    // Frames for files are drawn into an image of their own with no window: nothing on the desktop, and they can
    // be taken on a machine with no screen at all (`shot::offscreen`).
    let offscreen = shot::offscreen(&options);
    let plugins = DefaultPlugins
        .set(AssetPlugin { file_path: assets().to_string_lossy().into_owned(), ..default() })
        .set(WindowPlugin {
            primary_window: if offscreen { None } else { Some(window) },
            exit_condition: if offscreen { ExitCondition::DontExit } else { ExitCondition::OnAllClosed },
            ..default()
        });
    let mut app = App::new();
    app.register_asset_source(
        "globe",
        AssetSourceBuilder::platform_default(&globe().to_string_lossy(), None),
    );
    if offscreen {
        app.add_plugins(plugins.disable::<bevy::winit::WinitPlugin>())
            .add_plugins(bevy::app::ScheduleRunnerPlugin::run_loop(std::time::Duration::ZERO));
    } else {
        app.add_plugins(plugins);
    }
    app.insert_resource(Showing(flight))
        .insert_resource(stage::sky(flight, 0.0))
        .insert_resource(stage::ground(flight))
        .insert_resource(stage::marks(flight))
        .insert_resource(stage::air(flight, 0.0))
        .insert_resource(if options.reference { Look::Reference } else { Look::Film })
        .insert_resource(options)
        .add_plugins((RenderPlugins, clock::ClockPlugin, stage::StagePlugin, flight::FlightPlugin))
        .add_plugins((navball::NavballPlugin, shake::ShakePlugin, path::PathPlugin))
        .add_plugins(sound::SoundPlugin)
        .add_plugins((pad::PadPlugin, curtain::CurtainPlugin, opening::OpeningPlugin))
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
