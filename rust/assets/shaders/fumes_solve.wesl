// The air about the pad, worked as a fluid on a grid (sr-render/src/fumes): one step of it is the passes below,
// each reading one or two volumes and writing a third.
//
// It is Stam's stable fluids (SIGGRAPH 1999) with Fedkiw, Stam and Jensen's vorticity confinement (2001), laid
// out for the GPU as in Crane, Llamas and Tariq (GPU Gems 3, ch. 30): the velocity is carried along itself
// (`advect`), pushed by what is hot, by the eddies it already has and by the jets that feed it (`force`), and
// made to keep its volume (`diverge`, `relax` many times, `project`). Dust and vapour are carried by it on a
// grid twice as fine (`carry`), raised off the ground where the air over it is fast. Then the light: how much of
// the Sun, of the fire and of the sky reaches each cell through the rest (`light`), where there is anything at
// all (`occupy`), and what the whole of it takes from the Sun as seen from the Sun (`shade`), for its shadow.
//
// The box's frame: x down the wind, y up, z across, metres from its low corner. Velocity is m/s, heat is kelvin
// above the air's, dust and vapour are what a metre of them takes out of a ray (1/m).

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
    // toward the Sun; w: how wide the Sun's view of the box is, m
    sun: vec4<f32>,
    // the two axes of the Sun's view
    sun_a: vec4<f32>,
    sun_b: vec4<f32>,
    sunlight: vec4<f32>,
    skylight: vec4<f32>,
    // the fire's light: where, m; w: how strong, cd
    lamp: vec4<f32>,
    lamp_colour: vec4<f32>,
    // the ground: dust raised by a metre of air passing over it faster than `y` m/s (1/m a metre); where the
    // pad is down the wind and across, m (z, w)
    ground: vec4<f32>,
    sources: array<Source, 8>,
}

@group(0) @binding(0) var<uniform> fume: Fume;
@group(0) @binding(1) var smooth_sampler: sampler;
@group(0) @binding(2) var first: texture_3d<f32>;
@group(0) @binding(3) var second: texture_3d<f32>;
@group(0) @binding(4) var result: texture_storage_3d<rgba16float, write>;
@group(0) @binding(5) var gusts: texture_3d<f32>;
@group(0) @binding(6) var repeat_sampler: sampler;

// Gravity, m/s^2, and the air's temperature, K: hot gas rises as its heat over the air's.
const G: f32 = 9.81;
const AIR: f32 = 300.0;
// Heat leaves a parcel in about this long, s (it mixes with the air faster than the grid shows). Estimated.
const COOLS: f32 = 5.0;
// How hard the eddies are kept up against the grid's smearing (Fedkiw's epsilon). Estimated: as much as stays
// stable at these speeds.
const SPIN: f32 = 0.9;
// Air moving against the wind's own is stirred by this much of its speed a second, and what it carries is
// frayed by eddies of this much of its speed. Estimated: a jet's own turbulence is a fifth of its speed.
const STIRS: f32 = 2.6;
const FRAYS: f32 = 0.4;
// The ground slows the air on it by this much a second. Estimated.
const DRAGS: f32 = 0.6;
// Vapour is gone in about this long, s, and dust in this; dust falls at this speed, m/s. Estimated: a puff of
// steam on a warm morning lasts a few seconds; the dust of a concrete apron hangs for a quarter of a minute.
const VAPOUR_LASTS: f32 = 1.6;
const DUST_LASTS: f32 = 16.0;
const DUST_FALLS: f32 = 0.25;
// Dust is raised from the lowest this much of the air, m.
const RAISED_FROM: f32 = 0.6;
// How far the light's marches go, m: toward the Sun, toward the fire, and up to the sky.
const SUN_REACH: f32 = 8.0;
const LAMP_REACH: f32 = 6.0;
const SKY_REACH: f32 = 3.0;

fn hash31(p: vec3<f32>) -> f32 {
    var q = fract(p * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yxz + 33.33);
    return fract((q.x + q.y) * q.z);
}

fn noise3(p: vec3<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    let x00 = mix(hash31(i), hash31(i + vec3(1.0, 0.0, 0.0)), u.x);
    let x10 = mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), u.x);
    let x01 = mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), u.x);
    let x11 = mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), u.x);
    return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

// The eddies the grid is too coarse to hold, at a place: a velocity of about one in size, from a block of them
// `across` metres a side that repeats, drifting with the wind and turning over as the clock runs.
fn gust(at: vec3<f32>, across: f32) -> vec3<f32> {
    let drifted = at - vec3(0.6 * fume.time.z, 0.07 * across, 0.0) * fume.time.y;
    return textureSampleLevel(gusts, repeat_sampler, drifted / across, 0.0).xyz * 2.0 - 1.0;
}

// The wind at a height: the power law of open, level country (a seventh), from its speed at 10 m.
fn wind_at(y: f32) -> f32 {
    return fume.time.z * pow(clamp(y, 0.25, 40.0) / 10.0, 0.143);
}

fn coarse() -> vec3<i32> {
    return vec3<i32>(fume.cells.xyz);
}

// How far inside the open sides a coarse cell is: 0 on them, 1 three cells in. The floor is not open.
fn inside(cell: vec3<i32>) -> f32 {
    let n = coarse();
    let side = min(min(cell.x, n.x - 1 - cell.x), min(cell.z, n.z - 1 - cell.z));
    return saturate(f32(min(side, n.y - 1 - cell.y)) / 3.0);
}

// The velocity in a cell, or what stands for it beyond the box: under the floor the air above it mirrored (so
// nothing goes through), beyond an open side the cell at the side.
fn velocity(cell: vec3<i32>) -> vec3<f32> {
    let n = coarse();
    let held = clamp(cell, vec3(0), n - 1);
    var u = textureLoad(first, held, 0).xyz;
    if cell.y < 0 {
        u.y = -u.y;
    }
    return u;
}

fn curl(cell: vec3<i32>) -> vec3<f32> {
    let dx = velocity(cell + vec3(1, 0, 0)) - velocity(cell - vec3(1, 0, 0));
    let dy = velocity(cell + vec3(0, 1, 0)) - velocity(cell - vec3(0, 1, 0));
    let dz = velocity(cell + vec3(0, 0, 1)) - velocity(cell - vec3(0, 0, 1));
    return vec3(dy.z - dz.y, dz.x - dx.z, dx.y - dy.x) / (2.0 * fume.size.w);
}

// The pressure in a cell of `volume`, or beyond the box: under the floor the cell above it (the floor pushes
// back), beyond an open side none.
fn pressure(volume: texture_3d<f32>, cell: vec3<i32>) -> f32 {
    let n = coarse();
    if cell.x < 0 || cell.z < 0 || cell.x >= n.x || cell.y >= n.y || cell.z >= n.z {
        return 0.0;
    }
    return textureLoad(volume, vec3(cell.x, max(cell.y, 0), cell.z), 0).x;
}

// Nothing: a volume as it is before anything has happened in it.
@compute @workgroup_size(4, 4, 4)
fn wipe(@builtin(global_invocation_id) id: vec3<u32>) {
    textureStore(result, vec3<i32>(id), vec4(0.0));
}

// The air as it is before anything has happened in it: the wind.
@compute @workgroup_size(4, 4, 4)
fn still(@builtin(global_invocation_id) id: vec3<u32>) {
    let y = (f32(id.y) + 0.5) * fume.size.w;
    textureStore(result, vec3<i32>(id), vec4(wind_at(y), 0.0, 0.0, 0.0));
}

// The velocity and the heat carried along the velocity (`first`).
@compute @workgroup_size(4, 4, 4)
fn advect(@builtin(global_invocation_id) id: vec3<u32>) {
    let cell = vec3<i32>(id);
    let at = (vec3<f32>(id) + 0.5) * fume.size.w;
    let here = textureLoad(first, cell, 0);
    let back = at - here.xyz * fume.time.x;
    var moved = textureSampleLevel(first, smooth_sampler, back / fume.size.xyz, 0.0);
    moved.w *= exp(-fume.time.x / COOLS);
    // At the open sides the air is the wind's.
    let free = vec4(wind_at(at.y), 0.0, 0.0, 0.0);
    textureStore(result, cell, mix(free, moved, inside(cell)));
}

// What a source asks of the air at a place: the velocity it would have there (xyz) and how much of the source
// is felt (w, 0 to 1).
fn asked(source: Source, at: vec3<f32>) -> vec4<f32> {
    let off = at - source.at.xyz;
    if source.push.w < 0.5 {
        let felt = exp(-dot(off, off) / (source.at.w * source.at.w));
        return vec4(source.push.xyz, felt);
    }
    // A blast: thrown out along the ground from a ring about where the jet strikes, thin, a little upward at
    // its rim, and never the same all the way about.
    let away = length(off.xz);
    let ring = exp(-pow((away - source.at.w) / (0.6 * source.at.w), 2.0));
    let low = exp(-max(off.y, 0.0) / source.push.y);
    let bearing = off.xz / max(away, 0.05);
    let gust = 0.55 + 0.9 * noise3(vec3(bearing * 2.3, fume.time.y * 1.7));
    let speed = source.push.x * gust;
    return vec4(bearing.x * speed, 0.12 * speed, bearing.y * speed, ring * low);
}

// The velocity (`first`) pushed: by its heat, by its own eddies, by the sources and by the ground.
@compute @workgroup_size(4, 4, 4)
fn force(@builtin(global_invocation_id) id: vec3<u32>) {
    let cell = vec3<i32>(id);
    let h = fume.size.w;
    let dt = fume.time.x;
    let at = (vec3<f32>(id) + 0.5) * h;
    let here = textureLoad(first, cell, 0);
    var u = here.xyz;
    var heat = here.w;
    u.y += dt * G * heat / AIR;

    let spin = curl(cell);
    let lean = vec3(
        length(curl(cell + vec3(1, 0, 0))) - length(curl(cell - vec3(1, 0, 0))),
        length(curl(cell + vec3(0, 1, 0))) - length(curl(cell - vec3(0, 1, 0))),
        length(curl(cell + vec3(0, 0, 1))) - length(curl(cell - vec3(0, 0, 1))),
    );
    u += dt * SPIN * h * cross(lean / (length(lean) + 1.0e-4), spin);

    // Air moving against the wind's own breaks into eddies of every size: the largest of those the grid can
    // hold are stirred into it here, as hard as it is moving.
    let stirred = length(u - vec3(wind_at(at.y), 0.0, 0.0));
    u += dt * STIRS * stirred * gust(at, 13.0);

    let count = i32(fume.time.w);
    for (var i = 0; i < count; i++) {
        let source = fume.sources[i];
        let want = asked(source, at);
        u = mix(u, want.xyz, saturate(source.gives.w * dt * want.w));
        heat += source.gives.z * dt * want.w;
    }
    if cell.y == 0 {
        u.y = max(u.y, 0.0);
        let slowed = exp(-DRAGS * dt);
        u = vec3(mix(wind_at(at.y), u.x, slowed), u.y, u.z * slowed);
    }
    textureStore(result, cell, vec4(u, heat));
}

// How fast the velocity (`first`) is making or losing air in each cell, kept beside the pressure the last step
// found (`second`), which is where this step's search starts.
@compute @workgroup_size(4, 4, 4)
fn diverge(@builtin(global_invocation_id) id: vec3<u32>) {
    let cell = vec3<i32>(id);
    let dx = velocity(cell + vec3(1, 0, 0)).x - velocity(cell - vec3(1, 0, 0)).x;
    let dy = velocity(cell + vec3(0, 1, 0)).y - velocity(cell - vec3(0, 1, 0)).y;
    let dz = velocity(cell + vec3(0, 0, 1)).z - velocity(cell - vec3(0, 0, 1)).z;
    let making = (dx + dy + dz) / (2.0 * fume.size.w);
    textureStore(result, cell, vec4(textureLoad(second, cell, 0).x, making, 0.0, 0.0));
}

// One turn of the search for the pressure (`first`: pressure, and what the velocity is making) that undoes it.
@compute @workgroup_size(4, 4, 4)
fn relax(@builtin(global_invocation_id) id: vec3<u32>) {
    let cell = vec3<i32>(id);
    let h = fume.size.w;
    let making = textureLoad(first, cell, 0).y;
    let about = pressure(first, cell + vec3(1, 0, 0)) + pressure(first, cell - vec3(1, 0, 0))
        + pressure(first, cell + vec3(0, 1, 0)) + pressure(first, cell - vec3(0, 1, 0))
        + pressure(first, cell + vec3(0, 0, 1)) + pressure(first, cell - vec3(0, 0, 1));
    textureStore(result, cell, vec4((about - h * h * making) / 6.0, making, 0.0, 0.0));
}

// The velocity (`first`) less what the pressure (`second`) undoes of it: it keeps its volume.
@compute @workgroup_size(4, 4, 4)
fn project(@builtin(global_invocation_id) id: vec3<u32>) {
    let cell = vec3<i32>(id);
    let here = textureLoad(first, cell, 0);
    let slope = vec3(
        pressure(second, cell + vec3(1, 0, 0)) - pressure(second, cell - vec3(1, 0, 0)),
        pressure(second, cell + vec3(0, 1, 0)) - pressure(second, cell - vec3(0, 1, 0)),
        pressure(second, cell + vec3(0, 0, 1)) - pressure(second, cell - vec3(0, 0, 1)),
    ) / (2.0 * fume.size.w);
    var u = here.xyz - slope;
    if cell.y == 0 {
        u.y = max(u.y, 0.0);
    }
    textureStore(result, cell, vec4(u, here.w));
}

// The dust and the vapour (`first`, on the fine grid) carried along the velocity (`second`), thinning as they
// age, fed by the sources, and the dust raised where the air over the ground is fast.
@compute @workgroup_size(4, 4, 4)
fn carry(@builtin(global_invocation_id) id: vec3<u32>) {
    let cell = vec3<i32>(id);
    let dt = fume.time.x;
    let fine = fume.size.w / fume.cells.w;
    let at = (vec3<f32>(id) + 0.5) * fine;
    let mean = textureSampleLevel(second, smooth_sampler, at / fume.size.xyz, 0.0).xyz;
    // (and the eddies too small for the velocity's grid: they fray what it carries, as hard as it is moving)
    let stirred = length(mean - vec3(wind_at(at.y), 0.0, 0.0));
    let u = mean + FRAYS * stirred * (0.6 * gust(at, 4.7) + 0.4 * gust(at.zxy, 1.9));
    let back = at - (u - vec3(0.0, DUST_FALLS, 0.0)) * dt;
    var stuff = textureSampleLevel(first, smooth_sampler, back / fume.size.xyz, 0.0);
    stuff.x *= exp(-dt / DUST_LASTS);
    stuff.y *= exp(-dt / VAPOUR_LASTS);

    let count = i32(fume.time.w);
    for (var i = 0; i < count; i++) {
        let source = fume.sources[i];
        let felt = asked(source, at).w;
        stuff = vec4(stuff.xy + source.gives.xy * dt * felt, stuff.zw);
    }
    // Dust off the ground: the faster the air over it against the wind's own, the more, in patches.
    if at.y < RAISED_FROM {
        let scour = length(vec2(mean.x - wind_at(at.y), mean.z));
        let patchy = 0.4 + 1.2 * noise3(vec3(at.xz * 0.35, 3.0));
        stuff.x += fume.ground.x * max(scour - fume.ground.y, 0.0) * patchy * dt;
    }
    // What reaches an open side has left.
    let n = vec3<i32>(fume.cells.xyz * fume.cells.w);
    let side = min(min(cell.x, n.x - 1 - cell.x), min(cell.z, n.z - 1 - cell.z));
    let kept = saturate(f32(min(side, n.y - 1 - cell.y)) / 6.0);
    textureStore(result, cell, vec4(max(stuff.xy, vec2(0.0)) * kept, 0.0, 0.0));
}

// What a metre of the dust and vapour at a place takes out of a ray.
fn thick(at: vec3<f32>) -> f32 {
    let uvw = at / fume.size.xyz;
    if any(uvw < vec3(0.0)) || any(uvw > vec3(1.0)) {
        return 0.0;
    }
    let stuff = textureSampleLevel(first, smooth_sampler, uvw, 0.0);
    return stuff.x + stuff.y;
}

// How much is in the way from a place for `reach` metres along a direction, as an optical depth: steps that
// lengthen, so the near dust, which shades most sharply, is read finely.
fn toward(at: vec3<f32>, along: vec3<f32>, reach: f32, steps: i32) -> f32 {
    let grows = 1.6;
    var stride = reach * (grows - 1.0) / (pow(grows, f32(steps)) - 1.0);
    var depth = 0.0;
    var gone = 0.0;
    for (var i = 0; i < steps; i++) {
        depth += thick(at + along * (gone + 0.5 * stride)) * stride;
        gone += stride;
        stride *= grows;
    }
    return depth;
}

// How much of the Sun, of the fire's light and of the sky overhead reaches each fine cell through the dust and
// vapour (`first`): a deep opacity map, kept as a volume (Kim and Neumann, Opacity Shadow Maps, 2001).
@compute @workgroup_size(4, 4, 4)
fn light(@builtin(global_invocation_id) id: vec3<u32>) {
    let at = (vec3<f32>(id) + 0.5) * fume.size.w / fume.cells.w;
    let sun = exp(-toward(at, fume.sun.xyz, SUN_REACH, 4));
    let to_lamp = fume.lamp.xyz - at;
    let far = length(to_lamp);
    let lamp = exp(-toward(at, to_lamp / max(far, 0.01), min(far, LAMP_REACH), 2));
    let sky = exp(-toward(at, vec3(0.0, 1.0, 0.0), SKY_REACH, 1));
    textureStore(result, vec3<i32>(id), vec4(sun, lamp, sky, 0.0));
}

// Where there is anything at all, in cells four coarse ones a side: the most dust and vapour (`first`) found
// anywhere in each, and a little way beyond it.
@compute @workgroup_size(4, 4, 4)
fn occupy(@builtin(global_invocation_id) id: vec3<u32>) {
    let side = 4.0 * fume.size.w;
    let low = vec3<f32>(id) * side;
    var most = 0.0;
    for (var k = 0; k < 6; k++) {
        for (var j = 0; j < 6; j++) {
            for (var i = 0; i < 6; i++) {
                most = max(most, thick(low + (vec3(f32(i), f32(j), f32(k)) - 0.25) * side / 4.5));
            }
        }
    }
    textureStore(result, vec3<i32>(id), vec4(most, 0.0, 0.0, 0.0));
}

// The dust and vapour (`first`) as the Sun sees them: for each sunbeam, how much it loses crossing the box and
// between which two distances along it (from the box's middle, toward the Sun) it loses it.
@compute @workgroup_size(4, 4, 1)
fn shade(@builtin(global_invocation_id) id: vec3<u32>) {
    let across = vec2<f32>(textureDimensions(result).xy);
    let wide = fume.sun.w;
    let spot = (vec2<f32>(id.xy) + 0.5) / across - 0.5;
    let middle = 0.5 * fume.size.xyz + (fume.sun_a.xyz * spot.x + fume.sun_b.xyz * spot.y) * wide;
    // The stretch of the beam that is inside the box.
    let a = -middle / fume.sun.xyz;
    let b = (fume.size.xyz - middle) / fume.sun.xyz;
    let lo = min(a, b);
    let hi = max(a, b);
    let enters = max(max(lo.x, lo.y), lo.z);
    let leaves = min(min(hi.x, hi.y), hi.z);
    var depth = 0.0;
    // (far outside the box either way, and small enough to be kept in the volume's half-precision figures)
    var nearest = 3.0e4;
    var furthest = -3.0e4;
    if leaves > enters {
        let steps = 96;
        let stride = (leaves - enters) / f32(steps);
        for (var i = 0; i < steps; i++) {
            // (from the Sun's side inward)
            let along = leaves - (f32(i) + 0.5) * stride;
            let there = thick(middle + fume.sun.xyz * along) * stride;
            if there > 1.0e-4 {
                nearest = min(nearest, -along - 0.5 * stride);
                furthest = max(furthest, -along + 0.5 * stride);
            }
            depth += there;
        }
    }
    textureStore(result, vec3<i32>(vec2<i32>(id.xy), 0), vec4(depth, nearest, furthest, 0.0));
}

// The smallest box, square to the grid, that holds everything there is (`first`: where anything is), as its low
// and high corners, m: the picture is drawn in that box and no further. One cell of the pass does all the work.
@compute @workgroup_size(4, 4, 4)
fn bound(@builtin(global_invocation_id) id: vec3<u32>) {
    if any(id != vec3(0u)) {
        return;
    }
    let n = vec3<i32>(textureDimensions(first));
    var low = vec3(1.0e9);
    var high = vec3(-1.0e9);
    for (var k = 0; k < n.z; k++) {
        for (var j = 0; j < n.y; j++) {
            for (var i = 0; i < n.x; i++) {
                if textureLoad(first, vec3(i, j, k), 0).x > 2.0e-4 {
                    low = min(low, vec3(f32(i), f32(j), f32(k)));
                    high = max(high, vec3(f32(i), f32(j), f32(k)) + 1.0);
                }
            }
        }
    }
    let side = 4.0 * fume.size.w;
    if high.x < low.x {
        low = vec3(0.0);
        high = vec3(0.0);
    } else {
        low = max(low * side - 0.5, vec3(0.0));
        high = min(high * side + 0.5, fume.size.xyz);
    }
    textureStore(result, vec3(0, 0, 0), vec4(low, 0.0));
    textureStore(result, vec3(1, 0, 0), vec4(high, 0.0));
}
