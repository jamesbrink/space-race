//! The pad's morning played on the flight's clock: the platforms part, the structure rolls back on its rails, the
//! cherry picker's cab comes to the hatch and is lowered away, the cable masts fall. The motions are the flight's
//! data (`sr_missions::morning`); here they are bound to the pad model's named nodes when it arrives and posed from
//! the clock every frame it moves, so the pad stands as it did at any instant of the morning.
//!
//! The pad is unpacked as built (`tools/unpack-models.mjs` marks its scene so); a pad unpacked by the older unpacker
//! was already stood as at liftoff, and is left as it is.

mod bind;
pub mod pose;
pub mod route;

use bevy::prelude::*;

pub use bind::{PadNodes, Posed, placed};

/// Plays the pad's morning on the clock.
pub struct PadPlugin;

impl Plugin for PadPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<PadNodes>()
            .add_observer(bind::bind)
            .add_systems(PostUpdate, bind::stand.in_set(Posed).before(TransformSystems::Propagate));
    }
}
