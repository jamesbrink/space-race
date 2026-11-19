//! Launch Complex 5/6's made ground in May 1961: its roads and rail bed, the clearing inside the fence, the worn
//! sand round the concrete, and where its buildings stand.
//!
//! From `missions/usa/places/cape-canaveral/ground.ts` (`waysOn`, `lc56`, `apron`, `built`, KEPT, STRIPS) and
//! `lc-5.md` ("The land"; the hardstand is 200 ft square, the apron 28 ft by 60 ft). The pad model's own frame is
//! in feet with +Y (Blender) the site's -Z, so a point the web build gives as `site(x, y)` is `(x FT, -y FT)` here.
//! The perimeter road is derived from TM X-53107 Figure 7-6; the ways to the neighbouring complexes run straight
//! from one known place to the next and are estimated.

use crate::ground::{At, Kept, Made, Outline, Patch, Surface, Way};

const FT: f64 = 0.3048;
/// Half a hardstand, m: they are 200 ft square.
const SLAB: f64 = 100.0 * FT;

/// A point in the pad model's feet.
const fn site(x: f64, y: f64) -> At {
    At::Site(x * FT, -y * FT)
}

/// A point on the compass as `ground.ts` gives it: x east, z south, m.
const fn on(x: f64, z: f64) -> At {
    At::Compass(x, -z)
}

const fn shell(a: At, b: At, half_width: f64) -> Way {
    Way { ends: [a, b], half_width, surface: Surface::Shell }
}

const fn boxed(centre: [f64; 2], half: [f64; 2], corner: f64, ground: Kept) -> Patch {
    Patch { outline: Outline::Box(centre, half), corner, ground }
}

/// A disc where one of the complex's models stands, in the pad's feet.
const fn stands(x: f64, y: f64, radius: f64) -> Patch {
    Patch { outline: Outline::Disc([x * FT, -y * FT]), corner: radius * FT, ground: Kept::Built }
}

/// A strip between two points in the pad's feet, so wide each side.
const fn strip(x0: f64, y0: f64, x1: f64, y1: f64, half: f64) -> Patch {
    let outline = Outline::Strip([x0 * FT, -y0 * FT], [x1 * FT, -y1 * FT]);
    Patch { outline, corner: half * FT, ground: Kept::Built }
}

const WAYS: [Way; 16] = [
    // the rail line's ballast, on past pad 6 to Complex 26's two pads (it runs 025/205, the frame's +Z)
    Way { ends: [At::Site(0.0, -95.0), At::Site(0.0, 700.0)], half_width: 4.2, surface: Surface::Ballast },
    // the stub road from the foot of the apron's ramp
    shell(site(166.0, 0.0), site(404.0, 0.0), 4.0),
    // the perimeter road just inside the fence
    shell(site(404.0, 394.0), site(404.0, -909.0), 3.6),
    shell(site(-407.0, 394.0), site(-407.0, -909.0), 3.6),
    shell(site(-407.0, 394.0), site(404.0, 394.0), 3.6),
    shell(site(-407.0, -909.0), site(404.0, -909.0), 3.6),
    // the drive in to the blockhouse, past its back door, and out again; the hut's parking
    shell(site(404.0, -215.0), site(293.0, -215.0), 3.2),
    shell(site(293.0, -215.0), site(293.0, -349.0), 3.4),
    shell(site(293.0, -349.0), site(404.0, -349.0), 3.2),
    shell(site(276.0, -147.0), site(404.0, -147.0), 4.4),
    // ways to the neighbouring complexes
    shell(site(404.0, 0.0), on(-576.0, -35.0), 3.6),
    shell(site(404.0, 394.0), on(-240.0, 765.0), 3.6),
    shell(on(-262.0, 818.0), on(-300.0, 870.0), 3.4),
    shell(on(-262.0, 818.0), on(-366.0, 1037.0), 3.4),
    shell(on(238.0, -444.0), on(668.0, -690.0), 3.6),
    shell(on(716.0, -745.0), on(776.0, -838.0), 3.4),
];

const PATCHES: [Patch; 20] = [
    // the clearing: the frangible fence round the perimeter road, and its jog out round the car park at the gate
    boxed([1.0, 80.5], [128.0, 206.0], 10.0, Kept::Cleared),
    boxed([138.5, 16.5], [18.5, 40.5], 0.0, Kept::Cleared),
    // ground worn to sand for about 10 m beyond each pad's concrete and round the blockhouse's paving
    boxed([0.0, 0.0], [40.0, 40.0], 0.0, Kept::Graded),
    boxed([0.0, 158.5], [40.0, 40.0], 0.0, Kept::Graded),
    Patch { outline: Outline::Disc([66.0, 84.0]), corner: 34.0, ground: Kept::Graded },
    // the two hardstands and pad 5's apron: concrete whose edge is where the model's is
    boxed([0.0, 0.0], [SLAB, SLAB], 0.0, Kept::Paved),
    boxed([0.0, 158.5], [SLAB, SLAB], 0.0, Kept::Paved),
    boxed([SLAB + 30.0 * FT, 0.0], [30.0 * FT, 14.0 * FT], 0.0, Kept::Paved),
    // where the complex's models stand
    stands(212.0, -283.0, 104.0), // the blockhouse, the ready rooms and their paving
    stands(238.0, -192.0, 30.0),  // the hut behind it and its transformer yard
    stands(300.0, -155.0, 34.0),  // the hut by the road
    stands(137.0, -107.0, 26.0),  // the generator building
    stands(50.0, -262.0, 24.0),   // the shed by the track
    stands(-92.0, -148.0, 38.0),  // the cable racks
    stands(-148.0, -140.0, 14.0), // the scaffold stair
    // the two cable trenches and the turnout's curve
    strip(100.0, -99.0, 178.0, -241.0, 10.0),
    strip(100.0, -421.0, 178.0, -281.0, 10.0),
    strip(-10.0, -185.0, -40.0, -290.0, 26.0),
    strip(-40.0, -290.0, -95.0, -360.0, 26.0),
    strip(-95.0, -360.0, -150.0, -410.0, 26.0),
];

/// The complex's made ground.
pub const MADE: Made = Made { ways: &WAYS, patches: &PATCHES };
