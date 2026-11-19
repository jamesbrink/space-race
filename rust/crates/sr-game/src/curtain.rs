//! The curtain: nothing of the world is shown until what it needs has arrived and settled (AGENTS.md: "before any
//! of a site is seen the scene is warmed ... then the canvas fades up"; the web build's `src/app/curtain.ts`). Until
//! then a dark card in the print's palette: what is coming, where and when, and a quiet line saying what is still
//! on its way. Then it fades.
//!
//! What it waits for: every model on the stage arrived with everything it depends on; the land's cover baked
//! (`sr_render::earth::LandBaked`); no picture arriving for a moment (the Earth's maps and the day's weather map are
//! loaded inside `sr-render` with no signal of their own, and each comes as a picture); then a few seconds of
//! frames drawn behind it, so the exposure, the sky's light and the temporal anti-aliasing have settled. Under the curtain
//! no key acts but the sound's (M, - and =), and the flight's clock does not run.

use bevy::asset::AssetEvent;
use bevy::input::mouse::AccumulatedMouseScroll;
use bevy::prelude::*;
use bevy::world_serialization::{WorldAssetRoot, WorldInstanceReady};
use sr_render::earth::LandBaked;

use crate::clock::Clock;
use crate::opening::Opening;
use crate::stage::Cast;
use crate::{Options, Showing};

/// The card: nearly black, toned toward the print's teal shadow; the words in its cream and its faint grey.
const CARD: Color = Color::srgb(0.018, 0.024, 0.026);
const INK: Color = Color::srgb(0.953, 0.937, 0.902);
const FAINT: Color = Color::srgb(0.66, 0.635, 0.58);
/// The print's type: Liberation Sans, the font the models' lettering is set in (`tools/blender/fonts`, SIL OFL).
const TYPE: &str = "fonts/LiberationSans-Regular.ttf";
const TYPE_BOLD: &str = "fonts/LiberationSans-Bold.ttf";
/// How long no picture must arrive, once the models and the land are there, before the Earth's maps are taken to
/// have arrived too, s: they have no signal of their own (see the head of this file).
const QUIET: f32 = 0.5;
/// Frames drawn behind the curtain once all is there, before it lifts: the exposure, the sky's light and the
/// anti-aliasing's history settle in them.
const SETTLE: u32 = 120;
/// How long the curtain takes to fade, s.
const FADE: f32 = 2.4;
/// The keys that act under it: the sound's.
const HEARD: [KeyCode; 3] = [KeyCode::KeyM, KeyCode::Minus, KeyCode::Equal];

/// Where the curtain is.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Phase {
    /// Down: the world is not shown.
    Up,
    /// Fading, so far through, 0 to 1.
    Lifting(f32),
    /// Gone.
    Gone,
}

/// The curtain and what it is waiting for.
#[derive(Resource, Debug, Clone, PartialEq)]
pub struct Curtain {
    /// Where it is.
    pub phase: Phase,
    arrived: usize,
    quiet: f32,
    settled: u32,
}

impl Curtain {
    /// Whether the world is hidden by it.
    #[must_use]
    pub fn is_up(&self) -> bool {
        self.phase == Phase::Up
    }
}

/// The card's parts.
#[derive(Component)]
struct Card;
#[derive(Component)]
struct Still;

/// The curtain.
pub struct CurtainPlugin;

impl Plugin for CurtainPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, lay)
            .add_observer(arrived)
            .add_systems(PreUpdate, gate.after(bevy::input::InputSystems))
            .add_systems(Update, (watch, hold, fade).chain());
    }
}

fn lay(mut commands: Commands, options: Res<Options>, showing: Res<Showing>, assets: Res<AssetServer>) {
    // (a frame for a file waits for what it needs by itself, and a flight heard has no window)
    let up = options.shot.is_none() || options.film.is_some();
    commands.insert_resource(Curtain {
        phase: if up { Phase::Up } else { Phase::Gone },
        arrived: 0,
        quiet: 0.0,
        settled: 0,
    });
    if !up {
        return;
    }
    let flight = showing.0;
    let (regular, bold) = (assets.load(TYPE), assets.load(TYPE_BOLD));
    let font = |font: &Handle<Font>, size: f32| TextFont {
        font: font.clone().into(),
        font_size: size.into(),
        ..default()
    };
    let programme = flight.line.split(',').next().unwrap_or(flight.line).to_uppercase();
    let (year, month, day, ..) = flight.launch;
    let months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    let date = format!("{day} {} {year}", months.get(month as usize - 1).copied().unwrap_or(""));
    let card = Node {
        position_type: PositionType::Absolute,
        width: percent(100),
        height: percent(100),
        flex_direction: FlexDirection::Column,
        justify_content: JustifyContent::Center,
        align_items: AlignItems::Center,
        row_gap: px(10),
        ..default()
    };
    commands.spawn((Card, card, BackgroundColor(CARD), GlobalZIndex(100))).with_children(|card| {
        card.spawn((Text::new(spaced(&programme)), font(&regular, 13.0), TextColor(FAINT)));
        card.spawn((Text::new(flight.name), font(&bold, 54.0), TextColor(INK)));
        card.spawn((Text::new(flight.site.name), font(&regular, 17.0), TextColor(INK)));
        card.spawn((Text::new(date), font(&regular, 17.0), TextColor(FAINT)));
        let foot = Node { position_type: PositionType::Absolute, bottom: px(36), ..default() };
        card.spawn((
            Still,
            Text::new("The vehicle and its pad are on their way"),
            font(&regular, 12.0),
            TextColor(FAINT),
            foot,
        ));
    });
}

/// Letters spaced apart, as a small heading in capitals is set.
fn spaced(words: &str) -> String {
    words.chars().map(String::from).collect::<Vec<_>>().join("\u{2009}")
}

fn arrived(ready: On<WorldInstanceReady>, cast: Query<(), With<Cast>>, curtain: Option<ResMut<Curtain>>) {
    if let (true, Some(mut curtain)) = (cast.contains(ready.entity), curtain) {
        curtain.arrived += 1;
    }
}

/// What the curtain is waiting for, said on it; and once nothing is, the frames counted until it lifts.
fn watch(
    mut curtain: ResMut<Curtain>,
    time: Res<Time<Real>>,
    assets: Res<AssetServer>,
    cast: Query<&WorldAssetRoot, With<Cast>>,
    mut images: MessageReader<AssetEvent<Image>>,
    land: Option<Res<LandBaked>>,
    mut still: Query<&mut Text, With<Still>>,
) {
    if !curtain.is_up() {
        return;
    }
    let pictures = images
        .read()
        .filter(|e| matches!(e, AssetEvent::Added { .. } | AssetEvent::LoadedWithDependencies { .. }))
        .count();
    let models = curtain.arrived >= cast.iter().count()
        && cast.iter().all(|root| assets.is_loaded_with_dependencies(&root.0));
    let laid = models && land.is_some();
    curtain.quiet = if pictures > 0 || !laid { 0.0 } else { curtain.quiet + time.delta_secs() };
    let saying = if !models {
        "The vehicle and its pad are on their way"
    } else if curtain.quiet < QUIET {
        "The land, the sea and the sky are being laid"
    } else {
        curtain.settled += 1;
        "The light is settling"
    };
    if let Ok(mut text) = still.single_mut()
        && text.0 != saying
    {
        saying.clone_into(&mut text.0);
    }
    if curtain.settled >= SETTLE {
        curtain.phase = Phase::Lifting(0.0);
    }
}

/// The flight's clock does not run under it; as it lifts the clock runs again, unless the opening has it.
fn hold(
    curtain: Res<Curtain>,
    opening: Option<Res<Opening>>,
    mut clock: ResMut<Clock>,
    mut held: Local<bool>,
) {
    match curtain.phase {
        Phase::Up if !clock.stopped => {
            clock.stopped = true;
            *held = true;
        }
        Phase::Lifting(_) | Phase::Gone if *held => {
            *held = false;
            if !opening.is_some_and(|opening| opening.playing()) {
                clock.stopped = false;
            }
        }
        _ => {}
    }
}

/// It fades, and goes.
fn fade(
    mut commands: Commands,
    mut curtain: ResMut<Curtain>,
    time: Res<Time<Real>>,
    card: Query<Entity, With<Card>>,
    mut colours: Query<(&mut BackgroundColor, &Children), With<Card>>,
    mut words: Query<&mut TextColor>,
) {
    let Phase::Lifting(through) = curtain.phase else { return };
    let through = (through + time.delta_secs() / FADE).min(1.0);
    curtain.phase = if through >= 1.0 { Phase::Gone } else { Phase::Lifting(through) };
    if curtain.phase == Phase::Gone {
        card.iter().for_each(|card| commands.entity(card).despawn());
        return;
    }
    // the words go first, then the dark
    let (dark, ink) = (1.0 - smooth((through - 0.2) / 0.8), 1.0 - smooth(through / 0.35));
    for (mut background, children) in &mut colours {
        background.0.set_alpha(dark);
        for &child in children {
            if let Ok(mut colour) = words.get_mut(child) {
                colour.0.set_alpha(ink);
            }
        }
    }
}

fn smooth(x: f32) -> f32 {
    let x = x.clamp(0.0, 1.0);
    x * x * (3.0 - 2.0 * x)
}

/// Under the curtain no key or click reaches the game but the sound's (run before anything else hears them).
pub fn gate(
    curtain: Option<Res<Curtain>>,
    mut keys: ResMut<ButtonInput<KeyCode>>,
    mut buttons: ResMut<ButtonInput<MouseButton>>,
    mut scroll: ResMut<AccumulatedMouseScroll>,
) {
    if !curtain.is_some_and(|curtain| curtain.is_up()) {
        return;
    }
    let held: Vec<KeyCode> =
        keys.get_pressed().chain(keys.get_just_released()).copied().filter(|k| !HEARD.contains(k)).collect();
    for key in held {
        keys.reset(key);
    }
    buttons.reset_all();
    *scroll = AccumulatedMouseScroll::default();
}
