//! The things that happen once: what each is, how loud it is where it happens, and what is made of it at the ears
//! after its distance of air (or through the structure, for someone aboard). Every level here is an estimate
//! (`figures`); the path is physics.

use sr_world::V3;

use super::air::{absorbed, acoustic_power, between, cutoff_after, level_of, loudness, spl};
use super::dsp::nwave::Passing;
use super::figures::{BOLTED, HELMET, NEAR, RISE, SMALL_EXHAUST, STRUCTURE};
use super::model::{Listener, Seat};
use super::path::Heard;

/// A kind of thing that happens once.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Cue {
    /// The engine lighting.
    Ignition,
    /// A small solid rocket's whole burn.
    Rocket,
    /// A bolt, or a ring of them, fired.
    Bolt,
    /// The drogue's mortar.
    Mortar,
    /// A parachute snatching open.
    Canopy,
    /// A structure coming apart.
    Break,
    /// Something striking the ground.
    Strike,
    /// Something striking the sea.
    Splash,
    /// A relay in the cabin.
    Relay,
    /// A sonic boom.
    Boom,
}

impl Cue {
    /// Every kind, in the order of their codes.
    pub const ALL: [Self; 10] = [
        Self::Ignition,
        Self::Rocket,
        Self::Bolt,
        Self::Mortar,
        Self::Canopy,
        Self::Break,
        Self::Strike,
        Self::Splash,
        Self::Relay,
        Self::Boom,
    ];

    /// Its number, for sending between threads.
    #[must_use]
    pub fn code(self) -> u32 {
        self as u32
    }

    /// The kind with a number.
    #[must_use]
    pub fn from_code(code: u32) -> Option<Self> {
        Self::ALL.get(code as usize).copied()
    }
}

/// One of them as the synthesiser is told to play it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Shot {
    /// What.
    pub cue: Cue,
    /// Its gain, of full scale.
    pub gain: f32,
    /// The low-pass its distance of air puts over it, Hz.
    pub cutoff: f32,
    /// Where it is heard from, -1 left to 1 right.
    pub pan: f32,
    /// How long it lasts where its kind has a length: a rocket's burn, an N-wave from shock to shock, s.
    pub seconds: f32,
    /// How long an N-wave's shocks take to rise, s.
    pub rise: f32,
}

/// How loud a thing is where it happens.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Loud {
    /// A rocket of this sound power, W.
    Power(f64),
    /// A bang of this peak level a metre away, dB.
    Bang(f64),
    /// Something heard only in the cabin, at this level at the ear, dB.
    Cabin(f64),
}

/// Something that has happened.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Happening {
    /// What.
    pub cue: Cue,
    /// When, s on the flight's clock, and where in the site's frame, m.
    pub t: f64,
    /// As `t`.
    pub at: V3,
    /// How loud.
    pub loud: Loud,
    /// How long it lasts, s.
    pub seconds: f64,
    /// The speed of sound where it happened, m/s, and how much of sea level's air was there to carry it.
    pub sound: f64,
    /// As `sound`.
    pub carries: f64,
}

impl Happening {
    /// A small solid rocket of this thrust, N.
    #[must_use]
    pub fn rocket(thrust: f64) -> Loud {
        Loud::Power(acoustic_power(thrust, SMALL_EXHAUST.value))
    }

    /// When it reaches these ears, s on the flight's clock: at once through the structure for someone aboard,
    /// after its distance over the speed of sound for anyone else.
    #[must_use]
    pub fn arrives(&self, listener: &Listener) -> f64 {
        if listener.seat == Seat::Inside {
            return self.t;
        }
        self.t + (listener.ears.at - self.at).length() / between(listener.ears.sound, self.sound)
    }

    /// The level it has at these ears, dB, and how far it came, m.
    fn level(&self, listener: &Listener) -> (f64, f64) {
        if listener.seat == Seat::Inside {
            let level = match self.loud {
                Loud::Power(power) if self.cue == Cue::Ignition => spl(power, NEAR.value) - STRUCTURE.value,
                Loud::Power(power) => spl(power, NEAR.value) - BOLTED.value - HELMET.value,
                // (a few metres of structure from the seat; and a blow is felt through the couch as much as heard,
                // so the helmet keeps none of it out)
                Loud::Bang(level) => {
                    let felt = matches!(self.cue, Cue::Strike | Cue::Splash | Cue::Break);
                    level - 20.0 * 3.0_f64.log10() - BOLTED.value - if felt { 0.0 } else { HELMET.value }
                }
                Loud::Cabin(level) => level,
            };
            return (level, 0.0);
        }
        let distance = (listener.ears.at - self.at).length();
        let thin = self.carries.min(listener.carries);
        let level = match self.loud {
            Loud::Power(power) => spl(power * thin, distance) - absorbed(1000.0, distance),
            Loud::Bang(level) => {
                level - 20.0 * distance.max(1.0).log10() + 10.0 * thin.log10() - absorbed(2000.0, distance)
            }
            Loud::Cabin(_) => f64::NEG_INFINITY,
        };
        (level, distance)
    }

    /// What the synthesiser is to play of it for these ears, and its level there, dB; `None` if nothing of it
    /// reaches them.
    #[must_use]
    pub fn shot(&self, listener: &Listener) -> Option<(Shot, f64)> {
        let (level, distance) = self.level(listener);
        let gain = loudness(level);
        if gain <= 0.0 {
            return None;
        }
        let inside = listener.seat == Seat::Inside;
        let toward = (self.at - listener.ears.at).normalized();
        let shot = Shot {
            cue: self.cue,
            gain: gain as f32,
            // (through the structure the highs are lost; a relay is in the cabin with the ears)
            cutoff: if inside && self.cue != Cue::Relay { 900.0 } else { cutoff_after(distance) as f32 },
            pan: if inside || distance < 1.0 { 0.0 } else { toward.dot(listener.right) as f32 },
            seconds: self.seconds as f32,
            rise: 0.0,
        };
        Some((shot, level))
    }
}

/// A sonic boom at these ears from where the cone's surface left the vehicle: Carlson's overpressure and length
/// for a body of this length (m) and shape factor, `echo` of it if it is the sea's reflection and not the wave
/// itself. With its level, dB.
#[must_use]
pub fn boom(
    from: &Heard,
    listener: &Listener,
    length: f64,
    shape: f64,
    echo: Option<f64>,
) -> Option<(Shot, f64)> {
    let passing = Passing {
        mach: from.past.mach,
        length,
        distance: from.distance,
        pressure_there: from.past.pressure,
        pressure_here: listener.pressure,
        sound_there: from.past.sound,
        shape,
        reflection: echo.unwrap_or(listener.reflection),
        // (the atmosphere's factors are charts that were not read: one, which is an estimate)
        atmosphere: [1.0; 2],
    };
    let level = level_of(passing.overpressure());
    let gain = loudness(level);
    if gain <= 0.0 || listener.seat == Seat::Inside {
        return None;
    }
    let shot = Shot {
        cue: Cue::Boom,
        gain: gain as f32,
        cutoff: cutoff_after(from.distance) as f32,
        pan: -from.toward.dot(listener.right) as f32,
        seconds: passing.duration().clamp(0.02, 0.6) as f32,
        rise: RISE.value as f32,
    };
    Some((shot, level))
}

#[cfg(test)]
#[path = "cues_tests.rs"]
mod tests;
