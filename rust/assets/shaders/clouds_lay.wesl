// Laying the marched clouds and haze over the frame (sr-render/src/clouds/material.rs). clouds.wesl marched one
// ray for every four pixels, through a different one of the four each frame; here each pixel takes the rays round
// it that went about as far as what is solid at the pixel itself, so the edge of a gantry stays as sharp against
// the cloud as it was drawn. Where none did (a member thinner than the march's pixels), the nearest is cut to
// what is solid here: its cloud dropped if the cloud is behind, its haze thinned to the shorter way.

import bevy_pbr::render::{
    forward_io::VertexOutput,
    mesh_view_bindings::{view, globals},
    view_transformations::{frag_coord_to_ndc, position_ndc_to_world},
};
import bevy_pbr::prepass::utils::prepass_depth;

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var cloud_marched: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(1) var haze_marched: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(2) var reach_marched: texture_2d<f32>;

// No cloud is marched beyond this, km (clouds.wesl REACH).
const REACH_KM: f32 = 700.0;
// How sharply a ray that went a different way from this pixel's is passed over: the weight falls by e for every
// this-many-th part of the way it differs. Chosen so that a gantry 30 m off is not mixed with the sky behind it.
const KEEN: f32 = 6.0;

// clouds.wesl `picked`: which of four pixels the march's ray went through this frame.
fn picked(frame_count: u32) -> vec2<i32> {
    let k = frame_count % 4u;
    return vec2<i32>(i32(k & 1u), i32(((k >> 1u) ^ k) & 1u));
}

struct Laid {
    cloud: vec4<f32>,
    haze: vec4<f32>,
    // how far off the cloud is, km; how much of what is solid comes through the haze
    range: f32,
    behind: f32,
}

// One of the march's rays, cut to a way `limit` km long: what lies beyond is not seen from here.
fn cut(at: vec2<i32>, limit: f32) -> Laid {
    let reach = textureLoad(reach_marched, at, 0);
    var laid = Laid(textureLoad(cloud_marched, at, 0), textureLoad(haze_marched, at, 0), reach.x, reach.z);
    if limit < reach.y * 0.98 {
        if limit < reach.x {
            laid.cloud = vec4(0.0);
            laid.haze.w = 1.0;
        }
        // (the haze is as thick the shorter way as the longer, near enough: what is cut short is near the eye)
        let depth = -log(max(reach.z, 1.0e-4));
        let kept = depth * limit / max(reach.y, 1.0e-3);
        let behind = exp(-kept);
        laid.haze = vec4(laid.haze.xyz * (1.0 - behind) / max(1.0 - reach.z, 1.0e-4), laid.haze.w);
        laid.behind = behind;
    }
    return laid;
}

@fragment
fn fragment(
    @if(MULTISAMPLED) @builtin(sample_index) sample_index: u32,
    in: VertexOutput,
) -> @location(0) vec4<f32> {
    @if(!MULTISAMPLED) let sample_index = 0u;
    var limit = REACH_KM;
    @if(DEPTH_PREPASS) {
        let depth = prepass_depth(in.position, sample_index);
        if depth > 0.0 {
            let ndc = frag_coord_to_ndc(vec4(in.position.xy, depth, 1.0));
            limit = min(distance(position_ndc_to_world(ndc), view.world_position) / 1000.0, REACH_KM);
        }
    }
    let size = vec2<i32>(textureDimensions(reach_marched));
    // Where this pixel falls among the march's rays, in the march's pixels.
    let among = (floor(in.position.xy) - vec2<f32>(picked(globals.frame_count))) * 0.5;
    let corner = vec2<i32>(floor(among));
    let f = among - floor(among);
    var sum = vec4(0.0);
    var haze = vec4(0.0);
    var behind = 0.0;
    var weight = 0.0;
    var best = corner;
    var best_miss = 1.0e9;
    for (var k = 0; k < 4; k++) {
        let side = vec2(k & 1, k >> 1);
        let at = clamp(corner + side, vec2(0), size - 1);
        let went = textureLoad(reach_marched, at, 0).y;
        let miss = abs(log((went + 0.002) / (limit + 0.002)));
        if miss < best_miss {
            best_miss = miss;
            best = at;
        }
        let near = mix(1.0 - f, f, vec2<f32>(side));
        let w = near.x * near.y * exp(-miss * KEEN) + 1.0e-5;
        sum += textureLoad(cloud_marched, at, 0) * w;
        haze += textureLoad(haze_marched, at, 0) * w;
        behind += textureLoad(reach_marched, at, 0).z * w;
        weight += w;
    }
    var laid = Laid(sum / weight, haze / weight, 0.0, behind / weight);
    if best_miss > 0.15 {
        laid = cut(best, limit);
    }
    let light = laid.cloud.xyz * laid.haze.w + laid.haze.xyz;
    let hidden = 1.0 - (1.0 - laid.cloud.w) * laid.behind;
    // (nothing but finite numbers into the frame: the temporal filter keeps a NaN for good, and the frame goes black)
    let out = vec4(clamp(light, vec3(0.0), vec3(6.0e4)), saturate(hidden));
    return select(vec4(0.0), out, out == out);
}
