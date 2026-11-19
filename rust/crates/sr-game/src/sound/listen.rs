//! Each step of the physics the vehicle's present is added to its past; each frame what the ears make of that
//! past is worked out and the synthesiser's knobs set to it.

use avian3d::prelude::{LinearVelocity, Position, Rotation};
use bevy::prelude::*;
use sr_render::origin::{Eye, WorldPos};
use sr_sim::Body;

use super::ears::{self, Source};
use super::figures::{CAPE_MAINS, CAPE_QUIET, INVERTER};
use super::model::{Craft, Hearing, mix};
use super::shared::Knob;
use super::state::Sound;
use crate::Showing;
use crate::clock::Clock;
use crate::flight::bodies::v3;
use crate::flight::{Course, Crewed, Flier, Hand, Sequencer, Telemetry};
use crate::rig::Rig;

/// How long the engine takes to come to its thrust when a hand lights it, and to die when a hand cuts it, s.
/// Estimated: the record's own start takes 1.4 s (`flight/fire.rs`), and a switch is a step.
const LIGHTS: f64 = 0.6;
const CUTS: f64 = 0.35;

/// The crewed body, as the systems here ask for it.
type Crew<'w, 's> = Query<
    'w,
    's,
    (&'static Position, &'static Rotation, &'static LinearVelocity, &'static Flier),
    With<Crewed>,
>;

/// Each step: where the vehicle is and how loud, kept.
pub fn record(
    clock: Res<Clock>,
    showing: Res<Showing>,
    course: Res<Course>,
    hand: Res<Hand>,
    time: Res<Time>,
    crewed: Crew,
    mut sound: ResMut<Sound>,
) {
    let Ok((at, turned, velocity, flier)) = crewed.single() else { return };
    if !clock.ready {
        return;
    }
    let flight = showing.0;
    if sound.history.is_empty() && hand.guided && clock.t > 0.0 {
        for past in ears::flown(flight, &course, &hand, clock.t, Sound::KEEP) {
            sound.history.push(past);
        }
    }
    // The record's engine builds and dies by its own clock; a hand's switch is given the time an engine takes.
    let want = f64::from(hand.fire(&flight.plan, clock.t));
    let dt = time.delta_secs_f64();
    sound.burn =
        if hand.guided { want } else { sound.burn + (want - sound.burn).clamp(-dt / CUTS, dt / LIGHTS) };
    let source = Source {
        t: clock.t,
        at: v3(at.0),
        velocity: v3(velocity.0.as_dvec3()),
        axis: v3((turned.0 * Vec3::Y).as_dvec3()),
        stack: flier.0 == Body::Stack,
        burn: sound.burn,
    };
    sound.history.push(source.past(flight, &course));
}

/// Each frame: the ears are found, what they hear of the vehicle's past is solved for, and the knobs are set.
pub fn hear(
    clock: Res<Clock>,
    showing: Res<Showing>,
    course: Res<Course>,
    flown: (Res<Hand>, Res<Sequencer>, Res<Telemetry>),
    rig: Option<Res<Rig>>,
    eye: Query<(&WorldPos, &Transform), With<Eye>>,
    crewed: Crew,
    mut sound: ResMut<Sound>,
) {
    let master = if sound.muted { 0.0 } else { sound.level };
    sound.shared.set(Knob::Master, master);
    let (Some(rig), Ok((eye, looks)), Ok((at, _, velocity, flier))) = (rig, eye.single(), crewed.single())
    else {
        sound.listener = None;
        return;
    };
    if !clock.ready {
        return;
    }
    let seat = ears::seat(rig.kind);
    let listener = ears::listener(&course, seat, eye.0, looks.rotation * Vec3::X, velocity.0.as_dvec3());
    let heard = sound.history.heard(clock.t, &listener.ears);
    let (hand, sequencer, telemetry) = (&*flown.0, &*flown.1, &*flown.2);
    let body = (flier.0, v3(at.0), sound.burn);
    let hearing = Hearing {
        rate: f64::from(clock.rate()),
        running: !clock.stopped,
        listener,
        craft: Craft::of(&showing.0.plan.engine),
        now: ears::now((showing.0, &clock), (hand, sequencer, telemetry), body, &listener, &course),
        heard: &heard,
        quiet: CAPE_QUIET.map(|gain| gain.value),
    };
    let mixed = mix(&hearing);
    sound.shared.tune(&mixed, CAPE_MAINS.value as f32, INVERTER.value as f32);
    // (the loudest is the nearest, near enough: it is what the diagnostics name)
    sound.heard = heard.iter().min_by(|a, b| a.distance.total_cmp(&b.distance)).copied();
    sound.mix = mixed;
    sound.listener = Some(listener);
}
