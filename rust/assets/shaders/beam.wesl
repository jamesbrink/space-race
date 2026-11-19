// A lamp's beam in the air (sr-render/src/lamps/beam.rs): the light the haze throws back toward the eye from inside
// the lamp's cone, marched along the eye's ray through it, falling with the square of the distance from the lamp and
// with the cone's edge as the spot light's does. Drawn on the cone's far faces, added to the frame; what stands in
// front is found from the depth already drawn. No shadow in the beam: it passes through the lattice it lights.

import bevy_pbr::render::{
    forward_io::VertexOutput,
    mesh_functions,
    mesh_view_bindings::{view, globals},
    view_transformations::{frag_coord_to_ndc, position_ndc_to_world},
};
import bevy_pbr::prepass::utils::prepass_depth;

struct Beam {
    // the lamp's light along its axis, cd, as colour; w: the cosine of the cone's whole half-angle
    light: vec4<f32>,
    // x: the cosine where its edge begins to fade; y: the air's scattering, 1/m; z: its forward lean (g); w: length
    shape: vec4<f32>,
}

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> beam: Beam;

const STEPS: i32 = 20;
// A lamp's light is taken as coming from a bank this broad, m, not a point: nearer than this the haze is not lit
// harder. Estimated: a pole's three floods on their crossarm.
const BANK: f32 = 5.0;
const PI: f32 = 3.14159265;

// How much of what the haze scatters goes this way, by the angle from straight on (Henyey and Greenstein).
fn phase(cosine: f32, g: f32) -> f32 {
    let denom = 1.0 + g * g - 2.0 * g * cosine;
    return (1.0 - g * g) / (4.0 * PI * denom * sqrt(denom));
}

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
    let stands = mesh_functions::get_world_from_local(in.instance_index);
    let apex = stands[3].xyz;
    let axis = -normalize(stands[2].xyz);
    let eye = view.world_position;
    let ray = normalize(in.world_position.xyz - eye);
    var leaves = distance(in.world_position.xyz, eye);
    @if(DEPTH_PREPASS) {
        let depth = prepass_depth(in.position, sample_index);
        if depth > 0.0 {
            let ndc = frag_coord_to_ndc(vec4(in.position.xy, depth, 1.0));
            leaves = min(leaves, distance(position_ndc_to_world(ndc), eye));
        }
    }
    // where the ray comes into the cone: the nearer crossing of its surface on the lit side, or the eye if it is in it
    let c2 = beam.light.w * beam.light.w;
    let w = eye - apex;
    let vd = dot(ray, axis);
    let wd = dot(w, axis);
    let a = vd * vd - c2;
    let b = 2.0 * (vd * wd - c2 * dot(ray, w));
    let cc = wd * wd - c2 * dot(w, w);
    var enters = 0.0;
    let disc = b * b - 4.0 * a * cc;
    if disc > 0.0 && abs(a) > 1e-6 {
        let root = sqrt(disc);
        let t0 = min((-b - root) / (2.0 * a), (-b + root) / (2.0 * a));
        let t1 = max((-b - root) / (2.0 * a), (-b + root) / (2.0 * a));
        // (a crossing on the lamp's side of its apex, before the far face)
        for (var k = 0; k < 2; k++) {
            let t = select(t1, t0, k == 0);
            if t > 0.0 && t < leaves - 0.01 && dot(eye + ray * t - apex, axis) > 0.0 {
                enters = max(enters, t);
            }
        }
    }
    if leaves <= enters {
        discard;
    }
    let stride = (leaves - enters) / f32(STEPS);
    var t = enters + stride * dither(in.position.xy);
    var seen = vec3(0.0);
    for (var i = 0; i < STEPS; i++) {
        let p = eye + ray * t - apex;
        let far = max(length(p), BANK);
        let going = p / far;
        let cosine = dot(going, axis);
        let edge = smoothstep(beam.light.w, beam.shape.x, cosine) * (1.0 - smoothstep(0.7, 1.0, far / beam.shape.w));
        // the lamp's light here, lux, and what the haze sends back toward the eye of it
        let lux = beam.light.rgb * edge / (far * far);
        seen += lux * beam.shape.y * phase(dot(going, -ray), beam.shape.z) * stride;
        t += stride;
    }
    return vec4(seen * view.exposure, 0.0);
}
