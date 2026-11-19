//! The audio device: the synthesiser handed to the engine as a source that never ends, two channels at
//! [`RATE`]. The engine's mixer pulls samples from it on its own thread.

use std::num::NonZero;
use std::sync::Arc;
use std::time::Duration;

use bevy::audio::{ChannelCount, SampleRate, Source};
use bevy::prelude::*;

use super::Sound;
use super::dsp::RATE;
use super::shared::Shared;
use super::synth::Synth;

/// The flight's sound as the engine's asset: what to play is in what it shares with the game.
#[derive(Asset, TypePath, Debug, Clone)]
pub struct Voice(Arc<Shared>);

/// The synthesiser, a sample at a time: left, right, left, right.
pub struct Playing {
    synth: Synth,
    right: Option<f32>,
}

impl Iterator for Playing {
    type Item = f32;

    fn next(&mut self) -> Option<f32> {
        if let Some(right) = self.right.take() {
            return Some(right);
        }
        let [left, right] = self.synth.frame();
        self.right = Some(right);
        Some(left)
    }
}

impl Source for Playing {
    fn current_span_len(&self) -> Option<usize> {
        None
    }

    fn channels(&self) -> ChannelCount {
        NonZero::<u16>::MIN.saturating_add(1)
    }

    fn sample_rate(&self) -> SampleRate {
        NonZero::new(RATE as u32).unwrap_or(NonZero::<u32>::MIN)
    }

    fn total_duration(&self) -> Option<Duration> {
        None
    }
}

impl Decodable for Voice {
    type Decoder = Playing;

    fn decoder(&self) -> Playing {
        Playing { synth: Synth::new(Arc::clone(&self.0)), right: None }
    }
}

/// Start playing: once, for as long as the game runs.
pub fn play(mut commands: Commands, sound: Res<Sound>, mut voices: ResMut<Assets<Voice>>) {
    commands.spawn(AudioPlayer(voices.add(Voice(Arc::clone(&sound.shared)))));
}

/// How long the device is given to start taking samples before it is said to be silent, s.
const WAITS: f32 = 3.0;

/// Say once whether the device is taking what is made: a silent flight should have a reason in the log.
pub fn confirm(time: Res<Time<Real>>, sound: Res<Sound>, mut said: Local<bool>) {
    if *said || time.elapsed_secs() < WAITS {
        return;
    }
    *said = true;
    if sound.shared.frames() == 0 {
        warn!(
            "sound: the audio device has taken nothing in {WAITS} s: is there one? The flight will be silent"
        );
    } else {
        info!(
            "sound: synthesised at {RATE} Hz, playing ({})",
            if sound.muted { "muted: M" } else { "M mutes" }
        );
    }
}
