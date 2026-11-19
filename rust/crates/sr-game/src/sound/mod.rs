//! The flight's sound, synthesised as it is flown: no audio files (docs/agents/sound.md, whose rules these are).
//!
//! Numbers in one place, sound in another. `model` (with `air`, `path`, `cues` and `figures`) is pure and tested:
//! every gain, filter frequency, delay and Doppler factor from where the vehicle is and was and where the ears
//! are. `synth` only turns those numbers into samples, so the same code plays live (`device`) and renders offline
//! to a file (`offline`), which is how it is measured by people who cannot hear it. Nothing here knows a flight.
//!
//! Sound follows the clock, late: what is heard left the vehicle its distance over the speed of sound ago
//! (`path`), so the roar trails the flame, Doppler is how fast the heard instant runs, and a vehicle faster than
//! sound is silent until its Mach cone passes the ears, which is the boom. Stopped, the flight is silent and the
//! place is not; above twice life it is a low bed with nothing that happens once. The path is physics; every
//! source level, every loss and every timbre is an estimate and says so (`figures`).

pub mod air;
pub mod cues;
mod device;
pub mod dsp;
mod ears;
pub mod figures;
mod keys;
mod listen;
pub mod meter;
pub mod model;
mod notice;
pub mod offline;
pub mod path;
pub mod shared;
mod state;
pub mod synth;
pub mod wav;

use bevy::audio::{AddAudioSource, AudioPlugin};
use bevy::prelude::*;

pub use state::{Played, Sound};

use crate::clock::Step;

/// The flight's sound. With no audio device (a test, the offline render) everything but the playing still runs.
pub struct SoundPlugin;

impl Plugin for SoundPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<Sound>()
            .add_systems(Startup, keys::start)
            .add_systems(FixedUpdate, (listen::record, notice::notice).chain().after(Step::Drive))
            .add_systems(Update, keys::keys)
            .add_systems(Last, (listen::hear, notice::deliver).chain());
        if app.is_plugin_added::<AudioPlugin>() {
            app.add_audio_source::<device::Voice>()
                .add_systems(Startup, device::play)
                .add_systems(Update, device::confirm);
        }
    }
}
