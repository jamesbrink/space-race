//! Freedom 7 flown without an engine and held against its record: the misses are written down, not fitted away.

use sr_missions::usa::mercury::mr3::{FLIGHT, MISSES};
use sr_sim::fly::{Flown, fly};

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
