import FareModel.Basic
import Mathlib.MeasureTheory.Measure.GiryMonad
import Mathlib.MeasureTheory.MeasurableSpace.Instances

/-!
# Shared Distribution Infrastructure

Common definitions used by both the fare cap analysis and the prepaid
pass analysis. Per-rider revenue, surplus, and the measurable space
on `TripProfile`.

See:
- `FareModel.FareCapAnalysis` — fare cap / PPR closed-form distributions.
- `FareModel.PrepaidPassAnalysis` — pass vs PPR crossover and policy menus.
-/

open MeasureTheory Classical

-- TripProfile lives in ℕ × ℕ × ℝ.
noncomputable instance : MeasurableSpace TripProfile :=
  MeasurableSpace.comap
    (fun p => (p.workTrips, p.maxTrips, p.budget))
    inferInstance

/-- A perturbation kernel: maps each expected profile to a distribution
of actual profiles centered around it. -/
def PerturbationKernel := TripProfile → Measure TripProfile

/-- Agency revenue from a rider under a fare policy. -/
noncomputable def revenue (fp : FarePolicy) (p : TripProfile) : Dollars :=
  fp.cost (fp.maxTrips p)

/-- Consumer surplus under a fare policy: money left over after paying for trips. -/
noncomputable def surplus (fp : FarePolicy) (p : TripProfile) : Dollars :=
  p.budget - revenue fp p
