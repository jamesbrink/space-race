//! The air's heat on the crewed body, each step of the physics: how hard it is heated where it meets the air, and
//! how hot each of its surfaces has become (`sr-sim`'s `heat`). A surface past what it stands takes its body
//! with it (`drive::strain`).

use avian3d::prelude::{LinearVelocity, Position, Rotation};
use bevy::prelude::*;
use sr_sim::Body;
use sr_sim::heat::{Lie, Thermal};

use super::bodies::v3;
use super::{Course, Crewed, Flier};
use crate::Showing;
use crate::clock::Clock;
use crate::stage::dvec;

/// The crewed body's heating.
#[derive(Resource, Debug, Clone, PartialEq)]
pub struct Heat(pub Thermal);

/// The hottest thing aboard, for the readout.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct Warmth {
    /// The heat flux where the body meets the air, W/m^2, and roughly how hot that air is, K.
    pub flux: f64,
    /// As `flux`.
    pub gas: f64,
    /// The surface nearest what it stands: its name, its temperature, K, and how far that is from what it stood
    /// at on the pad toward its limit.
    pub surface: &'static str,
    /// As `surface`.
    pub temperature: f64,
    /// As `surface`.
    pub part: f64,
    /// Which body that surface is on.
    pub on: Option<Body>,
}

/// Everything as it stood on the pad.
pub fn cool(mut commands: Commands, showing: Res<Showing>) {
    commands.insert_resource(Heat(Thermal::begin(&showing.0.plan.heating)));
}

/// Each step: the heat of it.
pub fn warm(
    clock: Res<Clock>,
    showing: Res<Showing>,
    course: Res<Course>,
    time: Res<Time>,
    crewed: Query<(&Flier, &Position, &LinearVelocity, &Rotation), With<Crewed>>,
    mut heat: ResMut<Heat>,
) {
    let Ok((&Flier(body), at, velocity, turned)) = crewed.single() else { return };
    if !clock.ready || clock.t < 0.0 {
        return;
    }
    let heating = &showing.0.plan.heating;
    let (sky, height) = (showing.0.plan.sky(), course.field.height(v3(at.0)));
    let through = velocity.0.as_dvec3() - dvec(course.field.blowing(sky.wind(height)));
    let airspeed = through.length();
    // How it lies to the air: nose first is 0, blunt end first 1.
    let along = if airspeed > 1.0 { (turned.0 * Vec3::Y).as_dvec3().dot(through) / airspeed } else { 1.0 };
    let lie = Lie { airspeed, blunt: (1.0 - along) / 2.0, covered: body == Body::Stack };
    let air = sky.air(height);
    heat.0.advance(heating, &air, &lie, time.delta_secs_f64());
}

impl Heat {
    /// The hottest thing aboard, of the surfaces that are still part of the crewed body.
    #[must_use]
    pub fn warmth(&self, flight: &sr_missions::Flight, body: Body) -> Warmth {
        let heating = &flight.plan.heating;
        // (the booster's skin left with the booster)
        let aboard = |on: Body| body == Body::Stack || on == Body::Capsule;
        let hottest = (0..heating.surfaces.len().min(self.0.surfaces.len()))
            .filter(|&i| aboard(heating.surfaces[i].on))
            .map(|i| (i, self.0.part(heating, i)))
            .max_by(|a, b| a.1.total_cmp(&b.1));
        let Some((which, part)) = hottest else { return Warmth::default() };
        Warmth {
            flux: self.0.flux,
            gas: self.0.gas,
            surface: heating.surfaces[which].name,
            temperature: self.0.surfaces[which],
            part,
            on: Some(heating.surfaces[which].on),
        }
    }
}
