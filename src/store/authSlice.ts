import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserProfile {
  id: number;
  phone_number: string;
  name: string;
  role: 'passenger' | 'driver' | 'admin';
  status: 'active' | 'banned';
  avatar_url?: string;
  created_at: string;
}

export interface DriverProfile {
  user_id: number;
  license_number: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  current_status: 'online' | 'offline' | 'parked' | 'driving' | 'break' | 'emergency';
  active_trip_id?: number;
  rating: number;
  vehicle?: {
    id: number;
    plate_number: string;
    model: string;
    color: string;
    capacity: number;
  };
}

export interface PassengerProfile {
  user_id: number;
  home_lat?: number;
  home_lng?: number;
  work_lat?: number;
  work_lng?: number;
  rating: number;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: UserProfile | null;
  driverProfile: DriverProfile | null;
  passengerProfile: PassengerProfile | null;
  selectedRole: 'passenger' | 'driver' | 'admin' | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  token: null,
  user: null,
  driverProfile: null,
  passengerProfile: null,
  selectedRole: null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    startAuth: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    authSuccess: (state, action: PayloadAction<{ token: string; user: UserProfile; profile: any }>) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.selectedRole = action.payload.user.role;
      state.isLoading = false;
      state.error = null;

      if (action.payload.user.role === 'driver') {
        state.driverProfile = action.payload.profile;
      } else if (action.payload.user.role === 'passenger') {
        state.passengerProfile = action.payload.profile;
      }
    },
    authFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateDriverStatus: (state, action: PayloadAction<DriverProfile['current_status']>) => {
      if (state.driverProfile) {
        state.driverProfile.current_status = action.payload;
      }
    },
    setRole: (state, action: PayloadAction<'passenger' | 'driver' | 'admin'>) => {
      state.selectedRole = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.driverProfile = null;
      state.passengerProfile = null;
      state.selectedRole = null;
      state.error = null;
    }
  }
});

export const { startAuth, authSuccess, authFailure, updateDriverStatus, setRole, logout } = authSlice.actions;
export default authSlice.reducer;
