// The collar of vapour round a shoulder near the speed of sound (sr-render/src/shock/collar.rs): a thin open
// bell of mist, densest just aft of the shoulder and gone at its foot, streaked along the flow and boiling as the
// clock runs; thicker where it is seen edge on; lit by the Sun, mostly forward, and by the sky.

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
// What fine droplets send back: white. How much a fully dense sheet hides seen square on. How far forward it
// throws the light (Henyey and Greenstein's g: fine droplets throw most of it forward). All estimated.
const TINT: vec3<f32> = vec3(0.96, 0.96, 0.97);
const THICK: f32 = 2.5;
const FORWARD: f32 = 0.6;
// The light of the scattering after the first, against the first. Estimated, as the fumes' is.
const DEEPER_ORDERS: f32 = 0.8;

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
    // Densest just aft of the shoulder, gone at the foot; streaked along the flow and boiling.
    let shape = smoothstep(0.0, 0.06, along) * pow(1.0 - along, 1.3);
    // (read round a circle, so the bell has no seam)
    let ring = vec2(cos(6.2831853 * about), sin(6.2831853 * about));
    let streaks = noise3(vec3(ring * 6.4, along * 3.0 - clock * 6.0));
    let boil = noise3(vec3(ring * 1.8 + 5.0, along * 7.0 - clock * 11.0));
    let amount = density * shape * saturate(0.15 + 0.9 * streaks * (0.4 + 0.9 * boil));
    let toward_eye = normalize(view.world_position - in.world_position.xyz);
    let slant = 1.0 / max(abs(dot(normalize(in.world_normal), toward_eye)), 0.2);
    let hides = 1.0 - exp(-THICK * amount * slant);
    if hides < 1.0e-3 {
        discard;
    }
    let cosine = dot(-toward_eye, normalize(mist.sun.xyz));
    let g = FORWARD;
    let phase = (1.0 - g * g) / (4.0 * PI * pow(1.0 + g * g - 2.0 * g * cosine, 1.5));
    let light = TINT * (mist.sunlight.xyz * (phase + DEEPER_ORDERS / (4.0 * PI)) + 0.5 * mist.skylight.xyz);
    return vec4(clamp(light * view.exposure, vec3(0.0), vec3(1.0e4)) * hides, hides);
}
