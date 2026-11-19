//! The voices summed and sent out. It runs on the audio device's thread (or, offline, wherever it is called), so
//! nothing in it allocates, locks or waits: it reads the knobs and the things that have happened from
//! [`Shared`], glides to them, and writes the level that came out back for the diagnostics.

use std::sync::Arc;

use super::knobs::Knobs;
use super::{bed, engine, shots, wind};
use crate::sound::dsp::RATE;
use crate::sound::dsp::filter::glide;
use crate::sound::dsp::limit::Limiter;
use crate::sound::shared::{Knob, Shared};

/// The knobs are read, and the filters set from them, once in this many frames.
const BLOCK: u32 = 32;
/// How long a knob takes to get most of the way to where it was set, s: long enough that nothing zips or clicks,
/// short enough that an arrival is not smeared.
const GLIDE: f32 = 0.03;

/// The synthesiser.
#[derive(Debug)]
pub struct Synth {
    shared: Arc<Shared>,
    knobs: Knobs,
    started: bool,
    left: u32,
    engine: engine::Engine,
    wind: wind::Wind,
    bed: bed::Bed,
    shots: shots::Shots,
    limiter: Limiter,
    peak: f32,
    square: f32,
}

impl Synth {
    /// One that plays what `shared` says.
    #[must_use]
    pub fn new(shared: Arc<Shared>) -> Self {
        Self {
            shared,
            knobs: Knobs::default(),
            started: false,
            left: 0,
            engine: engine::Engine::new(),
            wind: wind::Wind::new(),
            bed: bed::Bed::new(),
            shots: shots::Shots::new(),
            limiter: Limiter::default(),
            peak: 0.0,
            square: 0.0,
        }
    }

    /// Once a block: the knobs glide toward where they were set (the first time, they are simply there), the
    /// filters follow, whatever has happened starts, and the level that came out is written back.
    fn refresh(&mut self) {
        let set = self.shared.knobs();
        let a = if self.started { glide(GLIDE, RATE / BLOCK as f32) } else { 1.0 };
        self.started = true;
        for (now, set) in self.knobs.0.iter_mut().zip(set) {
            *now += (set - *now) * a;
        }
        self.engine.tune(&self.knobs);
        self.wind.tune(&self.knobs);
        self.bed.tune();
        while let Some(shot) = self.shared.take() {
            self.shots.start(&shot);
        }
        self.shared.meter(self.peak, self.square, BLOCK as usize);
        self.peak = 0.0;
    }

    /// The next frame: left, right. Never at or over full scale.
    pub fn frame(&mut self) -> [f32; 2] {
        if self.left == 0 {
            self.refresh();
            self.left = BLOCK;
        }
        self.left -= 1;
        let k = &self.knobs;
        let (engine, wind) = (self.engine.run(k), self.wind.run(k));
        let (cabin, place) = self.bed.run(k);
        let shots = self.shots.run();
        // The flight is silent while its clock is stopped; the place is not.
        let (flight, master) = (k.at(Knob::Flight), k.at(Knob::Master));
        let mixed: [f32; 2] = std::array::from_fn(|i| {
            ((engine[i] + wind[i] + cabin[i] + shots[i]) * flight + place[i]) * master
        });
        let out = self.limiter.run(mixed);
        self.peak = self.peak.max(out[0].abs()).max(out[1].abs());
        self.square += (f32::midpoint(out[0] * out[0], out[1] * out[1]) - self.square) * (8.0 / RATE);
        out
    }

    /// The next frames, left and right by turns, added to the end of `tape`.
    pub fn render(&mut self, frames: usize, tape: &mut Vec<f32>) {
        tape.reserve(2 * frames);
        for _ in 0..frames {
            tape.extend(self.frame());
        }
    }
}
