//! The day's clouds, as volumes: marched through from the eye, lit by the Sun through themselves and by the sky,
//! standing in the air where the record puts them, drifting on its wind and working as they go
//! (`crate::air::Air`). The haze under them is marched with them, so a cloud's shadow is seen in the air.
//!
//! The web build marches a cut-down field at half resolution in WebGL. Here the whole of it is marched, with a
//! second march toward the Sun at every step, for one pixel in four ([`pass`]) and laid on at full size
//! ([`material`]). `docs/look.md` says what each part of the technique is for.

pub mod field;
mod frame;
mod material;
mod pass;
mod ripple;
mod volume;

use bevy::asset::RenderAssetUsages;
use bevy::camera::visibility::NoFrustumCulling;
use bevy::image::ImageLoaderSettings;
use bevy::light::NotShadowCaster;
use bevy::prelude::*;
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};

use crate::air::DayMap;
use crate::origin::{Eye, Place};
pub use frame::{skylight, sunlight};
use material::CloudLay;
use pass::{CloudSky, CloudView};

/// What the day's maps of the weather are across, m (`EXTENT` in `src/viewer/weather.ts`).
const MAP_ACROSS: f32 = 4_096_000.0;

#[derive(Resource)]
struct Sheet(Handle<CloudLay>);

/// What stands for the day's map when there is none.
#[derive(Resource)]
struct Blank(Handle<Image>);

/// The clouds. Nothing is drawn until the game puts an [`crate::air::Air`] in the world.
pub struct CloudsPlugin;

impl Plugin for CloudsPlugin {
    fn build(&self, app: &mut App) {
        app.add_plugins((MaterialPlugin::<CloudLay>::default(), pass::CloudPassPlugin))
            .add_systems(Startup, make)
            .add_systems(Update, (hang, frame::fit))
            .add_systems(PostUpdate, frame::look.after(Place));
    }
}

/// The day's weather round the site as a map, asked for by its file's name in `public/globe`
/// (`<region>.<date>.weather.png`): what the game puts in the world for the clouds far from the site to follow.
#[must_use]
pub fn day_map(assets: &AssetServer, file: &str) -> DayMap {
    // (numbers, not colours: red is a fraction of the sky)
    let as_numbers = |settings: &mut ImageLoaderSettings| settings.is_srgb = false;
    DayMap {
        image: assets.load_builder().with_settings(as_numbers).load(format!("globe://{file}")),
        extent: MAP_ACROSS,
    }
}

fn make(mut commands: Commands, mut images: ResMut<Assets<Image>>, mut materials: ResMut<Assets<CloudLay>>) {
    let mut target = || images.add(Image::new_target_texture(8, 8, pass::TARGET, None));
    let targets = [target(), target(), target()];
    let blank = images.add(Image::new_fill(
        Extent3d { width: 1, height: 1, depth_or_array_layers: 1 },
        TextureDimension::D2,
        &[0; 4],
        TextureFormat::Rgba8Unorm,
        RenderAssetUsages::RENDER_WORLD,
    ));
    let [cloud, haze, reach] = targets.clone();
    commands.insert_resource(Sheet(materials.add(CloudLay { cloud, haze, reach })));
    commands.insert_resource(CloudSky {
        frame: frame::CloudFrame::default(),
        volume: images.add(volume::block()),
        field: images.add(field::sheet()),
        ripple: images.add(ripple::sheet()),
        day: blank.clone(),
        targets,
    });
    commands.insert_resource(Blank(blank));
}

/// The ball the clouds are laid on goes with the eye, and the eye is the view they are marched for.
fn hang(
    mut commands: Commands,
    new: Query<Entity, Added<Eye>>,
    sheet: Res<Sheet>,
    mut meshes: ResMut<Assets<Mesh>>,
) {
    for eye in &new {
        let ball = meshes.add(Sphere::new(1.0).mesh().ico(2).unwrap_or_else(|_| Sphere::new(1.0).into()));
        commands.entity(eye).insert(CloudView);
        commands.spawn((
            Mesh3d(ball),
            MeshMaterial3d(sheet.0.clone()),
            NotShadowCaster,
            NoFrustumCulling,
            ChildOf(eye),
        ));
    }
}
