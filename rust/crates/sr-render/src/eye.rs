//! The eye: the one camera, and everything a frame goes through on its way to the screen.
//!
//! High dynamic range from end to end. The Sun is 130,000 lux and the shade under the gantry a thousandth of
//! that; the exposure is a photographer's (EV), the bloom is the lens's, the anti-aliasing is temporal so that
//! lattice and rivets hold still, and the grade ([`crate::look`]) is laid on last.

use bevy::anti_alias::taa::TemporalAntiAliasing;
use bevy::camera::{Exposure, Hdr};
use bevy::core_pipeline::prepass::{DepthPrepass, MotionVectorPrepass, NormalPrepass};
use bevy::light::AtmosphereEnvironmentMapLight;
use bevy::pbr::{
    AtmosphereMode, AtmosphereSettings, ScreenSpaceAmbientOcclusion, ScreenSpaceAmbientOcclusionQualityLevel,
};
use bevy::post_process::bloom::Bloom;
use bevy::prelude::*;

use crate::night::Dusk;
use crate::origin::{Eye, Origin};
use crate::sky::{DAYLIGHT, Sky};

/// Nothing nearer than this is drawn, m: a hand's breadth, so a face against a rivet still sees it.
const NEAR: f32 = 0.1;
/// Nothing farther is, m: past the far side of the Earth seen from the top of the flight.
const FAR: f32 = 3.0e7;
/// The lens: a 35 mm frame's 28 mm, about what a person takes in, radians of vertical field.
pub const FIELD: f32 = 0.82;

/// How many directions the ambient occlusion looks in at each pixel: two slices of two samples a side (Bevy's
/// Medium), against the default's three of three. The temporal anti-aliasing turns the samples each frame and
/// averages them, so the fewer converge on the same shading within a few frames; at 2560 x 1440 it saves about
/// half of the occlusion's 2 ms. Chosen by measurement and by comparing frames of the gantry at the pad.
const OCCLUSION: ScreenSpaceAmbientOcclusionQualityLevel = ScreenSpaceAmbientOcclusionQualityLevel::Medium;
/// `SR_SSAO` set to `low`, `medium`, `high` or `ultra` overrides [`OCCLUSION`]: a switch for measuring.
const OCCLUSION_SWITCH: &str = "SR_SSAO";

/// The ambient occlusion's quality: [`OCCLUSION`], unless the switch asks for another.
fn occlusion() -> ScreenSpaceAmbientOcclusionQualityLevel {
    use ScreenSpaceAmbientOcclusionQualityLevel::{High, Low, Medium, Ultra};
    match std::env::var(OCCLUSION_SWITCH).as_deref() {
        Ok("low") => Low,
        Ok("medium") => Medium,
        Ok("high") => High,
        Ok("ultra") => Ultra,
        _ => OCCLUSION,
    }
}

/// The most points the sky is sampled at along each ray, through the air to its top or to what stands in the way
/// (Bevy's default, 16). `SR_SKY_SAMPLES` overrides it: a switch for measuring.
const SKY_SAMPLES: u32 = 16;

/// The sky's samples: [`SKY_SAMPLES`], unless the switch asks for another number.
fn sky_samples() -> u32 {
    std::env::var("SR_SKY_SAMPLES").ok().and_then(|n| n.parse().ok()).unwrap_or(SKY_SAMPLES)
}

/// The aerial-view table's size: Bevy fills it each frame for drawing the air from tables, which the raymarched
/// sky does not read (it marches the air itself), so it is kept as small as it may be. Its default is 32 a side.
const AERIAL_TABLE: UVec3 = UVec3::splat(4);

/// The sky's own picture of itself, which lights the shade and is what polished metal reflects: pixels a side of
/// each face of its cube, half Bevy's default of 128: the sky is a smooth gradient and frames of the capsule's
/// shingles and the pad show no difference, while the filtering, done again every frame, costs a quarter as much.
/// `SR_ENV_SIZE` overrides it (a power of two): a switch for measuring.
const SKY_PICTURE: u32 = 64;

/// The sky's picture's size: [`SKY_PICTURE`], unless the switch asks for another.
fn sky_picture() -> UVec2 {
    let side = std::env::var("SR_ENV_SIZE").ok().and_then(|n| n.parse::<u32>().ok()).unwrap_or(SKY_PICTURE);
    UVec2::splat(side.next_power_of_two().max(16))
}

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
        ScreenSpaceAmbientOcclusion { quality_level: occlusion(), ..default() },
        Bloom::NATURAL,
        // Raymarched: the flight leaves the air, and the lookup tables are only good from inside it.
        AtmosphereSettings {
            rendering_method: AtmosphereMode::Raymarched,
            sky_max_samples: sky_samples(),
            aerial_view_lut_size: AERIAL_TABLE,
            ..default()
        },
        // The sky lights the shade and is what polished metal reflects.
        AtmosphereEnvironmentMapLight { size: sky_picture(), ..default() },
    )
}

/// How far the eye opens once the sky has gone black, stops. Estimated: out of the air there is no sky filling
/// the shade, and a camera set for the pad would leave the dark side of the vehicle and the limb too deep.
const OPENS: f32 = 0.35;
/// The heights between which the sky goes from blue to black, m.
const DARKENS: [f32; 2] = [18_000.0, 90_000.0];

/// The exposure follows the height: set for daylight on the ground, opened a little as the sky darkens; and the
/// hour: opened as the light goes at dusk ([`Dusk`]). It moves with the height and the Sun themselves, so it never
/// steps.
pub fn adapt(origin: Res<Origin>, sky: Res<Sky>, dusk: Res<Dusk>, mut eyes: Query<&mut Exposure, With<Eye>>) {
    let height = ((origin.0 - sky.centre).length() - sky.radius) as f32;
    let dark = ((height - DARKENS[0]) / (DARKENS[1] - DARKENS[0])).clamp(0.0, 1.0);
    let ev100 = DAYLIGHT.ev100 - OPENS * dark * dark * (3.0 - 2.0 * dark) - dusk.opens;
    for mut exposure in &mut eyes {
        if (exposure.ev100 - ev100).abs() > 1.0e-3 {
            exposure.ev100 = ev100;
        }
    }
}
