//! The attitude ball set up: the ball and its marks in a layer of their own, the small camera that draws them
//! to a picture, and the picture on the page.

use bevy::camera::visibility::RenderLayers;
use bevy::camera::{ClearColorConfig, RenderTarget, ScalingMode};
use bevy::core_pipeline::tonemapping::Tonemapping;
use bevy::prelude::*;
use bevy::render::render_resource::TextureFormat;

use super::{Ball, Mark, ball};
use crate::hud::Panels;

/// The ball is drawn by itself, in a layer of its own.
const LAYER: usize = 1;
/// How big the ball is on the page and how far it stands off the foot of the window, points; and its picture's
/// size, texels (twice as fine, for a dense screen).
const SIZE: f32 = 176.0;
const FOOT: f32 = 14.0;
const PICTURE: u32 = 352;

const AHEAD: Color = Color::srgb(0.95, 0.83, 0.35);
const BEHIND: Color = Color::srgb(0.55, 0.48, 0.25);
const FLOWN: Color = Color::srgb(0.45, 0.85, 0.6);
const NOSE: Color = Color::srgb(0.95, 0.55, 0.25);

pub fn lay(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    mut images: ResMut<Assets<Image>>,
) {
    let layer = RenderLayers::layer(LAYER);
    let mut flat = |colour: Color| {
        materials.add(StandardMaterial { base_color: colour, unlit: true, cull_mode: None, ..default() })
    };
    let (ahead, behind, flown, nose) = (flat(AHEAD), flat(BEHIND), flat(FLOWN), flat(NOSE));
    let painted = materials.add(StandardMaterial {
        base_color_texture: Some(images.add(ball::painting())),
        unlit: true,
        cull_mode: None,
        ..default()
    });
    // (mirrored: see the head of this file)
    commands
        .spawn((Transform::from_scale(Vec3::new(-1.0, 1.0, 1.0)), Visibility::default(), layer.clone()))
        .with_child((Ball, Mesh3d(meshes.add(ball::sphere())), MeshMaterial3d(painted), layer.clone()));
    let ring = meshes.add(Annulus::new(0.075, 0.115));
    let diamond = meshes.add(RegularPolygon::new(0.1, 4));
    for (mark, mesh, colour) in
        [(Mark::Ahead, &ring, ahead), (Mark::Behind, &ring, behind), (Mark::Flown, &diamond, flown)]
    {
        commands.spawn((
            mark,
            Mesh3d(mesh.clone()),
            MeshMaterial3d(colour),
            layer.clone(),
            Visibility::Hidden,
        ));
    }
    // The nose's own mark, fixed in the middle in front of everything: a ring with a wing each side.
    let wing = meshes.add(Rectangle::new(0.2, 0.035));
    let middle = meshes.add(Annulus::new(0.03, 0.055));
    for (mesh, across) in [(middle, 0.0), (wing.clone(), -0.19), (wing, 0.19)] {
        let placed = Transform::from_xyz(across, 0.0, 1.2);
        commands.spawn((Mesh3d(mesh), MeshMaterial3d(nose.clone()), placed, layer.clone()));
    }
    show(&mut commands, &mut images, layer);
}

/// The ball's own camera, the picture it draws to, and the picture on the page: in the middle at the foot, and
/// away with the panels.
fn show(commands: &mut Commands, images: &mut Assets<Image>, layer: RenderLayers) {
    let picture = images.add(Image::new_target_texture(
        PICTURE,
        PICTURE,
        TextureFormat::Rgba8Unorm,
        Some(TextureFormat::Rgba8UnormSrgb),
    ));
    commands.spawn((
        Camera3d::default(),
        Camera { order: -1, clear_color: ClearColorConfig::Custom(Color::NONE), ..default() },
        RenderTarget::Image(picture.clone().into()),
        Projection::Orthographic(OrthographicProjection {
            scaling_mode: ScalingMode::FixedVertical { viewport_height: 2.12 },
            ..OrthographicProjection::default_3d()
        }),
        Tonemapping::None,
        Transform::from_xyz(0.0, 0.0, 6.0).looking_at(Vec3::ZERO, Vec3::Y),
        layer,
    ));
    let row = Node {
        position_type: PositionType::Absolute,
        bottom: px(FOOT),
        width: percent(100),
        justify_content: JustifyContent::Center,
        ..default()
    };
    commands
        .spawn((Panels, row, GlobalZIndex(1)))
        .with_child((ImageNode::new(picture), Node { width: px(SIZE), height: px(SIZE), ..default() }));
}
