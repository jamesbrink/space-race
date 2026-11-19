//! The sonic boom: how strong and how long its N-wave is (Carlson's simplified prediction), and the wave itself.
//!
//! H. W. Carlson, "Simplified Sonic-Boom Prediction", NASA TP-1122 (1978), equations 1 and 2:
//!
//! ```text
//! dp = K_p K_R sqrt(p_v p_g) (M^2 - 1)^(1/8) h_e^(-3/4) l^(3/4) K_S
//! dt = K_t (3.42 / a_v) M / (M^2 - 1)^(3/8) h_e^(1/4) l^(3/4) K_S
//! ```
//!
//! with the effective height `h_e` and the length `l` in the same unit. With the factors of his first sample
//! problem it gives that problem's answer (the test below). His charts for the atmosphere's factors `K_p` and `K_t`
//! were not read (his worked examples have 1.1 to 1.4 and 0.73 to 0.85), so the game takes both as one, which is
//! an estimate; the paper is for the far field under steady flight above Mach 1.2, and what the game asks of it (a
//! camera sixty metres from the vehicle, a body slowing through Mach 1) is outside that. The shape of the answer
//! is physics; its size is a labelled estimate.

/// A supersonic body passing, as the prediction needs it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Passing {
    /// Its Mach number.
    pub mach: f64,
    /// Its length, m.
    pub length: f64,
    /// How far it was from the ears when the wave left it, m: the paper's effective height.
    pub distance: f64,
    /// The air's pressure where it was and at the ears, Pa.
    pub pressure_there: f64,
    /// As `pressure_there`.
    pub pressure_here: f64,
    /// The speed of sound where it was, m/s.
    pub sound_there: f64,
    /// Its shape factor, `K_S`.
    pub shape: f64,
    /// What the ground under the ears adds, `K_R`: 1 in free air, about 2 standing on it.
    pub reflection: f64,
    /// The atmosphere's factors on the overpressure and on the duration, `K_p` and `K_t`: read off his charts, or one.
    pub atmosphere: [f64; 2],
}

/// The prediction holds from here up; nearer Mach 1 its factors run away, so the Mach number is held to it.
const SLOWEST: f64 = 1.05;

impl Passing {
    fn mach2(&self) -> f64 {
        let mach = self.mach.max(SLOWEST);
        mach * mach - 1.0
    }

    /// The bow shock's overpressure at the ears, Pa.
    #[must_use]
    pub fn overpressure(&self) -> f64 {
        let reach = (self.length / self.distance.max(self.length)).powf(0.75);
        let air = (self.pressure_there.max(0.0) * self.pressure_here.max(0.0)).sqrt();
        self.atmosphere[0] * self.reflection * air * self.mach2().powf(0.125) * reach * self.shape
    }

    /// How long the N-wave lasts from its bow shock to its tail shock, s.
    #[must_use]
    pub fn duration(&self) -> f64 {
        let spread = self.distance.max(self.length).powf(0.25) * self.length.powf(0.75);
        let stretch = self.mach.max(SLOWEST) / self.mach2().powf(0.375) * spread;
        self.atmosphere[1] * 3.42 / self.sound_there * stretch * self.shape
    }
}

/// An N-wave of unit overpressure at `t` seconds after its bow shock arrives: up in `rise`, down through nought
/// to minus one over `duration`, and back in `rise`. Nought before and after.
#[must_use]
pub fn n_wave(t: f32, duration: f32, rise: f32) -> f32 {
    let rise = rise.clamp(1.0e-4, 0.5 * duration.max(2.0e-4));
    if t < 0.0 || t > duration + rise {
        0.0
    } else if t > duration {
        (t - duration) / rise - 1.0
    } else {
        (1.0 - 2.0 * t / duration) * (t / rise).min(1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn concorde() -> Passing {
        // An airliner at Mach 2 and 16 km over ears on the ground, in the standard atmosphere.
        Passing {
            mach: 2.0,
            length: 62.0,
            distance: 16_000.0,
            pressure_there: 10_350.0,
            pressure_here: 101_325.0,
            sound_there: 295.1,
            shape: 0.09,
            reflection: 1.9,
            atmosphere: [1.0; 2],
        }
    }

    #[test]
    fn it_gives_what_carlson_s_own_sample_problems_give() {
        // NASA TP-1122, Appendix B (pp. 19 to 24), each as printed: Mach number, length (m), effective height
        // (m), the pressures at the vehicle and the ground (Pa), the speed of sound (m/s), K_S, K_R, K_p and K_t;
        // then its answers, Pa and s. 1: a reconnaissance aeroplane on track ("74 Pa", "0.17 sec"). 2: a medium
        // bomber heard off its track. 3: the Apollo launch vehicle 125 s up, its plume the body that counts.
        let problems = [
            ([1.99, 32.7, 14_480.0, 11_600.0, 92_300.0, 295.0, 0.087, 2.0, 1.10, 0.85], [74.0, 0.17]),
            ([2.0, 30.0, 35_100.0, 6880.0, 92_300.0, 296.0, 0.088, 2.0, 1.42, 0.82], [36.1, 0.19]),
            ([4.08, 104.5, 50_200.0, 490.0, 101_000.0, 310.0, 0.68, 2.0, 1.40, 0.73], [184.0, 3.90]),
        ];
        for (
            [mach, length, distance, pressure_there, pressure_here, sound_there, shape, reflection, kp, kt],
            answer,
        ) in problems
        {
            let problem = Passing {
                mach,
                length,
                distance,
                pressure_there,
                pressure_here,
                sound_there,
                shape,
                reflection,
                atmosphere: [kp, kt],
            };
            // (its figures are given to two or three places: within a per cent and a half, and its rounding)
            let (pascals, seconds) = (problem.overpressure(), problem.duration());
            assert!((pascals / answer[0] - 1.0).abs() < 0.015, "{pascals} against {}", answer[0]);
            assert!(
                (seconds - answer[1]).abs() < 0.015 * answer[1] + 0.005,
                "{seconds} against {}",
                answer[1]
            );
        }
    }

    #[test]
    fn an_airliner_at_mach_two_makes_the_boom_airliners_make() {
        // With the atmosphere's factors at one the formula gives 99 Pa and 0.34 s. Concorde's boom at cruise is
        // commonly quoted as about 2 lb/sq ft (96 Pa) and 0.3 s (not a figure checked here): the same order.
        let boom = concorde();
        assert!((boom.overpressure() - 98.7).abs() < 1.0, "{}", boom.overpressure());
        assert!((boom.duration() - 0.343).abs() < 0.005, "{}", boom.duration());
    }

    #[test]
    fn it_scales_as_the_formula_says() {
        let near = concorde();
        let far = Passing { distance: 16.0 * near.distance, ..near };
        // Sixteen times as far: an eighth of the overpressure, twice as long.
        assert!((near.overpressure() / far.overpressure() - 8.0).abs() < 1e-9);
        assert!((far.duration() / near.duration() - 2.0).abs() < 1e-9);
        let free = Passing { reflection: 1.0, ..near };
        assert!((near.overpressure() / free.overpressure() - 1.9).abs() < 1e-9);
        // In no air there is no boom, and it is never nearer than its own length.
        assert_eq!(Passing { pressure_there: 0.0, ..near }.overpressure(), 0.0);
        let touching = Passing { distance: 1.0, ..near };
        assert_eq!(touching.overpressure(), Passing { distance: near.length, ..near }.overpressure());
    }

    #[test]
    fn the_n_wave_is_an_n() {
        let (duration, rise) = (0.1, 0.005);
        assert_eq!(n_wave(-0.01, duration, rise), 0.0);
        assert_eq!(n_wave(0.0, duration, rise), 0.0);
        // Up at the bow shock, through nought at the middle, down at the tail shock, back to nought after it.
        assert!((n_wave(rise, duration, rise) - 0.9).abs() < 1e-6);
        assert!(n_wave(0.05, duration, rise).abs() < 1e-6);
        assert!((n_wave(duration, duration, rise) + 1.0).abs() < 1e-6);
        assert!((n_wave(duration + rise / 2.0, duration, rise) + 0.5).abs() < 1e-5);
        assert_eq!(n_wave(duration + rise + 0.001, duration, rise), 0.0);
        // It pushes as much as it pulls, to within the rise.
        let sum: f32 = (0..6000).map(|i| n_wave(i as f32 / 48_000.0, duration, rise)).sum();
        assert!((sum / 48_000.0).abs() < rise, "{sum}");
    }
}
