//! Diagnostics: what a frame costs and what is in it, in the corner. I puts it away.

use avian3d::prelude::RigidBody;
use bevy::diagnostic::{
    Diagnostic, DiagnosticsStore, EntityCountDiagnosticsPlugin, FrameTimeDiagnosticsPlugin,
};
use bevy::prelude::*;
use bevy::render::renderer::RenderAdapterInfo;

use crate::clock::{Clock, STEPS};
use crate::hud::{Panels, line, panel};

const INK: Color = Color::srgb(0.74, 0.86, 0.78);
/// How often the figures are read again, s: often enough to follow, seldom enough to read.
const EVERY: f32 = 0.25;

#[derive(Component)]
struct Card;
#[derive(Component)]
struct Figures;

/// The diagnostics panel, and the measuring it reads.
pub struct DiagPlugin;

impl Plugin for DiagPlugin {
    fn build(&self, app: &mut App) {
        app.add_plugins((FrameTimeDiagnosticsPlugin::default(), EntityCountDiagnosticsPlugin::default()))
            .add_systems(Startup, lay)
            .add_systems(Update, (read, tuck));
    }
}

fn lay(mut commands: Commands) {
    let place = Node { position_type: PositionType::Absolute, bottom: px(14), right: px(14), ..default() };
    commands.spawn((Panels, Card, panel(place))).with_children(|card| {
        card.spawn((Figures, line(12.0, INK)));
    });
}

fn read(
    diagnostics: Res<DiagnosticsStore>,
    time: Res<Time<Real>>,
    clock: Res<Clock>,
    adapter: Option<Res<RenderAdapterInfo>>,
    windows: Query<&Window>,
    bodies: Query<(), With<RigidBody>>,
    mut due: Local<f32>,
    mut text: Single<&mut Text, With<Figures>>,
) {
    if time.elapsed_secs() < *due {
        return;
    }
    *due = time.elapsed_secs() + EVERY;
    let smoothed = |path| diagnostics.get(path).and_then(Diagnostic::smoothed).unwrap_or(0.0);
    let worst = diagnostics
        .get(&FrameTimeDiagnosticsPlugin::FRAME_TIME)
        .map_or(0.0, |frames| frames.values().copied().fold(0.0, f64::max));
    let (wide, high, scale) =
        windows.single().map_or((0, 0, 1.0), |w| (w.physical_width(), w.physical_height(), w.scale_factor()));
    let gpu = adapter.map_or_else(String::new, |a| format!("{} ({:?})", a.name, a.backend));
    text.0 = format!(
        "{:.0} frames a second    {:.1} ms, worst {worst:.1}\n{wide} x {high} (x{scale:.1})    {gpu}\n\
         {:.0} entities    {} bodies    {:.0} steps of physics a second",
        smoothed(&FrameTimeDiagnosticsPlugin::FPS),
        smoothed(&FrameTimeDiagnosticsPlugin::FRAME_TIME),
        smoothed(&EntityCountDiagnosticsPlugin::ENTITY_COUNT),
        bodies.iter().count(),
        STEPS * f64::from(clock.rate()) * f64::from(u8::from(!clock.stopped)),
    );
}

fn tuck(keys: Res<ButtonInput<KeyCode>>, mut card: Single<&mut Node, With<Card>>) {
    if keys.just_pressed(KeyCode::KeyI) {
        card.display = if card.display == Display::None { Display::Flex } else { Display::None };
    }
}
