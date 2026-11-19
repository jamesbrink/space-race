//! An A/B switch for measuring, within one run, what the fumes and the fires cost a frame: with the environment
//! variable `SR_AB` set to a number of seconds, they are worked and drawn for that long and left out for as long,
//! by turns, and each turn is logged, so a run with `--bench` (which logs what each second cost) can be split into
//! the seconds with them and the seconds without. Unset, they are always on. (`fumes::ON` and `plume::ON` take them
//! out of the build altogether.)

use bevy::prelude::*;

/// Whether the fumes and the fires are being drawn this frame.
#[derive(Resource, Debug, Clone, Copy)]
pub struct Ab {
    /// Whether they are on.
    pub on: bool,
    /// How long each turn lasts, s, if they are being turned on and off at all.
    period: Option<f32>,
    /// Which parts are turned (`SR_AB_PARTS`: `s` the fumes' solver, `d` their picture, `f` the fires; all if
    /// unset): the others stay on.
    parts: [bool; 3],
}

impl Default for Ab {
    fn default() -> Self {
        let period =
            std::env::var("SR_AB").ok().and_then(|value| value.parse::<f32>().ok()).filter(|p| *p > 0.0);
        let parts = std::env::var("SR_AB_PARTS").unwrap_or_else(|_| "sdf".to_owned());
        Self { on: true, period, parts: ['s', 'd', 'f'].map(|part| parts.contains(part)) }
    }
}

impl Ab {
    /// Whether the fumes are worked this frame.
    #[must_use]
    pub fn solving(&self) -> bool {
        self.on || !self.parts[0]
    }

    /// Whether the fumes are drawn this frame.
    #[must_use]
    pub fn drawing(&self) -> bool {
        self.on || !self.parts[1]
    }

    /// Whether the fires are drawn this frame.
    #[must_use]
    pub fn burning(&self) -> bool {
        self.on || !self.parts[2]
    }
}

/// Turns the fumes and the fires on and off when asked to.
pub struct AbPlugin;

impl Plugin for AbPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<Ab>().add_systems(First, turn);
    }
}

fn turn(time: Res<Time<Real>>, mut ab: ResMut<Ab>) {
    let Some(period) = ab.period else { return };
    let on = ((time.elapsed_secs() / period) as u32).is_multiple_of(2);
    if on != ab.on {
        ab.on = on;
        info!("ab: fumes and fires {}", if on { "on" } else { "off" });
    }
}
