import React, { useMemo } from "react";
import {
  AC_TYPES,
  AC_BRANDS,
  AC_CAPACITIES,
  CUSTOMER_SYMPTOMS,
} from "../../../services/estimation/estimationConfig.js";
import {
  Camera,
  AlertCircle,
  Wrench,
  ChevronDown,
  Check,
  Snowflake,
  Droplets,
  Power,
  Volume2,
  Wind,
  Sparkles,
  Gauge,
  HelpCircle,
} from "lucide-react";

const SYMPTOM_META = {
  "Not cooling": { icon: Snowflake, color: "text-sky-600 bg-sky-50" },
  "Water leaking": { icon: Droplets, color: "text-blue-600 bg-blue-50" },
  "Not turning on": { icon: Power, color: "text-rose-600 bg-rose-50" },
  "Making noise": { icon: Volume2, color: "text-amber-600 bg-amber-50" },
  "Low airflow": { icon: Wind, color: "text-teal-600 bg-teal-50" },
  "Gas leak / Refill": { icon: Gauge, color: "text-emerald-600 bg-emerald-50" },
  "Deep jet cleaning": { icon: Sparkles, color: "text-emerald-600 bg-emerald-50" },
  "Deep cleaning / Jet wash": { icon: Sparkles, color: "text-emerald-600 bg-emerald-50" },
  "Other": { icon: HelpCircle, color: "text-slate-600 bg-slate-100" },
};

/**
 * ACDetailsForm.jsx
 * Collects AC Specifications and Customer-Reported Symptoms during the Estimation Booking Flow.
 *
 * NOTE: As per Phase 1 instructions, the customer reports only observable symptoms,
 * NOT technical diagnosis. Technical diagnosis is performed by the technician during inspection.
 */
export function ACDetailsForm({
  acDetails = {},
  onChangeAcDetails,
  customerReportedIssue = "Not cooling",
  onChangeSymptom,
  notes = "",
  onChangeNotes,
  photoFile = null,
  photoPreview = null,
  onPhotoChange,
}) {
  const currentType = acDetails.type || "Split";
  const currentBrand = acDetails.brand || "LG";
  const currentCapacity = acDetails.capacity || "1.5 Ton";
  const currentQty = Math.max(1, Number(acDetails.quantity) || 1);

  const selectedList = useMemo(() => {
    if (Array.isArray(customerReportedIssue)) {
      return customerReportedIssue.filter(Boolean);
    }
    if (typeof customerReportedIssue === "string" && customerReportedIssue.trim()) {
      return customerReportedIssue.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return ["Not cooling"];
  }, [customerReportedIssue]);

  const handleToggleSymptom = (symptom) => {
    let nextList;
    if (selectedList.includes(symptom)) {
      nextList = selectedList.filter((s) => s !== symptom);
      // Keep at least one issue selected so booking always has context
      if (nextList.length === 0) {
        nextList = [symptom];
      }
    } else {
      nextList = [...selectedList, symptom];
    }
    if (typeof onChangeSymptom === "function") {
      onChangeSymptom(nextList.join(", "));
    }
  };

  const handleTypeChange = (t) => {
    onChangeAcDetails({ ...acDetails, type: t });
  };

  const handleBrandChange = (e) => {
    onChangeAcDetails({ ...acDetails, brand: e.target.value });
  };

  const handleCapacityChange = (c) => {
    onChangeAcDetails({ ...acDetails, capacity: c });
  };

  const handleQtyChange = (delta) => {
    const next = Math.max(1, currentQty + delta);
    onChangeAcDetails({ ...acDetails, quantity: next });
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6 text-left">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 font-bold shrink-0">
            <Wrench size={18} />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">AC Details &amp; Issue</h4>
            <p className="text-[11px] text-slate-500 font-medium">Tell us about your AC and the issue observed</p>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full shrink-0">
          Step 1 of 3
        </span>
      </div>

      {/* 1. AC Type - Perfectly Aligned 5-Column Grid */}
      <div>
        <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-2.5">
          AC Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {AC_TYPES.map((t) => {
            const isSel = currentType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`w-full py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center ${
                  isSel
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-1 ring-emerald-600"
                    : "bg-slate-50 text-slate-700 border-slate-200/90 hover:border-emerald-300 hover:bg-white"
                }`}
              >
                {t} AC
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Brand, Capacity, and Quantity - Clean Unified 3-Column Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Brand Dropdown */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
            AC Brand
          </label>
          <div className="relative">
            <select
              value={currentBrand}
              onChange={handleBrandChange}
              className="w-full h-11 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none cursor-pointer"
            >
              {AC_BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Capacity Selector */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
            Capacity
          </label>
          <div className="grid grid-cols-4 gap-1.5 h-11">
            {AC_CAPACITIES.map((c) => {
              const isSel = currentCapacity === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCapacityChange(c)}
                  className={`h-full px-1 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center flex items-center justify-center outline-none ${
                    isSel
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-1 ring-emerald-600"
                      : "bg-slate-50 text-slate-700 border-slate-200/90 hover:border-emerald-300 hover:bg-white"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity Counter */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
            Number of ACs
          </label>
          <div className="flex items-center justify-between h-11 px-3 bg-slate-50 border border-slate-200/90 rounded-xl">
            <span className="text-xs font-bold text-slate-600">Quantity</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQtyChange(-1)}
                disabled={currentQty <= 1}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all text-xs"
              >
                -
              </button>
              <span className="text-xs font-black text-slate-900 min-w-[20px] text-center">
                {currentQty}
              </span>
              <button
                type="button"
                onClick={() => handleQtyChange(1)}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black flex items-center justify-center cursor-pointer transition-all text-xs"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Customer Reported Issues & Services - Symmetrical 4x2 Grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
            What problem are you experiencing?
          </label>
          {selectedList.length > 1 && (
            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {selectedList.length} selected
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CUSTOMER_SYMPTOMS.map((symptom) => {
            const isSel = selectedList.includes(symptom);

            return (
              <button
                key={symptom}
                type="button"
                onClick={() => handleToggleSymptom(symptom)}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-between select-none text-left outline-none focus:outline-none ${
                  isSel
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200/90 hover:border-emerald-300 hover:bg-white"
                }`}
              >
                <span className="truncate">{symptom}</span>
                <span
                  className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-all ${
                    isSel
                      ? "bg-white text-emerald-700 shadow-2xs"
                      : "border border-slate-300 bg-white"
                  }`}
                >
                  {isSel && <Check size={11} strokeWidth={3.5} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Additional Notes & Photo Upload */}
      <div className="space-y-4 pt-1">
        <div>
          <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
            Additional Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="e.g. AC is not cooling since yesterday, slight humming noise from outdoor unit..."
            className="w-full text-xs border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:bg-white bg-slate-50 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* 6. Optional Photo Upload */}
        <div>
          <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
            Upload Photo of AC / Issue (Optional)
          </label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/40 text-slate-600 hover:text-emerald-600 text-xs font-bold transition-all cursor-pointer">
              <Camera size={15} />
              <span>{photoFile ? "Change Photo" : "Add Photo"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) onPhotoChange(e.target.files[0]);
                }}
              />
            </label>
            {photoPreview && (
              <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-slate-200">
                <img src={photoPreview} alt="AC Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Helpful reassurance banner */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-[11px] text-amber-900 leading-relaxed">
        <AlertCircle size={15} className="shrink-0 text-amber-600 mt-0.5" />
        <div>
          <span className="font-extrabold text-amber-950 block mb-0.5">Technician Diagnosis Guaranteed</span>
          You don't need to know the technical fault. The expert will inspect the cooling, airflow, gas, electrical circuits &amp; outdoor unit before recommending the exact repair.
        </div>
      </div>
    </div>
  );
}
