//! Each fire's box, and this frame's figures for the march through it.

use bevy::camera::visibility::NoFrustumCulling;
use bevy::light::NotShadowCaster;
use bevy::prelude::*;

use super::jet::SEA;
use super::material::{Jet, PlumeMaterial};
use super::{Plume, glare};
use crate::ab::Ab;
use crate::air::Air;

/// How fast a fire's streaks are seen to run down it, lengths a second. Estimated: the gas itself passes in a
/// thousandth of a second, far faster than a frame can follow, and what film shows is this slower beat.
const STREAMS: f32 = 9.0;
/// How the air there is to burn in falls with its pressure: as its 0.35th power (`plume.ts`, `plumeShape`).
/// Estimated.
const AIR_POWER: f32 = 0.35;
/// How strongly a jet's shock cells show for each e-fold its exit pressure is off the air's, and the least they
/// show in a jet that is nearly matched. Estimated: a real nozzle's cone and its lip throw waves into the jet
/// even when its pressure is the air's, and the A-7's first cells are a white knot under the bell on film (NASA
/// 6100884, S61-01928) though its exit pressure is within a tenth of the air's.
const DIAMONDS: f32 = 0.9;
const DIAMONDS_LEAST: f32 = 0.5;
/// No fire is drawn longer than this, m: in thin air it is long, and too faint to see long before its end.
const LONGEST: f32 = 400.0;
/// Nor further than this many times the jet's own width.
const FAR: f32 = 40.0;
/// The fan turned out at the lip in thin air is drawn this many exit radii out, where it is a thousandth as
/// bright as at the lip.
const FAN: f32 = 30.0;
/// The box of a fire that strikes the ground is at least this wide, m: the sheet it throws out
/// (`plume.wesl`, `SHEET_REACH`) has faded by then.
const SHEET: f32 = 12.0;

/// The box a fire is marched in.
#[derive(Component)]
pub struct Volume(Handle<PlumeMaterial>);

/// Give each new fire its box and its light.
pub fn kindle(
    mut commands: Commands,
    new: Query<Entity, Added<Plume>>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<PlumeMaterial>>,
    mut cube: Local<Option<Handle<Mesh>>>,
) {
    for plume in &new {
        let cube = cube.get_or_insert_with(|| meshes.add(Cuboid::new(2.0, 2.0, 2.0))).clone();
        let material = materials.add(PlumeMaterial { jet: Jet::default() });
        commands.spawn((
            Volume(material.clone()),
            Mesh3d(cube),
            MeshMaterial3d(material),
            NotShadowCaster,
            NoFrustumCulling,
            Visibility::Hidden,
            ChildOf(plume),
        ));
        glare::hang(&mut commands, plume);
    }
}

/// How long a fire's supersonic core is and where the fire ends, m: both shorter while it is building or dying.
#[must_use]
pub fn lengths(plume: &Plume) -> [f32; 2] {
    let grown = plume.burning.clamp(0.0, 1.0).sqrt();
    let (here, sea) = (plume.nozzle.shape(plume.ambient), plume.nozzle.shape(SEA));
    // (in thin air the jet goes on thinning as it goes: by some tens of its own width there is nothing to see)
    let seen = LONGEST.min(FAR * here.radius.max(plume.nozzle.radius));
    [here.core * grown, (plume.length * here.core / sea.core * grown).min(seen)]
}

/// How strongly a jet's shock cells show: over 0 where it swells, under 0 where it is squeezed.
fn diamonds(ratio: f32) -> f32 {
    let off = ratio.ln() * DIAMONDS;
    (off.signum() * off.abs().max(DIAMONDS_LEAST)).clamp(-1.0, 1.0)
}

/// The march's figures for a fire, and the radius and length of the box that holds it, m.
#[must_use]
pub fn figures(plume: &Plume, clock: f32) -> (Jet, [f32; 2]) {
    let nozzle = &plume.nozzle;
    let shape = nozzle.shape(plume.ambient);
    let [core, ends] = lengths(plume);
    let air = (plume.ambient / SEA).clamp(0.0, 1.0).powf(AIR_POWER);
    let across = 2.0 * nozzle.radius;
    let turn = shape.turn.tan();
    // The box: the turbulent body at its widest, the fan in thin air, and the sheet along the ground.
    let grounded = plume.ground < ends * 1.25;
    let body = 2.4 * (0.75 * shape.radius.max(nozzle.radius) + 0.085 * ends * air.min(1.0));
    let fan = (nozzle.radius + turn * ends).min(FAN * nozzle.radius);
    let radius = body.max(fan).max(if grounded { SHEET } else { 0.0 });
    let length = ends.min(plume.ground + 0.3).max(0.1);
    let [core_colour, hot, warm, cool, thin] = plume.colours.map(|colour| colour.extend(1.0));
    let jet = Jet {
        core: core_colour,
        hot,
        warm,
        cool,
        thin,
        shape: Vec4::new(nozzle.radius, shape.radius, shape.cell, core.max(0.01)),
        state: Vec4::new(
            plume.burning.clamp(0.0, 1.0),
            air,
            plume.luminance / across,
            -(1.0 - plume.hides.clamp(0.0, 0.98)).ln() / across,
        ),
        flow: Vec4::new(STREAMS, clock, plume.ground.min(1.0e9), ends.max(0.01)),
        bounds: Vec4::new(diamonds(shape.ratio), turn, radius, length),
    };
    (jet, [radius, length])
}

/// Each frame: every fire's box sized to it, and its figures handed to the march.
pub fn burn(
    air: Option<Res<Air>>,
    ab: Option<Res<Ab>>,
    plumes: Query<&Plume>,
    mut volumes: Query<(&Volume, &ChildOf, &mut Transform, &mut Visibility)>,
    mut materials: ResMut<Assets<PlumeMaterial>>,
) {
    let clock = air.map_or(0.0, |air| air.clock);
    for (volume, of, mut transform, mut visibility) in &mut volumes {
        let Ok(plume) = plumes.get(of.parent()) else { continue };
        let lit = plume.burning > 0.0 && ab.as_ref().is_none_or(|ab| ab.burning());
        let shown = if lit { Visibility::Inherited } else { Visibility::Hidden };
        if *visibility != shown {
            *visibility = shown;
        }
        if !lit {
            continue;
        }
        let (jet, [radius, length]) = figures(plume, clock);
        transform.translation = Vec3::new(0.0, -0.5 * length, 0.0);
        transform.scale = Vec3::new(radius, 0.5 * length, radius);
        if let Some(mut material) = materials.get_mut(&volume.0) {
            material.jet = jet;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plume::Nozzle;

    fn a7(burning: f32, ambient: f32, ground: f32) -> Plume {
        Plume {
            nozzle: Nozzle { radius: 0.366, chamber: 2_192_533.0, exit: 91_192.5, gamma: 1.2 },
            length: 13.9,
            colours: [Vec3::ONE; 5],
            luminance: 8000.0,
            hides: 0.0,
            burning,
            ambient,
            ground,
        }
    }

    #[test]
    fn at_the_sea_the_fire_is_as_long_as_it_was_judged_and_its_box_holds_it() {
        let plume = a7(1.0, SEA, f32::INFINITY);
        let [core, ends] = lengths(&plume);
        assert!((ends - 13.9).abs() < 1e-3 && core < ends);
        let (jet, [radius, length]) = figures(&plume, 0.0);
        assert!(length == ends && radius > 2.0 * 0.366 && radius < 6.0);
        assert!(
            jet.bounds.x == -DIAMONDS_LEAST,
            "squeezed, a little, and shown as the least: {}",
            jet.bounds.x
        );
        assert_eq!(jet.state.w, 0.0);
    }

    #[test]
    fn it_grows_in_thin_air_is_cut_at_the_ground_and_is_short_while_it_builds() {
        let high = figures(&a7(1.0, 500.0, f32::INFINITY), 0.0);
        assert!(high.1[1] > 60.0 && high.1[0] > 5.0 && high.0.bounds.y > 0.5);
        let low = figures(&a7(1.0, SEA, 1.0), 0.0);
        assert!((low.1[1] - 1.3).abs() < 1e-3 && low.1[0] == SHEET);
        assert!(lengths(&a7(0.25, SEA, f32::INFINITY))[1] < 7.0);
    }
}
