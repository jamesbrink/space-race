//! The Earth, a site's frame on it, time, the Sun, the Moon and the stars, in doubles. No engine.
//!
//! The port of `src/world/` (docs/agents/world.md): nothing in the sky is placed by hand, and every result here is
//! tested against a published value.

pub mod daylight;
pub mod earth;
pub mod moon;
pub mod precession;
pub mod site;
pub mod stars;
pub mod sun;
pub mod time;
pub mod vec3;

pub use site::Site;
pub use time::Instant;
pub use vec3::V3;
