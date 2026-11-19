//! The workspace's shape, read off the disk for the tests in `tests/` to hold.
//!
//! Nothing here is used by the game. The rules are in `rust/README.md`, "Rules".

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// The longest a source file may be. Past this a file is doing more than one thing: split it.
pub const MAX_LINES: usize = 400;

/// The longest a `lib.rs`, `mod.rs` or `main.rs` may be: they declare and wire, they do not do.
pub const MAX_ROOT_LINES: usize = 120;

/// Crates with no engine in them, lowest first, and the workspace crates each may depend on.
pub const PURE: [(&str, &[&str]); 4] = [
    ("sr-measure", &[]),
    ("sr-world", &["sr-measure"]),
    ("sr-sim", &["sr-measure", "sr-world"]),
    ("sr-missions", &["sr-measure", "sr-world", "sr-sim"]),
];

/// What a crate with no engine in it may not name among its dependencies.
pub const ENGINE: [&str; 4] = ["bevy", "avian", "wgpu", "winit"];

/// The `rust/` directory.
#[must_use]
pub fn workspace() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

/// Every `.rs` file under `crates/` and `apps/`.
///
/// # Errors
/// Any error reading the tree.
pub fn sources() -> io::Result<Vec<PathBuf>> {
    let mut found = Vec::new();
    for top in ["crates", "apps"] {
        walk(&workspace().join(top), &mut found)?;
    }
    Ok(found)
}

fn walk(dir: &Path, found: &mut Vec<PathBuf>) -> io::Result<()> {
    for entry in fs::read_dir(dir)? {
        let path = entry?.path();
        if path.is_dir() {
            if path.file_name().is_some_and(|n| n != "target") {
                walk(&path, found)?;
            }
        } else if path.extension().is_some_and(|e| e == "rs") {
            found.push(path);
        }
    }
    Ok(())
}

/// The names under `[dependencies]` in a crate's manifest.
///
/// # Errors
/// Any error reading the manifest.
pub fn dependencies(krate: &str) -> io::Result<Vec<String>> {
    let manifest = fs::read_to_string(workspace().join("crates").join(krate).join("Cargo.toml"))?;
    let mut inside = false;
    let mut names = Vec::new();
    for line in manifest.lines().map(str::trim) {
        if line.starts_with('[') {
            inside = line == "[dependencies]";
        } else if inside && let Some((name, _)) = line.split_once(['.', '=', ' ']) {
            names.push(name.to_owned());
        }
    }
    Ok(names)
}
