// A puff of smoke, steam or dust (sr-render/src/smoke.rs): a ball whose edge is soft because it is seen less
// squarely there, shaded as a ball by the Sun and filled by the sky. Its age (thousandths of its life) is its
// mesh's tag: it thins as it ages.

import bevy_pbr::render::{
    forward_io::VertexOutput,
    mesh_functions,
    mesh_view_bindings::view,
};

struct Light {
    sun: vec4<f32>,
    sunlight: vec4<f32>,
    skylight: vec4<f32>,
}

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> light: Light;

// Dust off a concrete pad, and the steam of its water: pale, a little warm. Estimated.
const TINT: vec3<f32> = vec3(0.82, 0.78, 0.72);
const PI: f32 = 3.14159265;

@fragment
fn fragment(in: VertexOutput) -> @location(0) vec4<f32> {
    let age = f32(mesh_functions::get_tag(in.instance_index)) / 1000.0;
    let normal = normalize(in.world_normal);
    let toward_eye = normalize(view.world_position - in.world_position.xyz);
    let squarely = abs(dot(normal, toward_eye));
    // Thick through the middle, nothing at the edge; in at once, and out slowly.
    let thick = squarely * squarely * squarely * smoothstep(0.0, 0.06, age) * pow(1.0 - age, 2.0) * 0.2;
    // The Sun on the side toward it, wrapped round as light is in a cloud of dust; the sky on all of it.
    let sunward = saturate(dot(normal, light.sun.xyz) * 0.6 + 0.4);
    let lit = TINT * (light.sunlight.xyz * sunward / PI + light.skylight.xyz);
    return vec4(lit * thick * view.exposure, thick);
}
