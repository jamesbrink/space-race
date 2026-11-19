//! When the flight is over: what it came to, beside what the flight that was flown came to. The record is the
//! mark to fly at, so the pilot is shown how near they came, figure by figure.

use sr_missions::Flight;
use sr_missions::types::Figure;

use crate::flight::Hand;
use crate::flight::log::Log;
use crate::hud::{clock_reading, length_reading};

/// A figure as it is read: a length, a speed, a load or a time.
fn reading(figure: Figure, value: f64) -> String {
    match figure {
        Figure::Top | Figure::Range => length_reading(value),
        Figure::SeparationSpeed => format!("{value:.0} m/s"),
        Figure::EntryLoad => format!("{value:.1} g"),
        Figure::Landing => clock_reading(value),
    }
}

/// How far off the record a figure is, in words a pilot would use.
fn off(made: f64, recorded: f64) -> String {
    let part = 100.0 * (made / recorded - 1.0);
    if part.abs() < 0.5 { "on the mark".to_owned() } else { format!("{part:+.0} %") }
}

/// The debrief: a line of what happened, then each of the record's figures, the pilot's beside it.
#[must_use]
pub fn debrief(flight: &Flight, log: &Log, hand: &Hand) -> String {
    let ended = match (hand.lost, log.down) {
        (Some(loss), _) => format!("LOST at {}: {}", clock_reading(loss.t), loss.reading()),
        (None, Some(down)) => format!("DOWN at {}, the capsule whole", clock_reading(down)),
        (None, None) => String::new(),
    };
    let mut lines = vec![ended, format!("{:<32}{:>12}{:>12}", "", "yours", flight.name)];
    for check in flight.misses {
        let made = log.made(check.figure);
        let yours = made.map_or_else(|| "none".to_owned(), |made| reading(check.figure, made));
        let theirs = reading(check.figure, check.recorded.value);
        let near = made.map_or_else(String::new, |made| off(made, check.recorded.value));
        lines.push(format!("{:<32}{yours:>12}{theirs:>12}   {near}", check.label));
    }
    let strain = format!("{:.0} % of what it stands", log.strain * 100.0);
    lines.push(format!("{:<32}{strain}", "Hardest on the structure"));
    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use sr_missions::usa::mercury::mr3::FLIGHT;

    use super::*;

    #[test]
    fn a_flight_flown_to_the_record_is_told_so_and_one_that_was_not_is_told_by_how_much() {
        let hand = Hand::new(&FLIGHT.plan, -12.0);
        let recorded =
            |figure| FLIGHT.misses.iter().find(|check| check.figure == figure).map(|c| c.recorded.value);
        let log = Log {
            top: recorded(Figure::Top).unwrap(),
            range: recorded(Figure::Range).unwrap() * 1.1,
            separation: None,
            entry: 11.0,
            strain: 0.52,
            down: Some(922.0),
        };
        let says = debrief(&FLIGHT, &log, &hand);
        assert!(says.starts_with("DOWN at T+15:22.0"), "{says}");
        assert!(says.contains("on the mark") && says.contains("+10 %"), "{says}");
        assert!(says.contains("none"), "it never left its booster: {says}");
        assert!(says.contains("52 % of what it stands"), "{says}");
    }
}
