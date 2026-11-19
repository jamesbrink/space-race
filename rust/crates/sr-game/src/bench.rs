//! What a frame costs (`--bench`): once a second, the mean time of the frames in it, the rate that makes, the
//! slowest frame in it, and the size of what is drawn in the screen's own pixels (the window's size is asked for
//! in points, which a Retina screen doubles).

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

/// What `say` remembers between seconds: when it last spoke, and the slowest frame since, s.
#[derive(Default)]
struct Kept {
    said: f32,
    worst: f32,
}

fn say(
    options: Res<Options>,
    clock: Res<Clock>,
    time: Res<Time<Real>>,
    diagnostics: Res<DiagnosticsStore>,
    windows: Query<&Window>,
    mut kept: Local<Kept>,
) {
    if !options.bench {
        return;
    }
    kept.worst = kept.worst.max(time.delta_secs());
    if time.elapsed_secs() - kept.said < 1.0 {
        return;
    }
    kept.said = time.elapsed_secs();
    let worst = std::mem::take(&mut kept.worst) * 1000.0;
    let Some(frame) = diagnostics.get(&FrameTimeDiagnosticsPlugin::FRAME_TIME).and_then(Diagnostic::smoothed)
    else {
        return;
    };
    let (width, height) = windows.single().map_or((0, 0), |w| (w.physical_width(), w.physical_height()));
    info!(
        "bench: T{:+.0} s, {frame:.2} ms a frame, {:.0} a second, slowest {worst:.1} ms, at {width} x {height} pixels",
        clock.t,
        1000.0 / frame,
    );
}
