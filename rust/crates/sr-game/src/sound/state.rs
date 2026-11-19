//! What the sound keeps between frames: the knobs it shares with the device, the vehicle's past, what has
//! happened and not yet been heard, and what was last heard, for the diagnostics.

use std::sync::Arc;

use bevy::prelude::*;

use super::cues::{Cue, Happening};
use super::model::{Listener, Mix, Seat};
use super::path::{Cone, Heard, History};
use super::shared::Shared;

/// The vehicle's past is kept this long, s, at this spacing, s. Sound from further back than that has come from
/// more than a hundred kilometres off and is under the hearing.
const KEEP: f64 = 320.0;
const STEP: f64 = 0.05;

/// Something that was played, for the diagnostics and the offline render's log.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Played {
    /// When it was heard, s on the flight's clock, and what.
    pub t: f64,
    /// As `t`.
    pub cue: Cue,
    /// Its level at the ears, dB, how far it had come, m, and how long it lasts where its kind has a length, s.
    pub level: f64,
    /// As `level`.
    pub distance: f64,
    /// As `level`.
    pub seconds: f64,
}

/// What has been noticed of the flight so far, so that each thing is noticed once.
#[derive(Debug, Clone, Copy, Default)]
pub struct Seen {
    /// Whether anything has been looked at yet, and whether the engine was burning at the last step.
    pub started: bool,
    /// As `started`.
    pub burning: bool,
    /// Which of the flight's events have been.
    pub done: [bool; 13],
    /// When anything last happened, and when the last blow was heard, s.
    pub last: Option<f64>,
    /// As `last`.
    pub blow: Option<f64>,
    /// How fast the crewed body was going at the last step, m/s.
    pub speed: f64,
}

/// The sound's state.
#[derive(Resource, Debug)]
pub struct Sound {
    /// What is shared with the device's thread.
    pub shared: Arc<Shared>,
    /// The listener's level, as a gain, and whether it is muted.
    pub level: f32,
    /// As `level`.
    pub muted: bool,
    /// The vehicle's past.
    pub history: History,
    /// The engine's burn as it is heard, 0 to 1: a hand's switch is a step, and an engine is not.
    pub burn: f64,
    /// The Mach cone's watchers: for the ears, and for their reflection in the sea.
    pub cones: [Cone; 2],
    /// Where the ears were last, as far as what they hear goes.
    pub seat: Option<Seat>,
    /// The ears now.
    pub listener: Option<Listener>,
    /// What has happened and not yet reached the ears.
    pub waiting: Vec<Happening>,
    /// What has been noticed.
    pub seen: Seen,
    /// What the synthesiser was last set to, and the loudest instant of the engine's past being heard.
    pub mix: Mix,
    /// As `mix`.
    pub heard: Option<Heard>,
    /// What has been played lately, oldest first.
    pub played: Vec<Played>,
}

impl Default for Sound {
    fn default() -> Self {
        Self {
            shared: Arc::default(),
            level: 1.0,
            muted: false,
            history: History::new(STEP, KEEP),
            burn: 0.0,
            cones: [Cone::default(); 2],
            seat: None,
            listener: None,
            waiting: Vec::new(),
            seen: Seen::default(),
            mix: Mix::default(),
            heard: None,
            played: Vec::new(),
        }
    }
}

impl Sound {
    /// How long the vehicle's past is kept, s.
    pub const KEEP: f64 = KEEP;

    /// Play something, and note that it was.
    pub fn play(&mut self, t: f64, shot: &super::cues::Shot, level: f64, distance: f64) {
        if self.shared.send(shot) {
            if self.played.len() >= 256 {
                self.played.remove(0);
            }
            self.played.push(Played { t, cue: shot.cue, level, distance, seconds: f64::from(shot.seconds) });
        }
    }
}
