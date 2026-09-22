import React, { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, ArcElement, Filler
} from "chart.js"
import { Line, Bar, Doughnut } from "react-chartjs-2"
import { fetchCustomerAnalytics, updateFilters } from "../../store/customerAnalyticsSlice.js"
import { BarChart3, Users, Clock, CheckSquare, Banknote, MapPin, AlertCircle, RefreshCw } from "lucide-react"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler)

function getChartOptions(isDark, isHorizontal = false) {
  const textColor = isDark ? "#cbd5e1" : "#475569";
  const gridColor = isDark ? "#334155" : "#e2e8f0";
  
  return {
    indexAxis: isHorizontal ? "y" : "x",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: textColor, font: { family: "Inter", weight: "600", size: 11 } } },
      tooltip: {
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        titleColor: isDark ? "#f8fafc" : "#0f172a",
        bodyColor: isDark ? "#cbd5e1" : "#475569",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        borderWidth: 1,
        padding: 10,
        titleFont: { family: "Inter", size: 13 },
        bodyFont: { family: "Inter", size: 12 },
        displayColors: true,
        cornerRadius: 8,
      }
    },
    scales: {
      x: { ticks: { color: textColor, font: { family: "Inter", size: 10 } }, grid: { display: false } },
      y: { ticks: { color: textColor, font: { family: "Inter", size: 10 } }, grid: { color: gridColor, drawBorder: false } }
    }
  }
}

export function CustomersDashboardPage() {
  const dispatch = useDispatch()
  const isDark = document.documentElement.classList.contains("dark")
  
  const filters = useSelector((state) => state.customerAnalytics.filters)
  const { summary, deltas, growthSeries, cancellationReasons, categoryMix, abandonmentRate, outstandingCount, loading, error } = useSelector(
    (state) => state.customerAnalytics.analytics
  )

  useEffect(() => {
    dispatch(fetchCustomerAnalytics(filters))
  }, [dispatch, filters])

  const handlePeriodChange = (e) => {
    dispatch(updateFilters({ period: e.target.value, from: "", to: "" }))
  }

  const handleRefresh = () => {
    dispatch(fetchCustomerAnalytics({ ...filters, refresh: "true" }))
  }

  // --- Growth Chart ---
  const growthData = {
    labels: growthSeries?.labels || [],
    datasets: [
      {
        label: "Bookings",
        data: growthSeries?.bookings || [],
        borderColor: "#4F46E5",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Revenue (₹)",
        data: growthSeries?.revenue || [],
        borderColor: "#10B981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4,
        yAxisID: "y1",
      }
    ]
  }

  const growthOptions = {
    ...getChartOptions(isDark),
    scales: {
      x: { grid: { display: false } },
      y: { type: "linear", display: true, position: "left", grid: { color: isDark ? "#334155" : "#e2e8f0" } },
      y1: { type: "linear", display: true, position: "right", grid: { drawOnChartArea: false } }
    }
  }

  // --- Cancellation Reasons Chart ---
  const cancelData = {
    labels: cancellationReasons?.labels || [],
    datasets: [
      {
        label: "Cancellations",
        data: cancellationReasons?.data || [],
        backgroundColor: ["#EF4444", "#F59E0B", "#3B82F6", "#10B981", "#8B5CF6", "#6B7280"],
        borderWidth: 0,
        borderRadius: 4,
      }
    ]
  }

  // --- Category Mix Chart ---
  const categoryData = {
    labels: categoryMix?.labels || [],
    datasets: [
      {
        data: categoryMix?.data || [],
        backgroundColor: [
          "#6366F1", "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
          "#EC4899", "#8B5CF6", "#06B6D4", "#14B8A6", "#F97316"
        ],
        borderWidth: isDark ? 2 : 1,
        borderColor: isDark ? "#1e293b" : "#ffffff",
      }
    ]
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 min-h-screen">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">Customer Analytics</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Real-time visual monitoring of customer trends, growth, and payment states.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filters.period}
            onChange={handlePeriodChange}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold shadow-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>

          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-slate-600 dark:text-slate-400 hover:text-indigo-500"
            title="Refresh cache"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── ALERT STRIP ── */}
      {(outstandingCount > 0 || abandonmentRate > 20) && (
        <div className="flex flex-col md:flex-row gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>Outstanding bookings: {outstandingCount} customers owe cash payments.</span>
          </div>
          <span className="hidden md:inline text-slate-300">|</span>
          <div>
            <span>Booking abandonment rate is {abandonmentRate}% (older than 24h drafts).</span>
          </div>
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Card 1 */}
        <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 hover:scale-[1.03] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">New Customers</div>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users size={14} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-850 dark:text-white leading-none">
              {summary?.new_customers ?? 0}
            </div>
            <div className="text-[10px] font-extrabold text-indigo-500 mt-2">
              First bookings in range
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 hover:scale-[1.03] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Active Customers</div>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users size={14} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-850 dark:text-white leading-none">
              {summary?.active_customers ?? 0}
            </div>
            <div className="text-[10px] font-extrabold text-emerald-500 mt-2">
              Placed ≥1 booking
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 hover:scale-[1.03] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Repeat Rate</div>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <RefreshCw size={14} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-850 dark:text-white leading-none">
              {summary?.repeat_pct ?? 0}%
            </div>
            <div className="text-[10px] font-extrabold text-purple-500 mt-2">
              With ≥2 bookings
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 hover:scale-[1.03] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Bookings</div>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BarChart3 size={14} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-850 dark:text-white leading-none">
              {summary?.bookings_count ?? 0}
            </div>
            <div className="text-[10px] font-extrabold text-slate-500 mt-2">
              {deltas?.bookings_delta >= 0 ? `+${deltas?.bookings_delta}` : deltas?.bookings_delta} vs prior period
            </div>
          </div>
        </div>

        {/* Card 5 */}
        <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 hover:scale-[1.03] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Cancellation Rate</div>
            <span className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <AlertCircle size={14} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-850 dark:text-white leading-none">
              {summary?.cancellation_rate ?? 0}%
            </div>
            <div className="text-[10px] font-extrabold text-red-500 mt-2">
              {deltas?.cancellation_rate_delta >= 0 ? `+${deltas?.cancellation_rate_delta}%` : `${deltas?.cancellation_rate_delta}%`} shift
            </div>
          </div>
        </div>

        {/* Card 6 */}
        <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 hover:scale-[1.03] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Outstanding Rev.</div>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Banknote size={14} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-850 dark:text-white leading-none">
              ₹{(summary?.outstanding_revenue ?? 0).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] font-extrabold text-amber-500 mt-2">
              Expected COD / owes
            </div>
          </div>
        </div>
      </div>

      {/* ── CHARTS PANEL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Growth Trend */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-4">New Customers & Value Growth</h3>
          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">Loading growth chart...</div>
            ) : (
              <Line data={growthData} options={growthOptions} />
            )}
          </div>
        </div>

        {/* Category Mix */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Service Category Distribution</h3>
          <div className="h-64 flex justify-center">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">Loading pie chart...</div>
            ) : (
              <Doughnut data={categoryData} options={{ responsive: true, maintainAspectRatio: false }} />
            )}
          </div>
        </div>

        {/* Cancellation Reasons */}
        <div className="lg:col-span-3 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Cancellations by Reason (E.164 Cleaned)</h3>
          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">Loading cancellations chart...</div>
            ) : (
              <Bar data={cancelData} options={getChartOptions(isDark, true)} />
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
