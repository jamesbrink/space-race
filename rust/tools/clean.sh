#!/bin/sh
# fly-clean [size in GB | --all]: give disk back from the native build.
#
#   fly-clean        the incremental caches (rebuilt as needed), then the oldest build artefacts until rust/target is
#                    under 20 GB (cargo-sweep), and worktrees whose folder has gone (git worktree prune)
#   fly-clean 10     the same, down to 10 GB
#   fly-clean --all  everything under rust/target: the next build starts from nothing (about ten minutes)
#
# It says what each worktree's own rust/target holds, but never touches another worktree: one may be in use.
set -eu
cd "$(dirname "$0")/.."
free() { df -h . | awk 'NR==2 { print $4 " free" }'; }
size() { [ -d "$1" ] && du -sh "$1" 2>/dev/null | cut -f1 || echo "none"; }

echo "before: rust/target $(size target), $(free)"
if [ "${1:-}" = "--all" ]; then
  cargo clean
else
  rm -rf target/debug/incremental target/release/incremental
  if command -v cargo-sweep > /dev/null; then
    cargo sweep --maxsize "${1:-20}GB" > /dev/null
  else
    echo "cargo-sweep is not on PATH (it comes with the devshell): only the incremental caches were removed"
  fi
fi
git worktree prune
echo "after:  rust/target $(size target), $(free)"

git worktree list --porcelain | awk '/^worktree / { print $2 }' | while read -r tree; do
  [ "$tree" = "$(cd .. && pwd)" ] && continue
  [ -d "$tree/rust/target" ] && echo "worktree $tree: rust/target $(size "$tree/rust/target") (clean it there)"
done
exit 0
