//! The Earth laid under the site, given its colour when the maps arrive, and lit each frame by the day's Sun
//! and cloud.

use bevy::camera::visibility::NoFrustumCulling;
use bevy::image::ImageLoaderSettings;
use bevy::light::NotShadowCaster;
use bevy::math::DVec3;
use bevy::prelude::*;

use super::material::{EarthFrame, EarthMaterial, EarthSurface};
use super::{Ground, cube, mesh};
use crate::air::Air;
use crate::origin::WorldPos;
use crate::sky::Sky;

#[derive(Resource)]
pub struct Faces {
    sides: [Handle<Image>; 6],
    material: Handle<EarthMaterial>,
    assembled: bool,
}

fn frame(ground: &Ground, sky: &Sky) -> EarthFrame {
    let [x, y, z] = ground.earth_fixed.map(|v| v.extend(0.0));
    let shore = ground.shore.as_ref().map_or(Vec4::ZERO, |s| {
        let half = s.half_width * sky.radius as f32;
        Vec4::new(half, 2.0 * half / s.texels, s.spread, 1.0)
    });
    EarthFrame { x, y, z, east: ground.east.extend(0.0), north: ground.north.extend(0.0), shore, ..default() }
}

pub fn lay(
    mut commands: Commands,
    ground: Res<Ground>,
    sky: Res<Sky>,
    assets: Res<AssetServer>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut images: ResMut<Assets<Image>>,
    mut materials: ResMut<Assets<EarthMaterial>>,
) {
    let linear = |settings: &mut ImageLoaderSettings| settings.is_srgb = false;
    let shore = ground.shore.as_ref().map_or_else(
        || images.add(Image::default()),
        |shore| assets.load_builder().with_settings(linear).load(format!("globe://{}", shore.file)),
    );
    let material = materials.add(EarthMaterial {
        base: StandardMaterial { perceptual_roughness: 0.95, ..default() },
        extension: EarthSurface {
            frame: frame(&ground, &sky),
            // (the sea's colour, until the faces are read)
            colour: images.add(cube::plain([10, 40, 80, 255])),
            shore,
        },
    });
    commands.insert_resource(Faces {
        sides: cube::FACES.map(|face| assets.load(format!("globe://colour.{face}.jpg"))),
        material: material.clone(),
        assembled: false,
    });
    let surface = mesh::surface(sky.radius, ground.grade, ground.east.as_dvec3(), ground.north.as_dvec3());
    commands.spawn((
        Mesh3d(meshes.add(surface)),
        MeshMaterial3d(material),
        WorldPos(DVec3::ZERO),
        NotShadowCaster,
        NoFrustumCulling,
    ));
}

/// Once the six faces are read, the Earth takes its colour from them and they are let go.
pub fn colour(
    mut faces: ResMut<Faces>,
    mut images: ResMut<Assets<Image>>,
    mut materials: ResMut<Assets<EarthMaterial>>,
) {
    if faces.assembled {
        return;
    }
    let Some(whole) = cube::assemble(&faces.sides, &images) else { return };
    let whole = images.add(whole);
    if let Some(mut material) = materials.get_mut(&faces.material) {
        material.extension.colour = whole;
    }
    faces.sides = std::array::from_fn(|_| Handle::default());
    faces.assembled = true;
}

/// The Sun and the day's cloud, for the ground's own light: the cloud's shadows move over it.
pub fn light(
    faces: Res<Faces>,
    sky: Res<Sky>,
    air: Option<Res<Air>>,
    mut materials: ResMut<Assets<EarthMaterial>>,
) {
    let Some(mut material) = materials.get_mut(&faces.material) else { return };
    let frame = &mut material.extension.frame;
    let clock = air.as_ref().map_or(0.0, |air| air.clock);
    frame.sun = sky.sun.extend(clock);
    if let Some(air) = air {
        let c = air.cumulus;
        frame.cloud = Vec4::new(c.cover, c.size, c.base + 0.5 * c.depth, f32::from(c.cover > 0.0));
        frame.wind = c.drift.extend(0.0).extend(0.0);
    }
}
