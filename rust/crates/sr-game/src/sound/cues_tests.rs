//! The things that happen once: when they arrive, how loud, and the boom's size against Carlson's formula.

use super::*;
use crate::sound::model::{Listener, Seat};
use crate::sound::path::{Ears, Past};

fn listener(seat: Seat, at: V3, carries: f64) -> Listener {
    Listener {
        seat,
        ears: Ears { at, velocity: V3::ZERO, sound: 340.0 },
        right: V3::new(1.0, 0.0, 0.0),
        above: at.y,
        off: 0.0,
        carries,
        pressure: 101_325.0 * carries,
        reflection: 1.0,
    }
}

fn happening(cue: Cue, loud: Loud, carries: f64) -> Happening {
    Happening { cue, t: 100.0, at: V3::ZERO, loud, seconds: 13.2, sound: 340.0, carries }
}

#[test]
fn a_kind_has_its_number_and_a_number_its_kind() {
    for cue in Cue::ALL {
        assert_eq!(Cue::from_code(cue.code()), Some(cue));
    }
    assert_eq!(Cue::from_code(Cue::ALL.len() as u32), None);
}

#[test]
fn it_is_heard_after_its_distance_of_air_or_at_once_through_the_structure() {
    let bolt = happening(Cue::Bolt, Loud::Bang(150.0), 1.0);
    let off = listener(Seat::Standing, V3::new(340.0, 0.0, 0.0), 1.0);
    assert!((bolt.arrives(&off) - 101.0).abs() < 1e-9);
    assert_eq!(bolt.arrives(&listener(Seat::Inside, V3::new(340.0, 0.0, 0.0), 1.0)), 100.0);
    // 150 dB at a metre is 99.4 at 340 m, less 3.1 the air takes at 2 kHz; and it is to the left.
    let (shot, level) = bolt.shot(&off).unwrap();
    assert!((level - (150.0 - 50.63 - 3.06)).abs() < 0.05, "{level}");
    assert!((shot.pan + 1.0).abs() < 1e-6 && shot.cutoff < 16_000.0 && shot.cue == Cue::Bolt);
}

#[test]
fn a_retrorocket_is_heard_aboard_and_not_beside_where_there_is_no_air() {
    let retro = happening(Cue::Rocket, Happening::rocket(4413.0), 0.0);
    assert!(retro.shot(&listener(Seat::Beside, V3::new(30.0, 0.0, 0.0), 0.0)).is_none());
    // 26.5 kW of sound, 133.2 dB ten metres off: less 24 for the bolting and 20 for the helmet.
    let (shot, level) = retro.shot(&listener(Seat::Inside, V3::ZERO, 0.0)).unwrap();
    assert!((level - 89.2).abs() < 0.2, "{level}");
    assert_eq!((shot.seconds, shot.pan, shot.cutoff), (13.2, 0.0, 900.0));
    // A relay is the cabin's own, and nobody outside hears it.
    let relay = happening(Cue::Relay, Loud::Cabin(66.0), 1.0);
    assert!(relay.shot(&listener(Seat::Standing, V3::new(5.0, 0.0, 0.0), 1.0)).is_none());
    assert!(relay.shot(&listener(Seat::Inside, V3::ZERO, 1.0)).is_some());
}

fn passing(mach: f64, distance: f64, pressure: f64) -> Heard {
    let past = Past {
        t: 0.0,
        at: V3::new(0.0, distance, 0.0),
        velocity: V3::new(mach * 300.0, 0.0, 0.0),
        axis: V3::Y,
        power: 0.0,
        sound: 300.0,
        carries: pressure / 101_325.0,
        pressure,
        mach,
    };
    Heard { past, distance, delay: distance / 300.0, doppler: 1.0, toward: V3::new(0.0, -1.0, 0.0) }
}

#[test]
fn the_capsule_coming_down_is_a_double_thump_at_the_sea_and_the_stack_close_by_is_a_blow() {
    // The capsule at Mach 1.5 and 25 km (2549 Pa), heard on the sea: Carlson's formula with the capsule's shape
    // factor gives 26.9 Pa, 122.6 dB, and a third of a second from shock to shock. Apollo's command modules, a
    // little larger, measured 17 to 38 Pa and 0.14 to 0.39 s from such heights (TN D-6950, TN D-7606).
    let sea = Listener { reflection: 1.9, ..listener(Seat::Standing, V3::ZERO, 1.0) };
    let shape = crate::sound::figures::SHAPE_CAPSULE.value;
    let (shot, level) = boom(&passing(1.5, 25_000.0, 2549.0), &sea, 2.984, shape, None).unwrap();
    assert!((level - 122.6).abs() < 0.2, "{level}");
    assert!((shot.seconds - 0.337).abs() < 0.005 && shot.rise == 0.005, "{}", shot.seconds);
    assert!(shot.gain > 0.3 && shot.gain < 0.45 && shot.cue == Cue::Boom);
    // The whole vehicle at Mach 1.5 sixty metres from a camera at 12 km: 150 dB and more, a blow.
    let chase = listener(Seat::Beside, V3::ZERO, 0.19);
    let (near, level) = boom(&passing(1.5, 60.0, 19_400.0), &chase, 25.4, 0.09, None).unwrap();
    assert!(level > 145.0 && near.gain > 1.0, "{level}");
    // What the sea sends back is a little less than what went down, and nobody aboard hears their own.
    let (_, back) = boom(&passing(1.5, 60.0, 19_400.0), &chase, 25.4, 0.09, Some(0.95)).unwrap();
    assert!(back < level && level - back < 1.0);
    let aboard = Listener { seat: Seat::Inside, ..chase };
    assert!(boom(&passing(1.5, 60.0, 19_400.0), &aboard, 25.4, 0.09, None).is_none());
}
