//! Frost density is the base-colour map's alpha. The material stays opaque all the way down to bare paint.
import bevy_pbr::render::{
    forward_io::{VertexOutput, FragmentOutput},
    pbr_fragment::pbr_input_from_standard_material,
    pbr_functions::{apply_pbr_lighting, main_pass_post_lighting_processing},
};

@group(constants::MATERIAL_BIND_GROUP) @binding(100) var<uniform> amount: f32;

@fragment
fn fragment(in: VertexOutput, @builtin(front_facing) front: bool) -> FragmentOutput {
    var pbr = pbr_input_from_standard_material(in, front);
    let density = pbr.material.base_color.a;
    // Weak patches clear first. Both endpoints are exact, including a clear frame at full frost.
    let retained = smoothstep(0.0, 0.23, density - (1.0 - amount));
    let coat = density * retained * sqrt(amount);
    let ice = vec3(0.89, 0.93, 0.96) * (0.91 + 0.09 * density);
    pbr.material.base_color = vec4(mix(pbr.material.base_color.rgb, ice, coat), 1.0);
    pbr.material.perceptual_roughness = mix(pbr.material.perceptual_roughness, 0.96, coat);
    pbr.N = normalize(mix(normalize(in.world_normal), pbr.N, 0.18 + 0.82 * coat));
    var out: FragmentOutput;
    out.color = main_pass_post_lighting_processing(pbr, apply_pbr_lighting(pbr));
    return out;
}
