//! A delay line: what went in a while ago, read between its samples so the while can be moved without a click.

/// A ring of the last so many samples.
#[derive(Debug, Clone)]
pub struct Delay {
    ring: Box<[f32]>,
    at: usize,
}

impl Delay {
    /// One that remembers `samples` of them.
    #[must_use]
    pub fn new(samples: usize) -> Self {
        Self { ring: vec![0.0; samples.max(4)].into_boxed_slice(), at: 0 }
    }

    /// What went in `ago` samples back (a fraction is read between two), then `x` goes in.
    pub fn run(&mut self, x: f32, ago: f32) -> f32 {
        let n = self.ring.len();
        let ago = ago.clamp(1.0, (n - 2) as f32);
        let (whole, part) = (ago as usize, ago.fract());
        let near = self.ring[(self.at + n - whole) % n];
        let far = self.ring[(self.at + n - whole - 1) % n];
        self.ring[self.at] = x;
        self.at = (self.at + 1) % n;
        near + (far - near) * part
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn what_goes_in_comes_out_that_many_samples_later() {
        let mut delay = Delay::new(64);
        let out: Vec<f32> = (0..40).map(|i| delay.run(if i == 3 { 1.0 } else { 0.0 }, 10.0)).collect();
        assert_eq!(out.iter().position(|&y| y > 0.5), Some(13));
        // Half a sample further back is read half from each neighbour.
        let mut delay = Delay::new(64);
        let out: Vec<f32> = (0..40).map(|i| delay.run(if i == 3 { 1.0 } else { 0.0 }, 10.5)).collect();
        assert!((out[13] - 0.5).abs() < 1e-6 && (out[14] - 0.5).abs() < 1e-6);
    }
}
