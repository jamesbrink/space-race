//! One frame to a file (`--shot`): how a change to the picture is looked at, as `tools/shot.mjs` is for the web
//! build. It waits for every model to arrive and for the frame to settle (the temporal anti-aliasing and the sky's
//! light take some frames), and for the flight's clock to reach `--until` if that was given, writes the PNG and
//! leaves.

use bevy::prelude::*;
use bevy::render::view::screenshot::{Screenshot, ScreenshotCaptured, save_to_disk};
use bevy::world_serialization::WorldInstanceReady;

use crate::Options;
use crate::clock::Clock;
use crate::stage::Cast;

/// Frames drawn after the last model arrives before the frame is taken.
const SETTLE: u32 = 90;

#[derive(Resource, Default)]
struct Progress {
    arrived: usize,
    settled: u32,
    taken: bool,
}

/// Takes the frame `--shot` asked for.
pub struct ShotPlugin;

impl Plugin for ShotPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<Progress>().add_observer(arrived).add_systems(Update, take);
    }
}

fn arrived(ready: On<WorldInstanceReady>, cast: Query<(), With<Cast>>, mut progress: ResMut<Progress>) {
    if cast.contains(ready.entity) {
        progress.arrived += 1;
    }
}

fn take(
    mut commands: Commands,
    options: Res<Options>,
    clock: Res<Clock>,
    cast: Query<(), With<Cast>>,
    mut progress: ResMut<Progress>,
) {
    let Some(path) = &options.shot else { return };
    if progress.taken || progress.arrived < cast.iter().count() {
        return;
    }
    progress.settled += 1;
    if progress.settled > SETTLE && options.until.is_none_or(|until| clock.t >= until) {
        progress.taken = true;
        commands.spawn(Screenshot::primary_window()).observe(save_to_disk(path.clone())).observe(leave);
    }
}

fn leave(_: On<ScreenshotCaptured>, mut exit: MessageWriter<AppExit>) {
    exit.write(AppExit::Success);
}
