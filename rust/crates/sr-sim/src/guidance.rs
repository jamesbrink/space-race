//! Which way each body is pointed when nobody has taken it over: the booster's tilt programme, and the capsule's
//! attitudes after it (retro attitude, blunt end first through the air, hanging under its parachute).

use sr_world::V3;

use crate::loads::{Moment, retro_direction};
use crate::{Field, Plan, Sequence};

/// The long axis the stack is steered to: the launch vertical tilted down range by the programme.
#[must_use]
pub fn stack_axis(plan: &Plan, down_range: V3, t: f64) -> V3 {
    let (sin, cos) = plan.tilt.at(t).to_radians().sin_cos();
    V3::Y * cos + down_range * sin
}

/// The long axis (toward the small end) the capsule holds.
#[must_use]
pub fn capsule_axis(plan: &Plan, field: &Field, sequence: &Sequence, m: &Moment) -> V3 {
    let up = field.up(m.position);
    if sequence.drogue.is_some() {
        return up;
    }
    if m.t < plan.retropack_off.value || m.velocity.length() < 1.0 {
        // Blunt end forward and raised: the small end points the way the retrorockets push.
        return retro_direction(plan, field, m);
    }
    -m.velocity.normalized()
}
