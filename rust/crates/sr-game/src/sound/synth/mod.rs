//! The synthesiser: the knobs' numbers made into sound, a frame at a time, with no audio file anywhere. Each
//! voice is a module; `mixer` sums them and is what the device (or the offline render) plays.
//!
//! Every timbre in here is a synthesised impression and `estimated`: no recording was measured or used.

mod bed;
mod engine;
mod knobs;
mod mixer;
mod shots;
mod wind;

pub use knobs::{Knobs, spread};
pub use mixer::Synth;

#[cfg(test)]
mod tests;
