// How the clouds moved on the screen since the last frame (sr-render/src/clouds/motion.rs), written over the
// engine's own guess for the sky, which takes everything drawn there to be infinitely far off. A cloud is not: as
// the eye climbs past one at a hundred metres a second it slides across the frame, and the temporal filter must
// be told so, or it smears the cloud along its way and the knobs crawl.

import bevy_core_pipeline::fullscreen_vertex_shader::FullscreenVertexOutput;
import bevy_render::view::View;

struct PreviousViewUniforms {
    view_from_world: mat4x4<f32>,
    clip_from_world: mat4x4<f32>,
    unjittered_clip_from_world: mat4x4<f32>,
    clip_from_view: mat4x4<f32>,
    world_from_clip: mat4x4<f32>,
    view_from_clip: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var<uniform> previous_view: PreviousViewUniforms;
// where what is in the cloud now was, in the last frame's picture, less where it is in this one, m
@group(0) @binding(2) var<uniform> moved: vec4<f32>;
@group(0) @binding(3) var depth_drawn: texture_depth_2d;
@group(0) @binding(4) var cloud_marched: texture_2d<f32>;
@group(0) @binding(5) var reach_marched: texture_2d<f32>;

// Below this much cloud a pixel is sky, and the engine's guess for it stands.
const CLOUDY: f32 = 0.15;

@fragment
fn fragment(in: FullscreenVertexOutput) -> @location(0) vec4<f32> {
    let pixel = vec2<i32>(floor(in.position.xy));
    if textureLoad(depth_drawn, pixel, 0) > 0.0 {
        discard;
    }
    let small = vec2<i32>(textureDimensions(cloud_marched));
    let every = i32(round(view.viewport.z / f32(small.x)));
    let marched = clamp(pixel / every, vec2(0), small - 1);
    if textureLoad(cloud_marched, marched, 0).a < CLOUDY {
        discard;
    }
    let range = textureLoad(reach_marched, marched, 0).x * 1000.0;
    let ndc = in.uv * vec2(2.0, -2.0) + vec2(-1.0, 1.0);
    let near = view.world_from_clip * vec4(ndc, 1.0, 1.0);
    let ray = normalize(near.xyz / near.w - view.world_position);
    let now_at = view.world_position + ray * range;
    let now = view.unjittered_clip_from_world * vec4(now_at, 1.0);
    let then = previous_view.unjittered_clip_from_world * vec4(now_at + moved.xyz, 1.0);
    let velocity = (now.xy / now.w - then.xy / max(then.w, 1.0e-6)) * vec2(0.5, -0.5);
    // (a place behind the last frame's eye has no place in its picture: no NaN nor anything a half float cannot hold
    // may reach the temporal filter, which keeps it for good)
    let held = select(vec2(0.0), clamp(velocity, vec2(-2.0), vec2(2.0)), all(velocity == velocity) && then.w > 1.0e-3);
    return vec4(held, 0.0, 1.0);
}
