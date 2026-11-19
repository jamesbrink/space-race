//! An A/B switch for measuring, within one run, what the ground, the sea and the plants cost a frame: with the
//! environment variable `SR_EARTH_AB` set to a number of seconds, the land's detail, the sea's detail and glint, and
//! the plants are drawn for that long and left out for as long, by turns, and each turn is logged, so that a run
//! with `--bench` can be split into the seconds with them and without. Unset, they are always on. (The constants
//! `LAND_DETAIL`, `SEA_DETAIL` and `GLINT` in `shaders/earth.wesl` and `PLANTS` in `earth/grove.rs` take them out of
//! the build altogether.)

use bevy::diagnostic::DiagnosticsStore;
use bevy::prelude::*;
use bevy::render::diagnostic::RenderDiagnosticsPlugin;

use super::maps::Maps;
use super::material::EarthMaterial;

/// A plant stood up by `earth/grove.rs`, for the switch to hide.
#[derive(Component)]
pub struct Planted;

/// The switch's turns, if it is turning.
#[derive(Resource, Debug, Clone, Copy)]
pub struct EarthAb {
    /// Whether the detail is drawn just now.
    pub on: bool,
    /// How long each turn lasts, s.
    period: Option<f32>,
    /// Which parts are turned (`SR_EARTH_AB_PARTS`: `l` the land's detail, `s` the sea's and its glint, `p` the
    /// plants; all if unset): the others stay on.
    parts: [bool; 3],
}

impl Default for EarthAb {
    fn default() -> Self {
        let period = std::env::var("SR_EARTH_AB")
            .ok()
            .and_then(|value| value.parse::<f32>().ok())
            .filter(|p| *p > 0.0);
        let parts = std::env::var("SR_EARTH_AB_PARTS").unwrap_or_else(|_| "lsp".to_owned());
        Self { on: true, period, parts: ['l', 's', 'p'].map(|part| parts.contains(part)) }
    }
}

/// Turns the ground's detail on and off when asked to: the shader reads it from its frame (`day.w`).
pub fn turn(
    time: Res<Time<Real>>,
    mut ab: ResMut<EarthAb>,
    maps: Option<Res<Maps>>,
    mut earths: ResMut<Assets<EarthMaterial>>,
    mut plants: Query<&mut Visibility, With<Planted>>,
) {
    let Some(period) = ab.period else { return };
    let on = ((time.elapsed_secs() / period) as u32).is_multiple_of(2);
    if on == ab.on {
        return;
    }
    ab.on = on;
    info!("earth ab: ground, sea and plants {}", if on { "on" } else { "off" });
    if let Some(mut earth) = maps.and_then(|maps| earths.get_mut(&maps.material)) {
        // (one for the land off, two for the sea, both for three)
        let off = |k: usize, bit: f32| if !on && ab.parts[k] { bit } else { 0.0 };
        earth.extension.frame.day.w = off(0, 1.0) + off(1, 2.0);
    }
    let hide = !on && ab.parts[2];
    for mut seen in &mut plants {
        *seen = if hide { Visibility::Hidden } else { Visibility::Inherited };
    }
}

/// With `SR_EARTH_GPU` set in the environment, what the opaque pass (the ground, the sea, the plants and everything
/// else solid) took on the graphics card is logged once a second, by the card's own clock, so that the A/B switch can
/// be read on a machine whose card and processors others are using too.
pub fn gpu_clock(app: &mut App) {
    if std::env::var_os("SR_EARTH_GPU").is_some() {
        app.add_plugins(RenderDiagnosticsPlugin).add_systems(Last, say_gpu);
    }
}

fn say_gpu(time: Res<Time<Real>>, store: Res<DiagnosticsStore>, ab: Res<EarthAb>, mut said: Local<f32>) {
    if time.elapsed_secs() - *said < 1.0 {
        return;
    }
    *said = time.elapsed_secs();
    let opaque = store
        .iter()
        .find(|d| {
            let path = d.path().as_str();
            path.contains("main_opaque_pass_3d") && path.ends_with("elapsed_gpu")
        })
        .and_then(bevy::diagnostic::Diagnostic::average);
    if let Some(ms) = opaque {
        info!("earth gpu: opaque pass {ms:.2} ms, earth {}", if ab.on { "on" } else { "off" });
    }
}
