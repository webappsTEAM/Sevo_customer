import React from 'react'
import { Home, Briefcase, MapPin, Edit3, Trash2, Map, Star, ShieldCheck, CheckCircle2 } from 'lucide-react'

/**
 * SavedAddressCard - Management Mode (Swiggy Style matching Image 2)
 * Used on Profile → Saved Addresses page for managing customer addresses.
 * Contains: Icon, Type label, DEFAULT badge, Title, Address lines, Landmark, 
 * Service Available badge, Location Verified badge, and Action toolbar (Map Pin, Edit, Delete, Set Default).
 */
export default function SavedAddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  onMapPin
}) {
  if (!address) return null

  const rawTag = (address.address_type || address.tag || address.label || 'Home').toLowerCase()
  const isHome = rawTag.includes('home')
  const isWork = rawTag.includes('work') || rawTag.includes('office')
  const labelDisplay = address.label_display || address.address_type || address.tag || address.label || 'HOME'

  const titleLine = [address.flat_house_no || address.house_number, address.address_line1].filter(Boolean).join(', ') || address.locality || 'Saved Address'
  const fullAddressLine = address.formatted_address || [address.address_line1, address.locality, address.city, address.state, address.pincode].filter(Boolean).join(', ')

  return (
    <div
      className={`p-5 rounded-2xl bg-white border transition-all relative flex flex-col justify-between shadow-xs hover:shadow-md ${
        address.is_default ? 'border-[#00875A] ring-2 ring-[#00875A]/15 bg-white' : 'border-slate-200/90'
      }`}
    >
      <div>
        {/* Card Header: Icon, Type Label, Default Badge */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold text-base ${
                isHome
                  ? 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
                  : isWork
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-purple-100 text-purple-800 border border-purple-200'
              }`}
            >
              {isHome ? <Home size={18} /> : isWork ? <Briefcase size={18} /> : <MapPin size={18} />}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs text-slate-900 uppercase tracking-wider">
                {labelDisplay}
              </span>
              {address.is_default && (
                <span className="text-[9px] font-black uppercase tracking-wider bg-[#00875A] text-white px-2 py-0.5 rounded-full shadow-2xs">
                  DEFAULT
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Address Lines matching Swiggy Layout */}
        <div className="space-y-1 text-slate-800 text-xs sm:text-sm font-medium leading-relaxed mb-3">
          {titleLine && (
            <div className="font-black text-slate-900 text-sm leading-snug">
              {titleLine}
            </div>
          )}

          {fullAddressLine && fullAddressLine !== titleLine && (
            <div className="text-slate-600 text-xs leading-relaxed">
              {fullAddressLine}
            </div>
          )}

          {address.landmark && (
            <div className="text-xs text-slate-600 font-semibold pt-0.5">
              <span className="text-slate-400 font-normal">Landmark:</span> {address.landmark}
            </div>
          )}
        </div>

        {/* Badges: Service Available & Location Verified */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#00875A] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 size={11} />
            Service Available
          </span>
          {address.latitude && address.longitude ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
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

      {/* Management Action Toolbar */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 flex-wrap">
        {onMapPin && (
          <button
            type="button"
            onClick={() => onMapPin(address)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="Adjust Pin on Map"
          >
            <Map size={13} />
            <span>Map Pin</span>
          </button>
        )}

        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(address)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="Edit Address"
          >
            <Edit3 size={13} />
            <span>Edit</span>
          </button>
        )}

        {!address.is_default && onSetDefault && (
          <button
            type="button"
            onClick={() => onSetDefault(address.id)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-slate-700 hover:text-amber-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="Set as Default Address"
          >
            <Star size={13} />
            <span>Set Default</span>
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(address.id)}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="Delete Address"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        )}
      </div>
    </div>
  )
}

