//! Runs the solver on the GPU: each frame, before any camera draws, the passes of `shaders/fumes_solve.wesl` in
//! their order, as many steps as the clock has earned ([`super::pace::Step`]), and then the light.
//!
//! Every pass has the same shape (two volumes read, one written), so there is one layout and a table of which
//! volumes each pass is handed. The state lives in the first of each pair of volumes; a step writes the second
//! and copies it back.

use std::borrow::Cow;

use bevy::core_pipeline::schedule::camera_driver;
use bevy::prelude::*;
use bevy::render::render_asset::RenderAssets;
use bevy::render::render_resource::binding_types::{sampler, texture_3d, texture_storage_3d, uniform_buffer};
use bevy::render::render_resource::{
    AddressMode, BindGroup, BindGroupEntries, BindGroupLayoutDescriptor, BindGroupLayoutEntries,
    CachedComputePipelineId, ComputePass, ComputePassDescriptor, ComputePipelineDescriptor, FilterMode,
    PipelineCache, Sampler, SamplerBindingType, SamplerDescriptor, ShaderStages, StorageTextureAccess,
    TextureFormat, TextureSampleType, UniformBuffer,
};
use bevy::render::renderer::{RenderContext, RenderDevice, RenderGraph, RenderQueue};
use bevy::render::texture::GpuImage;
use bevy::render::{Render, RenderApp, RenderStartup, RenderSystems};

use super::grid::{CELLS, COARSER, FINER, Frame, SHADE, Volumes};
use super::pace::Step;

/// How many times over the pressure is searched for each step, in pairs. Estimated: the fewest that keep the
/// air from visibly swelling where the blast feeds it, starting each step from the last one's answer.
const TURNS: u32 = 8;

/// The volumes, as the table names them: the velocity and its copy, the pressure and its, the dust and vapour
/// and theirs, the light, where anything is, the Sun's view, and the box that holds it all.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Vol {
    V0,
    V1,
    P0,
    P1,
    D0,
    D1,
    Lit,
    Any,
    Sun,
    Box,
}

/// A pass: its entry point, the two volumes it reads, the one it writes, and the cells of that one.
struct Job(&'static str, Vol, Vol, Vol, UVec3);

const FINE: UVec3 = UVec3::new(CELLS.x * FINER, CELLS.y * FINER, CELLS.z * FINER);
const SPARSE: UVec3 = UVec3::new(CELLS.x / COARSER, CELLS.y / COARSER, CELLS.z / COARSER);
const VIEW: UVec3 = UVec3::new(SHADE, SHADE, 4);

/// Every pass there is, in the order a frame can call on them: the six that start the air again, the seven of
/// a step, the four of the light. (A pass that reads only one volume is handed the light as its second.)
const JOBS: [Job; 17] = [
    Job("wipe", Vol::Lit, Vol::Lit, Vol::P0, CELLS),
    Job("wipe", Vol::Lit, Vol::Lit, Vol::D0, FINE),
    Job("wipe", Vol::Any, Vol::Any, Vol::Lit, FINE),
    Job("wipe", Vol::Lit, Vol::Lit, Vol::Any, SPARSE),
    Job("wipe", Vol::Lit, Vol::Lit, Vol::Sun, VIEW),
    Job("still", Vol::Lit, Vol::Lit, Vol::V0, CELLS),
    Job("advect", Vol::V0, Vol::Lit, Vol::V1, CELLS),
    Job("force", Vol::V1, Vol::Lit, Vol::V0, CELLS),
    Job("diverge", Vol::V0, Vol::P0, Vol::P1, CELLS),
    Job("relax", Vol::P1, Vol::Lit, Vol::P0, CELLS),
    Job("relax", Vol::P0, Vol::Lit, Vol::P1, CELLS),
    Job("project", Vol::V0, Vol::P1, Vol::V1, CELLS),
    Job("carry", Vol::D0, Vol::V1, Vol::D1, FINE),
    Job("light", Vol::D0, Vol::Any, Vol::Lit, FINE),
    Job("occupy", Vol::D0, Vol::Sun, Vol::Any, SPARSE),
    Job("shade", Vol::D0, Vol::Lit, Vol::Sun, VIEW),
    Job("bound", Vol::Any, Vol::Lit, Vol::Box, UVec3::splat(4)),
];
const START: std::ops::Range<usize> = 0..6;
const LIGHT: std::ops::Range<usize> = 13..17;
/// Which of them are the light and the Sun's view.
const LIT_JOB: usize = 13;
const SHADE_JOB: usize = 15;

#[derive(Resource)]
struct Solver {
    layout: BindGroupLayoutDescriptor,
    pipelines: Vec<CachedComputePipelineId>,
    smooth: Sampler,
    repeating: Sampler,
    figures: UniformBuffer<Frame>,
    groups: Vec<BindGroup>,
}

/// Add the solver to the render world.
pub fn plug(app: &mut App) {
    let Some(render) = app.get_sub_app_mut(RenderApp) else { return };
    render
        .add_systems(RenderStartup, found)
        .add_systems(Render, bind.in_set(RenderSystems::PrepareBindGroups))
        .add_systems(RenderGraph, work.before(camera_driver));
}

fn found(
    mut commands: Commands,
    assets: Res<AssetServer>,
    cache: Res<PipelineCache>,
    device: Res<RenderDevice>,
) {
    let float = TextureSampleType::Float { filterable: true };
    let layout = BindGroupLayoutDescriptor::new(
        "fumes",
        &BindGroupLayoutEntries::sequential(
            ShaderStages::COMPUTE,
            (
                uniform_buffer::<Frame>(false),
                sampler(SamplerBindingType::Filtering),
                texture_3d(float),
                texture_3d(float),
                texture_storage_3d(TextureFormat::Rgba16Float, StorageTextureAccess::WriteOnly),
                texture_3d(float),
                sampler(SamplerBindingType::Filtering),
            ),
        ),
    );
    let shader = assets.load("shaders/fumes_solve.wesl");
    let pipelines = JOBS
        .iter()
        .map(|job| {
            cache.queue_compute_pipeline(ComputePipelineDescriptor {
                label: Some(Cow::from(job.0)),
                layout: vec![layout.clone()],
                shader: shader.clone(),
                entry_point: Some(Cow::from(job.0)),
                ..default()
            })
        })
        .collect();
    let smooth = device.create_sampler(&SamplerDescriptor {
        address_mode_u: AddressMode::ClampToEdge,
        address_mode_v: AddressMode::ClampToEdge,
        address_mode_w: AddressMode::ClampToEdge,
        mag_filter: FilterMode::Linear,
        min_filter: FilterMode::Linear,
        ..default()
    });
    let repeating = device.create_sampler(&SamplerDescriptor {
        address_mode_u: AddressMode::Repeat,
        address_mode_v: AddressMode::Repeat,
        address_mode_w: AddressMode::Repeat,
        mag_filter: FilterMode::Linear,
        min_filter: FilterMode::Linear,
        ..default()
    });
    commands.insert_resource(Solver {
        layout,
        pipelines,
        smooth,
        repeating,
        figures: UniformBuffer::default(),
        groups: Vec::new(),
    });
}

fn image<'a>(volumes: &Volumes, images: &'a RenderAssets<GpuImage>, which: Vol) -> Option<&'a GpuImage> {
    images.get(match which {
        Vol::V0 => &volumes.velocity[0],
        Vol::V1 => &volumes.velocity[1],
        Vol::P0 => &volumes.pressure[0],
        Vol::P1 => &volumes.pressure[1],
        Vol::D0 => &volumes.stuff[0],
        Vol::D1 => &volumes.stuff[1],
        Vol::Lit => &volumes.light,
        Vol::Any => &volumes.occupied,
        Vol::Sun => &volumes.shade,
        Vol::Box => &volumes.bounds,
    })
}

/// This frame's figures to the GPU, and each pass's volumes bound to it once they exist.
fn bind(
    mut solver: ResMut<Solver>,
    step: Res<Step>,
    volumes: Option<Res<Volumes>>,
    images: Res<RenderAssets<GpuImage>>,
    cache: Res<PipelineCache>,
    device: Res<RenderDevice>,
    queue: Res<RenderQueue>,
) {
    solver.figures.set(step.frame);
    solver.figures.write_buffer(&device, &queue);
    let Some(volumes) = volumes else { return };
    if !solver.groups.is_empty() {
        return;
    }
    let layout = cache.get_bind_group_layout(&solver.layout);
    let Some(gusts) = images.get(&volumes.gusts) else { return };
    let mut groups = Vec::new();
    for Job(_, first, second, into, _) in &JOBS {
        let (Some(first), Some(second), Some(into)) = (
            image(&volumes, &images, *first),
            image(&volumes, &images, *second),
            image(&volumes, &images, *into),
        ) else {
            return;
        };
        let entries = BindGroupEntries::sequential((
            &solver.figures,
            &solver.smooth,
            &first.texture_view,
            &second.texture_view,
            &into.texture_view,
            &gusts.texture_view,
            &solver.repeating,
        ));
        groups.push(device.create_bind_group(None, &layout, &entries));
    }
    solver.groups = groups;
}

/// Run one of the passes.
fn run(pass: &mut ComputePass, solver: &Solver, cache: &PipelineCache, job: usize) {
    let (Some(group), Some(pipeline)) =
        (solver.groups.get(job), cache.get_compute_pipeline(solver.pipelines[job]))
    else {
        return;
    };
    // (a volume whose cells are not a multiple of the pass's group of four is covered by the next group up)
    let cells = (JOBS[job].4 + 3) / 4;
    pass.set_pipeline(pipeline);
    pass.set_bind_group(0, group, &[]);
    pass.dispatch_workgroups(cells.x, cells.y, cells.z);
}

/// The step's results copied back to where the state lives.
fn settle(context: &mut RenderContext, volumes: &Volumes, images: &RenderAssets<GpuImage>) {
    for (wrote, lives) in [(Vol::V1, Vol::V0), (Vol::P1, Vol::P0), (Vol::D1, Vol::D0)] {
        let (Some(wrote), Some(lives)) = (image(volumes, images, wrote), image(volumes, images, lives))
        else {
            continue;
        };
        context.command_encoder().copy_texture_to_texture(
            wrote.texture.as_image_copy(),
            lives.texture.as_image_copy(),
            wrote.texture.size(),
        );
    }
}

/// Each frame: the air started again if it must be, as many steps as are owed, and the light.
fn work(
    mut context: RenderContext,
    solver: Res<Solver>,
    step: Res<Step>,
    volumes: Option<Res<Volumes>>,
    images: Res<RenderAssets<GpuImage>>,
    cache: Res<PipelineCache>,
    mut started: Local<u32>,
    mut turn: Local<bool>,
) {
    let Some(volumes) = volumes else { return };
    let ready = !solver.groups.is_empty()
        && solver.pipelines.iter().all(|&pipeline| cache.get_compute_pipeline(pipeline).is_some());
    if !ready || !step.live {
        return;
    }
    if *started != step.epoch {
        *started = step.epoch;
        let mut pass = context.command_encoder().begin_compute_pass(&ComputePassDescriptor::default());
        for job in START {
            run(&mut pass, &solver, &cache, job);
        }
    }
    for _ in 0..step.steps {
        {
            let mut pass = context.command_encoder().begin_compute_pass(&ComputePassDescriptor::default());
            for job in 6..9 {
                run(&mut pass, &solver, &cache, job);
            }
            for _ in 0..TURNS {
                run(&mut pass, &solver, &cache, 9);
                run(&mut pass, &solver, &cache, 10);
            }
            run(&mut pass, &solver, &cache, 11);
            run(&mut pass, &solver, &cache, 12);
        }
        settle(&mut context, &volumes, &images);
    }
    // The light and the Sun's view are the dearest of these and change slowly: each is worked every other frame,
    // by turns.
    *turn = !*turn;
    let mut pass = context.command_encoder().begin_compute_pass(&ComputePassDescriptor::default());
    for job in LIGHT.filter(|&job| !(job == LIT_JOB && *turn || job == SHADE_JOB && !*turn)) {
        run(&mut pass, &solver, &cache, job);
    }
}
