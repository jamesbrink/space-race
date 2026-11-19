//! The path ahead, drawn: where the crewed body is going if nothing more is done to it (`sr-sim`'s `predict`),
//! as a line through the sky with its top marked. It is worked out from where the body is now, a few times a
//! second, so it follows whatever the pilot does. N puts it away.

use avian3d::prelude::{LinearVelocity, Mass, Position, Rotation};
use bevy::math::DVec3;
use bevy::prelude::*;
use sr_render::origin::{Origin, Place};
use sr_sim::loads::Moment;
use sr_sim::predict::coast;

use crate::Showing;
use crate::clock::Clock;
use crate::flight::bodies::v3;
use crate::flight::{Course, Crewed, Flier, Sequencer};
use crate::stage::dvec;

/// How often the path is worked out again, s of our time.
const EVERY: f32 = 0.2;
/// Slower than this there is no path worth drawing, m/s.
const MOVING: f32 = 20.0;
/// The line's colours: up to the top, and from it down.
const RISING: Color = Color::srgba(0.55, 0.9, 1.0, 0.9);
const FALLING: Color = Color::srgba(0.55, 0.9, 1.0, 0.45);
/// The top's mark is this much of its distance from the eye across.
const MARK: f32 = 0.012;

/// The path ahead, as last worked out.
#[derive(Resource, Debug, Default)]
pub struct Path {
    /// Places along it, in the site's frame, m.
    places: Vec<DVec3>,
    /// Which of them is the top, if it is still ahead.
    top: Option<usize>,
    /// Whether it is put away.
    hidden: bool,
}

/// Draws the path ahead.
pub struct PathPlugin;

impl Plugin for PathPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<Path>()
            .add_systems(Update, (foresee, tuck))
            .add_systems(PostUpdate, draw.after(Place));
    }
}

fn tuck(keys: Res<ButtonInput<KeyCode>>, mut path: ResMut<Path>) {
    if keys.just_pressed(KeyCode::KeyN) {
        path.hidden = !path.hidden;
    }
}

fn foresee(
    time: Res<Time<Real>>,
    clock: Res<Clock>,
    showing: Res<Showing>,
    course: Res<Course>,
    sequencer: Res<Sequencer>,
    crewed: Query<(&Flier, &Position, &LinearVelocity, &Rotation, &Mass), With<Crewed>>,
    mut path: ResMut<Path>,
    mut due: Local<f32>,
) {
    if time.elapsed_secs() < *due || path.hidden {
        return;
    }
    *due = time.elapsed_secs() + EVERY;
    let Ok((&Flier(body), at, velocity, turned, mass)) = crewed.single() else { return };
    let flying = clock.ready && clock.t > 0.0 && sequencer.0.landed.is_none() && velocity.0.length() > MOVING;
    if !flying {
        path.places.clear();
        return;
    }
    let from = Moment {
        t: clock.t,
        position: v3(at.0),
        velocity: v3(velocity.0.as_dvec3()),
        axis: v3((turned.0 * Vec3::Y).as_dvec3()),
    };
    let ahead = coast(&showing.0.plan, &course.field, body, &from, f64::from(mass.0), &sequencer.0);
    path.places = ahead.path.into_iter().map(dvec).collect();
    path.top = ahead.top;
}

/// The line, from the eye: its rising part, its falling part, and a ring at the top.
fn draw(path: Res<Path>, origin: Res<Origin>, mut gizmos: Gizmos) {
    if path.hidden || path.places.len() < 2 {
        return;
    }
    let seen = |place: &DVec3| (*place - origin.0).as_vec3();
    let top = path.top.unwrap_or(0).min(path.places.len() - 1);
    gizmos.linestrip(path.places[..=top].iter().map(seen), RISING);
    gizmos.linestrip(path.places[top..].iter().map(seen), FALLING);
    if path.top.is_some() {
        let at = seen(&path.places[top]);
        gizmos.sphere(Isometry3d::from_translation(at), at.length() * MARK, RISING);
    }
}
