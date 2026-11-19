// The plants round the site (sr-render/src/earth/leaves.rs): the engine's own surface, in the cumulus' shadows as
// the ground under them is (earth_frame.wesl `through_cloud`). Each vertex carries its place, metres east and
// north of the site, as its texture coordinate.

import bevy_pbr::render::{
    pbr_fragment::pbr_input_from_standard_material,
    forward_io::{VertexOutput, FragmentOutput},
    pbr_functions::{apply_pbr_lighting, main_pass_post_lighting_processing},
};
import super::earth_frame::{EarthFrame, through_cloud};

@group(constants::MATERIAL_BIND_GROUP) @binding(100) var<uniform> frame: EarthFrame;
@group(constants::MATERIAL_BIND_GROUP) @binding(101) var cumulus_map: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(102) var cumulus_sampler: sampler;
@group(constants::MATERIAL_BIND_GROUP) @binding(103) var day_map: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(104) var day_sampler: sampler;

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
