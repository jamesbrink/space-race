//! The made ground round a site: its roads and rail beds, and the patches that were cleared, graded, paved or
//! built on. Data only; the picture paints the land from it (`sr-render`'s `earth::marks`).

/// What a way is surfaced with.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Surface {
    /// A rail line's bed of grey stone.
    Ballast,
    /// Crushed shell, two wheel ruts pressed darker.
    Shell,
    /// A strip cut through the scrub and harrowed to bare sand.
    Firebreak,
}

/// A point of the made ground, m: in the site's own frame (along +X and +Z), or on the compass (east and north
/// of the site's origin), whichever its source gives it in.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum At {
    /// Along the site's +X and +Z.
    Site(f64, f64),
    /// East and north of the site's origin.
    Compass(f64, f64),
}

/// A straight length of a made way.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Way {
    /// Its ends.
    pub ends: [At; 2],
    /// Half its width, m.
    pub half_width: f64,
    /// What it is made of.
    pub surface: Surface,
}

/// What a patch of kept ground is.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kept {
    /// A clearing: no scrub, thin mown grass with sand showing through.
    Cleared,
    /// Sand graded bare and worn, as round a pad's concrete.
    Graded,
    /// Ground a model stands on: nothing grows there.
    Built,
    /// The same, where the patch's edge is the edge of the model's own paving.
    Paved,
}

/// The outline of a patch, in the site's frame, m, before its corners are rounded.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Outline {
    /// A box square to the site's frame: its middle and half its size.
    Box([f64; 2], [f64; 2]),
    /// A disc: its middle (its radius is the patch's corner).
    Disc([f64; 2]),
    /// A strip between two points (half its width is the patch's corner).
    Strip([f64; 2], [f64; 2]),
}

/// A patch of kept ground.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Patch {
    /// Its outline.
    pub outline: Outline,
    /// The radius its corners are rounded to, m, added outside the outline.
    pub corner: f64,
    /// What it is.
    pub ground: Kept,
}

/// The made ground round a site.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Made {
    /// The ways.
    pub ways: &'static [Way],
    /// The patches.
    pub patches: &'static [Patch],
}
