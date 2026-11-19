//! Coarser copies of a flat texture of bytes, each half the one before, for a texture read from far off: what a
//! pixel then holds is the mean of what it covers, and nothing sparkles.

/// A copy of a square of `side` texels of `channels` bytes at half the size: each texel the mean of four.
fn halve(fine: &[u8], side: usize, channels: usize) -> Vec<u8> {
    let half = side / 2;
    let mut out = vec![0_u8; half * half * channels];
    for (i, texel) in out.chunks_mut(channels).enumerate() {
        let (x, y) = (i % half * 2, i / half * 2);
        for (channel, value) in texel.iter_mut().enumerate() {
            let mut sum = 0_u32;
            for corner in 0..4 {
                let at = (x + (corner & 1)) + side * (y + (corner >> 1));
                sum += u32::from(fine[at * channels + channel]);
            }
            *value = ((sum + 2) / 4) as u8;
        }
    }
    out
}

/// The square with every coarser copy after it, down to one texel, and how many levels that is.
#[must_use]
pub fn chain(level0: Vec<u8>, side: usize, channels: usize) -> (Vec<u8>, u32) {
    let mut data = level0;
    let (mut from, mut level_side, mut levels) = (0, side, 1);
    while level_side > 1 {
        let coarser = halve(&data[from..], level_side, channels);
        from = data.len();
        level_side /= 2;
        levels += 1;
        data.extend(coarser);
    }
    (data, levels)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_last_level_is_the_mean() {
        let level0: Vec<u8> = (0..16_u8).map(|v| v * 10).collect();
        let (data, levels) = chain(level0, 4, 1);
        assert_eq!(levels, 3);
        assert_eq!(data.len(), 16 + 4 + 1);
        assert_eq!(data[20], 75);
    }
}
