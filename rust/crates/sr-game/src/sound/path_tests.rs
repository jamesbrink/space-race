//! The retarded-time solve against answers worked by hand: a source standing, going, coming, flown alongside,
//! and passing overhead at twice the speed of sound.

use super::*;

const C: f64 = 340.0;

fn past(t: f64, at: V3, velocity: V3) -> Past {
    Past { t, at, velocity, axis: V3::Y, power: 1.0, sound: C, carries: 1.0, pressure: 101_325.0, mach: 0.0 }
}

/// A source that has moved steadily since `from`, sampled every 50 ms up to `now`.
fn steady(from: f64, now: f64, at: impl Fn(f64) -> V3, velocity: V3) -> History {
    let mut history = History::new(0.05, 600.0);
    let mut t = from;
    while t < now {
        history.push(past(t, at(t), velocity));
        t += 0.01;
    }
    history.push(past(now, at(now), velocity));
    history
}

fn ears(at: V3, velocity: V3) -> Ears {
    Ears { at, velocity, sound: C }
}

#[test]
fn a_source_standing_340_m_off_is_heard_a_second_late_at_its_own_pitch() {
    let history = steady(-10.0, 5.0, |_| V3::new(340.0, 0.0, 0.0), V3::ZERO);
    let heard = history.heard(5.0, &ears(V3::ZERO, V3::ZERO));
    assert_eq!(heard.len(), 1);
    assert!((heard[0].delay - 1.0).abs() < 1e-6 && (heard[0].distance - 340.0).abs() < 1e-6);
    assert!((heard[0].doppler - 1.0).abs() < 1e-12);
    // The sound is travelling from it to the ears.
    assert!((heard[0].toward.x + 1.0).abs() < 1e-12);
}

#[test]
fn going_at_half_the_speed_of_sound_it_is_heard_two_thirds_as_high_and_coming_twice() {
    // Going: te + 170 te / 340 = now, so te is two thirds of now.
    let going = V3::new(170.0, 0.0, 0.0);
    let history = steady(0.0, 30.0, |t| going * t, going);
    let heard = history.heard(30.0, &ears(V3::ZERO, V3::ZERO));
    assert_eq!(heard.len(), 1);
    assert!((heard[0].past.t - 20.0).abs() < 1e-4, "{}", heard[0].past.t);
    assert!((heard[0].doppler - 2.0 / 3.0).abs() < 1e-9);
    // Coming, from 10.2 km off: 1 / (1 - 0.5).
    let history = steady(0.0, 30.0, |t| V3::new(10_200.0, 0.0, 0.0) - going * t, -going);
    let heard = history.heard(30.0, &ears(V3::ZERO, V3::ZERO));
    assert!((heard[0].doppler - 2.0).abs() < 1e-9);
    // Nothing is heard before the first of its sound has had time to arrive: 10.2 km is 30 s.
    assert_eq!(history.heard(29.0, &ears(V3::ZERO, V3::ZERO)).len(), 0);
}

#[test]
fn flown_alongside_it_is_heard_at_its_own_pitch_and_later_than_the_gap() {
    // Abeam at 100 m, both at half the speed of sound: the sound has to make up the ground the ears cover, so
    // it takes 100 / sqrt(c^2 - v^2) and not 100 / c.
    let v = V3::new(170.0, 0.0, 0.0);
    let history = steady(0.0, 20.0, |t| v * t, v);
    let beside = ears(v * 20.0 + V3::new(0.0, 0.0, 100.0), v);
    let heard = history.heard(20.0, &beside);
    assert_eq!(heard.len(), 1);
    assert!((heard[0].delay - 100.0 / (C * C - 170.0 * 170.0).sqrt()).abs() < 1e-5, "{}", heard[0].delay);
    assert!((heard[0].doppler - 1.0).abs() < 1e-9, "{}", heard[0].doppler);
}

#[test]
fn passing_overhead_at_mach_two_it_is_silent_until_its_cone_arrives_and_then_heard_twice_over() {
    // A kilometre up at 680 m/s, overhead at t = 0. The cone's half-angle is 30 degrees, so it reaches the ears
    // when the source is 1000 sqrt(3) m past them: t = 2.547 s. That wave left it 60 degrees off its path,
    // 577 m short of overhead, and came 1155 m.
    let v = V3::new(2.0 * C, 0.0, 0.0);
    let at = |t: f64| V3::new(0.0, 1000.0, 0.0) + v * t;
    let listener = ears(V3::ZERO, V3::ZERO);
    let arrives = 1000.0 * 3.0_f64.sqrt() / (2.0 * C);
    let mut cone = Cone::default();
    let mut history = History::new(0.05, 600.0);
    let (mut boom, mut t) = (None, -20.0);
    while t < 8.0 {
        history.push(Past { mach: 2.0, ..past(t, at(t), v) });
        let heard = history.heard(t, &listener);
        if t < arrives - 0.02 {
            assert!(heard.is_empty(), "heard at {t}");
        } else if t > arrives + 0.02 {
            assert_eq!(heard.len(), 2, "at {t}");
        }
        if let Some(from) = cone.sweep(t, &heard) {
            assert!(boom.is_none(), "one boom");
            boom = Some((t, from));
        }
        t += 0.01;
    }
    let (when, from) = boom.expect("a boom");
    assert!((when - arrives).abs() < 0.015, "{when} against {arrives}");
    assert!((from.past.at.x + 1000.0 / 3.0_f64.sqrt()).abs() < 40.0, "{}", from.past.at.x);
    assert!((from.distance - 2000.0 / 3.0_f64.sqrt()).abs() < 15.0, "{}", from.distance);
    assert!((from.past.mach - 2.0).abs() < 1e-9);
    // Long after, one image is of it coming (heard backwards) and one of it going, a third as high.
    let heard = history.heard(7.99, &listener);
    assert!(heard[0].past.at.x > 0.0 && heard[1].past.at.x < 0.0);
    assert!(heard[0].doppler < 0.45 && heard[1].doppler > 1.0);
}

#[test]
fn close_behind_at_mach_three_both_images_are_found_though_they_left_within_one_step_of_each_other() {
    // Thirty metres behind, both at 1020 m/s: what it sends back is met after 30 / (v + c) = 22 ms, and what it
    // sent forward from behind where the ears now are is caught up with after 30 / (v - c) = 44 ms. Both left
    // it inside one twentieth of a second.
    let v = V3::new(3.0 * C, 0.0, 0.0);
    let history = steady(0.0, 20.0, |t| v * t, v);
    let heard = history.heard(20.0, &ears(v * 20.0 - V3::new(30.0, 0.0, 0.0), v));
    assert_eq!(heard.len(), 2);
    assert!((heard[0].delay - 30.0 / (4.0 * C)).abs() < 1e-6, "{}", heard[0].delay);
    assert!((heard[1].delay - 30.0 / (2.0 * C)).abs() < 1e-6, "{}", heard[1].delay);
    // Going with it, both are at their own pitch.
    assert!((heard[0].doppler - 1.0).abs() < 1e-9 && (heard[1].doppler - 1.0).abs() < 1e-9);
    // Thirty metres to one side it has outrun everything: its cone is 19.5 degrees wide.
    assert_eq!(history.heard(20.0, &ears(v * 20.0 + V3::new(0.0, 0.0, 30.0), v)).len(), 0);
}

#[test]
fn a_source_slower_than_sound_makes_no_boom() {
    let v = V3::new(0.9 * C, 0.0, 0.0);
    let at = |t: f64| V3::new(0.0, 300.0, 0.0) + v * t;
    let (mut cone, mut history) = (Cone::default(), History::new(0.05, 600.0));
    let mut t = -30.0;
    while t < 30.0 {
        history.push(past(t, at(t), v));
        assert!(cone.sweep(t, &history.heard(t, &ears(V3::ZERO, V3::ZERO))).is_none(), "at {t}");
        t += 0.01;
    }
}

#[test]
fn the_history_keeps_a_step_between_its_instants_and_no_more_than_its_span() {
    let mut history = History::new(0.05, 2.0);
    for i in 0..=1000 {
        history.push(past(f64::from(i) * 0.01, V3::ZERO, V3::ZERO));
    }
    // Ten seconds at a hundredth: two seconds are kept, a twentieth apart or a little more, and the newest is the
    // last given.
    assert!((34..=43).contains(&history.len()), "{}", history.len());
    assert_eq!(history.latest().map(|past| past.t), Some(10.0));
    // A clock put back takes the history with it.
    history.push(past(-5.0, V3::ZERO, V3::ZERO));
    assert_eq!(history.len(), 1);
    history.clear();
    assert!(history.is_empty());
}
