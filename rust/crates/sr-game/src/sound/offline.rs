//! The flight flown without a window, as fast as it will go, and what would have been heard written to a WAV
//! file with a report beside it: the same clock, hand, physics, cameras and scripted keys as the game, the same
//! model and the same synthesiser, stepped a hundredth of a second at a time. Nobody building this can hear it,
//! so this is how it is measured.

use std::fmt::Write as _;
use std::path::{Path, PathBuf};
use std::time::Duration;

use avian3d::prelude::Position;
use bevy::input::InputPlugin;
use bevy::prelude::*;
use bevy::time::TimeUpdateStrategy;
use bevy::world_serialization::{WorldAsset, WorldInstanceReady, WorldInstanceSpawner};
use sr_missions::Role;
use sr_render::origin::{OriginPlugin, WorldPos};

use super::dsp::RATE;
use super::meter::{band, centroid, db, level};
use super::synth::Synth;
use super::wav::Tape;
use super::{Played, Sound, SoundPlugin};
use crate::clock::{Clock, ClockPlugin};
use crate::flight::{Crewed, FlightPlugin, Hand, Parts, Telemetry};
use crate::rig::RigPlugin;
use crate::script::ScriptPlugin;
use crate::stage::Cast;
use crate::{Options, Showing};

/// One of our seconds of the render.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Second {
    /// The flight's clock at its end, s, and the vehicle's height, m, and Mach number then.
    pub t: f64,
    /// As `t`.
    pub height: f64,
    /// As `t`.
    pub mach: f64,
    /// How far the ears were from the vehicle, m, and how late the engine's sound was arriving, s (if any was).
    pub distance: f64,
    /// As `distance`.
    pub delay: Option<f64>,
    /// The engine's level at the ears, dB, and its roar's and the air's gains.
    pub engine: f64,
    /// As `engine`.
    pub roar: f64,
    /// As `engine`.
    pub air: f64,
    /// What came out: its level and peak, dB below full scale, and where its spectrum's weight lay, Hz.
    pub rms: f32,
    /// As `rms`.
    pub peak: f32,
    /// As `rms`.
    pub centroid: f32,
    /// The share of its power under 60 Hz, from there to 250, to 2000, and above, dB below the whole.
    pub bands: [f32; 4],
}

/// What a render came to.
#[derive(Debug, Clone, Default)]
pub struct Render {
    /// Each of our seconds.
    pub seconds: Vec<Second>,
    /// Everything that happened once and was heard.
    pub played: Vec<Played>,
    /// The flight's clock when the engine first burned, and our seconds from the start when it did, and when
    /// the sound first rose well over what it had been.
    pub lit: Option<(f64, f64)>,
    /// As `lit`.
    pub onset: Option<f64>,
}

/// The flight as the game sets it up, with nothing drawn and nothing played.
fn stage(options: &Options) -> Option<App> {
    let showing = Showing(sr_missions::flights().into_iter().next()?);
    let mut app = App::new();
    app.add_plugins((MinimalPlugins, InputPlugin))
        .insert_resource(TimeUpdateStrategy::ManualDuration(Duration::from_millis(10)))
        .insert_resource(showing)
        .insert_resource(options.clone())
        .init_resource::<Parts>()
        .add_plugins((OriginPlugin, ClockPlugin, FlightPlugin, RigPlugin, ScriptPlugin, SoundPlugin));
    app.finish();
    app.cleanup();
    app.update();
    // The vehicle's model "arrives": the flight makes it a body as it does in the game. (An instance's id can only
    // be had from a spawner; this one spawns nothing.)
    let vehicle = showing.0.model(Role::Vehicle)?;
    let turned = Quat::from_rotation_y((vehicle.turn as f32).to_radians());
    let stands = bevy::math::DVec3::from_array(vehicle.position);
    let entity =
        app.world_mut().spawn((Cast(Role::Vehicle), WorldPos(stands), Transform::from_rotation(turned))).id();
    let instance_id = WorldInstanceSpawner::default().spawn(Handle::<WorldAsset>::default());
    app.world_mut().trigger(WorldInstanceReady { entity, instance_id });
    app.update();
    Some(app)
}

/// One of our seconds measured: the game's state at its end, and what is on the tape for it.
fn second(app: &mut App, heard: &[f32]) -> Second {
    let world = app.world_mut();
    let crew = world.query_filtered::<&Position, With<Crewed>>().single(world).map_or(default(), |at| at.0);
    let sound = world.resource::<Sound>();
    let ears = sound.listener.map_or(crew, |listener| crate::stage::dvec(listener.ears.at));
    let left: Vec<f32> = heard.iter().step_by(2).copied().collect();
    let (rms, peak) = level(heard);
    let whole = band(&left, 0.0, RATE).max(1.0e-20);
    let share = |from: f32, to: f32| 10.0 * (band(&left, from, to) / whole).max(1.0e-12).log10();
    Second {
        t: world.resource::<Clock>().t,
        height: world.resource::<Telemetry>().height,
        mach: world.resource::<Telemetry>().mach,
        distance: (ears - crew).length(),
        delay: sound.heard.map(|heard| heard.delay),
        engine: sound.mix.level,
        roar: sound.mix.engine.roar,
        air: sound.mix.air.gain,
        rms: db(rms),
        peak: db(peak),
        centroid: centroid(&left),
        bands: [share(0.0, 60.0), share(60.0, 250.0), share(250.0, 2000.0), share(2000.0, RATE)],
    }
}

/// Fly it and write what is heard to `options.hear`, to `options.until` on the flight's clock (a minute after it
/// opens, if that is not given).
///
/// # Errors
/// Why it could not be done.
pub fn hear(options: &Options) -> Result<Render, String> {
    let path = options.hear.clone().ok_or("--hear needs a file to write")?;
    let until = options.until.unwrap_or(options.at + 60.0);
    let mut app = stage(options).ok_or("there is no flight to fly")?;
    let mut tape = Tape::create(&path).map_err(|wrong| format!("{}: {wrong}", path.display()))?;
    let mut synth = Synth::new(app.world().resource::<Sound>().shared.clone());
    let (mut render, mut heard, mut quiet) = (Render::default(), Vec::new(), None);
    // (a hand-flown count holds at zero until a key lights the engine: do not wait for ever)
    let most = ((until - options.at) / f64::from(options.rate.max(1.0)) + 90.0) * 100.0;
    for step in 0..most as usize {
        app.update();
        let from = heard.len();
        synth.render((RATE / 100.0) as usize, &mut heard);
        let wall = step as f64 / 100.0;
        let (world, loud) = (app.world(), level(&heard[from..]).0);
        if render.lit.is_none() && world.resource::<Sound>().burn > 0.0 {
            render.lit = Some((world.resource::<Clock>().t, wall));
        }
        // The first hundredth of a second four times as loud as the first second was, after the engine is lit.
        if render.onset.is_none()
            && render.lit.is_some()
            && quiet.is_some_and(|quiet: f32| loud > 4.0 * quiet.max(5.0e-4))
        {
            render.onset = Some(wall);
        }
        if heard.len() >= 2 * RATE as usize {
            quiet.get_or_insert(level(&heard).0);
            tape.write(&heard).map_err(|wrong| wrong.to_string())?;
            render.seconds.push(second(&mut app, &heard));
            heard.clear();
        }
        render.played.append(&mut app.world_mut().resource_mut::<Sound>().played);
        if app.world().resource::<Clock>().t >= until {
            break;
        }
    }
    tape.write(&heard).and_then(|()| tape.finish()).map_err(|wrong| wrong.to_string())?;
    report(&render, options, app.world(), &path)?;
    Ok(render)
}

/// The report: beside the file, with `.txt` after its name.
fn report(render: &Render, options: &Options, world: &World, path: &Path) -> Result<(), String> {
    let mut text = format!("{options:?}\n\n");
    let (hand, telemetry) = (world.resource::<Hand>(), world.resource::<Telemetry>());
    let _ = writeln!(
        text,
        "ended: height {:.0} m, speed {:.0} m/s, broke {:?}, lost {:?}",
        telemetry.height, telemetry.speed, hand.broke, hand.lost
    );
    if let (Some((t, wall)), Some(onset)) = (render.lit, render.onset) {
        let _ = writeln!(
            text,
            "engine lit at T{t:+.2} s ({wall:.2} s in); first heard {onset:.2} s in: {:.3} s later",
            onset - wall
        );
    }
    let _ = writeln!(
        text,
        "\n  s |  clock | height m | Mach | distance m | delay s | engine dB | roar |  air | rms dB | peak dB | centroid Hz \
         | <60 | 60-250 | 250-2k | >2k"
    );
    for (i, s) in render.seconds.iter().enumerate() {
        let delay = s.delay.map_or("      -".to_owned(), |delay| format!("{delay:7.3}"));
        let _ = writeln!(
            text,
            "{:3} | {:6.1} | {:8.0} | {:4.2} | {:10.0} | {delay} | {:9.1} | {:4.2} | {:4.2} | {:6.1} | {:7.1} | {:11.0} | \
             {:3.0} | {:6.0} | {:6.0} | {:3.0}",
            i + 1,
            s.t,
            s.height,
            s.mach,
            s.distance,
            s.engine.max(-99.0),
            s.roar,
            s.air,
            s.rms,
            s.peak,
            s.centroid,
            s.bands[0],
            s.bands[1],
            s.bands[2],
            s.bands[3]
        );
    }
    let _ = writeln!(text, "\nheard once:  clock | what | level dB | from m | lasts s");
    for p in &render.played {
        let _ = writeln!(
            text,
            "{:8.2} | {:?} | {:.1} | {:.0} | {:.3}",
            p.t, p.cue, p.level, p.distance, p.seconds
        );
    }
    let mut beside = PathBuf::from(path).into_os_string();
    beside.push(".txt");
    std::fs::write(&beside, text).map_err(|wrong| wrong.to_string())
}

#[cfg(test)]
#[path = "offline_tests.rs"]
mod tests;
