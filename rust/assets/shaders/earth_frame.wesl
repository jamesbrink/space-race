// What the Earth's shaders know of the site and the day (sr-render/src/earth/material.rs `EarthFrame`): the ground's
// (earth.wesl) and the plants' (earth_plants.wesl). And the cumulus' shadows on both, read from the clouds' own
// field by the clouds' own rule (clouds_cover.wesl `sun_shadow`), so that a shadow cannot part from its cloud.

import super::clouds_cover::{sun_shadow, spread_for};

// A regional map's plane (sr-render/src/earth/chart.rs).
struct Plane {
    east: vec4<f32>,
    north: vec4<f32>,
    middle: vec4<f32>,
    // west, east, south, north, in units of the sphere's radius
    bounds: vec4<f32>,
    // metres to a texel, how far in from its edge it is faded in, and two that each map reads its own way
    scale: vec4<f32>,
}

struct EarthFrame {
    x: vec4<f32>,
    y: vec4<f32>,
    z: vec4<f32>,
    east: vec4<f32>,
    north: vec4<f32>,
    // half the shore map's width (m), metres to a texel, texels it keeps a distance over, whether there is one
    shore: vec4<f32>,
    // the cumulus: cover, a cloud's size (m), the layer's base (m), whether there is any
    cloud: vec4<f32>,
    // how the cover lays the cumulus out: every turret's spread, the metres to a cell of their field, their depth (m)
    lay: vec4<f32>,
    // toward the Sun, and the clock (s)
    sun: vec4<f32>,
    // the cloud's drift, m/s east and north
    wind: vec4<f32>,
    // the day's map of the cover far from the site: how far across it is (m), whether there is one; and how far
    // the flight's clock moved in the last frame (s)
    day: vec4<f32>,
    // the eye's height (m); whether the whole Earth's relief has arrived, its shores, and the sorted coast
    eye: vec4<f32>,
    // the region's wider shore map: its scale's third is the texels it keeps a distance over, its fourth whether
    // it has arrived
    wide: Plane,
    // the region's relief and colour: its scale's third is whether the colour has arrived, its fourth the relief
    region: Plane,
    // banks of pale sand: a direction from the Earth's centre and the cosine of its radius
    banks: array<vec4<f32>, 6>,
}

// The sphere's radius, m.
const RADIUS: f32 = 6371000.0;
// Where the record's cover near the site gives way to the day's map's (clouds.wesl RECORD_NEAR: keep in step).
const RECORD_NEAR: vec2<f32> = vec2<f32>(12000.0, 40000.0);

// How much of the Sun reaches a point of the ground past the cumulus, 0 to 1: `en` is the point, metres east and
// north of the site over the ground; `sheet` the clouds' field (clouds::field::sheet), read through a repeating
// sampler; `day` the day's map, read through a clamping one.
fn through_cloud(frame: EarthFrame, sheet: texture_2d<f32>, repeating: sampler, day: texture_2d<f32>, clamped: sampler,
    en: vec2<f32>) -> f32 {
    if frame.cloud.w < 0.5 || frame.sun.y < 0.05 {
        return 1.0;
    }
    // (the clouds are laid out on the site's own level plane, east and north of it as the crow would fly through
    // the Earth, not over the ground: the two part by half a kilometre 500 km down range)
    let angle = length(en) / RADIUS;
    let level = en * (1.0 - angle * angle / 6.0);
    let clock = frame.sun.w;
    var spread = frame.lay.x;
    if frame.day.y > 0.5 {
        let uv = vec2(0.5 + level.x / frame.day.x, 0.5 - level.y / frame.day.x);
        let mapped = spread_for(textureSampleLevel(day, clamped, uv, 0.0).r);
        spread = mix(spread, mapped, smoothstep(RECORD_NEAR.x, RECORD_NEAR.y, length(level)));
    }
    let sun = frame.sun.xyz;
    let toward = vec3(dot(sun, frame.east.xyz), dot(sun, frame.north.xyz), sun.y);
    let drifting = level - frame.wind.xy * clock;
    return 1.0 - sun_shadow(sheet, repeating, drifting, 0.0, toward, vec2(frame.cloud.z, frame.lay.z), spread,
        frame.wind.xy, frame.lay.y, clock);
}
