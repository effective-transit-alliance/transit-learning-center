import FareModel.Distribution

/-!
# Fare Cap Analysis — Closed-Form Distributions

Analytic trip/revenue distributions for fare cap and PPR policies,
suitable for direct evaluation in a chart renderer. No sampling or RNG.

PPR is the degenerate case where `cap = ∞` (or just large enough to never
bind). Everything here applies to both.

We condition on `budget ≥ fare * workTrips` so every rider can afford their
work trips. This eliminates the ill-formed case and makes `max(workTrips, -)`
redundant in the trip formula.

## 2D model

Both `maxTrips` (M) and `budget` (b) vary, drawn independently from
truncated normals. `workTrips` (w) is fixed.

For a rider `(M, b)` under fare cap with fare `q`, cap `C`:
- `b ≥ C`: trips = M (cap covers everything)
- `b < C`: trips = min(M, ⌊b/q⌋) (PPR below cap)

## Histogram: P(trips = n)

A rider takes exactly `n` trips in two ways:
- **Time-bound**: M = n and b ≥ q·n (time is the constraint)
- **Budget-bound**: M > n and q·n ≤ b < min(q·(n+1), C) (money is the constraint)

With `p(n) = P(M = n)`, `S(n) = P(M > n)`, `F` = budget CDF:

  `P(trips = n) = p(n)·(1 - F(q·n)) + S(n)·max(0, F(min(q·(n+1), C)) - F(q·n))`

TypeScript evaluates `Φ` (normal CDF) at breakpoints `q·w, q·(w+1), ..., C`.
-/

noncomputable section
open Classical

-- ============== PPR Trip Count ==============

/-! ### PPR trip count as a pure function

`pprTrips M q b = min(M, ⌊b/q⌋)` — the trip count for a single rider,
given their time budget `M`, fare `q`, and monetary budget `b`.

This is the core building block. We first define it, then prove it matches
the `FarePolicy` machinery from `Basic.lean`.
-/

/-- PPR trip count as a function of budget alone (fixing M, fare).
Conditioned on `budget ≥ fare * workTrips` (so `max(workTrips, -)` is
redundant and we just need `min(M, ⌊budget/fare⌋)`). -/
def pprTrips (M : NumTrips) (fare budget : Dollars) : NumTrips :=
  min M (Nat.floor (budget / fare))

/-- `pprTrips` agrees with `PayPerRide.farePolicy.maxTrips` when
`budget ≥ fare * workTrips`. -/
theorem pprTrips_eq_farePolicy (ppr : PayPerRide) (p : TripProfile)
    (h : ppr.fare * p.workTrips ≤ p.budget) :
    pprTrips p.maxTrips ppr.fare p.budget = ppr.farePolicy.maxTrips p := by
  unfold pprTrips
  show min p.maxTrips (Nat.floor (p.budget / ppr.fare)) =
    max p.workTrips (min p.maxTrips (Nat.floor (p.budget / ppr.fare)))
  rw [max_eq_right]
  exact le_min p.work_le_max (le_floor_of_mul_le ppr.fare_pos p.budget_pos h)

-- ============== Staircase Structure ==============

/-! ### The staircase

`pprTrips M q b` is piecewise constant in `b`:
- For `q·n ≤ b < q·(n+1)` where `n < M`: trips = n.
- For `b ≥ q·M`: trips = M (time-capped).
-/

/-- Staircase: if budget lands in `[fare·n, fare·(n+1))` and `n < M`,
then `pprTrips = n`. -/
theorem pprTrips_eq_of_interval {M n : NumTrips} {fare budget : Dollars}
    (hfare : 0 < fare) (hlo : fare * ↑n ≤ budget) (hhi : budget < fare * ↑(n + 1))
    (hlt : n < M) :
    pprTrips M fare budget = n := by
  unfold pprTrips
  have hbnn : 0 ≤ budget / fare :=
    div_nonneg (le_trans (mul_nonneg hfare.le (Nat.cast_nonneg _)) hlo) hfare.le
  have : Nat.floor (budget / fare) = n := by
    rw [Nat.floor_eq_iff hbnn]
    exact ⟨by rw [le_div_iff₀ hfare]; nlinarith,
           by rw [div_lt_iff₀ hfare, mul_comm]; exact_mod_cast hhi⟩
  rw [this, min_eq_right (le_of_lt hlt)]

/-- Time-capped: if `budget ≥ fare·M`, then `pprTrips = M`. -/
theorem pprTrips_eq_of_time_capped {M : NumTrips} {fare budget : Dollars}
    (hfare : 0 < fare) (h : fare * ↑M ≤ budget) :
    pprTrips M fare budget = M := by
  unfold pprTrips
  rw [min_eq_left]
  have hbnn : 0 ≤ budget / fare :=
    div_nonneg (le_trans (mul_nonneg hfare.le (Nat.cast_nonneg _)) h) hfare.le
  rw [Nat.le_floor_iff hbnn, le_div_iff₀ hfare]
  nlinarith

-- ============== Fare Cap Trips ==============

/-! ### Fare cap trip count

With cap `C`, the trip count is:
- `M` if `b ≥ C` (cap covers all trips)
- `pprTrips M q b` if `b < C` (PPR below cap)
-/

/-- Fare cap trip count: M if budget covers the cap, otherwise PPR. -/
def fareCapTrips (M : NumTrips) (fare cap budget : Dollars) : NumTrips :=
  if cap ≤ budget then M else pprTrips M fare budget

/-- `fareCapTrips` agrees with `FareCap.farePolicy.maxTrips` when
`budget ≥ fare * workTrips`. -/
theorem fareCapTrips_eq_farePolicy (fc : FareCap) (p : TripProfile)
    (h : fc.fare * p.workTrips ≤ p.budget) :
    fareCapTrips p.maxTrips fc.fare fc.cap p.budget = fc.farePolicy.maxTrips p := by
  unfold fareCapTrips
  show (if fc.cap ≤ p.budget then p.maxTrips else pprTrips p.maxTrips fc.fare p.budget) =
    (if fc.cap ≤ p.budget then p.maxTrips
     else max p.workTrips (min p.maxTrips (Nat.floor (p.budget / fc.fare))))
  by_cases hcap : fc.cap ≤ p.budget
  · rw [if_pos hcap, if_pos hcap]
  · rw [if_neg hcap, if_neg hcap]
    exact pprTrips_eq_farePolicy ⟨fc.fare, fc.fare_pos⟩ p h

-- ============== Histogram Weights ==============

/-! ### Histogram formula

For independent distributions on `(M, b)`:

  `riders(n) = m(n)·(1 - F(q·n)) + S(n)·max(0, F(min(q·(n+1), C)) - F(q·n))`

where:
- `m(n)` — maxTrips mass at `n` (discretized normal, unnormalized)
- `S(n)` — maxTrips survival mass (riders with `M > n`)
- `F` — budget cumulative mass (truncated normal, conditioned on `b ≥ q·w`)

The first term captures **time-bound** riders (M = n, can afford n trips).
The second term captures **budget-bound** riders (M > n, budget lands in
the interval `[q·n, min(q·(n+1), C))`).

Total mass = population size. TypeScript evaluates `Φ` at breakpoints.
-/

/-- Measure weight (unnormalized — total mass = population size). -/
abbrev Mass := ℝ

/-- Histogram weight: number of riders taking exactly `n` trips
under fare cap, given maxTrips mass function `mf`, maxTrips survival
mass `surv`, and budget cumulative mass `cmf`. -/
def histWeight (mf surv : NumTrips → Mass) (cmf : DollarsReal → Mass)
    (fare cap : DollarsReal) (n : NumTrips) : Mass :=
  mf n * (1 - cmf (min (fare * n) cap)) +
  surv n * max 0 (cmf (min (fare * (n + 1)) cap) - cmf (fare * n))

-- ============== Histogram Correspondence ==============

/-! ### Correspondence: `fareCapTrips = n` ↔ time-bound or budget-bound

A rider `(M, b)` takes exactly `n` trips iff:
- **Time-bound**: `M = n` and `b ≥ min(fare·n, cap)`, or
- **Budget-bound**: `M > n` and `fare·n ≤ b < min(fare·(n+1), cap)`.
-/

/-- Time-bound: if `M = n` and `b ≥ min(fare·n, cap)`, rider takes `n` trips. -/
theorem fareCapTrips_of_time_bound {M n : NumTrips} {fare cap budget : Dollars}
    (hfare : 0 < fare) (hM : M = n)
    (hb : fare * ↑n ≤ budget ∨ cap ≤ budget) :
    fareCapTrips M fare cap budget = n := by
  subst hM
  unfold fareCapTrips
  rcases hb with hfare_le | hcap_le
  · -- can afford n trips
    by_cases hcap : cap ≤ budget
    · rw [if_pos hcap]
    · rw [if_neg hcap]
      exact pprTrips_eq_of_time_capped hfare hfare_le
  · -- cap covers
    rw [if_pos hcap_le]

/-- Budget-bound: if `M > n` and `fare·n ≤ b < fare·(n+1)` and `b < cap`,
rider takes `n` trips. -/
theorem fareCapTrips_of_budget_bound {M n : NumTrips} {fare cap budget : Dollars}
    (hfare : 0 < fare) (hlt : n < M)
    (hlo : fare * ↑n ≤ budget) (hhi : budget < fare * ↑(n + 1))
    (hcap : budget < cap) :
    fareCapTrips M fare cap budget = n := by
  unfold fareCapTrips
  rw [if_neg (not_le.mpr hcap)]
  exact pprTrips_eq_of_interval hfare hlo hhi hlt

/-- Converse: if rider takes `n` trips, they are time-bound or budget-bound. -/
theorem fareCapTrips_cases {M n : NumTrips} {fare cap budget : Dollars}
    (hfare : 0 < fare) (hbudget : 0 < budget)
    (h : fareCapTrips M fare cap budget = n) :
    (M = n ∧ (fare * ↑n ≤ budget ∨ cap ≤ budget)) ∨
    (n < M ∧ fare * ↑n ≤ budget ∧ budget < fare * ↑(n + 1) ∧ budget < cap) := by
  -- TODO: prove by case analysis on cap ≤ budget and the floor value
  sorry

end
