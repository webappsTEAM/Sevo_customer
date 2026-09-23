import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../api/client.js';

function formatErrMsg(err) {
  if (!err) return "An unexpected error occurred.";
  if (typeof err === "string") return err;
  if (err.message) return err.message;
  if (err.body) {
    if (typeof err.body === "string") return err.body;
    if (err.body.message) return err.body.message;
    if (err.body.detail) return err.body.detail;
    return JSON.stringify(err.body);
  }
  return String(err);
}

export const fetchInventoryItems = createAsyncThunk(
  'inventory/fetchItems',
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiRequest('/inventory/items/');
      if (!data.success) throw new Error(data.message);
      return data.data;
    } catch (err) {
      return rejectWithValue(formatErrMsg(err));
    }
  }
);

export const fetchAlerts = createAsyncThunk(
  'inventory/fetchAlerts',
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiRequest('/inventory/alerts/');
      if (!data.success) throw new Error(data.message);
      return data.data;
    } catch (err) {
      return rejectWithValue(formatErrMsg(err));
    }
  }
);

export const fetchVegetableStock = createAsyncThunk(
  'inventory/fetchVegetableStock',
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiRequest('/inventory/vegetable-stock/');
      if (!data.success) throw new Error(data.message);
      return data.data;
    } catch (err) {
      return rejectWithValue(formatErrMsg(err));
    }
  }
);

export const restockVegetable = createAsyncThunk(
  'inventory/restockVegetable',
  async ({ productId, quantity, unit }, { rejectWithValue }) => {
    try {
      const data = await apiRequest(`/inventory/vegetable-stock/${productId}/restock/`, {
        method: 'POST',
        json: { quantity, unit },
      });
      if (!data.success) throw new Error(data.message);
      return { productId, ...data.data };
    } catch (err) {
      return rejectWithValue(formatErrMsg(err));
    }
  }
);

export const adjustVegetableStock = createAsyncThunk(
  'inventory/adjustVegetableStock',
  async ({ productId, quantity, unit, reason }, { rejectWithValue }) => {
    try {
      const data = await apiRequest(`/inventory/vegetable-stock/${productId}/adjust/`, {
        method: 'POST',
        json: { quantity, unit, reason },
      });
      if (!data.success) throw new Error(data.message);
      return { productId, ...data.data };
    } catch (err) {
      return rejectWithValue(formatErrMsg(err));
    }
  }
);

export const setDefaultDailyStock = createAsyncThunk(
  'inventory/setDefaultDailyStock',
  async ({ productId, quantity, unit, applyNow }, { rejectWithValue }) => {
    try {
      const data = await apiRequest(`/inventory/vegetable-stock/${productId}/set-default/`, {
        method: 'POST',
        json: { quantity, unit, apply_now: applyNow },
      });
      if (!data.success) throw new Error(data.message);
      return { productId, ...data.data };
    } catch (err) {
      return rejectWithValue(formatErrMsg(err));
    }
  }
);

export const fetchVegetableStockHistory = createAsyncThunk(
  'inventory/fetchVegetableStockHistory',
  async ({ productId, startDate, endDate }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const data = await apiRequest(`/inventory/vegetable-stock/${productId}/history/?${params.toString()}`);
      if (!data.success) throw new Error(data.message);
      return { productId, history: data.data };
    } catch (err) {
      return rejectWithValue(formatErrMsg(err));
    }
  }
);

export const updateVegetableDetails = createAsyncThunk(
  'inventory/updateVegetableDetails',
  async ({ productId, data }, { rejectWithValue }) => {
    try {
      const res = await apiRequest(`/inventory/vegetable-stock/${productId}/update-details/`, {
        method: 'PATCH',
        json: data,
      });
      if (!res.success) throw new Error(res.message);
      return { productId, ...res.data };
    } catch (err) {
      return rejectWithValue(formatErrMsg(err));
    }
  }
);

const initialState = {
  items: [],
  alerts: [],
  vegetables: [],
  historyByProduct: {},
  loading: false,
  error: null,
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    clearInventoryState: (state) => {
      state.items = [];
      state.alerts = [];
      state.vegetables = [];
      state.historyByProduct = {};
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventoryItems.pending, (state) => { state.loading = true; })
      .addCase(fetchInventoryItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchInventoryItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAlerts.pending, (state) => { state.loading = true; })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.alerts = action.payload;
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Vegetable Stock
      .addCase(fetchVegetableStock.pending, (state) => { state.loading = true; })
      .addCase(fetchVegetableStock.fulfilled, (state, action) => {
        state.loading = false;
        state.vegetables = action.payload;
      })
      .addCase(fetchVegetableStock.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(restockVegetable.fulfilled, (state, action) => {
        const { productId, state: vegState, today_available_grams, default_daily_grams, today_available_display, default_daily_display, unit } = action.payload;
        const veg = state.vegetables.find(v => v.product_id === productId);
        if (veg) {
          veg.state = vegState;
          veg.today_available_grams = today_available_grams;
          veg.default_daily_grams = default_daily_grams;
          veg.today_available_display = today_available_display;
          veg.default_daily_display = default_daily_display;
          if (unit) veg.unit = unit;
        }
      })
      .addCase(adjustVegetableStock.fulfilled, (state, action) => {
        const { productId, state: vegState, today_available_grams, default_daily_grams, today_available_display, default_daily_display, unit } = action.payload;
        const veg = state.vegetables.find(v => v.product_id === productId);
        if (veg) {
          veg.state = vegState;
          veg.today_available_grams = today_available_grams;
          veg.default_daily_grams = default_daily_grams;
          veg.today_available_display = today_available_display;
          veg.default_daily_display = default_daily_display;
          if (unit) veg.unit = unit;
        }
      })
      .addCase(setDefaultDailyStock.fulfilled, (state, action) => {
        const { productId, state: vegState, today_available_grams, default_daily_grams, today_available_display, default_daily_display, unit } = action.payload;
        const veg = state.vegetables.find(v => v.product_id === productId);
        if (veg) {
          veg.state = vegState;
          veg.today_available_grams = today_available_grams;
          veg.default_daily_grams = default_daily_grams;
          veg.today_available_display = today_available_display;
          veg.default_daily_display = default_daily_display;
          if (unit) veg.unit = unit;
        }
      })
      .addCase(updateVegetableDetails.fulfilled, (state, action) => {
        const payload = action.payload;
        const veg = state.vegetables.find(v => v.product_id === payload.productId);
        if (veg) {
          Object.assign(veg, payload);
        }
      })
      .addCase(fetchVegetableStockHistory.fulfilled, (state, action) => {
        const { productId, history } = action.payload;
        state.historyByProduct[productId] = history;
      });
  }
});

export const { clearInventoryState } = inventorySlice.actions;
export default inventorySlice.reducer;


