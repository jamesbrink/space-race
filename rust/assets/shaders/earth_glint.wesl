// The Sun on the water (earth.wesl). The engine's own lobe is not used for it: a sea is not a surface of one
// roughness but a crowd of small tilted facets, and how the Sun comes back off it depends on how many of them a
// pixel holds. So the Sun's light on the water is worked here, after Cox and Munk (1954):
//
// - its mean, the glint every photograph from the air shows: the facets' slopes spread as a Gaussian of the day's
//   mean square slope, which is a Beckmann distribution of that roughness, with its masking (Walter and others
//   2007), and water's Fresnel;
// - and its sparkle: of the facets in a patch of sea a pixel across, the number tilted just so as to send the
//   Sun's disc to the eye is a Poisson count about its mean (Zirr and Kaplanyan 2016 do the same for a metal).
//   Near the eye a patch holds a handful of facets and most patches are dark while one flashes the Sun itself;
//   from far enough off a pixel holds thousands and the count is its mean, the soft glint seen from orbit.
//
// The count is drawn per patch of sea (a power of two across, fixed to the sea and not to the screen, so it holds
// still as the eye moves) and per quarter second, faded from one draw to the next, so that a flash is never a
// single frame's: the temporal filter keeps it and does not throw it away as a firefly.

import bevy_pbr::render::mesh_view_bindings as view_bindings;
import super::earth_noise::{lattice3, grain};

const PI: f32 = 3.14159265;
// Water's reflectance at normal incidence (refractive index 1.334: (0.334 / 2.334)^2).
const WATER_F0: f32 = 0.0205;
// The slope variance of the Sun's disc itself as seen in a mirror: a calm sea's glint is never smaller than the Sun.
const SUN_SPREAD: f32 = 2.2e-5;
// The side of one facet of the sea that flashes as one, m: about half a capillary wave (1.7 cm crest to crest).
// Estimated.
// A facet is not flat: a capillary wavelet is curved, and sends the Sun back over a cone far wider than the Sun's
// disc, so each holds a small bright point of the Sun over a range of tilts. The solid angle of that cone, sr:
// estimated (a wavelet curved through about six degrees), and what sets how dense the sparkle is near the eye.
const WAVELET: f32 = 0.01;
const FACET: f32 = 0.012;
// The brightest a flash is drawn, in the scene's own units after exposure: about a hundred times sunlit white
// paint. A flash is the Sun itself, tens of thousands of times that, in a few square millimetres: spread over a
// pixel it is still far more than the screen can show, and only its bloom says so. Estimated.
const FLASH: f32 = 60.0;
// How often a patch's count is drawn again, a second. Estimated: the sea's facets turn faster than this, but a
// flash shorter than the temporal filter's memory would be averaged away.
const TICKS: f32 = 4.0;

// How much of a sunbeam reaches a point after the air it came through (the engine's own table: the same light the
// engine lights everything else with), 1 without the engine's atmosphere.
fn through_air(p: vec3<f32>, l: vec3<f32>) -> vec3<f32> {
    var t = vec3(1.0);
    @if(ATMOSPHERE) {
        let air = view_bindings::atmosphere;
        let q = (air.world_to_atmosphere * vec4(p, 1.0)).xyz;
        let r = max(length(q), air.inner_radius + 1.0);
        t = bevy_pbr::render::pbr_lighting::sample_transmittance_lut(r, clamp(dot(l, q) / max(length(q), 1.0), -1.0, 1.0));
    }
    return t;
}

// The Sun's light where it falls on a point, as the engine counts it: its colour and strength, the air it came
// through, the shadows of what stands in it (`shade`, the cloud's, 0 to 1 lit), and the eye's exposure.
fn sunlight(world: vec4<f32>, normal: vec3<f32>, frag: vec2<f32>, shade: f32) -> vec3<f32> {
    if view_bindings::lights.n_directional_lights == 0u {
        return vec3(0.0);
    }
    let light = view_bindings::lights.directional_lights[0];
    let view_z = dot(vec4(
        view_bindings::view.view_from_world[0].z,
        view_bindings::view.view_from_world[1].z,
        view_bindings::view.view_from_world[2].z,
        view_bindings::view.view_from_world[3].z,
    ), world);
    let thrown = bevy_pbr::render::shadows::fetch_directional_shadow(0u, world, normal, view_z, frag);
    return light.color.rgb * through_air(world.xyz, light.direction_to_light) * (thrown * shade)
        * view_bindings::view.exposure;
}

// Toward the Sun, world space.
fn to_sun() -> vec3<f32> {
    return view_bindings::lights.directional_lights[0].direction_to_light;
}

// Smith's masking for a Beckmann surface of mean square slope `mss`, seen at cosine `c` (Walter and others 2007).
fn masked(c: f32, mss: f32) -> f32 {
    let a = c / (sqrt(mss) * sqrt(max(1.0 - c * c, 1.0e-6)));
    if a >= 1.6 {
        return 0.0;
    }
    return (1.0 - 1.259 * a + 0.396 * a * a) / (3.535 * a + 2.181 * a * a);
}

// A Poisson count of mean `mean` from two uniform numbers.
fn poisson(mean: f32, u: vec2<f32>) -> f32 {
    if mean > 12.0 {
        let normal = sqrt(-2.0 * log(max(u.x, 1.0e-6))) * cos(6.2831853 * u.y);
        return max(mean + sqrt(mean) * normal, 0.0);
    }
    var p = exp(-mean);
    var sum = p;
    var k = 0.0;
    for (var i = 0; i < 24; i++) {
        if u.x <= sum {
            break;
        }
        k += 1.0;
        p *= mean / k;
        sum += p;
    }
    return k;
}

// The Sun sent back off the water toward the eye, as a fraction of the Sun's light on it (the reflectance times the
// cosine of the Sun's height over the facet's mean). `n` is the water's normal with the waves that can be seen
// tilted into it, `v` toward the eye, `l` toward the Sun, `mss` the mean square slope of the waves too fine to be
// seen; `p` is the point (m east and north of the site), `side` the side of the sea a pixel covers (m).
fn glint(n: vec3<f32>, v: vec3<f32>, l: vec3<f32>, mss: f32, p: vec2<f32>, side: f32, clock: f32) -> f32 {
    let nl = dot(n, l);
    let nv = dot(n, v);
    if nl <= 0.0 || nv <= 0.0 {
        return 0.0;
    }
    let h = normalize(l + v);
    let nh = clamp(dot(n, h), 1.0e-3, 1.0);
    let lh = clamp(dot(l, h), 1.0e-3, 1.0);
    let a2 = mss + SUN_SPREAD;
    let tan2 = (1.0 - nh * nh) / (nh * nh);
    // (Beckmann's distribution of facet normals: Cox and Munk's Gaussian of slopes, over cos^4 of the tilt)
    let d = exp(-tan2 / a2) / (PI * a2 * nh * nh * nh * nh);
    let g = 1.0 / (1.0 + masked(nv, a2) + masked(nl, a2));
    let f = WATER_F0 + (1.0 - WATER_F0) * pow(saturate(1.0 - lh), 5.0);
    // (held to a thousand: nothing the sea sends back is more, and a float must not reach infinity)
    let mean = min(f * d * g / (4.0 * max(nv, 1.0e-3)), 1.0e3);
    // The sparkle. How many facets of a patch are tilted to send the Sun's disc to the eye, on the mean: the patch's
    // facets times the share of slopes the disc subtends there.
    let cell = exp2(ceil(log2(max(side, FACET)) + grain(p / (max(side, FACET) * 48.0), 96u) - 0.5));
    let facets = (cell / FACET) * (cell / FACET);
    let share = d * nh * WAVELET / (4.0 * lh);
    let expected = facets * share;
    if expected > 400.0 {
        return mean;
    }
    let at = vec2<i32>(floor(p / cell));
    let own = lattice3(at, 97u);
    let time = clock * TICKS + own.z * 8.0;
    let tick = i32(floor(time));
    let a = lattice3(at + vec2(tick * 7919, tick * 104729), 98u);
    let b = lattice3(at + vec2((tick + 1) * 7919, (tick + 1) * 104729), 98u);
    let fade = smoothstep(0.0, 1.0, fract(time));
    let count = mix(poisson(expected, a.xy), poisson(expected, b.xy), fade);
    return min(mean * count / max(expected, 1.0e-6), 1.0e4);
}

// The Sun's light off the water toward the eye, in the scene's units: `glint` lit, with a flash held to [`FLASH`].
fn sun_on_water(lit: vec3<f32>, reflected: f32) -> vec3<f32> {
    let light = lit * reflected;
    return light * (FLASH / max(max(light.r, max(light.g, light.b)), FLASH));
}
