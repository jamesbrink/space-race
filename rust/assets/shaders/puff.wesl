// A puff of smoke or vapour (sr-render/src/smoke.rs), marched as a volume inside its ball: a billow whose
// outline is cut by noise that turns over as it ages, lit by the Sun through itself (thick toward the Sun's far
// side, bright on the near one) and filled by the sky. What stands in front of it is found from the depth
// already drawn. Its age (thousandths of its life) and which puff it is are its mesh's tag.

import bevy_pbr::render::{
    forward_io::VertexOutput,
    mesh_functions,
    mesh_view_bindings::{view, globals},
    view_transformations::{frag_coord_to_ndc, position_ndc_to_world},
};
import bevy_pbr::prepass::utils::prepass_depth;

struct Light {
    sun: vec4<f32>,
    sunlight: vec4<f32>,
    skylight: vec4<f32>,
}

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> light: Light;

// What the vapour of a burst tank and a solid motor's smoke send back of each colour: nearly white. Estimated.
const TINT: vec3<f32> = vec3(0.93, 0.92, 0.9);
const PI: f32 = 3.14159265;
// How much a metre of a fresh puff takes out of a ray, for a puff a metre across (it thins as it swells).
const THICK: f32 = 0.9;
// The light of the scattering orders that are not marched, against the first. Estimated, as the fumes' is.
const DEEPER_ORDERS: f32 = 1.6;
const STEPS: i32 = 14;

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

// How much of the puff is at a place in its ball (the ball is one unit in radius): most at the middle, none at
// the edge, cut into knobs that turn over as it ages.
fn billow(p: vec3<f32>, age: f32, which: f32) -> f32 {
    let r = length(p);
    if r >= 1.0 {
        return 0.0;
    }
    let turned = p + vec3(which * 7.3, -age * 1.8 + which * 3.1, which * 5.7);
    let knobs = 0.6 * noise3(turned * 2.1) + 0.4 * noise3(turned * 5.3 + 11.0);
    // (thick at the middle and thinning all the way out, so that puffs let go together run into one cloud; the
    // knobs cut deepest at the edge, and deeper as it ages)
    let body = pow(1.0 - r * r, 1.5);
    return saturate(body * 1.9 - knobs * (0.55 + 0.8 * age) * (0.4 + 0.9 * r)) * 1.6;
}

// A fraction that is different at every pixel and every frame, for the temporal anti-aliasing to average.
fn dither(at: vec2<f32>) -> f32 {
    let shifted = at + 5.588238 * f32(globals.frame_count % 64u);
    return fract(52.9829189 * fract(0.06711056 * shifted.x + 0.00583715 * shifted.y));
}

@fragment
fn fragment(
    @if(MULTISAMPLED) @builtin(sample_index) sample_index: u32,
    in: VertexOutput,
) -> @location(0) vec4<f32> {
    @if(!MULTISAMPLED) let sample_index = 0u;
    let tag = mesh_functions::get_tag(in.instance_index);
    let age = f32(tag & 1023u) / 1000.0;
    let which = f32((tag >> 10u) & 255u) / 255.0;
    // The ball: its middle and its radius, from how the mesh stands.
    let stands = mesh_functions::get_world_from_local(in.instance_index);
    let middle = stands[3].xyz;
    let radius = length(stands[0].xyz);
    let ray = normalize(in.world_position.xyz - view.world_position);
    let off = view.world_position - middle;
    let half_b = dot(off, ray);
    let inside = half_b * half_b - (dot(off, off) - radius * radius);
    if inside <= 0.0 {
        discard;
    }
    let enters = max(-half_b - sqrt(inside), 0.0);
    var leaves = -half_b + sqrt(inside);
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

    // In at once and out slowly; and thinner as it swells (the same smoke in a bigger ball).
    let fades = smoothstep(0.0, 0.05, age) * pow(1.0 - age, 1.5);
    let thick = THICK * fades / max(radius, 0.5);
    let stride = (leaves - enters) / f32(STEPS);
    let sun = light.sun.xyz;
    let cosine = dot(ray, sun);
    let straight = (1.0 - 0.09) / (4.0 * PI * pow(1.09 - 0.6 * cosine, 1.5));
    var seen = vec3(0.0);
    var through = 1.0;
    var t = enters + stride * dither(in.position.xy);
    for (var i = 0; i < STEPS; i++) {
        let p = (view.world_position + ray * t - middle) / radius;
        t += stride;
        let here = billow(p, age, which) * thick;
        if here <= 0.0 {
            continue;
        }
        // Toward the Sun: two readings of the puff itself, and beyond them the rest of the ball.
        let near = billow(p + sun * 0.12, age, which);
        let far = billow(p + sun * 0.4, age, which);
        let depth = (near * 0.2 + far * 0.45) * thick * radius;
        let reaches = exp(-depth);
        let lit = light.sunlight.xyz * (straight * reaches + DEEPER_ORDERS / (4.0 * PI) * pow(reaches, 0.35))
            + light.skylight.xyz * (0.6 + 0.4 * saturate(p.y * 0.5 + 0.5));
        let stopped = 1.0 - exp(-here * stride);
        seen += through * stopped * TINT * lit;
        through *= 1.0 - stopped;
        if through < 0.02 {
            break;
        }
    }
    return vec4(clamp(seen * view.exposure, vec3(0.0), vec3(1.0e4)), clamp(1.0 - through, 0.0, 1.0));
}
