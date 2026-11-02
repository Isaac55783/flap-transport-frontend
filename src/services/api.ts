
import axios from 'axios';
import { store } from '../store';

const BASE_URL = 'https://flap-transport.onrender.com';

// Replace this with your actual Render FRONTEND hostname.
// Do not use the backend hostname unless it is also your frontend.
const RENDER_FRONTEND_HOST = 'YOUR-RENDER-FRONTEND.onrender.com';

// Temporary OTP testing is enabled only on the deployed Render frontend.
const IS_RENDER_FRONTEND =
  typeof window !== 'undefined' &&
  window.location.hostname.toLowerCase() ===
    RENDER_FRONTEND_HOST.toLowerCase();

console.log('FLAP API BASE URL:', BASE_URL);
console.log('FLAP RENDER OTP TEST MODE:', IS_RENDER_FRONTEND);

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// =========================================================
// AUTH TOKEN
// =========================================================

apiClient.interceptors.request.use(
  (config) => {
    const state: any = store.getState();
    const token = state?.auth?.token;

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =========================================================
// ERROR LOGGING
// =========================================================

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(
      'API ERROR:',
      error?.response?.status,
      error?.response?.data || error?.message
    );

    return Promise.reject(error);
  }
);

// =========================================================
// API SERVICE
// =========================================================

const apiService = {
  // =======================================================
  // AUTHENTICATION
  // =======================================================

  login: async (phoneNumber: string, role: string) => {
    const response = await apiClient.post(
      '/api/auth/login',
      {
        phone_number: phoneNumber,
        role,
      },
      {
        headers: {
          // Only the deployed Render frontend requests
          // the temporary test OTP response.
          'X-Web-Test-Mode': IS_RENDER_FRONTEND ? 'true' : 'false',
        },
      }
    );

    return response.data;
  },

  verify: async (phoneNumber: string, otp: string, role: string) => {
    const response = await apiClient.post('/api/auth/verify', {
      phone_number: phoneNumber,
      otp_code: otp,
      role,
    });

    return response.data;
  },

  // Kept for compatibility with existing screens.
  // The actual backend verification endpoint is /verify.
  verifyOtp: async (phoneNumber: string, otp: string, role: string) => {
    const response = await apiClient.post('/api/auth/verify', {
      phone_number: phoneNumber,
      otp_code: otp,
      role,
    });

    return response.data;
  },

  // =======================================================
  // REGISTRATION
  // =======================================================

  registerPassenger: async (name: string, phoneNumber: string) => {
    const response = await apiClient.post('/api/registration/passenger', {
      name,
      phone_number: phoneNumber,
    });

    return response.data;
  },

  registerDriver: async (data: {
    name: string;
    phone_number: string;
    license_number: string;
    vehicle_model: string;
    vehicle_color?: string;
    plate_number: string;
    capacity?: number;
  }) => {
    const response = await apiClient.post('/api/registration/driver', data);
    return response.data;
  },

  // =======================================================
  // TRIPS
  // =======================================================

  startTrip: async (
    route_id: number,
    current_station_id?: number,
    available_seats: number = 15
  ) => {
    const response = await apiClient.post('/api/trips/start', {
      route_id,
      current_station_id,
      available_seats,
    });

    return response.data;
  },

  pauseTrip: async () => {
    const response = await apiClient.post('/api/trips/pause');
    return response.data;
  },

  resumeTrip: async () => {
    const response = await apiClient.post('/api/trips/resume');
    return response.data;
  },

  endTrip: async () => {
    const response = await apiClient.post('/api/trips/end');
    return response.data;
  },

  updateSeats: async (
    available_seats: number,
    occupancy?: 'empty' | 'half-full' | 'full'
  ) => {
    const response = await apiClient.post('/api/trips/update_seats', {
      available_seats,
      occupancy,
    });

    return response.data;
  },

  updateStatus: async (
    status:
      | 'online'
      | 'offline'
      | 'parked'
      | 'driving'
      | 'break'
      | 'emergency'
  ) => {
    const response = await apiClient.post('/api/trips/update_status', {
      status,
    });

    return response.data;
  },

  matchTroTros: async (
    current_lat: number,
    current_lng: number,
    dest_lat: number,
    dest_lng: number
  ) => {
    const response = await apiClient.post('/api/trips/match', {
      current_lat,
      current_lng,
      dest_lat,
      dest_lng,
    });

    return response.data;
  },

  // =======================================================
  // GPS
  // =======================================================

  logGps: async (payload: {
    driver_id: number;
    trip_id?: number | null;
    latitude: number;
    longitude: number;
    speed?: number;
    direction?: number;
  }) => {
    const response = await apiClient.post('/api/gps/log', {
      driver_id: payload.driver_id,
      trip_id: payload.trip_id ?? null,
      latitude: payload.latitude,
      longitude: payload.longitude,
      speed: payload.speed ?? 0,
      direction: payload.direction ?? 0,
    });

    return response.data;
  },

  getTripReplay: async (trip_id: number) => {
    const response = await apiClient.get(`/api/gps/replay/${trip_id}`);
    return response.data;
  },

  // =======================================================
  // ADMIN
  // =======================================================

  getAdminStats: async () => {
    const response = await apiClient.get('/api/admin/stats');
    return response.data;
  },

  getPendingDrivers: async () => {
    const response = await apiClient.get('/api/admin/drivers/pending');
    return response.data;
  },

  getReports: async () => {
    const response = await apiClient.get('/api/reports');
    return response.data;
  },

  verifyDriver: async (driverId: number, status: 'verified' | 'rejected') => {
    const response = await apiClient.put(
      `/api/admin/drivers/${driverId}/verify`,
      { status }
    );

    return response.data;
  },

  banUser: async (userId: number, status: 'active' | 'banned') => {
    const response = await apiClient.put(
      `/api/admin/users/${userId}/ban`,
      { status }
    );

    return response.data;
  },

  broadcastAnnouncement: async (title: string, message: string) => {
    const response = await apiClient.post('/api/admin/broadcast', {
      title,
      message,
    });

    return response.data;
  },

  // =======================================================
  // GENERIC REQUEST HELPERS
  // =======================================================

  get: async (url: string, config?: any) => {
    const response = await apiClient.get(url, config);
    return response.data;
  },

  post: async (url: string, data?: any, config?: any) => {
    const response = await apiClient.post(url, data, config);
    return response.data;
  },

  put: async (url: string, data?: any, config?: any) => {
    const response = await apiClient.put(url, data, config);
    return response.data;
  },

  delete: async (url: string, config?: any) => {
    const response = await apiClient.delete(url, config);
    return response.data;
  },
};

export { apiService };
export default apiService;
