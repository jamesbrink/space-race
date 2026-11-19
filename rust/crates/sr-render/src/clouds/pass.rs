//! The clouds' own pass: `shaders/clouds.wesl` marched once for every four pixels of the frame, after the depth
//! prepass and before anything is lit, into three half-size targets (the cloud's light, the haze's, and how far
//! each ray went). [`super::material`] lays them over the frame at full size, keeping to the edges of what is solid.
//!
//! A march costs by the ray, and cloud and haze are soft: a quarter of the rays is a quarter of the cost, and the
//! lattice of a gantry in front of them stays as sharp as it was because the laying-on looks at the depth.

use bevy::core_pipeline::FullscreenShader;
use bevy::core_pipeline::prepass::ViewPrepassTextures;
use bevy::core_pipeline::schedule::{Core3d, Core3dSystems};
use bevy::prelude::*;
use bevy::render::extract_component::{ExtractComponent, ExtractComponentPlugin};
use bevy::render::extract_resource::{ExtractResource, ExtractResourcePlugin};
use bevy::render::globals::{GlobalsBuffer, GlobalsUniform};
use bevy::render::render_asset::RenderAssets;
use bevy::render::render_resource::binding_types::{
    sampler, texture_2d, texture_3d, texture_depth_2d, uniform_buffer,
};
use bevy::render::render_resource::{
    AddressMode, BindGroupEntries, BindGroupLayoutDescriptor, BindGroupLayoutEntries, CachedRenderPipelineId,
    ColorTargetState, ColorWrites, FilterMode, FragmentState, LoadOp, MipmapFilterMode, Operations,
    PipelineCache, RenderPassColorAttachment, RenderPassDescriptor, RenderPipelineDescriptor, Sampler,
    SamplerBindingType, SamplerDescriptor, ShaderStages, StoreOp, TextureFormat, TextureSampleType,
    UniformBuffer,
};
use bevy::render::renderer::{RenderContext, RenderDevice, RenderQueue, ViewQuery};
use bevy::render::texture::GpuImage;
use bevy::render::view::{ViewUniform, ViewUniformOffset, ViewUniforms};
use bevy::render::{Render, RenderApp, RenderStartup, RenderSystems};

use super::frame::CloudFrame;

/// What the targets hold: light in the engine's units, already exposed, and distances.
pub const TARGET: TextureFormat = TextureFormat::Rgba16Float;

/// The view the clouds are marched for.
#[derive(Component, ExtractComponent, Debug, Clone, Copy, Default)]
#[extract_app(RenderApp)]
pub struct CloudView;

/// Everything the pass reads and writes, handed across to the renderer each frame.
#[derive(Resource, ExtractResource, Debug, Clone)]
#[extract_app(RenderApp)]
pub struct CloudSky {
    /// This frame's figures.
    pub frame: CloudFrame,
    /// The noise ([`super::volume`]).
    pub volume: Handle<Image>,
    /// Where the cumulus stand ([`super::field`]).
    pub field: Handle<Image>,
    /// The deck's cloudlets and banks ([`super::ripple`]).
    pub ripple: Handle<Image>,
    /// The day's weather as a map (`crate::air::DayMap`), or a blank one.
    pub day: Handle<Image>,
    /// The three targets: the cloud's light, the haze's, and the distances.
    pub targets: [Handle<Image>; 3],
}

#[derive(Resource)]
struct Pipe {
    layout: BindGroupLayoutDescriptor,
    pipeline: CachedRenderPipelineId,
    repeating: Sampler,
    clamped: Sampler,
    frame: UniformBuffer<CloudFrame>,
}

/// The pass.
pub struct CloudPassPlugin;

impl Plugin for CloudPassPlugin {
    fn build(&self, app: &mut App) {
        app.add_plugins((
            ExtractResourcePlugin::<CloudSky>::default(),
            ExtractComponentPlugin::<CloudView>::default(),
        ));
        let Some(render) = app.get_sub_app_mut(RenderApp) else { return };
        render
            .add_systems(RenderStartup, lay_pipe)
            .add_systems(Render, write.in_set(RenderSystems::PrepareResources))
            .add_systems(Core3d, march.after(Core3dSystems::Prepass).before(Core3dSystems::MainPass));
    }
}

fn smooth(device: &RenderDevice, address: AddressMode) -> Sampler {
    device.create_sampler(&SamplerDescriptor {
        address_mode_u: address,
        address_mode_v: address,
        address_mode_w: address,
        mag_filter: FilterMode::Linear,
        min_filter: FilterMode::Linear,
        mipmap_filter: MipmapFilterMode::Linear,
        ..default()
    })
}

fn lay_pipe(
    mut commands: Commands,
    device: Res<RenderDevice>,
    assets: Res<AssetServer>,
    fullscreen: Res<FullscreenShader>,
    cache: Res<PipelineCache>,
) {
    let flat = || texture_2d(TextureSampleType::Float { filterable: true });
    let layout = BindGroupLayoutDescriptor::new(
        "clouds_march_layout",
        &BindGroupLayoutEntries::sequential(
            ShaderStages::FRAGMENT,
            (
                uniform_buffer::<ViewUniform>(true),
                uniform_buffer::<GlobalsUniform>(false),
                uniform_buffer::<CloudFrame>(false),
                texture_depth_2d(),
                texture_3d(TextureSampleType::Float { filterable: true }),
                flat(),
                flat(),
                flat(),
                sampler(SamplerBindingType::Filtering),
                sampler(SamplerBindingType::Filtering),
            ),
        ),
    );
    let target = Some(ColorTargetState { format: TARGET, blend: None, write_mask: ColorWrites::ALL });
    let pipeline = cache.queue_render_pipeline(RenderPipelineDescriptor {
        label: Some("clouds_march_pipeline".into()),
        layout: vec![layout.clone()],
        vertex: fullscreen.to_vertex_state(),
        fragment: Some(FragmentState {
            shader: assets.load("shaders/clouds.wesl"),
            targets: vec![target.clone(), target.clone(), target],
            ..default()
        }),
        ..default()
    });
    commands.insert_resource(Pipe {
        layout,
        pipeline,
        repeating: smooth(&device, AddressMode::Repeat),
        clamped: smooth(&device, AddressMode::ClampToEdge),
        frame: UniformBuffer::default(),
    });
}

/// This frame's figures, to the graphics card.
fn write(
    sky: Option<Res<CloudSky>>,
    mut pipe: ResMut<Pipe>,
    device: Res<RenderDevice>,
    queue: Res<RenderQueue>,
) {
    if let Some(sky) = sky {
        pipe.frame.set(sky.frame);
        pipe.frame.write_buffer(&device, &queue);
    }
}

/// The march itself: one triangle over the three targets.
fn march(
    view: ViewQuery<(&ViewPrepassTextures, &ViewUniformOffset), With<CloudView>>,
    sky: Option<Res<CloudSky>>,
    pipe: Res<Pipe>,
    cache: Res<PipelineCache>,
    images: Res<RenderAssets<GpuImage>>,
    views: Res<ViewUniforms>,
    globals: Res<GlobalsBuffer>,
    device: Res<RenderDevice>,
    mut ctx: RenderContext,
) {
    let (prepass, offset) = view.into_inner();
    let Some(sky) = sky else { return };
    let (Some(pipeline), Some(depth)) = (cache.get_render_pipeline(pipe.pipeline), prepass.depth_only_view())
    else {
        return;
    };
    let (Some(view_binding), Some(globals_binding), Some(frame_binding)) =
        (views.uniforms.binding(), globals.buffer.binding(), pipe.frame.binding())
    else {
        return;
    };
    let read = [&sky.volume, &sky.field, &sky.ripple, &sky.day].map(|handle| images.get(handle));
    let [Some(volume), Some(field), Some(ripple), Some(day)] = read else { return };
    let [Some(cloud), Some(haze), Some(reach)] = sky.targets.each_ref().map(|handle| images.get(handle))
    else {
        return;
    };
    let group = device.create_bind_group(
        "clouds_march_group",
        &cache.get_bind_group_layout(&pipe.layout),
        &BindGroupEntries::sequential((
            view_binding,
            globals_binding,
            frame_binding,
            depth,
            &volume.texture_view,
            &field.texture_view,
            &ripple.texture_view,
            &day.texture_view,
            &pipe.repeating,
            &pipe.clamped,
        )),
    );
    let mut pass = ctx.command_encoder().begin_render_pass(&RenderPassDescriptor {
        label: Some("clouds_march"),
        color_attachments: &[Some(onto(cloud)), Some(onto(haze)), Some(onto(reach))],
        depth_stencil_attachment: None,
        timestamp_writes: None,
        occlusion_query_set: None,
        multiview_mask: None,
    });
    pass.set_pipeline(pipeline);
    pass.set_bind_group(0, &group, &[offset.offset]);
    pass.draw(0..3, 0..1);
}

/// A target the march writes to, cleared first. (A function, not a closure: what it returns borrows from what it
/// is given.)
fn onto(target: &GpuImage) -> RenderPassColorAttachment<'_> {
    RenderPassColorAttachment {
        view: &target.texture_view,
        depth_slice: None,
        resolve_target: None,
        ops: Operations { load: LoadOp::Clear(default()), store: StoreOp::Store },
    }
}
