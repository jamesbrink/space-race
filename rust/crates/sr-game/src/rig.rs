//! The camera's rigs: where the eye stands and what it looks at (docs/agents/camera.md: one camera, a set of
//! rigs). C goes to the next; the mouse turns the two that turn and the wheel is the zoom of all four.

use avian3d::prelude::{Position, Rotation};
use bevy::input::mouse::{AccumulatedMouseMotion, AccumulatedMouseScroll, MouseScrollUnit};
use bevy::math::DVec3;
use bevy::prelude::*;
use sr_missions::Role;
use sr_render::eye::{FIELD, eye};
use sr_render::origin::{Eye, Place, WorldPos};

use crate::flight::Crewed;
use crate::{Options, Showing};

/// Degrees turned for a point of mouse travel.
const TURN: f32 = 0.25;
/// The eye keeps off the ground by this much near the site, m.
const CLEAR: f64 = 0.3;
/// Where the tracking camera stands in the site's frame, m: across the pad on the blockhouse's side, at a
/// person's eye height. Estimated: the long-lens cameras of the day stood further off.
const STATION: DVec3 = DVec3::new(-210.0, 1.7, 140.0);
/// How much the tracking camera keeps in frame round the vehicle, m.
const FRAMED: f32 = 70.0;

/// A way of holding the camera.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Kind {
    /// Turning about the vehicle where it stood on the pad.
    #[default]
    Pad,
    /// Standing on the ground, following the vehicle with a long lens.
    Tracking,
    /// Turning about the vehicle, going with it.
    Chase,
    /// Fixed to the vehicle, looking back the way it came.
    Onboard,
}

impl Kind {
    const ALL: [Self; 4] = [Self::Pad, Self::Tracking, Self::Chase, Self::Onboard];

    /// What it is called on the screen and on the command line.
    #[must_use]
    pub fn name(self) -> &'static str {
        match self {
            Self::Pad => "pad",
            Self::Tracking => "tracking",
            Self::Chase => "chase",
            Self::Onboard => "onboard",
        }
    }

    fn next(self) -> Self {
        let at = Self::ALL.iter().position(|&kind| kind == self).unwrap_or(0);
        Self::ALL[(at + 1) % Self::ALL.len()]
    }
}

/// The rig in use, and how the hand has set it.
#[derive(Resource, Debug, Clone, Copy, PartialEq)]
pub struct Rig {
    /// Which rig.
    pub kind: Kind,
    /// Where the vehicle stood, with the height the pad rig looks at, m.
    pub pad: DVec3,
    /// Which way the eye stands from what it turns about, degrees about the vertical from +Z toward +X.
    pub bearing: f32,
    /// How high the eye stands above it, degrees.
    pub elevation: f32,
    /// How far, m.
    pub distance: f32,
    /// How much the wheel has closed the tracking camera's lens: 1 as it was.
    pub zoom: f32,
}

impl Rig {
    /// Where the eye stands from what it turns about.
    fn arm(&self) -> DVec3 {
        let (sb, cb) = self.bearing.to_radians().sin_cos();
        let (se, ce) = self.elevation.to_radians().sin_cos();
        (Vec3::new(ce * sb, se, ce * cb) * self.distance).as_dvec3()
    }
}

/// The camera and its rigs.
pub struct RigPlugin;

impl Plugin for RigPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, mount)
            .add_systems(Update, (choose, turn))
            .add_systems(PostUpdate, aim.before(Place));
    }
}

fn mount(mut commands: Commands, showing: Res<Showing>, options: Res<Options>) {
    // Open on the whole vehicle from across the pad, from about where a person would stand.
    let stands = showing.0.model(Role::Vehicle).map_or(DVec3::ZERO, |m| DVec3::from_array(m.position));
    let [bearing, elevation, distance, height] = options.pose.unwrap_or([215.0, 1.0, 68.0, 12.0]);
    let named = options.rig.as_deref();
    let kind = Kind::ALL.into_iter().find(|kind| Some(kind.name()) == named).unwrap_or_default();
    let pad = DVec3::new(stands.x, f64::from(height), stands.z);
    commands.insert_resource(Rig { kind, pad, bearing, elevation, distance, zoom: 1.0 });
    commands.spawn(eye());
}

fn choose(keys: Res<ButtonInput<KeyCode>>, mut rig: ResMut<Rig>) {
    let digits = [KeyCode::Digit1, KeyCode::Digit2, KeyCode::Digit3, KeyCode::Digit4];
    if keys.just_pressed(KeyCode::KeyC) {
        rig.kind = rig.kind.next();
    }
    for (key, kind) in digits.into_iter().zip(Kind::ALL) {
        if keys.just_pressed(key) {
            rig.kind = kind;
        }
    }
}

fn turn(
    mut rig: ResMut<Rig>,
    buttons: Res<ButtonInput<MouseButton>>,
    motion: Res<AccumulatedMouseMotion>,
    scroll: Res<AccumulatedMouseScroll>,
) {
    if buttons.pressed(MouseButton::Left) && motion.delta != Vec2::ZERO {
        rig.bearing -= motion.delta.x * TURN;
        rig.elevation = (rig.elevation + motion.delta.y * TURN).clamp(-85.0, 89.0);
    }
    if scroll.delta.y != 0.0 {
        let notches =
            if scroll.unit == MouseScrollUnit::Line { scroll.delta.y } else { scroll.delta.y / 40.0 };
        let closer = (-0.12 * notches).exp();
        if rig.kind == Kind::Tracking {
            rig.zoom = (rig.zoom / closer).clamp(0.2, 12.0);
        } else {
            rig.distance = (rig.distance * closer).clamp(1.5, 2.0e7);
        }
    }
}

/// Where the eye is, which way it looks, which way is up for it, and its field.
struct View {
    at: DVec3,
    toward: DVec3,
    up: DVec3,
    field: f32,
}

fn view(rig: &Rig, crew: Option<(DVec3, Quat)>) -> View {
    let (vehicle, turned) = crew.unwrap_or((rig.pad, Quat::IDENTITY));
    let axis = (turned * Vec3::Y).as_dvec3();
    match rig.kind {
        Kind::Pad => {
            let mut at = rig.pad + rig.arm();
            at.y = at.y.max(CLEAR);
            View { at, toward: rig.pad - at, up: DVec3::Y, field: FIELD }
        }
        Kind::Chase => {
            let at = vehicle + rig.arm();
            View { at, toward: vehicle - at, up: DVec3::Y, field: FIELD }
        }
        Kind::Tracking => {
            let toward = vehicle - STATION;
            // A long lens that keeps the vehicle the same size until it is out of the lens's reach.
            let field = 2.0 * (FRAMED / (2.0 * toward.length() as f32)).atan() / rig.zoom;
            View { at: STATION, toward, up: DVec3::Y, field: field.clamp(0.004, FIELD) }
        }
        Kind::Onboard => {
            // On the vehicle's side, looking back along it at what it is leaving.
            let side = (turned * Vec3::X).as_dvec3();
            View { at: vehicle + side * 1.5 + axis * 0.6, toward: side * 0.25 - axis, up: side, field: 1.2 }
        }
    }
}

fn aim(
    rig: Res<Rig>,
    crew: Query<(&Position, &Rotation), With<Crewed>>,
    mut eye: Query<(&mut WorldPos, &mut Transform, &mut Projection), With<Eye>>,
) {
    let Ok((mut at, mut transform, mut projection)) = eye.single_mut() else { return };
    let seen = view(&rig, crew.single().ok().map(|(at, turned)| (at.0, turned.0)));
    at.0 = seen.at;
    if seen.toward.length_squared() > 0.0 {
        transform.look_to(seen.toward.as_vec3(), seen.up.as_vec3());
    }
    if let Projection::Perspective(lens) = projection.as_mut()
        && (lens.fov - seen.field).abs() > 1.0e-5
    {
        lens.fov = seen.field;
    }
}
