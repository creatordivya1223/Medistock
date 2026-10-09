import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/client';

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data.data;
      localStorage.setItem('token', token);
      return { token, user };
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        'Login failed. Please check your credentials.';
      return rejectWithValue(message);
    }
  }
);

export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me');
      return response.data.data.user;
    } catch (err) {
      localStorage.removeItem('token');
      return rejectWithValue(err.response?.data?.message || 'Session expired');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('token');
  return null;
});

const tokenFromStorage = localStorage.getItem('token');

const initialState = {
  token: tokenFromStorage || null,
  user: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  initialLoading: Boolean(tokenFromStorage),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
        state.initialLoading = false;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.initialLoading = false;
      })
      // fetchMe
      .addCase(fetchMe.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.initialLoading = false;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.status = 'failed';
        state.token = null;
        state.user = null;
        state.initialLoading = false;
      })
      // logout
      .addCase(logout.fulfilled, (state) => {
        state.token = null;
        state.user = null;
        state.status = 'idle';
        state.error = null;
        state.initialLoading = false;
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
