//! The opening's state and its clock: set at its first instant under the curtain, run on as the curtain lifts,
//! skipped by a key or a click, and handed over at T-12 with the flight's own clock running again.

use bevy::prelude::*;
use sr_missions::morning::Key;
use sr_render::air::Air;
use sr_render::sky::Sky;

use super::pace::{PACES, Timeline};
use crate::clock::Clock;
use crate::curtain::Curtain;
use crate::{Options, Showing};

/// How long a skip takes to go dark, and to come up again on T-12, s.
pub(super) const SKIP_DARK: f64 = 0.35;
const SKIP_UP: f64 = 0.6;
/// A second of the opening for each frame while filming.
const FILMED: f64 = 1.0 / 60.0;
/// The keys that do not skip it: the sound's.
const HEARD: [KeyCode; 3] = [KeyCode::KeyM, KeyCode::Minus, KeyCode::Equal];

/// Where the opening is.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Phase {
    /// Not played.
    Off,
    /// Set at its first instant under the curtain, waiting for it to lift.
    Waiting,
    /// Playing.
    Playing,
    /// Going dark to skip to the hand-over: since this many seconds of the opening.
    Skipping(f64),
    /// Handed over, so many seconds ago (real ones).
    Done(f64),
}

/// The opening's state.
#[derive(Resource, Debug, Clone)]
pub struct Opening {
    /// Where it is.
    pub phase: Phase,
    /// Seconds into it.
    pub tau: f64,
    /// Its clock.
    pub timeline: Timeline,
    /// The pad's keyframes, for what is said of each moment.
    pub keys: &'static [Key],
    /// Whether it was skipped.
    pub skipped: bool,
}

impl Opening {
    /// Whether it has the camera and the clock.
    #[must_use]
    pub fn playing(&self) -> bool {
        matches!(self.phase, Phase::Waiting | Phase::Playing | Phase::Skipping(_))
    }

    /// How dark a skip has made the picture, 0 to 1.
    #[must_use]
    pub fn skip_dark(&self) -> f64 {
        match self.phase {
            Phase::Skipping(since) => ((self.tau - since) / SKIP_DARK).clamp(0.0, 1.0),
            Phase::Done(after) if self.skipped && after < SKIP_UP => 1.0 - after / SKIP_UP,
            _ => 0.0,
        }
    }
}

pub(super) fn start(mut commands: Commands, options: Res<Options>, showing: Res<Showing>) {
    let keys = showing.0.morning.map_or(&[][..], |plays| plays.morning().keys);
    let phase = if options.begins == crate::options::Begins::Morning { Phase::Waiting } else { Phase::Off };
    commands.insert_resource(Opening {
        phase,
        tau: 0.0,
        timeline: Timeline::new(&PACES),
        keys,
        skipped: false,
    });
}

/// While it plays, a key or a click skips it, and nothing else hears them.
pub(super) fn skip(
    opening: Option<ResMut<Opening>>,
    mut keys: ResMut<ButtonInput<KeyCode>>,
    mut buttons: ResMut<ButtonInput<MouseButton>>,
    mut scroll: ResMut<bevy::input::mouse::AccumulatedMouseScroll>,
) {
    let Some(mut opening) = opening.filter(|o| o.playing()) else { return };
    let pressed = keys.get_just_pressed().any(|k| !HEARD.contains(k)) || buttons.get_just_pressed().len() > 0;
    if pressed && opening.phase == Phase::Playing {
        opening.phase = Phase::Skipping(opening.tau);
        opening.skipped = true;
    }
    let held: Vec<KeyCode> =
        keys.get_pressed().chain(keys.get_just_released()).copied().filter(|k| !HEARD.contains(k)).collect();
    for key in held {
        keys.reset(key);
    }
    buttons.reset_all();
    *scroll = default();
}

/// Each frame: the opening's clock on, and the flight's set from it, with the Sun and the cloud.
pub(super) fn run(
    mut opening: ResMut<Opening>,
    options: Res<Options>,
    showing: Res<Showing>,
    curtain: Res<Curtain>,
    time: Res<Time<Real>>,
    mut clock: ResMut<Clock>,
    mut sky: ResMut<Sky>,
    mut air: ResMut<Air>,
) {
    let step = if options.film.is_some() { FILMED } else { f64::from(time.delta_secs()) };
    match opening.phase {
        Phase::Off => return,
        Phase::Done(after) => {
            // (its seconds go on counting, so a frame can be filmed after the hand-over)
            opening.phase = Phase::Done(after + step);
            opening.tau += step;
            return;
        }
        Phase::Waiting if !curtain.is_up() => opening.phase = Phase::Playing,
        Phase::Waiting => {}
        Phase::Playing | Phase::Skipping(_) => opening.tau += step,
    }
    if !clock.ready {
        return;
    }
    let length = opening.timeline.length();
    let over = opening.tau >= length || opening.skip_dark() >= 1.0;
    if over {
        // the hand-over: the flight's own clock runs again from T-12, as it would have opened
        opening.tau = length;
        opening.phase = Phase::Done(0.0);
        clock.t = opening.timeline.span().1;
        clock.stopped = false;
    } else {
        clock.t = opening.timeline.t(opening.tau);
        if !clock.stopped {
            clock.stopped = true;
        }
    }
    sky.sun = crate::stage::sky(showing.0, clock.t).sun;
    air.clock = clock.t as f32;
}
