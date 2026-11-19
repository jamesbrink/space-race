//! Things come apart: the tower, the booster, the retropack and the antenna canister each leave as a body of
//! their own when the plan (or the sequencer) says, taking their part of the model with them.

use avian3d::prelude::*;
use bevy::math::DVec3;
use bevy::prelude::*;
use sr_missions::types::Parts as Names;
use sr_sim::{Body, Plan, Sequence};

use super::bodies::{State, body};
use super::{Crewed, Flier, Loose, Parts, Sequencer};
use crate::Showing;
use crate::clock::Clock;

/// A piece seen leaving was let go no longer ago than this, s: on a late start, what left earlier is simply gone.
const SEEN: f64 = 2.0;
/// The retropack and the canister as they fall away: their drag areas, m^2, and the canister's mass, kg. Estimated.
const SMALL_DRAG_AREA: f64 = 0.6;
const CANISTER_MASS: f64 = 30.0;

/// How many of the flight's departures have happened: they come in order.
#[derive(Resource, Debug, Default)]
pub struct Staged(usize);

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
    /// Which of the model's nodes go with it.
    nodes: &'a [&'a str],
    becomes: Becomes,
    mass: f64,
    /// Its velocity against the crewed body's, m/s, and its spin, rad/s, in the body's own frame.
    parts_at: DVec3,
    spins: DVec3,
    /// What it leaves the crewed body as, and the speed that gains along its axis, m/s.
    leaves: Option<(Body, f64)>,
}

/// The flight's departures, in the order they happen.
fn departures<'a>(plan: &Plan, names: &'a Names, sequence: &Sequence) -> [Departure<'a>; 4] {
    // The posigrades push capsule and booster apart: each gets its share of the parting speed by the other's mass.
    let whole = plan.booster_mass.value + plan.capsule_mass.value;
    let retropack = plan.capsule_mass.value - plan.entry_mass.value;
    [
        // Its motors carry it up and ahead; a little sideways and a slow tumble take it clear of the path.
        Departure {
            at: Some(plan.tower_off.value),
            nodes: names.tower,
            becomes: Becomes::Flier(Body::Tower),
            mass: plan.tower_mass.value,
            parts_at: DVec3::new(2.5, 1.0, 0.0),
            spins: DVec3::new(0.0, 0.0, -0.5),
            leaves: None,
        },
        Departure {
            at: Some(plan.separation.value),
            nodes: names.booster,
            becomes: Becomes::Flier(Body::Booster),
            mass: plan.booster_mass.value,
            parts_at: DVec3::Y * (-plan.push.value * plan.capsule_mass.value / whole),
            spins: DVec3::new(0.05, 0.0, 0.03),
            leaves: Some((Body::Capsule, plan.push.value * plan.booster_mass.value / whole)),
        },
        Departure {
            at: Some(plan.retropack_off.value),
            nodes: std::slice::from_ref(&names.retropack),
            becomes: Becomes::Loose(SMALL_DRAG_AREA),
            mass: retropack,
            parts_at: DVec3::Y * -1.5,
            spins: DVec3::new(0.3, 0.0, 0.1),
            leaves: None,
        },
        // The canister goes with the drogue when the main parachute comes out.
        Departure {
            at: sequence.main,
            nodes: std::slice::from_ref(&names.canister),
            becomes: Becomes::Loose(SMALL_DRAG_AREA),
            mass: CANISTER_MASS,
            parts_at: DVec3::Y * 6.0,
            spins: DVec3::new(0.4, 0.0, 0.0),
            leaves: None,
        },
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
    let state = State {
        velocity: from.velocity + from.turned * leaving.parts_at,
        spin: from.turned * leaving.spins,
        ..*from
    };
    let mut piece = commands.spawn(body(&state, leaving.mass));
    match leaving.becomes {
        Becomes::Flier(kind) => piece.insert(Flier(kind)),
        Becomes::Loose(drag_area) => piece.insert(Loose { mass: leaving.mass, drag_area }),
    };
    let piece = piece.id();
    for node in nodes {
        commands.entity(node).insert(ChildOf(piece));
    }
}

/// Each step: whatever is due to leave, leaves.
pub fn stage(
    mut commands: Commands,
    clock: Res<Clock>,
    showing: Res<Showing>,
    sequencer: Res<Sequencer>,
    parts: Option<Res<Parts>>,
    mut staged: ResMut<Staged>,
    mut crewed: Query<
        (&Position, &Rotation, &mut LinearVelocity, &AngularVelocity, &mut Flier),
        With<Crewed>,
    >,
) {
    let (Some(parts), Ok((at, turned, mut velocity, spin, mut flier))) = (parts, crewed.single_mut()) else {
        return;
    };
    if !clock.ready {
        return;
    }
    let all = departures(&showing.0.plan, &showing.0.parts, &sequencer.0);
    while let Some(leaving) = all.get(staged.0)
        && let Some(due) = leaving.at.filter(|&due| clock.t >= due)
    {
        let from = State {
            at: at.0,
            turned: turned.0.as_dquat(),
            velocity: velocity.0.as_dvec3(),
            spin: spin.0.as_dvec3(),
        };
        let seen = clock.t - due < SEEN;
        release(&mut commands, &parts, &from, seen, leaving);
        if let Some((kind, gain)) = leaving.leaves {
            flier.0 = kind;
            if seen {
                velocity.0 += (from.axis() * gain).as_vec3();
            }
        }
        staged.0 += 1;
    }
}
