//! The Earth laid under the site, and lit each frame by the day's Sun and cloud. Its maps come after it
//! (`earth/maps.rs`); until they do it is the sea's colour.

use bevy::camera::visibility::NoFrustumCulling;
use bevy::light::NotShadowCaster;
use bevy::math::DVec3;
use bevy::prelude::*;

use super::maps::{self, Maps};
use super::marks::Marks;
use super::material::{EarthFrame, EarthMaterial, EarthSurface};
use super::{Ground, cube, grain, mesh};
use crate::air::Air;
use crate::clouds::field;
use crate::origin::{Origin, WorldPos};
use crate::sky::Sky;

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
    marks: Option<Res<Marks>>,
    assets: Res<AssetServer>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut images: ResMut<Assets<Image>>,
    mut materials: ResMut<Assets<EarthMaterial>>,
) {
    let shore = maps::shore(&ground, &assets);
    // (what stands in until a map is read: the shader is told which have been)
    let blank = images.add(Image::default());
    let no_cube = images.add(cube::plain([0, 0, 0, 255]));
    let material = materials.add(EarthMaterial {
        base: StandardMaterial { perceptual_roughness: 0.95, ..default() },
        extension: EarthSurface {
            frame: frame(&ground, &sky),
            // (the sea's colour, until the faces are read)
            colour: images.add(cube::plain([10, 40, 80, 255])),
            shore: shore.clone().unwrap_or_else(|| blank.clone()),
            relief: no_cube.clone(),
            land: no_cube,
            wide: blank.clone(),
            region_relief: blank.clone(),
            region_colour: blank.clone(),
            coast: blank,
            marks: marks.map(|marks| marks.uniform(ground.east, ground.north)).unwrap_or_default(),
            noise: images.add(grain::image()),
            // (the clouds bake the same sheet for their own material, which is theirs to hold: this is a second copy)
            cumulus: images.add(field::sheet()),
        },
    });
    commands.insert_resource(Maps::fetch(&ground, &assets, material.clone(), shore));
    let surface = mesh::surface(sky.radius, ground.grade, ground.east.as_dvec3(), ground.north.as_dvec3());
    commands.spawn((
        Mesh3d(meshes.add(surface)),
        MeshMaterial3d(material),
        WorldPos(DVec3::ZERO),
        NotShadowCaster,
        NoFrustumCulling,
    ));
}

/// The Sun and the day's cloud, for the ground's own light: the cloud's shadows move over it. And how high the
/// eye is, by which the ground knows how much of itself can be seen.
pub fn light(
    maps: Res<Maps>,
    sky: Res<Sky>,
    origin: Res<Origin>,
    air: Option<Res<Air>>,
    mut materials: ResMut<Assets<EarthMaterial>>,
) {
    let Some(mut material) = materials.get_mut(&maps.material) else { return };
    let frame = &mut material.extension.frame;
    let clock = air.as_ref().map_or(0.0, |air| air.clock);
    frame.sun = sky.sun.extend(clock);
    frame.eye.x = ((origin.0 - sky.centre).length() - sky.radius) as f32;
    if let Some(air) = air {
        let c = air.cumulus;
        // (the cloud shader's shadow in the air takes the sunbeam's crossing three tenths of the way up the layer:
        // `clouds.wesl` `in_shadow`)
        frame.cloud = Vec4::new(c.cover, c.size, c.base + 0.3 * c.depth, f32::from(c.cover > 0.0));
        frame.lay = field::lay(c.cover, c.size).extend(c.depth).extend(0.0);
        frame.wind = c.drift.extend(0.0).extend(0.0);
    }
}
