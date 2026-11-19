//! Three doubles. The pure crates carry no maths library; the engine's vectors begin at `sr-render`.

use std::ops::{Add, Mul, Neg, Sub};

/// A vector or a point, in metres unless its use says otherwise.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct V3 {
    /// First component.
    pub x: f64,
    /// Second component.
    pub y: f64,
    /// Third component.
    pub z: f64,
}

impl V3 {
    /// The origin.
    pub const ZERO: Self = Self::new(0.0, 0.0, 0.0);
    /// Up, in a site's frame.
    pub const Y: Self = Self::new(0.0, 1.0, 0.0);

    /// From components.
    #[must_use]
    pub const fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    /// Scalar product.
    #[must_use]
    pub fn dot(self, o: Self) -> f64 {
        self.x * o.x + self.y * o.y + self.z * o.z
    }

    /// Vector product.
    #[must_use]
    pub fn cross(self, o: Self) -> Self {
        Self::new(self.y * o.z - self.z * o.y, self.z * o.x - self.x * o.z, self.x * o.y - self.y * o.x)
    }

    /// Length.
    #[must_use]
    pub fn length(self) -> f64 {
        self.dot(self).sqrt()
    }

    /// The same direction at unit length; zero stays zero.
    #[must_use]
    pub fn normalized(self) -> Self {
        let l = self.length();
        if l > 0.0 { self * (1.0 / l) } else { self }
    }

    /// As an array, for handing to an engine's vector type.
    #[must_use]
    pub const fn to_array(self) -> [f64; 3] {
        [self.x, self.y, self.z]
    }
}

impl Add for V3 {
    type Output = Self;
    fn add(self, o: Self) -> Self {
        Self::new(self.x + o.x, self.y + o.y, self.z + o.z)
    }
}

impl Sub for V3 {
    type Output = Self;
    fn sub(self, o: Self) -> Self {
        Self::new(self.x - o.x, self.y - o.y, self.z - o.z)
    }
}

impl Mul<f64> for V3 {
    type Output = Self;
    fn mul(self, k: f64) -> Self {
        Self::new(self.x * k, self.y * k, self.z * k)
    }
}

impl Neg for V3 {
    type Output = Self;
    fn neg(self) -> Self {
        Self::new(-self.x, -self.y, -self.z)
    }
}
