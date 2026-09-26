/**
 * estimationConfig.js
 * Central configuration for AC Inspection / Estimation.
 * All estimation constants, fees, durations, checklist items, and options are centralized here.
 * Phase 2 will allow backend overrides without scattering values in JSX.
 */

// Authoritative dynamic estimation fee with PostgreSQL cache sync
let _dynamicEstimationFee = 199;
try {
  const cached = localStorage.getItem("calservices_ac_inspection_fee");
  if (cached && !isNaN(Number(cached))) {
    _dynamicEstimationFee = Number(cached);
  }
} catch (_) {}

export let ESTIMATION_FEE = _dynamicEstimationFee;

export function getDynamicEstimationFee() {
  return _dynamicEstimationFee;
}

export function setDynamicEstimationFee(newFee) {
  const num = Number(newFee);
  if (!isNaN(num) && num >= 0) {
    _dynamicEstimationFee = num;
    ESTIMATION_FEE = num;
    try {
      localStorage.setItem("calservices_ac_inspection_fee", String(num));
    } catch (_) {}
  }
  return _dynamicEstimationFee;
}

export const ESTIMATION_DURATION = "30–60 mins";
export const ESTIMATION_TITLE = "AC Inspection";
export const ESTIMATION_SUBTITLE = "Diagnosis & Inspection";
export const ESTIMATION_PURPOSE = "Not sure what's wrong with your AC?";
export const ESTIMATION_DESCRIPTION =
  "Get a technician to inspect your AC, identify the actual issue and recommend the right service.";

export const AC_TYPES = ["Split", "Window", "Cassette", "Tower", "Other"];

export const AC_BRANDS = [
  "LG",
  "Samsung",
  "Daikin",
  "Voltas",
  "Blue Star",
  "Panasonic",
  "Carrier",
  "Lloyd",
  "Hitachi",
  "Whirlpool",
  "Godrej",
  "Other",
];

export const AC_CAPACITIES = ["1 Ton", "1.5 Ton", "2 Ton", "Other"];

export const CUSTOMER_SYMPTOMS = [
  "Not cooling",
  "Water leaking",
  "Not turning on",
  "Making noise",
  "Low airflow",
  "Gas leak / Refill",
  "Deep jet cleaning",
  "Other",
];

export const INSPECTION_CARD_INCLUDES = [
  "AC condition inspection",
  "Cooling performance check",
  "Airflow check",
  "Indoor unit check",
  "Outdoor unit check",
  "Electrical check",
  "Gas / refrigerant check",
  "Drainage check",
  "Problem diagnosis",
  "Recommended service",
];

export const WHAT_IS_INCLUDED = [
  "AC condition inspection",
  "Indoor unit inspection",
  "Outdoor unit inspection",
  "Cooling performance check",
  "Airflow check",
  "Electrical check",
  "Gas / refrigerant check",
  "Drainage check",
  "Noise / vibration check",
  "Basic diagnosis",
  "Technician findings",
  "Recommended services",
  "Quotation after inspection",
];

export const WHAT_TECHNICIAN_CHECKS = [
  "Cooling",
  "Airflow",
  "Indoor Unit",
  "Outdoor Unit",
  "Gas / Refrigerant",
  "Electrical",
  "Drainage",
  "Compressor / Motor",
  "PCB / Control",
  "Noise / Vibration",
  "Other visible issues",
];

export const HOW_ESTIMATION_WORKS_STEPS = [
  "Book AC Inspection",
  "Vendor confirms the job",
  "Technician is assigned",
  "Technician travels to the location",
  "Technician arrives",
  "Inspection starts",
  "Actual issue is identified",
  "Findings are recorded",
  "Recommended services are selected",
  "Quotation is prepared",
  "Customer reviews the quotation",
  "Customer approves or rejects",
  "If approved, the same job continues as service",
];

export const WHAT_IS_NOT_INCLUDED = [
  "Repair work",
  "Spare parts",
  "Gas recharge",
  "PCB replacement",
  "Compressor replacement",
  "Major electrical work",
  "Installation",
  "Additional service work",
];

export const TECHNICIAN_FINDINGS_EXAMPLES = [
  "Cleaning Required",
  "Cooling Issue",
  "Gas / Refrigerant Issue",
  "Water Leakage",
  "Drain Blockage",
  "Electrical Issue",
  "PCB Issue",
  "Compressor Issue",
  "Fan / Motor Issue",
  "Noise / Vibration",
  "Part Replacement",
  "Installation Requirement",
  "Other Issue",
];

export const ESTIMATION_STAGES = [
  { id: "ESTIMATION_REQUESTED", label: "Estimation Requested", step: 1 },
  { id: "VENDOR_CONFIRMED", label: "Vendor Confirmed", step: 2 },
  { id: "TECHNICIAN_ASSIGNED", label: "Technician Assigned", step: 3 },
  { id: "TECHNICIAN_ON_THE_WAY", label: "Technician On The Way", step: 4 },
  { id: "TECHNICIAN_ARRIVED", label: "Technician Arrived", step: 5 },
  { id: "INSPECTION_STARTED", label: "Inspection Started", step: 6 },
  { id: "INSPECTION_COMPLETED", label: "Inspection Completed", step: 7 },
  { id: "QUOTATION_READY", label: "Quotation Ready", step: 8 },
  { id: "CUSTOMER_APPROVAL", label: "Customer Approval", step: 9 },
  { id: "SERVICE", label: "Service", step: 10 },
  { id: "COMPLETED", label: "Completed", step: 11 },
];
