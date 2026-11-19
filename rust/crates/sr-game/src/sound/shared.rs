//! What the game and the audio device's thread share, with no lock and no allocation: the synthesiser's knobs as
//! atomics, the things that happen once as a ring written by one side and read by the other, and the level that
//! came out, for the diagnostics.

use std::sync::atomic::{AtomicU32, AtomicUsize, Ordering};

use super::cues::{Cue, Shot};
use super::model::Mix;

/// A knob of the synthesiser. Gains are of full scale; frequencies are in Hz.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Knob {
    /// The whole flight's gain: nought while the clock is stopped.
    Flight,
    /// The listener's own level, nought when muted.
    Master,
    /// The engine: its roar, the crackle over it and the rumble under it.
    Roar,
    /// As `Roar`.
    Crackle,
    /// As `Roar`.
    Rumble,
    /// The low-pass the air's distance puts over the engine, and where its spectrum peaks.
    Cutoff,
    /// As `Cutoff`.
    Peak,
    /// Doppler: the engine's pitch is multiplied by it.
    Shift,
    /// Where the engine is heard from, -1 left to 1 right, and how wide, 0 a point to 1 all round.
    Pan,
    /// As `Pan`.
    Width,
    /// The ground's reflection: how late, s, and how strong.
    EchoDelay,
    /// As `EchoDelay`.
    EchoGain,
    /// The air on the skin: its gain, its band's centre, how deeply and how fast it flutters, and the buffet
    /// under it.
    Air,
    /// As `Air`.
    AirCentre,
    /// As `Air`.
    Flutter,
    /// As `Air`.
    FlutterRate,
    /// As `Air`.
    Buffet,
    /// The attitude jets' hiss.
    Jets,
    /// The place: wind, water, how much the water is the sea's lapping (1) and not surf (0), and the hum at the
    /// mains' frequency.
    Wind,
    /// As `Wind`.
    Water,
    /// As `Wind`.
    Lap,
    /// As `Wind`.
    Hum,
    /// As `Wind`.
    Mains,
    /// The cabin: its fans, and its inverters' whine at their frequency.
    Fans,
    /// As `Fans`.
    Whine,
    /// As `Fans`.
    WhineAt,
}

/// How many knobs there are.
pub const KNOBS: usize = Knob::WhineAt as usize + 1;
/// How many things that happen once can wait to be played.
const WAITING: usize = 64;
/// The words one of them takes.
const WORDS: usize = 6;

/// What the two threads share.
#[derive(Debug)]
pub struct Shared {
    knobs: [AtomicU32; KNOBS],
    ring: [[AtomicU32; WORDS]; WAITING],
    /// How many have been written, and how many read: only the game moves the first, only the device the second.
    written: AtomicUsize,
    read: AtomicUsize,
    /// The peak and the mean square of what last came out, as floats' bits.
    peak: AtomicU32,
    square: AtomicU32,
    /// How many frames the device has been given.
    frames: AtomicUsize,
}

impl Default for Shared {
    fn default() -> Self {
        Self {
            knobs: std::array::from_fn(|_| AtomicU32::new(0)),
            ring: std::array::from_fn(|_| std::array::from_fn(|_| AtomicU32::new(0))),
            written: AtomicUsize::new(0),
            read: AtomicUsize::new(0),
            peak: AtomicU32::new(0),
            square: AtomicU32::new(0),
            frames: AtomicUsize::new(0),
        }
    }
}

impl Shared {
    /// Set a knob.
    pub fn set(&self, knob: Knob, value: f32) {
        self.knobs[knob as usize].store(value.to_bits(), Ordering::Relaxed);
    }

    /// Where a knob is set.
    #[must_use]
    pub fn get(&self, knob: Knob) -> f32 {
        f32::from_bits(self.knobs[knob as usize].load(Ordering::Relaxed))
    }

    /// Every knob, in order.
    #[must_use]
    pub fn knobs(&self) -> [f32; KNOBS] {
        std::array::from_fn(|i| f32::from_bits(self.knobs[i].load(Ordering::Relaxed)))
    }

    /// Set every knob the model works out, with the frequencies of the place's mains and the cabin's inverters.
    pub fn tune(&self, mix: &Mix, mains: f32, inverters: f32) {
        let (e, a) = (&mix.engine, &mix.air);
        let set = [
            (Knob::Flight, mix.flight),
            (Knob::Roar, e.roar),
            (Knob::Crackle, e.crackle),
            (Knob::Rumble, e.rumble),
            (Knob::Cutoff, e.cutoff),
            (Knob::Peak, e.peak),
            (Knob::Shift, e.shift),
            (Knob::Pan, e.pan),
            (Knob::Width, e.width),
            (Knob::EchoDelay, e.echo[0]),
            (Knob::EchoGain, e.echo[1]),
            (Knob::Air, a.gain),
            (Knob::AirCentre, a.centre),
            (Knob::Flutter, a.flutter[0]),
            (Knob::FlutterRate, a.flutter[1]),
            (Knob::Buffet, a.buffet),
            (Knob::Jets, mix.jets),
            (Knob::Wind, mix.place[0]),
            (Knob::Water, mix.place[1]),
            (Knob::Lap, mix.place[2]),
            (Knob::Hum, mix.place[3]),
            (Knob::Fans, mix.cabin[0]),
            (Knob::Whine, mix.cabin[1]),
        ];
        for (knob, value) in set {
            self.set(knob, value as f32);
        }
        self.set(Knob::Mains, mains);
        self.set(Knob::WhineAt, inverters);
    }

    /// The game's side: something has happened, to be played. If too many are waiting it is dropped; whether it
    /// was taken.
    pub fn send(&self, shot: &Shot) -> bool {
        let (written, read) = (self.written.load(Ordering::Relaxed), self.read.load(Ordering::Acquire));
        if written.wrapping_sub(read) >= WAITING {
            return false;
        }
        let words = [shot.gain, shot.cutoff, shot.pan, shot.seconds, shot.rise];
        let slot = &self.ring[written % WAITING];
        slot[0].store(shot.cue.code(), Ordering::Relaxed);
        for (word, value) in slot[1..].iter().zip(words) {
            word.store(value.to_bits(), Ordering::Relaxed);
        }
        self.written.store(written.wrapping_add(1), Ordering::Release);
        true
    }

    /// The device's side: the next thing that has happened, if any is waiting.
    pub fn take(&self) -> Option<Shot> {
        let (read, written) = (self.read.load(Ordering::Relaxed), self.written.load(Ordering::Acquire));
        if read == written {
            return None;
        }
        let slot = &self.ring[read % WAITING];
        let word = |i: usize| f32::from_bits(slot[i].load(Ordering::Relaxed));
        let cue = Cue::from_code(slot[0].load(Ordering::Relaxed));
        let shot = cue.map(|cue| Shot {
            cue,
            gain: word(1),
            cutoff: word(2),
            pan: word(3),
            seconds: word(4),
            rise: word(5),
        });
        self.read.store(read.wrapping_add(1), Ordering::Release);
        shot
    }

    /// The device's side: what last came out, its peak and its mean square, and how many frames more have gone.
    pub fn meter(&self, peak: f32, square: f32, frames: usize) {
        self.frames.fetch_add(frames, Ordering::Relaxed);
        self.peak.store(peak.to_bits(), Ordering::Relaxed);
        self.square.store(square.to_bits(), Ordering::Relaxed);
    }

    /// The peak and the root-mean-square level of what last came out, of full scale.
    #[must_use]
    pub fn level(&self) -> (f32, f32) {
        let word = |bits: &AtomicU32| f32::from_bits(bits.load(Ordering::Relaxed));
        (word(&self.peak), word(&self.square).max(0.0).sqrt())
    }

    /// How many frames the device has been given so far: none, and nothing is playing.
    #[must_use]
    pub fn frames(&self) -> usize {
        self.frames.load(Ordering::Relaxed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    fn shot(gain: f32) -> Shot {
        Shot { cue: Cue::Bolt, gain, cutoff: 8000.0, pan: -0.25, seconds: 0.5, rise: 0.005 }
    }

    #[test]
    fn a_knob_is_where_it_was_set() {
        let shared = Shared::default();
        shared.set(Knob::Cutoff, 1234.5);
        shared.set(Knob::WhineAt, 400.0);
        assert_eq!(shared.get(Knob::Cutoff), 1234.5);
        assert_eq!(shared.knobs()[Knob::WhineAt as usize], 400.0);
        assert_eq!(shared.get(Knob::Roar), 0.0);
    }

    #[test]
    fn what_is_sent_is_taken_once_in_order_and_too_many_are_dropped() {
        let shared = Shared::default();
        assert!(shared.take().is_none());
        for i in 0..WAITING {
            assert!(shared.send(&shot(i as f32)));
        }
        assert!(!shared.send(&shot(99.0)), "the ring is full");
        for i in 0..WAITING {
            assert_eq!(shared.take(), Some(shot(i as f32)));
        }
        assert!(shared.take().is_none());
        assert!(shared.send(&shot(7.0)));
        assert_eq!(shared.take().map(|shot| shot.gain), Some(7.0));
    }

    #[test]
    fn one_thread_sends_while_another_takes_and_nothing_is_lost_or_torn() {
        let shared = Arc::new(Shared::default());
        let theirs = Arc::clone(&shared);
        let taker = std::thread::spawn(move || {
            let mut next = 0.0;
            while next < 5000.0 {
                if let Some(taken) = theirs.take() {
                    assert_eq!(taken, shot(next));
                    next += 1.0;
                }
            }
        });
        let mut sent = 0.0;
        while sent < 5000.0 {
            if shared.send(&shot(sent)) {
                sent += 1.0;
            }
        }
        taker.join().unwrap();
    }
}
