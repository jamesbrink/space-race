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
            ]
            ++ lib.optionals pkgs.stdenv.isLinux [ pkgs.blender ];
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
