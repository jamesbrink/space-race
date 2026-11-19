//! The day's clouds, as volumes: marched through from the eye, lit by the Sun through themselves and by the sky,
//! standing in the air where the record puts them, drifting on its wind and working as they go
//! (`crate::air::Air`). The haze under them is marched with them, so a cloud's shadow is seen in the air.
//!
//! The web build marches a cut-down field at half resolution in WebGL. Here the whole of it is marched, with a
//! second march toward the Sun at every step, for one pixel in four ([`pass`]) and laid on at full size
//! ([`material`]). `docs/look.md` says what each part of the technique is for.

mod cover;
pub mod field;
mod frame;
mod material;
mod mips;
mod motion;
mod pass;
mod rays;
mod ripple;
mod timing;
mod volume;

use bevy::asset::RenderAssetUsages;
use bevy::image::ImageLoaderSettings;
use bevy::prelude::*;
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};

use crate::air::DayMap;
use crate::origin::Place;
pub use frame::{skylight, sunlight};
use material::{CloudLay, Sheet};
use pass::CloudSky;

/// What the day's maps of the weather are across, m (`EXTENT` in `src/viewer/weather.ts`).
const MAP_ACROSS: f32 = 4_096_000.0;

/// What stands for the day's map when there is none.
#[derive(Resource)]
struct Blank(Handle<Image>);

/// Where the cumulus stand ([`field`]), for the ground's shadows to read through `shaders/clouds_cover.wesl` without
/// baking a second copy: in the world once [`CloudsMade`] has run at startup.
#[derive(Resource, Debug, Clone)]
pub struct CumulusSheet(pub Handle<Image>);

/// The clouds' startup, which makes [`CumulusSheet`].
#[derive(SystemSet, Debug, Clone, PartialEq, Eq, Hash)]
pub struct CloudsMade;

/// The clouds. Nothing is drawn until the game puts an [`crate::air::Air`] in the world.
pub struct CloudsPlugin;

impl Plugin for CloudsPlugin {
    fn build(&self, app: &mut App) {
        app.add_plugins((
            MaterialPlugin::<CloudLay>::default(),
            pass::CloudPassPlugin,
            motion::CloudMotionPlugin,
            rays::CloudRaysPlugin,
            timing::TimingPlugin,
        ))
        .add_systems(Startup, make.in_set(CloudsMade))
        .add_systems(Update, (material::hang, frame::fit))
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
    let targets = [target(), target(), target(), target()];
    let blank = images.add(Image::new_fill(
        Extent3d { width: 1, height: 1, depth_or_array_layers: 1 },
        TextureDimension::D2,
        &[0; 4],
        TextureFormat::Rgba8Unorm,
        RenderAssetUsages::RENDER_WORLD,
    ));
    let [cloud, haze, reach, rays] = targets.clone();
    let baked = field::baked();
    let sheet = images.add(field::texture(&baked));
    commands.insert_resource(CumulusSheet(sheet.clone()));
    commands.insert_resource(Sheet(materials.add(CloudLay { cloud, haze, reach, rays })));
    commands.insert_resource(CloudSky {
        frame: frame::CloudFrame::default(),
        volume: images.add(volume::block()),
        field: sheet.clone(),
        cover: images.add(cover::texture(&baked)),
        ripple: images.add(ripple::sheet()),
        day: blank.clone(),
        targets,
    });
    commands.insert_resource(Blank(blank));
}
