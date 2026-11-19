//! The Earth, a site's frame on it, time and the Sun, in doubles. No engine.
//!
//! The port of `src/world/` (docs/agents/world.md): nothing in the sky is placed by hand, and every result here is
//! tested against a published value.

pub mod earth;
pub mod site;
pub mod sun;
pub mod time;
pub mod vec3;

pub use site::Site;
pub use time::Instant;
pub use vec3::V3;
