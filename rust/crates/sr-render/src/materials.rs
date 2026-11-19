//! The models' surfaces. The GLBs carry flat colours named in Blender (`shingle-rene41`, `paint-booster-white`);
//! the finish is given here by name, as the web build's viewer does (`WORN` in `src/viewer/stage.ts`), and taken
//! further: paint gets its lacquer, metal its streaks, glass is glass.

use bevy::asset::RenderAssetUsages;
use bevy::gltf::GltfMaterialName;
use bevy::image::{ImageAddressMode, ImageSampler, ImageSamplerDescriptor};
use bevy::math::Affine2;
use bevy::platform::collections::HashSet;
use bevy::prelude::*;
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};
use bevy::world_serialization::WorldInstanceReady;

use crate::noise;

/// Materials that weather: their roughness is streaked (the web build's `WORN`).
const WORN: [&str; 14] = [
    "shingle",
    "heatsink",
    "aluminium",
    "titanium",
    "tower",
    "steel",
    "strap",
    "paint-booster",
    "paint-structure",
    "paint-cabin",
    "couch",
    "concrete",
    "suit",
    "galvanised",
];
/// How many times the wear repeats across a model's texture square (the web build's 1.7).
const WEAR_REPEAT: f32 = 1.7;
/// The wear's mean is 190/255, so a roughness raised by this much keeps its mean and gains streaks.
const WEAR_GAIN: f32 = 1.3;
const WEAR_SIZE: u32 = 512;

/// The streaked roughness every worn surface shares.
#[derive(Resource)]
struct Wear(Handle<Image>);

/// Gives each model's materials their finish as the model arrives.
pub struct MaterialsPlugin;

impl Plugin for MaterialsPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(PreStartup, make_wear).add_observer(finish_model);
    }
}

fn make_wear(mut commands: Commands, mut images: ResMut<Assets<Image>>) {
    let mut data = Vec::with_capacity((WEAR_SIZE * WEAR_SIZE * 4) as usize);
    for y in 0..WEAR_SIZE {
        for x in 0..WEAR_SIZE {
            let (u, v) = (x as f32 / WEAR_SIZE as f32, y as f32 / WEAR_SIZE as f32);
            // Streaks run down the surface: fine across, long along. Blotches under them.
            let streak = noise::fbm([u * 8.0, v * 0.5, 0.0], 8, 3, 11);
            let blotch = noise::fbm([u, v, 0.5], 4, 4, 23);
            let rough = (0.745 + (streak - 0.5) * 0.34 + (blotch - 0.5) * 0.22).clamp(0.0, 1.0);
            // glTF's packing: green is roughness, blue is metalness (left whole).
            data.extend_from_slice(&[255, (rough * 255.0) as u8, 255, 255]);
        }
    }
    let size = Extent3d { width: WEAR_SIZE, height: WEAR_SIZE, depth_or_array_layers: 1 };
    let mut image = Image::new(
        size,
        TextureDimension::D2,
        data,
        TextureFormat::Rgba8Unorm,
        RenderAssetUsages::RENDER_WORLD,
    );
    image.sampler = ImageSampler::Descriptor(ImageSamplerDescriptor {
        address_mode_u: ImageAddressMode::Repeat,
        address_mode_v: ImageAddressMode::Repeat,
        ..ImageSamplerDescriptor::linear()
    });
    commands.insert_resource(Wear(images.add(image)));
}

fn finish_model(
    ready: On<WorldInstanceReady>,
    children: Query<&Children>,
    named: Query<(&MeshMaterial3d<StandardMaterial>, &GltfMaterialName)>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    wear: Res<Wear>,
    mut done: Local<HashSet<AssetId<StandardMaterial>>>,
) {
    for part in children.iter_descendants(ready.entity) {
        let Ok((handle, name)) = named.get(part) else { continue };
        if !done.insert(handle.id()) {
            continue;
        }
        if let Some(mut material) = materials.get_mut(handle.id()) {
            finish(&mut material, &name.0, &wear.0);
        }
    }
}

/// One material's finish, by its name.
fn finish(material: &mut StandardMaterial, name: &str, wear: &Handle<Image>) {
    if name.starts_with("glass") {
        return glaze(material, name);
    }
    if WORN.iter().any(|worn| name.starts_with(worn)) && material.base_color_texture.is_none() {
        material.metallic_roughness_texture = Some(wear.clone());
        material.uv_transform = Affine2::from_scale(Vec2::splat(WEAR_REPEAT));
        material.perceptual_roughness = (material.perceptual_roughness * WEAR_GAIN).min(1.0);
    }
    if name.starts_with("paint") {
        // Enamel over primer: a smooth coat on a rougher body.
        material.clearcoat = 0.55;
        material.clearcoat_perceptual_roughness = 0.28;
    }
    if name.starts_with("concrete") || name.starts_with("suit") {
        material.reflectance = 0.35;
    }
}

/// Glass: the web build's three (`src/viewer/stage.ts`, 57-72).
fn glaze(material: &mut StandardMaterial, name: &str) {
    let opacity = match name {
        "glass-visor" => 0.5,
        "glass-lens" => 0.34,
        _ => 0.16,
    };
    material.base_color = Color::srgba(0.047, 0.078, 0.094, opacity);
    material.perceptual_roughness = 0.03;
    material.metallic = 0.0;
    material.reflectance = 0.6;
    material.alpha_mode = AlphaMode::Blend;
    material.double_sided = true;
    material.cull_mode = None;
}
