//! A WAV file written and read: two channels of sixteen bits at [`RATE`], which is all the offline render needs.

use std::fs::File;
use std::io::{self, BufWriter, Read, Seek, SeekFrom, Write};
use std::path::Path;

use super::dsp::RATE;

const CHANNELS: u16 = 2;
const HEADER: u32 = 44;

/// A file being written.
#[derive(Debug)]
pub struct Tape {
    file: BufWriter<File>,
    bytes: u32,
}

impl Tape {
    /// Start one at `path`, making the directory it is in if it is not there.
    ///
    /// # Errors
    /// The file could not be made or written to.
    pub fn create(path: &Path) -> io::Result<Self> {
        if let Some(parent) = path.parent().filter(|parent| !parent.as_os_str().is_empty()) {
            std::fs::create_dir_all(parent)?;
        }
        let mut file = BufWriter::new(File::create(path)?);
        file.write_all(&header(0))?;
        Ok(Self { file, bytes: 0 })
    }

    /// Add samples, left and right by turns, each from -1 to 1.
    ///
    /// # Errors
    /// The file could not be written to.
    pub fn write(&mut self, samples: &[f32]) -> io::Result<()> {
        for &sample in samples {
            let word = (sample.clamp(-1.0, 1.0) * 32_767.0).round() as i16;
            self.file.write_all(&word.to_le_bytes())?;
        }
        self.bytes += 2 * samples.len() as u32;
        Ok(())
    }

    /// Finish it: the header is told how long it turned out.
    ///
    /// # Errors
    /// The file could not be written to.
    pub fn finish(mut self) -> io::Result<()> {
        self.file.seek(SeekFrom::Start(0))?;
        self.file.write_all(&header(self.bytes))?;
        self.file.flush()
    }
}

/// The forty-four bytes a WAV file of `bytes` of samples opens with.
fn header(bytes: u32) -> Vec<u8> {
    let rate = RATE as u32;
    let frame = CHANNELS * 2;
    let mut header = Vec::with_capacity(HEADER as usize);
    header.extend(b"RIFF");
    header.extend((HEADER - 8 + bytes).to_le_bytes());
    header.extend(b"WAVEfmt ");
    header.extend(16_u32.to_le_bytes());
    // (plain PCM)
    header.extend(1_u16.to_le_bytes());
    header.extend(CHANNELS.to_le_bytes());
    header.extend(rate.to_le_bytes());
    header.extend((rate * u32::from(frame)).to_le_bytes());
    header.extend(frame.to_le_bytes());
    header.extend(16_u16.to_le_bytes());
    header.extend(b"data");
    header.extend(bytes.to_le_bytes());
    header
}

/// Read one of ours back: its two channels, each from -1 to 1.
///
/// # Errors
/// The file could not be read, or is not a WAV file as [`Tape`] writes them.
pub fn read(path: &Path) -> io::Result<[Vec<f32>; 2]> {
    let mut bytes = Vec::new();
    File::open(path)?.read_to_end(&mut bytes)?;
    let ours = bytes.len() >= HEADER as usize
        && &bytes[..4] == b"RIFF"
        && &bytes[8..12] == b"WAVE"
        && bytes[22..24] == CHANNELS.to_le_bytes()
        && bytes[34..36] == 16_u16.to_le_bytes();
    if !ours {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "not a two-channel, sixteen-bit WAV file"));
    }
    let (mut left, mut right) = (Vec::new(), Vec::new());
    for frame in bytes[HEADER as usize..].as_chunks::<4>().0 {
        left.push(f32::from(i16::from_le_bytes([frame[0], frame[1]])) / 32_767.0);
        right.push(f32::from(i16::from_le_bytes([frame[2], frame[3]])) / 32_767.0);
    }
    Ok([left, right])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn what_is_written_is_read_back() {
        let path = std::env::temp_dir().join(format!("sr-sound-{}.wav", std::process::id()));
        let mut tape = Tape::create(&path).unwrap();
        tape.write(&[0.0, 1.0, -1.0, 0.5, 0.25, -0.25]).unwrap();
        tape.write(&[2.0, -2.0]).unwrap();
        tape.finish().unwrap();
        let bytes = std::fs::read(&path).unwrap();
        assert_eq!(bytes.len(), 44 + 16);
        // The lengths in the header are the file's: 36 + the samples' bytes, and the samples' bytes.
        assert_eq!(u32::from_le_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]), 52);
        assert_eq!(u32::from_le_bytes([bytes[40], bytes[41], bytes[42], bytes[43]]), 16);
        assert_eq!(u32::from_le_bytes([bytes[24], bytes[25], bytes[26], bytes[27]]), 48_000);
        let [left, right] = read(&path).unwrap();
        std::fs::remove_file(&path).unwrap();
        assert!(left.iter().zip([0.0, -1.0, 0.25, 1.0]).all(|(a, b)| (a - b).abs() < 1e-4), "{left:?}");
        assert!((right[1] - 0.5).abs() < 1e-4 && right[3] == -1.0);
    }
}
