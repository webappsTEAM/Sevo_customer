/**
 * Fresh Vegetables Timing & Delivery Rules:
 * 1. Booking Window: 6:00 AM (06:00) to 12:00 PM (12:00 / noon)
 * 2. Delivery Time: 6:00 PM to 8:00 PM (evening)
 * 3. After 12:00 PM (or before 6:00 AM):
 *    - Same-day booking is not available for today.
 *    - Message states booking is not available for same-day delivery at the moment, and even if booked now it will be delivered tomorrow between 6:00 PM and 8:00 PM.
 *    - The customer can proceed with the booking for tomorrow's delivery.
 */

export function getVegetableTimingInfo(customDate = null) {
  const now = customDate ? new Date(customDate) : new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const totalMinutes = hours * 60 + minutes

  // 6:00 AM = 360 mins, 12:00 PM = 720 mins
  const isWithinBookingWindow = totalMinutes >= 360 && totalMinutes < 720

  const todayDateObj = new Date(now)
  const tomorrowDateObj = new Date(now)
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1)

  const formatDateYMD = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const todayStr = todayDateObj.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
  const tomorrowStr = tomorrowDateObj.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })

  const deliveryWindow = "6:00 PM – 8:00 PM"
  const bookingWindow = "6:00 AM – 12:00 PM"

  if (isWithinBookingWindow) {
    return {
      isWithinBookingWindow: true,
      isSameDay: true,
      deliveryDay: "Today",
      deliveryDateStr: formatDateYMD(todayDateObj),
      deliveryDateFormatted: todayStr,
      deliveryWindow: deliveryWindow,
      deliverySlot: `Today (${deliveryWindow})`,
      bookingWindow: bookingWindow,
      headerBadge: `🚚 Delivery Today: ${deliveryWindow}`,
      cardDeliveryBadge: `6 PM – 8 PM (Today)`,
      cartButtonText: `Schedule Delivery Today (6 PM – 8 PM)`,
      checkoutDeliveryTitle: `Fresh Vegetables Delivery Today (${deliveryWindow})`,
      checkoutDeliverySubtitle: `Order placed during morning window (${bookingWindow})`,
      afterTwelveNotice: false,
      noticeText: null,
    }
  } else {
    return {
      isWithinBookingWindow: false,
      isSameDay: false,
      deliveryDay: "Tomorrow",
      deliveryDateStr: formatDateYMD(tomorrowDateObj),
      deliveryDateFormatted: tomorrowStr,
      deliveryWindow: deliveryWindow,
      deliverySlot: `Tomorrow, ${tomorrowStr} (${deliveryWindow})`,
      bookingWindow: bookingWindow,
      headerBadge: `🚚 Delivery Tomorrow: ${deliveryWindow}`,
      cardDeliveryBadge: `6 PM – 8 PM (Tomorrow)`,
      cartButtonText: `Schedule Delivery for Tomorrow (6 PM – 8 PM)`,
      checkoutDeliveryTitle: `Next-Day Delivery: Tomorrow (${deliveryWindow})`,
      checkoutDeliverySubtitle: `Booking placed after 12:00 PM. Same-day delivery closed; fresh harvest will arrive tomorrow evening (${deliveryWindow}).`,
      afterTwelveNotice: true,
      noticeText: `Same-day booking is open from 6:00 AM to 12:00 PM. Booking is not available for same-day delivery at the moment — even if booked now, your fresh vegetables will be delivered tomorrow between 6:00 PM and 8:00 PM.`,
    }
  }
}
