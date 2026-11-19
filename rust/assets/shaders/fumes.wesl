// The dust and vapour round the pad (sr-render/src/fumes), marched from the eye through the box the solver works
// (`fumes_solve.wesl`). A coarse march first finds where along the ray there is anything at all; the fine march
// then spends its steps there. Each step is lit by the Sun through the rest of the fumes (the solver's light
// volume: a deep opacity map kept as a volume), by the sky overhead, by the sunlit ground under it and by the
// fire inside it. What stands in front of the fumes is found from the depth already drawn. Lengths are metres in
// the box's frame, light is in the engine's physical units, exposed at the end as everything else is.

import bevy_pbr::render::{
    forward_io::{Vertex, VertexOutput, decompress_vertex},
    mesh_functions,
    mesh_view_bindings::{view, globals},
    view_transformations::{frag_coord_to_ndc, position_ndc_to_world, position_world_to_view, position_world_to_clip},
    shadows::fetch_directional_shadow,
};
import bevy_pbr::prepass::utils::prepass_depth;

struct Source {
    at: vec4<f32>,
    push: vec4<f32>,
    gives: vec4<f32>,
}

struct Fume {
    // the box, m; w: a coarse cell, m
    size: vec4<f32>,
    cells: vec4<f32>,
    time: vec4<f32>,
    // toward the Sun; w: how wide the Sun's view of the box is
    sun: vec4<f32>,
    sun_a: vec4<f32>,
    sun_b: vec4<f32>,
    sunlight: vec4<f32>,
    skylight: vec4<f32>,
    // the fire's light: where; w: how strong, cd
    lamp: vec4<f32>,
    lamp_colour: vec4<f32>,
    ground: vec4<f32>,
    sources: array<Source, 8>,
}

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> fume: Fume;
@group(constants::MATERIAL_BIND_GROUP) @binding(1) var stuff: texture_3d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(2) var stuff_sampler: sampler;
@group(constants::MATERIAL_BIND_GROUP) @binding(3) var lit: texture_3d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(4) var occupied: texture_3d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(5) var shade: texture_3d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(6) var bounds: texture_3d<f32>;

const PI: f32 = 3.14159265;
// What dust off a concrete apron and Florida sand sends back of each colour, and what vapour does. Estimated:
// the haze in the stills of MR-3 and MR-2 leaving the pad is a whitish tan, the billow at ignition white.
const DUST: vec3<f32> = vec3<f32>(0.80, 0.72, 0.60);
const VAPOUR: vec3<f32> = vec3<f32>(0.96, 0.96, 0.97);
// How far forward the fumes throw the light they scatter (Henyey and Greenstein's g). Estimated.
const FORWARD: f32 = 0.35;
// The light of the scattering orders that are not marched, against the first, and how much less the rest of
// the fumes shades it (as a power of what gets through). Estimated, as the clouds' is.
const DEEPER_ORDERS: f32 = 1.6;
const DEEPER_SHADE: f32 = 0.35;
// How much of the Sun's light the ground under the fumes sends back up. Estimated.
const GROUND_ALBEDO: f32 = 0.3;
// How deeply the fumes' edges are cut by what the grid is too coarse to hold, and the thickness (1/m) above
// which they are cut no deeper. Estimated.
const CUT: f32 = 0.6;
const CUT_UNDER: f32 = 0.35;
// The coarse march's stride, m (a cell of `occupied`), its most steps, and the fine march's.
const COARSE: f32 = 4.0;
const COARSE_STEPS: i32 = 30;
const FINE_STEPS: f32 = 26.0;
// The fine march steps no finer than this, m.
const FINEST: f32 = 0.4;

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

// The fumes' edges are finer than the grid that carries them: what is at a place is cut back by a noise that
// drifts with the wind and turns over, most where there is least, so that a billow's outline is knobbed and a
// thin haze is in wisps. The grid's own figure is kept where the fumes are thick.
fn cut(amount: f32, p: vec3<f32>) -> f32 {
    let drifted = p - vec3(0.7 * fume.time.z, 0.25, 0.0) * fume.time.y;
    let knobs = 0.6 * noise3(drifted * 0.8) + 0.4 * noise3(drifted * 2.3 + 7.0);
    return max(amount * (1.0 + CUT) - CUT * 1.9 * knobs * min(amount, CUT_UNDER), 0.0);
}

// How much of the Sun the solid things round the pad leave a place in the fumes: the vehicle's shadow, the
// gantry's. The Sun's shadow maps hold the fumes' own shadow too (`fumes_shadow.wesl`), which the light volume
// has already given: so what the maps say is divided by what the fumes alone would make them say there, and
// where the fumes alone leave too little to divide by, the solid things are taken to shade nothing more.
fn unshaded(p: vec3<f32>, outward: mat4x4<f32>, at: vec2<f32>) -> f32 {
    let room = fume.size.xyz;
    let world = (outward * vec4(p / room * 2.0 - 1.0, 1.0)).xyz;
    let sun_world = normalize((outward * vec4(fume.sun.xyz / room, 0.0)).xyz);
    let map = fetch_directional_shadow(0u, vec4(world, 1.0), sun_world, position_world_to_view(world).z, at);
    let off = p - 0.5 * room;
    let spot = vec2(dot(off, fume.sun_a.xyz), dot(off, fume.sun_b.xyz)) / fume.sun.w + 0.5;
    let beam = textureSampleLevel(shade, stuff_sampler, vec3(spot, 0.5), 0.0);
    let part = saturate((-dot(off, fume.sun.xyz) - beam.y) / max(beam.z - beam.y, 0.01));
    let own = exp(-max(beam.x, 0.0) * part);
    return mix(1.0, saturate(map / max(own, 0.05)), smoothstep(0.2, 0.5, own));
}

// A fraction that is different at every pixel and every frame, for the temporal anti-aliasing to average.
fn dither(at: vec2<f32>) -> f32 {
    let shifted = at + 5.588238 * f32(globals.frame_count % 64u);
    return fract(52.9829189 * fract(0.06711056 * shifted.x + 0.00583715 * shifted.y));
}

fn forward_phase(cosine: f32) -> f32 {
    let g = FORWARD;
    return (1.0 - g * g) / (4.0 * PI * pow(1.0 + g * g - 2.0 * g * cosine, 1.5));
}

// The mesh is the solver's whole box, two units a side; only the part of it that holds anything is drawn: the
// corners the solver found (`bound`), so a haze lying on the ground costs the pixels it covers and no more.
@vertex
fn vertex(vertex_in: Vertex) -> VertexOutput {
    var out: VertexOutput;
    let cube = decompress_vertex(vertex_in, vertex_in.instance_index);
    let low = textureLoad(bounds, vec3(0, 0, 0), 0).xyz;
    let high = textureLoad(bounds, vec3(1, 0, 0), 0).xyz;
    let corner = mix(low, high, cube.position * 0.5 + 0.5) / fume.size.xyz * 2.0 - 1.0;
    let outward = mesh_functions::get_world_from_local(vertex_in.instance_index);
    out.world_position = mesh_functions::mesh_position_local_to_world(outward, vec4(corner, 1.0));
    out.position = position_world_to_clip(out.world_position.xyz);
    out.world_normal = vec3(0.0, 1.0, 0.0);
    @if(VERTEX_UVS_A)
    out.uv = cube.uv;
    @if(VERTEX_OUTPUT_INSTANCE_INDEX)
    out.instance_index = vertex_in.instance_index;
    return out;
}

@fragment
fn fragment(
    @if(MULTISAMPLED) @builtin(sample_index) sample_index: u32,
    in: VertexOutput,
) -> @location(0) vec4<f32> {
    @if(!MULTISAMPLED) let sample_index = 0u;
    // The eye and its ray in the box's frame: the box is two units a side, scaled to its size.
    let room = fume.size.xyz;
    let inward = mesh_functions::get_local_from_world(in.instance_index);
    let eye = ((inward * vec4(view.world_position, 1.0)).xyz * 0.5 + 0.5) * room;
    let there = ((inward * vec4(in.world_position.xyz, 1.0)).xyz * 0.5 + 0.5) * room;
    let reach = distance(in.world_position.xyz, view.world_position);
    let ray = (there - eye) / reach;

    let low = textureLoad(bounds, vec3(0, 0, 0), 0).xyz;
    let high = textureLoad(bounds, vec3(1, 0, 0), 0).xyz;
    let a = (low - eye) / ray;
    let b = (high - eye) / ray;
    let lo = min(a, b);
    let hi = max(a, b);
    let enters = max(max(lo.x, lo.y), max(lo.z, 0.0));
    var leaves = min(min(hi.x, hi.y), hi.z);
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

    // Where along the ray there is anything.
    let jitter = dither(in.position.xy);
    var begins = 1.0e9;
    var ends = -1.0e9;
    for (var i = 0; i < COARSE_STEPS; i++) {
        let t = enters + (f32(i) + jitter) * COARSE;
        if t > leaves + COARSE {
            break;
        }
        let found = textureSampleLevel(occupied, stuff_sampler, (eye + ray * min(t, leaves)) / room, 0.0).x;
        if found > 2.0e-4 {
            begins = min(begins, t - COARSE);
            ends = t + COARSE;
        }
    }
    begins = max(begins, enters);
    ends = min(ends, leaves);
    if ends <= begins {
        discard;
    }

    let outward = mesh_functions::get_world_from_local(in.instance_index);
    let stride = max((ends - begins) / FINE_STEPS, FINEST);
    let cosine = dot(ray, fume.sun.xyz);
    let straight = forward_phase(cosine);
    let sun_high = saturate(fume.sun.y);
    var light = vec3(0.0);
    var through = 1.0;
    var t = begins + stride * jitter;
    var solids = 1.0;
    var lit_steps = 0;
    for (var i = 0; i < 64; i++) {
        if t >= ends || through < 0.01 {
            break;
        }
        let p = eye + ray * t;
        t += stride;
        let here = textureSampleLevel(stuff, stuff_sampler, p / room, 0.0).xy;
        let whole = here.x + here.y;
        if whole < 1.0e-4 {
            continue;
        }
        let amount = cut(whole, p);
        if amount <= 0.0 {
            continue;
        }
        var reaches = textureSampleLevel(lit, stuff_sampler, p / room, 0.0);
        // (the solid things' shadows are read at every fourth step that finds fumes: they are broad)
        if lit_steps % 4 == 0 {
            solids = unshaded(p, outward, in.position.xy);
        }
        lit_steps += 1;
        reaches.x *= solids;
        let colour = (DUST * here.x + VAPOUR * here.y) / whole;
        // The Sun: once scattered, straight on; and the orders after it, from all round and less shaded.
        let sun = fume.sunlight.xyz * (straight * reaches.x + DEEPER_ORDERS / (4.0 * PI) * pow(reaches.x, DEEPER_SHADE));
        // The sky from above and the sunlit ground from below.
        let sky = fume.skylight.xyz * (0.25 + 0.75 * reaches.z) * 0.5;
        let ground = fume.sunlight.xyz * (GROUND_ALBEDO / PI) * sun_high * 0.5 * sqrt(reaches.x) * exp(-p.y / 12.0);
        // The fire: its light falls off as the square of how far it is, and is scattered every way alike.
        let off = fume.lamp.xyz - p;
        let fire = fume.lamp_colour.xyz * fume.lamp.w / max(dot(off, off), 0.5) * reaches.y / (4.0 * PI);
        let stopped = 1.0 - exp(-amount * stride);
        light += through * stopped * colour * (sun + sky + ground + fire);
        through *= 1.0 - stopped;
    }
    if through > 0.999 {
        discard;
    }
    // (a figure that is not a number would be kept by the temporal anti-aliasing for good: none gets out)
    return vec4(clamp(light * view.exposure, vec3(0.0), vec3(1.0e4)), clamp(1.0 - through, 0.0, 1.0));
}
