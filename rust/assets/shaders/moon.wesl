// The Moon (sr-render/src/night/moon.rs): a ball at its true place and size, its face from the LRO's colour map
// (public/front/moon.colour.jpg, the web build's), lit by the Sun where the Sun is and by the Earth on its night
// side, in cd/m^2. The atmosphere's pass lays the air over it as it does over anything that far.

import bevy_pbr::render::{
    forward_io::VertexOutput,
    mesh_view_bindings::view,
};

struct MoonLight {
    // the Moon's own axes in the site's frame: toward the Earth (the prime meridian), east, north
    axis_x: vec4<f32>,
    axis_y: vec4<f32>,
    axis_z: vec4<f32>,
    // toward the Sun; w: its light above the air, lux
    sun: vec4<f32>,
    // x: the Earth's light on it, lux; y: the most a lit face is drawn at on the screen; z: how strongly it is drawn
    glow: vec4<f32>,
}

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> moon: MoonLight;
@group(constants::MATERIAL_BIND_GROUP) @binding(1) var face: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(2) var face_sampler: sampler;

// The Moon's geometric albedo in V (0.12: Allen's Astrophysical Quantities, 4th ed., 12.3) over the map's mean
// linear value (0.307: public/front/moon.json): what a texel of the map reflects. Documented, both.
const ALBEDO: f32 = 0.12 / 0.307;
const PI: f32 = 3.14159265;

@fragment
fn fragment(in: VertexOutput) -> @location(0) vec4<f32> {
    let n = normalize(in.world_normal);
    let to_eye = -normalize(in.world_position.xyz);
    // the place on the Moon this is
    let x = dot(n, moon.axis_x.xyz);
    let y = dot(n, moon.axis_y.xyz);
    let z = dot(n, moon.axis_z.xyz);
    let uv = vec2(0.5 + atan2(y, x) / (2.0 * PI), 0.5 - asin(clamp(z, -1.0, 1.0)) / PI);
    let colour = textureSample(face, face_sampler, uv).rgb * ALBEDO;
    // Lommel-Seeliger, the law the regolith keeps: the full Moon is as bright at its limb as at its middle (its
    // brightening toward a gibbous Moon's lit limb held back where the eye's ray grazes: the regolith's roughness)
    let mu0 = dot(n, moon.sun.xyz);
    let mu = max(dot(n, to_eye), 0.02);
    let lit = smoothstep(-0.01, 0.03, mu0) * 2.0 * max(mu0, 0.0) / (max(mu0, 0.0) + max(mu, 0.3));
    let sunlit = colour * moon.sun.w / PI * lit;
    // the Earth's light on the night side, from the Earth, which is the eye's side (Lommel-Seeliger's 1 there)
    let earthlit = colour * moon.glow.x / PI;
    let luminance = (sunlit + earthlit) * moon.glow.z;
    // An eye looking at the Moon sees its seas and highlands; drawn at the night's exposure its face would be white.
    // So the lit face is held to `glow.y` on the screen (above the bloom's threshold, so it still glows), the night
    // side and the earthshine in proportion. Estimated: the eye's own adaptation to a bright small thing.
    let full = moon.sun.w * 0.12 / PI * view.exposure * moon.glow.z;
    let held = min(1.0, moon.glow.y / max(full, 1e-9));
    return vec4(luminance * view.exposure * held, 1.0);
}
