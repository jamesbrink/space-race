//! Freedom 7 flown without an engine and held against its record: the misses are written down, not fitted away.

use sr_missions::usa::mercury::mr3::{FLIGHT, MISSES};
use sr_sim::fly::{Flown, fly};
use sr_sim::loads::Moment;
use sr_sim::predict::coast;
use sr_sim::{Body, Field, Sequence};
use sr_world::V3;

fn flown() -> Flown {
    fly(&FLIGHT.plan, &FLIGHT.site.site(), FLIGHT.site.above_sea())
}

fn simulated(f: &Flown) -> [f64; 5] {
    [f.apogee, f.range, f.separation_speed, f.entry_g, f.sequence.landed.unwrap_or(f64::NAN)]
}

#[test]
fn the_table_of_misses_is_what_the_simulator_makes() {
    let f = flown();
    let mut stale = Vec::new();
    for (check, made) in MISSES.iter().zip(simulated(&f)) {
        let miss = 100.0 * (made / check.recorded.value - 1.0);
        eprintln!("{}: recorded {:.1}, simulated {made:.1} ({miss:+.1}%)", check.label, check.recorded.value);
        if (made / check.simulated - 1.0).abs() > 0.005 {
            stale.push(format!(
                "{}: the table says {}, the simulator makes {made:.1}",
                check.label, check.simulated
            ));
        }
    }
    assert!(stale.is_empty(), "correct the table, do not tune the flight:\n{}", stale.join("\n"));
}

#[test]
fn it_flies_the_flight_that_was_flown_near_enough_to_show() {
    // Not the web build's tolerances (2 per cent): this build flies the standard day with no wind and a round
    // Earth. Fifteen per cent says the physics is the flight's, not that the figures are right.
    let f = flown();
    for (check, made) in MISSES.iter().zip(simulated(&f)) {
        assert!(
            (made / check.recorded.value - 1.0).abs() < 0.15,
            "{}: {made} against {}",
            check.label,
            check.recorded.value
        );
    }
    let s = f.sequence;
    assert!(s.apogee < s.drogue && s.drogue < s.main && s.main < s.landed);
}

#[test]
fn the_flight_as_flown_stays_well_inside_what_its_structure_stands() {
    let f = flown();
    eprintln!("nearest its limits: {:.2}", f.stress);
    assert!(f.stress < 0.7, "{}", f.stress);
}

#[test]
fn the_flight_says_which_of_its_figures_are_estimates() {
    let estimates = FLIGHT.plan.estimates();
    assert!(estimates.iter().any(|s| s.contains("Figure 4-9")), "the tilt curve is an estimate");
}

#[test]
fn the_path_ahead_of_a_capsule_above_the_air_is_its_conic_and_comes_down() {
    let field = Field::at(&FLIGHT.site.site(), FLIGHT.site.above_sea());
    // 2 km/s up and 1 km/s along, from 100 km: far above the air, so the conic is the answer until it is back in it.
    let from = Moment {
        t: 150.0,
        position: V3::new(0.0, 100_000.0, 0.0),
        velocity: V3::new(1000.0, 2000.0, 0.0),
        axis: V3::Y,
    };
    let ahead = coast(&FLIGHT.plan, &field, Body::Capsule, &from, 1295.0, &Sequence::default());
    let top = ahead.top.map(|i| field.height(ahead.path[i])).expect("it has a top");
    let conic = field.apogee(from.position, from.velocity).expect("it comes back");
    assert!((top / conic - 1.0).abs() < 0.01, "{top} against {conic}");
    assert!(ahead.lands && ahead.path.len() > 100, "{} places, down: {}", ahead.path.len(), ahead.lands);
}

#[test]
fn the_path_ahead_at_separation_is_the_rest_of_the_flight_less_its_retrorockets() {
    // From the simulator's own state as the capsule leaves the booster, the coast ahead tops out where the flight
    // did, and comes down further on: the retrorockets, which the coast does not fire, took some 130 m/s off its
    // speed along the ground for the five minutes that were left, which is the 30 km.
    let f = flown();
    let field = Field::at(&FLIGHT.site.site(), FLIGHT.site.above_sea());
    let at = f.path.iter().find(|s| s.t >= FLIGHT.plan.separation.value + 1.0).expect("it separated");
    let from = Moment { t: at.t, position: at.position, velocity: at.velocity, axis: V3::Y };
    let mass = FLIGHT.plan.capsule_mass.value;
    let ahead = coast(&FLIGHT.plan, &field, Body::Capsule, &from, mass, &Sequence::default());
    let down = field.range(*ahead.path.last().expect("a path"));
    assert!(ahead.lands);
    assert!(down > f.range + 15_000.0 && down < f.range + 50_000.0, "{down} against {}", f.range);
    let top = ahead.top.map(|i| field.height(ahead.path[i])).expect("it has a top");
    assert!((top / f.apogee - 1.0).abs() < 0.01, "{top} against {}", f.apogee);
}
