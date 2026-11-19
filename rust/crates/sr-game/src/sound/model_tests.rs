//! The mix against figures worked by hand from the published ones it stands on.

use super::*;
use crate::sound::path::Past;
use sr_missions::usa::mercury::mr3::PLAN;

fn listener(seat: Seat, at: V3) -> Listener {
    Listener {
        seat,
        ears: Ears { at, velocity: V3::ZERO, sound: 340.3 },
        right: V3::new(1.0, 0.0, 0.0),
        above: at.y,
        off: at.x.hypot(at.z),
        carries: 1.0,
        pressure: 101_325.0,
        reflection: 1.9,
    }
}

/// The engine at full thrust, heard from where it is `away` from the ears, with this much air round it.
fn heard(ears: V3, at: V3, carries: f64) -> Heard {
    let craft = Craft::of(&PLAN.engine);
    let past = Past {
        t: 0.0,
        at,
        velocity: V3::ZERO,
        axis: V3::Y,
        power: craft.power(PLAN.engine.thrust.value),
        sound: 340.3,
        carries,
        pressure: 101_325.0,
        mach: 0.0,
    };
    let path = ears - at;
    Heard {
        past,
        distance: path.length(),
        delay: path.length() / 340.3,
        doppler: 1.0,
        toward: path.normalized(),
    }
}

fn hearing(listener: Listener, now: Now, heard: &[Heard]) -> Hearing<'_> {
    Hearing {
        rate: 1.0,
        running: true,
        listener,
        craft: Craft::of(&PLAN.engine),
        now,
        heard,
        quiet: [0.05, 0.035, 0.006, 0.12],
    }
}

#[test]
fn the_a_7_peaks_where_its_nozzle_and_exhaust_say() {
    // 214.8 s is 2106 m/s; 0.4207 sq m is 0.732 m across; 0.02 of one over the other.
    let craft = Craft::of(&PLAN.engine);
    assert!((craft.exhaust_speed - 2106.5).abs() < 0.1, "{}", craft.exhaust_speed);
    assert!((craft.peak - 57.6).abs() < 0.2, "{}", craft.peak);
}

#[test]
fn the_clock_gates_the_flight() {
    assert_eq!(gate(false, 1.0), 0.0);
    assert_eq!((gate(true, 1.0), gate(true, 2.0)), (1.0, 1.0));
    assert_eq!((gate(true, 4.0), gate(true, 8.0)), (0.3, 0.3));
    assert_eq!((gate(true, 16.0), gate(true, 32.0), gate(true, 64.0)), (0.12, 0.12, 0.0));
}

#[test]
fn the_engine_is_loudest_sixty_degrees_from_its_fire_and_quietest_ahead() {
    let from = |ears: V3| directivity(&heard(ears, V3::ZERO, 1.0));
    // Abeam is 90 degrees from the fire (which goes down): 30 off the lobe.
    assert!((from(V3::new(100.0, 0.0, 0.0)) - 4.0 * (-(30.0_f64 / 35.0).powi(2)).exp()).abs() < 1e-9);
    assert!((from(V3::new(3.0_f64.sqrt(), -1.0, 0.0)) - 4.0).abs() < 1e-9);
    assert!((from(V3::new(0.0, 100.0, 0.0)) + 8.0).abs() < 1e-3);
}

#[test]
fn from_across_the_pad_it_is_a_roar_and_from_ten_kilometres_a_rumble() {
    let pad = listener(Seat::Standing, V3::new(150.0, 1.7, 0.0));
    let near = [heard(pad.ears.at, V3::new(0.0, 1.7, 0.0), 1.0)];
    let mixed = mix(&hearing(pad, Now::default(), &near));
    // 128.2 dB at 150 m, 1.9 more abeam of the fire: a gain of 0.56, squeezed two decibels to one.
    assert!((mixed.level - 130.07).abs() < 0.05, "{}", mixed.level);
    assert!((mixed.engine.roar - 0.562).abs() < 0.01, "{}", mixed.engine.roar);
    assert!(mixed.engine.cutoff > 8000.0, "150 m of air takes little: {}", mixed.engine.cutoff);
    assert!(mixed.engine.pan < -0.99, "it is to the left of ears that face along z: {}", mixed.engine.pan);
    assert!(mixed.engine.echo[1] > 0.5, "the ground sends it back");
    let far = listener(Seat::Standing, V3::new(10_000.0, 1.7, 0.0));
    let distant = [heard(far.ears.at, V3::new(0.0, 1.7, 0.0), 1.0)];
    let faint = mix(&hearing(far, Now::default(), &distant));
    // 36.5 dB less for the distance; the air takes the crackle (90 dB at 2 kHz) and leaves the rumble.
    assert!((mixed.level - faint.level - 36.48).abs() < 0.05);
    assert_eq!(faint.engine.crackle, 0.0);
    assert!(faint.engine.rumble > 0.03 && faint.engine.cutoff < 400.0, "{:?}", faint.engine);
    assert!(faint.engine.width < 0.21, "far off it is a point");
}

#[test]
fn nothing_comes_through_a_vacuum_and_two_images_are_louder_than_one() {
    let beside = listener(Seat::Beside, V3::new(60.0, 0.0, 0.0));
    let airless = [heard(beside.ears.at, V3::ZERO, 0.0)];
    let mixed = mix(&hearing(beside, Now::default(), &airless));
    assert_eq!((mixed.engine.roar, mixed.engine.rumble, mixed.engine.crackle), (0.0, 0.0, 0.0));
    // Thin air at the ears is as good as thin air at the engine.
    let thin = Listener { carries: 0.0, ..beside };
    let whole = [heard(beside.ears.at, V3::ZERO, 1.0)];
    assert_eq!(mix(&hearing(thin, Now::default(), &whole)).engine.roar, 0.0);
    let one = mix(&hearing(beside, Now::default(), &whole));
    let two = [whole[0], whole[0]];
    assert!((mix(&hearing(beside, Now::default(), &two)).level - one.level - 3.01).abs() < 0.01);
    assert_eq!(mix(&hearing(beside, Now::default(), &[])).engine.roar, 0.0);
}

#[test]
fn in_the_cabin_the_structure_carries_it_and_the_wall_keeps_most_of_the_rest_out() {
    let power = Craft::of(&PLAN.engine).power(PLAN.engine.thrust.value);
    let seat = listener(Seat::Inside, V3::ZERO);
    let on_pad = Now { power, carries: 1.0, standoff: 17.855, ..Now::default() };
    let mixed = mix(&hearing(seat, on_pad, &[]));
    // 151.7 dB ten metres from the fire, of which the structure brings 105.7 to the seat. Outside the cabin,
    // 17.9 m ahead of the fire, it is 138.6 dB (TM X-53107 measured 123 at 1000 c/s there), and the wall and the
    // helmet leave 98.6 of that. Together 106.4: under SP-45's 110 at the ear, which is the air's at max q.
    assert!((mixed.level - 106.45).abs() < 0.1, "{}", mixed.level);
    assert!((mixed.engine.roar - (0.1385 + 0.0924)).abs() < 0.003, "{}", mixed.engine.roar);
    assert!(mixed.engine.cutoff > 600.0 && mixed.engine.shift == 1.0);
    // Out of the air only the structure is left, and that is a low rumble.
    let coasting = mix(&hearing(seat, Now { power, carries: 0.0, ..Now::default() }, &[]));
    assert!((coasting.engine.roar - 0.1387).abs() < 0.002 && coasting.engine.cutoff < 181.0);
    // The fans and the inverters are there whatever the engine does, and nowhere but in the cabin.
    assert!((mixed.cabin[0] - 0.01122).abs() < 1e-4 && mixed.cabin[1] > 0.0);
    assert_eq!(mix(&hearing(listener(Seat::Beside, V3::ZERO), on_pad, &[])).cabin, [0.0; 2]);
}

#[test]
fn the_air_on_the_skin_follows_dynamic_pressure_and_is_roughest_through_mach_one() {
    // At Mach 1 and 20 kPa: 105 Pa under the attached layer and 450 under the separated flow, which is the
    // 150 dB outside the spacecraft of SP-45's Table 10-IV.
    let [attached, separated] = skin(20_000.0, 1.0);
    assert!((attached - 105.26).abs() < 0.01 && (separated - 450.0).abs() < 0.01);
    assert!((level_of(attached + separated) - 148.9).abs() < 0.1);
    assert_eq!(skin(20_000.0, 0.5)[1], 0.0);
    let seat = listener(Seat::Inside, V3::ZERO);
    let at =
        |q: f64, mach: f64, seat: Listener| mix(&hearing(seat, Now { q, mach, ..Now::default() }, &[])).air;
    let (max_q, low) = (at(28_000.0, 1.6, seat), at(2000.0, 0.3, seat));
    assert!(max_q.gain > 3.0 * low.gain && max_q.buffet > 0.0 && low.buffet == 0.0, "{max_q:?} {low:?}");
    assert_eq!(at(0.0, 0.0, seat).gain, 0.0);
    assert!(at(20_000.0, 1.0, seat).flutter[0] > 0.45, "it flutters through Mach 1");
    // Flying beside, the wind is on the ears; standing on the ground, it is not heard at all.
    assert!(at(28_000.0, 1.6, listener(Seat::Beside, V3::ZERO)).gain > 0.1);
    assert_eq!(at(28_000.0, 1.6, listener(Seat::Standing, V3::ZERO)).gain, 0.0);
    // Under the main parachute it is a whisper in the lines, and down it is gone.
    let under = Now { q: 40.0, mach: 0.03, main: Some(30.0), drogue: Some(60.0), ..Now::default() };
    let whisper = mix(&hearing(seat, under, &[])).air;
    assert!(whisper.gain > 0.005 && whisper.gain < 0.05 && whisper.flutter[0] > 0.5, "{whisper:?}");
    assert_eq!(mix(&hearing(seat, Now { down: Some(1.0), ..under }, &[])).air.gain, 0.0);
}

#[test]
fn the_place_is_heard_at_its_ground_and_the_sea_round_a_spacecraft_that_is_down() {
    let pad = listener(Seat::Standing, V3::new(100.0, 1.7, 0.0));
    let [wind, water, lap, hum] = mix(&hearing(pad, Now::default(), &[])).place;
    assert!(
        (wind - 0.05).abs() < 1e-4
            && (water - 0.035).abs() < 1e-4
            && lap == 0.0
            && (hum - 0.006).abs() < 1e-4
    );
    // Half a kilometre up it is half as loud; fifty kilometres off, or out of the air, it is gone.
    let up = Listener { above: 500.0, ..pad };
    assert!((mix(&hearing(up, Now::default(), &[])).place[0] - 0.025).abs() < 1e-4);
    let off = Listener { off: 50_000.0, ..pad };
    assert_eq!(mix(&hearing(off, Now::default(), &[])).place, [0.0; 4]);
    // In the cabin with the hatch shut it is a tenth (forty decibels, squeezed).
    let shut = Listener { seat: Seat::Inside, ..pad };
    assert!((mix(&hearing(shut, Now::default(), &[])).place[0] - 0.005).abs() < 1e-5);
    // Afloat, far from the site: the sea lapping, and some wind.
    let afloat = Now { afloat: true, down: Some(5.0), ..Now::default() };
    let beside = Listener { seat: Seat::Beside, off: 480_000.0, ..pad };
    let [wind, water, lap, hum] = mix(&hearing(beside, afloat, &[])).place;
    assert!((wind - 0.04).abs() < 1e-9 && (water - 0.12).abs() < 1e-9 && lap == 1.0 && hum == 0.0);
}

#[test]
fn the_jets_are_under_the_cabins_bed_and_silent_in_space() {
    let firing = Now { jets: 107.0, distance: 30.0, carries: 0.0, ..Now::default() };
    let inside = mix(&hearing(listener(Seat::Inside, V3::ZERO), firing, &[]));
    assert!(inside.jets > 0.0 && inside.jets < inside.cabin[0], "{} {:?}", inside.jets, inside.cabin);
    let beside = Listener { carries: 0.0, ..listener(Seat::Beside, V3::ZERO) };
    assert_eq!(mix(&hearing(beside, firing, &[])).jets, 0.0);
    let low = Now { carries: 1.0, ..firing };
    assert!(mix(&hearing(listener(Seat::Beside, V3::ZERO), low, &[])).jets > 0.02);
    assert_eq!(mix(&hearing(listener(Seat::Inside, V3::ZERO), Now::default(), &[])).jets, 0.0);
}
