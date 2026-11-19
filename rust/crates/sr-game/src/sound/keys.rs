//! The listener's own controls: M puts the sound off and on, - and = turn it down and up.

use bevy::prelude::*;

use super::state::Sound;
use crate::Options;

/// A press of - or = is this many decibels, and the level stays between these, dB.
const NOTCH: f32 = 2.0;
const RANGE: [f32; 2] = [-40.0, 6.0];

/// As the command line asked.
pub fn start(options: Option<Res<Options>>, mut sound: ResMut<Sound>) {
    sound.muted = options.is_some_and(|options| options.mute);
}

/// The level a press of - (`down`) or = moves a level to.
#[must_use]
pub fn turned(level: f32, down: bool) -> f32 {
    let db = 20.0 * level.max(1.0e-4).log10() + if down { -NOTCH } else { NOTCH };
    10.0_f32.powf(db.clamp(RANGE[0], RANGE[1]) / 20.0)
}

/// The keys.
pub fn keys(keys: Res<ButtonInput<KeyCode>>, mut sound: ResMut<Sound>) {
    if keys.just_pressed(KeyCode::KeyM) {
        sound.muted = !sound.muted;
    }
    for (key, down) in [(KeyCode::Minus, true), (KeyCode::Equal, false)] {
        if keys.just_pressed(key) {
            sound.level = turned(sound.level, down);
            sound.muted = false;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_press_is_two_decibels_and_the_level_stays_in_its_range() {
        assert!((turned(1.0, true) - 0.7943).abs() < 1e-4);
        assert!((turned(turned(1.0, true), false) - 1.0).abs() < 1e-5);
        let mut level = 1.0;
        for _ in 0..100 {
            level = turned(level, false);
        }
        assert!((level - 1.9953).abs() < 1e-3, "{level}");
        for _ in 0..100 {
            level = turned(level, true);
        }
        assert!((level - 0.01).abs() < 1e-5, "{level}");
    }
}
