//! What the air does to a sound on its way: takes the high frequencies first, carries less the thinner it is and
//! nothing in a vacuum, and passes it at a speed that depends on how cold it is. And what a level is on a
//! loudspeaker, which is a choice. The web build's `src/sound/model.ts`, figure for figure.

use sr_sim::air;

use super::figures::{EFFICIENCY, FLOOR, FULL, NEAR, SQUEEZE};

/// The reference sound pressure, Pa, and intensity, W/m^2: 0 dB.
pub const P_REF: f64 = 2.0e-5;
const I_REF: f64 = 1.0e-12;

/// ISO 9613-1: what air at 20 C and 70 % relative humidity takes from a pure tone, dB a kilometre, by octave
/// band (Hz). Recomputed from the standard's equations 3 to 5 at the exact mid-bands in November 2026: the same
/// to the decimal. Taken for the whole path, though the air aloft is neither.
const ABSORPTION: [(f64, f64); 8] = [
    (63.0, 0.1),
    (125.0, 0.3),
    (250.0, 1.1),
    (500.0, 2.8),
    (1000.0, 5.0),
    (2000.0, 9.0),
    (4000.0, 22.9),
    (8000.0, 76.6),
];

/// A smooth step from nought at `from` to one at `to`.
#[must_use]
pub fn smoothstep(from: f64, to: f64, x: f64) -> f64 {
    let k = ((x - from) / (to - from)).clamp(0.0, 1.0);
    k * k * (3.0 - 2.0 * k)
}

/// What the air takes from a tone of `hertz`, dB a kilometre: read between the table's bands in the logarithm,
/// and as the square of the frequency beyond its ends.
#[must_use]
pub fn absorption(hertz: f64) -> f64 {
    let f = hertz.max(1.0);
    let (first, last) = (ABSORPTION[0], ABSORPTION[ABSORPTION.len() - 1]);
    if f <= first.0 {
        return first.1 * (f / first.0).powi(2);
    }
    if f >= last.0 {
        return last.1 * (f / last.0).powi(2);
    }
    let i = ABSORPTION.iter().position(|band| f <= band.0).unwrap_or(1).max(1);
    let ((f0, a0), (f1, a1)) = (ABSORPTION[i - 1], ABSORPTION[i]);
    a0 * (a1 / a0).powf((f / f0).ln() / (f1 / f0).ln())
}

/// What `metres` of air take from a tone of `hertz`, dB.
#[must_use]
pub fn absorbed(hertz: f64, metres: f64) -> f64 {
    absorption(hertz) * metres.max(0.0) / 1000.0
}

/// The frequency, Hz, above which `metres` of air have taken more than 12 dB: where a low-pass filter is put.
/// Between 40 Hz and 16 kHz.
#[must_use]
pub fn cutoff_after(metres: f64) -> f64 {
    let (mut lo, mut hi) = (40.0_f64.ln(), 16_000.0_f64.ln());
    if absorbed(16_000.0, metres) <= 12.0 {
        return 16_000.0;
    }
    if absorbed(40.0, metres) >= 12.0 {
        return 40.0;
    }
    for _ in 0..24 {
        let mid = f64::midpoint(lo, hi);
        if absorbed(mid.exp(), metres) > 12.0 {
            hi = mid;
        } else {
            lo = mid;
        }
    }
    f64::midpoint(lo, hi).exp()
}

/// How much of sea level's air there is at a height, for carrying sound: the density's share, and nothing at all
/// by 120 km, where the molecules are further apart than a sound's wavelength (the fade from 80 km is estimated).
#[must_use]
pub fn carries(height: f64) -> f64 {
    let h = height.max(0.0);
    (air::at(h).density / air::at(0.0).density).min(1.0) * (1.0 - smoothstep(80_000.0, 120_000.0, h))
}

/// The speed of sound over a path between two places where it is `a` and `b`, m/s: their harmonic mean.
#[must_use]
pub fn between(a: f64, b: f64) -> f64 {
    2.0 * a * b / (a + b)
}

/// Sound power, W, of a rocket of this thrust (N) and exhaust speed (m/s).
#[must_use]
pub fn acoustic_power(thrust: f64, exhaust_speed: f64) -> f64 {
    EFFICIENCY.value * 0.5 * thrust.max(0.0) * exhaust_speed
}

/// Sound pressure level, dB, `metres` from a source of `power` watts radiating evenly: inverse-square, and
/// nothing nearer than [`NEAR`].
#[must_use]
pub fn spl(power: f64, metres: f64) -> f64 {
    if power <= 0.0 || power.is_nan() {
        return f64::NEG_INFINITY;
    }
    let d = metres.max(NEAR.value);
    10.0 * (power / (4.0 * std::f64::consts::PI * d * d) / I_REF).log10()
}

/// A pressure, Pa, as a level, dB.
#[must_use]
pub fn level_of(pascals: f64) -> f64 {
    if pascals > 0.0 { 20.0 * (pascals / P_REF).log10() } else { f64::NEG_INFINITY }
}

/// Levels heard together, dB, as one: their powers added.
#[must_use]
pub fn together(levels: impl IntoIterator<Item = f64>) -> f64 {
    let power: f64 = levels.into_iter().map(|level| 10.0_f64.powf(level / 10.0)).sum();
    if power > 0.0 { 10.0 * power.log10() } else { f64::NEG_INFINITY }
}

/// The gain a level in dB is played at: [`FULL`] is 1, every [`SQUEEZE`] decibels of level one of gain, nothing
/// under [`FLOOR`].
#[must_use]
pub fn loudness(level: f64) -> f64 {
    if level.is_nan() || level <= FLOOR.value {
        return 0.0;
    }
    let gain = 10.0_f64.powf((level - FULL.value) / (20.0 * SQUEEZE.value));
    gain.min(1.4) * smoothstep(FLOOR.value, FLOOR.value + 12.0, level)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_air_takes_what_the_standard_says() {
        // The table's own bands, and between two of them in the logarithm.
        assert!((absorption(1000.0) - 5.0).abs() < 1e-9);
        assert!((absorption(4000.0) - 22.9).abs() < 1e-9);
        assert!((absorption(707.1) - (2.8_f64 * 5.0).sqrt()).abs() < 0.01);
        assert!((absorption(31.5) - 0.025).abs() < 1e-3);
        assert!((absorbed(2000.0, 500.0) - 4.5).abs() < 1e-9);
    }

    #[test]
    fn distance_takes_the_highs_first() {
        assert_eq!(cutoff_after(10.0), 16_000.0);
        // Twelve decibels gone at 1 kHz after 2.4 km of air, and at 4 kHz after 524 m.
        assert!((cutoff_after(2400.0) - 1000.0).abs() < 5.0, "{}", cutoff_after(2400.0));
        assert!((cutoff_after(524.0) - 4000.0).abs() < 20.0, "{}", cutoff_after(524.0));
        assert!(cutoff_after(60_000.0) < 200.0);
        assert_eq!(cutoff_after(1.0e9), 40.0);
    }

    #[test]
    fn nothing_is_carried_through_a_vacuum() {
        assert!((carries(0.0) - 1.0).abs() < 1e-12);
        // The standard atmosphere's density at 11 km is 0.2971 of the sea's.
        assert!((carries(11_019.0) - 0.2971).abs() < 2e-3, "{}", carries(11_019.0));
        assert!(carries(60_000.0) < 4e-4);
        assert_eq!(carries(120_000.0), 0.0);
        assert_eq!(carries(187_000.0), 0.0);
    }

    #[test]
    fn a_redstone_is_as_loud_as_a_rocket_of_its_thrust() {
        // 350.8 kN at 2106 m/s: 1.85 MW of sound, which is 182.7 dB of power and 128 dB at 150 m.
        let power = acoustic_power(350_787.0, 214.8 * 9.806_65);
        assert!((power - 1.847e6).abs() < 2e3, "{power}");
        assert!((spl(power, 150.0) - 128.15).abs() < 0.05, "{}", spl(power, 150.0));
        // Twice as far is 6 dB less, and nothing is nearer than ten metres.
        assert!((spl(power, 150.0) - spl(power, 300.0) - 6.0206).abs() < 1e-3);
        assert_eq!(spl(power, 1.0), spl(power, 10.0));
        assert_eq!(spl(0.0, 10.0), f64::NEG_INFINITY);
    }

    #[test]
    fn levels_are_squeezed_two_decibels_to_one() {
        assert!((loudness(140.0) - 1.0).abs() < 1e-12);
        assert!((loudness(100.0) - 0.1).abs() < 1e-12);
        assert!((loudness(60.0) - 0.01).abs() < 1e-12);
        assert_eq!(loudness(38.0), 0.0);
        assert_eq!(loudness(f64::NEG_INFINITY), 0.0);
        assert_eq!(loudness(200.0), 1.4);
        assert!((level_of(2.0e-5)).abs() < 1e-12 && (level_of(20.0) - 120.0).abs() < 1e-9);
        assert!((together([100.0, 100.0]) - 103.0103).abs() < 1e-3);
    }
}
