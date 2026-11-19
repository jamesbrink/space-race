// What the clouds' march is told each frame (sr-render/src/clouds/frame.rs `CloudFrame`): clouds.wesl and
// clouds_rays.wesl both read it, and its fields must stay in the order the Rust struct has them.

struct CloudFrame {
    // the vertical at the eye; w: the eye's height above the ground
    up: vec4<f32>,
    // east at the site; w: the ground's radius
    east: vec4<f32>,
    // north at the site; w: the clock
    north: vec4<f32>,
    // toward the Sun; w: how far one can see
    sun: vec4<f32>,
    // w: the height over which the haze thins by e
    sunlight: vec4<f32>,
    skylight: vec4<f32>,
    // the eye over the ground in the cumulus' drifting frame (east, north), then the deck's
    eye_over: vec4<f32>,
    // cover, base, depth, a cloud's size
    cumulus: vec4<f32>,
    deck: vec4<f32>,
    // how each layer drifts, m/s east and north: the cumulus, then the deck
    wind: vec4<f32>,
    // the cumulus' spread and the metres to a cell of its field; where the deck's banks begin, and the metres to
    // a tile of its cloudlets
    lay: vec4<f32>,
    // the day's map: how far across it is, m (0: there is none); the height its high cloud is drawn at, m; how many
    // pixels of the frame each way one of the march's stands for
    day: vec4<f32>,
    // (for clouds_motion.wesl)
    moved: vec4<f32>,
}
