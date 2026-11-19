//! Flights and places as data, each figure with its confidence and source.
//!
//! Laid out as `missions/` is: a nation, its places and its programmes; a programme's shared hardware and its
//! flights. A place is built once and knows no flight; a flight chooses what stood there on its day. The figures
//! are the web build's (`missions/**/*.ts`), carried over with their sources; change both together.

pub mod types;
pub mod usa;

pub use types::{Flight, Model, Role, SiteDef};

/// Every flight the native build can show, the first the one it opens.
#[must_use]
pub fn flights() -> Vec<&'static Flight> {
    vec![&usa::mercury::mr3::FLIGHT]
}
