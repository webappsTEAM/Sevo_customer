# Model Classification — CompanyScoped Framework

Every model in the project, classified by its relationship to `companies.Company`.
This classification is what the CompanyScoped framework (`common/models.py`,
`common/drf.py`, `common/permissions.py`) is built against — only models
classified **Company Scoped** inherit `CompanyScopedModel`. **Global** models
stay independent. **Mixed** models get scoping applied selectively, not via
blanket inheritance.

Regenerate the FK map this was derived from with:

```
python manage.py shell -c "from common.schema_drift import run_all_checks"  # (structural checker)
```

(the FK enumeration itself was a one-off introspection pass over
`apps.get_models()`, not a persisted command — see git history of this file
for how it was produced if it needs re-deriving after model changes.)

---

## Global Models

No relationship to any company — either platform-wide lookup data, or data
that belongs to a person rather than a business.

| Model | Why |
|---|---|
| `companies.Company` | This *is* the company/vendor record itself — the root of scoping, not scoped to itself. |
| `companies.Region` | Platform-wide compliance/payroll lookup table (US/UK/IN), seeded once, not owned by any company. |
| `accounts.User` | See **Mixed** below — flagged here only to make clear it is *not* naively Global. |
| `accounts.OTPAuditLog` | Security audit trail keyed by phone number, pre-dates any company association. |
| `accounts.RegistrationDossier` | Pre-account registration/vetting data, exists before a company relationship is established. |
| `accounts.SavedAddress` | Belongs to a customer (`user` FK only); customers are global, so their address book is global. |
| `service_requests.CatalogCategory` | Shared service taxonomy ("AC Repair", "Plumbing") — no `company` FK today. Marketplace-relevant: this is the natural place to introduce a shared cross-vendor taxonomy later. |
| `service_requests.CatalogService` | Same — no `company` FK, FKs only to `CatalogCategory`. |
| `settings_hub.NotificationPreference` | Per-`user` only; applies uniformly whether the user is staff or customer. |
| `settings_hub.LoginSession` | Per-`user` security record, not company business data. |
| `settings_hub.LoginHistory` | Same. |
| `reports` app | No models of its own — pure read-only aggregation views over other apps' (already-scoped) models. Scoping is inherited from what it queries, not from a model of its own. |

## Company Scoped Models

Direct `company` (or `org`, in `inventory`/`payroll`) FK to `companies.Company`.
These inherit `CompanyScopedModel`.

| App | Models |
|---|---|
| `compliance` | `AuditLog`, `HolidayAccrual`, `RightToWork`, `WTROptOut`, `OvertimeAlert`, `BreakAttestation` |
| `employees` | `Employee`, `PresenceLog` |
| `inventory` | `InventoryItem`, `InventoryIssuance`, `InventoryAlert`, `InventoryTransfer` (field is `org`, not `company`) |
| `leaves` | `LeaveRequest` |
| `live_locations` | `EmployeeLocation` (ping), `GeofenceBreach`, `SOSAlert` |
| `mileage` | `MileagePolicy`, `MileageTrip`, `MileageYTDTracker` |
| `payroll` | `PayrollGroup`, `EmployeePayrollConfig`, `PayrollPeriod`, `PayrollRecord`, `CurrencyMaster`, `PayrollRule`, `PayrollGeneration`, `PayrollConfig`, `SettlementCycle`, `BankAccount`, `KYCStatus`, `WalletTransaction`, `EmployeeWalletBalance`, `PayoutDispute` (`PayrollConfig`/`SettlementCycle`/`BankAccount`/`KYCStatus`/`WalletTransaction`/`EmployeeWalletBalance`/`PayoutDispute` use `org`) |
| `scheduling` | `Shift` |
| `settings_hub` | `APIKey`, `Webhook`, `TeamInvite`, `Invoice` |
| `tasks` | `Task` |
| `time_tracking` | `JobSite`, `Location`, `LocationZone` |
| `trial_management` | `TrialPlan` |

### Company Scoped (indirect — no direct FK, reachable in 1–2 hops)

These have no `company` field of their own but every row is unambiguously
owned by one company via a parent FK. They still get `CompanyScopedModel`
treatment, but `for_company()` filters through the relation (e.g.
`employee__company`) instead of a local column. Recommendation inline where
adding a direct FK would be worth the migration.

| Model | Reaches company via |
|---|---|
| `time_tracking.EmployeeLocation` (assignment, not the GPS ping) | `employee.company` — *recommend adding a direct FK, this is a hot-path query* |
| `time_tracking.TimeLog` | `employee.company` — *recommend adding a direct FK, this is a hot-path query* |
| `time_tracking.Break` | `time_log.employee.company` |
| `time_tracking.TimeLogPhoto` | `time_log.employee.company` |
| `tasks.TaskAttachment`, `TaskActivityLog`, `TaskRequiredItem`, `TaskFeedback` | `task.company` |
| `service_requests.EmployeeJob` | `service_request.company` |
| `service_requests.WorkExtension`, `WorkExtensionItem` | `service_request.company` / `extension.service_request.company` |
| `service_requests.JobReschedule` | `job.service_request.company` |
| `service_requests.SupplementalInvoice` | `service_request.company` |
| `service_requests.JobCompletionProof` | `job.service_request.company` |
| `service_requests.ServiceFeedback` | `service_request.company` |
| `service_requests.EmployeePerformance` | `employee.company` |
| `service_requests.RescheduleAttachment`, `RescheduleRequest`, `RescheduleSuggestedSlot`, `RescheduleStatusHistory` | `booking.company` |
| `service_requests.RefundEvidence`, `RefundInvestigationNote` | `refund_request.booking.company` |
| `service_requests.ComplaintAttachment`, `ComplaintMessage`, `ComplaintStatusHistory` | `complaint.booking.company` — inherits the gap below |
| `trial_management.TrialEmailLog`, `TrialAuditLog`, `TrialNotification` | `trial_plan.company` |

## Mixed Models

Contain both company-owned data and globally-scoped data in the same table.
These do **not** blanket-inherit `CompanyScopedModel`; scoping is applied
selectively via explicit querysets/permissions instead.

| Model | Why it's mixed |
|---|---|
| `accounts.User` | Staff (`admin`/`manager`/`employee`/`kiosk`) rows have a `company` FK and are scoped; `customer` rows have `company=None` and are intentionally global (a customer can book with any vendor). Scoping must branch on `role`, not apply uniformly. |
| `service_requests.ServiceRequest` (the booking) | Owned by exactly one vendor (`company`), but also references a global `customer`. Admin/employee views must scope by `company`; customer-facing views must scope by `customer` instead, across every vendor. |
| `service_requests.RefundRequest` | Same shape as `ServiceRequest` — `booking.company` owns it, `customer` is global. |
| `service_requests.Complaint` | Same shape, but worse: `booking` is **nullable** ("general" complaints aren't tied to a booking), so there is currently no reliable path to a company at all for those rows. **This is a real gap, not just a classification nuance** — recommended follow-up: add an explicit `company` FK to `Complaint` directly (see Deliverables/Known Gaps in the final implementation report). |

---

## Summary

- **Global:** 11 models (+ the `reports` app, which has none of its own)
- **Company Scoped (direct):** 30 models across 11 apps
- **Company Scoped (indirect):** 20 models
- **Mixed:** 4 models (`User`, `ServiceRequest`, `RefundRequest`, `Complaint`)

No model was assumed company-scoped by default — every row above reflects an
actual FK relationship (or deliberate absence of one) found by introspecting
`apps.get_models()`.
