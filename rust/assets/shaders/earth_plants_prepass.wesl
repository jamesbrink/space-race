// The plants' depth, normals, motion and shadows (sr-render/src/earth/leaves.rs): the engine's own prepass vertex,
// for a mesh that is neither skinned nor morphed, moved by the wind as the main pass moves it (earth_sway.wesl).
// Where it was a frame ago is reckoned from the clock less the clock's last step, so the temporal filter follows it.

import bevy_pbr::{
    prepass::io::{Vertex, VertexOutput, decompress_vertex},
    render::{
        mesh_functions,
        view_transformations::position_world_to_clip,
    },
};
import super::earth_sway::{frame, sway};

@vertex
fn vertex(vertex_in: Vertex) -> VertexOutput {
    var out: VertexOutput;
    let vertex = decompress_vertex(vertex_in, vertex_in.instance_index);
    let world_from_local = mesh_functions::get_world_from_local(vertex_in.instance_index);
    var world = mesh_functions::mesh_position_local_to_world(world_from_local, vec4<f32>(vertex.position, 1.0));
    var moved = vec3(0.0);
    var was = vec3(0.0);
    @if(VERTEX_UVS_A && VERTEX_UVS_B) {
        moved = sway(vertex.uv, vertex.uv_b.x, vertex.uv_b.y, frame.sun.w);
        was = sway(vertex.uv, vertex.uv_b.x, vertex.uv_b.y, frame.sun.w - frame.day.z);
    }
    out.world_position = vec4(world.xyz + moved, world.w);
    out.position = position_world_to_clip(out.world_position.xyz);
    @if(UNCLIPPED_DEPTH_ORTHO_EMULATION) {
        out.unclipped_depth = out.position.z;
        out.position.z = min(out.position.z, 1.0);
    }
    @if(VERTEX_UVS_A)
    out.uv = vertex.uv;
    @if(VERTEX_UVS_B)
    out.uv_b = vertex.uv_b;
    @if(NORMAL_PREPASS_OR_DEFERRED_PREPASS) {
        @if(VERTEX_NORMALS)
        out.world_normal = mesh_functions::mesh_normal_local_to_world(vertex.normal, vertex_in.instance_index);
        @if(VERTEX_TANGENTS)
        out.world_tangent = mesh_functions::mesh_tangent_local_to_world(world_from_local, vertex.tangent, vertex_in.instance_index);
    }
    @if(VERTEX_COLORS)
    out.color = vertex.color;
    @if(MOTION_VECTOR_PREPASS) {
        let prev_model = mesh_functions::get_previous_world_from_local(vertex_in.instance_index);
        let before = mesh_functions::mesh_position_local_to_world(prev_model, vec4<f32>(vertex.position, 1.0));
        out.previous_world_position = vec4(before.xyz + was, before.w);
    }
    @if(VERTEX_OUTPUT_INSTANCE_INDEX)
    out.instance_index = vertex_in.instance_index;
    @if(VISIBILITY_RANGE_DITHER)
    out.visibility_range_dither = mesh_functions::get_visibility_range_dither_level(
        vertex_in.instance_index, world_from_local[3]);
    return out;
}
