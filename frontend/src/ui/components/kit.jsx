import { forwardRef, useId } from "react"
import { createPortal } from "react-dom"

export function Card({ title, children, actions, className = "", ...props }) {
  return (
    <section className={`bg-surface dark:bg-slate-900/60 rounded-2xl border border-stroke dark:border-slate-800 shadow-sm overflow-hidden mb-6 ${className}`} {...props}>
      {(title || actions) && (
        <header className="px-6 py-4 border-b border-stroke dark:border-slate-800 flex justify-between items-center bg-surface2 dark:bg-slate-950/20">
          {title ? <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white font-[Manrope]">{title}</h2> : <div />}
          {actions ? <div className="flex gap-2">{actions}</div> : null}
        </header>
      )}
      <div className="p-6">{children}</div>
    </section>
  )
}

export const Button = forwardRef(function Button({ variant = "primary", ...props }, ref) {
  const base = "inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest"
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 shadow-[0_4px_12px_rgba(79,70,229,0.2)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.3)] active:scale-[0.96]",
    ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200",
    danger: "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 shadow-[0_4px_12px_rgba(225,29,72,0.2)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.3)] active:scale-[0.96]"
  }
  const cls = [base, variants[variant] || variants.primary, props.className].filter(Boolean).join(" ")
  return <button {...props} ref={ref} className={cls} />
})

export function Input({ label, hint, icon, variant = "default", onWheel, ...props }) {
  const id = useId()
  const variants = {
    default: "bg-slate-50 hover:bg-slate-100/70 focus:bg-white dark:bg-slate-950/50 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800",
    dark: "bg-white dark:bg-black text-slate-900 dark:text-white border-slate-200 dark:border-slate-800"
  }
  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      {label && <div className="text-[11px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">{label}{props.required && <span className="text-rose-500 ml-0.5">*</span>}</div>}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
            {icon}
          </div>
        )}
        <input
          {...props}
          id={id}
          onWheel={(e) => {
            if (props.type === "number") {
              e.currentTarget.blur()
            }
            if (onWheel) onWheel(e)
          }}
          className={[
            "w-full rounded-xl border transition-all duration-200 text-sm shadow-2xs focus:outline-none focus:ring-3 focus:ring-indigo-500/15 focus:border-indigo-500 font-medium dark:[color-scheme:dark] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            icon ? "pl-10 pr-3.5" : "px-3.5",
            "py-2.5 sm:py-3",
            variants[variant] || variants.default,
            props.className
          ].filter(Boolean).join(" ")}
        />
      </div>
      {hint ? <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 ml-0.5">{hint}</div> : null}
    </label>
  )
}

export function Select({ label, options, hint, icon, ...props }) {
  const id = useId()
  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      {label && <div className="text-[11px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">{label}{props.required && <span className="text-rose-500 ml-0.5">*</span>}</div>}
      <div className="relative group">
        <select
          {...props}
          id={id}
          className={[
            "w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100/70 focus:bg-white dark:bg-slate-950/50 text-slate-900 dark:text-white focus:outline-none focus:ring-3 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all duration-200 text-sm shadow-2xs appearance-none font-medium dark:[color-scheme:dark] cursor-pointer",
            props.className
          ].filter(Boolean).join(" ")}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-600 transition-colors">
          <svg width="12" height="7" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {hint ? <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 ml-0.5">{hint}</div> : null}
    </label>
  )
}

export function TextArea({ label, hint, ...props }) {
  const id = useId()
  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      {label && <div className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-0.5 tracking-tight">{label}</div>}
      <textarea
        {...props}
        id={id}
        className={[
          "w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100/70 focus:bg-white dark:bg-slate-950/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-3 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all duration-200 text-sm min-h-[110px] shadow-2xs font-medium dark:[color-scheme:dark]",
          props.className
        ].filter(Boolean).join(" ")}
      />
      {hint ? <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 ml-0.5">{hint}</div> : null}
    </label>
  )
}

export function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    good: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
    bad: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800",
    warn: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
  }
  const cls = `inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${tones[tone] || tones.neutral}`
  return <span className={cls}>{children}</span>
}

export function formatDateTime(value) {
  if (!value) return ""
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return String(value)
  return dt.toLocaleString()
}

export function Modal({ title, children, onClose, maxWidth = "max-w-2xl", className = "" }) {
  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto w-screen h-screen">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full ${maxWidth} border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto ${className}`}>
        <div className="flex justify-between items-center px-6 sm:px-7 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="p-6 sm:p-7 max-h-[85vh] overflow-y-auto font-sans">
          {children}
        </div>
      </div>
    </div>
  )
  if (typeof document !== "undefined" && document.body) {
    return createPortal(modalContent, document.body)
  }
  return modalContent
}


