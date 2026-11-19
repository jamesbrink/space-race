//! What the opening says while it plays, and how it goes dark and comes up: a line at the foot with the time on
//! the Cape's clocks, how fast the clock is running, and the last thing the record has happen on the pad; a veil
//! that takes the picture down and up between shots where time has passed, and for a skip; and the readout, kept
//! away until the hand-over and then faded in.

use bevy::prelude::*;

use super::shots::{Enter, SHOTS};
use super::{Opening, Phase};
use crate::Showing;
use crate::hud::Panels;

const INK: Color = Color::srgb(0.953, 0.937, 0.902);
const FAINT: Color = Color::srgb(0.70, 0.68, 0.63);
const TYPE: &str = "fonts/LiberationSans-Regular.ttf";
/// How long the readout takes to come up at the hand-over, s.
const READOUT_UP: f64 = 1.6;

#[derive(Component)]
pub(super) struct Veil;
#[derive(Component)]
pub(super) struct Words;
#[derive(Component, Clone, Copy, PartialEq, Eq)]
pub(super) enum Line {
    Time,
    Event,
    Skip,
}

pub(super) fn lay(mut commands: Commands, assets: Res<AssetServer>) {
    let font = assets.load::<Font>(TYPE);
    let words = |size: f32| TextFont { font: font.clone().into(), font_size: size.into(), ..default() };
    let whole = Node {
        position_type: PositionType::Absolute,
        width: percent(100),
        height: percent(100),
        ..default()
    };
    commands.spawn((Veil, whole, BackgroundColor(Color::BLACK.with_alpha(0.0)), GlobalZIndex(90)));
    let foot = Node {
        position_type: PositionType::Absolute,
        left: px(32),
        right: px(32),
        bottom: px(28),
        justify_content: JustifyContent::SpaceBetween,
        align_items: AlignItems::FlexEnd,
        ..default()
    };
    commands.spawn((Words, foot, GlobalZIndex(91), Visibility::Hidden)).with_children(|foot| {
        foot.spawn(Node { flex_direction: FlexDirection::Column, row_gap: px(4), ..default() })
            .with_children(|left| {
                left.spawn((Line::Time, Text::default(), words(15.0), TextColor(INK)));
                left.spawn((Line::Event, Text::default(), words(13.0), TextColor(FAINT)));
            });
        foot.spawn((Line::Skip, Text::new("Any key: to T-12"), words(11.0), TextColor(FAINT)));
    });
}

/// How dark the veil is between shots: down and up over a dip's seconds about the cut.
fn dip(opening: &Opening) -> f64 {
    let line = &opening.timeline;
    let mut dark: f64 = 0.0;
    for shot in &SHOTS {
        if let Enter::Dip(seconds) = shot.enter {
            let off = ((opening.tau - line.tau(shot.from)).abs() / (seconds / 2.0)).min(1.0);
            dark = dark.max(1.0 - off * off * (3.0 - 2.0 * off));
        }
    }
    dark
}

/// The time on the Cape's clocks at `t` seconds from liftoff, as hours and minutes.
fn wall(showing: Showing, t: f64) -> String {
    let (.., hour, minute, second) = showing.0.launch;
    let (zone, offset) = showing.0.site.zone;
    let of_day = (f64::from(hour * 3600 + minute * 60) + second + offset * 3600.0 + t).rem_euclid(86_400.0);
    let minutes = (of_day / 60.0).floor() as u32;
    format!("{:02}:{:02}:{:02} {zone}", minutes / 60, minutes % 60, (of_day % 60.0).floor() as u32)
}

/// Each frame: the veil, and the words at the foot.
pub(super) fn say(
    opening: Res<Opening>,
    showing: Res<Showing>,
    mut veil: Query<&mut BackgroundColor, With<Veil>>,
    mut words: Query<&mut Visibility, With<Words>>,
    mut lines: Query<(&Line, &mut Text, &mut TextColor)>,
) {
    let dark = if opening.playing() { dip(&opening).max(opening.skip_dark()) } else { opening.skip_dark() };
    if let Ok(mut veil) = veil.single_mut() {
        veil.0.set_alpha(dark as f32);
    }
    let shown = opening.phase == Phase::Playing || matches!(opening.phase, Phase::Skipping(_));
    if let Ok(mut seen) = words.single_mut() {
        let want = if shown { Visibility::Inherited } else { Visibility::Hidden };
        if *seen != want {
            *seen = want;
        }
    }
    if !shown {
        return;
    }
    let line = &opening.timeline;
    let t = line.t(opening.tau);
    let rate = (line.t(opening.tau + 0.25) - t) / 0.25;
    let event = opening.keys.iter().rev().find(|key| key.at.value <= t).map_or("", |key| key.event);
    // (the words come up after the curtain and go with the picture)
    let alpha = (opening.tau / 1.5).min(1.0) * (1.0 - dark);
    for (which, mut text, mut colour) in &mut lines {
        let said = match which {
            Line::Time if rate > 1.5 => format!("{}    \u{d7}{}", wall(*showing, t), grouped(rate)),
            Line::Time => wall(*showing, t),
            Line::Event => event.to_owned(),
            Line::Skip => continue,
        };
        if text.0 != said {
            text.0 = said;
        }
        colour.0.set_alpha(alpha as f32);
    }
}

/// A rate as it is read: whole, in thousands by a thin space past a thousand.
fn grouped(rate: f64) -> String {
    let whole = rate.round() as u64;
    if whole >= 1000 { format!("{}\u{2009}{:03}", whole / 1000, whole % 1000) } else { whole.to_string() }
}

/// The readout away while the opening plays, and faded in once it has handed over.
pub(super) fn readout(
    opening: Res<Opening>,
    children: Query<&Children>,
    mut panels: Query<(Entity, &mut Visibility), With<Panels>>,
    mut backgrounds: Query<&mut BackgroundColor, Without<Veil>>,
    mut texts: Query<&mut TextColor, Without<Line>>,
    mut images: Query<&mut ImageNode>,
    mut kept: Local<(Vec<(Entity, f32)>, bool)>,
) {
    let (kept, done) = &mut *kept;
    if *done {
        return;
    }
    let up = match opening.phase {
        Phase::Off => return,
        Phase::Done(after) => after - if opening.skipped { super::play::SKIP_DARK } else { 0.0 },
        _ => -1.0,
    };
    if up < 0.0 {
        for (_, mut seen) in &mut panels {
            if *seen != Visibility::Hidden {
                *seen = Visibility::Hidden;
            }
        }
        return;
    }
    // (each colour as the readout drew it, kept the first time it is faded)
    if kept.is_empty() {
        for (panel, mut seen) in &mut panels {
            *seen = Visibility::Inherited;
            for node in std::iter::once(panel).chain(children.iter_descendants(panel)) {
                let alpha = backgrounds
                    .get(node)
                    .map(|c| c.0.alpha())
                    .or_else(|_| texts.get(node).map(|c| c.0.alpha()));
                let alpha = alpha.or_else(|_| images.get(node).map(|i| i.color.alpha()));
                if let Ok(alpha) = alpha {
                    kept.push((node, alpha));
                }
            }
        }
    }
    let f = (up / READOUT_UP).clamp(0.0, 1.0);
    let f = (f * f * (3.0 - 2.0 * f)) as f32;
    *done = f >= 1.0;
    for &(node, alpha) in kept.iter() {
        if let Ok(mut c) = backgrounds.get_mut(node) {
            c.0.set_alpha(alpha * f);
        } else if let Ok(mut c) = texts.get_mut(node) {
            c.0.set_alpha(alpha * f);
        } else if let Ok(mut i) = images.get_mut(node) {
            i.color.set_alpha(alpha * f);
        }
    }
}
