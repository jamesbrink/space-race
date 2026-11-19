// The glowing gas over a shield coming back in, and its wake (sr-render/src/shock/glow.rs). Both are optically
// thin: a pixel is as bright as the length of gas its ray crosses inside the ellipsoid, short of the plane past
// which there is none and of whatever solid stands in front. The wake's light falls off down it and flickers.
// Lengths are metres in the volume's own frame; light is in the engine's physical units, exposed at the end.

import bevy_pbr::render::{
    forward_io::VertexOutput,
    mesh_functions,
    mesh_view_bindings::view,
    view_transformations::{frag_coord_to_ndc, position_ndc_to_world},
};
import bevy_pbr::prepass::utils::prepass_depth;

struct Gas {
    // colour times the light of a metre of it, cd/m^2 a metre; w: 1 for the wake
    light: vec4<f32>,
    // the ellipsoid's half-widths, m; w: the height past which there is none
    halves: vec4<f32>,
    // the clock, s; how far down the wake its light falls by e, m; how much it flickers
    flow: vec4<f32>,
}

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> gas: Gas;

// Points the wake's flicker is read at along each ray.
const READS: i32 = 4;

fn hash31(p: vec3<f32>) -> f32 {
    var q = fract(p * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yxz + 33.33);
    return fract((q.x + q.y) * q.z);
}

fn noise3(p: vec3<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    let x00 = mix(hash31(i), hash31(i + vec3(1.0, 0.0, 0.0)), u.x);
    let x10 = mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), u.x);
    let x01 = mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), u.x);
    let x11 = mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), u.x);
    return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

@fragment
fn fragment(
    @if(MULTISAMPLED) @builtin(sample_index) sample_index: u32,
    in: VertexOutput,
) -> @location(0) vec4<f32> {
    @if(!MULTISAMPLED) let sample_index = 0u;
    let halves = gas.halves.xyz;
    let inward = mesh_functions::get_local_from_world(in.instance_index);
    let eye = (inward * vec4(view.world_position, 1.0)).xyz * halves;
    let there = (inward * vec4(in.world_position.xyz, 1.0)).xyz * halves;
    let reach = distance(in.world_position.xyz, view.world_position);
    let ray = (there - eye) / reach;

    // Where the ray is inside the ellipsoid: a unit ball once each axis is divided by its half-width.
    let e = eye / halves;
    let d = ray / halves;
    let a = dot(d, d);
    let b = dot(e, d);
    let c = dot(e, e) - 1.0;
    let found = b * b - a * c;
    if found <= 0.0 {
        discard;
    }
    let root = sqrt(found);
    var enters = max((-b - root) / a, 0.0);
    var leaves = (-b + root) / a;
    // Short of the plane past which there is none.
    let cut = gas.halves.w;
    if abs(ray.y) > 1.0e-5 {
        let crosses = (cut - eye.y) / ray.y;
        if ray.y > 0.0 {
            leaves = min(leaves, crosses);
        } else {
            enters = max(enters, crosses);
        }
    } else if eye.y > cut {
        discard;
    }
    @if(DEPTH_PREPASS) {
        let depth = prepass_depth(in.position, sample_index);
        if depth > 0.0 {
            let ndc = frag_coord_to_ndc(vec4(in.position.xy, depth, 1.0));
            leaves = min(leaves, distance(position_ndc_to_world(ndc), view.world_position));
        }
    }
    if leaves <= enters {
        discard;
    }
    var amount = leaves - enters;
    if gas.light.w > 0.5 {
        // The wake: brightest at its head (the low end of its axis), falling off and flickering down it.
        var sum = 0.0;
        for (var i = 0; i < READS; i++) {
            let p = eye + ray * mix(enters, leaves, (f32(i) + 0.5) / f32(READS));
            let down = p.y + halves.y;
            let flicker = 1.0 - gas.flow.z * noise3(vec3(p.x * 3.0, down * 1.5 - gas.flow.x * 9.0, p.z * 3.0));
            sum += exp(-down / gas.flow.y) * flicker;
        }
        amount *= sum / f32(READS);
    }
    let light = gas.light.rgb * amount;
    return vec4(clamp(light * view.exposure, vec3(0.0), vec3(1.0e4)), 0.0);
}
