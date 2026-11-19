// The land near the site where a pixel covers more than half a metre of it (earth.wesl): a few hundred metres off at
// eye height, and all of it from the air. The same cover as the near ground (earth_land.wesl `cover`, from the baked
// fields) and the same palette, each cover one tone with only what can still be seen at that size: the sand's tone,
// the wet strand, the mud, the ways, the grass, and the scrub's clumps and the shadows they throw. Nothing finer is
// worked out, which is what makes it cheap. Where the two meet they are blended (earth.wesl `FAR`).

import super::earth_noise::grain_d;
import super::earth_land::{
    Site, Soil, cover, SAND, SAND_DARK, BEACH, HERB_DRY, HERB_GREEN, MARSH, MUD, LEAF, LEAF_LIT, LEAF_OTHER, MANGROVE,
    SHELL, BALLAST,
};

fn ground_far(s: Site) -> Soil {
    let c = cover(s);
    let f = s.f;
    var o: Soil;
    o.slope = vec2(0.0);
    o.sky = 1.0;
    // the sand, its tone in drifts (near: earth_land.wesl `sand`), paler on the beach, darker where the swash has
    // just been and in the lagoon's mud
    var colour = mix(SAND, SAND_DARK, saturate(0.3 + 0.5 * (f.a.z - 0.5) + 0.4 * (f.c.w - 0.5)));
    colour = mix(colour, colour * BEACH / SAND, 0.75 * c.beach);
    let wet = (1.0 - smoothstep(s.reach + 0.5, 11.0, s.shore)) * c.beach;
    colour *= 1.0 - 0.3 * wet;
    colour = mix(colour, MUD, 1.0 - smoothstep(2.0, 19.0, s.river));
    var rough = mix(0.95, 0.25, wet);
    // the ways (near: `made`), one tone each
    let on_way = 1.0 - smoothstep(-0.6 - s.line, 0.8 + s.line, s.way);
    let way = mix(mix(BALLAST, SHELL, saturate(s.surface)), mix(SAND, SAND_DARK, 0.4), saturate(s.surface - 1.0));
    colour = mix(colour, way, on_way);
    // the grass (near: `herbs`, as it is drawn past its tufts)
    let lush = saturate(0.25 + 0.5 * c.swale + 0.6 * c.marsh + 0.5 * f.b.y - 0.3 * c.dune);
    let green = mix(mix(HERB_DRY, HERB_GREEN, lush), MARSH, c.marsh) * (1.0 - 0.4 * c.swale);
    let grass = saturate(c.herb * 0.85);
    colour = mix(colour, green, grass);
    rough = mix(rough, 0.8, grass);
    // the scrub (near: `scrub`, its whole tone): its stands, its clumps, and each clump's shadow away from the Sun,
    // here from one reading of the noise and its slope
    let height = mix(mix(0.9, 2.1, smoothstep(0.12, 0.42, c.zone)), 6.0, smoothstep(0.82, 0.98, c.zone));
    let stand = f.b.w;
    let leafy = mix(mix(LEAF_LIT, LEAF_OTHER, f.d.y), MANGROVE, c.marsh) * (0.75 + 0.5 * stand);
    let young = mix(leafy, HERB_DRY * 0.6, 0.5 * c.burn);
    let clumps = grain_d(s.p / 9.0, 61u);
    let shadowed = smoothstep(0.0, 0.08, dot(clumps.yz, s.sunward) * (0.8 * height / 9.0) * 0.6);
    let whole = mix(LEAF * 0.8, young, 0.1 + 0.6 * smoothstep(0.3, 0.7, clumps.x) + 0.3 * (stand - 0.5))
        * (1.0 - 0.45 * shadowed);
    colour = mix(colour, whole, c.woody);
    o.colour = colour;
    o.rough = mix(rough, 0.62, c.woody);
    o.sky = 1.0 - 0.25 * c.woody * shadowed;
    return o;
}
