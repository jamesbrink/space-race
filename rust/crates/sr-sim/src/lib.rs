//! The flight: thrust, air, drag, guidance and the timeline, in doubles. No engine.
//!
//! The port of `src/sim/` (docs/agents/simulator.md). A flight is a [`Plan`] of measured figures; [`loads`] says
//! what pushes on each body at an instant; [`fly`] integrates the spacecraft's path without an engine, for the
//! tests, and the game integrates the same loads as rigid bodies. Nothing is fitted: where a result misses the
//! record the miss is written down (`sr-missions`, each flight's `MISSES`).

pub mod air;
pub mod curve;
pub mod field;
pub mod fly;
pub mod guidance;
pub mod loads;
pub mod plan;
pub mod sequence;
pub mod stress;

pub use curve::Curve;
pub use field::Field;
pub use loads::{Body, Drive, Loads};
pub use plan::Plan;
pub use sequence::Sequence;
pub use stress::{Limits, Strain, Stress};
