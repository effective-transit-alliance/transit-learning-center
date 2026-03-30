import FareModel.Distribution

/-!
# Prepaid Pass Analysis — Crossover and Policy Menus

When riders choose between PPR and an unlimited pass, the population
splits at a **crossover threshold**. This file derives the closed-form
split and the resulting aggregate distributions.

## The decision problem

A rational rider with expected profile `(w, M, b)` facing:
- PPR at fare `q`
- Unlimited pass at price `P`

chooses the pass iff the pass is cheaper:

  `P ≤ q * trips_ppr(b)`

where `trips_ppr(b) = max(w, min(M, ⌊b/q⌋))`.

### Crossover budget threshold

Since `trips_ppr(b)` is non-decreasing in `b`, there is a threshold
`b*` such that riders with `b ≥ b*` prefer the pass.

Two cases:
- If `P ≤ q * w`: everyone buys the pass (even minimum-trip riders save).
  `b* = 0`.
- If `P > q * M`: nobody buys the pass (even max-trip riders are cheaper
  with PPR). `b* = ∞`.
- Otherwise: `b* = P` (the budget at which PPR cost equals pass price).
  More precisely, riders with `⌊b/q⌋ ≥ P/q` prefer the pass, so
  `b* = q * ⌈P/q⌉` (the smallest budget where PPR trips hit the
  break-even count).

### Population split

For budget density `f` with CDF `F`:

  `fraction_ppr = F(b*)`
  `fraction_pass = 1 - F(b*)`

### Trip distribution under the menu

PPR riders (budget < b*):
  Same staircase histogram as `FareCapAnalysis`, but truncated at `b*`.
  `P_ppr(trips = n) = (F(min(b*, q*(n+1))) - F(q*n)) / F(b*)`

Pass riders (budget ≥ b*):
  Everyone rides `M` trips (time-capped). Trivial distribution: point
  mass at `M`.

Combined distribution:
  `P(trips = n) = F(b*) * P_ppr(n)` for `n < M`
  `P(trips = M) = F(b*) * P_ppr(M) + (1 - F(b*))`

### Revenue under the menu

  `revenue_ppr = ∑_{n=w}^{M} P_ppr(n) * q * n * F(b*)`
  `revenue_pass = (1 - F(b*)) * P`
  `total_revenue = revenue_ppr + revenue_pass`

All closed-form for standard densities.

### What to formalize

- [ ] `crossover_threshold`: define `b*` as a function of `q`, `P`, `w`, `M`.
- [ ] `pass_iff`: prove a rider prefers pass iff `P ≤ q * trips_ppr(b)`.
- [ ] `crossover_correct`: prove riders above `b*` prefer pass, below prefer PPR.
- [ ] `combined_distribution`: prove the combined trip histogram formula.
- [ ] `total_revenue_closed_form`: express aggregate revenue as a function
      of `q`, `P`, `F`, `w`, `M` — the formula TypeScript evaluates.
-/
