//! The Moon as a body: a ball at its true place, size and phase, its face the LRO's map, lit by the Sun where it is
//! and by the Earth on its night side (`shaders/moon.wesl`). Its light on the ground is [`super::dusk`]'s.

use bevy::asset::RenderAssetUsages;
use bevy::image::{CompressedImageFormats, ImageSampler, ImageType};
use bevy::light::light_consts::lux;
use bevy::light::{NotShadowCaster, NotShadowReceiver};
use bevy::prelude::*;
use bevy::render::render_resource::{AsBindGroup, ShaderType};
use bevy::shader::ShaderRef;
use sr_world::daylight;

use super::{Dusk, Heavens, MOON_AT};
use crate::sky::Sky;

/// The Moon's colour, the web build's (`public/front/moon.colour.jpg`, `tools/front-moon.mjs`, from the LROC WAC
/// mosaic): selenographic longitude -180 at the left to 180, north at the top.
const FACE: &[u8] = include_bytes!("../../../../../public/front/moon.colour.jpg");

/// The full Earth's light on the Moon, lux: the full Earth seen from the Moon is some 45 times the full Moon seen
/// from the Earth (magnitude -16.7 against -12.7; the Earth's larger disc and higher albedo). Estimated from that.
const EARTH_FULL: f64 = 45.0 * daylight::FULL_MOON;
/// The most the Moon's lit face is drawn at on the screen, before the tone curve (see `moon.wesl`). Estimated.
const SHOWN: f32 = 1.6;
/// The ecliptic's obliquity at J2000, radians: the Moon's pole is taken as the ecliptic's (1.5 degrees from it).
const OBLIQUITY: f32 = 0.409_093;

#[derive(ShaderType, Debug, Clone, Copy, Default)]
struct MoonLight {
    axis_x: Vec4,
    axis_y: Vec4,
    axis_z: Vec4,
    sun: Vec4,
    glow: Vec4,
}

#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
struct MoonMaterial {
    #[uniform(0)]
    light: MoonLight,
    #[texture(1)]
    #[sampler(2)]
    face: Handle<Image>,
}

impl Material for MoonMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/moon.wesl".into()
    }

    fn enable_shadows() -> bool {
        false
    }
}

#[derive(Component)]
struct Moon(Handle<MoonMaterial>);

pub(super) fn build(app: &mut App) {
    app.add_plugins(MaterialPlugin::<MoonMaterial>::default()).add_systems(Update, (make, place).chain());
}

fn make(
    mut commands: Commands,
    heavens: Option<Res<Heavens>>,
    made: Query<(), With<Moon>>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut images: ResMut<Assets<Image>>,
    mut materials: ResMut<Assets<MoonMaterial>>,
) {
    if heavens.is_none() || !made.is_empty() {
        return;
    }
    let image = Image::from_buffer(
        FACE,
        ImageType::Extension("jpg"),
        CompressedImageFormats::NONE,
        true,
        ImageSampler::linear(),
        RenderAssetUsages::RENDER_WORLD,
    );
    let Ok(image) = image else {
        warn!("night: the Moon's map would not open");
        return;
    };
    let material = materials.add(MoonMaterial { light: MoonLight::default(), face: images.add(image) });
    commands.spawn((
        Moon(material.clone()),
        Mesh3d(meshes.add(Sphere::new(1.0).mesh().uv(96, 48))),
        MeshMaterial3d(material),
        Transform::default(),
        NotShadowCaster,
        NotShadowReceiver,
    ));
}

/// Where the Moon is drawn: in its direction lifted by the air, at [`MOON_AT`], as large as it looks.
fn place(
    heavens: Option<Res<Heavens>>,
    sky: Res<Sky>,
    dusk: Res<Dusk>,
    mut moons: Query<(&Moon, &mut Transform)>,
    mut materials: ResMut<Assets<MoonMaterial>>,
) {
    let Some(heavens) = heavens else { return };
    // (the air's lift, toward the site's up: the Moon is far enough that the eye's own up differs by nothing seen)
    let geometric = heavens.moon.y.clamp(-1.0, 1.0).asin();
    let lift = (dusk.moon.to_radians() - geometric).max(0.0);
    let across = (Vec3::Y - heavens.moon * heavens.moon.y).normalize_or_zero();
    let toward = (heavens.moon * lift.cos() + across * lift.sin()).normalize();
    let pole = heavens.stars * Vec3::new(0.0, -OBLIQUITY.sin(), OBLIQUITY.cos());
    let x = -toward;
    let z = (pole - x * pole.dot(x)).normalize_or_zero();
    let earth =
        (EARTH_FULL * daylight::moon_phase(std::f64::consts::PI - f64::from(heavens.moon_phase))) as f32;
    let light = MoonLight {
        axis_x: x.extend(0.0),
        axis_y: z.cross(x).extend(0.0),
        axis_z: z.extend(0.0),
        sun: sky.sun.extend(lux::RAW_SUNLIGHT),
        glow: Vec4::new(earth, SHOWN, 1.0, 0.0),
    };
    for (Moon(handle), mut transform) in &mut moons {
        transform.translation = toward * MOON_AT;
        transform.scale = Vec3::splat(MOON_AT * heavens.moon_radius.tan());
        if let Some(mut material) = materials.get_mut(handle) {
            material.light = light;
        }
    }
}
