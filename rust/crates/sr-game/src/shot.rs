//! One frame to a file (`--shot`): how a change to the picture is looked at, as `tools/shot.mjs` is for the web
//! build. It waits for every model to arrive and for the frame to settle (the temporal anti-aliasing and the sky's
//! light take some frames), and for the flight's clock to reach `--until` if that was given, writes the PNG and
//! leaves.
//!
//! A window the system is not showing (behind another, on another desktop) is not drawn at all, and its capture
//! comes back black to the last pixel, the readout too: no picture is ever wholly black. So the window is kept on
//! top while it is shooting, and a capture with nothing in it is taken again, a few times, before giving up.

use bevy::prelude::*;
use bevy::render::view::screenshot::{Screenshot, ScreenshotCaptured, save_to_disk};
use bevy::world_serialization::WorldInstanceReady;

use crate::Options;
use crate::clock::Clock;
use crate::stage::Cast;

/// Frames drawn after the last model arrives before the frame is taken, and before it is taken again when a
/// capture came back empty; and how many times it is tried.
const SETTLE: u32 = 90;
const AGAIN: u32 = 30;
const TRIES: u32 = 6;

#[derive(Resource, Default)]
struct Progress {
    arrived: usize,
    settled: u32,
    taken: bool,
    tries: u32,
}

/// Takes the frame `--shot` asked for.
pub struct ShotPlugin;

impl Plugin for ShotPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<Progress>().add_observer(arrived).add_systems(Update, (take, unseen));
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

/// Says when the system stops showing the window: a frame taken then would be empty.
fn unseen(mut occluded: MessageReader<bevy::window::WindowOccluded>) {
    for change in occluded.read() {
        if change.occluded {
            warn!("shot: the window is not being shown; a frame taken now comes back empty");
        }
    }
}

/// Leaves once a frame with something in it is written; an empty one is taken again.
fn leave(captured: On<ScreenshotCaptured>, mut progress: ResMut<Progress>, mut exit: MessageWriter<AppExit>) {
    let empty = captured.image.data.as_ref().is_some_and(|bytes| bytes.iter().all(|&byte| byte == 0));
    if !empty {
        exit.write(AppExit::Success);
        return;
    }
    progress.tries += 1;
    if progress.tries >= TRIES {
        error!("shot: every capture came back empty: the window was never shown");
        exit.write(AppExit::error());
        return;
    }
    warn!("shot: the capture came back empty; taking it again");
    (progress.taken, progress.settled) = (false, SETTLE - AGAIN);
}
