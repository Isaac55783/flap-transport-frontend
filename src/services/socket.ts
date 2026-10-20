
import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { updateLiveLocation } from '../store/tripSlice';

// Your deployed Render backend
const SOCKET_URL = 'https://flap-transport.onrender.com';

class SocketService {
  private socket: Socket | null = null;
  private connectingPromise: Promise<void> | null = null;

  /**
   * Connect to the deployed Socket.IO server.
   */
  connect(): Promise<void> {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = new Promise<void>((resolve, reject) => {
      try {
        if (!this.socket) {
          this.socket = io(SOCKET_URL, {
            // Start with polling and upgrade to WebSocket if supported.
            transports: ['polling', 'websocket'],
            upgrade: true,
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
          });

          this.socket.on('connect', () => {
            console.log(
              'Socket connected successfully:',
              this.socket?.id
            );

            this.connectingPromise = null;
            resolve();
          });

          this.socket.on('connect_error', (error) => {
            console.error(
              'Socket connection error:',
              error.message
            );

            this.connectingPromise = null;
            reject(error);
          });

          this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
          });

          this.socket.on('error', (error) => {
            console.error('Socket server error:', error);
          });

          // Receive location updates for active trips.
          this.socket.on('location_update', (data: any) => {
            console.log('Received trip location update:', data);

            store.dispatch(
              updateLiveLocation({
                driver_id: data.driver_id,
                latitude: data.latitude,
                longitude: data.longitude,
                speed: data.speed,
                direction: data.direction,
              })
            );
          });

          // Receive general driver location updates.
          this.socket.on(
            'general_location_update',
            (data: any) => {
              console.log(
                'Received general driver location:',
                data
              );

              store.dispatch(
                updateLiveLocation({
                  driver_id: data.driver_id,
                  latitude: data.latitude,
                  longitude: data.longitude,
                  speed: data.speed,
                  direction: data.direction,
                })
              );
            }
          );
        }

        // Connect or reconnect the existing socket.
        this.socket.connect();

        // Handle an already-established connection.
        if (this.socket.connected) {
          this.connectingPromise = null;
          resolve();
        }
      } catch (error) {
        this.connectingPromise = null;
        reject(error);
      }
    });

    return this.connectingPromise;
  }

  /**
   * Disconnect from Socket.IO.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectingPromise = null;
  }

  /**
   * Check whether Socket.IO is connected.
   */
  isConnected(): boolean {
    return !!this.socket?.connected;
  }

  /**
   * Subscribe to a specific trip.
   */
  subscribeToTrip(tripId: number): void {
    if (!this.socket?.connected) {
      console.warn(
        'Cannot subscribe to trip: socket is not connected'
      );
      return;
    }

    this.socket.emit('join_trip', {
      trip_id: tripId,
    });
  }

  /**
   * Leave a specific trip.
   */
  unsubscribeFromTrip(tripId: number): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('leave_trip', {
      trip_id: tripId,
    });
  }

  /**
   * Subscribe to a route.
   */
  subscribeToRoute(routeId: number): void {
    if (!this.socket?.connected) {
      console.warn(
        'Cannot subscribe to route: socket is not connected'
      );
      return;
    }

    this.socket.emit('join_route', {
      route_id: routeId,
    });
  }

  /**
   * Leave a route.
   */
  unsubscribeFromRoute(routeId: number): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('leave_route', {
      route_id: routeId,
    });
  }

  /**
   * Broadcast a driver's GPS location.
   */
  async emitLocation(payload: {
    driver_id: number;
    trip_id?: number | null;
    latitude: number;
    longitude: number;
    speed: number;
    direction: number;
    status:
      | 'online'
      | 'offline'
      | 'parked'
      | 'driving'
      | 'break'
      | 'emergency';
    available_seats: number;
    occupancy: 'empty' | 'half-full' | 'full';
  }): Promise<boolean> {
    try {
      await this.connect();

      if (!this.socket?.connected) {
        console.error(
          'Cannot broadcast location: socket is disconnected'
        );
        return false;
      }

      this.socket.emit('driver_location_update', payload);

      console.log('Driver location broadcast:', {
        driver_id: payload.driver_id,
        trip_id: payload.trip_id,
        latitude: payload.latitude,
        longitude: payload.longitude,
      });

      return true;
    } catch (error) {
      console.error(
        'Failed to broadcast driver location:',
        error
      );

      return false;
    }
  }
}

const socketService = new SocketService();

export { socketService };
export default socketService;
