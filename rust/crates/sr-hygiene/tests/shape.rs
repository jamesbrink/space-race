//! The rules of `rust/README.md` that a compiler does not check.

use std::fs;

use sr_hygiene::{ENGINE, MAX_LINES, MAX_ROOT_LINES, PURE, dependencies, sources, workspace};

#[test]
fn no_file_is_a_god_file() {
    let mut long = Vec::new();
    for path in sources().unwrap() {
        let lines = fs::read_to_string(&path).unwrap().lines().count();
        let name = path.file_name().unwrap().to_string_lossy().into_owned();
        let limit =
            if ["lib.rs", "mod.rs", "main.rs"].contains(&name.as_str()) { MAX_ROOT_LINES } else { MAX_LINES };
        if lines > limit {
            long.push(format!(
                "{} has {lines} lines, over {limit}",
                path.strip_prefix(workspace()).unwrap().display()
            ));
        }
    }
    assert!(long.is_empty(), "split these by what they do:\n{}", long.join("\n"));
}

#[test]
fn the_pure_crates_know_no_engine_and_only_what_is_below_them() {
    for (krate, allowed) in PURE {
        for dep in dependencies(krate).unwrap() {
            assert!(
                !ENGINE.iter().any(|e| dep.starts_with(e)),
                "{krate} depends on {dep}: it must stay engine-free"
            );
            if dep.starts_with("sr-") {
                assert!(allowed.contains(&dep.as_str()), "{krate} depends on {dep}, which is not below it");
            }
        }
    }
}

#[test]
fn the_picture_does_not_know_the_flight() {
    for dep in dependencies("sr-render").unwrap() {
        assert!(
            !["sr-sim", "sr-missions", "sr-game"].contains(&dep.as_str()),
            "sr-render depends on {dep}: it draws what it is handed and knows no flight"
        );
    }
}

#[test]
fn every_file_says_what_it_is() {
    for path in sources().unwrap() {
        let text = fs::read_to_string(&path).unwrap();
        assert!(
            text.starts_with("//!"),
            "{} does not open with a `//!` line saying what it is for",
            path.display()
        );
    }
}

#[test]
fn no_asset_path_starts_at_the_root() {
    for path in sources().unwrap() {
        if path.components().any(|c| c.as_os_str() == "sr-hygiene") {
            continue;
        }
        let text = fs::read_to_string(&path).unwrap();
        for ext in [".glb\"", ".png\"", ".jpg\""] {
            for (at, _) in text.match_indices(ext) {
                let start = text[..at].rfind('"').unwrap_or(0);
                assert!(
                    !text[start..at].starts_with("\"/"),
                    "{}: an asset path with a leading slash",
                    path.display()
                );
            }
        }
    }
}
