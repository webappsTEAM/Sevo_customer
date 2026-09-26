# sevo 2.0 — PHASE 14: TRANSPORT & PACKERS-MOVERS

**Document owner:** CTO / Chief Architect
**Date:** 6 August 2026
**Status:** **Design only.** Not scheduled.
**Depends on:** Phases 0–13, 5A, 9A

> **Legal caveat.** Parts F and G summarise publicly reported GST and e-way bill positions as at August 2026 to establish architectural constraints. Rates, thresholds and exemptions change with every GST Council meeting. Every item marked **[COUNSEL]** requires validation before it drives a build decision.

---

## PART A — TWO BUSINESSES, NOT ONE

Your roadmap groups "Packers & Movers" and "Goods Transport" together, and both involve vehicles. **That is where the similarity ends**, and treating them as one vertical would be a category error with real cost.

| | **Packers & Movers** | **Goods Transport** (Porter-class) |
|---|---|---|
| Customer | Household, moving home | Shopkeepers, businesses, e-commerce |
| Trigger | **Move-in / move-out** | Daily operational need |
| Frequency | Once every 2–5 years | **Daily / weekly** |
| Booking | Survey → quote → accept | **Instant** |
| Addresses | 2 (pickup, drop) | 2 to N stops |
| Labour | **Crew of 3–6** — packing, loading, unloading | Driver, sometimes one helper |
| Priced on | Volume, inventory, floor, distance | Distance × vehicle class |
| Duration | Half-day to 3 days | 1–4 hours |
| Insurance | **Critical** — damage claims are the business risk | Goods-in-transit |
| Regulatory | Household effects — **often e-way-bill exempt** **[COUNSEL]** | **E-way bill + GTA GST regime apply** |
| **Strategic fit for sevo** | **Direct Property adjacency** | **A separate business** |

**The strategic read.** Packers & Movers is a natural extension of the Property vertical — it fires on the same move-in event as Home Services (Phase 13 H), serves the same customer, and monetises a moment sevo already knows about. Goods Transport serves a completely different customer with a completely different sales motion, and competing with Porter means competing on fleet density in a market where that is the entire moat.

**Recommendation: build Packers & Movers. Treat Goods Transport as a separate strategic decision, not a natural follow-on.** They share a logistics platform; they do not share a customer, a funnel or a growth model.

Both are designed here, because the shared platform must serve both if Goods Transport is ever chosen.

---

## PART B — VALIDATION OF THE EXTENSION RULE

**This phase is the test of whether Phase 5A's instruction actually worked**, and it is worth checking honestly rather than asserting.

Phase 5A (ADR-020) made three structural provisions in M1 that M1 does not use, on the argument that cardinality and ownership changes are expensive later while fields and behaviour are cheap:

| Provision | M1 usage | Phase 14 need | Verdict |
|---|---|---|---|
| `Booking` → **N `Address`** via `AddressLink` | Always 1 | **Relocation needs 2; Transport needs N stops** | ✅ **No migration required** |
| `max_assignments` as a **booking-type property** | Always 1 | **Moving crew of 3–6** | ✅ **No migration required** |
| `vehicle_id` nullable on `Booking` | Always null | Required for both | ✅ **No migration required** |

**All three land.** Had `Address` remained the value object Phase 5 originally specified, Packers & Movers would have required a cardinality migration on the platform's busiest table, plus a backfill, plus a coordinated frontend change.

That is the clearest available evidence that your instruction in Phase 5A was correct — and it is worth recording, because the counter-argument to that instruction ("you're building for imagined requirements") is only answerable with a concrete case like this one.

---

## PART C — VERTICAL PROFILES

### C.1 `logistics-relocation` (Packers & Movers)

| # | Extension point | Implementation |
|---|---|---|
| 1 | InventoryStrategy | `SlotCapacity` — crew-days, not units |
| 2 | PricingStrategy | **`QuoteOnRequest`** — survey-driven, inventory-based |
| 3 | MatchingStrategy | `QuoteThenAccept` — customer accepts a quote, then a crew is allocated |
| 4 | RankingStrategy | `PriceCapacity` — among quoting vendors |
| 5 | TrustPolicy | `KycPlusInsurance` — **insurance mandatory**, police verification for household access |
| 6 | MonetisationStrategy | `CommissionPerJob` |
| 7 | FulfilmentProfile | `RELOCATION` — **2 addresses, crew of N, multi-day capable** |

### C.2 `logistics-transport` (Goods Transport)

| # | Extension point | Implementation |
|---|---|---|
| 1 | InventoryStrategy | `SlotRoute` — vehicle-hours within a lane |
| 2 | PricingStrategy | **`ComputedDistanceWeight`** — deterministic, instant |
| 3 | MatchingStrategy | `PlatformAssigns` — nearest available suitable vehicle |
| 4 | RankingStrategy | `EtaPrice` |
| 5 | TrustPolicy | `KycPlusLicence` — driving licence, permits, fitness, PUC |
| 6 | MonetisationStrategy | `CommissionPerTrip` |
| 7 | FulfilmentProfile | `TRIP` — **N stops, sequenced, POD per stop** |

---

## PART D — NEW DOMAIN ENTITIES

```
platform/logistics/
├── VehicleClass        BIKE · TEMPO_407 · LCV · CONTAINER_20FT · TRUCK …
│                       capacity_kg, volume_cft, dimensions, permit class
├── Vehicle             registration, class, owner (sevo | vendor | driver),
│                       documents (RC, permit, PUC, fitness, insurance) + expiry
├── Trip                the journey: booking_id, vehicle, driver, route, distance,
│                       started/completed, odometer
├── TripStop            address_link_id, sequence, type (PICKUP|DROP|WAYPOINT),
│                       arrived_at, departed_at, proof_of_delivery
├── Consignment         what is being moved: description, value, weight, volume
├── ManifestItem        (relocation) item, quantity, condition_before/after,
│                       packing_type, fragile, photo_evidence
├── EWayBill            bill_number, generated_at, valid_until, distance_km,
│                       part_a/part_b status, extension history
├── RouteLane           origin ⇄ destination zone, base pricing, transit time
└── InsurancePolicy     coverage, per-trip or blanket, claim history
    └── Claim           incident, evidence, assessment, settlement
```

**`Vehicle` document expiry drives automatic suspension**, exactly as provider credentials do (Phase 12 E). An expired permit or fitness certificate must remove a vehicle from allocation automatically — not raise an alert. A vehicle operating on an expired permit is a seizure risk and, for movers, an insurance-void risk.

---

## PART E — TRIP AND ROUTE MANAGEMENT

```
Booking (RELOCATION | TRIP)
    │
    ├── AddressLink[]      PICKUP · DROP · STOP (sequenced)   ← Phase 5A C.2
    ├── Assignment[]       driver + crew (max_assignments)     ← Phase 5A C.3
    ├── Vehicle            allocated                            ← Phase 5A C.3
    └── Trip
          ├── TripStop[]   arrive → load/unload → POD → depart
          ├── route        planned polyline, distance, ETA
          └── telemetry    ← live_locations, EXISTING ★
```

**Live tracking is essentially free.** `live_locations` (2,040 LOC — WebSocket consumers, JWT handshake auth, indexed ping table, Redis channel layer) is already Porter-class real-time infrastructure. Phase 0 rated it production-shaped. Customer-visible trip tracking is a new **consumer** of an existing stream, not new infrastructure.

**Route optimisation is deliberately out of scope at launch.** Multi-stop TSP optimisation is a genuine research problem, and the marginal gain over sensible sequencing is small below ~8 stops. Launch with operator-defined sequence and ETA from a maps provider; optimise once route data exists to optimise against.

**Proof of delivery per stop:** signature, photo, recipient name, geo-stamp, timestamp. Reuses `JobCompletionProof` and the Phase 8 field-PWA offline capture pattern — **critical, because loading bays and basements have no signal.**

---

## PART F — E-WAY BILL COMPLIANCE

A hard integration with statutory penalties, not a feature.

| Rule | Position (Aug 2026) |
|---|---|
| Threshold | **₹50,000** consignment value, inter-state, uniform across India |
| Intra-state | Most states ₹50,000; **₹1,00,000 in Bihar, Delhi, Jharkhand, Madhya Pradesh, Maharashtra, Punjab, Rajasthan, Tamil Nadu** |
| Timing | **Generated on the government portal before movement begins** |
| Validity | **1 day per 200 km** (regular cargo); 1 day per 20 km (over-dimensional) |
| Applies to | Registered persons, transporters, and in specified cases unregistered persons |
| Penalty | **₹10,000 or the tax evaded, whichever is higher** |

**Architectural requirements:**

| Requirement | Design |
|---|---|
| State threshold table | **Configuration, not code** — thresholds differ by state and change by notification |
| Applicability decision | Per consignment: value, origin state, destination state, goods type, exemptions |
| Portal integration | Adapter behind an ACL (SP-11); generate Part A/Part B; store bill number |
| **Blocking gate** | **Trip cannot start without a valid e-way bill where required.** Enforced in `Trip.start()`, not the UI |
| Validity tracking | Distance-derived expiry; alert before lapse; extension workflow |
| Vehicle change | Part B update when the vehicle changes mid-transit |
| Audit | Immutable record of every generation, extension and cancellation |

**Household goods relocation is likely exempt** as used personal effects — but exemption lists are specific and change. **[COUNSEL]**, and the architecture must handle both cases because Goods Transport certainly is not exempt.

---

## PART G — GST: THE MODEL CORRECTION

**This phase breaks an assumption in the Phase 6 tax model, and the correction matters.**

Goods Transport Agency services sit in an unusual GST regime:

| Mechanism | Rate | ITC | Who pays |
|---|---|---|---|
| **Reverse charge (RCM)** | **5%** | Available to recipient | **The recipient**, for notified recipients |
| Forward charge | 5% | Not available | The GTA |
| Forward charge | **18%** | Available | The GTA |

From 22 September 2025 the earlier 12% forward-charge slab was rationalised to 18%; the concessional 5% route and the 5% RCM for notified recipients continue. RCM applies where a GTA opts for 5% and supplies to a factory, registered person, body corporate, partnership firm, co-operative society or casual taxable person. As of January 2026 authorities clarified timelines, documentation and reconciliation for RCM ITC matching.

**Why this breaks the existing model.** Phases 5A and 6 designed `Order` → `OrderLine` → `TaxLine` on the assumption that **the platform charges and collects GST**. Under RCM, the platform charges the freight and **does not collect the tax** — the recipient self-assesses and pays it directly. The invoice must state that RCM applies.

**Correction to `TaxTreatment` (Phase 5A E):**

```python
@dataclass(frozen=True)
class TaxTreatment:
    rate: Decimal
    section: str
    hsn_sac: str
    place_of_supply: str
    mechanism: Literal["FORWARD", "REVERSE"]      # ← NEW
    collected_by_platform: bool                   # ← NEW — False under RCM
    itc_eligible: bool                            # ← NEW
```

The determination is a decision tree over: recipient registration status, recipient entity type, and the provider's GST election. It belongs in `TaxService` (Phase 5 F) as a rules table, **never as inline conditionals** — GST rules change at every Council meeting, and a rate embedded in code is a code deployment every time.

**Consequence for the ledger:** an RCM tax line is recorded on the invoice for disclosure but produces **no cash movement through sevo**. That is a real distinction the double-entry model must express, and it is the kind of thing that silently corrupts reconciliation if discovered late.

---

## PART H — PRICING

### H.1 Goods Transport — deterministic

```
fare = base_fare(vehicle_class, city)
     + distance_km × per_km_rate(vehicle_class)
     + loading_unloading_charge
     + waiting_charge(minutes beyond free allowance)
     + toll + parking (pass-through, evidenced)
     + surge_multiplier(time_band, demand)
     + additional_stop_charge × (stops − 2)
```

Quoted upfront, locked at booking. Deviations (extra waiting, extra stops) are handled through the existing `WorkExtension` approval flow — the same mechanism that already works for services.

### H.2 Relocation — survey-driven

```
1. Customer submits inventory (guided, room by room) or requests a survey
2. Survey booking (a field job — EXISTING engine) captures the manifest
3. Quote = volume_cft × rate + packing_materials + labour_days × crew_size
         + floor_charge(no_lift) + distance + insurance_premium + storage
4. Customer accepts → crew and vehicle allocated
```

**The survey is itself a `Booking`.** An eighth booking type on the existing engine, requiring no new fulfilment code — the same reuse pattern as M1's listing verification.

**Volume estimation is the commercial risk.** Under-estimate and the crew arrives with too small a vehicle; over-estimate and the quote loses. Recommendation: capture actual versus estimated volume on every job from day one, exactly as Phase 5A did with `Inference` feedback labels. Six months of that data makes estimation a solved problem; without it, it never becomes one.

---

## PART I — INSURANCE AND CLAIMS

**The defining commercial risk of Packers & Movers.** Every mover eventually damages something; the difference between a business and a liability is how claims are handled.

```
Booking → InsurancePolicy (per-trip or blanket)
   │
   ├── ManifestItem.condition_before   ← photo evidence at packing
   ├── ManifestItem.condition_after    ← photo evidence at delivery
   └── Claim
         ├── incident report + evidence
         ├── assessment (internal or surveyor)
         ├── attribution: mover fault | pre-existing | act of god | customer packed
         └── settlement: repair | replace | cash | reject (with reasons)
```

**Condition evidence at both ends is the entire defence**, and it must be captured offline — packing happens in a flat with no signal, delivery in a basement. This is precisely the Phase 8 field-PWA offline pattern, and it is why that surface was specified as offline-first rather than "responsive web".

Claims reuse `Complaint` + `RefundRequest` + evidence patterns from `service_requests` — again, already built.

---

## PART J — DRIVER APP

Extends the Phase 8 `apps/field` PWA rather than being a new application:

| Requirement | Note |
|---|---|
| Trip list, accept/decline | **Decline without penalty** if gig (Phase 12 ADR-035) |
| Navigation handoff | To Google/Apple Maps — do not build navigation |
| Stop-by-stop progress | Arrive → load/unload → POD → depart |
| POD capture | Signature, photo, recipient — **offline-capable** |
| E-way bill display | Must be producible at a checkpoint **without connectivity** |
| Document wallet | RC, permit, insurance, licence — offline |
| Expense capture | Fuel, toll, parking with receipt photo |
| Earnings view | Per trip, transparent |
| SOS | **`SOSAlert` already exists** in `live_locations` ★ |

**Offline e-way bill display is a legal requirement in practice, not a convenience.** A driver stopped at a state checkpoint with no signal must still produce the document.

---

## PART K — EFFORT (NOT ADDED TO M1)

| Component | Days |
|---|---|
| **Shared logistics platform** | |
| Vehicle, VehicleClass, fleet, document expiry | 14 |
| Trip, TripStop, route, ETA integration | 18 |
| **E-way bill integration + state threshold config** | **20** |
| GST/GTA RCM tax model correction | 10 |
| Live trip tracking (**consumer of existing stream**) | 6 |
| Driver app (extends field PWA) | 25 |
| **Subtotal** | **93** |
| **Packers & Movers** | |
| Survey booking + inventory manifest | 16 |
| Volume-based quoting engine | 14 |
| Crew allocation (multi-assignment) | 10 |
| Insurance + claims + condition evidence | 22 |
| Customer surfaces | 22 |
| **Subtotal** | **84** |
| **Goods Transport** | |
| Distance/weight pricing engine | 14 |
| Instant matching + vehicle availability index | 18 |
| Multi-stop sequencing + POD per stop | 14 |
| Business/B2B account features | 12 |
| Customer surfaces | 20 |
| **Subtotal** | **78** |

**Movers only: ~177 days · Both: ~255 days.**

---

## PART L — RISKS

| ID | Risk | L | I | Mitigation |
|---|---|---|---|---|
| RSK-P14-1 | **E-way bill missing or invalid → vehicle seized, ₹10,000+ penalty** | Med | **High** | Blocking gate in `Trip.start()`; validity alerting; offline display |
| RSK-P14-2 | RCM applied wrongly → tax under- or over-collected | Med | **High** | Rules-table `TaxService`; **[COUNSEL]**; 100% branch coverage on tax paths |
| RSK-P14-3 | Volume under-estimated → wrong vehicle, failed job | **High** | High | Capture estimate-vs-actual from day one; conservative early quoting |
| RSK-P14-4 | Damage claims exceed insurance and margin | **High** | **High** | Condition evidence both ends; attribution; per-trip premium priced in |
| RSK-P14-5 | Goods Transport built without fleet density | Med | **High** | Part A — separate strategic decision, not a follow-on |
| RSK-P14-6 | Expired permit/fitness → seizure, void insurance | Med | High | **Auto-suspend**, not alert (Part D) |
| RSK-P14-7 | Offline POD/e-way bill unavailable at a checkpoint | Med | High | Field PWA offline-first (Phase 8 G) |
| RSK-P14-8 | Drivers as gig workers without aggregator compliance | **High** | **Severe** | **Phase 12 B** — the same unresolved question |

---

## PART M — DEFINITION OF DONE (PHASE 14)

- [x] **Movers and Goods Transport separated** — a Property adjacency versus a separate business
- [x] **Phase 5A's three structural provisions validated** — all three land with zero migration
- [x] Two VerticalProfiles across all seven extension points
- [x] Ten new logistics entities, with document-expiry auto-suspension
- [x] Trip/route model; live tracking as a consumer of the existing stream
- [x] **E-way bill compliance** — thresholds, state variation, validity, blocking gate, offline display
- [x] **GST/GTA RCM correction to the `TaxTreatment` model** — the platform does not always collect
- [x] Pricing for both verticals; volume estimation identified as the commercial risk
- [x] Insurance and claims with condition evidence at both ends
- [x] Driver app extending the field PWA, not a new application
- [x] Effort: **~177 days movers only · ~255 both**
- [ ] **Open:** **[COUNSEL]** — e-way bill exemption for household effects · RCM determination · driver engagement model (Phase 12)
- [ ] **Open:** whether Goods Transport is a business sevo wants at all

---

## PART N — WHAT PHASE 15 WILL DO

Phase 15 (CRM) designs the commercial layer across every vertical: lead lifecycle beyond the marketplace enquiry, sales pipeline for broker and enterprise accounts, opportunity management, customer lifecycle and segmentation, campaign management, follow-up automation, and the unified customer view that the shared `Party` model makes possible.

---

### The two findings from this phase

1. **Phase 5A's Extension Rule is now empirically validated.** All three structural provisions made in M1 — N addresses, N assignments, nullable vehicle — are exactly what this vertical needs, with **zero migration required**. Had `Address` stayed a value object, Packers & Movers would have needed a cardinality migration on the busiest table in the platform.

2. **The GST model needs correcting before it is built, not after.** Under the GTA reverse-charge mechanism the platform charges freight but **does not collect the tax** — the recipient self-assesses. `TaxTreatment` needs `mechanism`, `collected_by_platform` and `itc_eligible`. Discovered now it is a three-field addition to a design document; discovered after the ledger is live it is a reconciliation defect in production.

---

## SOURCES

- [E-Way Bill Limit 2026: State-Wise Thresholds — Bajaj Finserv](https://www.bajajfinserv.in/eway-bill-limit)
- [E-Way Bill under GST: Rules, Applicability, Limit — ClearTax](https://cleartax.in/s/eway-bill-gst-rules-compliance)
- [E-Way Bill Rules India 2026: Transporter Compliance — Roado](https://roado.co.in/blog/e-way-bill-rules-in-india-a-complete-compliance-guide-for-transporters-2026/)
- [E-Way Bill State-Wise Threshold Limits 2026 — Busy](https://busy.in/gst/state-wise-threshold-limits-for-e-way-bills/)
- [GST on Freight Charges 2026: Rates, RCM, Rules — Vakilsearch](https://vakilsearch.com/article/gst-on-freight-charges/)
- [Goods Transport Agency Under GST: A Detailed Guide for 2026 — Razorpay](https://razorpay.com/learn/goods-transport-agency-under-gst/)
- [GTA Under GST 2026: Rates, RCM & Compliance — Binary Semantics](https://www.binarysemantics.com/blogs/goods-transport-agency-gta-under-gst/)
- [GST on Transportation, Freight, GTA RCM India 2026 — Tax Garden](https://taxgarden.in/blog/gst-on-transportation-freight-gta-rcm-india-2026)
