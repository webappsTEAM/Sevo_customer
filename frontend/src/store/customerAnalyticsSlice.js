import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { apiRequest } from "../api/client.js"

// Helper to convert filters object to query params string
const buildQueryParams = (filters) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      if (Array.isArray(val)) {
        val.forEach(v => params.append(`${key}[]`, v))
      } else {
        params.append(key, val)
      }
    }
  })
  return params.toString()
}

export const fetchCustomers = createAsyncThunk(
  "customerAnalytics/fetchCustomers",
  async (filters, { rejectWithValue }) => {
    try {
      const qp = buildQueryParams(filters)
      const res = await apiRequest(`/customers/?${qp}`)
      if (res?.success) {
        return res.data
      }
      return rejectWithValue(res?.message || "Failed to fetch customers")
    } catch (err) {
      return rejectWithValue(err.message || "Network Error")
    }
  }
)

export const fetchCustomerDetail = createAsyncThunk(
  "customerAnalytics/fetchCustomerDetail",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiRequest(`/customers/${id}/`)
      if (res?.success) {
        return { id, data: res.data }
      }
      return rejectWithValue(res?.message || "Failed to fetch customer detail")
    } catch (err) {
      return rejectWithValue(err.message || "Network Error")
    }
  }
)

export const fetchCustomerTimeline = createAsyncThunk(
  "customerAnalytics/fetchCustomerTimeline",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiRequest(`/customers/${id}/timeline/`)
      if (res?.success) {
        return { id, timeline: res.data }
      }
      return rejectWithValue(res?.message || "Failed to fetch timeline")
    } catch (err) {
      return rejectWithValue(err.message || "Network Error")
    }
  }
)

export const fetchCustomerAnalytics = createAsyncThunk(
  "customerAnalytics/fetchCustomerAnalytics",
  async (filters, { rejectWithValue }) => {
    try {
      const qp = buildQueryParams(filters)
      const res = await apiRequest(`/customers/analytics/?${qp}`)
      if (res?.success) {
        return res.data
      }
      return rejectWithValue(res?.message || "Failed to fetch analytics")
    } catch (err) {
      return rejectWithValue(err.message || "Network Error")
    }
  }
)

export const fetchCustomerPayments = createAsyncThunk(
  "customerAnalytics/fetchCustomerPayments",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiRequest("/customers/payments/")
      if (res?.success) {
        return res.data
      }
      return rejectWithValue(res?.message || "Failed to fetch payments worklist")
    } catch (err) {
      return rejectWithValue(err.message || "Network Error")
    }
  }
)

export const fetchMergeCandidates = createAsyncThunk(
  "customerAnalytics/fetchMergeCandidates",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiRequest("/customers/merges/")
      if (res?.success) {
        return res.data
      }
      return rejectWithValue(res?.message || "Failed to fetch merge candidates")
    } catch (err) {
      return rejectWithValue(err.message || "Network Error")
    }
  }
)

const initialState = {
  filters: {
    q: "",
    period: "month",
    from: "",
    to: "",
    granularity: "day",
    status: [],
    payment_state: "",
    churn_risk: "",
    is_repeat: "",
    sort: "-last_booking_at",
    page: 1,
    page_size: 25,
  },
  list: {
    results: [],
    count: 0,
    currentPage: 1,
    numPages: 1,
    loading: false,
    error: null,
  },
  detailCache: {}, // keyed by id: { profile, addresses, rollups, recent_bookings, timeline, etc. }
  analytics: {
    summary: {},
    deltas: {},
    growthSeries: {},
    cancellationReasons: {},
    categoryMix: {},
    abandonmentRate: 0,
    outstandingCount: 0,
    loading: false,
    error: null,
  },
  payments: {
    owes: [],
    technicianHolds: [],
    settled: [],
    loading: false,
    error: null,
  },
  merges: {
    candidates: [],
    loading: false,
    error: null,
  }
}

const customerAnalyticsSlice = createSlice({
  name: "customerAnalytics",
  initialState,
  reducers: {
    updateFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload }
    },
    resetFilters(state) {
      state.filters = initialState.filters
    },
    clearDetailCache(state) {
      state.detailCache = {}
    }
  },
  extraReducers: (builder) => {
    builder
      // Customers List
      .addCase(fetchCustomers.pending, (state) => {
        state.list.loading = true
        state.list.error = null
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.list.loading = false
        state.list.results = action.payload.results
        state.list.count = action.payload.count
        state.list.currentPage = action.payload.current_page
        state.list.numPages = action.payload.num_pages
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.list.loading = false
        state.list.error = action.payload
      })

      // Customer Detail 360
      .addCase(fetchCustomerDetail.fulfilled, (state, action) => {
        const { id, data } = action.payload
        if (!state.detailCache[id]) {
          state.detailCache[id] = {}
        }
        state.detailCache[id] = { ...state.detailCache[id], ...data }
      })

      // Customer Timeline
      .addCase(fetchCustomerTimeline.fulfilled, (state, action) => {
        const { id, timeline } = action.payload
        if (!state.detailCache[id]) {
          state.detailCache[id] = {}
        }
        state.detailCache[id].timeline = timeline
      })

      // Analytics Dashboard
      .addCase(fetchCustomerAnalytics.pending, (state) => {
        state.analytics.loading = true
        state.analytics.error = null
      })
      .addCase(fetchCustomerAnalytics.fulfilled, (state, action) => {
        state.analytics.loading = false
        state.analytics.summary = action.payload.summary
        state.analytics.deltas = action.payload.deltas
        state.analytics.growthSeries = action.payload.growth_series
        state.analytics.cancellationReasons = action.payload.cancellation_reasons
        state.analytics.categoryMix = action.payload.category_mix
        state.analytics.abandonmentRate = action.payload.abandonment_rate
        state.analytics.outstandingCount = action.payload.outstanding_count
      })
      .addCase(fetchCustomerAnalytics.rejected, (state, action) => {
        state.analytics.loading = false
        state.analytics.error = action.payload
      })

      // Payments Worklist
      .addCase(fetchCustomerPayments.pending, (state) => {
        state.payments.loading = true
        state.payments.error = null
      })
      .addCase(fetchCustomerPayments.fulfilled, (state, action) => {
        state.payments.loading = false
        state.payments.owes = action.payload.owes
        state.payments.technicianHolds = action.payload.technician_holds
        state.payments.settled = action.payload.settled
      })
      .addCase(fetchCustomerPayments.rejected, (state, action) => {
        state.payments.loading = false
        state.payments.error = action.payload
      })

      // Merge Review Queue
      .addCase(fetchMergeCandidates.pending, (state) => {
        state.merges.loading = true
        state.merges.error = null
      })
      .addCase(fetchMergeCandidates.fulfilled, (state, action) => {
        state.merges.loading = false
        state.merges.candidates = action.payload
      })
      .addCase(fetchMergeCandidates.rejected, (state, action) => {
        state.merges.loading = false
        state.merges.error = action.payload
      })
  }
})

export const { updateFilters, resetFilters, clearDetailCache } = customerAnalyticsSlice.actions
export default customerAnalyticsSlice.reducer
