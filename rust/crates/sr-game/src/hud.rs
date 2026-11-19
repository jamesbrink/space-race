//! The readout: the clock, what the vehicle is doing, what the pilot's next act is, and the keys. Small panels of
//! glass at the edges; H puts them away (AGENTS.md: "the page gets out of the way").

use bevy::prelude::*;
use sr_render::look::Look;
use sr_sim::{Plan, Sequence, Strain};

use crate::Showing;
use crate::clock::Clock;
use crate::flight::hand::Action;
use crate::flight::{Hand, Sequencer, Telemetry};
use crate::rig::Rig;

const GLASS: Color = Color::srgba(0.02, 0.03, 0.05, 0.62);
const INK: Color = Color::srgb(0.93, 0.94, 0.95);
const FAINT: Color = Color::srgb(0.66, 0.7, 0.74);
const ALARM: Color = Color::srgb(1.0, 0.72, 0.3);
/// The structure's strain is called out from this much of its limit.
const NEAR: f64 = 0.75;

const KEYS: &str = "W S  pitch    A D  yaw    Q E  roll    T  hold the attitude\n\
Space  the next step    Z X  engine on, off    G  as flown (on the pad)\n\
P  stop the clock    [ ]  slower, faster\n\
C  camera (1 2 3 4)    L  the grade    I  diagnostics    H  hide these\n\
drag  turn    wheel  zoom";

/// Everything the readout draws: what H puts away.
#[derive(Component)]
pub struct Panels;

/// A line of the readout, and what it says.
#[derive(Component, Debug, Clone, Copy, PartialEq, Eq)]
enum Line {
    Clock,
    Event,
    Figures,
    Pilot,
    Alarm,
    Modes,
}

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

/// A panel of glass, laid out by `place`.
#[must_use]
pub fn panel(place: Node) -> impl Bundle {
    (
        Node {
            padding: UiRect::axes(px(14), px(10)),
            flex_direction: FlexDirection::Column,
            row_gap: px(2),
            border_radius: BorderRadius::all(px(6)),
            ..place
        },
        BackgroundColor(GLASS),
    )
}

/// A line of text in a panel.
#[must_use]
pub fn line(size: f32, colour: Color) -> impl Bundle {
    (Text::default(), TextFont { font_size: size.into(), ..default() }, TextColor(colour))
}

fn corner(place: Node) -> Node {
    Node { position_type: PositionType::Absolute, ..place }
}

fn words(text: &str, size: f32, colour: Color) -> impl Bundle {
    (Text::new(text), TextFont { font_size: size.into(), ..default() }, TextColor(colour))
}

fn lay(mut commands: Commands, showing: Res<Showing>) {
    let flight = showing.0;
    let page = Node { width: percent(100), height: percent(100), ..default() };
    // The head is one row, so its three panels make room for each other at any width: the flight and its clock,
    // the pilot's own panel in the middle, the figures.
    let head = Node {
        top: px(14),
        left: px(14),
        right: px(14),
        justify_content: JustifyContent::SpaceBetween,
        align_items: AlignItems::FlexStart,
        column_gap: px(12),
        ..default()
    };
    commands.spawn((Panels, page)).with_children(|page| {
        page.spawn(corner(head)).with_children(|row| {
            row.spawn(panel(Node::default())).with_children(|card| {
                card.spawn(words(flight.name, 22.0, INK));
                card.spawn(words(flight.line, 12.0, FAINT));
                card.spawn((Line::Clock, line(30.0, INK)));
                card.spawn((Line::Event, line(13.0, FAINT)));
            });
            row.spawn(panel(Node::default())).with_children(|card| {
                card.spawn((Line::Pilot, line(14.0, INK)));
                card.spawn((Line::Alarm, line(14.0, ALARM)));
            });
            row.spawn(panel(Node::default())).with_children(|card| {
                card.spawn((Line::Figures, line(14.0, INK)));
            });
        });
        page.spawn(panel(corner(Node { bottom: px(14), left: px(14), ..default() }))).with_children(|card| {
            card.spawn((Line::Modes, line(12.0, INK)));
            card.spawn(words(KEYS, 12.0, FAINT));
        });
    });
}

/// What the vehicle is doing, when the hand has it: the record's events are not its.
fn doing(hand: &Hand, sequence: &Sequence, t: f64) -> &'static str {
    match (hand.lit, hand.separated) {
        _ if hand.lost.is_some() => "Lost",
        _ if sequence.landed.is_some() => "Down",
        _ if sequence.main.is_some() => "Under the main parachute",
        _ if sequence.drogue.is_some() => "Under the drogue",
        (None, _) if t < 0.0 => "The count",
        (None, _) => "Holding at zero for the engine",
        _ if hand.burning => "The engine is burning",
        (_, None) => "Coasting on the booster",
        _ if sequence.apogee.is_some() => "Coming down",
        _ => "Free of the booster, going up",
    }
}

/// A direction as the readout gives it: so far up, on such a bearing (which means nothing straight up or down).
fn pointing(up: f64, bearing: f64) -> String {
    match up {
        up if up > 89.5 => "straight up".to_owned(),
        up if up < -89.5 => "straight down".to_owned(),
        up => format!("{up:+.0} up, {bearing:03.0} true"),
    }
}

fn figures(f: &Telemetry) -> String {
    let apogee = f.apogee.map_or_else(|| "none".to_owned(), length_reading);
    format!(
        "Height     {}\nTop        {apogee}\nSpeed      {:.0} m/s\nClimb      {:+.0} m/s\nRange      {}\n\
         Mach       {:.2}\nPressure   {:.1} kPa\nLoad       {:.1} g\nThrust     {:.0} kN\nPropellant {:.0} %\n\
         Nose       {}\nPath       {}\nStructure  {:.0} %",
        length_reading(f.height),
        f.speed,
        f.climb + 0.0,
        length_reading(f.range),
        f.mach,
        f.q / 1000.0,
        f.g,
        f.thrust / 1000.0,
        f.propellant * 100.0,
        pointing(f.pitch, f.heading),
        if f.speed > 0.5 { pointing(f.path, f.track) } else { "at rest".to_owned() },
        f.stress.part * 100.0,
    )
}

/// The pilot's panel: who is flying, what Space does next and when the record did it, and where the record had
/// the nose just now. The record is shown, never obeyed: flying to it is the game.
fn pilot(hand: &Hand, plan: &Plan, sequence: &Sequence, f: &Telemetry) -> String {
    if hand.guided {
        return "AS FLOWN  the record flies it".to_owned();
    }
    if hand.lost.is_some() {
        return "THE FLIGHT IS OVER".to_owned();
    }
    let attitude = if hand.hold { "attitude held" } else { "attitude free" };
    let mut says = vec![format!("BY HAND  {attitude}")];
    // Once the parachutes are out there is nothing left to do but ride it down.
    let did = match hand.next() {
        _ if sequence.drogue.is_some() => None,
        Action::Light => Some(0.0),
        Action::Tower => Some(plan.tower_off.value),
        Action::Separate => Some(plan.separation.value),
        Action::Retro => Some(plan.retro_fires[0].value),
        Action::Retropack => Some(plan.retropack_off.value),
        Action::Nothing => None,
    };
    if let Some(did) = did {
        says.push(format!("Space  {}  (as flown {})", hand.next().label(), clock_reading(did)));
    }
    if hand.burning {
        says.push(format!("X  cut the engine off  (as flown {})", clock_reading(plan.cutoff.value)));
    }
    if let Some([up, bearing]) = f.cue {
        let (flown, yours) = (pointing(up, bearing), pointing(f.pitch, f.heading));
        says.push(format!("Nose as flown  {flown}\nNose now       {yours}"));
    }
    says.join("\n")
}

fn alarm(hand: &Hand, f: &Telemetry) -> String {
    let mut said = Vec::new();
    if let Some(loss) = hand.broke {
        said.push(format!("The booster broke up: {}", loss.reading()));
    }
    if let Some(loss) = hand.lost {
        said.push(format!("The capsule was lost: {}", loss.reading()));
    } else if f.stress.part >= NEAR {
        let what = if f.stress.strain == Strain::Bending { "the air is bending it" } else { "the load" };
        said.push(format!("Structure at {:.0} % of its limit: {what}", f.stress.part * 100.0));
    }
    said.join("\n")
}

fn read(
    showing: Res<Showing>,
    clock: Res<Clock>,
    telemetry: Res<Telemetry>,
    hand: Res<Hand>,
    sequencer: Res<Sequencer>,
    rig: Res<Rig>,
    look: Res<Look>,
    mut lines: Query<(&Line, &mut Text)>,
) {
    let event = if !clock.ready {
        "The models are arriving"
    } else if clock.stopped {
        "The clock is stopped"
    } else if hand.guided {
        showing
            .0
            .events
            .iter()
            .rev()
            .find(|event| event.at <= clock.t)
            .map_or("The count", |event| event.label)
    } else {
        doing(&hand, &sequencer.0, clock.t)
    };
    for (line, mut text) in &mut lines {
        let says = match line {
            Line::Clock => clock_reading(clock.t),
            Line::Event => event.to_owned(),
            Line::Figures => figures(&telemetry),
            Line::Pilot => pilot(&hand, &showing.0.plan, &sequencer.0, &telemetry),
            Line::Alarm => alarm(&hand, &telemetry),
            Line::Modes => {
                format!("Clock x{:.0}    Camera: {}    Grade: {}", clock.rate(), rig.kind.name(), look.name())
            }
        };
        if text.0 != says {
            text.0 = says;
        }
    }
}

fn tuck(
    keys: Res<ButtonInput<KeyCode>>,
    mut panels: Query<&mut Visibility, With<Panels>>,
    mut look: ResMut<Look>,
) {
    if keys.just_pressed(KeyCode::KeyH) {
        for mut seen in &mut panels {
            *seen = if *seen == Visibility::Hidden { Visibility::Inherited } else { Visibility::Hidden };
        }
    }
    if keys.just_pressed(KeyCode::KeyL) {
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
