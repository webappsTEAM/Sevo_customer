import React from 'react'
import { Home, Briefcase, MapPin, Check, CheckCircle2, ShieldCheck, Edit3, Trash2 } from 'lucide-react'

/**
 * BookingAddressCard
 * Standard Swiggy-Style Address Card for Selection & Management.
 * Used in SelectServiceAddressDrawer.jsx and SavedAddressesPage.jsx.
 * Displays: Icon, Label, Title, Formatted address, Landmark,
 * Service Available badge, Location Verified badge, [✓ Selected] state (or Select →),
 * and management action buttons ([ Edit ], [ Delete ]).
 */
export default function BookingAddressCard({
  address,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete
}) {
  if (!address) return null

  const rawTag = (address.address_type || address.tag || address.label || 'Home').toLowerCase()
  const isHome = rawTag.includes('home')
  const isWork = rawTag.includes('work') || rawTag.includes('office')
  const labelDisplay = address.label_display || address.address_type || address.tag || address.label || 'HOME'

  const titleLine = [address.flat_house_no || address.house_number, address.address_line1].filter(Boolean).join(', ') || address.locality || 'Saved Address'
  const fullAddressLine = address.formatted_address || [address.address_line2, address.locality, address.city, address.state, address.pincode].filter(Boolean).join(', ')

  return (
    <div
      onClick={() => onSelect && onSelect(address)}
      className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative group ${
        isSelected
          ? 'bg-white border-[#00875A] ring-2 ring-[#00875A]/20 shadow-sm'
          : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Icon Container */}
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-bold text-lg ${
            isHome
              ? 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
              : isWork
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-purple-100 text-purple-700 border border-purple-200'
          }`}
        >
          {isHome ? <Home size={19} /> : isWork ? <Briefcase size={19} /> : <MapPin size={19} />}
        </div>

        {/* Address Info */}
        <div className="flex-1 min-w-0 pr-20">
          <div className="flex items-center gap-2">
            <span className="font-black text-xs text-slate-900 uppercase tracking-wider">
              {labelDisplay}
            </span>
          </div>

          {/* Title / Line 1 */}
          {titleLine && (
            <div className="font-black text-sm text-slate-900 mt-1 leading-snug">
              {titleLine}
            </div>
          )}

          {/* Formatted Address */}
          {fullAddressLine && fullAddressLine !== titleLine && (
            <div className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
              {fullAddressLine}
            </div>
          )}

          {/* Landmark */}
          {address.landmark && (
            <div className="text-xs text-slate-600 font-semibold mt-1">
              <span className="text-slate-400 font-normal">Landmark:</span> {address.landmark}
            </div>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#00875A] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={11} />
              Service Available
            </span>
            {address.latitude && address.longitude ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                <ShieldCheck size={11} className="text-emerald-600" />
                <span>📍 Location verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <span>⚠️ Coordinates pending</span>
              </span>
            )}
          </div>
        </div>

        {/* Selected Checkmark or Select Action */}
        <div className="absolute top-4 right-4">
          {isSelected ? (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00875A] text-white rounded-full text-[10px] font-black shadow-xs">
              <Check size={12} strokeWidth={3} />
              <span>Selected</span>
            </div>
          ) : (
            <span className="text-xs font-bold text-slate-500 group-hover:text-[#00875A] transition-colors">
              Select →
            </span>
          )}
        </div>
      </div>

      {/* Management Toolbar (Edit, Delete) */}
      {(onEdit || onDelete) && (
        <div
          className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-100 flex-wrap"
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(address)}
              className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(address.id)}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

