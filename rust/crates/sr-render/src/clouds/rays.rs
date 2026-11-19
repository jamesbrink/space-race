//! Rays of light in the haze: `shaders/clouds_rays.wesl`, run at the march's size once the clouds are marched, into
//! the fourth of the march's targets, which the laying-on adds to the haze. Crepuscular rays worked on the picture
//! (the open sky round the Sun smeared toward it): an image-space approximation of the light shadowed haze throws
//! forward at scales the march does not resolve, not a measurement.

use bevy::core_pipeline::FullscreenShader;
use bevy::core_pipeline::schedule::{Core3d, Core3dSystems};
use bevy::prelude::*;
use bevy::render::globals::{GlobalsBuffer, GlobalsUniform};
use bevy::render::render_asset::RenderAssets;
use bevy::render::render_resource::binding_types::{sampler, texture_2d, uniform_buffer};
use bevy::render::render_resource::{
    BindGroupEntries, BindGroupLayoutDescriptor, BindGroupLayoutEntries, CachedRenderPipelineId,
    ColorTargetState, ColorWrites, FragmentState, LoadOp, Operations, PipelineCache,
    RenderPassColorAttachment, RenderPassDescriptor, RenderPipelineDescriptor, SamplerBindingType,
    ShaderStages, StoreOp, TextureSampleType,
};
use bevy::render::renderer::{RenderContext, RenderDevice, ViewQuery};
use bevy::render::texture::GpuImage;
use bevy::render::view::{ViewUniform, ViewUniformOffset, ViewUniforms};
use bevy::render::{RenderApp, RenderStartup};

use super::frame::CloudFrame;
use super::pass::{CloudSky, CloudView, Pipe as March, TARGET, march};

#[derive(Resource)]
struct Pipe {
    layout: BindGroupLayoutDescriptor,
    pipeline: CachedRenderPipelineId,
}

/// The pass.
pub struct CloudRaysPlugin;

impl Plugin for CloudRaysPlugin {
    fn build(&self, app: &mut App) {
        let Some(render) = app.get_sub_app_mut(RenderApp) else { return };
        render.add_systems(RenderStartup, lay_pipe).add_systems(
            Core3d,
            smear.after(march).after(Core3dSystems::Prepass).before(Core3dSystems::MainPass),
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
        "clouds_rays_layout",
        &BindGroupLayoutEntries::sequential(
            ShaderStages::FRAGMENT,
            (
                uniform_buffer::<ViewUniform>(true),
                uniform_buffer::<GlobalsUniform>(false),
                uniform_buffer::<CloudFrame>(false),
                flat(),
                flat(),
                sampler(SamplerBindingType::Filtering),
            ),
        ),
    );
    let pipeline = cache.queue_render_pipeline(RenderPipelineDescriptor {
        label: Some("clouds_rays_pipeline".into()),
        layout: vec![layout.clone()],
        vertex: fullscreen.to_vertex_state(),
        fragment: Some(FragmentState {
            shader: assets.load("shaders/clouds_rays.wesl"),
            targets: vec![Some(ColorTargetState {
                format: TARGET,
                blend: None,
                write_mask: ColorWrites::ALL,
            })],
            ..default()
        }),
        ..default()
    });
    commands.insert_resource(Pipe { layout, pipeline });
}

/// One triangle over the rays' target.
fn smear(
    view: ViewQuery<&ViewUniformOffset, With<CloudView>>,
    sky: Option<Res<CloudSky>>,
    pipe: Res<Pipe>,
    marching: Res<March>,
    cache: Res<PipelineCache>,
    images: Res<RenderAssets<GpuImage>>,
    views: Res<ViewUniforms>,
    globals: Res<GlobalsBuffer>,
    device: Res<RenderDevice>,
    mut ctx: RenderContext,
) {
    let offset = view.into_inner();
    let Some(sky) = sky else { return };
    let Some(pipeline) = cache.get_render_pipeline(pipe.pipeline) else { return };
    let bindings = (views.uniforms.binding(), globals.buffer.binding(), marching.frame.binding());
    let (Some(view_binding), Some(globals_binding), Some(frame_binding)) = bindings else { return };
    let [Some(cloud), _, Some(reach), Some(rays)] = sky.targets.each_ref().map(|handle| images.get(handle))
    else {
        return;
    };
    let group = device.create_bind_group(
        "clouds_rays_group",
        &cache.get_bind_group_layout(&pipe.layout),
        &BindGroupEntries::sequential((
            view_binding,
            globals_binding,
            frame_binding,
            &cloud.texture_view,
            &reach.texture_view,
            &marching.clamped,
        )),
    );
    let mut pass = ctx.command_encoder().begin_render_pass(&RenderPassDescriptor {
        label: Some("clouds_rays"),
        color_attachments: &[Some(RenderPassColorAttachment {
            view: &rays.texture_view,
            depth_slice: None,
            resolve_target: None,
            ops: Operations { load: LoadOp::Clear(default()), store: StoreOp::Store },
        })],
        depth_stencil_attachment: None,
        timestamp_writes: None,
        occlusion_query_set: None,
        multiview_mask: None,
    });
    pass.set_pipeline(pipeline);
    pass.set_bind_group(0, &group, &[offset.offset]);
    pass.draw(0..3, 0..1);
}
