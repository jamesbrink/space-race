//! Things come apart: the tower, the booster, the retropack and the antenna canister each leave as a body of
//! their own when the pilot (or the record, or the sequencer) says, taking their part of the model with them.

use avian3d::prelude::*;
use bevy::math::DVec3;
use bevy::prelude::*;
use sr_missions::Flight;
use sr_missions::types::Solid;
use sr_sim::{Body, Sequence};

use super::bodies::{Outline, State, body, hand_over};
use super::breakup::shatter;
use super::hand::Hand;
use super::{Crewed, Flier, Loose, Parts, Sequencer};
use crate::Showing;
use crate::clock::Clock;

/// A piece seen leaving was let go no longer ago than this, s: on a late start, what left earlier is simply gone.
const SEEN: f64 = 2.0;
/// The retropack and the canister as they fall away: their drag areas, m^2, and the canister's mass, kg. Estimated.
const SMALL_DRAG_AREA: f64 = 0.6;
const CANISTER_MASS: f64 = 30.0;

/// Which of the flight's departures have happened: the tower, the booster, the retropack, the canister. They come
/// in the order the pilot (or the record) has them come.
#[derive(Resource, Debug, Default)]
pub struct Staged([bool; 4]);

const TOWER: usize = 0;
const BOOSTER: usize = 1;

/// What a piece becomes once it has left.
#[derive(Clone, Copy)]
enum Becomes {
    /// A body the plan knows.
    Flier(Body),
    /// A piece of no further part in the flight, with this drag area, m^2.
    Loose(f64),
}

/// A piece leaving the crewed body.
struct Departure<'a> {
    /// When, s from liftoff; `None` while what it waits on has not happened.
    at: Option<f64>,
    /// Which of the model's nodes go with it, and what it is to whatever it strikes.
    nodes: &'a [&'a str],
    solid: &'a Solid,
    becomes: Becomes,
    mass: f64,
    /// Its velocity against the crewed body's, m/s, and its spin, rad/s, in the body's own frame.
    parts_at: DVec3,
    spins: DVec3,
    /// The speed its going gives the crewed body along its axis, m/s, if it changes what that body is.
    gain: Option<f64>,
}

/// The flight's departures, in the order they happen: the tower, the booster and the retropack at the times
/// given, the canister when the sequencer lets the main parachute out.
fn departures<'a>(
    flight: &'a Flight,
    sequence: &Sequence,
    [tower, booster, pack]: [Option<f64>; 3],
) -> [Departure<'a>; 4] {
    let (plan, names, solids) = (&flight.plan, &flight.parts, &flight.solids);
    // The posigrades push capsule and booster apart: each gets its share of the parting speed by the other's mass.
    let whole = plan.booster_mass.value + plan.capsule_mass.value;
    let small = |at, nodes, solid, mass, parts_at, spins| Departure {
        at,
        nodes,
        solid,
        becomes: Becomes::Loose(SMALL_DRAG_AREA),
        mass,
        parts_at,
        spins,
        gain: None,
    };
    [
        // Its motors carry it up and ahead; a little sideways and a slow tumble take it clear of the path.
        Departure {
            at: tower,
            nodes: names.tower,
            solid: &solids.tower,
            becomes: Becomes::Flier(Body::Tower),
            mass: plan.tower_mass.value,
            parts_at: DVec3::new(2.5, 1.0, 0.0),
            spins: DVec3::new(0.0, 0.0, -0.5),
            gain: Some(0.0),
        },
        Departure {
            at: booster,
            nodes: names.booster,
            solid: &solids.booster,
            becomes: Becomes::Flier(Body::Booster),
            mass: plan.booster_mass.value,
            parts_at: DVec3::Y * (-plan.push.value * plan.capsule_mass.value / whole),
            spins: DVec3::new(0.05, 0.0, 0.03),
            gain: Some(plan.push.value * plan.booster_mass.value / whole),
        },
        small(
            pack,
            std::slice::from_ref(&names.retropack),
            &solids.retropack,
            plan.capsule_mass.value - plan.entry_mass.value,
            DVec3::Y * -1.5,
            DVec3::new(0.3, 0.0, 0.1),
        ),
        // The canister goes with the drogue when the main parachute comes out.
        small(
            sequence.main,
            std::slice::from_ref(&names.canister),
            &solids.canister,
            CANISTER_MASS,
            DVec3::Y * 6.0,
            DVec3::new(0.4, 0.0, 0.0),
        ),
    ]
}

/// Let a piece go if it is being seen to leave; otherwise it left before the flight was joined, and is gone.
fn release(commands: &mut Commands, parts: &Parts, from: &State, seen: bool, leaving: &Departure) {
    let nodes = leaving.nodes.iter().filter_map(|name| parts.0.get(*name).copied());
    if !seen {
        for node in nodes {
            commands.entity(node).despawn();
        }
        return;
    }
    let outline = Outline::of(leaving.solid);
    let state = from.leaving(outline.origin, leaving.parts_at, leaving.spins);
    let mut piece = commands.spawn(body(&state, leaving.mass, &outline));
    match leaving.becomes {
        Becomes::Flier(kind) => piece.insert(Flier(kind)),
        Becomes::Loose(drag_area) => piece.insert(Loose { mass: leaving.mass, drag_area }),
    };
    let piece = piece.id();
    hand_over(commands, piece, nodes, outline.origin);
}

/// Each step: whatever is due to leave, leaves, and the crewed body is what is left.
pub fn stage(
    mut commands: Commands,
    clock: Res<Clock>,
    showing: Res<Showing>,
    sequencer: Res<Sequencer>,
    hand: Res<Hand>,
    parts: Option<Res<Parts>>,
    mut staged: ResMut<Staged>,
    mut crewed: Query<
        (Entity, &Position, &Rotation, &mut LinearVelocity, &AngularVelocity, &mut Flier),
        With<Crewed>,
    >,
) {
    let (Some(parts), Ok((entity, at, turned, mut velocity, spin, mut flier))) = (parts, crewed.single_mut())
    else {
        return;
    };
    if !clock.ready {
        return;
    }
    let (flight, plan) = (showing.0, &showing.0.plan);
    let all = departures(flight, &sequencer.0, hand.leaves(plan));
    for (i, leaving) in all.iter().enumerate() {
        let Some(due) = leaving.at.filter(|&due| clock.t >= due) else { continue };
        if std::mem::replace(&mut staged.0[i], true) {
            continue;
        }
        let from = State {
            at: at.0,
            turned: turned.0.as_dquat(),
            velocity: velocity.0.as_dvec3(),
            spin: spin.0.as_dvec3(),
        };
        let seen = clock.t - due < SEEN;
        // A booster that has broken up leaves in its pieces.
        if seen && hand.broke.is_some() && i == BOOSTER {
            shatter(&mut commands, &parts, &from, flight, clock.t);
        } else {
            release(&mut commands, &parts, &from, seen, leaving);
        }
        if let Some(gain) = leaving.gain {
            // What is left: the capsule once the booster has gone, with the tower on it until that has.
            let kind = if staged.0[BOOSTER] { Body::Capsule } else { Body::Stack };
            let outline = Outline::body(&flight.solids, kind, !staged.0[TOWER]);
            flier.0 = kind;
            commands.entity(entity).insert(outline.solid(hand.drive(plan, kind, clock.t).mass));
            if seen {
                velocity.0 += (from.axis() * gain).as_vec3();
            }
        }
    }
}
