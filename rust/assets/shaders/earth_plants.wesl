// The plants round the site (sr-render/src/earth/leaves.rs): the engine's own surface, moved by the wind
// (earth_sway.wesl), and in the cumulus' shadows as the ground under them is (earth_frame.wesl `through_cloud`).
// Each vertex carries its place, metres east and north of the site, as its first texture coordinate, and its height
// above its plant's foot and its plant's own number as its second.

import bevy_pbr::render::{
    pbr_fragment::pbr_input_from_standard_material,
    forward_io::{Vertex, VertexOutput, FragmentOutput, decompress_vertex},
    pbr_functions::{apply_pbr_lighting, main_pass_post_lighting_processing},
    mesh_functions,
    view_transformations::position_world_to_clip,
};
import super::earth_frame::through_cloud;
import super::earth_sway::{frame, sway};

@group(constants::MATERIAL_BIND_GROUP) @binding(101) var cumulus_map: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(102) var cumulus_sampler: sampler;
@group(constants::MATERIAL_BIND_GROUP) @binding(103) var day_map: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(104) var day_sampler: sampler;

// (the engine's own mesh vertex, for a mesh that is neither skinned nor morphed, with the wind added)
@vertex
fn vertex(vertex_in: Vertex) -> VertexOutput {
    var out: VertexOutput;
    let vertex = decompress_vertex(vertex_in, vertex_in.instance_index);
    let world_from_local = mesh_functions::get_world_from_local(vertex_in.instance_index);
    var world = mesh_functions::mesh_position_local_to_world(world_from_local, vec4<f32>(vertex.position, 1.0));
    @if(VERTEX_UVS_A && VERTEX_UVS_B) {
        world = vec4(world.xyz + sway(vertex.uv, vertex.uv_b.x, vertex.uv_b.y, frame.sun.w), world.w);
    }
    out.world_position = world;
    out.position = position_world_to_clip(world.xyz);
    @if(VERTEX_NORMALS)
    out.world_normal = mesh_functions::mesh_normal_local_to_world(vertex.normal, vertex_in.instance_index);
    @if(VERTEX_UVS_A)
    out.uv = vertex.uv;
    @if(VERTEX_UVS_B)
    out.uv_b = vertex.uv_b;
    @if(VERTEX_TANGENTS)
    out.world_tangent = mesh_functions::mesh_tangent_local_to_world(world_from_local, vertex.tangent, vertex_in.instance_index);
    @if(VERTEX_COLORS)
    out.color = vertex.color;
    @if(VERTEX_OUTPUT_INSTANCE_INDEX)
    out.instance_index = vertex_in.instance_index;
    @if(VISIBILITY_RANGE_DITHER)
    out.visibility_range_dither = mesh_functions::get_visibility_range_dither_level(
        vertex_in.instance_index, world_from_local[3]);
    return out;
}

@fragment
fn fragment(in: VertexOutput, @builtin(front_facing) is_front: bool) -> FragmentOutput {
    var pbr = pbr_input_from_standard_material(in, is_front);
    var place = vec2(0.0);
    @if(VERTEX_UVS_A) {
        place = in.uv;
    }
    pbr.directional_shadow_factor = through_cloud(frame, cumulus_map, cumulus_sampler, day_map, day_sampler, place);
    var out: FragmentOutput;
    out.color = apply_pbr_lighting(pbr);
    out.color = main_pass_post_lighting_processing(pbr, out.color);
    return out;
}
