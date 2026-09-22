import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wrench, Camera, Trash2, ChevronDown, CheckCircle2 } from "lucide-react";

export const AC_BRANDS_LIST = [
  "Daikin",
  "Voltas",
  "LG",
  "Samsung",
  "Blue Star",
  "Hitachi",
  "Carrier",
  "Panasonic",
  "Godrej",
  "Whirlpool",
  "Lloyd",
  "Mitsubishi",
  "O General",
  "Haier",
  "Other"
];

/**
 * ACInspectionFormModal
 * Clean and simple modal for the single AC Inspection service:
 * 1. AC Brand (Dropdown/select)
 * 2. AC Type (Split AC, Window AC)
 * 3. How Many ACs? (Number selector/input, min 1)
 * 4. Upload AC Images (Optional, with preview and removal)
 * 5. Notes (Optional textarea)
 * Button: "Continue"
 */
export function ACInspectionFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  basePrice = 199
}) {
  const [brand, setBrand] = useState(initialData.brand || "Daikin");
  const [type, setType] = useState(initialData.type || "Split AC");
  const [quantity, setQuantity] = useState(Math.max(1, Number(initialData.quantity) || 1));
  const [images, setImages] = useState(initialData.images || []);
  const [imageFiles, setImageFiles] = useState([]);
  const [notes, setNotes] = useState(initialData.notes || "");

  if (!isOpen) return null;

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setImages((prev) => [...prev, uploadEvent.target.result]);
      };
      reader.readAsDataURL(file);
    });

    setImageFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setImageFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleContinue = () => {
    const inspectionData = {
      brand,
      type,
      quantity,
      images,
      imageFiles,
      primaryFile: imageFiles[0] || null,
      primaryPreview: images[0] || null,
      notes: notes.trim(),
      price: Number(basePrice) || 199,
      totalPrice: (Number(basePrice) || 199) * quantity
    };

    if (typeof onSubmit === "function") {
      onSubmit(inspectionData);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 cursor-pointer"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200/80 flex items-center justify-center font-bold shadow-xs shrink-0">
                <Wrench size={18} />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    AC Inspection Details
                  </h3>
                  <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                    ₹{basePrice}/AC
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Provide your AC details to proceed with booking
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all cursor-pointer shadow-2xs"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form Content (Scrollable if needed) */}
          <div className="p-6 space-y-5 overflow-y-auto text-left">
            {/* 1. AC Brand */}
            <div>
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-2">
                1. AC Brand <span className="text-emerald-600">*</span>
              </label>
              <div className="relative">
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  {AC_BRANDS_LIST.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* 2. AC Type (Split AC / Window AC) */}
            <div>
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-2">
                2. AC Type <span className="text-emerald-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {["Split AC", "Window AC"].map((t) => {
                  const isSelected = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-600/30"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-white"
                      }`}
                    >
                      {isSelected && <CheckCircle2 size={14} className="text-white" />}
                      <span>{t}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. How Many ACs? */}
            <div>
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-2">
                3. How Many ACs? <span className="text-emerald-600">*</span>
              </label>
              <div className="flex items-center justify-between h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Inspection Units</span>
                  <span className="text-[11px] text-slate-400">₹{basePrice * quantity} total</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all text-sm shadow-2xs"
                  >
                    −
                  </button>
                  <span className="text-sm font-black text-slate-900 min-w-[24px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black flex items-center justify-center cursor-pointer transition-all text-sm shadow-2xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Upload AC Images (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                  4. Upload AC Images
                </label>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Optional
                </span>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/30 text-slate-600 hover:text-emerald-700 text-xs font-bold transition-all cursor-pointer">
                  <Camera size={16} />
                  <span>Click to add AC photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>

                {/* Previews */}
                {images.length > 0 && (
                  <div className="flex items-center gap-2.5 flex-wrap pt-1">
                    {images.map((imgSrc, idx) => (
                      <div
                        key={idx}
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-2xs group"
                      >
                        <img
                          src={imgSrc}
                          alt={`AC photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove image"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 5. Notes (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                  5. Notes
                </label>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Optional
                </span>
              </div>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe any issue or requirement (e.g. AC not cooling, strange rattling noise, water leaking from indoor unit)..."
                className="w-full text-xs border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 focus:bg-white bg-slate-50 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Footer with Continue Button */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Inspection Fee
              </span>
              <span className="text-base font-black text-emerald-700">
                ₹{(Number(basePrice) || 199) * quantity}
              </span>
            </div>

            <button
              type="button"
              onClick={handleContinue}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all uppercase tracking-wider cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <span>Continue</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
