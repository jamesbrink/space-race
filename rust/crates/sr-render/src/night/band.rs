//! The Milky Way and the night sky's own glow, on a ball round the eye behind the stars (`shaders/band.wesl`).

use bevy::asset::RenderAssetUsages;
use bevy::camera::visibility::NoFrustumCulling;
use bevy::image::{CompressedImageFormats, ImageSampler, ImageType};
use bevy::light::{NotShadowCaster, NotShadowReceiver};
use bevy::mesh::MeshVertexBufferLayoutRef;
use bevy::pbr::{MaterialPipeline, MaterialPipelineKey};
use bevy::prelude::*;
use bevy::render::render_resource::{AsBindGroup, RenderPipelineDescriptor, SpecializedMeshPipelineError};
use bevy::shader::ShaderRef;

use super::stars::{StarSky, add_light};
use super::{BAND_AT, Dusk, Heavens};
use crate::origin::Origin;
use crate::sky::Sky;

/// NASA's map of the Milky Way, as the web build has it (`public/sky/milkyway.jpg`, `tools/stars.mjs`): equatorial,
/// right ascension 0 in the middle.
const MAP: &[u8] = include_bytes!("../../../../../public/sky/milkyway.jpg");

#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
struct BandMaterial {
    #[uniform(0)]
    sky: StarSky,
    #[texture(1)]
    #[sampler(2)]
    map: Handle<Image>,
}

impl Material for BandMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/band.wesl".into()
    }

    fn enable_prepass() -> bool {
        false
    }

    fn enable_shadows() -> bool {
        false
    }

    fn specialize(
        _pipeline: &MaterialPipeline,
        descriptor: &mut RenderPipelineDescriptor,
        _layout: &MeshVertexBufferLayoutRef,
        _key: MaterialPipelineKey<Self>,
    ) -> Result<(), SpecializedMeshPipelineError> {
        add_light(descriptor);
        Ok(())
    }
}

#[derive(Component)]
struct Band(Handle<BandMaterial>);

pub(super) fn build(app: &mut App) {
    app.add_plugins(MaterialPlugin::<BandMaterial>::default()).add_systems(Update, (make, turn).chain());
}

fn make(
    mut commands: Commands,
    heavens: Option<Res<Heavens>>,
    made: Query<(), With<Band>>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut images: ResMut<Assets<Image>>,
    mut materials: ResMut<Assets<BandMaterial>>,
) {
    if heavens.is_none() || !made.is_empty() {
        return;
    }
    let image = Image::from_buffer(
        MAP,
        ImageType::Extension("jpg"),
        CompressedImageFormats::NONE,
        true,
        ImageSampler::linear(),
        RenderAssetUsages::RENDER_WORLD,
    );
    let Ok(image) = image else {
        warn!("night: the Milky Way's map would not open");
        return;
    };
    let material = materials.add(BandMaterial { sky: StarSky::default(), map: images.add(image) });
    commands.spawn((
        Band(material.clone()),
        Mesh3d(meshes.add(Sphere::new(1.0).mesh().uv(64, 32))),
        MeshMaterial3d(material),
        Transform::from_scale(Vec3::splat(BAND_AT)),
        NoFrustumCulling,
        NotShadowCaster,
        NotShadowReceiver,
    ));
}

fn turn(
    heavens: Option<Res<Heavens>>,
    sky: Res<Sky>,
    origin: Res<Origin>,
    dusk: Res<Dusk>,
    band: Query<&Band>,
    mut materials: ResMut<Assets<BandMaterial>>,
) {
    let Some(heavens) = heavens else { return };
    for Band(handle) in &band {
        if let Some(mut material) = materials.get_mut(handle) {
            material.sky = StarSky::of(&heavens, &sky, &origin, &dusk, BAND_AT);
        }
    }
}
