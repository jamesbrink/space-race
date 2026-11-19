//! Filter baked surface maps once on arrival. PNG carries only the finest level; grit below a pixel must disappear.

use bevy::prelude::*;
use bevy::render::render_resource::TextureFormat;

/// An RGB average in linear light, encoded back to sRGB. Alpha and data maps are already linear.
struct Transfer {
    linear: [u32; 256],
    srgb: [u8; 4096],
}

impl Default for Transfer {
    fn default() -> Self {
        Self {
            linear: std::array::from_fn(|i| {
                let c = i as f32 / 255.0;
                let linear = if c <= 0.04045 { c / 12.92 } else { ((c + 0.055) / 1.055).powf(2.4) };
                (linear * 4095.0).round() as u32
            }),
            srgb: std::array::from_fn(|i| {
                let c = i as f32 / 4095.0;
                let s = if c <= 0.0031308 { 12.92 * c } else { 1.055 * c.powf(1.0 / 2.4) - 0.055 };
                (s * 255.0).round() as u8
            }),
        }
    }
}

fn half(level: &[u8], w: usize, h: usize, srgb: bool, transfer: &Transfer) -> Vec<u8> {
    let (nx, ny) = ((w / 2).max(1), (h / 2).max(1));
    let mut result = Vec::with_capacity(nx * ny * 4);
    for y in 0..ny {
        let rows = y * h / ny..(y + 1) * h / ny;
        for x in 0..nx {
            // The wrapped atlases are not square powers of two. Include all three texels at a 3→1 step.
            let cols = x * w / nx..(x + 1) * w / nx;
            let count = (rows.len() * cols.len()) as u32;
            let mut sum = [0_u32; 4];
            for row in rows.clone() {
                for col in cols.clone() {
                    let start = (row * w + col) * 4;
                    for (c, total) in sum.iter_mut().enumerate() {
                        let value = level[start + c];
                        *total += if srgb && c < 3 {
                            transfer.linear[usize::from(value)]
                        } else {
                            u32::from(value)
                        };
                    }
                }
            }
            for (c, total) in sum.into_iter().enumerate() {
                let mean = (total + count / 2) / count;
                result.push(if srgb && c < 3 { transfer.srgb[mean as usize] } else { mean as u8 });
            }
        }
    }
    result
}

pub(super) fn filter(images: &mut Assets<Image>, material: &StandardMaterial) {
    static TRANSFER: std::sync::OnceLock<Transfer> = std::sync::OnceLock::new();
    let transfer = TRANSFER.get_or_init(Transfer::default);
    for handle in
        [&material.base_color_texture, &material.metallic_roughness_texture, &material.normal_map_texture]
            .into_iter()
            .flatten()
    {
        let Some(image) = images.get(handle.id()) else { continue };
        let desc = &image.texture_descriptor;
        let srgb = desc.format == TextureFormat::Rgba8UnormSrgb;
        if desc.mip_level_count != 1 || !(srgb || desc.format == TextureFormat::Rgba8Unorm) {
            continue;
        }
        let (mut w, mut h) = (image.width() as usize, image.height() as usize);
        if desc.size.depth_or_array_layers != 1 || image.data.as_ref().is_none_or(|d| d.len() != w * h * 4) {
            continue;
        }
        let Some(mut image) = images.get_mut(handle.id()) else { continue };
        let Some(data) = image.data.as_mut() else { continue };
        let mut offset = 0;
        let mut levels = 1;
        while w > 1 || h > 1 {
            let next = half(&data[offset..], w, h, srgb, transfer);
            offset = data.len();
            data.extend(next);
            w = (w / 2).max(1);
            h = (h / 2).max(1);
            levels += 1;
        }
        image.texture_descriptor.mip_level_count = levels;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn odd_wrap_includes_the_last_texel_and_filters_coverage_linearly() {
        let pixels = [0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255];
        let transfer = Transfer::default();
        assert_eq!(half(&pixels, 3, 1, false, &transfer), [85; 4]);
        assert_eq!(half(&pixels, 3, 1, true, &transfer), [156, 156, 156, 85]);
    }
}
