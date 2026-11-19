//! What the flight sounds like, as numbers: every gain, filter frequency and Doppler factor, worked from where
//! the vehicle is and was, what it is doing and where the ears are. Nothing here makes a sound (`synth` turns
//! these numbers into one) and nothing here knows which flight it is. The web build's `mix`, with what this
//! build adds: the ears may be moving, the engine may be heard from more than one instant of its past, it is
//! louder to one side of its fire than ahead of it, and a camera flying beside the vehicle is in the wind.
//!
//! What is physics and what is not is said in `air` (the path) and `figures` (the levels and losses).

use sr_sim::plan::Engine;
use sr_world::V3;
use sr_world::earth::G0;

use super::air::{absorbed, acoustic_power, cutoff_after, level_of, loudness, smoothstep, spl, together};
use super::figures::{
    CANOPY, FANS, FASTEST, HELMET, JET_EXHAUST, JET_THRUST, JETS_INSIDE, LOBE, LOBE_GAIN, NEAR, SEPARATED,
    SHADOW, SKIN, STROUHAL, STRUCTURE, WALL, WHINE, WINDSCREEN,
};
use super::path::{Ears, Heard};

/// Where the ears are, as far as what they hear goes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Seat {
    /// On the ground somewhere: everything comes through the air.
    Standing,
    /// Flying beside the vehicle, in the same wind.
    Beside,
    /// In the cabin, helmet on: the structure carries the engine, and the wall keeps most of the air's noise out.
    Inside,
}

/// The ears.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Listener {
    /// Where they are, as far as what they hear goes.
    pub seat: Seat,
    /// Where, how they move, and the speed of sound there.
    pub ears: Ears,
    /// Which way is right, for telling left from right.
    pub right: V3,
    /// How far above whatever is under them, m, and how far over the ground from the site, m.
    pub above: f64,
    /// As `above`.
    pub off: f64,
    /// How much of sea level's air there is at them, 0 to 1, and its pressure, Pa.
    pub carries: f64,
    /// As `carries`.
    pub pressure: f64,
    /// What the ground under them adds to a passing shock: 1 in free air, about 2 standing on it.
    pub reflection: f64,
}

/// An engine as a source of sound.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Craft {
    /// The exhaust's speed, m/s.
    pub exhaust_speed: f64,
    /// Where its spectrum peaks, Hz.
    pub peak: f64,
}

impl Craft {
    /// The engine a plan describes: exhaust speed from the specific impulse, the spectrum's peak at
    /// [`STROUHAL`] on the nozzle's exit.
    #[must_use]
    pub fn of(engine: &Engine) -> Self {
        let exhaust_speed = engine.isp.value * G0;
        let exit = (4.0 * engine.exit_area.value.max(1.0e-3) / std::f64::consts::PI).sqrt();
        Self { exhaust_speed, peak: (STROUHAL.value * exhaust_speed / exit).clamp(18.0, 160.0) }
    }

    /// The sound power of this thrust, W.
    #[must_use]
    pub fn power(&self, thrust: f64) -> f64 {
        acoustic_power(thrust, self.exhaust_speed)
    }
}

/// The vehicle at the clock's instant: what someone going with it is in.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct Now {
    /// How high it is above where it stood, m, and how far it is from the ears, m.
    pub rise: f64,
    /// As `rise`.
    pub distance: f64,
    /// Dynamic pressure, Pa, and Mach number.
    pub q: f64,
    /// As `q`.
    pub mach: f64,
    /// The sound power its engine is making, W, how far ahead of its nozzle the cabin is, m, and how much of sea
    /// level's air is round it.
    pub power: f64,
    /// As `power`.
    pub standoff: f64,
    /// As `power`.
    pub carries: f64,
    /// The thrust of the jets that are firing, N.
    pub jets: f64,
    /// How long each parachute has been out and how long it has been down, s; `None` until it is.
    pub drogue: Option<f64>,
    /// As `drogue`.
    pub main: Option<f64>,
    /// As `drogue`.
    pub down: Option<f64>,
    /// It came down in the sea and is afloat.
    pub afloat: bool,
}

/// Everything [`mix`] is worked from.
#[derive(Debug, Clone, Copy)]
pub struct Hearing<'a> {
    /// How many seconds of the flight pass in one of ours, and whether its clock runs.
    pub rate: f64,
    /// As `rate`.
    pub running: bool,
    /// The ears, the engine and the vehicle now.
    pub listener: Listener,
    /// As `listener`.
    pub craft: Craft,
    /// As `listener`.
    pub now: Now,
    /// Every instant of the engine's past that is arriving at the ears now.
    pub heard: &'a [Heard],
    /// The place's own bed: wind, surf, hum and the sea round a spacecraft that is down, as gains.
    pub quiet: [f64; 4],
}

/// The engine as heard.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct EngineMix {
    /// The roar, the crackle over it and the rumble under it, as gains.
    pub roar: f64,
    /// As `roar`.
    pub crackle: f64,
    /// As `roar`.
    pub rumble: f64,
    /// Low-pass over all three, Hz, and where the roar's spectrum peaks, Hz.
    pub cutoff: f64,
    /// As `cutoff`.
    pub peak: f64,
    /// Doppler: pitch times this.
    pub shift: f64,
    /// Where it is heard from, -1 left to 1 right, and how wide.
    pub pan: f64,
    /// As `pan`.
    pub width: f64,
    /// The reflection off the ground: how late, s, and how strong.
    pub echo: [f64; 2],
}

/// The air on the skin: a band of noise, its centre (Hz), how deeply and fast it flutters, and the buffet under it.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct AirMix {
    /// Its gain.
    pub gain: f64,
    /// Its band's centre, Hz.
    pub centre: f64,
    /// How deeply it flutters, 0 to 1, and how many times a second.
    pub flutter: [f64; 2],
    /// The low thudding of a separated flow, as a gain.
    pub buffet: f64,
}

/// What the synthesiser is set to. Gains are of full scale.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct Mix {
    /// The whole flight's gain: 0 while the clock is stopped, low when it runs faster than [`FASTEST`].
    pub flight: f64,
    /// The engine, the air and the jets.
    pub engine: EngineMix,
    /// As `engine`.
    pub air: AirMix,
    /// As `engine`.
    pub jets: f64,
    /// The place: wind, water, whether the water is the sea's lapping (1) or surf (0), and hum.
    pub place: [f64; 4],
    /// The cabin: its fans and its inverters' whine.
    pub cabin: [f64; 2],
    /// The engine's level at the ears, dB, for the diagnostics.
    pub level: f64,
}

/// The whole flight's gain by how the clock runs: silent stopped, a bed that sinks as it runs faster.
#[must_use]
pub fn gate(running: bool, rate: f64) -> f64 {
    match rate {
        _ if !running || rate <= 0.0 => 0.0,
        _ if rate <= FASTEST => 1.0,
        _ if rate <= 10.0 => 0.3,
        _ if rate <= 60.0 => 0.12,
        _ => 0.0,
    }
}

/// How much louder or quieter the engine is toward the ears than abeam, dB: strongest [`LOBE`] degrees from the
/// way its fire goes, weakest ahead of the vehicle.
#[must_use]
pub fn directivity(heard: &Heard) -> f64 {
    let from_fire = (-heard.toward.dot(heard.past.axis)).clamp(-1.0, 1.0).acos().to_degrees();
    LOBE_GAIN.value * (-((from_fire - LOBE.value) / 35.0).powi(2)).exp()
        - SHADOW.value * smoothstep(100.0, 170.0, from_fire)
}

/// The engine through the air, from every instant of its past that is arriving.
fn far(h: &Hearing) -> (EngineMix, f64) {
    let l = &h.listener;
    let levels = h.heard.iter().map(|heard| {
        let thin = l.carries.min(heard.past.carries);
        spl(heard.past.power * thin, heard.distance) + directivity(heard)
    });
    let levels: Vec<f64> = levels.collect();
    let loudest = levels.iter().zip(h.heard).max_by(|a, b| a.0.total_cmp(b.0)).map(|(_, heard)| heard);
    let Some(loudest) = loudest else {
        return (EngineMix { peak: h.craft.peak, ..quiet() }, f64::NEG_INFINITY);
    };
    let (level, d, peak) = (together(levels), loudest.distance, h.craft.peak);
    // The ground's reflection, for someone standing on it: later than the sound itself by the longer way round.
    let from = loudest.past.at;
    let (up, stand) = (from.y.max(0.0), l.above.max(1.5));
    let across = (l.ears.at.x - from.x).hypot(l.ears.at.z - from.z);
    let longer = across.hypot(up + stand) - across.hypot(up - stand);
    let standing = f64::from(l.seat == Seat::Standing);
    let mix = EngineMix {
        roar: loudness(level - absorbed(4.0 * peak, d)),
        crackle: loudness(level - 6.0 - absorbed(2000.0, d)),
        rumble: loudness(level - 3.0 - absorbed(peak, d)),
        cutoff: cutoff_after(d),
        peak,
        shift: loudest.doppler,
        pan: -loudest.toward.dot(l.right),
        width: 1.0 - 0.8 * smoothstep(30.0, 600.0, d),
        echo: [(longer / l.ears.sound).clamp(0.0, 0.5), standing * 0.6 * (1.0 - smoothstep(60.0, 500.0, up))],
    };
    (mix, level)
}

fn quiet() -> EngineMix {
    EngineMix { cutoff: 16_000.0, shift: 1.0, width: 1.0, ..EngineMix::default() }
}

/// The engine for someone in the cabin: what the structure carries, and what the air outside still brings to the
/// wall (nothing once the vehicle has outrun its own noise, or left the air).
fn inside(h: &Hearing) -> (EngineMix, f64) {
    let n = &h.now;
    let structure = spl(n.power, NEAR.value) - STRUCTURE.value;
    let outside = n.power * n.carries * (1.0 - smoothstep(0.8, 1.3, n.mach));
    // Outside the cabin wall, ahead of the fire where the least of its noise goes: NASA TM X-53107, Table 6-1, has
    // 123 dB there at 1000 c/s in a static firing; this makes 138.6 dB over the whole spectrum.
    let cabin = spl(outside, n.standoff.max(NEAR.value)) - SHADOW.value - WALL.value - HELMET.value;
    let (structure_gain, cabin_gain) = (loudness(structure), loudness(cabin));
    let through = cabin_gain / (structure_gain + cabin_gain + 1.0e-9);
    let mix = EngineMix {
        roar: structure_gain + cabin_gain,
        crackle: 0.15 * cabin_gain,
        rumble: structure_gain + 0.7 * cabin_gain,
        cutoff: 180.0 + 1400.0 * through,
        peak: h.craft.peak,
        // The pad's echo, back up to the vehicle while it is still low.
        echo: [
            (2.0 * n.rise.max(0.0) / h.listener.ears.sound).clamp(0.0, 0.5),
            0.5 * (1.0 - smoothstep(20.0, 250.0, n.rise)),
        ],
        ..quiet()
    };
    (mix, together([structure, cabin]))
}

/// The pressure that fluctuates on the skin, Pa: under the attached boundary layer, and under the separated flow
/// behind the capsule's shoulder and its tower.
#[must_use]
pub fn skin(q: f64, mach: f64) -> [f64; 2] {
    let q = q.max(0.0);
    [
        SKIN.value * q / (1.0 + 0.14 * mach * mach),
        SEPARATED.value * q * smoothstep(0.6, 0.9, mach) / (1.0 + mach * mach),
    ]
}

/// The air: on the skin for someone in the cabin, on the ears themselves for someone flying beside.
fn air(h: &Hearing) -> AirMix {
    let n = &h.now;
    let out = |since: Option<f64>| since.map_or(0.0, |since| smoothstep(0.0, 1.5, since));
    let (drogue, main) = (out(n.drogue), out(n.main));
    let under = drogue.max(main);
    let sonic = (-((n.mach - 1.0) / 0.15).powi(2)).exp();
    let [attached, separated] = skin(n.q, n.mach);
    let lerp = |a: f64, b: f64, k: f64| a + (b - a) * k;
    let (level, buffet) = match h.listener.seat {
        Seat::Standing => (f64::NEG_INFINITY, f64::NEG_INFINITY),
        // (under a canopy it is the canopy and its lines that are heard, beside it as aboard)
        Seat::Beside => {
            let loss = lerp(lerp(WINDSCREEN.value, CANOPY[0].value, drogue), CANOPY[1].value, main);
            (level_of(attached) - loss, f64::NEG_INFINITY)
        }
        Seat::Inside => {
            let wall = WALL.value + HELMET.value;
            let loss = lerp(lerp(wall, CANOPY[0].value, drogue), CANOPY[1].value, main);
            (level_of(attached + separated) - loss, level_of(separated) - wall)
        }
    };
    let flying = f64::from(n.down.is_none());
    AirMix {
        gain: loudness(level) * flying,
        centre: lerp((250.0 + 500.0 * (n.mach / 3.0).min(1.0)) * (1.0 - 0.4 * sonic), 520.0, under),
        flutter: [(0.5 * sonic).max(0.6 * under), lerp(9.0, 3.5, under)],
        buffet: loudness(buffet) * (1.0 - under) * flying,
    }
}

/// The attitude jets: small rockets on the spacecraft, through its structure for someone aboard and through
/// whatever air there is for anyone else.
fn jets(h: &Hearing) -> f64 {
    let n = &h.now;
    if n.jets <= 0.0 {
        return 0.0;
    }
    if h.listener.seat == Seat::Inside {
        return loudness(JETS_INSIDE.value) * (n.jets / JET_THRUST.value).min(1.0);
    }
    let thin = h.listener.carries.min(n.carries);
    loudness(spl(acoustic_power(n.jets, JET_EXHAUST.value) * thin, n.distance))
}

/// The place's own bed near its ground, and the sea round a spacecraft that has come down: wind, water, which
/// water, hum.
fn place(h: &Hearing) -> [f64; 4] {
    let (l, [wind, surf, hum, sea]) = (&h.listener, h.quiet);
    let near =
        l.carries / (1.0 + (l.above.max(0.0) / 500.0).powi(2)) * (1.0 - smoothstep(5000.0, 30_000.0, l.off));
    let inside = l.seat == Seat::Inside;
    // The hatch is shut and the helmet on: the losses' decibels, squeezed as every level is.
    let shut = if inside { 10.0_f64.powf(-(WALL.value + HELMET.value) / 40.0) } else { 1.0 };
    let afloat = f64::from(h.now.afloat && l.seat != Seat::Standing);
    let lapping = sea * afloat * if inside { 0.5 } else { 1.0 };
    let surf = surf * near * shut;
    [wind * near.max(0.8 * afloat) * shut, surf.max(lapping), f64::from(lapping > surf), hum * near * shut]
}

/// What is heard.
#[must_use]
pub fn mix(h: &Hearing) -> Mix {
    let inboard = h.listener.seat == Seat::Inside;
    let (engine, level) = if inboard { inside(h) } else { far(h) };
    let cabin = if inboard { [loudness(FANS.value), loudness(WHINE.value)] } else { [0.0; 2] };
    Mix { flight: gate(h.running, h.rate), engine, air: air(h), jets: jets(h), place: place(h), cabin, level }
}

#[cfg(test)]
#[path = "model_tests.rs"]
mod tests;
