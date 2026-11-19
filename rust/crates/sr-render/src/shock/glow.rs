//! The gas a blunt body brings to rest ahead of it, glowing as hot as the shock has made it, and its wake.
//!
//! The layer is an ellipsoid over the shield, as thick at the middle as the shock stands off (Billig's
//! correlation for a sphere, Δ/R = 0.143 exp(3.24/M²): J. Spacecraft 4, 1967) and wrapping a little past the
//! rim; it is optically thin, so each pixel is as bright as the length of gas its ray crosses, which makes the
//! rim, seen edge on, the brightest part. The wake is a dimmer, longer ellipsoid behind, flickering.

use bevy::camera::visibility::NoFrustumCulling;
use bevy::light::NotShadowCaster;
use bevy::mesh::MeshVertexBufferLayoutRef;
use bevy::pbr::{MaterialPipeline, MaterialPipelineKey};
use bevy::prelude::*;
use bevy::render::render_resource::{
    AsBindGroup, CompareFunction, Face, RenderPipelineDescriptor, ShaderType, SpecializedMeshPipelineError,
};
use bevy::shader::ShaderRef;

use super::Glow;
use super::light::blackbody;
use crate::air::Air;

/// The gas wraps this far past the shield's rim, as a share of how far the shock stands off. Estimated: the
/// layer turns round the shoulder and thins into the wake within about its own thickness.
const WRAPS: f32 = 0.6;
/// The wake: how much cooler than the layer it is, how much of the layer's light a metre of it gives at its
/// head, how long it is and how wide, in rim radii. Estimated: the gas expands round the shoulder and cools.
const WAKE_COOLER: f32 = 0.8;
const WAKE_SHARE: f32 = 0.06;
const WAKE_LONG: f32 = 7.0;
const WAKE_WIDE: f32 = 0.8;
/// How much the wake's light flickers, 0 to 1. Estimated.
const FLICKER: f32 = 0.6;
/// A glow dimmer than this, cd/m^2 through the layer's middle, is not drawn.
const LEAST: f32 = 0.5;

/// What the march is handed.
#[derive(ShaderType, Debug, Clone, Copy, Default)]
pub struct Gas {
    /// Its colour times the light a metre of it gives, cd/m^2 a metre; `w` 1 for the wake.
    pub light: Vec4,
    /// The ellipsoid's half-widths, m; `w` the height past which, along its axis, there is none.
    pub halves: Vec4,
    /// The clock, s; how far along the wake its light falls by e, m; how much it flickers.
    pub flow: Vec4,
}

/// The glow's material.
#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
pub struct GlowMaterial {
    /// This frame's figures.
    #[uniform(0)]
    pub gas: Gas,
}

impl Material for GlowMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/glow.wesl".into()
    }

    fn alpha_mode(&self) -> AlphaMode {
        AlphaMode::Premultiplied
    }

    fn enable_prepass() -> bool {
        false
    }

    fn enable_shadows() -> bool {
        false
    }

    /// Seen by its far faces, and what stands in front found from the depth already drawn (as the fire is).
    fn specialize(
        _pipeline: &MaterialPipeline,
        descriptor: &mut RenderPipelineDescriptor,
        _layout: &MeshVertexBufferLayoutRef,
        _key: MaterialPipelineKey<Self>,
    ) -> Result<(), SpecializedMeshPipelineError> {
        descriptor.primitive.cull_mode = Some(Face::Front);
        if let Some(depth) = descriptor.depth_stencil.as_mut() {
            depth.depth_compare = Some(CompareFunction::Always);
            depth.depth_write_enabled = Some(false);
        }
        Ok(())
    }
}

/// One of a glow's two volumes.
#[derive(Component)]
pub struct Part {
    material: Handle<GlowMaterial>,
    wake: bool,
}

/// Give each new glow its layer and its wake.
pub fn kindle(
    mut commands: Commands,
    new: Query<Entity, Added<Glow>>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<GlowMaterial>>,
    mut ball: Local<Option<Handle<Mesh>>>,
) {
    for glow in &new {
        let ball = ball
            .get_or_insert_with(|| {
                meshes.add(Sphere::new(1.0).mesh().ico(3).unwrap_or_else(|_| Sphere::new(1.0).into()))
            })
            .clone();
        for wake in [false, true] {
            let material = materials.add(GlowMaterial { gas: Gas::default() });
            commands.spawn((
                Part { material: material.clone(), wake },
                Mesh3d(ball.clone()),
                MeshMaterial3d(material),
                NotShadowCaster,
                NoFrustumCulling,
                Visibility::Hidden,
                ChildOf(glow),
            ));
        }
    }
}

/// How far ahead of the shield's middle the shock stands, m (Billig, 1967).
#[must_use]
pub fn standoff(nose: f32, mach: f32) -> f32 {
    0.143 * nose * (3.24 / mach.max(1.2).powi(2)).exp()
}

/// A volume's figures and its place: its middle along the axis and its half-widths.
fn figures(glow: &Glow, wake: bool, clock: f32) -> (Gas, f32, Vec3) {
    let ahead = standoff(glow.nose, glow.mach);
    let kelvin = if wake { glow.gas * WAKE_COOLER } else { glow.gas };
    let (colour, luminance) = blackbody(kelvin);
    // (through its middle the layer is `ahead` thick and as bright as its emissivity makes it)
    let per_metre = glow.emissivity * luminance / ahead.max(0.01);
    if wake {
        let halves = Vec3::new(WAKE_WIDE * glow.rim, WAKE_LONG * glow.rim, WAKE_WIDE * glow.rim);
        let light = (colour * per_metre * WAKE_SHARE).extend(1.0);
        let flow = Vec4::new(clock, 0.35 * halves.y, FLICKER, 0.0);
        return (Gas { light, halves: halves.extend(halves.y), flow }, halves.y, halves);
    }
    let across = glow.rim + WRAPS * ahead;
    let halves = Vec3::new(across, glow.depth + ahead, across);
    let gas = Gas {
        light: (colour * per_metre).extend(0.0),
        halves: halves.extend(WRAPS * ahead),
        flow: Vec4::ZERO,
    };
    (gas, 0.0, halves)
}

/// Each frame: every glow's layer and wake sized and lit as the air has them.
pub fn burn(
    air: Option<Res<Air>>,
    glows: Query<&Glow>,
    mut parts: Query<(&Part, &ChildOf, &mut Transform, &mut Visibility)>,
    mut materials: ResMut<Assets<GlowMaterial>>,
) {
    let clock = air.map_or(0.0, |air| air.clock);
    for (part, of, mut transform, mut visibility) in &mut parts {
        let Ok(glow) = glows.get(of.parent()) else { continue };
        let lit = glow.emissivity * blackbody(glow.gas).1 > LEAST;
        let shown = if lit { Visibility::Inherited } else { Visibility::Hidden };
        if *visibility != shown {
            *visibility = shown;
        }
        if !lit {
            continue;
        }
        let (gas, middle, halves) = figures(glow, part.wake, clock);
        transform.translation = Vec3::Y * middle;
        transform.scale = halves;
        if let Some(mut material) = materials.get_mut(&part.material) {
            material.gas = gas;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_shock_stands_closer_the_faster_it_meets_the_air() {
        // (Mercury's shield, 80 in in radius: some 30 cm off at Mach 6, a little nearer at Mach 20)
        let (six, twenty) = (standoff(2.03, 6.0), standoff(2.03, 20.0));
        assert!((0.28..0.36).contains(&six) && twenty < six && twenty > 0.28, "{six} {twenty}");
    }

    #[test]
    fn the_layer_holds_the_shield_and_the_wake_trails_behind_it() {
        let glow = Glow { rim: 0.946, depth: 0.235, nose: 2.03, mach: 6.0, gas: 2100.0, emissivity: 1.0e-3 };
        let (layer, middle, halves) = figures(&glow, false, 0.0);
        assert!(middle == 0.0 && halves.x > glow.rim && halves.y > glow.depth && layer.light.w == 0.0);
        let (wake, behind, _) = figures(&glow, true, 0.0);
        assert!(behind > 2.0 && wake.light.x < layer.light.x && wake.light.w == 1.0);
    }
}
