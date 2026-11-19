//! A flight integrated without an engine: the crew's path as a point, from liftoff to the sea (`src/sim/fly.ts`).
//!
//! The game flies the same [`crate::loads`] as rigid bodies; this is what the tests hold against the record, and
//! what a path drawn ahead of the vehicle would be made of.

use sr_world::{Site, V3};

use crate::loads::{Moment, loads};
use crate::{Body, Field, Plan, Sequence, guidance};

/// Step of the integration, s (the web build's).
pub const STEP: f64 = 0.05;
/// A flight that has not come down by now has gone wrong, s.
const GIVE_UP: f64 = 3_000.0;

/// A point on the path.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Sample {
    /// Seconds from liftoff.
    pub t: f64,
    /// Position in the site's frame, m.
    pub position: V3,
    /// Velocity in the site's frame, m/s.
    pub velocity: V3,
    /// Height above the sea, m.
    pub height: f64,
}

/// What the flight came to.
#[derive(Debug, Clone, PartialEq)]
pub struct Flown {
    /// The path, a sample a second.
    pub path: Vec<Sample>,
    /// The greatest height, m above the sea.
    pub apogee: f64,
    /// Distance over the sea from the pad to where it came down, m.
    pub range: f64,
    /// Speed over the turning Earth at separation, m/s.
    pub separation_speed: f64,
    /// The greatest dynamic pressure going up, Pa.
    pub max_q: f64,
    /// The greatest load coming down, in g.
    pub entry_g: f64,
    /// What the sequencer did and when.
    pub sequence: Sequence,
}

#[derive(Clone, Copy)]
struct State {
    position: V3,
    velocity: V3,
}

/// The flight's geometry and figures, shared by every step.
struct Flight<'a> {
    plan: &'a Plan,
    field: Field,
    down_range: V3,
}

impl Flight<'_> {
    fn body(&self, t: f64) -> Body {
        if t < self.plan.separation.value { Body::Stack } else { Body::Capsule }
    }

    fn moment(&self, t: f64, s: State, sequence: &Sequence) -> Moment {
        let mut m = Moment { t, position: s.position, velocity: s.velocity, axis: V3::Y };
        m.axis = match self.body(t) {
            Body::Stack => guidance::stack_axis(self.plan, self.down_range, t),
            _ => guidance::capsule_axis(self.plan, &self.field, sequence, &m),
        };
        m
    }

    /// Acceleration, m/s^2. On the pad the launcher holds what the engine does not yet lift.
    fn acceleration(&self, t: f64, s: State, sequence: &Sequence) -> V3 {
        let l = loads(self.plan, self.body(t), &self.field, sequence, &self.moment(t, s, sequence));
        let a = l.felt() + self.field.acceleration(s.position, s.velocity);
        if s.position.y <= 0.0 && a.y < 0.0 && self.body(t) == Body::Stack { V3::ZERO } else { a }
    }

    fn rk4(&self, t: f64, s: State, sequence: &Sequence) -> State {
        let d = |t: f64, s: State| (s.velocity, self.acceleration(t, s, sequence));
        let nudge =
            |k: (V3, V3), h: f64| State { position: s.position + k.0 * h, velocity: s.velocity + k.1 * h };
        let k1 = d(t, s);
        let k2 = d(t + STEP / 2.0, nudge(k1, STEP / 2.0));
        let k3 = d(t + STEP / 2.0, nudge(k2, STEP / 2.0));
        let k4 = d(t + STEP, nudge(k3, STEP));
        let mix = |a: V3, b: V3, c: V3, e: V3| (a + b * 2.0 + c * 2.0 + e) * (STEP / 6.0);
        State {
            position: s.position + mix(k1.0, k2.0, k3.0, k4.0),
            velocity: s.velocity + mix(k1.1, k2.1, k3.1, k4.1),
        }
    }
}

/// Fly a plan from a site whose origin stands `above_sea` metres over the sea.
#[must_use]
pub fn fly(plan: &Plan, site: &Site, above_sea: f64) -> Flown {
    let flight =
        Flight { plan, field: Field::at(site, above_sea), down_range: site.toward(plan.azimuth.value, 0.0) };
    let mut s = State { position: V3::ZERO, velocity: V3::ZERO };
    let mut out = Flown {
        path: Vec::new(),
        apogee: 0.0,
        range: 0.0,
        separation_speed: 0.0,
        max_q: 0.0,
        entry_g: 0.0,
        sequence: Sequence::default(),
    };
    let mut step = 0_u32;
    while out.sequence.landed.is_none() && f64::from(step) * STEP < GIVE_UP {
        let t = f64::from(step) * STEP;
        let height = flight.field.height(s.position);
        out.sequence.step(plan, t, height, s.velocity.dot(flight.field.up(s.position)));
        record(&flight, &mut out, t, s, height);
        if step.is_multiple_of(20) {
            out.path.push(Sample { t, position: s.position, velocity: s.velocity, height });
        }
        let before = flight.body(t);
        s = flight.rk4(t, s, &out.sequence);
        if before == Body::Stack && flight.body(t + STEP) == Body::Capsule {
            // The posigrades push the two apart; each gets its share by the other's mass.
            let share = plan.booster_mass.value / (plan.booster_mass.value + plan.capsule_mass.value);
            s.velocity =
                s.velocity + guidance::stack_axis(plan, flight.down_range, t) * (plan.push.value * share);
        }
        step += 1;
    }
    out.range = flight.field.range(s.position);
    out
}

fn record(flight: &Flight, out: &mut Flown, t: f64, s: State, height: f64) {
    let plan = flight.plan;
    let l = loads(plan, flight.body(t), &flight.field, &out.sequence, &flight.moment(t, s, &out.sequence));
    out.apogee = out.apogee.max(height);
    if t < plan.separation.value {
        out.separation_speed = s.velocity.length();
        out.max_q = out.max_q.max(l.q);
    } else if out.sequence.apogee.is_some() && out.sequence.drogue.is_none() {
        out.entry_g = out.entry_g.max(l.felt().length() / sr_world::earth::G0);
    }
}
