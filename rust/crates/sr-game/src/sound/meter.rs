//! Measuring what was made, since nobody building this can hear it: level and peak, the power in a band of
//! frequencies, where the spectrum's weight lies, and when a sound first arrives.

use std::f32::consts::TAU;

use super::dsp::RATE;

/// Root-mean-square level and peak of some samples.
#[must_use]
pub fn level(samples: &[f32]) -> (f32, f32) {
    if samples.is_empty() {
        return (0.0, 0.0);
    }
    let square: f64 = samples.iter().map(|&x| f64::from(x) * f64::from(x)).sum();
    let peak = samples.iter().fold(0.0_f32, |peak, &x| peak.max(x.abs()));
    ((square / samples.len() as f64).sqrt() as f32, peak)
}

/// A level as decibels below full scale; silence is -120.
#[must_use]
pub fn db(level: f32) -> f32 {
    20.0 * level.max(1.0e-6).log10()
}

/// The fast Fourier transform, in place, of a power of two of complex samples (real and imaginary parts).
fn fft(re: &mut [f32], im: &mut [f32]) {
    let n = re.len();
    let mut j = 0;
    for i in 1..n {
        let mut bit = n >> 1;
        while j & bit != 0 {
            j ^= bit;
            bit >>= 1;
        }
        j |= bit;
        if i < j {
            re.swap(i, j);
            im.swap(i, j);
        }
    }
    let mut len = 2;
    while len <= n {
        let (sin, cos) = (-TAU / len as f32).sin_cos();
        for start in (0..n).step_by(len) {
            let (mut wr, mut wi) = (1.0_f32, 0.0_f32);
            for k in 0..len / 2 {
                let (a, b) = (start + k, start + k + len / 2);
                let (tr, ti) = (re[b] * wr - im[b] * wi, re[b] * wi + im[b] * wr);
                (re[b], im[b]) = (re[a] - tr, im[a] - ti);
                (re[a], im[a]) = (re[a] + tr, im[a] + ti);
                (wr, wi) = (wr * cos - wi * sin, wr * sin + wi * cos);
            }
        }
        len <<= 1;
    }
}

/// The power at each frequency, in bins spaced evenly from nought to half the rate: of the largest power of two of
/// the samples (at most 2^16), under a Hann window.
#[must_use]
pub fn spectrum(samples: &[f32]) -> Vec<f32> {
    let n = (samples.len().max(2).ilog2().min(16)) as usize;
    let n = 1 << n;
    if samples.len() < n {
        return Vec::new();
    }
    let mut re: Vec<f32> =
        (0..n).map(|i| samples[i] * (0.5 - 0.5 * (TAU * i as f32 / n as f32).cos())).collect();
    let mut im = vec![0.0; n];
    fft(&mut re, &mut im);
    (0..n / 2).map(|i| re[i] * re[i] + im[i] * im[i]).collect()
}

/// The power between two frequencies, Hz, in whatever unit [`spectrum`] has: for comparing bands of one sound.
#[must_use]
pub fn band(samples: &[f32], from: f32, to: f32) -> f32 {
    let power = spectrum(samples);
    let width = RATE / (2.0 * power.len().max(1) as f32);
    power.iter().enumerate().filter(|(i, _)| (from..to).contains(&(*i as f32 * width))).map(|(_, &p)| p).sum()
}

/// Where the weight of the spectrum lies, Hz: the mean frequency by power.
#[must_use]
pub fn centroid(samples: &[f32]) -> f32 {
    let power = spectrum(samples);
    let width = RATE / (2.0 * power.len().max(1) as f32);
    let whole: f32 = power.iter().sum();
    if whole <= 0.0 {
        return 0.0;
    }
    power.iter().enumerate().map(|(i, &p)| i as f32 * width * p).sum::<f32>() / whole
}

/// The first sample by which the level over the last hundredth of a second has passed `level`, if any is.
#[must_use]
pub fn onset(samples: &[f32], level: f32) -> Option<usize> {
    let window = (RATE / 100.0) as usize;
    let mut square = 0.0_f64;
    let over = f64::from(level * level) * window as f64;
    for (i, &x) in samples.iter().enumerate() {
        square += f64::from(x * x);
        if i >= window {
            let old = f64::from(samples[i - window]);
            square -= old * old;
        }
        if square > over {
            return Some(i);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tone(hertz: f32, gain: f32, n: usize) -> Vec<f32> {
        (0..n).map(|i| gain * (TAU * hertz * i as f32 / RATE).sin()).collect()
    }

    #[test]
    fn a_tone_reads_as_its_level_at_its_frequency() {
        let heard = tone(1000.0, 0.5, 1 << 15);
        let (rms, peak) = level(&heard);
        assert!((rms - 0.5 / 2.0_f32.sqrt()).abs() < 1e-3 && (peak - 0.5).abs() < 1e-3);
        assert!((db(rms) + 9.03).abs() < 0.05);
        assert!((centroid(&heard) - 1000.0).abs() < 5.0, "{}", centroid(&heard));
        let within = band(&heard, 900.0, 1100.0);
        let without = band(&heard, 0.0, 900.0) + band(&heard, 1100.0, 24_000.0);
        assert!(within > 1.0e5 * without, "{within} {without}");
    }

    #[test]
    fn a_sound_is_found_where_it_starts() {
        let mut heard = vec![0.0; 10_000];
        heard.extend(tone(300.0, 0.3, 5000));
        let found = onset(&heard, 0.05).unwrap();
        assert!((10_000..10_300).contains(&found), "{found}");
        assert_eq!(onset(&vec![0.0; 4000], 0.05), None);
    }
}
