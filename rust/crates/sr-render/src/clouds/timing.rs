//! What the clouds' march costs on the graphics card, said once a second, when `SR_GPU_TIMES` is set in the
//! environment: the card's own clock read at the start and end of the march's pass. On a machine whose card others
//! are using too, the frame's time says little; this says the march's. Off, nothing is added and nothing is read.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use bevy::prelude::*;
use bevy::render::render_resource::{Buffer, BufferDescriptor, BufferUsages, MapMode};
use bevy::render::renderer::{RenderDevice, RenderQueue};
use bevy::render::{Render, RenderApp, RenderStartup, RenderSystems};
use wgpu::{QuerySet, QuerySetDescriptor, QueryType, RenderPassTimestampWrites};

/// The switch, as an environment variable.
const SWITCH: &str = "SR_GPU_TIMES";
/// Bytes of the two readings of the card's clock.
const BYTES: u64 = 16;

/// The card's clock at the march's start and end, and what it said last.
#[derive(Resource)]
pub struct MarchClock {
    set: QuerySet,
    resolved: Buffer,
    read: Buffer,
    /// Whether the readings are on their way back, so that none are written over them.
    waiting: Arc<AtomicBool>,
    /// Whether this frame's pass asked for them.
    asked: AtomicBool,
    /// Nanoseconds to a tick of the card's clock.
    period: f32,
    /// What the march took, ms, each frame since it was last said.
    took: Arc<Mutex<Vec<f32>>>,
}

impl MarchClock {
    /// The readings for the march's pass to write, unless the last ones are not yet read back.
    #[must_use]
    pub fn writes(&self) -> Option<RenderPassTimestampWrites<'_>> {
        if self.waiting.load(Ordering::Acquire) {
            return None;
        }
        self.asked.store(true, Ordering::Release);
        Some(RenderPassTimestampWrites {
            query_set: &self.set,
            beginning_of_pass_write_index: Some(0),
            end_of_pass_write_index: Some(1),
        })
    }

    /// After the pass: the readings put where they can be read back.
    pub fn resolve(&self, encoder: &mut bevy::render::render_resource::CommandEncoder) {
        if self.asked.load(Ordering::Acquire) && !self.waiting.load(Ordering::Acquire) {
            encoder.resolve_query_set(&self.set, 0..2, &self.resolved, 0);
            encoder.copy_buffer_to_buffer(&self.resolved, 0, &self.read, 0, BYTES);
        }
    }
}

/// Times the march.
pub struct TimingPlugin;

impl Plugin for TimingPlugin {
    fn build(&self, app: &mut App) {
        if std::env::var_os(SWITCH).is_none() {
            return;
        }
        let Some(render) = app.get_sub_app_mut(RenderApp) else { return };
        render
            .add_systems(RenderStartup, make)
            .add_systems(Render, (fetch, say).in_set(RenderSystems::Cleanup));
    }
}

fn make(mut commands: Commands, device: Res<RenderDevice>, queue: Res<RenderQueue>) {
    if !device.features().contains(bevy::render::render_resource::WgpuFeatures::TIMESTAMP_QUERY) {
        warn!("{SWITCH}: this card cannot time its passes");
        return;
    }
    let set = device.wgpu_device().create_query_set(&QuerySetDescriptor {
        label: Some("clouds_march_clock"),
        ty: QueryType::Timestamp,
        count: 2,
    });
    let buffer = |usage, label| {
        device.create_buffer(&BufferDescriptor {
            label: Some(label),
            size: BYTES,
            usage,
            mapped_at_creation: false,
        })
    };
    commands.insert_resource(MarchClock {
        set,
        resolved: buffer(BufferUsages::QUERY_RESOLVE | BufferUsages::COPY_SRC, "clouds_march_clock_resolved"),
        read: buffer(BufferUsages::MAP_READ | BufferUsages::COPY_DST, "clouds_march_clock_read"),
        waiting: Arc::default(),
        asked: AtomicBool::new(false),
        period: queue.get_timestamp_period(),
        took: Arc::default(),
    });
}

/// Once the frame is sent: the readings brought back, when they are there.
fn fetch(clock: Option<Res<MarchClock>>) {
    let Some(clock) = clock else { return };
    if !clock.asked.swap(false, Ordering::AcqRel) || clock.waiting.swap(true, Ordering::AcqRel) {
        return;
    }
    let (read, waiting, took, period) =
        (clock.read.clone(), clock.waiting.clone(), clock.took.clone(), clock.period);
    clock.read.slice(..).map_async(MapMode::Read, move |result| {
        if result.is_ok() {
            let ticks: Vec<u64> = read.slice(..).get_mapped_range().map_or_else(
                |_| Vec::new(),
                |view| view.as_chunks::<8>().0.iter().map(|b| u64::from_le_bytes(*b)).collect(),
            );
            if let [start, end] = ticks[..]
                && let Ok(mut took) = took.lock()
            {
                took.push(end.saturating_sub(start) as f32 * period * 1.0e-6);
            }
            read.unmap();
        }
        waiting.store(false, Ordering::Release);
    });
}

fn say(clock: Option<Res<MarchClock>>, mut frames: Local<u32>) {
    let Some(clock) = clock else { return };
    *frames += 1;
    if !(*frames).is_multiple_of(60) {
        return;
    }
    let Ok(mut took) = clock.took.lock() else { return };
    if took.is_empty() {
        return;
    }
    took.sort_by(f32::total_cmp);
    info!("gpu: clouds march {:.2} ms (median of {})", took[took.len() / 2], took.len());
    took.clear();
}
