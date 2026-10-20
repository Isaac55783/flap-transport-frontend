import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Station {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  waiting_vehicles_count?: number;
  estimated_departure_time?: string;
  queue_length?: number;
  available_seats?: number;
  routes_available?: any[];
}

export interface Route {
  id: number;
  name: string;
  origin_station_id: number;
  destination_station_id: number;
  origin_station_name: string;
  destination_station_name: string;
  path_polyline: string;
}

export interface MatchedTroTro {
  trip: {
    id: number;
    driver_id: number;
    route_id: number;
    route_name: string;
    status: 'scheduled' | 'active' | 'paused' | 'ended';
    available_seats: number;
    occupancy: 'empty' | 'half-full' | 'full';
  };
  driver: {
    id: number;
    name: string;
    phone_number: string;
    avatar_url?: string;
    rating: number;
    status: string;
  };
  vehicle: {
    plate_number: string;
    model: string;
    color: string;
    capacity: number;
  };
  distance_km: number;
  eta_minutes: number;
  best_pickup_station: string;
  best_pickup_lat: number;
  best_pickup_lng: number;
}

interface TripState {
  stations: Station[];
  routes: Route[];
  matches: MatchedTroTro[];
  selectedVehicle: MatchedTroTro | null;
  activeTrip: any | null; // For driver active trip
  recentSearches: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TripState = {
  stations: [],
  routes: [],
  matches: [],
  selectedVehicle: null,
  activeTrip: null,
  recentSearches: [],
  isLoading: false,
  error: null,
};

const tripSlice = createSlice({
  name: 'trips',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setStations: (state, action: PayloadAction<Station[]>) => {
      state.stations = action.payload;
    },
    setRoutes: (state, action: PayloadAction<Route[]>) => {
      state.routes = action.payload;
    },
    setMatches: (state, action: PayloadAction<MatchedTroTro[]>) => {
      state.matches = action.payload;
    },
    setSelectedVehicle: (state, action: PayloadAction<MatchedTroTro | null>) => {
      state.selectedVehicle = action.payload;
    },
    updateLiveLocation: (state, action: PayloadAction<{ driver_id: number; latitude: number; longitude: number; speed?: number; direction?: number }>) => {
      // If the selected vehicle is receiving live updates, update its coordinates
      if (state.selectedVehicle && state.selectedVehicle.driver.id === action.payload.driver_id) {
        state.selectedVehicle = {
          ...state.selectedVehicle,
          // Let's store coords on a separate path or update eta/distance
          distance_km: state.selectedVehicle.distance_km, // hypothetically recalced
        };
      }
      
      // Update any matching vehicle position
      state.matches = state.matches.map(m => {
        if (m.driver.id === action.payload.driver_id) {
          return {
            ...m,
            // Simply tag updated info
          };
        }
        return m;
      });
    },
    setActiveTrip: (state, action: PayloadAction<any | null>) => {
      state.activeTrip = action.payload;
    },
    addRecentSearch: (state, action: PayloadAction<string>) => {
      if (!state.recentSearches.includes(action.payload)) {
        state.recentSearches = [action.payload, ...state.recentSearches.slice(0, 4)];
      }
    },
    setTripsError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  }
});

export const {
  setLoading,
  setStations,
  setRoutes,
  setMatches,
  setSelectedVehicle,
  updateLiveLocation,
  setActiveTrip,
  addRecentSearch,
  setTripsError
} = tripSlice.actions;

export default tripSlice.reducer;
