import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../api/client.js';

export const fetchInventoryItems = createAsyncThunk(
  'inventory/fetchItems',
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiRequest('/inventory/items/');
      if (!data.success) throw new Error(data.message);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.message || err);
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
      return rejectWithValue(err.message || err);
    }
  }
);

const initialState = {
  items: [],
  alerts: [],
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
      });
  }
});

export const { clearInventoryState } = inventorySlice.actions;
export default inventorySlice.reducer;
