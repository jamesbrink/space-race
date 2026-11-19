//! The things that happen once: each kind a recipe (a low thump that falls in pitch, a band of noise with its
//! rise and fall, a click), played by one of a fixed pool of voices. A sonic boom is the N-wave itself.

use std::f32::consts::TAU;

use super::knobs::spread;
use crate::sound::cues::{Cue, Shot};
use crate::sound::dsp::RATE;
use crate::sound::dsp::filter::{Low, Svf, Tuning, pole};
use crate::sound::dsp::noise::Rng;
use crate::sound::dsp::nwave::n_wave;

/// How a kind of thing sounds. Estimated, every figure: impressions of the kind, nothing measured.
#[derive(Debug, Clone, Copy)]
struct Recipe {
    /// A thump: its gain, the pitch it starts at and falls to, Hz, and how long it takes to die, s.
    thump: [f32; 4],
    /// Noise: its gain, its band's centre, Hz, and sharpness, and how long it takes to rise and to die, s.
    noise: [f32; 5],
    /// A click at its start, as a gain, and how many more a second while the noise lasts.
    click: [f32; 2],
    /// The noise is held for as long as the thing lasts (a rocket's burn), not just struck.
    held: bool,
}

const fn recipe(cue: Cue) -> Recipe {
    let (thump, noise, click, held) = match cue {
        Cue::Ignition => ([1.0, 70.0, 34.0, 0.5], [0.5, 320.0, 0.5, 0.03, 0.7], [0.0, 0.0], false),
        Cue::Rocket => ([0.45, 120.0, 60.0, 0.14], [0.9, 900.0, 0.4, 0.012, 0.22], [0.3, 0.0], true),
        Cue::Bolt => ([0.6, 210.0, 90.0, 0.045], [0.7, 2600.0, 0.6, 0.0006, 0.06], [1.0, 0.0], false),
        Cue::Mortar => ([1.0, 110.0, 48.0, 0.12], [0.6, 1200.0, 0.5, 0.002, 0.16], [0.6, 0.0], false),
        Cue::Canopy => ([1.0, 58.0, 27.0, 0.35], [0.55, 520.0, 0.4, 0.05, 0.9], [0.0, 0.0], false),
        Cue::Break => ([1.0, 80.0, 30.0, 0.6], [0.9, 700.0, 0.3, 0.004, 1.5], [0.8, 22.0], false),
        Cue::Strike => ([1.0, 90.0, 36.0, 0.28], [0.6, 420.0, 0.4, 0.003, 0.45], [0.5, 0.0], false),
        Cue::Splash => ([0.7, 70.0, 34.0, 0.25], [0.9, 1700.0, 0.3, 0.03, 1.7], [0.0, 0.0], false),
        Cue::Relay => ([0.0, 100.0, 100.0, 0.01], [0.3, 3200.0, 2.0, 0.0004, 0.02], [1.0, 0.0], false),
        // (the N-wave is made as itself; this is the rumble that follows it)
        Cue::Boom => ([0.0, 50.0, 50.0, 0.01], [0.14, 110.0, 0.5, 0.04, 0.9], [0.0, 0.0], false),
    };
    Recipe { thump, noise, click, held }
}

/// How fast a click dies, s.
const CLICK: f32 = 0.0012;
/// How many can sound at once.
const VOICES: usize = 16;

/// One of them sounding.
#[derive(Debug, Clone, Copy)]
struct Voice {
    shot: Shot,
    recipe: Recipe,
    /// How many frames it has sounded, and how many it will.
    age: u32,
    ends: u32,
    rng: Rng,
    turn: f32,
    click: f32,
    band: Svf,
    tuning: Tuning,
    air: [Low; 2],
    cutoff: f32,
}

impl Voice {
    fn new(shot: &Shot, seed: u32) -> Self {
        let recipe = recipe(shot.cue);
        let held = if recipe.held || shot.cue == Cue::Boom { shot.seconds.max(0.0) } else { 0.0 };
        let lasts = held + recipe.noise[3] + 7.0 * recipe.noise[4].max(recipe.thump[3]);
        Self {
            shot: *shot,
            recipe,
            age: 0,
            ends: (lasts * RATE) as u32,
            rng: Rng::new(seed),
            turn: 0.0,
            click: recipe.click[0],
            band: Svf::default(),
            tuning: Tuning::at(recipe.noise[1], recipe.noise[2]),
            air: [Low::default(); 2],
            cutoff: pole(shot.cutoff.clamp(40.0, 16_000.0)),
        }
    }

    fn thump(&mut self, t: f32) -> f32 {
        let [gain, from, to, dies] = self.recipe.thump;
        if gain <= 0.0 {
            return 0.0;
        }
        let pitch = to + (from - to) * (-2.0 * t / dies).exp();
        self.turn = (self.turn + pitch / RATE).fract();
        gain * (TAU * self.turn).sin() * (-t / dies).exp()
    }

    fn noise(&mut self, t: f32) -> f32 {
        let [gain, _, sharp, rises, dies] = self.recipe.noise;
        let held = if self.recipe.held { self.shot.seconds } else { 0.0 };
        let fall = if t > held + rises { (-(t - held - rises) / dies).exp() } else { 1.0 };
        let level = (t / rises).min(1.0) * fall;
        // More clicks while it lasts: a structure does not break all at once.
        if self.rng.unit() < self.recipe.click[1] * level / RATE {
            self.click += self.recipe.click[0] * self.rng.unit();
        }
        // (a band's peak is its sharpness times what went in: taken out, so the gain is the gain)
        gain * level * self.band.run(self.rng.white(), &self.tuning).band / sharp.max(0.3) * 1.6
    }

    fn run(&mut self) -> f32 {
        let t = self.age as f32 / RATE;
        self.age += 1;
        let wave =
            if self.shot.cue == Cue::Boom { n_wave(t, self.shot.seconds, self.shot.rise) } else { 0.0 };
        let click = self.click * self.rng.white();
        self.click *= 1.0 - 1.0 / (CLICK * RATE);
        let dry = wave + self.thump(t) + self.noise(t) + click;
        let once = self.air[0].run(dry, self.cutoff);
        self.shot.gain * self.air[1].run(once, self.cutoff)
    }
}

/// The pool.
#[derive(Debug, Clone, Copy)]
pub struct Shots {
    voices: [Option<Voice>; VOICES],
    started: u32,
}

impl Shots {
    /// An empty one.
    #[must_use]
    pub fn new() -> Self {
        Self { voices: [None; VOICES], started: 0 }
    }

    /// Something has happened: a free voice plays it, or the one nearest its end is given up for it.
    pub fn start(&mut self, shot: &Shot) {
        self.started = self.started.wrapping_add(1);
        let nearest_done =
            |voice: &Option<Voice>| voice.map_or(f32::MAX, |v| v.age as f32 / v.ends.max(1) as f32);
        let free = self.voices.iter_mut().max_by(|a, b| nearest_done(a).total_cmp(&nearest_done(b)));
        if let Some(voice) = free {
            *voice = Some(Voice::new(shot, 0x9E37_79B9_u32.wrapping_mul(self.started)));
        }
    }

    /// The next frame.
    pub fn run(&mut self) -> [f32; 2] {
        let mut out = [0.0; 2];
        for slot in &mut self.voices {
            let Some(voice) = slot else { continue };
            let [l, r] = spread(voice.run(), 0.0, voice.shot.pan, 0.0);
            out = [out[0] + l, out[1] + r];
            if voice.age >= voice.ends {
                *slot = None;
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sound::meter::{centroid, level};

    fn shot(cue: Cue, seconds: f32) -> Shot {
        Shot { cue, gain: 1.0, cutoff: 16_000.0, pan: 0.0, seconds, rise: 0.005 }
    }

    fn heard(shot: &Shot, seconds: f32) -> Vec<f32> {
        let mut shots = Shots::new();
        shots.start(shot);
        (0..(seconds * RATE) as usize).map(|_| shots.run()[0]).collect()
    }

    #[test]
    fn every_kind_is_about_full_scale_at_a_gain_of_one_starts_from_nothing_and_ends() {
        for cue in Cue::ALL {
            let all = heard(&shot(cue, 0.1), 14.0);
            let (_, peak) = level(&all);
            eprintln!("{cue:?}: peak {peak:.2}");
            assert!((0.5..1.9).contains(&peak), "{cue:?}: {peak}");
            // No kind but a click's own starts with a step, and all are over well inside fourteen seconds.
            if !matches!(cue, Cue::Bolt | Cue::Relay | Cue::Mortar | Cue::Break | Cue::Strike | Cue::Rocket) {
                assert!(all[0].abs() < 0.02, "{cue:?} starts at {}", all[0]);
            }
            assert_eq!(level(&all[all.len() - 4800..]).1, 0.0, "{cue:?} has not ended");
        }
    }

    #[test]
    fn a_rocket_burns_as_long_as_it_burns() {
        let burn = heard(&shot(Cue::Rocket, 3.0), 6.0);
        let at = |seconds: f32| level(&burn[(seconds * RATE) as usize..][..4800]).0;
        assert!(at(1.0) > 0.1 && at(2.5) > 0.1, "{} {}", at(1.0), at(2.5));
        assert!(at(4.5) < 0.01 * at(2.5), "{}", at(4.5));
    }

    #[test]
    fn a_boom_is_two_shocks_its_length_apart() {
        let boom = heard(&Shot { cutoff: 16_000.0, ..shot(Cue::Boom, 0.1) }, 0.3);
        // Up at the bow shock, down at the tail shock a tenth of a second on.
        let (up, down) = (
            boom[..960].iter().fold(0.0_f32, |m, &x| m.max(x)),
            boom[4320..5280].iter().fold(0.0_f32, |m, &x| m.min(x)),
        );
        assert!(up > 0.6 && down < -0.6, "{up} {down}");
    }

    #[test]
    fn far_off_a_bolt_is_a_thud() {
        let near = centroid(&heard(&shot(Cue::Bolt, 0.0), 0.7));
        let far = centroid(&heard(&Shot { cutoff: 300.0, ..shot(Cue::Bolt, 0.0) }, 0.7));
        assert!(far < 0.3 * near, "{far} {near}");
    }

    #[test]
    fn more_than_the_pool_holds_gives_up_the_one_nearest_its_end() {
        let mut shots = Shots::new();
        for _ in 0..3 * VOICES {
            shots.start(&shot(Cue::Splash, 0.0));
            for _ in 0..100 {
                shots.run();
            }
        }
        assert_eq!(shots.voices.iter().flatten().count(), VOICES);
        // The oldest were given up: none left has sounded for longer than the pool took to fill.
        assert!(shots.voices.iter().flatten().all(|voice| voice.age <= 100 * VOICES as u32));
    }
}
