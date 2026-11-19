//! A print for each hour: the film's day print, a dawn's, a dusk's and a night's, chosen by where the Sun is and
//! blended as it moves, so the print never steps ([`crate::night::Dusk`]: `low`, `morning`, `night`).
//!
//! Taken from Operation Flashpoint: Dragon Rising's own stills of its hours (rust/docs/look.md, "The hours"): a
//! low Sun is a sepia print, amber in the light and umber in the shade, harder, with the sky's colour kept; its
//! mornings cooler and paler than its evenings; its night a cold blue-teal in which the only warm thing is
//! whatever is lit by a lamp, with the shade opened so the land still reads. Every figure is a judgement of the eye
//! against those stills: none is measured.

use bevy::prelude::*;

use crate::night::Dusk;
use crate::print::Print;

/// Dawn: the low Sun's print in the morning. Pale gold light over cool blue shade and a held haze; colour kept a
/// little more than by day, so the sky's pinks and golds show. Estimated.
const DAWN: Print = Print {
    shade: Vec4::new(0.05, 0.13, 0.24, 0.85),
    light: Vec4::new(1.0, 0.78, 0.52, 0.0),
    lift: Vec4::new(0.12, 0.13, 0.18, 0.15),
    colour: 0.65,
    contrast: 6.0,
    pivot: 0.42,
    gain: 1.05,
    corners: 0.45,
    falloff: 0.5,
    grain: 0.055,
    frame: 0.0,
};

/// Dusk: the low Sun's print in the evening. Amber light, warm umber shade pressed down, harder in the middle:
/// the sepia of Dragon Rising's burning-helicopter and convoy-at-sunset stills. Estimated.
const DUSK: Print = Print {
    shade: Vec4::new(0.1, 0.08, 0.07, 0.9),
    light: Vec4::new(1.0, 0.76, 0.48, 0.0),
    lift: Vec4::new(0.14, 0.1, 0.07, 0.1),
    colour: 0.55,
    contrast: 6.5,
    pivot: 0.45,
    gain: 1.0,
    corners: 0.4,
    falloff: 0.55,
    grain: 0.06,
    frame: 0.0,
};

/// Night: blue-teal in the shade, the light still warm so that a lamp's pool is the one warm thing in the frame,
/// colour held back hard but not so hard the lamps lose their warmth, and the black lifted toward a deep blue so
/// a moonlit pad still reads. Grain heavier, as a fast film's is. Estimated.
const NIGHT: Print = Print {
    shade: Vec4::new(0.0, 0.12, 0.26, 0.95),
    light: Vec4::new(1.0, 0.86, 0.64, 0.0),
    lift: Vec4::new(0.1, 0.16, 0.26, 0.5),
    colour: 0.55,
    contrast: 4.0,
    pivot: 0.36,
    gain: 1.15,
    corners: 0.4,
    falloff: 0.6,
    grain: 0.075,
    frame: 0.0,
};

/// How far the bloom spreads by night (Bevy's low-frequency boost), against the day's: drawn in, so a lamp is a hot
/// head with a glow round it and not a ball of light as wide as the pole is tall. Estimated.
const NIGHT_BOOST: f32 = 0.35;

/// The bloom's spread for the hour, from the day's.
#[must_use]
pub fn bloom_boost(day: f32, dusk: &Dusk) -> f32 {
    day + (NIGHT_BOOST - day) * dusk.night
}

/// The print for the hour, from the day's.
#[must_use]
pub fn print(day: &Print, dusk: &Dusk) -> Print {
    let low = DUSK.toward(&DAWN, dusk.morning);
    day.toward(&low, dusk.low).toward(&NIGHT, dusk.night)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_day_is_the_day_and_nothing_steps() {
        let day = DUSK.toward(&DAWN, 0.5);
        let noon = Dusk::default();
        assert_eq!(print(&day, &noon), day);
        let mut last = print(&day, &noon);
        for i in 0..400 {
            let sun = 30.0 - i as f32 * 0.125;
            let low = crate::night::dusk_weights(sun);
            let now = print(&day, &Dusk { sun, low: low.0, night: low.1, ..noon });
            assert!((now.contrast - last.contrast).abs() < 0.05, "a step at {sun}");
            assert!((now.colour - last.colour).abs() < 0.01, "a step at {sun}");
            last = now;
        }
    }
}
