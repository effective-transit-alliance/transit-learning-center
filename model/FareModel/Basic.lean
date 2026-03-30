import Mathlib.Algebra.Order.Floor.Defs
import Mathlib.Data.Real.Archimedean

/-!
# Trip Profiles and Fare Policies

A rider's demand is determined by two real resources: **time** and **money**.
No utility functions.

- `workTrips`: inelastic — you go to work unless you're sick.
- `maxTrips`: time budget — trips take 20 min to 2 hours.
- `budget`: transit money available per month.

Trip count under any policy = `max(workTrips, min(maxTrips, affordable))`.
Work trips are always taken (inelastic). Beyond that, you ride until
you run out of time or money, whichever comes first.

## Two-layer model

1. Sample expected profile `e ~ μ`. Decide pass vs pay-per-ride.
2. Sample actual profile `a ~ perturbation(e)` (sick days, overtime).
3. Actual trips = closed form applied to `a` under the chosen policy.
-/

noncomputable section
open Classical

/-- Number of trips. -/
abbrev NumTrips := ℕ

/-- Dollar amount (rational). -/
abbrev Dollars := ℚ

/-- Dollar amount (real-valued, for any fancy math that needs reals). -/
abbrev DollarsReal := ℝ

/-- A rider's trip demand: real resources, not utility. -/
structure TripProfile where
  /-- Work/commute trips per month (inelastic — always taken) -/
  workTrips : NumTrips
  /-- Maximum trips per month (time budget) -/
  maxTrips : NumTrips
  /-- Transit money available per month -/
  budget : Dollars
  /-- Work fits in time budget -/
  work_le_max : workTrips ≤ maxTrips
  /-- Positive budget -/
  budget_pos : 0 < budget

instance : Inhabited TripProfile :=
  ⟨0, 0, 1, le_refl _, one_pos⟩

-- ============== Cost Function ==============

/-- A cost policy maps trip count to total cost for the month. -/
abbrev CostFunction := NumTrips → Dollars

/-- A trip count is feasible if it respects all three constraints:
work trips are taken, time budget isn't exceeded, and cost is affordable. -/
def Feasible (p : TripProfile) (cost : CostFunction) (n : NumTrips) : Prop :=
  p.workTrips ≤ n ∧ n ≤ p.maxTrips ∧ cost n ≤ p.budget

/-- Feasibility is downward-closed above `workTrips` when cost is monotone:
if `n` is feasible and `workTrips ≤ m ≤ n`, then `m` is feasible too. -/
theorem Feasible.anti_mono {p : TripProfile} {cost : CostFunction} {n m : NumTrips}
    (hmono : Monotone cost) (hfeas : Feasible p cost n)
    (hw : p.workTrips ≤ m) (hmn : m ≤ n) : Feasible p cost m :=
  ⟨hw, le_trans hmn hfeas.2.1, le_trans (hmono hmn) hfeas.2.2⟩

/-- If `workTrips` isn't feasible, nothing is. -/
theorem not_feasible_of_workTrips {p : TripProfile} {cost : CostFunction}
    (hmono : Monotone cost) (h : ¬ Feasible p cost p.workTrips) :
    ∀ n, ¬ Feasible p cost n :=
  fun _ hfeas => h (hfeas.anti_mono hmono (le_refl _) hfeas.1)

-- ============== Cost Policy ==============

/-- A trip count is the maximum feasible: it's feasible, and
anything larger is not. -/
def IsMaxFeasible (p : TripProfile) (cost : CostFunction) (n : NumTrips) : Prop :=
  Feasible p cost n ∧ ∀ m : NumTrips, Feasible p cost m → m ≤ n

/-- When `p.maxTrips` is affordable, it's the maximum feasible trip count. -/
theorem IsMaxFeasible_maxTrips {p : TripProfile} {cost : CostFunction}
    (h : cost p.maxTrips ≤ p.budget) :
    IsMaxFeasible p cost p.maxTrips :=
  ⟨⟨p.work_le_max, le_refl _, h⟩, fun _ ⟨_, htime, _⟩ => htime⟩

/-- For monotone cost, `max workTrips (min maxTrips k)` is max feasible when
`k` is the largest affordable trip count. Uses `Feasible.anti_mono` for the
`workTrips` fallback case. -/
theorem IsMaxFeasible_max_min {p : TripProfile} {cost : CostFunction} {k : NumTrips}
    (hmono : Monotone cost) (hk : cost k ≤ p.budget)
    (hbound : ∀ m : NumTrips, cost m ≤ p.budget → m ≤ k)
    (hexists : ∃ n, Feasible p cost n) :
    IsMaxFeasible p cost (max p.workTrips (min p.maxTrips k)) := by
  obtain ⟨_, hfn⟩ := hexists
  refine ⟨⟨le_max_left _ _, max_le p.work_le_max (min_le_left _ _), ?_⟩, ?_⟩
  · by_cases h : p.workTrips ≤ min p.maxTrips k
    · rw [max_eq_right h]
      exact le_trans (hmono (min_le_right _ _)) hk
    · push_neg at h
      rw [max_eq_left (le_of_lt h)]
      exact (hfn.anti_mono hmono (le_refl _) hfn.1).2.2
  · intro m ⟨_, htime, hcost⟩
    exact le_trans (le_min htime (hbound m hcost)) (le_max_right _ _)

/-- A verified fare policy: monotone cost function with a provably optimal
trip maximizer. -/
structure FarePolicy where
  cost : CostFunction
  maxTrips : TripProfile → NumTrips
  cost_mono : Monotone cost
  decideFeasible : ∀ (p : TripProfile) (n : NumTrips), Decidable (Feasible p cost n)
  maxTrips_maximises : ∀ (p : TripProfile),
    (∃ n, Feasible p cost n) → IsMaxFeasible p cost (maxTrips p)

/-- Typeclass for types that determine a fare policy. -/
class MakeFarePolicy (α : Type) where
  farePolicy : α → FarePolicy

-- ============== Floor Arithmetic ==============

/-- `fare * ⌊budget / fare⌋ ≤ budget` -/
theorem mul_floor_le {fare budget : Dollars} (hfare : 0 < fare) (hbudget : 0 < budget) :
    fare * ↑(Nat.floor (budget / fare)) ≤ budget := by
  calc fare * ↑(Nat.floor (budget / fare))
      ≤ fare * (budget / fare) :=
        mul_le_mul_of_nonneg_left
          (Nat.floor_le (div_nonneg (le_of_lt hbudget) (le_of_lt hfare)))
          (le_of_lt hfare)
    _ = budget := by field_simp [ne_of_gt hfare]

/-- If `fare * m ≤ budget` then `m ≤ ⌊budget / fare⌋`. -/
theorem le_floor_of_mul_le {fare budget : Dollars} (hfare : 0 < fare) (hbudget : 0 < budget)
    {m : NumTrips} (h : fare * ↑m ≤ budget) : m ≤ Nat.floor (budget / fare) := by
  rw [Nat.le_floor_iff (div_nonneg (le_of_lt hbudget) (le_of_lt hfare))]
  rw [le_div_iff₀ hfare]
  nlinarith

-- ============== Pay-Per-Ride ==============

/-- Pay-per-ride fare policy. -/
structure PayPerRide where
  fare : Dollars
  fare_pos : 0 < fare

private theorem PayPerRide.cost_mono (ppr : PayPerRide) :
    Monotone (fun n : NumTrips => ppr.fare * (n : Dollars)) :=
  fun _ _ hab => mul_le_mul_of_nonneg_left (Nat.cast_le.mpr hab) (le_of_lt ppr.fare_pos)

def PayPerRide.farePolicy (ppr : PayPerRide) : FarePolicy where
  cost n := ppr.fare * n
  maxTrips p := max p.workTrips (min p.maxTrips (Nat.floor (p.budget / ppr.fare)))
  cost_mono := ppr.cost_mono
  decideFeasible _ _ := by unfold Feasible; exact inferInstance
  maxTrips_maximises p hexists :=
    IsMaxFeasible_max_min ppr.cost_mono
      (mul_floor_le ppr.fare_pos p.budget_pos)
      (fun _ hcost => le_floor_of_mul_le ppr.fare_pos p.budget_pos hcost)
      hexists

instance : MakeFarePolicy PayPerRide where
  farePolicy := PayPerRide.farePolicy

-- ============== Fare Cap ==============

/-- Fare cap policy. -/
structure FareCap where
  fare : Dollars
  cap : Dollars
  fare_pos : 0 < fare

private theorem FareCap.cost_mono (fc : FareCap) :
    Monotone (fun n : NumTrips => min (fc.fare * (n : Dollars)) fc.cap) :=
  fun _ _ hab => min_le_min (mul_le_mul_of_nonneg_left (Nat.cast_le.mpr hab) (le_of_lt fc.fare_pos)) le_rfl

def FareCap.farePolicy (fc : FareCap) : FarePolicy where
  cost n := min (fc.fare * n) fc.cap
  maxTrips p := if fc.cap ≤ p.budget then p.maxTrips
             else max p.workTrips (min p.maxTrips (Nat.floor (p.budget / fc.fare)))
  cost_mono := fc.cost_mono
  decideFeasible _ _ := by unfold Feasible; exact inferInstance
  maxTrips_maximises p hexists := by
    by_cases hcap : fc.cap ≤ p.budget
    · -- cap ≤ budget: maxTrips is affordable
      show IsMaxFeasible p _ (if fc.cap ≤ p.budget then p.maxTrips else _)
      rw [if_pos hcap]
      exact IsMaxFeasible_maxTrips (le_trans (min_le_right _ _) hcap)
    · -- cap > budget: PPR-like
      push_neg at hcap
      show IsMaxFeasible p _ (if fc.cap ≤ p.budget then _ else _)
      rw [if_neg (not_le.mpr hcap)]
      refine IsMaxFeasible_max_min fc.cost_mono ?_ ?_ hexists
      · exact le_trans (min_le_left _ _) (mul_floor_le fc.fare_pos p.budget_pos)
      · intro m hcost
        apply le_floor_of_mul_le fc.fare_pos p.budget_pos
        by_cases hle : fc.fare * ↑m ≤ fc.cap
        · rwa [min_eq_left hle] at hcost
        · push_neg at hle
          rw [min_eq_right (le_of_lt hle)] at hcost; linarith

instance : MakeFarePolicy FareCap where
  farePolicy := FareCap.farePolicy

theorem FareCap.maxTrips_affordable (fc : FareCap) (p : TripProfile) (h : fc.cap ≤ p.budget) :
    fc.farePolicy.maxTrips p = p.maxTrips := by
  show (if fc.cap ≤ p.budget then _ else _) = _
  rw [if_pos h]

-- ============== Unlimited Pass ==============

/-- Unlimited pass policy (assuming purchased). -/
structure UnlimitedPass where
  price : Dollars

def UnlimitedPass.farePolicy (ul : UnlimitedPass) : FarePolicy where
  cost _ := ul.price
  maxTrips p := p.maxTrips
  cost_mono := by intro _ _ _; exact le_refl _
  decideFeasible _ _ := by unfold Feasible; exact inferInstance
  maxTrips_maximises _ hexists := by
    obtain ⟨_, _, _, hc⟩ := hexists
    exact IsMaxFeasible_maxTrips hc

instance : MakeFarePolicy UnlimitedPass where
  farePolicy := UnlimitedPass.farePolicy

end
