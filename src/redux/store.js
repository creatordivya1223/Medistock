import { configureStore } from "@reduxjs/toolkit";
import mediReducer from "./slices/mediSlice.js";
import authReducer from "./slices/authSlice.js";

export const store = configureStore({
  reducer: {
    medicines: mediReducer,
    auth: authReducer,
  },
});