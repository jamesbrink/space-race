//! The attitude ball: where the nose points against the horizon and the compass, which way the vehicle is going,
//! and where the record had the nose, at a glance. A hand cannot fly a rocket from figures alone.
//!
//! A ball painted as the sky and the ground is turned so that what faces the pilot is what the nose points at;
//! the nose's own mark stays in the middle. It is seen as the sky is from inside it (east is right of north), so
//! it is drawn mirrored. Its own small camera draws it to a picture, and the readout shows the picture at the foot
//! of the window.

mod ball;
mod lay;
mod turn;

use bevy::prelude::*;

/// The ball itself.
#[derive(Component)]
struct Ball;

/// What a mark on the ball marks.
#[derive(Component, Debug, Clone, Copy)]
enum Mark {
    /// The way the vehicle is going, and the way it has come from.
    Ahead,
    Behind,
    /// Where the record had the nose.
    Flown,
}

/// The attitude ball.
pub struct NavballPlugin;

impl Plugin for NavballPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, lay::lay).add_systems(Update, turn::turn);
    }
}
