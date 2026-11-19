// The noise the land's cover is cut from, read from its bake (sr-render/src/earth/bake.rs) where the bake is fine
// enough, and worked out from the noise itself near the eye and where the bake does not reach (earth_land.wesl
// `fields`). The bake holds two levels round the site, each its four sets side by side, the near level above the
// wide one.

import super::earth_noise::noise_sampler;
import super::earth_land::{Fields, fields};

@group(constants::MATERIAL_BIND_GROUP) @binding(122) var baked_map: texture_2d<f32>;

// Texels along a level (bake.rs TEXELS).
const TEXELS: f32 = 1024.0;
// Within this of the eye, m, the fields are worked out and not read: a texel of the near level (6 m) is too coarse
// for the grass at a person's feet. Past the second figure they are read.
const WORKED: vec2<f32> = vec2(25.0, 45.0);

// One level's sets at `en`, metres east and north of the site; `half` is half the level's width, `level` 0 the near
// one and 1 the wide.
fn level_at(en: vec2<f32>, half: f32, level: f32) -> Fields {
    let uv = vec2(0.5 + en.x / (2.0 * half), 0.5 - en.y / (2.0 * half));
    // (kept half a texel inside the level, so its filter does not read the set beside it)
    let inner = clamp(uv, vec2(0.5 / TEXELS), vec2(1.0 - 0.5 / TEXELS));
    let y = (inner.y + level) * 0.5;
    var f: Fields;
    f.a = textureSampleLevel(baked_map, noise_sampler, vec2(inner.x * 0.25, y), 0.0);
    f.b = textureSampleLevel(baked_map, noise_sampler, vec2((inner.x + 1.0) * 0.25, y), 0.0);
    f.c = textureSampleLevel(baked_map, noise_sampler, vec2((inner.x + 2.0) * 0.25, y), 0.0);
    f.d = textureSampleLevel(baked_map, noise_sampler, vec2((inner.x + 3.0) * 0.25, y), 0.0);
    return f;
}

fn blend(a: Fields, b: Fields, t: f32) -> Fields {
    var f: Fields;
    f.a = mix(a.a, b.a, t);
    f.b = mix(a.b, b.b, t);
    f.c = mix(a.c, b.c, t);
    f.d = mix(a.d, b.d, t);
    return f;
}

// How much of a level reaches `en`: all of it well inside, none past its edge.
fn within(en: vec2<f32>, half: f32) -> f32 {
    return 1.0 - smoothstep(0.85, 0.97, max(abs(en.x), abs(en.y)) / half);
}

// The fields at `en`, `eye` metres from the eye; `baked` is the frame's (half the near level, half the wide, landed).
fn fields_at(en: vec2<f32>, eye: f32, baked: vec4<f32>) -> Fields {
    let worked = 1.0 - smoothstep(WORKED.x, WORKED.y, eye);
    let near = within(en, baked.x);
    let wide = within(en, baked.y);
    if baked.z < 0.5 || worked >= 1.0 || wide <= 0.0 {
        return fields(en);
    }
    var f: Fields;
    if near >= 1.0 {
        f = level_at(en, baked.x, 0.0);
    } else if near > 0.0 {
        f = blend(level_at(en, baked.y, 1.0), level_at(en, baked.x, 0.0), near);
    } else {
        f = level_at(en, baked.y, 1.0);
    }
    if worked > 0.0 || wide < 1.0 {
        f = blend(fields(en), f, (1.0 - worked) * wide);
    }
    return f;
}
