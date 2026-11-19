// Laying the marched fumes over the frame (sr-render/src/fumes/lay.rs). fumes_march.wesl marched one ray for every
// four pixels, through a different one of the four each frame; here each pixel takes the rays round it that went
// about as far as what is solid at the pixel itself, so the edge of a gantry stays as sharp against the fumes as
// it was drawn. Where none did (a member thinner than the march's pixels), the nearest is taken if its fumes began
// in front of what is solid here, and dropped if they began behind it.

import bevy_pbr::render::{
    forward_io::VertexOutput,
    mesh_view_bindings::{view, globals},
    view_transformations::{frag_coord_to_ndc, position_ndc_to_world},
};
import bevy_pbr::prepass::utils::prepass_depth;

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var light_marched: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(1) var reach_marched: texture_2d<f32>;

// No ray is followed further than this, m (fumes_march.wesl FARTHEST).
const FARTHEST: f32 = 6.0e4;
// How sharply a ray that went a different way from this pixel's is passed over: the weight falls by e for every
// this-many-th part of the way it differs (clouds_lay.wesl's figure).
const KEEN: f32 = 6.0;

// fumes_march.wesl `picked`.
fn picked(frame_count: u32) -> vec2<i32> {
    let k = frame_count % 4u;
    return vec2<i32>(i32(k & 1u), i32(((k >> 1u) ^ k) & 1u));
}

@fragment
fn fragment(
    @if(MULTISAMPLED) @builtin(sample_index) sample_index: u32,
    in: VertexOutput,
) -> @location(0) vec4<f32> {
    @if(!MULTISAMPLED) let sample_index = 0u;
    var limit = FARTHEST;
    @if(DEPTH_PREPASS) {
        let depth = prepass_depth(in.position, sample_index);
        if depth > 0.0 {
            let ndc = frag_coord_to_ndc(vec4(in.position.xy, depth, 1.0));
            limit = min(distance(position_ndc_to_world(ndc), view.world_position), FARTHEST);
        }
    }
    let size = vec2<i32>(textureDimensions(reach_marched));
    let among = (floor(in.position.xy) - vec2<f32>(picked(globals.frame_count))) * 0.5;
    let corner = vec2<i32>(floor(among));
    let f = among - floor(among);
    var sum = vec4(0.0);
    var weight = 0.0;
    var best = corner;
    var best_miss = 1.0e9;
    for (var k = 0; k < 4; k++) {
        let side = vec2(k & 1, k >> 1);
        let at = clamp(corner + side, vec2(0), size - 1);
        let went = textureLoad(reach_marched, at, 0).x;
        let miss = abs(log((went + 0.5) / (limit + 0.5)));
        if miss < best_miss {
            best_miss = miss;
            best = at;
        }
        let near = mix(1.0 - f, f, vec2<f32>(side));
        let w = near.x * near.y * exp(-miss * KEEN) + 1.0e-5;
        sum += textureLoad(light_marched, at, 0) * w;
        weight += w;
    }
    var laid = sum / weight;
    if best_miss > 0.15 {
        let began = textureLoad(reach_marched, best, 0).y;
        laid = select(vec4(0.0), textureLoad(light_marched, best, 0), began < limit);
    }
    if laid.w < 1.0e-4 {
        discard;
    }
    return vec4(max(laid.xyz, vec3(0.0)), saturate(laid.w));
}
