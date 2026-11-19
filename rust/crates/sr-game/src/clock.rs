//! The flight's clock: seconds from liftoff, and how fast they pass. Everything that moves follows it
//! (docs/agents/world.md: "time comes from the clock"), so a stopped clock stops the flight, the cloud and the sea.

use std::time::Duration;

use bevy::prelude::*;

use crate::Options;

/// How many seconds of the flight pass in one of ours, in the order the keys step through them: each twice the
/// last, as the web build's clock has them.
pub const RATES: [f32; 7] = [1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 64.0];
/// The physics steps this often, Hz.
pub const STEPS: f64 = 100.0;

/// Seconds from liftoff, and the rate they pass at.
#[derive(Resource, Debug, Clone, Copy, PartialEq)]
pub struct Clock {
    /// Seconds from liftoff; negative before it.
    pub t: f64,
    /// Which of [`RATES`] it runs at.
    pub rate: usize,
    /// Whether it is stopped.
    pub stopped: bool,
    /// Whether the flight has been set up and it may run.
    pub ready: bool,
}

impl Clock {
    /// How many seconds of the flight pass in one of ours.
    #[must_use]
    pub fn rate(&self) -> f32 {
        RATES[self.rate.min(RATES.len() - 1)]
    }
}

/// When the flight is worked out: each step of the physics, in this order.
#[derive(SystemSet, Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Step {
    /// The clock moves on.
    Tick,
    /// Things come apart.
    Stage,
    /// What pushes on each body is found and applied.
    Drive,
}

/// The clock and its keys.
pub struct ClockPlugin;

impl Plugin for ClockPlugin {
    fn build(&self, app: &mut App) {
        app.insert_resource(Time::<Fixed>::from_hz(STEPS))
            .configure_sets(FixedUpdate, (Step::Tick, Step::Stage, Step::Drive).chain())
            .add_systems(Startup, wind)
            .add_systems(FixedUpdate, tick.in_set(Step::Tick))
            .add_systems(Update, keys);
    }
}

fn wind(mut commands: Commands, options: Res<Options>, mut time: ResMut<Time<Virtual>>) {
    // (the rate asked for, or the nearest there is below it)
    let rate = RATES.iter().rposition(|&rate| rate <= options.rate).unwrap_or(0);
    commands.insert_resource(Clock { t: options.at, rate, stopped: false, ready: false });
    time.set_relative_speed(RATES[rate]);
    // (sixty-four seconds of flight in one of ours is a great many steps to one frame: let them all be taken)
    time.set_max_delta(Duration::from_secs(4));
}

fn tick(mut clock: ResMut<Clock>, time: Res<Time<Fixed>>) {
    if clock.ready {
        clock.t += time.delta_secs_f64();
    }
}

fn keys(keys: Res<ButtonInput<KeyCode>>, mut clock: ResMut<Clock>, mut time: ResMut<Time<Virtual>>) {
    // P stops it (Space is the pilot's); [ and ] step the rate as the web build's do, and so do , and .
    if keys.just_pressed(KeyCode::KeyP) {
        clock.stopped = !clock.stopped;
    }
    if keys.any_just_pressed([KeyCode::BracketRight, KeyCode::Period]) {
        clock.rate = (clock.rate + 1).min(RATES.len() - 1);
    }
    if keys.any_just_pressed([KeyCode::BracketLeft, KeyCode::Comma]) {
        clock.rate = clock.rate.saturating_sub(1);
    }
    if clock.is_changed() {
        time.set_relative_speed(clock.rate());
        if clock.stopped { time.pause() } else { time.unpause() }
    }
}
