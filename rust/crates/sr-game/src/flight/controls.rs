//! The keys that work the hand's switches, and what follows from them each step: the propellant burned, and the
//! count held at zero until the pilot lights the engine.

use bevy::prelude::*;

use super::hand::Hand;
use crate::clock::Clock;
use crate::{Options, Showing};

/// The hand's start.
pub fn take(mut commands: Commands, showing: Res<Showing>, options: Res<Options>) {
    commands.insert_resource(Hand::new(&showing.0.plan, options.at));
}

/// The keys: the stick, the engine, the action key, the abort, the hold and the record.
pub fn keys(keys: Res<ButtonInput<KeyCode>>, mut hand: ResMut<Hand>, mut clock: ResMut<Clock>) {
    let axis = |plus: KeyCode, minus: KeyCode| f32::from(keys.pressed(plus)) - f32::from(keys.pressed(minus));
    let stick = Vec3::new(
        axis(KeyCode::KeyW, KeyCode::KeyS),
        axis(KeyCode::KeyD, KeyCode::KeyA),
        axis(KeyCode::KeyE, KeyCode::KeyQ),
    );
    let stick = if hand.lost.is_some() { Vec3::ZERO } else { stick };
    if hand.stick != stick {
        hand.stick = stick;
    }
    if keys.just_pressed(KeyCode::KeyT) {
        hand.hold = !hand.hold;
    }
    // The record can only be given the flight while it is still on the pad, and takes its own count.
    if keys.just_pressed(KeyCode::KeyG) && hand.lit.is_none() {
        hand.guided = !hand.guided;
        clock.t = clock.t.min(-5.0);
    }
    if hand.guided || !clock.ready || hand.lost.is_some() {
        return;
    }
    if keys.just_pressed(KeyCode::Space) || (keys.just_pressed(KeyCode::KeyZ) && hand.lit.is_none()) {
        // Lit during the count, the count is over: liftoff is when the pilot says.
        clock.t = clock.t.max(0.0);
        hand.act(clock.t);
    }
    if keys.just_pressed(KeyCode::KeyZ)
        && hand.lit.is_some()
        && hand.separated.is_none()
        && hand.propellant > 0.0
    {
        hand.burning = true;
    }
    if keys.just_pressed(KeyCode::KeyX) {
        hand.burning = false;
    }
    if keys.just_pressed(KeyCode::KeyB) {
        hand.abort(clock.t);
    }
}

/// The engine drinks its propellant, and stops when one of them is gone.
pub fn burn(showing: Res<Showing>, clock: Res<Clock>, time: Res<Time>, mut hand: ResMut<Hand>) {
    if !clock.ready || hand.guided || !hand.burning {
        return;
    }
    hand.propellant -= showing.0.plan.engine.flow() * time.delta_secs_f64();
    if hand.propellant <= 0.0 {
        hand.propellant = 0.0;
        hand.burning = false;
    }
}

/// By hand the count holds at zero until the engine is lit: liftoff is when the pilot says.
pub fn hold_count(hand: Res<Hand>, mut clock: ResMut<Clock>) {
    if !hand.guided && hand.lit.is_none() && clock.t > 0.0 {
        clock.t = 0.0;
    }
}
