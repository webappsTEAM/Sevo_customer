/**
 * AddressDetailsForm.jsx
 * Slice 3 of 4 — Address details form
 *
 * Receives addressData from MapPickerScreen's onConfirm:
 *   { latitude, longitude, formatted_address, locality, city, state, pincode }
 * Pre-fills geo fields, lets the user fill in flat/house no., landmark,
 * label, receiver name/phone.
 *
 * On "Save Address" calls stub onSubmit(payload) — real API wired in Slice 4.
 * "Change" link navigates back to MapPickerScreen preserving the prior pin.
 */

import React, { useReducer, useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, MapPin, Home, Briefcase, Tag,
  User, Phone, Navigation, CheckCircle2, AlertCircle, Loader2, Lock,
} from "lucide-react"
import { useAuth } from "../../../state/auth/useAuth.js"
import { apiCreateSavedAddress, apiUpdateSavedAddress } from "../../../api/addressService.js"
import { CustomerEntryFlowModal } from "../CustomerEntryFlowModal.jsx"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PHONE_RE   = /^[6-9]\d{9}$/          // 10-digit Indian mobile
const PINCODE_RE = /^\d{6}$/

function validate(state) {
  const errs = {}
  if (!state.flat_house_no.trim())
    errs.flat_house_no = "Flat / house number is required."
  if (!PINCODE_RE.test(state.pincode.trim()))
    errs.pincode = "Enter a valid 6-digit pincode."
  if (!state.label)
    errs.label = "Please select an address label."
  if (!state.receiver_name.trim())
    errs.receiver_name = "Receiver name is required."
  if (!PHONE_RE.test(state.receiver_phone.replace(/\s/g, "")))
    errs.receiver_phone = "Enter a valid 10-digit mobile number."
  return errs
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

const INIT = (addressData, user) => {
  const rawLabel = addressData?.label || addressData?.address_type || addressData?.tag || "home"
  return {
    flat_house_no:   addressData?.flat_house_no ?? addressData?.house_number ?? addressData?.flat ?? "",
    landmark:        addressData?.landmark      ?? "",
    locality:        addressData?.locality      ?? "",
    city:            addressData?.city          ?? "",
    state:           addressData?.state         ?? "",
    pincode:         addressData?.pincode       ?? "",
    label:           typeof rawLabel === "string" ? rawLabel.toLowerCase() : "home",
    receiver_name:   addressData?.receiver_name ?? addressData?.contact_name ?? (user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
      : ""),
    receiver_phone:  addressData?.receiver_phone ?? addressData?.receiver_mobile ?? addressData?.contact_phone ?? user?.phone ?? "",
    touched: {},
    errors: {},
  }
}

function reducer(state, action) {
  switch (action.type) {
    case "FIELD":
      return { ...state, [action.name]: action.value }
    case "LABEL":
      return { ...state, label: action.value,
               errors: { ...state.errors, label: undefined },
               touched: { ...state.touched, label: true } }
    case "TOUCH":
      return { ...state, touched: { ...state.touched, [action.name]: true } }
    case "SET_ERRORS":
      return { ...state, errors: action.errors }
    default:
      return state
  }
}

// ─── Label chips ──────────────────────────────────────────────────────────────

const LABELS = [
  { id: "home",  icon: Home,      label: "Home" },
  { id: "work",  icon: Briefcase, label: "Work" },
  { id: "other", icon: Tag,       label: "Other" },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, required, error, touched, children }) {
  const showError = touched && error
  return (
    <div style={s.fieldWrap}>
      <label style={s.label}>
        {label}
        {required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
      <AnimatePresence>
        {showError && (
          <motion.div
            style={s.errorRow}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <AlertCircle size={13} style={{ flexShrink: 0, color: "#ef4444" }} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TextInput({ id, value, onChange, onBlur, placeholder, inputMode, maxLength, style = {} }) {
  return (
    <input
      id={id}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      inputMode={inputMode}
      maxLength={maxLength}
      style={{ ...s.input, ...style }}
      autoComplete="off"
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {object}   props.addressData   — from MapPickerScreen.onConfirm
 * @param {Function} props.onBack        — go back to MapPickerScreen (preserves coords)
 * @param {Function} props.onSubmit      — stub: called with assembled payload
 * @param {Function} props.onClose       — close the entire AddressPicker flow
 */
export function AddressDetailsForm({ addressData, onBack, onSubmit, onClose }) {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(reducer, null, () => INIT(addressData, user))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingPayload, setPendingPayload] = useState(null)
  const flatRef = useRef(null)

  // Autofocus flat/house field on mount
  useEffect(() => {
    const t = setTimeout(() => flatRef.current?.focus(), 150)
    return () => clearTimeout(t)
  }, [])

  // ── Field helpers ───────────────────────────────────────────────────────────

  const field   = (name) => (e) => dispatch({ type: "FIELD", name, value: e.target.value })
  const touch   = (name) => ()  => {
    dispatch({ type: "TOUCH", name })
    // Re-run validation for this field on blur
    const errs = validate(state)
    dispatch({ type: "SET_ERRORS", errors: errs })
  }
  const touched = (name) => !!state.touched[name]
  const err     = (name) => state.errors[name]

  // Sync user info into receiver fields if user logs in while form is open
  useEffect(() => {
    if (user) {
      if (!state.receiver_name && user.firstName) {
        dispatch({ type: "FIELD", name: "receiver_name", value: [user.firstName, user.lastName].filter(Boolean).join(" ") })
      }
      if (!state.receiver_phone && user.phone) {
        dispatch({ type: "FIELD", name: "receiver_phone", value: user.phone })
      }
    }
  }, [user])

  const doSaveAddress = async (payload) => {
    setSaving(true)
    setSaveError(null)
    try {
      let saved = null
      try {
        if (addressData?.id && !String(addressData.id).startsWith("local_") && !String(addressData.id).startsWith("search-")) {
          const res = await apiUpdateSavedAddress(addressData.id, payload)
          saved = res?.data ?? res
        } else {
          const res = await apiCreateSavedAddress(payload)
          saved = res?.data ?? res
        }
        console.log("[AddressDetailsForm] saved address:", saved)
      } catch (err) {
        console.warn("[AddressDetailsForm] API save address warning, falling back:", err)
        saved = { ...payload, id: addressData?.id || `local_${Date.now()}` }
      }

      if (typeof onSubmit === "function") {
        onSubmit(saved || payload)
      }
    } catch (err) {
      console.error("[AddressDetailsForm] save error:", err)
      const msg = err?.body?.message || err?.body?.detail || err?.message || "Couldn't save address, please try again."
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleAuthComplete = async () => {
    setShowAuthModal(false)
    if (pendingPayload) {
      const p = pendingPayload
      setPendingPayload(null)
      await doSaveAddress(p)
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (saving) return
    // Touch all required fields so errors are shown
    const allTouched = ["flat_house_no", "pincode", "label", "receiver_name", "receiver_phone"]
    allTouched.forEach(name => dispatch({ type: "TOUCH", name }))
    const errs = validate(state)
    dispatch({ type: "SET_ERRORS", errors: errs })
    if (Object.keys(errs).length > 0) return

    const payload = {
      latitude:         addressData?.latitude,
      longitude:        addressData?.longitude,
      formatted_address: addressData?.formatted_address ?? "",
      flat_house_no:    state.flat_house_no.trim(),
      landmark:         state.landmark.trim(),
      locality:         state.locality.trim() || addressData?.locality || "",
      city:             state.city.trim() || addressData?.city || addressData?.locality || "City",
      state:            state.state.trim() || addressData?.state || "State",
      pincode:          state.pincode.trim(),
      label:            state.label,
      receiver_name:    state.receiver_name.trim(),
      receiver_phone:   state.receiver_phone.replace(/[^\d+]/g, "").replace(/^(\+91|91|0)(?=[6-9]\d{9}$)/, "").replace(/\D/g, ""),
    }

    // Require Customer Login before saving address
    if (!user) {
      setPendingPayload(payload)
      setShowAuthModal(true)
      return
    }

    await doSaveAddress(payload)
  }

  const isFormValid = Object.keys(validate(state)).length === 0 && !saving

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={s.overlay} onClick={onBack}>
      <div style={s.modalBox} onClick={e => e.stopPropagation()}>

        {/* Top bar */}
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={onBack} id="adf-back-btn" disabled={saving}>
            <ArrowLeft size={18} />
          </button>
          <span style={s.topBarTitle}>
            {addressData?.id && !addressData?.isNew ? "Edit Address Details" : "Enter Address Details"}
          </span>
          <div style={{ width: 36 }} />
        </div>

      {/* Read-only location summary */}
      <div style={s.locationSummary}>
        <div style={s.locationIconWrap}>
          <MapPin size={16} style={{ color: "#00875A" }} />
        </div>
        <div style={s.locationText}>
          <span style={s.locationLabel}>Delivering to</span>
          <span style={s.locationAddr}>
            {addressData?.formatted_address || "Selected location"}
          </span>
        </div>
        <button style={s.changeBtn} onClick={onBack} id="adf-change-location-btn" disabled={saving}>
          Change
        </button>
      </div>

      {/* Scrollable form body */}
      <div style={s.body}>

        {/* Global Save Error Banner */}
        <AnimatePresence>
          {saveError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "0.85rem 1rem", background: "#fff1f2",
                border: "1.5px solid #fecdd3", borderRadius: 14,
                marginBottom: "1rem", color: "#be123c",
                fontSize: "0.85rem", fontWeight: 700
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, color: "#e11d48" }} />
              <span style={{ flex: 1 }}>{saveError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Flat / House No. ── (autofocused, required) */}
        <Field label="Flat / House / Floor No." required
               error={err("flat_house_no")} touched={touched("flat_house_no")}>
          <TextInput
            id="adf-flat-house"
            value={state.flat_house_no}
            onChange={field("flat_house_no")}
            onBlur={touch("flat_house_no")}
            placeholder='e.g. B-402, 4th Floor'
            maxLength={80}
            style={touched("flat_house_no") && err("flat_house_no") ? s.inputError : {}}
          />
          <span ref={flatRef} tabIndex={-1} style={{ position: "absolute" }} />
          {/* Real autofocus handled via useEffect + ref on the input */}
        </Field>

        {/* ── Landmark (optional) */}
        <Field label="Landmark (optional)"
               error={err("landmark")} touched={touched("landmark")}>
          <TextInput
            id="adf-landmark"
            value={state.landmark}
            onChange={field("landmark")}
            onBlur={touch("landmark")}
            placeholder='e.g. Near Koramangala signal'
            maxLength={100}
          />
        </Field>

        {/* ── Auto-filled section header */}
        <p style={s.sectionLabel}>
          <Navigation size={12} />
          Auto-filled from map — edit if needed
        </p>

        {/* ── Locality */}
        <Field label="Locality / Area"
               error={err("locality")} touched={touched("locality")}>
          <TextInput
            id="adf-locality"
            value={state.locality}
            onChange={field("locality")}
            onBlur={touch("locality")}
            placeholder='e.g. Koramangala'
            maxLength={120}
            style={s.inputMuted}
          />
        </Field>

        {/* ── City + State side by side */}
        <div style={s.row}>
          <Field label="City"
                 error={err("city")} touched={touched("city")}>
            <TextInput
              id="adf-city"
              value={state.city}
              onChange={field("city")}
              onBlur={touch("city")}
              placeholder='City'
              maxLength={80}
              style={s.inputMuted}
            />
          </Field>
          <Field label="State"
                 error={err("state")} touched={touched("state")}>
            <TextInput
              id="adf-state"
              value={state.state}
              onChange={field("state")}
              onBlur={touch("state")}
              placeholder='State'
              maxLength={80}
              style={s.inputMuted}
            />
          </Field>
        </div>

        {/* ── Pincode (required, validated) */}
        <Field label="Pincode" required
               error={err("pincode")} touched={touched("pincode")}>
          <TextInput
            id="adf-pincode"
            value={state.pincode}
            onChange={field("pincode")}
            onBlur={touch("pincode")}
            placeholder='6-digit pincode'
            inputMode="numeric"
            maxLength={6}
            style={{
              ...s.inputMuted,
              ...(touched("pincode") && err("pincode") ? s.inputError : {}),
            }}
          />
        </Field>

        {/* ── Address Label chips (required) */}
        <div style={s.fieldWrap}>
          <label style={s.label}>
            Address Label <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div style={s.chipRow}>
            {LABELS.map(({ id, icon: Icon, label }) => {
              const active = state.label === id
              return (
                <button
                  key={id}
                  id={`adf-label-${id}`}
                  style={{ ...s.chip, ...(active ? s.chipActive : {}) }}
                  onClick={() => dispatch({ type: "LABEL", value: id })}
                  type="button"
                >
                  <Icon size={15} style={{ color: active ? "#6366f1" : "#64748b" }} />
                  {label}
                </button>
              )
            })}
          </div>
          <AnimatePresence>
            {touched("label") && err("label") && (
              <motion.div
                style={s.errorRow}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <AlertCircle size={13} style={{ flexShrink: 0, color: "#ef4444" }} />
                <span>{err("label")}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Receiver section header */}
        <p style={s.sectionLabel}>
          <User size={12} />
          Who will receive the service?
        </p>

        {/* ── Receiver Name (required) */}
        <Field label="Receiver Name" required
               error={err("receiver_name")} touched={touched("receiver_name")}>
          <TextInput
            id="adf-receiver-name"
            value={state.receiver_name}
            onChange={field("receiver_name")}
            onBlur={touch("receiver_name")}
            placeholder='Full name'
            maxLength={80}
            style={touched("receiver_name") && err("receiver_name") ? s.inputError : {}}
          />
        </Field>

        {/* ── Receiver Phone (required, validated) */}
        <Field label="Receiver Mobile Number" required
               error={err("receiver_phone")} touched={touched("receiver_phone")}>
          <div style={s.phoneWrap}>
            <span style={s.phonePrefix}>+91</span>
            <input
              id="adf-receiver-phone"
              value={state.receiver_phone}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, "");
                dispatch({ type: "FIELD", name: "receiver_phone", value: digitsOnly });
              }}
              onBlur={touch("receiver_phone")}
              placeholder='10-digit mobile'
              inputMode="tel"
              maxLength={10}
              style={{
                ...s.input,
                borderRadius: "0 12px 12px 0",
                borderLeft: "none",
                flex: 1,
                ...(touched("receiver_phone") && err("receiver_phone") ? s.inputError : {}),
              }}
              autoComplete="tel"
            />
          </div>
        </Field>

        {/* Bottom padding so button doesn't overlap last field */}
        <div style={{ height: 100 }} />
      </div>

      {/* Sticky Save button */}
      <div style={s.footer}>
        <motion.button
          style={{
            ...s.saveBtn,
            ...(isFormValid ? s.saveBtnActive : s.saveBtnDisabled),
          }}
          onClick={handleSubmit}
          disabled={!isFormValid || saving}
          whileTap={isFormValid ? { scale: 0.97 } : {}}
          id="adf-save-btn"
        >
          {saving ? (
            <><Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> {addressData?.id && !addressData?.isNew ? "Saving Changes…" : "Saving Address…"}</>
          ) : isFormValid ? (
            <><CheckCircle2 size={17} /> {addressData?.id && !addressData?.isNew ? "Save Changes" : "Save Address"}</>
          ) : (
            "Fill required fields to save"
          )}
        </motion.button>
      </div>

        {/* Customer Entry OTP/Login Modal */}
        <CustomerEntryFlowModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onComplete={handleAuthComplete}
        />
      </div>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 10020,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "1rem",
    background: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(4px)",
    fontFamily: "inherit",
  },
  modalBox: {
    width: "100%", maxWidth: "580px", height: "640px", maxHeight: "90vh",
    display: "flex", flexDirection: "column",
    background: "#f8fafc", borderRadius: "24px", overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    position: "relative",
  },
  topBar: {
    height: 52, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 1.25rem",
    background: "#fff",
    borderBottom: "1px solid #f1f5f9",
    zIndex: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: "50%",
    border: "1px solid #e2e8f0", background: "#f8fafc",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#334155",
  },
  topBarTitle: {
    fontSize: "0.95rem", fontWeight: 800, color: "#0f172a",
  },
  // ── Location summary ──
  locationSummary: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "0.75rem 1.1rem",
    background: "#fff",
    borderBottom: "1px solid #f1f5f9",
    flexShrink: 0,
  },
  locationIconWrap: {
    width: 32, height: 32, borderRadius: "50%",
    background: "#ecfdf5",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  locationText: {
    flex: 1, overflow: "hidden",
    display: "flex", flexDirection: "column", gap: 1,
  },
  locationLabel: {
    fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "#94a3b8",
  },
  locationAddr: {
    fontSize: "0.82rem", fontWeight: 700, color: "#334155",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  changeBtn: {
    fontSize: "0.8rem", fontWeight: 800, color: "#00875A",
    background: "none", border: "none", cursor: "pointer", flexShrink: 0,
  },
  // ── Form body ──
  body: {
    flex: 1, overflowY: "auto",
    padding: "1rem 1.1rem 0",
    WebkitOverflowScrolling: "touch",
  },
  fieldWrap: {
    marginBottom: "1rem",
    position: "relative",
  },
  label: {
    display: "block",
    fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "#64748b", marginBottom: 6,
  },
  sectionLabel: {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8",
    margin: "0.25rem 0 0.75rem", padding: "0.5rem 0",
    borderTop: "1px solid #f1f5f9",
  },
  row: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
  },
  input: {
    width: "100%", height: 48, padding: "0 0.875rem",
    border: "1.5px solid #e2e8f0", borderRadius: 12,
    background: "#fff", fontSize: "0.9rem", fontWeight: 700,
    color: "#0f172a", outline: "none", transition: "border-color 0.15s",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  inputMuted: {
    background: "#f8fafc", color: "#475569",
  },
  inputError: {
    border: "1.5px solid #ef4444",
    background: "#fff1f2",
  },
  errorRow: {
    display: "flex", alignItems: "center", gap: 5,
    marginTop: 4, fontSize: "0.73rem", fontWeight: 600, color: "#ef4444",
  },
  // ── Label chips ──
  chipRow: {
    display: "flex", gap: 8, flexWrap: "wrap",
  },
  chip: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "0.55rem 1rem",
    border: "1.5px solid #e2e8f0", borderRadius: 10,
    background: "#f8fafc", color: "#64748b",
    fontSize: "0.85rem", fontWeight: 700,
    cursor: "pointer", transition: "all 0.15s",
    fontFamily: "inherit",
  },
  chipActive: {
    border: "1.5px solid #00875A", background: "#ecfdf5", color: "#065f46",
  },
  // ── Phone field ──
  phoneWrap: {
    display: "flex", alignItems: "stretch",
    border: "1.5px solid #e2e8f0", borderRadius: 12,
    background: "#fff", overflow: "hidden",
    transition: "border-color 0.15s",
  },
  phonePrefix: {
    display: "flex", alignItems: "center",
    padding: "0 12px", background: "#f1f5f9",
    fontSize: "0.88rem", fontWeight: 800, color: "#334155",
    borderRight: "1.5px solid #e2e8f0",
    flexShrink: 0,
  },
  // ── Save button (sticky footer) ──
  footer: {
    padding: "0.875rem 1.1rem",
    paddingBottom: "calc(0.875rem + env(safe-area-inset-bottom, 0px))",
    background: "#fff",
    borderTop: "1px solid #f1f5f9",
    flexShrink: 0,
  },
  saveBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, width: "100%", padding: "0.9rem 1rem",
    fontWeight: 800, fontSize: "0.95rem",
    border: "none", borderRadius: 16,
    cursor: "pointer", boxSizing: "border-box",
    transition: "box-shadow 0.15s",
    fontFamily: "inherit",
  },
  saveBtnActive: {
    background: "linear-gradient(135deg, #00875A, #059669)",
    color: "#fff",
    boxShadow: "0 4px 16px rgba(0, 135, 90, 0.35)",
  },
  saveBtnDisabled: {
    background: "#e2e8f0",
    color: "#94a3b8",
    cursor: "not-allowed",
    boxShadow: "none",
  },
}
