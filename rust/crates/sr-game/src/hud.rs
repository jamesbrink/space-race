//! The readout: the clock, what the vehicle is doing, and the keys. Three small panels of glass at the corners;
//! H puts them away (AGENTS.md: "the page gets out of the way").

use bevy::prelude::*;
use sr_render::look::Look;

use crate::Showing;
use crate::clock::Clock;
use crate::flight::Telemetry;
use crate::rig::Rig;

const GLASS: Color = Color::srgba(0.02, 0.03, 0.05, 0.62);
const INK: Color = Color::srgb(0.93, 0.94, 0.95);
const FAINT: Color = Color::srgb(0.66, 0.7, 0.74);

#[derive(Component)]
struct Panels;
#[derive(Component)]
struct ClockLine;
#[derive(Component)]
struct EventLine;
#[derive(Component)]
struct Figures;
#[derive(Component)]
struct Modes;

/// The readout.
pub struct HudPlugin;

impl Plugin for HudPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, lay).add_systems(Update, (read, tuck));
    }
}

/// A clock reading: `T-00:12` before liftoff, `T+02:21.8` after.
#[must_use]
pub fn clock_reading(t: f64) -> String {
    let sign = if t < 0.0 { '-' } else { '+' };
    let whole = t.abs();
    let (minutes, seconds) = ((whole / 60.0).floor(), whole % 60.0);
    if t < 0.0 {
        format!("T{sign}{minutes:02.0}:{:02.0}", seconds.ceil().min(59.0))
    } else {
        format!("T{sign}{minutes:02.0}:{seconds:04.1}")
    }
}

/// A height or a distance: metres while that says most, then kilometres.
#[must_use]
pub fn length_reading(metres: f64) -> String {
    if metres.abs() < 10_000.0 { format!("{metres:.0} m") } else { format!("{:.1} km", metres / 1000.0) }
}

fn panel(corner: Node) -> impl Bundle {
    (
        Node {
            position_type: PositionType::Absolute,
            padding: UiRect::axes(px(14), px(10)),
            flex_direction: FlexDirection::Column,
            row_gap: px(2),
            border_radius: BorderRadius::all(px(6)),
            ..corner
        },
        BackgroundColor(GLASS),
    )
}

fn line(size: f32, colour: Color) -> impl Bundle {
    (Text::default(), TextFont { font_size: size.into(), ..default() }, TextColor(colour))
}

fn lay(mut commands: Commands, showing: Res<Showing>) {
    let flight = showing.0;
    commands.spawn((Panels, Node { width: percent(100), height: percent(100), ..default() })).with_children(|page| {
        page.spawn(panel(Node { top: px(14), left: px(14), ..default() })).with_children(|card| {
            card.spawn((Text::new(flight.name), TextFont { font_size: 22.0.into(), ..default() }, TextColor(INK)));
            card.spawn((Text::new(flight.line), TextFont { font_size: 12.0.into(), ..default() }, TextColor(FAINT)));
            card.spawn((ClockLine, line(30.0, INK)));
            card.spawn((EventLine, line(13.0, FAINT)));
        });
        page.spawn(panel(Node { top: px(14), right: px(14), ..default() })).with_children(|card| {
            card.spawn((Figures, line(14.0, INK)));
        });
        page.spawn(panel(Node { bottom: px(14), left: px(14), ..default() })).with_children(|card| {
            card.spawn((Modes, line(12.0, INK)));
            let keys = "Space  stop the clock      , .  slower, faster\nC  next camera (1 2 3 4)   G  the grade\ndrag  turn   wheel  zoom    H  hide these";
            card.spawn((Text::new(keys), TextFont { font_size: 12.0.into(), ..default() }, TextColor(FAINT)));
        });
    });
}

fn read(
    showing: Res<Showing>,
    clock: Res<Clock>,
    telemetry: Res<Telemetry>,
    rig: Res<Rig>,
    look: Res<Look>,
    mut clock_line: Single<
        &mut Text,
        (With<ClockLine>, Without<EventLine>, Without<Figures>, Without<Modes>),
    >,
    mut event_line: Single<
        &mut Text,
        (With<EventLine>, Without<ClockLine>, Without<Figures>, Without<Modes>),
    >,
    mut figures: Single<&mut Text, (With<Figures>, Without<ClockLine>, Without<EventLine>, Without<Modes>)>,
    mut modes: Single<&mut Text, (With<Modes>, Without<ClockLine>, Without<EventLine>, Without<Figures>)>,
) {
    clock_line.0 = clock_reading(clock.t);
    let last = showing.0.events.iter().rev().find(|event| event.at <= clock.t);
    event_line.0 = if !clock.ready {
        "The models are arriving".to_owned()
    } else if clock.stopped {
        "The clock is stopped".to_owned()
    } else {
        last.map_or("The count", |event| event.label).to_owned()
    };
    figures.0 = format!(
        "Height     {}\nSpeed      {:.0} m/s\nRange      {}\nMach       {:.2}\nLoad       {:.1} g\nThrust     {:.0} kN",
        length_reading(telemetry.height),
        telemetry.speed,
        length_reading(telemetry.range),
        telemetry.mach,
        telemetry.g,
        telemetry.thrust / 1000.0,
    );
    modes.0 = format!("Clock x{:.0}    Camera: {}    Grade: {}", clock.rate(), rig.kind.name(), look.name());
}

fn tuck(
    keys: Res<ButtonInput<KeyCode>>,
    mut panels: Single<&mut Visibility, With<Panels>>,
    mut look: ResMut<Look>,
) {
    if keys.just_pressed(KeyCode::KeyH) {
        **panels = if **panels == Visibility::Hidden { Visibility::Inherited } else { Visibility::Hidden };
    }
    if keys.just_pressed(KeyCode::KeyG) {
        *look = look.next();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_clock_reads_as_a_count() {
        assert_eq!(clock_reading(-12.0), "T-00:12");
        assert_eq!(clock_reading(-0.4), "T-00:01");
        assert_eq!(clock_reading(141.8), "T+02:21.8");
    }

    #[test]
    fn lengths_change_unit_where_that_reads_better() {
        assert_eq!(length_reading(720.0), "720 m");
        assert_eq!(length_reading(187_400.0), "187.4 km");
    }
}
