//! The signal maths the synthesiser is made of: noise, filters, the N-wave, a delay line and the last stage's
//! limiter. Pure: no engine and no device, so each is tested against a known answer.

pub mod delay;
pub mod filter;
pub mod limit;
pub mod noise;
pub mod nwave;

/// Samples a second: what the synthesiser makes and the offline render writes.
pub const RATE: f32 = 48_000.0;
