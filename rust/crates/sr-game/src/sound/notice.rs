//! The things that happen once, noticed as the flight is flown (each step of the physics, off the hand's
//! switches, the sequencer and the accelerometer) and played when they reach the ears; and the Mach cone watched
//! for, whose passing is the boom.

use avian3d::prelude::{LinearVelocity, Position};
use bevy::prelude::*;
use sr_missions::Flight;
use sr_sim::{Body, air};

use super::air::carries;
use super::cues::{Cue, Happening, Loud, boom};
use super::ears;
use super::figures::{BANGS, FASTEST, POSIGRADE, REEFED, SEA_ECHO, SHAPE_CAPSULE, SHAPE_STACK};
use super::model::{Craft, Listener};
use super::state::{Seen, Sound};
use crate::Showing;
use crate::clock::Clock;
use crate::flight::bodies::v3;
use crate::flight::hand::Why;
use crate::flight::{Course, Crewed, Flier, Hand, Sequencer, Telemetry};

/// Something noticed longer after it happened than this was not seen to happen (a flight joined late), s.
const FRESH: f64 = 1.0;
/// A change of speed in one step of the physics over this is a blow, m/s; no two are heard nearer together than
/// `APART`, s, nor within it of anything else that happened. Estimated.
const BLOW: f64 = 1.5;
const APART: f64 = 0.3;
/// Something that reached the ears longer ago than this was missed (the ears were moved), s; something that has
/// not reached them after `LOST` never will.
const MISSED: f64 = 0.5;
const LOST: f64 = 400.0;
/// Ears higher than this over the sea hear a boom come back up from it, m.
const ALOFT: f64 = 50.0;

/// When each of the flight's events is due, s; `None` while it is not.
fn due(flight: &Flight, hand: &Hand, sequencer: &Sequencer) -> [Option<f64>; 13] {
    let plan = &flight.plan;
    let [tower, booster, pack] = hand.leaves(plan);
    let first = plan.retro_fires[0].value;
    let retro = |i: usize| {
        if hand.guided {
            Some(plan.retro_fires[i].value)
        } else {
            hand.retro.map(|lit| lit + plan.retro_fires[i].value - first)
        }
    };
    let main = sequencer.0.main;
    [
        tower,
        hand.aborted,
        booster,
        retro(0),
        retro(1),
        retro(2),
        pack,
        sequencer.0.drogue,
        main,
        main.map(|out| out + REEFED.value),
        sequencer.0.landed,
        hand.broke.map(|loss| loss.t),
        hand.lost.map(|loss| loss.t),
    ]
}

/// What each event sounds as: its kinds, how loud each is where it happens and how long it lasts.
fn sounds(event: usize, flight: &Flight, hand: &Hand, seen: &Seen, sea: bool) -> Vec<(Cue, Loud, f64)> {
    let plan = &flight.plan;
    let rocket = |thrust: f64, burns: f64| (Cue::Rocket, Happening::rocket(thrust), burns);
    let bang = |cue: Cue, kind: usize, more: f64| (cue, Loud::Bang(BANGS[kind].value + more), 0.0);
    let relay = (Cue::Relay, Loud::Cabin(BANGS[4].value), 0.0);
    let [escape, jettison] = plan.tower_motors;
    let landing = 20.0 * seen.speed.max(1.0).log10();
    match event {
        // The tower leaves on both its motors, or on the small one if the escape rocket was spent in an abort.
        0 if hand.aborted.is_some() => {
            vec![bang(Cue::Bolt, 0, 0.0), rocket(jettison.thrust.value, jettison.burn.value)]
        }
        0 => vec![
            bang(Cue::Bolt, 0, 0.0),
            rocket(escape.thrust.value + jettison.thrust.value, escape.burn.value),
            relay,
        ],
        1 => vec![bang(Cue::Bolt, 0, 0.0), rocket(escape.thrust.value, escape.burn.value), relay],
        // The capsule leaves on its posigrades, unless the escape rocket has already pulled it off.
        2 if hand.aborted.is_none() && hand.broke.is_none() => {
            vec![bang(Cue::Bolt, 0, 0.0), rocket(POSIGRADE[0].value, POSIGRADE[1].value), relay]
        }
        3..=5 => vec![rocket(plan.retro.thrust.value, plan.retro.burn.value), relay],
        6 => vec![bang(Cue::Bolt, 0, -3.0), relay],
        7 => vec![bang(Cue::Mortar, 1, 0.0), relay],
        8 => vec![bang(Cue::Bolt, 0, -3.0), bang(Cue::Canopy, 2, 0.0), relay],
        9 => vec![bang(Cue::Canopy, 2, -3.0)],
        10 if hand.lost.is_none() => vec![bang(if sea { Cue::Splash } else { Cue::Strike }, 5, landing)],
        11 => vec![bang(Cue::Break, 3, 0.0)],
        12 => match hand.lost {
            Some(loss) if loss.why == Why::Blow => {
                vec![bang(Cue::Strike, 5, 20.0 * loss.by.max(1.0).log10())]
            }
            _ => vec![bang(Cue::Break, 3, -6.0)],
        },
        _ => Vec::new(),
    }
}

/// Each step: whatever has just happened is noticed, and waits to be heard.
pub fn notice(
    clock: Res<Clock>,
    showing: Res<Showing>,
    flown: (Res<Hand>, Res<Sequencer>, Res<Telemetry>),
    crewed: Query<(&Position, &LinearVelocity, &Flier), With<Crewed>>,
    mut sound: ResMut<Sound>,
) {
    let Ok((at, velocity, flier)) = crewed.single() else { return };
    let (hand, sequencer, telemetry) = (&*flown.0, &*flown.1, &*flown.2);
    let (flight, t, at) = (showing.0, clock.t, v3(at.0));
    if !clock.ready || f64::from(clock.rate()) > FASTEST {
        sound.waiting.clear();
        return;
    }
    let air = air::at(telemetry.height);
    let happening = |(cue, loud, seconds): (Cue, Loud, f64)| Happening {
        cue,
        t,
        at,
        loud,
        seconds,
        sound: air.sound,
        carries: carries(telemetry.height),
    };
    let mut new = Vec::new();
    for (event, when) in due(flight, hand, sequencer).into_iter().enumerate() {
        let Some(when) = when.filter(|&when| t >= when && !sound.seen.done[event]) else { continue };
        sound.seen.done[event] = true;
        if t - when < FRESH {
            new.extend(sounds(event, flight, hand, &sound.seen, telemetry.height < 1.0));
        }
    }
    // The engine lighting, and a blow that nothing above accounts for.
    // (an engine found burning when the flight is joined was not seen to light)
    let burning = hand.fire(&flight.plan, t) > 0.0 && flier.0 == Body::Stack;
    let lit = std::mem::replace(&mut sound.seen.started, true) && !sound.seen.burning;
    if burning && lit {
        let power = Craft::of(&flight.plan.engine).power(flight.plan.engine.thrust.value);
        new.push((Cue::Ignition, Loud::Power(0.25 * power), 0.0));
    }
    sound.seen.burning = burning;
    let quiet = |last: Option<f64>| last.is_none_or(|last| t - last > APART);
    if !new.is_empty() {
        sound.seen.last = Some(t);
    } else if telemetry.jolt > BLOW && t >= 0.0 && quiet(sound.seen.last) && quiet(sound.seen.blow) {
        sound.seen.blow = Some(t);
        new.push((Cue::Strike, Loud::Bang(BANGS[5].value + 20.0 * telemetry.jolt.log10()), 0.0));
    }
    sound.seen.speed = f64::from(velocity.0.length());
    sound.waiting.extend(new.into_iter().map(happening));
}

/// Each frame: what has reached the ears is played, and the Mach cone is watched for.
pub fn deliver(
    clock: Res<Clock>,
    showing: Res<Showing>,
    course: Res<Course>,
    crewed: Query<&Flier, With<Crewed>>,
    mut sound: ResMut<Sound>,
) {
    let (Some(listener), Ok(flier)) = (sound.listener, crewed.single()) else { return };
    let (t, moved) = (clock.t, sound.seat.replace(listener.seat) != Some(listener.seat));
    if clock.stopped || f64::from(clock.rate()) > FASTEST || moved {
        // Nothing follows from what was heard at another rate or from another place.
        sound.cones.iter_mut().for_each(super::path::Cone::reset);
    }
    if clock.stopped || f64::from(clock.rate()) > FASTEST {
        return;
    }
    let waiting = std::mem::take(&mut sound.waiting);
    for happening in waiting {
        let late = t - happening.arrives(&listener);
        if late < 0.0 && t - happening.t < LOST {
            sound.waiting.push(happening);
        } else if late < MISSED
            && let Some((shot, level)) = happening.shot(&listener)
        {
            sound.play(t, &shot, level, (listener.ears.at - happening.at).length());
        }
    }
    passing(&mut sound, &listener, &course, showing.0, (flier.0, t));
}

/// The Mach cone passing the ears, and then its reflection in the sea passing them on its way back up.
fn passing(sound: &mut Sound, listener: &Listener, course: &Course, flight: &Flight, (body, t): (Body, f64)) {
    let solids = &flight.solids;
    let (length, shape) = if body == Body::Stack {
        (solids.tower.span[1] - solids.booster.span[0], SHAPE_STACK.value)
    } else {
        (solids.capsule.span[1] - solids.capsule.span[0], SHAPE_CAPSULE.value)
    };
    let mirrored = ears::mirrored(course, listener);
    let aloft = listener.above > ALOFT;
    for (which, ears, echo) in [(0, listener, None), (1, &mirrored, Some(SEA_ECHO.value))] {
        if which == 1 && !aloft {
            continue;
        }
        let heard = sound.history.heard(t, &ears.ears);
        let Some(from) = sound.cones[which].sweep(t, &heard) else { continue };
        if let Some((shot, level)) = boom(&from, listener, length, shape, echo) {
            sound.play(t, &shot, level, from.distance);
        }
    }
}
