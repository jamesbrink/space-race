// The night sky's own light behind the stars (sr-render/src/night/band.rs): the airglow, brightest toward the
// horizon where its layer is looked along, and the Milky Way from NASA's map (public/sky/milkyway.jpg, the web
// build's), in the catalogue's frame. In cd/m^2, drawn like the stars before the sky is laid over them.

import bevy_pbr::render::{
    forward_io::VertexOutput,
    mesh_view_bindings::view,
};

struct StarSky {
    turn_x: vec4<f32>,
    turn_y: vec4<f32>,
    turn_z: vec4<f32>,
    up: vec4<f32>,
    far: vec4<f32>,
}

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> sky: StarSky;
@group(constants::MATERIAL_BIND_GROUP) @binding(1) var band: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(2) var band_sampler: sampler;

// The natural night sky at the zenith, cd/m^2: 172 micro-candela (Duriscoe, PASP 125, 2013), airglow about half of it
// and the zodiacal light most of the rest (NPS); both taken here as one glow from a layer 90 km up. Documented.
const ZENITH: f32 = 1.72e-4;
// The airglow layer's height over the Earth's radius: van Rhijn's factor for a thin shell 90 km up.
const SHELL: f32 = 6371.0 / 6461.0;
// The Milky Way's brightest (the Sagittarius star clouds, about 20.5 magnitudes an arcsecond squared) over the
// map's brightest texel, cd/m^2 a unit of the map's linear light. Estimated from that figure.
const GALAXY: f32 = 5.0e-4;
// The glow's colour: the green oxygen line with the red under it, seen dim. Estimated.
const GLOW: vec3<f32> = vec3(0.86, 1.0, 0.92);

@fragment
fn fragment(in: VertexOutput) -> @location(0) vec4<f32> {
    let toward = normalize(in.world_position.xyz);
    let up = sky.up.xyz;
    let air = sky.up.w;
    // van Rhijn: the layer is crossed slantwise toward the horizon; from above the air it is mostly below the eye
    let s = dot(toward, up);
    let slant = inverseSqrt(max(1.0 - SHELL * SHELL * (1.0 - s * s), 0.03));
    let glow = GLOW * ZENITH * slant * air;
    // the map, in the catalogue's frame: right ascension 0 in the middle, increasing to the left; north up
    let turn = mat3x3(sky.turn_x.xyz, sky.turn_y.xyz, sky.turn_z.xyz);
    let d = transpose(turn) * toward;
    let ra = atan2(d.y, d.x);
    let uv = vec2(0.5 - ra / 6.2831853, 0.5 - asin(clamp(d.z, -1.0, 1.0)) / 3.14159265);
    // (looked up with the gradient of a place that has no seam, or the wrap at 12 hours would draw a line)
    let flat_uv = vec2(fract(uv.x + 0.5) - 0.5, uv.y);
    var c = textureSampleGrad(band, band_sampler, uv, dpdx(flat_uv), dpdy(flat_uv)).rgb;
    // The map is a long exposure's: brown and orange. To the eye the band is a soft grey-white with dark rifts and
    // next to no colour (too dim for the eye's colour): taken nine tenths of the way to grey (the web build's).
    let l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(c, vec3(l) * vec3(0.96, 0.98, 1.06), 0.9);
    let luminance = (glow + c * GALAXY) * sky.far.y;
    return vec4(luminance * view.exposure, 1.0);
}
