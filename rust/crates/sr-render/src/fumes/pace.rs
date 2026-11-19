//! The fumes' time: how many steps of the solver this frame owes the flight's clock, where the box stands, and
//! the figures the passes and the picture are handed.
//!
//! The solver steps a sixtieth of a second of the flight's clock at a time, so a stopped clock stops the air and
//! a fast one cannot blow it up; a clock run faster than a few times leaves the air behind, and says so here.

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

/// One step of the solver, s of the flight's clock.
pub const STEP: f32 = 1.0 / 60.0;
/// The most steps worked in a frame: beyond this the air falls behind the clock rather than the frame behind
/// the screen.
const MOST: u32 = 2;
/// The air is worked this long after anything last fed it, s: by then what was raised has thinned to nothing
/// (the dust is gone by e in a quarter of that) or drifted out of the box.
const LINGERS: f32 = 40.0;
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
}

/// Where the box stands: the middle of its floor and how it is turned, x down the wind.
fn stands(fumes: &Fumes) -> (DVec3, Quat) {
    let down = Vec3::new(fumes.downwind.x, 0.0, fumes.downwind.z).normalize_or(Vec3::X);
    let turned = Quat::from_rotation_y((-down.z).atan2(down.x));
    (fumes.pad + (down * (0.5 * size().x - UPWIND)).as_dvec3(), turned)
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
fn frame(fumes: &Fumes, sky: &Sky, clock: f32, floor: DVec3, turned: Quat) -> Frame {
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
        time: Vec4::new(STEP, clock, fumes.wind, fumes.sources.len().min(SOURCES) as f32),
        sun: sun.extend(size().length()),
        sun_a: a.extend(0.0),
        sun_b: sun.cross(a).extend(0.0),
        sunlight: crate::clouds::sunlight(high).extend(0.0),
        skylight: crate::clouds::skylight(high).extend(0.0),
        lamp,
        lamp_colour: fumes.lamp.map_or(Vec3::ZERO, |lamp| lamp.colour).extend(0.0),
        ground: Vec4::new(fumes.raises, fumes.over, UPWIND, 0.5 * size().z),
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
    kept.owed = (kept.owed + passed.clamp(0.0, JUMP)).min(STEP * (MOST as f32 + 1.0));
    step.steps = if live { ((kept.owed / STEP) as u32).min(MOST) } else { 0 };
    kept.owed -= step.steps as f32 * STEP;
    step.live = live;

    let (floor, turned) = stands(&fumes);
    step.frame = frame(&fumes, &sky, air.clock, floor, turned);
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
            let (floor, turned) = stands(&air);
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
}
