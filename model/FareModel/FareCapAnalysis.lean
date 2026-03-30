import FareModel.Distribution

/-!
# Fare Cap Analysis — Closed-Form Distributions

Analytic trip/revenue/surplus distributions for fare cap and PPR policies,
suitable for direct evaluation in a chart renderer. No sampling or RNG.

PPR is the degenerate case where `cap = ∞` (or just large enough to never
bind). Everything here applies to both.

## 1D budget model

Fix `workTrips = w` and `maxTrips = M`. The only varying dimension is
`budget ~ f(b)` for some density `f` on `(0, ∞)`.

### PPR trip count as a function of budget

For PPR with fare `q`:

  `trips(b) = max(w, min(M, ⌊b/q⌋))`

This is a **staircase** (piecewise constant) in `b`:
- For `b < q * w`: trips = w (can't even afford work trips, but takes
  them anyway — inelastic).
- For `q * n ≤ b < q * (n+1)` where `w ≤ n ≤ M`: trips = n.
- For `b ≥ q * M`: trips = M (time-capped).

### Trip distribution (histogram weights)

The fraction of riders taking exactly `n` trips is:

  `P(trips = n) = F(q*(n+1)) - F(q*n)`    for `w ≤ n < M`
  `P(trips = M) = 1 - F(q*M)`             (time-capped riders)
  `P(trips = w) += F(q*w)`                 (budget-constrained below work)

where `F` is the CDF of `budget`. For uniform `budget ~ U[a,b]`:

  `P(trips = n) = min(b, q*(n+1)) - max(a, q*n)) / (b - a)`

For exponential `budget ~ Exp(λ)`:

  `P(trips = n) = e^{-λ*q*n} - e^{-λ*q*(n+1)}`

These are the smooth curves the chart renders — no numerical integration.

### Fare cap modification

With fare cap `C`, the cost function is `min(q*n, C)`. The cap binds
when `b ≥ C`, at which point the rider can afford all `M` trips.

  `trips(b) = if b ≥ C then M else max(w, min(M, ⌊b/q⌋))`

The trip distribution gains a **point mass at M**:

  `P(trips = M) = 1 - F(C)`

and the histogram below is the same as PPR but truncated at `C`.

### Revenue distribution

PPR revenue for a rider taking `n` trips: `q * n`.
Fare cap revenue: `min(q * n, C)`.

Aggregate revenue = `∑_n P(trips=n) * cost(n)` — closed-form sum.

### What to formalize

- [ ] `trips_of_budget`: PPR trip count as a function of budget alone
      (fixing w, M, q). Prove it equals the `FarePolicy.maxTrips` applied
      to the corresponding `TripProfile`.
- [ ] `trips_piecewise`: prove the staircase structure — identify the
      breakpoints and the constant value on each interval.
- [ ] `fareCap_splits`: prove the fare cap case splits into PPR-below-cap
      + point-mass-at-M-above-cap.
- [ ] `histogram_weights`: for a given CDF `F`, express `P(trips = n)` as
      `F(q*(n+1)) - F(q*n)` and prove it sums to 1.
- [ ] `aggregate_revenue`: closed-form sum for total revenue.
-/
