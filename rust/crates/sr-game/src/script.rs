//! A scripted hand (`--keys`): keys pressed at instants of the flight's clock, so a flight flown by hand can be
//! flown again exactly, for a frame of it (`--shot` with `--until`), a measurement or a review.
//!
//! `--keys 0:Space,18:W:9,140:X` is Space as the count ends, W held for nine seconds from T+18, and X at T+140.
//! The keys go in where a keyboard's do, so everything that reads keys reads these.

use bevy::input::InputSystems;
use bevy::prelude::*;

use crate::Options;
use crate::clock::Clock;

/// A key pressed at an instant and held for a time.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Press {
    /// When, s on the flight's clock.
    pub at: f64,
    /// Which key.
    pub key: KeyCode,
    /// How long it is held, s (nothing: pressed and let go).
    pub held: f64,
}

/// The keys a script may name: what the game listens for.
const NAMED: [(&str, KeyCode); 24] = [
    ("Space", KeyCode::Space),
    ("W", KeyCode::KeyW),
    ("S", KeyCode::KeyS),
    ("A", KeyCode::KeyA),
    ("D", KeyCode::KeyD),
    ("Q", KeyCode::KeyQ),
    ("E", KeyCode::KeyE),
    ("T", KeyCode::KeyT),
    ("Z", KeyCode::KeyZ),
    ("X", KeyCode::KeyX),
    ("G", KeyCode::KeyG),
    ("B", KeyCode::KeyB),
    ("P", KeyCode::KeyP),
    ("C", KeyCode::KeyC),
    ("L", KeyCode::KeyL),
    ("K", KeyCode::KeyK),
    ("I", KeyCode::KeyI),
    ("H", KeyCode::KeyH),
    ("1", KeyCode::Digit1),
    ("2", KeyCode::Digit2),
    ("3", KeyCode::Digit3),
    ("4", KeyCode::Digit4),
    ("[", KeyCode::BracketLeft),
    ("]", KeyCode::BracketRight),
];

/// Read a script: `time:key` or `time:key:seconds held`, with commas between.
///
/// # Errors
/// The entry that could not be read.
pub fn parse(script: &str) -> Result<Vec<Press>, String> {
    script
        .split(',')
        .filter(|entry| !entry.is_empty())
        .map(|entry| {
            let bad = || format!("--keys: cannot read {entry:?}");
            let mut fields = entry.split(':');
            let at = fields.next().and_then(|at| at.parse().ok()).ok_or_else(bad)?;
            let name = fields.next().ok_or_else(bad)?;
            let key = NAMED.iter().find(|(named, _)| *named == name).ok_or_else(bad)?.1;
            let held = fields.next().map_or(Ok(0.0), str::parse).map_err(|_| bad())?;
            Ok(Press { at, key, held })
        })
        .collect()
}

/// Plays the script.
pub struct ScriptPlugin;

impl Plugin for ScriptPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(PreUpdate, play.after(InputSystems));
    }
}

/// Where each press has got to: not yet, down, done.
#[derive(Clone, Copy, PartialEq, Eq, Default)]
enum Stage {
    #[default]
    Waiting,
    Down,
    Done,
}

fn play(
    options: Res<Options>,
    clock: Option<Res<Clock>>,
    mut keys: ResMut<ButtonInput<KeyCode>>,
    mut stages: Local<Vec<Stage>>,
) {
    let Some(clock) = clock.filter(|clock| clock.ready) else { return };
    stages.resize(options.keys.len(), Stage::Waiting);
    for (press, stage) in options.keys.iter().zip(stages.iter_mut()) {
        match *stage {
            Stage::Waiting if clock.t >= press.at => {
                keys.press(press.key);
                *stage = Stage::Down;
            }
            Stage::Down if clock.t >= press.at + press.held => {
                keys.release(press.key);
                *stage = Stage::Done;
            }
            _ => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_script_is_read_as_it_is_documented() {
        let script = parse("0:Space,18:W:9,140.5:X").unwrap();
        assert_eq!(script.len(), 3);
        assert_eq!(script[1], Press { at: 18.0, key: KeyCode::KeyW, held: 9.0 });
        assert_eq!(script[2].at, 140.5);
        assert!(parse("soon:Space").is_err());
        assert!(parse("3:Enter").is_err());
        assert!(parse("3:W:long").is_err());
    }
}
