//! The Earth's maps, fetched where the web build keeps them (`public/globe/`) and handed to the Earth's material
//! as each arrives: the whole Earth's colour, relief and shores as cube maps, and the site's region drawn finer
//! (its wider shore map, its relief and colour, and the open sea told from its lagoons). Until a map is there the
//! shader is told it is not, and draws without it.

use bevy::image::ImageLoaderSettings;
use bevy::prelude::*;

use super::chart::{self, Chart, Surface};
use super::coast::{self, Coast};
use super::grove::Sorted;
use super::json::JsonFile;
use super::material::{BANKS, EarthFrame, EarthMaterial, Plane};
use super::{Ground, cube};
use crate::sky::Sky;

/// A map of the whole Earth.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Whole {
    Colour,
    Relief,
    Land,
}

/// A map of the region, on its plane.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Flat {
    Wide,
    Relief,
    Colour,
}

/// What has been asked for and has not yet arrived.
#[derive(Resource)]
pub struct Maps {
    /// The Earth's material.
    pub material: Handle<EarthMaterial>,
    cubes: Vec<(Whole, [Handle<Image>; 6])>,
    flats: Vec<(Flat, Handle<Image>, Chart, f32)>,
    region: Option<Handle<JsonFile>>,
    surface: Option<Handle<JsonFile>>,
    shore: Option<Handle<Image>>,
}

/// One channel, as it is kept: a byte a texel, not a colour.
fn one_channel(settings: &mut ImageLoaderSettings) {
    settings.is_srgb = false;
    settings.expand_grayscale = false;
}

/// The region's shore map, asked for.
pub fn shore(ground: &Ground, assets: &AssetServer) -> Option<Handle<Image>> {
    let shore = ground.shore.as_ref()?;
    Some(assets.load_builder().with_settings(one_channel).load(format!("globe://{}", shore.file)))
}

impl Maps {
    /// Asks for every map there is for this ground.
    pub fn fetch(
        ground: &Ground,
        assets: &AssetServer,
        material: Handle<EarthMaterial>,
        shore: Option<Handle<Image>>,
    ) -> Self {
        let faces = |name: &str, kind: &str| {
            cube::FACES.map(|face| {
                assets.load_builder().with_settings(one_channel).load(format!("globe://{name}.{face}.{kind}"))
            })
        };
        let colour = cube::FACES.map(|face| assets.load(format!("globe://colour.{face}.jpg")));
        // (the region's maps are named for it: `<region>.near.png`, `<region>.json`, `<region>.surface.json`)
        let region = ground.shore.as_ref().and_then(|s| s.file.strip_suffix(".near.png"));
        Self {
            material,
            cubes: vec![
                (Whole::Colour, colour),
                (Whole::Relief, faces("relief", "png")),
                (Whole::Land, faces("land", "png")),
            ],
            flats: Vec::new(),
            region: region.map(|name| assets.load(format!("globe://{name}.json"))),
            surface: region.map(|name| assets.load(format!("globe://{name}.surface.json"))),
            shore,
        }
    }
}

fn plane(chart: &Chart, spread: f32) -> Plane {
    let [east, north, middle, bounds] = chart.uniforms();
    Plane {
        east,
        north,
        middle,
        bounds,
        scale: Vec4::new(chart.metres as f32, chart.fade as f32, spread, 1.0),
    }
}

/// Reads the region's descriptions as they arrive, and asks for the maps they name.
pub fn describe(
    mut maps: ResMut<Maps>,
    sky: Res<Sky>,
    jsons: Res<Assets<JsonFile>>,
    assets: Res<AssetServer>,
    mut materials: ResMut<Assets<EarthMaterial>>,
) {
    if let Some(JsonFile(json)) = maps.region.as_ref().and_then(|handle| jsons.get(handle)) {
        if let Some((chart, spread)) = chart::wide(json) {
            let image =
                assets.load_builder().with_settings(one_channel).load(format!("globe://{}", chart.file));
            maps.flats.push((Flat::Wide, image, chart, spread));
        }
        maps.region = None;
    }
    if let Some(JsonFile(json)) = maps.surface.as_ref().and_then(|handle| jsons.get(handle)) {
        if let Some(surface) = Surface::read(json) {
            let relief = assets
                .load_builder()
                .with_settings(one_channel)
                .load(format!("globe://{}", surface.relief.file));
            let colour = assets.load(format!("globe://{}", surface.colour.file));
            if let Some(mut material) = materials.get_mut(&maps.material) {
                let mut banks = [Vec4::new(0.0, 0.0, 0.0, 2.0); BANKS];
                for (slot, bank) in banks.iter_mut().zip(surface.banks(sky.radius)) {
                    *slot = bank;
                }
                material.extension.frame.banks = banks;
            }
            maps.flats.push((Flat::Relief, relief, surface.relief, 0.0));
            maps.flats.push((Flat::Colour, colour, surface.colour, 0.0));
        }
        maps.surface = None;
    }
}

/// Hands each map to the material once it has been read.
pub fn arrive(
    mut commands: Commands,
    mut maps: ResMut<Maps>,
    ground: Res<Ground>,
    sky: Res<Sky>,
    mut images: ResMut<Assets<Image>>,
    mut materials: ResMut<Assets<EarthMaterial>>,
) {
    if maps.cubes.is_empty() && maps.flats.is_empty() && maps.shore.is_none() {
        return;
    }
    let wholes: Vec<(Whole, Image)> = maps
        .cubes
        .iter()
        .filter_map(|(what, faces)| Some((*what, cube::assemble(faces, &images)?)))
        .collect();
    let flats: Vec<(Flat, Handle<Image>, Plane)> = maps
        .flats
        .iter()
        .filter(|(_, image, ..)| images.contains(image))
        .map(|(what, image, chart, spread)| (*what, image.clone(), plane(chart, *spread)))
        .collect();
    let sorted =
        maps.shore.as_ref().and_then(|handle| images.get(handle)).and_then(|map| sort(map, &ground, &sky));
    if wholes.is_empty() && flats.is_empty() && sorted.is_none() {
        return;
    }
    let Some(mut material) = materials.get_mut(&maps.material) else { return };
    let surface = &mut material.extension;
    for (what, image) in wholes {
        let image = images.add(image);
        match what {
            Whole::Colour => surface.colour = image,
            Whole::Relief => (surface.relief, surface.frame.eye.y) = (image, 1.0),
            Whole::Land => (surface.land, surface.frame.eye.z) = (image, 1.0),
        }
        maps.cubes.retain(|(other, _)| *other != what);
    }
    for (what, image, plane) in flats {
        place(&mut surface.frame, what, plane);
        match what {
            Flat::Wide => surface.wide = image,
            Flat::Relief => surface.region_relief = image,
            Flat::Colour => surface.region_colour = image,
        }
        maps.flats.retain(|(other, ..)| *other != what);
    }
    if let Some(sorted) = sorted {
        (surface.coast, surface.frame.eye.w) = (images.add(sorted.image()), 1.0);
        commands.insert_resource(Sorted(sorted));
        maps.shore = None;
    }
}

/// A regional map's plane, in its place in the frame. The relief and the colour lie on one plane: its fourth scale
/// says the relief has arrived, its third the colour.
fn place(frame: &mut EarthFrame, what: Flat, plane: Plane) {
    match what {
        Flat::Wide => frame.wide = plane,
        Flat::Relief => {
            let colour = frame.region.scale.z;
            frame.region = plane;
            frame.region.scale.z = colour;
        }
        Flat::Colour => {
            let relief = frame.region.scale.w;
            frame.region = plane;
            (frame.region.scale.z, frame.region.scale.w) = (1.0, relief);
        }
    }
}

/// The open sea told from enclosed water (`earth/coast.rs`), from the shore map once it has been read.
fn sort(map: &Image, ground: &Ground, sky: &Sky) -> Option<Coast> {
    let shore = ground.shore.as_ref()?;
    let size = map.width() as usize;
    let data = map.data.as_ref()?;
    let channels = data.len() / (size * size).max(1);
    if map.height() as usize != size || size < 16 || channels == 0 {
        return None;
    }
    let field: Vec<u8> = data.iter().step_by(channels).copied().collect();
    let metres = 2.0 * shore.half_width * sky.radius as f32 / shore.texels;
    Some(coast::sort(&field, size, shore.spread, metres))
}
