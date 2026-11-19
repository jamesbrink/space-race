// The box the dust and vapour round the pad are held in (sr-render/src/fumes/material.rs), as a mesh: only so the
// fumes cast their shadow into the Sun's shadow maps (`fumes_shadow.wesl`, the prepass). The fumes themselves are
// marched in their own pass at a quarter of the pixels (`fumes_march.wesl`) and laid over the frame
// (`fumes_lay.wesl`): this mesh's own picture draws nothing.

import bevy_pbr::render::{
    forward_io::{Vertex, VertexOutput, decompress_vertex},
    mesh_functions,
    view_transformations::position_world_to_clip,
};
import super::fumes_frame::{Fume, Source};

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> fume: Fume;
@group(constants::MATERIAL_BIND_GROUP) @binding(6) var bounds: texture_3d<f32>;

// The mesh is the solver's whole box, two units a side; only the part of it that holds anything is drawn: the
// corners the solver found (`bound`), so a haze lying on the ground costs the shadow map the texels it covers.
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
fn fragment(in: VertexOutput) -> @location(0) vec4<f32> {
    discard;
    return vec4(0.0);
}
