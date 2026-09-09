import React, { useState } from "react"
import { motion } from "framer-motion"
import {
  X, ShoppingCart, ArrowLeft, Trash2, Heart,
  MapPin, ChevronRight, Share2, Info, Plus, Minus, Clock
} from "lucide-react"
import { routes } from "../routes.js"
import { useNavigate } from "react-router-dom"
import { getVegetableTimingInfo } from "../../utils/vegetableSchedule.js"

/**
 * Blinkit / Quick Commerce Style Cart Drawer for Farm-Fresh Vegetables & Groceries
 */
export function VegCartDrawerModal({
  isOpen,
  onClose,
  foodCart = {},
  setFoodCart,
  selectedFoodSubModule,
  getFoodItemPhoto,
  deliveryAddress = "Thozhi Hostel, Viswanathapuram, Hosur, Tamil Nadu",
  deliveryAddressType = "Home",
  onChangeAddress,
  isServiceAvailable = true,
}) {
  const navigate = useNavigate()
  const [selectedTip, setSelectedTip] = useState(0)
  const [includeDonation, setIncludeDonation] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)
  const [drawerToast, setDrawerToast] = useState("")
  const vegTiming = getVegetableTimingInfo()

  const showDrawerStockToast = (msg = "Limited stock — can't add more right now") => {
    setDrawerToast(msg)
    window.clearTimeout(showDrawerStockToast._t)
    showDrawerStockToast._t = window.setTimeout(() => setDrawerToast(""), 2800)
  }

  if (!isOpen) return null

  // Calculate items from foodCart
  const itemsList = []
  let itemTotal = 0
  let mrpTotal = 0

  Object.entries(foodCart || {}).forEach(([nameWithUnit, qty]) => {
    if (qty <= 0) return
    let matchedItem = null
    let unit = "1 unit"
    let price = 0
    let mrp = 0
    let baseName = nameWithUnit

    if (selectedFoodSubModule?.items) {
      for (const it of selectedFoodSubModule.items) {
        if (it.options) {
          for (const opt of it.options) {
            if (`${it.name} (${opt.unit})` === nameWithUnit) {
              matchedItem = it
              unit = opt.unit
              price = opt.price
              mrp = opt.mrp || Math.round(opt.price * 1.2)
              baseName = it.name
              break
            }
          }
        }
        if (matchedItem) break

        if (nameWithUnit.includes(" (2 x ") && nameWithUnit.startsWith(it.name)) {
          matchedItem = it
          unit = `2 × ${it.unit || "500 g"}`
          price = Math.round((it.price || 20) * 1.9)
          mrp = (it.mrp || (it.price > 20 ? it.price + 8 : it.price + 5)) * 2
          baseName = it.name
          break
        }

        if (it.name === nameWithUnit) {
          matchedItem = it
          unit = it.unit || "500 g"
          price = it.price
          mrp = it.mrp || Math.round(it.price * 1.2)
          baseName = it.name
          break
        }
      }
    }

    const effectivePrice = price || 30
    const effectiveMrp = mrp || Math.round(effectivePrice * 1.2)
    const image = matchedItem?.image || (getFoodItemPhoto ? getFoodItemPhoto(baseName, false) : "")

    itemTotal += effectivePrice * qty
    mrpTotal += effectiveMrp * qty

    itemsList.push({
      key: nameWithUnit,
      id: `veg_${nameWithUnit.replace(/[^a-zA-Z0-9]/g, "_")}`,
      name: baseName,
      displayName: nameWithUnit,
      unit: unit,
      price: effectivePrice,
      mrp: effectiveMrp,
      quantity: qty,
      image: image,
      in_stock: matchedItem?.in_stock !== false,
      max_quantity: typeof matchedItem?.max_quantity === "number" ? matchedItem.max_quantity : null,
    })
  })

  const totalCount = itemsList.reduce((acc, i) => acc + i.quantity, 0)
  const savings = Math.max(0, mrpTotal - itemTotal)

  const deliveryCharge = itemTotal > 0 ? 10 : 0
  const handlingCharge = itemTotal > 0 ? 2 : 0
  const grandTotal = itemTotal + deliveryCharge + handlingCharge + (selectedTip || 0)

  const handleUpdateQty = (key, delta) => {
    if (delta > 0 && selectedFoodSubModule?.items) {
      // Find matching item in catalog
      let matched = null
      for (const it of selectedFoodSubModule.items) {
        if (it.name === key || key.startsWith(it.name)) {
          matched = it
          break
        }
      }
      if (matched && typeof matched.max_quantity === "number") {
        let totalUnitsForProduct = 0
        Object.entries(foodCart || {}).forEach(([k, q]) => {
          if (k === matched.name) {
            totalUnitsForProduct += q
          } else if (k.includes(" (2 x ") && k.startsWith(matched.name)) {
            totalUnitsForProduct += q * 2
          } else if (k.startsWith(matched.name)) {
            totalUnitsForProduct += q
          }
        })
        const multiplier = key.includes(" (2 x ") ? 2 : 1
        if (totalUnitsForProduct + (delta * multiplier) > matched.max_quantity) {
          showDrawerStockToast("Limited stock — can't add more right now")
          return
        }
      }
    }

    if (typeof setFoodCart === "function") {
      setFoodCart((prev) => {
        const current = prev[key] || 0
        const updated = current + delta
        if (updated <= 0) {
          const next = { ...prev }
          delete next[key]
          return next
        }
        return { ...prev, [key]: updated }
      })
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "My Farm-Fresh Vegetables Cart",
        text: `I'm ordering fresh vegetables from Hosur Quick Hub (${totalCount} items, ₹${grandTotal})!`,
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(window.location.href)
      setCopiedShare(true)
      setTimeout(() => setCopiedShare(false), 2000)
    }
  }

  const handleProceedToPay = () => {
    if (itemsList.length === 0) return
    onClose()
    navigate(routes.booking_checkout, {
      state: {
        category: {
          id: "vegetables_quick_delivery",
          name: selectedFoodSubModule?.name || "Farm-Fresh Vegetables",
          isQuickCommerce: true,
          deliveryTime: vegTiming.deliverySlot,
          foodSubModuleId: selectedFoodSubModule?.id || "vegetables",
          vegTiming: vegTiming,
        },
        cart: itemsList.map((item) => ({
          ...item,
          serviceType: "vegetables_quick_delivery",
          category: "vegetables_quick_delivery",
          categoryName: selectedFoodSubModule?.name || "Farm-Fresh Vegetables",
          isQuickCommerce: true,
          deliveryTime: vegTiming.deliverySlot,
        })),
        isQuickCommerce: true,
        foodCart: foodCart,
        foodSubModuleId: selectedFoodSubModule?.id || "vegetables",
        grandTotal: grandTotal,
        selectedTip: selectedTip,
        deliveryAddress: deliveryAddress,
        vegTiming: vegTiming,
      },
    })
  }

  return (
    <div
      className="fixed inset-0 z-[10080] bg-black/35 flex justify-end transition-opacity"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#F4F6FB] h-full flex flex-col shadow-2xl overflow-hidden font-sans relative"
      >
        {/* Toast Warning */}
        {drawerToast && (
          <div className="absolute top-14 left-4 right-4 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-xl font-bold text-xs text-center shadow-xl border border-slate-700 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>{drawerToast}</span>
          </div>
        )}

        {/* Header */}
        <div className="px-4 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="font-extrabold text-slate-900 text-base">My Cart</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedShare ? "Copied!" : "Share"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {itemsList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingCart size={48} className="mb-3 opacity-25" />
              <p className="font-extrabold text-slate-700 text-base">Your vegetable cart is empty</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Add fresh farm vegetables to get 8-15 mins delivery right at your door.
              </p>
            </div>
          ) : (
            <>
              {/* Delivery Partner Status Card */}
              {vegTiming.afterTwelveNotice ? (
                <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-800 font-extrabold text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      Booking Notice (After 12:00 PM)
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900 font-semibold leading-relaxed">
                    Same-day booking is open 6:00 AM – 12:00 PM. Booking is not available for same-day delivery right now — <strong>even if booked now, it will be delivered tomorrow between 6:00 PM and 8:00 PM</strong>.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 font-extrabold text-base">
                    🚚
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-emerald-950">Delivered Today: 6:00 PM – 8:00 PM</p>
                    <p className="text-[11px] font-semibold text-emerald-800">
                      Shipment of {totalCount} {totalCount === 1 ? "item" : "items"} • Morning booking window (6 AM – 12 PM)
                    </p>
                  </div>
                </div>
              )}

              {/* Items List Card */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs space-y-3.5">
                {itemsList.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3">
                    {/* Item Image */}
                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-xl">🥦</span>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-900 leading-tight line-clamp-1">{item.name}</p>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">{item.unit}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-black text-slate-900">₹{item.price}</span>
                        {item.mrp > item.price && (
                          <span className="text-[10px] font-bold text-slate-400 line-through">₹{item.mrp}</span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Pill */}
                    <div className="flex items-center bg-emerald-700 text-white rounded-lg px-1.5 py-1 shrink-0 shadow-xs">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.key, -1)}
                        className="w-5 h-5 flex items-center justify-center font-black hover:bg-emerald-800 rounded transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black px-2 min-w-[20px] text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.key, 1)}
                        className="w-5 h-5 flex items-center justify-center font-black hover:bg-emerald-800 rounded transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bill Details Card - Exactly Matching Image 2 */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center justify-between">
                  <span>Bill Details</span>
                  {savings > 0 && (
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Saved ₹{savings}
                    </span>
                  )}
                </h4>

                <div className="space-y-2 text-xs font-bold text-slate-600 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span>Items total</span>
                      {savings > 0 && (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Saved ₹{savings}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5 font-black">
                      {mrpTotal > itemTotal && (
                        <span className="text-slate-400 line-through text-[11px]">₹{mrpTotal}</span>
                      )}
                      <span className="text-slate-900">₹{itemTotal}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1 text-slate-500">
                      <span>Delivery charge</span>
                      <Info className="w-3 h-3 text-slate-400" />
                    </span>
                    <span className="font-black text-slate-900">₹{deliveryCharge}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1 text-slate-500">
                      <span>Handling &amp; packaging</span>
                      <Info className="w-3 h-3 text-slate-400" />
                    </span>
                    <span className="font-black text-slate-900">₹{handlingCharge}</span>
                  </div>

                  {selectedTip > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Delivery Partner Tip</span>
                      <span className="font-black text-emerald-700">₹{selectedTip}</span>
                    </div>
                  )}

                  <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center text-sm font-black text-slate-900">
                    <span>Grand Total</span>
                    <span className="text-slate-900 text-base">₹{grandTotal}</span>
                  </div>
                </div>
              </div>

              {/* Support Your Delivery Partner - Exactly Matching Image 2 */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs space-y-2">
                <h4 className="text-xs font-black text-slate-900">Support your delivery partner</h4>
                <p className="text-[10px] font-medium text-slate-400 leading-tight">
                  Add a tip to show appreciation. 100% of the tip goes directly to your rider.
                </p>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[
                    { amount: "₹20", label: "Say Thanks", val: 20 },
                    { amount: "₹30", label: "Buy a Chai", val: 30 },
                    { amount: "₹50", label: "Show Love", val: 50 },
                    { amount: "Custom", label: "Other", val: 100 },
                  ].map((tip) => (
                    <button
                      key={tip.val}
                      type="button"
                      onClick={() => setSelectedTip(selectedTip === tip.val ? 0 : tip.val)}
                      className={`py-2 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                        selectedTip === tip.val
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <p className="text-xs font-black">{tip.amount}</p>
                      <p className="text-[9px] text-slate-400 font-medium">{tip.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cancellation Policy */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs space-y-1">
                <h4 className="text-xs font-black text-slate-900">Cancellation Policy</h4>
                <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                  Orders cannot be cancelled once packed for delivery. In case of unexpected delays, a refund will be provided, if applicable.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Pinned Address & Checkout Footer */}
        {itemsList.length > 0 && (
          <div className="bg-white border-t border-slate-200 shrink-0 shadow-lg">
            {/* Delivery Address Pill */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-slate-900 truncate">
                    Delivering to {deliveryAddressType || "Home"}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate" title={deliveryAddress}>
                    {deliveryAddress || "Hosur, Tamil Nadu"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (typeof onChangeAddress === "function") {
                    onChangeAddress()
                  } else {
                    handleProceedToPay()
                  }
                }}
                className="text-xs font-extrabold text-emerald-700 hover:underline cursor-pointer shrink-0"
              >
                Change
              </button>
            </div>

            {/* Out-of-zone warning if vegetables not allowed in current area */}
            {!isServiceAvailable && (
              <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 flex items-center justify-between gap-2 text-xs font-bold animate-in fade-in">
                <span>🚫 Vegetables delivery is unavailable at this address.</span>
                {onChangeAddress && (
                  <button
                    type="button"
                    onClick={onChangeAddress}
                    className="text-rose-900 underline font-black hover:text-rose-950 cursor-pointer shrink-0"
                  >
                    Change Area
                  </button>
                )}
              </div>
            )}

            {/* Pay Button Bar */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-black text-slate-900 leading-tight">₹{grandTotal}</p>
                <p className="text-[10px] font-extrabold text-slate-400 tracking-wider">TOTAL</p>
              </div>

              <button
                type="button"
                disabled={!isServiceAvailable}
                onClick={handleProceedToPay}
                className={`flex-1 py-3 px-4 text-white font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                  isServiceAvailable
                    ? "bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/20 cursor-pointer active:scale-98"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                }`}
              >
                <span>
                  {isServiceAvailable
                    ? `Proceed To Pay • ${vegTiming.deliveryDay} (6-8 PM)`
                    : "Unavailable at This Location"}
                </span>
                {isServiceAvailable && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
