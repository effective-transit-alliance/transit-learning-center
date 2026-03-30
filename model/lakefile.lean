import Lake
open Lake DSL

package fareModel where
  leanOptions := #[⟨`autoImplicit, false⟩]

@[default_target]
lean_lib FareModel where

require mathlib from git
  "https://github.com/leanprover-community/mathlib4" @ "master"
