// The glare of a lit lamp's head seen from the eye (sr-render/src/lamps/glare.rs): the light it sends toward the eye
// spread by the eye's lens into a hot core, a halo and a star of spikes, the larger the more of it reaches the eye.
// The spikes and the halo are for the look (a lens's, as the owner's reference stills have them); how strong is from
// the lamp's light toward the eye. Hidden whole when anything stands in front of the head.

import bevy_pbr::render::{
    mesh_view_bindings::view,
    view_transformations::{frag_coord_to_ndc, position_ndc_to_world},
};
import bevy_pbr::prepass::utils::prepass_depth;

// How much nearer than the head something may be and not hide it, m: the lamp's own bowl and crossarm.
const HOUSING: f32 = 3.0;
// And what is nearer than this share of the head's distance hides it: the head's own fitting, and what the model
// stands round it, are within the rest.
const NEARER: f32 = 0.8;

struct Vertex {
    // where the lamp's head is
    @location(0) head: vec3<f32>,
    @location(1) corner: vec2<f32>,
    // what reaches the eye of its light, as colour on the screen's scale; w: the glare's radius, pixels
    @location(2) light: vec4<f32>,
}

struct Out {
    @builtin(position) clip: vec4<f32>,
    // pixels from the head's middle; z: the glare's radius, pixels; w: how far the head is, m
    @location(0) offset: vec4<f32>,
    // what reaches the eye, as colour on the screen's scale
    @location(1) light: vec3<f32>,
    // the head's middle: pixel, and its depth
    @location(2) centre: vec3<f32>,
}

@vertex
fn vertex(v: Vertex) -> Out {
    var out: Out;
    let radius = v.light.w;
    var clip = view.clip_from_world * vec4(v.head, 1.0);
    let ndc = clip.xyz / clip.w;
    out.centre = vec3((ndc.x * 0.5 + 0.5) * view.viewport.z, (0.5 - ndc.y * 0.5) * view.viewport.w, ndc.z);
    clip = vec4(clip.xy + v.corner * radius * 2.0 / view.viewport.zw * clip.w, clip.zw);
    out.clip = clip;
    out.offset = vec4(v.corner * radius, radius, distance(v.head, view.world_position));
    out.light = v.light.rgb;
    return out;
}

@fragment
fn fragment(in: Out) -> @location(0) vec4<f32> {
    let radius = in.offset.z;
    if radius < 1.0 {
        discard;
    }
    // hidden if anything stands in front of the head
    // (what stands at the head's own pixel, if it is nearer than the head by more than the lamp's own housing)
    @if(DEPTH_PREPASS) {
        let depth = prepass_depth(vec4(in.centre.xy, 0.0, 1.0), 0u);
        if depth > 0.0 {
            let ndc = frag_coord_to_ndc(vec4(in.centre.xy, depth, 1.0));
            let met = distance(position_ndc_to_world(ndc), view.world_position);
            if met < in.offset.w * NEARER - HOUSING {
                discard;
            }
        }
    }
    let p = in.offset.xy;
    let r = length(p) / radius;
    let core = exp(-dot(p, p) / 4.0);
    let halo = 0.01 / (1.0 + 80.0 * r * r) * (1.0 - smoothstep(0.5, 1.0, r));
    // four long spikes square to the screen and four short ones between, thin, fading out along their length
    let thin = 0.9;
    let along = pow(max(1.0 - r, 0.0), 3.0);
    let spikes = (exp(-abs(p.x) / thin) + exp(-abs(p.y) / thin)) * along * 0.6
        + (exp(-abs(p.x + p.y) / (thin * 1.4)) + exp(-abs(p.x - p.y) / (thin * 1.4))) * pow(max(1.0 - 2.2 * r, 0.0), 3.0) * 0.25;
    let shape = core + halo + spikes;
    if shape < 1e-3 {
        discard;
    }
    return vec4(in.light * shape, 0.0);
}
