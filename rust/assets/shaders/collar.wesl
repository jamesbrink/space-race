// The collar of vapour round a shoulder near the speed of sound (sr-render/src/shock/collar.rs): a thin sheet of
// mist swept a little aft, soft at the shoulder and feathered out toward the shock, a soft shell mottled and
// flickering as the clock runs; thicker where it is seen edge on; lit almost only by the Sun scattered forward,
// so it shows where the Sun is behind it and hardly at all elsewhere.

import bevy_pbr::render::{
    forward_io::VertexOutput,
    mesh_view_bindings::view,
};

struct Mist {
    // how dense (0 to 1), the clock (s), the shoulder's radius (m)
    state: vec4<f32>,
    sun: vec4<f32>,
    sunlight: vec4<f32>,
    skylight: vec4<f32>,
}

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> mist: Mist;

const PI: f32 = 3.14159265;
// What fine droplets send back: white. How much a fully dense sheet hides seen square on: little, it is a thin
// mist. How far forward it throws the light (Henyey and Greenstein's g: droplets this fine throw nearly all of it
// forward, so the collar is bright where the Sun is behind it and next to nothing where it is not). How much of
// what is behind it a sheet hides for the light it scatters. All estimated.
const TINT: vec3<f32> = vec3(0.96, 0.96, 0.97);
const THICK: f32 = 1.2;
const FORWARD: f32 = 0.8;
const HIDES: f32 = 0.3;
// The light of the scattering after the first, against the first: small in a sheet this thin. Estimated.
const DEEPER_ORDERS: f32 = 0.15;

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
fn fragment(in: VertexOutput) -> @location(0) vec4<f32> {
    let density = mist.state.x;
    let clock = mist.state.y;
    let about = in.uv.x;
    let along = in.uv.y;
    // Soft where it starts at the shoulder and feathered to nothing at its outer edge, the shock's place
    // wavering round the body; streaked along the flow and flickering as the flow through it does.
    let ring = vec2(cos(6.2831853 * about), sin(6.2831853 * about));
    let flicker = noise3(vec3(ring * 1.4 + 5.0, clock * 9.0));
    let reach = 0.75 + 0.25 * flicker;
    let shape = smoothstep(0.0, 0.2, along) * (1.0 - smoothstep(0.3 * reach, reach, along));
    // (read round a circle, so the sheet has no seam)
    let streaks = noise3(vec3(ring * 9.0, along * 1.5 - clock * 5.0));
    let fine = noise3(vec3(ring * 23.0 + 3.0, along * 3.0 - clock * 8.0));
    // (a soft shell, mottled: the flow through it is too fast for streaks to be seen, as on the films)
    let amount = density * shape * (0.7 + 0.2 * streaks + 0.1 * fine);
    let toward_eye = normalize(view.world_position - in.world_position.xyz);
    let slant = 1.0 / max(abs(dot(normalize(in.world_normal), toward_eye)), 0.2);
    let hides = 1.0 - exp(-THICK * amount * slant);
    if hides < 1.0e-3 {
        discard;
    }
    let cosine = dot(-toward_eye, normalize(mist.sun.xyz));
    let g = FORWARD;
    let phase = (1.0 - g * g) / (4.0 * PI * pow(1.0 + g * g - 2.0 * g * cosine, 1.5));
    let light = TINT * (mist.sunlight.xyz * (phase + DEEPER_ORDERS / (4.0 * PI)) + 0.1 * mist.skylight.xyz);
    return vec4(clamp(light * view.exposure, vec3(0.0), vec3(1.0e4)) * hides, HIDES * hides);
}
