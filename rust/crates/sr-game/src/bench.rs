//! What a frame costs (`--bench`): once a second, the mean time of the frames in it and the rate that makes.

use bevy::diagnostic::{Diagnostic, DiagnosticsStore, FrameTimeDiagnosticsPlugin};
use bevy::prelude::*;

use crate::Options;
use crate::clock::Clock;

/// Says what `diag` measures; nothing unless `--bench` asked.
pub struct BenchPlugin;

impl Plugin for BenchPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Update, say);
    }
}

fn say(
    options: Res<Options>,
    clock: Res<Clock>,
    time: Res<Time<Real>>,
    diagnostics: Res<DiagnosticsStore>,
    windows: Query<&Window>,
    mut said: Local<f32>,
) {
    if !options.bench || time.elapsed_secs() - *said < 1.0 {
        return;
    }
    *said = time.elapsed_secs();
    let Some(frame) = diagnostics.get(&FrameTimeDiagnosticsPlugin::FRAME_TIME).and_then(Diagnostic::smoothed)
    else {
        return;
    };
    let size = windows.single().map_or((0, 0), |w| (w.physical_width(), w.physical_height()));
    info!(
        "bench: T{:+.0} s, {frame:.2} ms a frame, {:.0} a second, at {} x {}",
        clock.t,
        1000.0 / frame,
        size.0,
        size.1
    );
}
