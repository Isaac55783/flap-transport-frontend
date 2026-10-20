import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type User = {
  id: number;
  name: string;
  phone_number: string;
  role: string;
  status: string;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

type PassengerProfile = {
  user_id: number;
  rating?: number;
  home_lat?: number | null;
  home_lng?: number | null;
  work_lat?: number | null;
  work_lng?: number | null;
  created_at?: string;
};

type DriverProfile = {
  user_id: number;
  license_number?: string;
  current_status?: string;
  vehicle?: any;
  created_at?: string;
};

interface AuthState {
  token: string | null;
  user: User | null;
  passengerProfile: PassengerProfile | null;
  driverProfile: DriverProfile | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  token: null,
  user: null,
  passengerProfile: null,
  driverProfile: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',

  initialState,

  reducers: {
    setAuth: (
      state,
      action: PayloadAction<{
        token: string;
        user: User;
        profile?: any;
      }>
    ) => {
      state.token = action.payload.token;

      // IMPORTANT:
      // Save the actual user returned by the backend.
      // This contains the real name entered during registration.
      state.user = action.payload.user;

      state.isAuthenticated = true;

      if (action.payload.user.role === 'driver') {
        state.driverProfile =
          action.payload.profile || null;

        state.passengerProfile = null;
      }

      if (action.payload.user.role === 'passenger') {
        state.passengerProfile =
          action.payload.profile || null;

        state.driverProfile = null;
      }
    },

    setUser: (
      state,
      action: PayloadAction<User>
    ) => {
      state.user = action.payload;
    },

    setToken: (
      state,
      action: PayloadAction<string>
    ) => {
      state.token = action.payload;
      state.isAuthenticated = true;
    },

    updateDriverStatus: (
      state,
      action: PayloadAction<string>
    ) => {
      if (state.driverProfile) {
        state.driverProfile.current_status =
          action.payload;
      }
    },

    logout: (state) => {
      state.token = null;
      state.user = null;
      state.passengerProfile = null;
      state.driverProfile = null;
      state.isAuthenticated = false;
    },
  },
});

export const {
  setAuth,
  setUser,
  setToken,
  updateDriverStatus,
  logout,
} = authSlice.actions;

export default authSlice.reducer;