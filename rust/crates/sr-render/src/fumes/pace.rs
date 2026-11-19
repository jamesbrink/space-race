//! The fumes' time: how many steps of the solver this frame owes the flight's clock, where the box stands, and
//! the figures the passes and the picture are handed.
//!
//! The solver steps a sixtieth of a second of the flight's clock at a time, or up to a twentieth when the clock
//! runs fast, so a stopped clock stops the air and a fast one cannot blow it up; a clock run faster than about
//! six times leaves the air behind.
//!
//! While the blast feeds the air the box stands with the pad in it. Once nothing feeds it, it lets go and drifts
//! down the wind with what it holds, at the wind's speed at the height of the cloud, so what the launch raised
//! goes on drifting and thinning for minutes and is not lost at the box's side.

use bevy::math::DVec3;
use bevy::prelude::*;
use bevy::render::RenderApp;
use bevy::render::extract_resource::ExtractResource;

use super::grid::{CELL, CELLS, FINER, Fed, Frame, SOURCES, UPWIND, size};
use super::material::{Cloud, FumesMaterial};
use super::{Fumes, Push, Source};
use crate::air::Air;
use crate::origin::WorldPos;
use crate::sky::Sky;

/// One step of the solver, s of the flight's clock, and the longest a step is let be when the clock runs fast
/// (the solver carries things back along the velocity, so a long step is stable, only coarser).
pub const STEP: f32 = 1.0 / 60.0;
const LONGEST_STEP: f32 = 1.0 / 20.0;
/// The most steps worked in a frame: beyond this the air falls behind the clock rather than the frame behind
/// the screen.
const MOST: u32 = 2;
/// The air is worked this long after anything last fed it, s: by then what was raised has thinned to a trace
/// (the dust is gone by e in less than half of it, `fumes_solve.wesl`, `DUST_LASTS`) and is a kilometre and more
/// down the wind.
const LINGERS: f32 = 300.0;
/// Once nothing feeds it the box drifts at the wind's speed at this height, m: low in the cloud the blast leaves,
/// so what lies on the ground, which the wind moves slowest, is not left behind. Estimated.
const CARRIED_AT: f32 = 2.0;
/// And comes to that speed in about this long, s. Estimated: gently, so the air in it is not jolted.
const LETS_GO: f32 = 4.0;
/// A clock that goes back, or on by more than this in a frame, has been set, not run: the air starts again.
const JUMP: f32 = 20.0;

/// What the render world works this frame.
#[derive(Resource, Debug, Clone, Default, ExtractResource)]
#[extract_app(RenderApp)]
pub struct Step {
    /// The passes' figures.
    pub frame: Frame,
    /// How many steps to work.
    pub steps: u32,
    /// Whether there is anything to light and draw at all.
    pub live: bool,
    /// Goes up each time the air starts again from nothing.
    pub epoch: u32,
}

/// What `keep` remembers between frames.
#[derive(Debug, Default)]
pub struct Kept {
    clock: f32,
    owed: f32,
    fed: Option<f32>,
    /// The box's drift: its speed, m/s, its change of speed in the last frame, m/s^2, and how far it has gone, m.
    drift: Vec3,
}

/// After the eye has placed everything: how the box stands in the world the eye draws, for the march.
pub fn seat(clouds: Query<&GlobalTransform, With<Cloud>>, mut step: ResMut<Step>) {
    let Ok(placed) = clouds.single() else { return };
    let half = 0.5 * size();
    // (the mesh is two units a side, scaled by half the box: its frame is turned into metres from the low corner)
    let metres = Mat4::from_translation(half) * Mat4::from_scale(half);
    step.frame.box_from_world = metres * placed.to_matrix().inverse();
}

/// Where the box stands, having drifted `drifted` m: the middle of its floor and how it is turned, x down the wind.
fn stands(fumes: &Fumes, drifted: f32) -> (DVec3, Quat) {
    let down = Vec3::new(fumes.downwind.x, 0.0, fumes.downwind.z).normalize_or(Vec3::X);
    let turned = Quat::from_rotation_y((-down.z).atan2(down.x));
    (fumes.pad + (down * (0.5 * size().x - UPWIND + drifted)).as_dvec3(), turned)
}

/// The box's drift a frame of `passed` s on: held at the pad while anything feeds the air, then let go to the
/// wind's speed at the cloud's height.
fn drifts(was: Vec3, fed: bool, wind: f32, passed: f32) -> Vec3 {
    let wanted = if fed { 0.0 } else { wind * (CARRIED_AT / 10.0).powf(0.143) };
    let speed = if fed { 0.0 } else { was.x + (wanted - was.x) * (1.0 - (-passed / LETS_GO).exp()) };
    let changing = if passed > 0.0 { (speed - was.x) / passed } else { 0.0 };
    Vec3::new(speed, changing, if fed { 0.0 } else { was.z + f32::midpoint(speed, was.x) * passed })
}

/// A source in the box's frame.
fn fed(source: &Source, floor: DVec3, turned: Quat) -> Fed {
    let into = turned.inverse();
    let at = into * (source.at - floor).as_vec3() + Vec3::new(0.5 * size().x, 0.0, 0.5 * size().z);
    let (push, hold) = match source.push {
        Push::Blast { speed, thick } => (Vec4::new(speed, thick, 0.0, 1.0), 30.0),
        Push::Blow { velocity, hold } => ((into * velocity).extend(0.0), hold),
    };
    Fed {
        at: at.extend(source.radius),
        push,
        gives: Vec4::new(source.dust, source.vapour, source.heat, hold),
    }
}

/// The frame's figures.
fn frame(fumes: &Fumes, sky: &Sky, clock: f32, floor: DVec3, turned: Quat, step: f32, drift: Vec3) -> Frame {
    let into = turned.inverse();
    let sun = (into * sky.sun).normalize();
    let a = sun.cross(Vec3::Y).normalize_or(Vec3::X);
    let high = sky.sun.y.max(0.03);
    let corner = Vec3::new(0.5 * size().x, 0.0, 0.5 * size().z);
    let mut sources = [Fed::default(); SOURCES];
    for (slot, source) in sources.iter_mut().zip(&fumes.sources) {
        *slot = fed(source, floor, turned);
    }
    let lamp = fumes
        .lamp
        .map_or(Vec4::ZERO, |lamp| (into * (lamp.at - floor).as_vec3() + corner).extend(lamp.candela));
    Frame {
        size: size().extend(CELL),
        cells: CELLS.as_vec3().extend(FINER as f32),
        time: Vec4::new(step, clock, fumes.wind, fumes.sources.len().min(SOURCES) as f32),
        sun: sun.extend(size().length()),
        sun_a: a.extend(0.0),
        sun_b: sun.cross(a).extend(0.0),
        sunlight: crate::clouds::sunlight(high).extend(0.0),
        skylight: crate::clouds::skylight(high).extend(0.0),
        lamp,
        lamp_colour: fumes.lamp.map_or(Vec3::ZERO, |lamp| lamp.colour).extend(0.0),
        ground: Vec4::new(fumes.raises, fumes.over, 0.0, 0.0),
        drift: drift.extend(0.0),
        // (set once the eye has placed the box: `seat`)
        box_from_world: Mat4::IDENTITY,
        sources,
    }
}

/// Each frame: how many steps the clock has earned, the box where the wind has it, and the figures for the
/// passes and the picture.
pub fn keep(
    fumes: Option<Res<Fumes>>,
    sky: Res<Sky>,
    air: Option<Res<Air>>,
    mut kept: Local<Kept>,
    mut step: ResMut<Step>,
    mut cloud: Query<(&Cloud, &mut WorldPos, &mut Transform, &mut Visibility)>,
    mut materials: ResMut<Assets<FumesMaterial>>,
) {
    let (Some(fumes), Some(air)) = (fumes, air) else { return };
    let passed = air.clock - kept.clock;
    kept.clock = air.clock;
    if !(0.0..JUMP).contains(&passed) {
        kept.owed = 0.0;
        kept.fed = None;
    }
    if !fumes.sources.is_empty() {
        if kept.fed.is_none() {
            step.epoch += 1;
        }
        kept.fed = Some(air.clock);
    }
    let live = kept.fed.is_some_and(|fed| air.clock - fed < LINGERS);
    if !live {
        kept.fed = None;
    }
    kept.owed = (kept.owed + passed.clamp(0.0, JUMP)).min(LONGEST_STEP * MOST as f32);
    step.steps = if live { ((kept.owed / STEP) as u32).min(MOST) } else { 0 };
    let each = if step.steps > 0 { (kept.owed / step.steps as f32).min(LONGEST_STEP) } else { STEP };
    kept.owed -= step.steps as f32 * each;
    step.live = live;
    // (the box moves on by the air's time, not the clock's: a clock run faster than the air keeps them together)
    let worked = step.steps as f32 * each;
    kept.drift =
        if live { drifts(kept.drift, !fumes.sources.is_empty(), fumes.wind, worked) } else { Vec3::ZERO };

    let (floor, turned) = stands(&fumes, kept.drift.z);
    step.frame = frame(&fumes, &sky, air.clock, floor, turned, each, kept.drift);
    for (cloud, mut at, mut transform, mut visibility) in &mut cloud {
        let shown = if live { Visibility::Inherited } else { Visibility::Hidden };
        if *visibility != shown {
            *visibility = shown;
        }
        if !live {
            continue;
        }
        at.0 = floor + DVec3::Y * f64::from(0.5 * size().y);
        transform.rotation = turned;
        transform.scale = 0.5 * size();
        if let Some(mut material) = materials.get_mut(&cloud.0) {
            material.frame = step.frame;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fumes(downwind: Vec3) -> Fumes {
        Fumes {
            pad: DVec3::new(10.0, 0.0, -4.0),
            downwind,
            wind: 5.0,
            raises: 0.0,
            over: 0.0,
            sources: Vec::new(),
            lamp: None,
        }
    }

    #[test]
    fn the_pad_is_in_the_box_where_the_grid_says_whichever_way_the_wind_blows() {
        for downwind in [Vec3::X, Vec3::NEG_Z, Vec3::new(-0.6, 0.0, 0.8)] {
            let air = fumes(downwind);
            let (floor, turned) = stands(&air, 0.0);
            let source = Source {
                at: air.pad + (downwind * 10.0).as_dvec3() + DVec3::Y * 2.0,
                radius: 1.0,
                push: Push::Blow { velocity: downwind * 3.0, hold: 1.0 },
                dust: 0.0,
                vapour: 0.0,
                heat: 0.0,
            };
            let fed = fed(&source, floor, turned);
            // Ten metres down the wind of the pad, on the box's middle line, blown down its own x.
            assert!(
                (fed.at.xyz() - Vec3::new(UPWIND + 10.0, 2.0, 0.5 * size().z)).length() < 1e-3,
                "{fed:?}"
            );
            assert!((fed.push.xyz() - Vec3::X * 3.0).length() < 1e-4);
        }
    }

    #[test]
    fn the_box_holds_to_the_pad_while_fed_then_drifts_at_the_winds_speed() {
        let mut drift = drifts(Vec3::ZERO, true, 5.0, STEP);
        assert_eq!(drift, Vec3::ZERO);
        for _ in 0..(60 * 60) {
            drift = drifts(drift, false, 5.0, STEP);
        }
        let carried = 5.0 * (CARRIED_AT / 10.0).powf(0.143);
        assert!((drift.x - carried).abs() < 1e-3 && drift.y.abs() < 1e-3, "{drift}");
        // (a minute at that speed, less the few seconds it took to come to it)
        assert!((drift.z - carried * (60.0 - LETS_GO)).abs() < 0.5, "{drift}");
    }
}
