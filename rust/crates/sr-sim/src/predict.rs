//! Where a body is going: the path ahead of it if nothing more is done, its engines off, under the Earth's pull,
//! the turning frame and the air's drag as it is now. One rule for any state of any flight: nothing here knows
//! the record's path.
//!
//! What it leaves out, because it is what will happen "if nothing more is done": a parachute not yet out stays
//! in (so the path of a capsule coming down ends where it would strike without one), and nothing separates.
//! Held to a conic above the air and to the flight flown in `sr-missions`' tests, which have a flight to fly.

use sr_world::V3;

use crate::loads::{Moment, loads};
use crate::{Body, Drive, Field, Plan, Sequence};

/// The longest path worked out, in steps, and the step, s: a coarse one in thin air, a fine one where a
/// parachute's drag is stiff.
const MOST: usize = 700;
const STEP: f64 = 2.0;
const FINE: f64 = 0.4;

/// The path ahead.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct Ahead {
    /// Places along it, in the site's frame, m: the first is where the body is.
    pub path: Vec<V3>,
    /// Which of them is the highest, if the body is still to reach it.
    pub top: Option<usize>,
    /// Whether it comes down within what was worked out.
    pub lands: bool,
}

/// The path ahead of a body of this mass (kg) from where it is.
#[must_use]
pub fn coast(plan: &Plan, field: &Field, body: Body, from: &Moment, mass: f64, sequence: &Sequence) -> Ahead {
    let drive = Drive { mass, burning: false, retro: 0.0, tower: 0.0 };
    let pushed = |m: &Moment| {
        loads(plan, body, field, sequence, m, &drive).felt() + field.acceleration(m.position, m.velocity)
    };
    let step = if sequence.chute_area(plan, from.t) > 0.0 { FINE } else { STEP };
    let (mut m, mut ahead) = (*from, Ahead::default());
    let mut climbing = from.velocity.dot(field.up(from.position)) > 0.0;
    for i in 0..MOST {
        ahead.path.push(m.position);
        if field.height(m.position) <= 0.0 && i > 0 {
            ahead.lands = true;
            break;
        }
        // The midpoint rule: good to the second order, and steady where drag is stiff at this step.
        let half = Moment {
            t: m.t + step / 2.0,
            position: m.position + m.velocity * (step / 2.0),
            velocity: m.velocity + pushed(&m) * (step / 2.0),
            ..m
        };
        m = Moment {
            t: m.t + step,
            position: m.position + half.velocity * step,
            velocity: m.velocity + pushed(&half) * step,
            ..m
        };
        if climbing && m.velocity.dot(field.up(m.position)) <= 0.0 {
            ahead.top = Some(ahead.path.len());
            climbing = false;
        }
    }
    ahead
}
