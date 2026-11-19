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
@group(constants::MATERIAL_BIND_GROUP) @binding(3) var rays_marched: texture_2d<f32>;

// No cloud is marched beyond this, km (clouds.wesl REACH).
const REACH_KM: f32 = 700.0;
// How sharply a ray that went a different way from this pixel's is passed over: the weight falls by e for every
// this-many-th part of the way it differs. Chosen so that a gantry 30 m off is not mixed with the sky behind it.
const KEEN: f32 = 6.0;
// The tent the march's rays are weighed by, in the march's pixels from this one.
const TENT: f32 = 1.5;

// Which of the `every` x `every` pixels under one of the march's this frame's ray goes through: each in turn, so
// that over every^2 frames every pixel of the frame has had a ray of its own. clouds.wesl and clouds_lay.wesl have
// the same.
fn picked(frame_count: u32, every: i32) -> vec2<i32> {
    let k = i32(frame_count % u32(every * every));
    return vec2(k % every, (k / every + k) % every);
}

struct Laid {
    cloud: vec4<f32>,
    haze: vec4<f32>,
    rays: vec3<f32>,
    // how far off the cloud is, km; how much of what is solid comes through the haze
    range: f32,
    behind: f32,
}

// One of the march's rays, cut to a way `limit` km long: what lies beyond is not seen from here.
fn cut(at: vec2<i32>, limit: f32) -> Laid {
    let reach = textureLoad(reach_marched, at, 0);
    var laid = Laid(textureLoad(cloud_marched, at, 0), textureLoad(haze_marched, at, 0),
        textureLoad(rays_marched, at, 0).rgb, reach.x, reach.z);
    if limit < reach.y * 0.98 {
        if limit < reach.x {
            laid.cloud = vec4(0.0);
            laid.haze.w = 1.0;
        }
        // (the haze is as thick the shorter way as the longer, near enough: what is cut short is near the eye)
        let depth = -log(max(reach.z, 1.0e-4));
        let kept = depth * limit / max(reach.y, 1.0e-3);
        let behind = exp(-kept);
        let shorter = (1.0 - behind) / max(1.0 - reach.z, 1.0e-4);
        laid.haze = vec4(laid.haze.xyz * shorter, laid.haze.w);
        laid.rays *= shorter;
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
    // (how many of the frame's pixels each way one of the march's stands for)
    let every = i32(round(view.viewport.z / f32(size.x)));
    // Where this pixel falls among the march's rays, in the march's pixels.
    let among = (floor(in.position.xy) - vec2<f32>(picked(globals.frame_count, every))) / f32(every);
    // The march's rays round this pixel, three by three, weighed by a tent 1.5 of the march's pixels wide (wider
    // than their spacing, so that no square of them shows) and by how near what each met is to what is here.
    let nearest = vec2<i32>(round(among));
    let off = among - round(among);
    var sum = vec4(0.0);
    var haze = vec4(0.0);
    var rays = vec3(0.0);
    var behind = 0.0;
    var weight = 0.0;
    var best = nearest;
    var best_miss = 1.0e9;
    for (var k = 0; k < 9; k++) {
        let side = vec2(k % 3 - 1, k / 3 - 1);
        let at = clamp(nearest + side, vec2(0), size - 1);
        let reach = textureLoad(reach_marched, at, 0);
        let miss = abs(log((reach.y + 0.002) / (limit + 0.002)));
        let tent = max(vec2(TENT) - abs(vec2<f32>(side) - off), vec2(0.0));
        if miss < best_miss || (miss == best_miss && side.x == 0 && side.y == 0) {
            best_miss = miss;
            best = at;
        }
        let w = tent.x * tent.y * exp(-miss * KEEN) + 1.0e-6;
        sum += textureLoad(cloud_marched, at, 0) * w;
        haze += textureLoad(haze_marched, at, 0) * w;
        rays += textureLoad(rays_marched, at, 0).rgb * w;
        behind += reach.z * w;
        weight += w;
    }
    var laid = Laid(sum / weight, haze / weight, rays / weight, 0.0, behind / weight);
    if best_miss > 0.15 {
        laid = cut(best, limit);
    }
    let light = laid.cloud.xyz * laid.haze.w + laid.haze.xyz + laid.rays;
    let hidden = 1.0 - (1.0 - laid.cloud.w) * laid.behind;
    // (nothing but finite numbers into the frame: the temporal filter keeps a NaN for good, and the frame goes black)
    let out = vec4(clamp(light, vec3(0.0), vec3(6.0e4)), saturate(hidden));
    return select(vec4(0.0), out, out == out);
}
