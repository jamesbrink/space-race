//! The light a fire throws: a point of light part way down it, as strong and as coloured as the fire itself,
//! casting the shadows of what stands under it while there is ground near enough to see them on.

use std::f32::consts::PI;

use bevy::prelude::*;

use super::Plume;
use super::draw::lengths;
use crate::ab::Ab;

/// How bright a fire's outline is on the whole, against how bright it is through its heart. Estimated.
const SPILL: f32 = 0.35;
/// How bright the burning sheet a fire throws along the ground it strikes is, cd/m^2, and how far out it burns,
/// m (`plume.wesl`, `SHEET_REACH`). Estimated: in the stills of the Redstone leaving the pad (NASA 6100884) its
/// orange tongues on the launcher are the brightest thing under the tail, a few times sunlit concrete
/// (some 11,000 cd/m^2).
const SHEET_GLOW: f32 = 40_000.0;
const SHEET_REACH: f32 = 3.4;
/// A fire casts shadows while the ground is no further down it than this, m. None: its shadow map is the whole
/// scene drawn again from the fire, which the frame's budget for the fire and the fumes (3 ms) cannot hold.
const SHADOWS_WITHIN: f32 = 0.0;
/// A fire's light is not worked beyond this, m: a Redstone's adds a hundredth of the daylight five metres off,
/// and by here next to nothing.
const RANGE: f32 = 80.0;
/// How far from its axis each of a fire's two lamps shines, radians: a little short of a right angle, which is
/// as wide as a lamp of the engine's can be.
const SPREAD: f32 = 1.5;
/// A fire dimmer than this lights nothing worth a light, cd.
const LEAST: f32 = 50.0;

/// A fire's light: the half of it thrown down the jet, which casts shadows, or the half thrown back up it,
/// which does not.
#[derive(Component)]
pub struct Glare {
    down: bool,
}

/// Hang a fire's light on it: two lamps back to back, each lighting all but a sliver of its half of everything.
/// (A light that shines every way casts its shadows into six maps, and the scene is drawn again for each; what
/// a fire throws shadows of is under it, and one map looking down the jet holds that.)
pub fn hang(commands: &mut Commands, plume: Entity) {
    for (down, toward) in [(true, Vec3::NEG_Y), (false, Vec3::Y)] {
        commands.spawn((
            Glare { down },
            SpotLight {
                intensity: 0.0,
                range: RANGE,
                radius: 0.3,
                outer_angle: SPREAD,
                inner_angle: SPREAD - 0.2,
                ..default()
            },
            Transform::from_rotation(Quat::from_rotation_arc(Vec3::NEG_Z, toward)),
            Visibility::Hidden,
            ChildOf(plume),
        ));
    }
}

/// How strong a fire's light is, cd: its brightness over the outline it shows, and the sheet's over its own
/// where it strikes the ground.
#[must_use]
pub fn candela(plume: &Plume) -> f32 {
    let shape = plume.nozzle.shape(plume.ambient);
    let [_, ends] = lengths(plume);
    let lit = ends.min(plume.ground);
    // (swollen in thin air it is dimmer by as much as it is wider)
    let thinned = (plume.nozzle.radius / shape.radius).powi(2).min(1.0);
    let jet = plume.luminance * 2.0 * shape.radius * lit * SPILL * thinned;
    // (the share of the fire that reaches the ground, as the march has it)
    let strikes = (1.25 - plume.ground / ends.max(0.01)).clamp(0.0, 1.0);
    let sheet = SHEET_GLOW * PI * (SHEET_REACH * strikes).powi(2) * SPILL;
    (jet + sheet) * plume.burning.clamp(0.0, 1.0)
}

/// Each frame: every fire's light where the fire is brightest, as strong as the fire.
pub fn shine(
    ab: Option<Res<Ab>>,
    plumes: Query<&Plume>,
    mut glares: Query<(&Glare, &ChildOf, &mut SpotLight, &mut Transform, &mut Visibility)>,
) {
    for (glare, of, mut light, mut transform, mut visibility) in &mut glares {
        let Ok(plume) = plumes.get(of.parent()) else { continue };
        let strength = if ab.as_ref().is_none_or(|ab| ab.burning()) { candela(plume) } else { 0.0 };
        let shown = if strength > LEAST { Visibility::Inherited } else { Visibility::Hidden };
        if *visibility != shown {
            *visibility = shown;
        }
        if strength <= LEAST {
            continue;
        }
        let [_, ends] = lengths(plume);
        let [_, hot, warm, ..] = plume.colours;
        let colour = hot.lerp(warm, 0.3);
        light.color = Color::linear_rgb(colour.x, colour.y, colour.z);
        light.intensity = 4.0 * PI * strength;
        let shadows = glare.down && plume.ground < SHADOWS_WITHIN;
        if light.shadow_maps_enabled != shadows {
            light.shadow_maps_enabled = shadows;
        }
        transform.translation = Vec3::NEG_Y * (0.3 * ends).min(plume.ground - 0.4).max(0.1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plume::Nozzle;
    use crate::plume::jet::SEA;

    #[test]
    fn a_redstones_fire_is_a_small_part_of_the_daylight_a_few_metres_off() {
        let plume = Plume {
            nozzle: Nozzle { radius: 0.366, chamber: 2_192_533.0, exit: 91_192.5, gamma: 1.2 },
            length: 13.9,
            colours: [Vec3::ONE; 5],
            luminance: 8000.0,
            hides: 0.0,
            burning: 1.0,
            ambient: SEA,
            ground: f32::INFINITY,
        };
        // (lux at five metres: candela over the distance squared)
        let lux = candela(&plume) / 25.0;
        assert!((500.0..5000.0).contains(&lux), "{lux}");
        assert_eq!(candela(&Plume { burning: 0.0, ..plume }), 0.0);
        // On the pad its sheet outshines it many times over.
        assert!(candela(&Plume { ground: 1.0, ..plume }) > 10.0 * candela(&plume));
    }
}
