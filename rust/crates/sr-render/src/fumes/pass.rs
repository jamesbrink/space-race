//! The fumes' own pass: `shaders/fumes_march.wesl` marched once for every four pixels of the frame, after the depth
//! prepass and before anything is lit, into two half-size targets (the fumes' light, and how far each ray went
//! and where its fumes began). [`super::lay`] lays them over the frame at full size, keeping to the edges of what
//! is solid. (The clouds' pass is the pattern: `clouds/pass.rs`.)
//!
//! A march costs by the ray, and fumes are soft: a quarter of the rays is a quarter of the cost. What is lost is
//! the solid things' shadows in the fumes (the gantry's on a billow): the march has no shadow maps to read.

use bevy::core_pipeline::FullscreenShader;
use bevy::core_pipeline::prepass::ViewPrepassTextures;
use bevy::core_pipeline::schedule::{Core3d, Core3dSystems};
use bevy::prelude::*;
use bevy::render::extract_component::{ExtractComponent, ExtractComponentPlugin};
use bevy::render::extract_resource::{ExtractResource, ExtractResourcePlugin};
use bevy::render::globals::{GlobalsBuffer, GlobalsUniform};
use bevy::render::render_asset::RenderAssets;
use bevy::render::render_resource::binding_types::{sampler, texture_3d, texture_depth_2d, uniform_buffer};
use bevy::render::render_resource::{
    AddressMode, BindGroupEntries, BindGroupLayoutDescriptor, BindGroupLayoutEntries, CachedRenderPipelineId,
    ColorTargetState, ColorWrites, FilterMode, FragmentState, LoadOp, Operations, PipelineCache,
    RenderPassColorAttachment, RenderPassDescriptor, RenderPipelineDescriptor, Sampler, SamplerBindingType,
    SamplerDescriptor, ShaderStages, StoreOp, TextureFormat, TextureSampleType, UniformBuffer,
};
use bevy::render::renderer::{RenderContext, RenderDevice, RenderQueue, ViewQuery};
use bevy::render::texture::GpuImage;
use bevy::render::view::{ViewUniform, ViewUniformOffset, ViewUniforms};
use bevy::render::{Render, RenderApp, RenderStartup, RenderSystems};

use super::grid::{Frame, Volumes};
use super::pace::Step;

/// What the targets hold: light in the engine's units, already exposed, and distances in metres (no more than
/// half precision holds: `fumes_march.wesl`, `FARTHEST`).
pub const TARGET: TextureFormat = TextureFormat::Rgba16Float;

/// The view the fumes are marched for.
#[derive(Component, ExtractComponent, Debug, Clone, Copy, Default)]
#[extract_app(RenderApp)]
pub struct FumesView;

/// The two targets the march writes and the laying-on reads.
#[derive(Resource, ExtractResource, Debug, Clone)]
#[extract_app(RenderApp)]
pub struct Targets(pub [Handle<Image>; 2]);

#[derive(Resource)]
struct Pipe {
    layout: BindGroupLayoutDescriptor,
    pipeline: CachedRenderPipelineId,
    clamped: Sampler,
    repeating: Sampler,
    frame: UniformBuffer<Frame>,
}

/// Add the pass to the render world.
pub fn plug(app: &mut App) {
    app.add_plugins((
        ExtractResourcePlugin::<Targets>::default(),
        ExtractComponentPlugin::<FumesView>::default(),
    ));
    let Some(render) = app.get_sub_app_mut(RenderApp) else { return };
    render
        .add_systems(RenderStartup, lay_pipe)
        .add_systems(Render, write.in_set(RenderSystems::PrepareResources))
        .add_systems(Core3d, march.after(Core3dSystems::Prepass).before(Core3dSystems::MainPass));
}

fn smooth(device: &RenderDevice, address: AddressMode) -> Sampler {
    device.create_sampler(&SamplerDescriptor {
        address_mode_u: address,
        address_mode_v: address,
        address_mode_w: address,
        mag_filter: FilterMode::Linear,
        min_filter: FilterMode::Linear,
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
    let volume = || texture_3d(TextureSampleType::Float { filterable: true });
    let layout = BindGroupLayoutDescriptor::new(
        "fumes_march_layout",
        &BindGroupLayoutEntries::sequential(
            ShaderStages::FRAGMENT,
            (
                uniform_buffer::<ViewUniform>(true),
                uniform_buffer::<GlobalsUniform>(false),
                uniform_buffer::<Frame>(false),
                texture_depth_2d(),
                volume(),
                volume(),
                volume(),
                volume(),
                volume(),
                sampler(SamplerBindingType::Filtering),
                sampler(SamplerBindingType::Filtering),
            ),
        ),
    );
    let target = Some(ColorTargetState { format: TARGET, blend: None, write_mask: ColorWrites::ALL });
    let pipeline = cache.queue_render_pipeline(RenderPipelineDescriptor {
        label: Some("fumes_march_pipeline".into()),
        layout: vec![layout.clone()],
        vertex: fullscreen.to_vertex_state(),
        fragment: Some(FragmentState {
            shader: assets.load("shaders/fumes_march.wesl"),
            targets: vec![target.clone(), target],
            ..default()
        }),
        ..default()
    });
    commands.insert_resource(Pipe {
        layout,
        pipeline,
        clamped: smooth(&device, AddressMode::ClampToEdge),
        repeating: smooth(&device, AddressMode::Repeat),
        frame: UniformBuffer::default(),
    });
}

/// This frame's figures, to the graphics card.
fn write(
    step: Option<Res<Step>>,
    mut pipe: ResMut<Pipe>,
    device: Res<RenderDevice>,
    queue: Res<RenderQueue>,
) {
    if let Some(step) = step {
        pipe.frame.set(step.frame);
        pipe.frame.write_buffer(&device, &queue);
    }
}

/// The march itself: one triangle over the two targets, while there is anything to see.
fn march(
    view: ViewQuery<(&ViewPrepassTextures, &ViewUniformOffset), With<FumesView>>,
    step: Option<Res<Step>>,
    volumes: Option<Res<Volumes>>,
    targets: Option<Res<Targets>>,
    pipe: Res<Pipe>,
    cache: Res<PipelineCache>,
    images: Res<RenderAssets<GpuImage>>,
    views: Res<ViewUniforms>,
    globals: Res<GlobalsBuffer>,
    device: Res<RenderDevice>,
    mut ctx: RenderContext,
) {
    let (prepass, offset) = view.into_inner();
    let (Some(step), Some(volumes), Some(targets)) = (step, volumes, targets) else { return };
    if !step.live {
        return;
    }
    let (Some(pipeline), Some(depth)) = (cache.get_render_pipeline(pipe.pipeline), prepass.depth_only_view())
    else {
        return;
    };
    let (Some(view_binding), Some(globals_binding), Some(frame_binding)) =
        (views.uniforms.binding(), globals.buffer.binding(), pipe.frame.binding())
    else {
        return;
    };
    let read = [&volumes.stuff[0], &volumes.light, &volumes.occupied, &volumes.bounds, &volumes.gusts]
        .map(|handle| images.get(handle));
    let [Some(stuff), Some(lit), Some(occupied), Some(bounds), Some(gusts)] = read else { return };
    let [Some(light), Some(reach)] = targets.0.each_ref().map(|handle| images.get(handle)) else { return };
    let group = device.create_bind_group(
        "fumes_march_group",
        &cache.get_bind_group_layout(&pipe.layout),
        &BindGroupEntries::sequential((
            view_binding,
            globals_binding,
            frame_binding,
            depth,
            &stuff.texture_view,
            &lit.texture_view,
            &occupied.texture_view,
            &bounds.texture_view,
            &gusts.texture_view,
            &pipe.clamped,
            &pipe.repeating,
        )),
    );
    let mut pass = ctx.command_encoder().begin_render_pass(&RenderPassDescriptor {
        label: Some("fumes_march"),
        color_attachments: &[Some(onto(light)), Some(onto(reach))],
        depth_stencil_attachment: None,
        timestamp_writes: None,
        occlusion_query_set: None,
        multiview_mask: None,
    });
    pass.set_pipeline(pipeline);
    pass.set_bind_group(0, &group, &[offset.offset]);
    pass.draw(0..3, 0..1);
}

/// A target the march writes to, cleared first.
fn onto(target: &GpuImage) -> RenderPassColorAttachment<'_> {
    RenderPassColorAttachment {
        view: &target.texture_view,
        depth_slice: None,
        resolve_target: None,
        ops: Operations { load: LoadOp::Clear(default()), store: StoreOp::Store },
    }
}
