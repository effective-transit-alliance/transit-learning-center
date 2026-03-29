#!/usr/bin/env bash
set -euo pipefail

GH_PAGES_COMMIT="$(nix build '.#svg-pages-commit' --no-link --print-out-paths)"

git fetch "$GH_PAGES_COMMIT" svg-pages:svg-pages --force

echo "Updated svg-pages to $(git rev-parse svg-pages)"
