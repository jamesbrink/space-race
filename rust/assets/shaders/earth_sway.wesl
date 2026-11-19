// The plants in the wind (sr-render/src/earth/leaves.rs): each vertex is moved down the wind by as much as it
// stands above its plant's foot, and the more for a gust. Both the main pass (earth_plants.wesl) and the prepass and
// shadow (earth_plants_prepass.wesl) move it alike, or the two would part. Everything is on the flight's clock, so
// a stopped clock stills the plants.
//
// Each vertex carries its place (metres east and north of the site) as its first texture coordinate and, as its
// second, how far it stands above its plant's foot (m) and a number of its plant's own.

import super::earth_frame::EarthFrame;

@group(constants::MATERIAL_BIND_GROUP) @binding(100) var<uniform> frame: EarthFrame;

// How far a tip a metre above its foot leans down a wind of 7 m/s on the mean, and how far more a gust takes it, m.
// Estimated: a saw palmetto's fan or a grass head nods by a hand's breadth in a fresh breeze.
const LEAN: f32 = 0.05;
const GUST: f32 = 0.08;
// How fast a plant nods, a second, for one a metre high: a shorter one is quicker (as a pendulum is, as the square
// root of its length). Estimated.
const NOD: f32 = 1.1;
// The breadth of a gust passing over the ground, m. Estimated.
const GUST_SIZE: f32 = 45.0;

// How far a point `lift` metres above its plant's foot is moved, in the world, at `place`; `own` is its plant's
// own number. `clock` is the flight's clock, s.
fn sway(place: vec2<f32>, lift: f32, own: f32, clock: f32) -> vec3<f32> {
    let wind = frame.wind.xy;
    let speed = length(wind);
    if lift <= 0.0 || speed < 0.1 {
        return vec3(0.0);
    }
    let along = wind / speed;
    let across = vec2(-along.y, along.x);
    let strength = speed / 7.0;
    // (gusts roll down the wind over the ground at about the wind's speed, in patches)
    let down = dot(place, along) - speed * clock;
    let side = dot(place, across);
    let gust = smoothstep(-0.2, 1.0, sin(down / GUST_SIZE) * 0.6 + sin(down / (0.37 * GUST_SIZE) + side / GUST_SIZE) * 0.4);
    let bend = lift * sqrt(lift);
    let rate = 6.2831853 * NOD / sqrt(max(lift, 0.15));
    let nod = sin(clock * rate + own * 6.2831853 + down * 0.15);
    let flutter = sin(clock * rate * 1.7 + own * 40.0) * 0.3;
    let over = (LEAN + GUST * gust) * strength * strength * bend * (0.75 + 0.25 * nod);
    let level = along * over + across * (flutter * 0.4 * over);
    return frame.east.xyz * level.x + frame.north.xyz * level.y - vec3(0.0, 0.25 * over * over / max(lift, 0.1), 0.0);
}
