//! The opening's camera: the shot for this second of the opening, its eye and what it looks at eased from its
//! start to its end, following the pad's nodes as the morning moves them. It takes the eye after the player's rig
//! has placed it, and gives it back at the hand-over where the last shot has brought it: the rig's own view.

use bevy::anti_alias::taa::TemporalAntiAliasing;
use bevy::math::DVec3;
use bevy::prelude::*;
use sr_render::origin::{Eye, WorldPos};

use super::Opening;
use super::shots::{SHOTS, Shot, Spot, eased};
use crate::pad::{PadNodes, placed};
use crate::rig::Rig;

/// The eye keeps this far off the ground, m.
const CLEAR: f64 = 0.5;

/// Which shot a second of the opening is in, and how far through it, 0 to 1.
#[must_use]
pub fn shot_at(opening: &Opening, tau: f64) -> (usize, f64) {
    let line = &opening.timeline;
    let t = line.t(tau);
    let i = SHOTS.iter().rposition(|shot| shot.from <= t).unwrap_or(0);
    let (a, b) = (line.tau(SHOTS[i].from), line.tau(SHOTS[i].to));
    (i, if b > a { (tau - a) / (b - a) } else { 1.0 })
}

/// Where a spot is now.
fn spot(spot: Spot, rig: &Rig, eye: bool, find: &dyn Fn(&str) -> Option<DVec3>) -> DVec3 {
    match spot {
        Spot::At(at) => DVec3::from_array(at),
        Spot::On(node, by) => find(node).unwrap_or(DVec3::ZERO) + DVec3::from_array(by),
        Spot::Rig if eye => rig.pad + rig.arm(),
        Spot::Rig => rig.pad,
    }
}

/// The eye, what it looks at, and the lens's field in radians, `p` of the way through a shot.
fn framing(shot: &Shot, p: f64, rig: &Rig, find: &dyn Fn(&str) -> Option<DVec3>) -> (DVec3, DVec3, f32) {
    let e = eased(shot.ease, p);
    let eye = spot(shot.eye[0], rig, true, find).lerp(spot(shot.eye[1], rig, true, find), e);
    let look = spot(shot.look[0], rig, false, find).lerp(spot(shot.look[1], rig, false, find), e);
    let lens = shot.lens[0] + (shot.lens[1] - shot.lens[0]) * e;
    (DVec3::new(eye.x, eye.y.max(CLEAR), eye.z), look, lens.to_radians() as f32)
}

/// Each frame it plays: the eye where the shot has it, and the anti-aliasing's history let go at a cut.
pub fn aim(
    opening: Res<Opening>,
    rig: Res<Rig>,
    nodes: Res<PadNodes>,
    parents: Query<&ChildOf>,
    transforms: Query<(&Transform, Option<&WorldPos>), Without<Eye>>,
    mut eye: Query<
        (&mut WorldPos, &mut Transform, &mut Projection, Option<&mut TemporalAntiAliasing>),
        With<Eye>,
    >,
    mut shown: Local<Option<usize>>,
) {
    if !opening.playing() {
        *shown = None;
        return;
    }
    let find = |node: &str| {
        nodes.0.get(node).and_then(|&entity| placed(entity, &parents, &transforms)).map(|(at, _)| at)
    };
    let (i, p) = shot_at(&opening, opening.tau);
    let (at, look, field) = framing(&SHOTS[i], p, &rig, &find);
    let Ok((mut place, mut transform, mut projection, taa)) = eye.single_mut() else { return };
    place.0 = at;
    let toward = (look - at).as_vec3();
    if toward.length_squared() > 0.0 {
        *transform = transform.looking_to(toward, Vec3::Y);
    }
    if let Projection::Perspective(lens) = projection.as_mut() {
        lens.fov = field;
    }
    if *shown != Some(i) {
        *shown = Some(i);
        if let Some(mut taa) = taa {
            taa.reset = true;
        }
    }
}
