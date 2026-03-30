# Transit Fare Structures

![Transit Fare Structures Screenshot](https://effective-transit-alliance.github.io/transit-learning-center/fare-structures.png)

[**View Interactive Demo**](https://effective-transit-alliance.github.io/transit-learning-center/fare-structures.svg)

An interactive visualization comparing transit fare policies: pay-per-ride, fare capping, and prepaid unlimited passes.
Drag the dots to explore different thresholds and see how ridership distributions change.

It is just a single [SVG](https://en.wikipedia.org/wiki/SVG) with embedded TypeScript (compiled to JavaScript).

## Disclaimer

**The ridership model (Charts 2 & 3) is not at all realistic.**
It exists as an exercise in trying to vibe code distribution charts that *look* approximately correct and respond plausibly to the sliders.
Everything about the models is wrong --- faulty theory of budget and time binding constraints, not fitting to actual data anywhere, etc.
Do not use these charts to draw conclusions about actual ridership.

Chart 1 (fare structures) is straightforward geometry and is correct.

## Formal model

The `model/` directory contains a Lean 4 + Mathlib formalization of the fare policy math.
The goal is to derive closed-form histogram formulas and prove they correspond to the abstract fare policy definitions, so the TypeScript chart code can be verified against something precise.
This is a work in progress --- some proofs are complete, others are sketched as literate plans with `sorry`.

## Building

Requires [Nix](https://nixos.org/) with flakes:

```sh
nix build .#svg
```

The output is a self-contained SVG file.
