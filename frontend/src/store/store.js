import { configureStore } from "@reduxjs/toolkit"
import liveLocationReducer from "./liveLocationSlice.js"
import inventoryReducer from "./inventorySlice.js"
import trialReducer from "./trialSlice.js"
import customerAnalyticsReducer from "./customerAnalyticsSlice.js"

export const store = configureStore({
  reducer: {
    liveLocation: liveLocationReducer,
    inventory: inventoryReducer,
    trial: trialReducer,
    customerAnalytics: customerAnalyticsReducer,
  },
})
