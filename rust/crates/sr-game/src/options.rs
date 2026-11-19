//! What the command line asked for.

use std::path::PathBuf;

use bevy::prelude::Resource;

/// How the game was started.
#[derive(Resource, Debug, Clone, PartialEq)]
pub struct Options {
    /// The window's size, in points.
    pub size: (u32, u32),
    /// Seconds from liftoff to open at.
    pub at: f64,
    /// Write one frame here and leave, instead of opening a window.
    pub shot: Option<PathBuf>,
    /// The camera for that frame: bearing and elevation in degrees, distance and height of what it looks at in m.
    pub pose: Option<[f32; 4]>,
    /// The rig to open on, by name.
    pub rig: Option<String>,
    /// Print what a frame costs once a second.
    pub bench: bool,
    /// Open in the straight grade instead of the film's.
    pub reference: bool,
}

impl Default for Options {
    fn default() -> Self {
        Self {
            size: (1600, 900),
            at: -12.0,
            shot: None,
            pose: None,
            rig: None,
            bench: false,
            reference: false,
        }
    }
}

/// How to use it.
pub const USAGE: &str = "\
space-race [--at <seconds>] [--size <w>x<h>] [--rig <name>] [--bench] [--reference]
           [--shot <file.png> [--pose <bearing>,<elevation>,<distance>,<height>]]

  --at     seconds from liftoff to open at (default -12)
  --rig    pad | tracking | chase | onboard
  --shot   write one frame to a PNG and leave
  --pose   the camera for that frame, about the vehicle: degrees, degrees, metres, metres
  --bench  print what a frame costs once a second
  --reference  the straight grade, for judging colours, instead of the film's";

impl Options {
    /// From the arguments after the program's name.
    ///
    /// # Errors
    /// What was wrong with them, for showing with [`USAGE`].
    pub fn parse(args: impl IntoIterator<Item = String>) -> Result<Self, String> {
        let mut options = Self::default();
        let mut args = args.into_iter();
        while let Some(flag) = args.next() {
            match flag.as_str() {
                "--bench" => options.bench = true,
                "--reference" => options.reference = true,
                _ => {}
            }
            if matches!(flag.as_str(), "--bench" | "--reference") {
                continue;
            }
            let value = args.next().ok_or_else(|| format!("{flag} needs a value"))?;
            let bad = || format!("{flag}: cannot read {value:?}");
            match flag.as_str() {
                "--at" => options.at = value.parse().map_err(|_| bad())?,
                "--rig" => options.rig = Some(value),
                "--shot" => options.shot = Some(PathBuf::from(value)),
                "--size" => {
                    let (w, h) = value.split_once('x').ok_or_else(bad)?;
                    options.size = (w.parse().map_err(|_| bad())?, h.parse().map_err(|_| bad())?);
                }
                "--pose" => {
                    let parts: Vec<f32> =
                        value.split(',').map(str::parse).collect::<Result<_, _>>().map_err(|_| bad())?;
                    options.pose = Some(parts.try_into().map_err(|_| bad())?);
                }
                _ => return Err(format!("unknown option {flag}")),
            }
        }
        Ok(options)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(line: &str) -> Result<Options, String> {
        Options::parse(line.split_whitespace().map(String::from))
    }

    #[test]
    fn it_reads_what_it_documents() {
        let o = parse("--at 30 --size 1280x720 --shot out.png --pose 215,9,150,14 --bench").unwrap();
        assert_eq!((o.at, o.size, o.bench), (30.0, (1280, 720), true));
        assert_eq!(o.pose, Some([215.0, 9.0, 150.0, 14.0]));
        assert_eq!(parse("").unwrap(), Options::default());
    }

    #[test]
    fn it_says_what_was_wrong() {
        assert!(parse("--pose 1,2").is_err());
        assert!(parse("--nonsense 1").is_err());
        assert!(parse("--at").is_err());
    }
}
