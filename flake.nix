{
  description = "Space Race: crewed spacecraft, modelled to scale";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    devshell.url = "github:numtide/devshell";
    devshell.inputs.nixpkgs.follows = "nixpkgs";
    treefmt-nix.url = "github:numtide/treefmt-nix";
    treefmt-nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        inputs.devshell.flakeModule
        inputs.treefmt-nix.flakeModule
      ];

      systems = [
        "x86_64-linux"
        "aarch64-darwin"
      ];

      perSystem =
        { pkgs, lib, ... }:
        {
          devshells.default = {
            # Blender comes from nixpkgs on Linux. On macOS tools/build-model.mjs uses
            # /Applications/Blender.app (or $BLENDER).
            packages = [
              pkgs.nodejs
              pkgs.pnpm
              pkgs.ruff
              pkgs.biome
              # The native build (rust/): rustup reads rust/rust-toolchain.toml and fetches that toolchain.
              pkgs.rustup
            ]
            ++ lib.optionals pkgs.stdenv.isLinux [ pkgs.blender ];
            # The native build's helpers: `menu` lists them. Each runs from rust/, where cargo finds the toolchain.
            commands = [
              {
                category = "native build";
                name = "fly";
                help = "build the native game (release) and open it; arguments go to it: fly --at 60";
                command = ''
                  [ -d "$PRJ_ROOT/rust/assets/models" ] || node "$PRJ_ROOT/rust/tools/unpack-models.mjs"
                  cd "$PRJ_ROOT/rust" && cargo run --release -p space-race -- "$@"
                '';
              }
              {
                category = "native build";
                name = "fly-dev";
                help = "the same from a debug build: quick to compile, slower to run";
                command = ''
                  [ -d "$PRJ_ROOT/rust/assets/models" ] || node "$PRJ_ROOT/rust/tools/unpack-models.mjs"
                  cd "$PRJ_ROOT/rust" && cargo run -p space-race -- "$@"
                '';
              }
              {
                category = "native build";
                name = "fly-check";
                help = "format check, clippy with warnings as errors, every test";
                command = ''
                  cd "$PRJ_ROOT/rust" && cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace
                '';
              }
              {
                category = "native build";
                name = "fly-models";
                help = "unpack public/models for the native build (after a model is rebuilt)";
                command = ''node "$PRJ_ROOT/rust/tools/unpack-models.mjs" "$@"'';
              }
            ];
            # A commit that touches rust/ is held to its rules (.githooks/pre-commit).
            devshell.startup.hooks.text = "git config core.hooksPath .githooks";
          };

          treefmt = {
            projectRootFile = "flake.nix";
            programs.nixfmt.enable = true;
            programs.ruff-format.enable = true;
            # Biome as a plain formatter rather than programs.biome, which generates its own
            # config: this way `nix fmt` and `pnpm format` both read biome.jsonc. Ruff reads
            # pyproject.toml either way.
            settings.formatter.biome = {
              command = lib.getExe pkgs.biome;
              options = [
                "format"
                "--write"
                "--no-errors-on-unmatched"
              ];
              includes = [
                "*.ts"
                "*.mjs"
                "*.js"
                "*.json"
                "*.jsonc"
              ];
            };
          };
        };
    };
}
