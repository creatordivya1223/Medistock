import { configureStore } from "@reduxjs/toolkit";
import mediReducer from "./slices/mediSlice.js";

export const store = configureStore({
  reducer: {
    medicines: mediReducer,
  },
});