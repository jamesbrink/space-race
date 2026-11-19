//! How the clouds moved on the screen since the last frame, for the temporal filter: `shaders/clouds_motion.wesl`,
//! run over the frame's motion vectors once the clouds are marched, where nothing solid was drawn and there is
//! cloud. The engine's own guess there takes the sky to be infinitely far off, which a cloud a kilometre away from
//! an eye climbing at a hundred metres a second is not.

use bevy::core_pipeline::FullscreenShader;
use bevy::core_pipeline::prepass::{
    MOTION_VECTOR_PREPASS_FORMAT, PreviousViewData, PreviousViewUniformOffset, PreviousViewUniforms,
    ViewPrepassTextures,
};
use bevy::core_pipeline::schedule::{Core3d, Core3dSystems};
use bevy::prelude::*;
use bevy::render::render_asset::RenderAssets;
use bevy::render::render_resource::binding_types::{texture_2d, texture_depth_2d, uniform_buffer};
use bevy::render::render_resource::{
    BindGroupEntries, BindGroupLayoutDescriptor, BindGroupLayoutEntries, CachedRenderPipelineId,
    ColorTargetState, ColorWrites, FragmentState, LoadOp, Operations, PipelineCache,
    RenderPassColorAttachment, RenderPassDescriptor, RenderPipelineDescriptor, ShaderStages, StoreOp,
    TextureSampleType, UniformBuffer,
};
use bevy::render::renderer::{RenderContext, RenderDevice, RenderQueue, ViewQuery};
use bevy::render::texture::GpuImage;
use bevy::render::view::{ViewUniform, ViewUniformOffset, ViewUniforms};
use bevy::render::{Render, RenderApp, RenderStartup, RenderSystems};

use super::pass::{CloudSky, CloudView, march};

/// Writes the clouds' motion; off, the engine's guess for the sky stands everywhere (for measuring what it costs
/// and what it mends).
const MOTION: bool = true;

#[derive(Resource)]
struct Pipe {
    layout: BindGroupLayoutDescriptor,
    pipeline: CachedRenderPipelineId,
    moved: UniformBuffer<Vec4>,
}

/// The pass.
pub struct CloudMotionPlugin;

impl Plugin for CloudMotionPlugin {
    fn build(&self, app: &mut App) {
        let Some(render) = app.get_sub_app_mut(RenderApp) else { return };
        render
            .add_systems(RenderStartup, lay_pipe)
            .add_systems(Render, write.in_set(RenderSystems::PrepareResources))
            .add_systems(
                Core3d,
                mark.after(march).after(Core3dSystems::Prepass).before(Core3dSystems::MainPass),
            );
    }
}

fn lay_pipe(
    mut commands: Commands,
    assets: Res<AssetServer>,
    fullscreen: Res<FullscreenShader>,
    cache: Res<PipelineCache>,
) {
    let flat = || texture_2d(TextureSampleType::Float { filterable: true });
    let layout = BindGroupLayoutDescriptor::new(
        "clouds_motion_layout",
        &BindGroupLayoutEntries::sequential(
            ShaderStages::FRAGMENT,
            (
                uniform_buffer::<ViewUniform>(true),
                uniform_buffer::<PreviousViewData>(true),
                uniform_buffer::<Vec4>(false),
                texture_depth_2d(),
                flat(),
                flat(),
            ),
        ),
    );
    let target =
        ColorTargetState { format: MOTION_VECTOR_PREPASS_FORMAT, blend: None, write_mask: ColorWrites::ALL };
    let pipeline = cache.queue_render_pipeline(RenderPipelineDescriptor {
        label: Some("clouds_motion_pipeline".into()),
        layout: vec![layout.clone()],
        vertex: fullscreen.to_vertex_state(),
        fragment: Some(FragmentState {
            shader: assets.load("shaders/clouds_motion.wesl"),
            targets: vec![Some(target)],
            ..default()
        }),
        ..default()
    });
    commands.insert_resource(Pipe { layout, pipeline, moved: UniformBuffer::default() });
}

fn write(
    sky: Option<Res<CloudSky>>,
    mut pipe: ResMut<Pipe>,
    device: Res<RenderDevice>,
    queue: Res<RenderQueue>,
) {
    if let Some(sky) = sky {
        pipe.moved.set(sky.frame.moved);
        pipe.moved.write_buffer(&device, &queue);
    }
}

/// One triangle over the frame's motion vectors, kept where it does not write.
fn mark(
    view: ViewQuery<(&ViewPrepassTextures, &ViewUniformOffset, &PreviousViewUniformOffset), With<CloudView>>,
    sky: Option<Res<CloudSky>>,
    pipe: Res<Pipe>,
    cache: Res<PipelineCache>,
    images: Res<RenderAssets<GpuImage>>,
    views: Res<ViewUniforms>,
    previous: Res<PreviousViewUniforms>,
    device: Res<RenderDevice>,
    mut ctx: RenderContext,
) {
    let (prepass, offset, previous_offset) = view.into_inner();
    let Some(sky) = sky.filter(|_| MOTION) else { return };
    let (Some(pipeline), Some(depth), Some(motion)) = (
        cache.get_render_pipeline(pipe.pipeline),
        prepass.depth_only_view(),
        prepass.motion_vectors.as_ref(),
    ) else {
        return;
    };
    let bindings = (views.uniforms.binding(), previous.uniforms.binding(), pipe.moved.binding());
    let (Some(view_binding), Some(previous_binding), Some(moved_binding)) = bindings else { return };
    let (Some(cloud), Some(reach)) = (images.get(&sky.targets[0]), images.get(&sky.targets[2])) else {
        return;
    };
    let group = device.create_bind_group(
        "clouds_motion_group",
        &cache.get_bind_group_layout(&pipe.layout),
        &BindGroupEntries::sequential((
            view_binding,
            previous_binding,
            moved_binding,
            depth,
            &cloud.texture_view,
            &reach.texture_view,
        )),
    );
    let mut pass = ctx.command_encoder().begin_render_pass(&RenderPassDescriptor {
        label: Some("clouds_motion"),
        color_attachments: &[Some(RenderPassColorAttachment {
            view: &motion.texture.default_view,
            depth_slice: None,
            resolve_target: None,
            ops: Operations { load: LoadOp::Load, store: StoreOp::Store },
        })],
        depth_stencil_attachment: None,
        timestamp_writes: None,
        occlusion_query_set: None,
        multiview_mask: None,
    });
    pass.set_pipeline(pipeline);
    pass.set_bind_group(0, &group, &[offset.offset, previous_offset.offset]);
    pass.draw(0..3, 0..1);
}
