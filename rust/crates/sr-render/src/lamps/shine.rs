//! The lamps lit as the Sun goes: their lights, their lenses' glow, and how much they light what the eye is
//! adapted to.

use std::f32::consts::PI;

use bevy::camera::Exposure;
use bevy::prelude::*;

use super::{Lamp, Lens};
use crate::night::Dusk;
use crate::origin::Eye;

/// How bright a lit lens is drawn on the screen's scale, before the tone curve: hot, so it blooms, but the same at
/// any exposure (a lens a pixel or two across many times over-bright is a spark that comes and goes as the view
/// moves: the web build's lamps were seen to flicker so). Estimated.
const LENS: f32 = 1.5;
/// How much of what the lamps put on the ground near the eye it is adapted to, against the natural light, which is
/// on everything in view: the floodlit pad is a part of the view. Estimated: chosen so the lit vehicle stands white
/// without burning out from the pad's own edge.
const SHARE: f32 = 0.008;
/// Nearer than this a lamp is taken as this far, m, for what the eye is adapted to: an eye at a lamp's foot does
/// not stare into it.
const NEAREST: f32 = 30.0;

pub(super) fn build(app: &mut App) {
    app.add_systems(PostUpdate, shine.after(TransformSystems::Propagate));
}

fn shine(
    mut dusk: ResMut<Dusk>,
    eyes: Query<(&GlobalTransform, &Exposure), With<Eye>>,
    mut lamps: Query<(&Lamp, &mut SpotLight, &mut Visibility, &GlobalTransform)>,
    lenses: Query<&Lens>,
    new: Query<(), Added<Lens>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    mut done: Local<Option<(f32, f32)>>,
) {
    let Ok((eye, exposure)) = eyes.single() else { return };
    let lit = dusk.lamps;
    let mut glare = 0.0;
    for (lamp, mut light, mut visibility, at) in &mut lamps {
        let shown = if lit > 0.0 { Visibility::Inherited } else { Visibility::Hidden };
        if *visibility != shown {
            *visibility = shown;
        }
        // (Bevy's spot light is given as lumens over the whole sphere: candela times 4 pi)
        let lumens = lamp.kind.candela() * 4.0 * PI * lit;
        if (light.intensity - lumens).abs() > lumens.max(1.0) * 1e-3 {
            light.intensity = lumens;
        }
        let far = at.translation().distance(eye.translation()).max(NEAREST);
        glare += lamp.kind.candela() * lit / (far * far);
    }
    let adapted = glare * SHARE;
    if (dusk.glare - adapted).abs() > adapted.max(1e-3) * 1e-3 {
        dusk.glare = adapted;
    }
    // the lenses glow as their lamps are lit, the same on the screen at any exposure
    let level = (lit, exposure.exposure());
    if *done == Some(level) && new.is_empty() {
        return;
    }
    *done = Some(level);
    let glow = LENS * lit / level.1;
    let warm = super::Kind::Flood.colour().to_linear();
    for Lens(handle, by_day) in &lenses {
        if let Some(mut material) = materials.get_mut(handle) {
            material.emissive = *by_day * (1.0 - lit) + warm * glow;
        }
    }
}
