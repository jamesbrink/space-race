//! The eye: the one camera, and everything a frame goes through on its way to the screen.
//!
//! High dynamic range from end to end. The Sun is 130,000 lux and the shade under the gantry a thousandth of
//! that; the exposure is a photographer's (EV), the bloom is the lens's, the anti-aliasing is temporal so that
//! lattice and rivets hold still, and the grade ([`crate::look`]) is laid on last.

use bevy::anti_alias::taa::TemporalAntiAliasing;
use bevy::camera::Hdr;
use bevy::core_pipeline::prepass::{DepthPrepass, MotionVectorPrepass, NormalPrepass};
use bevy::light::AtmosphereEnvironmentMapLight;
use bevy::pbr::{AtmosphereMode, AtmosphereSettings, ScreenSpaceAmbientOcclusion};
use bevy::post_process::bloom::Bloom;
use bevy::prelude::*;

use crate::origin::Eye;
use crate::sky::DAYLIGHT;

/// Nothing nearer than this is drawn, m: a hand's breadth, so a face against a rivet still sees it.
const NEAR: f32 = 0.1;
/// Nothing farther is, m: past the far side of the Earth seen from the top of the flight.
const FAR: f32 = 3.0e7;
/// The lens: a 35 mm frame's 28 mm, about what a person takes in, radians of vertical field.
pub const FIELD: f32 = 0.82;

/// Everything the camera needs to draw the world as this crate means it to look.
#[must_use]
pub fn eye() -> impl Bundle {
    (
        Eye,
        Camera3d::default(),
        Hdr,
        Projection::Perspective(PerspectiveProjection { fov: FIELD, near: NEAR, far: FAR, ..default() }),
        DAYLIGHT,
        Msaa::Off,
        (DepthPrepass, NormalPrepass, MotionVectorPrepass),
        TemporalAntiAliasing::default(),
        ScreenSpaceAmbientOcclusion::default(),
        Bloom::NATURAL,
        // Raymarched: the flight leaves the air, and the lookup tables are only good from inside it.
        AtmosphereSettings { rendering_method: AtmosphereMode::Raymarched, ..default() },
        // The sky lights the shade and is what polished metal reflects.
        AtmosphereEnvironmentMapLight::default(),
    )
}
