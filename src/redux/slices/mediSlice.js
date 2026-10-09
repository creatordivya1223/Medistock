import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/client";

export const fetchMedicines = createAsyncThunk(
  "medicines/fetchMedicines",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/medicines", { params });
      return {
        medicines: response.data.data,
        pagination: response.data.pagination,
      };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to fetch medicines";
      return rejectWithValue(message);
    }
  }
);

export const addMedicine = createAsyncThunk(
  "medicines/addMedicine",
  async (medicineData, { rejectWithValue }) => {
    try {
      const response = await api.post("/medicines", medicineData);
      return response.data.data;
    } catch (err) {
      const message =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        "Failed to add medicine";
      return rejectWithValue(message);
    }
  }
);

export const editMedicine = createAsyncThunk(
  "medicines/editMedicine",
  async ({ id, ...updateData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/medicines/${id}`, updateData);
      return response.data.data;
    } catch (err) {
      const message =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        "Failed to update medicine";
      return rejectWithValue(message);
    }
  }
);

export const deleteMedicine = createAsyncThunk(
  "medicines/deleteMedicine",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/medicines/${id}`);
      return id;
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to delete medicine";
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  medicines: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
  loading: false,
  error: null,
};

const mediSlice = createSlice({
  name: "medicines",
  initialState,
  reducers: {
    clearMediError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchMedicines
      .addCase(fetchMedicines.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMedicines.fulfilled, (state, action) => {
        state.loading = false;
        state.medicines = action.payload.medicines;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchMedicines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // addMedicine
      .addCase(addMedicine.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addMedicine.fulfilled, (state, action) => {
        state.loading = false;
        state.medicines.unshift(action.payload);
        if (state.pagination) {
          state.pagination.total += 1;
        }
      })
      .addCase(addMedicine.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // editMedicine
      .addCase(editMedicine.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editMedicine.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;
        const index = state.medicines.findIndex(
          (m) => (m.id || m._id) === (updated.id || updated._id)
        );
        if (index !== -1) {
          state.medicines[index] = updated;
        }
      })
      .addCase(editMedicine.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // deleteMedicine
      .addCase(deleteMedicine.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMedicine.fulfilled, (state, action) => {
        state.loading = false;
        state.medicines = state.medicines.filter(
          (m) => (m.id || m._id) !== action.payload
        );
        if (state.pagination && state.pagination.total > 0) {
          state.pagination.total -= 1;
        }
      })
      .addCase(deleteMedicine.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearMediError } = mediSlice.actions;
export default mediSlice.reducer;