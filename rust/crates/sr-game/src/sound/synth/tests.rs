//! The whole synthesiser: it cannot clip, it does not click, a stopped flight is silent and its place is not.

use std::sync::Arc;

use super::Synth;
use crate::sound::cues::{Cue, Shot};
use crate::sound::dsp::RATE;
use crate::sound::meter::level;
use crate::sound::shared::{Knob, Shared};

fn shared(set: &[(Knob, f32)]) -> Arc<Shared> {
    let shared = Arc::new(Shared::default());
    let standing = [
        (Knob::Flight, 1.0),
        (Knob::Master, 1.0),
        (Knob::Peak, 57.5),
        (Knob::Shift, 1.0),
        (Knob::Cutoff, 16_000.0),
        (Knob::Width, 1.0),
        (Knob::AirCentre, 500.0),
        (Knob::FlutterRate, 9.0),
        (Knob::Mains, 60.0),
        (Knob::WhineAt, 400.0),
    ];
    for &(knob, value) in standing.iter().chain(set) {
        shared.set(knob, value);
    }
    shared
}

fn play(synth: &mut Synth, seconds: f32) -> Vec<f32> {
    let mut tape = Vec::new();
    synth.render((seconds * RATE) as usize, &mut tape);
    tape
}

const LOUD: [(Knob, f32); 8] = [
    (Knob::Roar, 1.4),
    (Knob::Crackle, 1.4),
    (Knob::Rumble, 1.4),
    (Knob::Air, 1.4),
    (Knob::Buffet, 1.4),
    (Knob::Jets, 1.0),
    (Knob::Wind, 1.0),
    (Knob::Water, 1.0),
];

#[test]
fn with_everything_as_loud_as_it_goes_and_booms_on_top_nothing_reaches_full_scale() {
    let shared = shared(&LOUD);
    let mut synth = Synth::new(Arc::clone(&shared));
    let mut worst = 0.0_f32;
    for i in 0..40 {
        let cue = Cue::ALL[i % Cue::ALL.len()];
        shared.send(&Shot { cue, gain: 1.4, cutoff: 16_000.0, pan: 0.0, seconds: 0.2, rise: 0.005 });
        worst = worst.max(level(&play(&mut synth, 0.25)).1);
    }
    assert!(worst < 1.0, "{worst}");
    assert!(worst > 0.75, "and it is loud: {worst}");
    let (peak, rms) = shared.level();
    assert!(peak > 0.1 && rms > 0.1, "the meter reads it: {peak} {rms}");
}

#[test]
fn a_stopped_flight_is_silent_its_place_is_not_and_a_mute_is_silence() {
    let shared = shared(&LOUD);
    shared.set(Knob::Wind, 0.3);
    shared.set(Knob::Water, 0.3);
    let mut synth = Synth::new(Arc::clone(&shared));
    let running = level(&play(&mut synth, 1.0)).0;
    shared.set(Knob::Flight, 0.0);
    play(&mut synth, 0.5);
    let stopped = level(&play(&mut synth, 1.0)).0;
    assert!(stopped > 0.02 && stopped < 0.5 * running, "{stopped} of {running}");
    shared.set(Knob::Wind, 0.0);
    shared.set(Knob::Water, 0.0);
    play(&mut synth, 0.5);
    assert!(level(&play(&mut synth, 0.5)).1 < 1e-4);
    shared.set(Knob::Flight, 1.0);
    shared.set(Knob::Master, 0.0);
    play(&mut synth, 0.5);
    assert!(level(&play(&mut synth, 0.5)).1 < 1e-4);
}

#[test]
fn an_engine_switched_on_at_once_comes_up_without_a_click() {
    // A click is a step: a jump between two samples far bigger than the sound's own. The roar's own steps, once
    // it is up, are the measure.
    let shared = shared(&[]);
    let mut synth = Synth::new(Arc::clone(&shared));
    play(&mut synth, 0.2);
    shared.set(Knob::Roar, 1.0);
    shared.set(Knob::Rumble, 1.0);
    let start = play(&mut synth, 0.5);
    let steady = play(&mut synth, 4.0);
    let steps = |tape: &[f32]| {
        let left: Vec<f32> = tape.iter().step_by(2).copied().collect();
        left.windows(2).map(|pair| (pair[1] - pair[0]).abs()).fold(0.0_f32, f32::max)
    };
    assert!(steps(&start) <= 1.25 * steps(&steady), "{} against {}", steps(&start), steps(&steady));
    // And off again: the last of it dies away, it does not stop.
    shared.set(Knob::Roar, 0.0);
    shared.set(Knob::Rumble, 0.0);
    let stop = play(&mut synth, 0.5);
    assert!(steps(&stop) <= 1.25 * steps(&steady));
    assert!(level(&stop[..960]).0 > 0.05 && level(&stop[stop.len() - 960..]).1 < 1e-3);
}

#[test]
fn something_sent_is_heard_on_its_side() {
    let shared = shared(&[]);
    let mut synth = Synth::new(Arc::clone(&shared));
    assert_eq!(level(&play(&mut synth, 0.1)).1, 0.0);
    shared.send(&Shot { cue: Cue::Mortar, gain: 0.5, cutoff: 16_000.0, pan: -1.0, seconds: 0.0, rise: 0.0 });
    let tape = play(&mut synth, 0.5);
    let left: Vec<f32> = tape.iter().step_by(2).copied().collect();
    let right: Vec<f32> = tape.iter().skip(1).step_by(2).copied().collect();
    assert!(level(&left).1 > 0.3 && level(&right).1 < 1e-4, "{} {}", level(&left).1, level(&right).1);
}

/// What comes out with the knobs where the model puts them for an engine at full thrust `metres` across level
/// ground from ears standing on it: the left ear's.
fn across(metres: f64) -> Vec<f32> {
    use crate::sound::model::{Craft, Hearing, Listener, Now, Seat, mix};
    use crate::sound::path::{Ears, Heard, Past};
    use sr_missions::usa::mercury::mr3::PLAN;
    use sr_world::V3;

    let craft = Craft::of(&PLAN.engine);
    let past = Past {
        t: 0.0,
        at: V3::new(0.0, 2.0, 0.0),
        velocity: V3::ZERO,
        axis: V3::Y,
        power: craft.power(PLAN.engine.thrust.value),
        sound: 340.3,
        carries: 1.0,
        pressure: 101_325.0,
        mach: 0.0,
    };
    let toward = V3::new(1.0, 0.0, 0.0);
    let heard = [Heard { past, distance: metres, delay: metres / 340.3, doppler: 1.0, toward }];
    let listener = Listener {
        seat: Seat::Standing,
        ears: Ears { at: V3::new(metres, 1.7, 0.0), velocity: V3::ZERO, sound: 340.3 },
        right: V3::new(0.0, 0.0, 1.0),
        above: 1.7,
        off: metres,
        carries: 1.0,
        pressure: 101_325.0,
        reflection: 1.9,
    };
    let hearing = Hearing {
        rate: 1.0,
        running: true,
        listener,
        craft,
        now: Now::default(),
        heard: &heard,
        quiet: [0.0; 4],
    };
    let shared = shared(&[]);
    shared.tune(&mix(&hearing), 60.0, 400.0);
    let mut synth = Synth::new(Arc::clone(&shared));
    play(&mut synth, 4.0).into_iter().step_by(2).collect()
}

#[test]
fn across_the_pad_the_engine_is_loud_and_whole_and_from_far_off_it_is_low_and_faint() {
    use crate::sound::meter::{band, centroid, db};
    let (near, far) = (across(70.0), across(8000.0));
    let ((near_rms, near_peak), (far_rms, _)) = (level(&near), level(&far));
    let top = |tape: &[f32]| band(tape, 1000.0, 8000.0) / band(tape, 20.0, 250.0);
    eprintln!(
        "70 m: {:.1} dB rms, {:.1} peak, centroid {:.0} Hz, top/bottom {:.4}; 8 km: {:.1} dB rms, centroid {:.0} Hz, \
         top/bottom {:.6}",
        db(near_rms),
        db(near_peak),
        centroid(&near),
        top(&near),
        db(far_rms),
        centroid(&far),
        top(&far)
    );
    // Loud, not clipped: within a few decibels of full scale at its peaks, and its level well under them.
    assert!(near_peak < 1.0 && db(near_peak) > -3.0 && (-17.0..-9.0).contains(&db(near_rms)), "{near_rms}");
    // Eight kilometres takes 41 dB of level, which is some 20 of gain, and all of the top.
    assert!((-36.0..-24.0).contains(&db(far_rms)), "{}", db(far_rms));
    assert!(top(&far) < 0.01 * top(&near) && centroid(&far) < 0.5 * centroid(&near));
}
