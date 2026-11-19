// What every pass of the fumes and their picture are handed (sr-render/src/fumes/grid.rs, `Frame`): one copy of
// the figures, imported by fumes_solve.wesl, fumes_shadow.wesl, fumes.wesl and fumes_march.wesl.

struct Source {
    // where, m; w: its radius, m
    at: vec4<f32>,
    // the velocity it gives, m/s (a blast: how fast it goes out along the ground, and how thick, m); w: 1 a blast
    push: vec4<f32>,
    // what it gives a second: dust and vapour (1/m), heat (K); w: how hard it holds the air to its velocity (1/s)
    gives: vec4<f32>,
}

struct Fume {
    // the box, m; w: a coarse cell, m
    size: vec4<f32>,
    // coarse cells each way; w: fine cells to a coarse one
    cells: vec4<f32>,
    // a step, s; the clock, s; the wind at 10 m, m/s down +x; how many sources
    time: vec4<f32>,
    // toward the Sun, in the box's frame; w: how wide the Sun's view of the box is, m
    sun: vec4<f32>,
    // the two axes of the Sun's view
    sun_a: vec4<f32>,
    sun_b: vec4<f32>,
    // the Sun's light, lux; the sky's, cd/m^2
    sunlight: vec4<f32>,
    skylight: vec4<f32>,
    // the fire's light: where, m; w: how strong, cd
    lamp: vec4<f32>,
    lamp_colour: vec4<f32>,
    // the ground: dust raised by a metre of air passing over it faster than `y` m/s (1/m a metre)
    ground: vec4<f32>,
    // the box's own motion down the wind: its speed (m/s), how fast that changes (m/s^2), how far it has gone (m)
    drift: vec4<f32>,
    // from the world as the eye draws it to the box's frame (metres from its low corner)
    box_from_world: mat4x4<f32>,
    sources: array<Source, 8>,
}
