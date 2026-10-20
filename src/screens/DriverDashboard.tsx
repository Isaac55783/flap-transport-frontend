import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useSelector } from 'react-redux';

import DriverMap from '../components/DriverMap';
import apiService from '../services/api';
import socketService from '../services/socket';

import {
  RootState,
  useAppDispatch,
} from '../store';

import { updateDriverStatus } from '../store/authSlice';
import { setActiveTrip } from '../store/tripSlice';


type LocationPoint = {
  latitude: number;
  longitude: number;
  address: string;
};


const NOMINATIM_URL =
  'https://nominatim.openstreetmap.org/search';


const DriverDashboard = ({ navigation }: any) => {
  const dispatch = useAppDispatch();

  const user = useSelector(
    (state: RootState) => state.auth.user
  );

  const driverProfile = useSelector(
    (state: RootState) =>
      (state.auth as any).driverProfile
  );

  const activeTrip = useSelector(
    (state: RootState) =>
      (state.auth as any).activeTrip
  );

  const [setOffQuery, setSetOffQuery] =
    useState('');

  const [destinationQuery, setDestinationQuery] =
    useState('');

  const [departurePoint, setDeparturePoint] =
    useState<LocationPoint | null>(null);

  const [destinationPoint, setDestinationPoint] =
    useState<LocationPoint | null>(null);

  const [driverLocation, setDriverLocation] =
    useState<{
      latitude: number;
      longitude: number;
    } | null>(null);

  const [setOffResults, setSetOffResults] =
    useState<LocationPoint[]>([]);

  const [destinationResults, setDestinationResults] =
    useState<LocationPoint[]>([]);

  const [selectedRouteId, setSelectedRouteId] =
    useState<number | null>(null);

  const [selectedStationId, setSelectedStationId] =
    useState<number | null>(null);

  const [availableSeats, setAvailableSeats] =
    useState(15);

  const [occupancy, setOccupancy] =
    useState<'empty' | 'half-full' | 'full'>(
      'empty'
    );

  const [isSearchingSetOff, setIsSearchingSetOff] =
    useState(false);

  const [
    isSearchingDestination,
    setIsSearchingDestination,
  ] = useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isBroadcasting, setIsBroadcasting] =
    useState(false);

  const [tripPaused, setTripPaused] =
    useState(false);

  const gpsIntervalRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const departurePointRef =
    useRef<LocationPoint | null>(null);

  const destinationPointRef =
    useRef<LocationPoint | null>(null);

  const selectedRouteIdRef =
    useRef<number | null>(null);

  const selectedStationIdRef =
    useRef<number | null>(null);

  const availableSeatsRef =
    useRef(availableSeats);

  const occupancyRef =
    useRef(occupancy);

  /*
   * Small animated search icon used beside the
   * Set-Off and Final Destination fields.
   */
  const searchPulse = useRef(
    new Animated.Value(1)
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(searchPulse, {
          toValue: 1.12,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(searchPulse, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [searchPulse]);


  /*
   * Keep refs synchronized with the latest state.
   */
  useEffect(() => {
    departurePointRef.current =
      departurePoint;
  }, [departurePoint]);

  useEffect(() => {
    destinationPointRef.current =
      destinationPoint;
  }, [destinationPoint]);

  useEffect(() => {
    selectedRouteIdRef.current =
      selectedRouteId;
  }, [selectedRouteId]);

  useEffect(() => {
    selectedStationIdRef.current =
      selectedStationId;
  }, [selectedStationId]);

  useEffect(() => {
    availableSeatsRef.current =
      availableSeats;
  }, [availableSeats]);

  useEffect(() => {
    occupancyRef.current =
      occupancy;
  }, [occupancy]);


  /*
   * Connect to Socket.IO when the dashboard opens.
   */
  useEffect(() => {
    socketService
      .connect()
      .then(() => {
        console.log(
          'Driver Dashboard Socket.IO connected'
        );
      })
      .catch((error) => {
        console.error(
          'Driver Dashboard Socket.IO connection failed:',
          error
        );
      });

    return () => {
      if (gpsIntervalRef.current) {
        clearInterval(
          gpsIntervalRef.current
        );

        gpsIntervalRef.current = null;
      }
    };
  }, []);


  /*
   * Search Ghana locations using Nominatim.
   */
  const searchLocation = async (
    query: string,
    type: 'setoff' | 'destination'
  ) => {
    if (!query.trim()) {
      if (type === 'setoff') {
        setSetOffResults([]);
      } else {
        setDestinationResults([]);
      }

      return;
    }

    if (type === 'setoff') {
      setIsSearchingSetOff(true);
    } else {
      setIsSearchingDestination(true);
    }

    try {
      const url =
        `${NOMINATIM_URL}?format=jsonv2` +
        `&q=${encodeURIComponent(query + ', Ghana')}` +
        `&countrycodes=gh` +
        `&limit=5`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'FLAP-Transport-Ghana/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Location search failed: ${response.status}`
        );
      }

      const data = await response.json();

      const results: LocationPoint[] =
        data.map((item: any) => ({
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          address:
            item.display_name ||
            item.name ||
            query,
        }));

      if (type === 'setoff') {
        setSetOffResults(results);
      } else {
        setDestinationResults(results);
      }
    } catch (error) {
      console.error(
        'Location search error:',
        error
      );

      Alert.alert(
        'Search Error',
        'Unable to search for this location. Please try again.'
      );
    } finally {
      if (type === 'setoff') {
        setIsSearchingSetOff(false);
      } else {
        setIsSearchingDestination(false);
      }
    }
  };


  /*
   * Select Set-Off point.
   */
  const selectSetOffPoint = (
    location: LocationPoint
  ) => {
    setDeparturePoint(location);
    departurePointRef.current = location;

    setSetOffQuery(location.address);
    setSetOffResults([]);

    /*
     * Initialize the TroTro position at the
     * selected set-off point.
     */
    setDriverLocation({
      latitude: location.latitude,
      longitude: location.longitude,
    });

    console.log(
      'Driver set-off point selected:',
      location
    );
  };


  /*
   * Select final destination.
   */
  const selectDestinationPoint = (
    location: LocationPoint
  ) => {
    setDestinationPoint(location);
    destinationPointRef.current =
      location;

    setDestinationQuery(location.address);
    setDestinationResults([]);

    console.log(
      'Driver destination selected:',
      location
    );
  };


  /*
   * Find a route connecting the selected
   * driver set-off and destination.
   *
   * The existing backend route system is used
   * for the trip record.
   */
  const handleSetRoute = async () => {
    if (!departurePoint) {
      Alert.alert(
        'Set-Off Point Required',
        'Please select your set-off point first.'
      );

      return;
    }

    if (!destinationPoint) {
      Alert.alert(
        'Destination Required',
        'Please select your final destination first.'
      );

      return;
    }

    try {
      setIsLoading(true);

      /*
       * Ask backend for routes that match the
       * driver's selected destination.
       */
      const response =
        await apiService.get(
          '/api/routes'
        );

      const routes =
        Array.isArray(response)
          ? response
          : response?.routes || [];

      if (!routes.length) {
        /*
         * The visual route can still be displayed
         * by DriverMap even when there is no exact
         * backend route record.
         */
        console.warn(
          'No backend routes returned.'
        );

        setSelectedRouteId(null);
        setSelectedStationId(null);

        Alert.alert(
          'Route Set',
          'Your Set-Off and Final Destination have been set on the map.'
        );

        return;
      }

      /*
       * Try to find a route whose origin/destination
       * is geographically closest to the selected
       * driver locations.
       */
      let bestRoute: any = null;
      let bestScore = Number.POSITIVE_INFINITY;

      for (const route of routes) {
        const originLat =
          Number(route.origin_latitude);

        const originLng =
          Number(route.origin_longitude);

        const destinationLat =
          Number(route.destination_latitude);

        const destinationLng =
          Number(route.destination_longitude);

        /*
         * Some backend responses only contain
         * station IDs. In that case use the first
         * route as a fallback.
         */
        if (
          Number.isNaN(originLat) ||
          Number.isNaN(originLng) ||
          Number.isNaN(destinationLat) ||
          Number.isNaN(destinationLng)
        ) {
          if (!bestRoute) {
            bestRoute = route;
          }

          continue;
        }

        const startDistance =
          Math.sqrt(
            Math.pow(
              departurePoint.latitude -
                originLat,
              2
            ) +
              Math.pow(
                departurePoint.longitude -
                  originLng,
                2
              )
          );

        const endDistance =
          Math.sqrt(
            Math.pow(
              destinationPoint.latitude -
                destinationLat,
              2
            ) +
              Math.pow(
                destinationPoint.longitude -
                  destinationLng,
                2
              )
          );

        const score =
          startDistance + endDistance;

        if (score < bestScore) {
          bestScore = score;
          bestRoute = route;
        }
      }

      if (bestRoute?.id) {
        setSelectedRouteId(
          Number(bestRoute.id)
        );

        selectedRouteIdRef.current =
          Number(bestRoute.id);
      }

      if (
        bestRoute?.origin_station_id
      ) {
        setSelectedStationId(
          Number(
            bestRoute.origin_station_id
          )
        );

        selectedStationIdRef.current =
          Number(
            bestRoute.origin_station_id
          );
      }

      Alert.alert(
        'Route Ready',
        'Your Set-Off and Final Destination are ready. You can now start broadcasting.'
      );
    } catch (error: any) {
      console.error(
        'SET DRIVER ROUTE ERROR:',
        error?.response?.data ||
          error?.message ||
          error
      );

      /*
       * Do not prevent the visual driver route
       * from being displayed just because the
       * backend route lookup failed.
       */
      Alert.alert(
        'Route Ready',
        'Your selected Set-Off and Final Destination are ready on the map.'
      );
    } finally {
      setIsLoading(false);
    }
  };


  /*
   * Calculate compass direction between two points.
   */
  const calculateDirection = (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ) => {
    const deltaLng =
      toLng - fromLng;

    const y =
      Math.sin(
        (deltaLng * Math.PI) / 180
      ) *
      Math.cos(
        (toLat * Math.PI) / 180
      );

    const x =
      Math.cos(
        (fromLat * Math.PI) / 180
      ) *
        Math.sin(
          (toLat * Math.PI) / 180
        ) -
      Math.sin(
        (fromLat * Math.PI) / 180
      ) *
        Math.cos(
          (toLat * Math.PI) / 180
        ) *
        Math.cos(
          (deltaLng * Math.PI) / 180
        );

    let bearing =
      (Math.atan2(y, x) * 180) /
      Math.PI;

    bearing =
      (bearing + 360) % 360;

    return bearing;
  };


  /*
   * Broadcast a single GPS position.
   */
  const broadcastLocation = useCallback(
    async (
      tripId: number,
      latitude: number,
      longitude: number
    ) => {
      const destination =
        destinationPointRef.current;

      let direction = 0;

      if (destination) {
        direction =
          calculateDirection(
            latitude,
            longitude,
            destination.latitude,
            destination.longitude
          );
      }

      setDriverLocation({
        latitude,
        longitude,
      });

      const driverId =
        Number(user?.id);

      if (!driverId) {
        console.error(
          'Cannot broadcast GPS: driver user ID is missing.'
        );

        return;
      }

      const seats =
        availableSeatsRef.current;

      const currentOccupancy =
        occupancyRef.current;

      console.log(
        'Broadcasting driver GPS:',
        {
          driverId,
          tripId,
          latitude,
          longitude,
          direction,
          seats,
          occupancy: currentOccupancy,
        }
      );

      /*
       * Socket.IO broadcast.
       */
      await socketService.emitLocation({
        driver_id: driverId,
        trip_id: tripId,
        latitude,
        longitude,
        speed: 25,
        direction,
        status: 'driving',
        available_seats: seats,
        occupancy: currentOccupancy,
      });

      /*
       * Also save GPS through the REST endpoint.
       * This gives the backend a persistent GPS record
       * for passenger matching and boarding detection.
       */
      try {
        await apiService.logGps({
          driver_id: driverId,
          trip_id: tripId,
          latitude,
          longitude,
          speed: 25,
          direction,
        });
      } catch (gpsError: any) {
        console.error(
          'REST GPS log failed:',
          gpsError?.response?.data ||
            gpsError?.message ||
            gpsError
        );
      }
    },
    [user?.id]
  );


  /*
   * Simulate the TroTro moving from Set-Off
   * toward Final Destination.
   */
  const startGpsSimulation = useCallback(
    async (tripId: number) => {
      const start =
        departurePointRef.current;

      const destination =
        destinationPointRef.current;

      if (!start || !destination) {
        Alert.alert(
          'Route Required',
          'Set-Off and Final Destination are required before broadcasting.'
        );

        return;
      }

      if (gpsIntervalRef.current) {
        clearInterval(
          gpsIntervalRef.current
        );

        gpsIntervalRef.current = null;
      }

      let currentLat =
        start.latitude;

      let currentLng =
        start.longitude;

      const destinationLat =
        destination.latitude;

      const destinationLng =
        destination.longitude;

      setDriverLocation({
        latitude: currentLat,
        longitude: currentLng,
      });

      /*
       * Broadcast the starting position immediately.
       */
      await broadcastLocation(
        tripId,
        currentLat,
        currentLng
      );

      /*
       * Move every 5 seconds.
       */
      gpsIntervalRef.current =
        setInterval(async () => {
          if (tripPaused) {
            return;
          }

          const remainingLat =
            destinationLat -
            currentLat;

          const remainingLng =
            destinationLng -
            currentLng;

          const distance =
            Math.sqrt(
              remainingLat *
                remainingLat +
                remainingLng *
                remainingLng
            );

          /*
           * Destination reached.
           */
          if (distance < 0.00015) {
            currentLat =
              destinationLat;

            currentLng =
              destinationLng;

            setDriverLocation({
              latitude: currentLat,
              longitude: currentLng,
            });

            await broadcastLocation(
              tripId,
              currentLat,
              currentLng
            );

            if (
              gpsIntervalRef.current
            ) {
              clearInterval(
                gpsIntervalRef.current
              );

              gpsIntervalRef.current =
                null;
            }

            setIsBroadcasting(false);

            Alert.alert(
              'Destination Reached',
              'Your TroTro has reached the selected destination.'
            );

            return;
          }

          /*
           * Move 15% closer to the destination.
           */
          currentLat +=
            remainingLat * 0.15;

          currentLng +=
            remainingLng * 0.15;

          await broadcastLocation(
            tripId,
            currentLat,
            currentLng
          );
        }, 5000);
    },
    [
      broadcastLocation,
      tripPaused,
    ]
  );


  /*
   * START BROADCAST & DRIVE
   */
  const handleStartTrip = async () => {
    try {
      if (!departurePoint) {
        Alert.alert(
          'Set-Off Point Required',
          'Please enter and select your Set-Off Point first.'
        );

        return;
      }

      if (!destinationPoint) {
        Alert.alert(
          'Destination Required',
          'Please enter and select your Final Destination first.'
        );

        return;
      }

      if (!selectedRouteId) {
        /*
         * Try to set the route automatically before
         * refusing to start the trip.
         */
        await handleSetRoute();
      }

      const routeId =
        selectedRouteIdRef.current;

      const stationId =
        selectedStationIdRef.current;

      if (!routeId) {
        Alert.alert(
          'Route Not Ready',
          'Please tap "Set Driver Route" first.'
        );

        return;
      }

      setIsLoading(true);

      console.log(
        '========================================'
      );

      console.log(
        'STARTING DRIVER BROADCAST'
      );

      console.log({
        routeId,
        stationId,
        departure: departurePoint,
        destination: destinationPoint,
        seats: availableSeats,
      });

      console.log(
        '========================================'
      );

      /*
       * Make sure Socket.IO is connected BEFORE
       * the first GPS broadcast.
       */
      await socketService.connect();

      /*
       * Create the active trip in Flask.
       */
      const response =
        await apiService.startTrip(
          routeId,
          stationId || undefined,
          availableSeats
        );

      console.log(
        'START TRIP RESPONSE:',
        response
      );

      if (!response?.trip) {
        throw new Error(
          'The server did not return a trip.'
        );
      }

      const trip =
        response.trip;

      /*
       * Store active trip.
       */
      dispatch(
        setActiveTrip(trip)
      );

      dispatch(
        updateDriverStatus('driving')
      );

      /*
       * Start exactly at the selected Set-Off Point.
       */
      setDriverLocation({
        latitude:
          departurePoint.latitude,
        longitude:
          departurePoint.longitude,
      });

      /*
       * Join the trip and route Socket.IO rooms.
       */
      if (trip.id) {
        socketService.subscribeToTrip(
          Number(trip.id)
        );
      }

      if (routeId) {
        socketService.subscribeToRoute(
          Number(routeId)
        );
      }

      setTripPaused(false);
      setIsBroadcasting(true);

      /*
       * Start live GPS broadcasting.
       */
      await startGpsSimulation(
        Number(trip.id)
      );

      Alert.alert(
        'Broadcast Started',
        'Your TroTro is now broadcasting its live location to passengers.'
      );
    } catch (error: any) {
      console.error(
        'START BROADCAST ERROR:',
        error?.response?.data ||
          error?.message ||
          error
      );

      setIsBroadcasting(false);

      Alert.alert(
        'Unable to Start Broadcast',
        error?.response?.data?.error ||
          error?.message ||
          'Could not start the trip. Please make sure the backend is running and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };


  /*
   * Pause trip.
   */
  const handlePauseTrip = async () => {
    try {
      setIsLoading(true);

      await apiService.pauseTrip();

      setTripPaused(true);

      dispatch(
        updateDriverStatus('parked')
      );

      Alert.alert(
        'Trip Paused',
        'Your broadcast has been paused.'
      );
    } catch (error: any) {
      console.error(
        'PAUSE TRIP ERROR:',
        error
      );

      Alert.alert(
        'Error',
        error?.response?.data?.error ||
          'Unable to pause the trip.'
      );
    } finally {
      setIsLoading(false);
    }
  };


  /*
   * Resume trip.
   */
  const handleResumeTrip = async () => {
    try {
      setIsLoading(true);

      await apiService.resumeTrip();

      setTripPaused(false);

      dispatch(
        updateDriverStatus('driving')
      );

      Alert.alert(
        'Trip Resumed',
        'Your TroTro is broadcasting again.'
      );
    } catch (error: any) {
      console.error(
        'RESUME TRIP ERROR:',
        error
      );

      Alert.alert(
        'Error',
        error?.response?.data?.error ||
          'Unable to resume the trip.'
      );
    } finally {
      setIsLoading(false);
    }
  };


  /*
   * End trip.
   */
  const handleEndTrip = async () => {
    try {
      setIsLoading(true);

      if (gpsIntervalRef.current) {
        clearInterval(
          gpsIntervalRef.current
        );

        gpsIntervalRef.current = null;
      }

      await apiService.endTrip();

      setIsBroadcasting(false);
      setTripPaused(false);

      dispatch(
        updateDriverStatus('online')
      );

      Alert.alert(
        'Trip Ended',
        'Your TroTro broadcast has ended.'
      );
    } catch (error: any) {
      console.error(
        'END TRIP ERROR:',
        error
      );

      Alert.alert(
        'Error',
        error?.response?.data?.error ||
          'Unable to end the trip.'
      );
    } finally {
      setIsLoading(false);
    }
  };


  /*
   * Update available seats.
   */
  const changeSeats = async (
    amount: number
  ) => {
    const newSeats = Math.max(
      0,
      Math.min(
        15,
        availableSeats + amount
      )
    );

    setAvailableSeats(newSeats);
    availableSeatsRef.current =
      newSeats;

    try {
      if (activeTrip?.id) {
        await apiService.updateSeats(
          newSeats,
          occupancy
        );
      }
    } catch (error) {
      console.error(
        'UPDATE SEATS ERROR:',
        error
      );
    }
  };


  /*
   * Update occupancy.
   */
  const changeOccupancy = async (
    value:
      | 'empty'
      | 'half-full'
      | 'full'
  ) => {
    setOccupancy(value);
    occupancyRef.current =
      value;

    try {
      if (activeTrip?.id) {
        await apiService.updateSeats(
          availableSeats,
          value
        );
      }
    } catch (error) {
      console.error(
        'UPDATE OCCUPANCY ERROR:',
        error
      );
    }
  };


  const statusText = tripPaused
    ? 'Trip Paused'
    : isBroadcasting
      ? 'Broadcast Active'
      : 'Ready to Drive';


  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>
              Welcome back,
            </Text>

            <Text style={styles.driverName}>
              {user?.name || 'Driver'}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isBroadcasting &&
                styles.statusBadgeActive,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                isBroadcasting &&
                  styles.statusDotActive,
              ]}
            />

            <Text style={styles.statusText}>
              {statusText}
            </Text>
          </View>
        </View>


        <View style={styles.mapCard}>
          <DriverMap
            setOffPoint={
              departurePoint
            }
            destination={
              destinationPoint
            }
            driverLocation={
              driverLocation
            }
          />
        </View>


        <View style={styles.routeCard}>
          <View style={styles.routeHeaderRow}>
            <View style={styles.routeHeaderIcon}>
              <Text style={styles.routeHeaderIconText}>
                ↗
              </Text>
            </View>

            <View style={styles.routeHeaderTextContainer}>
              <Text style={styles.sectionTitle}>
                Set Your Route
              </Text>
              <Text style={styles.routeSubtitle}>
                Choose where your TroTro starts and where it is going.
              </Text>
            </View>
          </View>

          <Text style={styles.label}>
            Set-Off Point
          </Text>

          <View style={styles.searchRow}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={setOffQuery}
                onChangeText={(text) => {
                  setSetOffQuery(text);

                  if (!text.trim()) {
                    setSetOffResults([]);
                  }
                }}
                onSubmitEditing={() =>
                  searchLocation(
                    setOffQuery,
                    'setoff'
                  )
                }
                placeholder="Where are you starting?"
                placeholderTextColor="#888"
              />

              <Animated.View
                style={[
                  styles.searchIconButton,
                  {
                    transform: [
                      { scale: searchPulse },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() =>
                    searchLocation(
                      setOffQuery,
                      'setoff'
                    )
                  }
                  disabled={isSearchingSetOff}
                  activeOpacity={0.75}
                >
                  {isSearchingSetOff ? (
                    <ActivityIndicator
                      color="#fff"
                      size="small"
                    />
                  ) : (
                    <Text style={styles.searchIcon}>
                      🔍
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {setOffResults.map(
            (location, index) => (
              <TouchableOpacity
                key={`setoff-${index}`}
                style={styles.resultItem}
                onPress={() =>
                  selectSetOffPoint(
                    location
                  )
                }
              >
                <Text
                  style={styles.resultText}
                >
                  {location.address}
                </Text>
              </TouchableOpacity>
            )
          )}

          {departurePoint && (
            <View
              style={styles.selectedLocation}
            >
              <Text
                style={styles.selectedTitle}
              >
                ✓ Set-Off Selected
              </Text>

              <Text
                style={styles.selectedText}
              >
                {departurePoint.address}
              </Text>
            </View>
          )}

          <Text
            style={[
              styles.label,
              styles.destinationLabel,
            ]}
          >
            Final Destination
          </Text>

          <View style={styles.searchRow}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={destinationQuery}
                onChangeText={(text) => {
                  setDestinationQuery(
                    text
                  );

                  if (!text.trim()) {
                    setDestinationResults(
                      []
                    );
                  }
                }}
                onSubmitEditing={() =>
                  searchLocation(
                    destinationQuery,
                    'destination'
                  )
                }
                placeholder="Where are you going?"
                placeholderTextColor="#888"
              />

              <Animated.View
                style={[
                  styles.searchIconButton,
                  {
                    transform: [
                      { scale: searchPulse },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() =>
                    searchLocation(
                      destinationQuery,
                      'destination'
                    )
                  }
                  disabled={isSearchingDestination}
                  activeOpacity={0.75}
                >
                  {isSearchingDestination ? (
                    <ActivityIndicator
                      color="#fff"
                      size="small"
                    />
                  ) : (
                    <Text style={styles.searchIcon}>
                      🔍
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {destinationResults.map(
            (location, index) => (
              <TouchableOpacity
                key={`destination-${index}`}
                style={styles.resultItem}
                onPress={() =>
                  selectDestinationPoint(
                    location
                  )
                }
              >
                <Text
                  style={styles.resultText}
                >
                  {location.address}
                </Text>
              </TouchableOpacity>
            )
          )}

          {destinationPoint && (
            <View
              style={styles.selectedLocation}
            >
              <Text
                style={styles.selectedTitle}
              >
                ✓ Destination Selected
              </Text>

              <Text
                style={styles.selectedText}
              >
                {destinationPoint.address}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.routeButton}
            onPress={handleSetRoute}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator
                color="#fff"
              />
            ) : (
              <Text
                style={styles.routeButtonText}
              >
                Set Driver Route
              </Text>
            )}
          </TouchableOpacity>
        </View>


        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            TroTro Capacity
          </Text>

          <View
            style={
              styles.capacityRow
            }
          >
            <TouchableOpacity
              style={
                styles.capacityButton
              }
              onPress={() =>
                changeSeats(-1)
              }
            >
              <Text
                style={
                  styles.capacityButtonText
                }
              >
                −
              </Text>
            </TouchableOpacity>

            <View
              style={
                styles.capacityDisplay
              }
            >
              <Text
                style={
                  styles.capacityNumber
                }
              >
                {availableSeats}
              </Text>

              <Text
                style={
                  styles.capacityLabel
                }
              >
                Seats Available
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.capacityButton
              }
              onPress={() =>
                changeSeats(1)
              }
            >
              <Text
                style={
                  styles.capacityButtonText
                }
              >
                +
              </Text>
            </TouchableOpacity>
          </View>


          <Text style={styles.label}>
            Occupancy
          </Text>

          <View
            style={
              styles.occupancyRow
            }
          >
            {(
              [
                'empty',
                'half-full',
                'full',
              ] as const
            ).map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.occupancyButton,
                  occupancy === value &&
                    styles.occupancyButtonSelected,
                ]}
                onPress={() =>
                  changeOccupancy(
                    value
                  )
                }
              >
                <Text
                  style={[
                    styles.occupancyText,
                    occupancy === value &&
                      styles.occupancyTextSelected,
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>


        {!isBroadcasting ? (
          <TouchableOpacity
            style={styles.broadcastButton}
            onPress={
              handleStartTrip
            }
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator
                color="#fff"
                size="small"
              />
            ) : (
              <Text
                style={
                  styles.broadcastButtonText
                }
              >
                Start Broadcast & Drive
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.tripControls}>
            {!tripPaused ? (
              <TouchableOpacity
                style={
                  styles.pauseButton
                }
                onPress={
                  handlePauseTrip
                }
                disabled={isLoading}
              >
                <Text
                  style={
                    styles.controlButtonText
                  }
                >
                  Pause Trip
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={
                  styles.resumeButton
                }
                onPress={
                  handleResumeTrip
                }
                disabled={isLoading}
              >
                <Text
                  style={
                    styles.controlButtonText
                  }
                >
                  Resume Trip
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={
                styles.endButton
              }
              onPress={
                handleEndTrip
              }
              disabled={isLoading}
            >
              <Text
                style={
                  styles.controlButtonText
                }
              >
                End Trip
              </Text>
            </TouchableOpacity>
          </View>
        )}


        {isBroadcasting && (
          <View
            style={
              styles.broadcastInfo
            }
          >
            <View
              style={
                styles.broadcastIndicator
              }
            />

            <View
              style={
                styles.broadcastTextContainer
              }
            >
              <Text
                style={
                  styles.broadcastTitle
                }
              >
                Live Broadcast Active
              </Text>

              <Text
                style={
                  styles.broadcastDescription
                }
              >
                Your TroTro location is being
                broadcast to passengers.
              </Text>
            </View>
          </View>
        )}


        <TouchableOpacity
          style={styles.sosButton}
          onPress={() =>
            Alert.alert(
              'Emergency SOS',
              'Emergency support will be contacted.'
            )
          }
        >
          <Text
            style={styles.sosText}
          >
            SOS / Emergency
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  welcome: {
    fontSize: 14,
    color: '#777',
  },

  driverName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginTop: 2,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eeeeee',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  statusBadgeActive: {
    backgroundColor: '#e8f8ee',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#888',
    marginRight: 6,
  },

  statusDotActive: {
    backgroundColor: '#19a463',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },

  mapCard: {
    height: 320,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  routeCard: {
    backgroundColor: '#e8f8ee',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfe6ce',
  },

  routeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  routeHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#16834d',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  routeHeaderIconText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },

  routeHeaderTextContainer: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#123b27',
    marginBottom: 3,
  },

  routeSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4f6f5c',
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#234c35',
    marginBottom: 7,
  },

  destinationLabel: {
    marginTop: 18,
  },

  searchRow: {
    width: '100%',
  },

  inputWrapper: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#b9d9c6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingRight: 58,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fff',
  },

  searchIconButton: {
    position: 'absolute',
    right: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#16834d',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchIcon: {
    fontSize: 17,
  },

  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },

  resultText: {
    color: '#222',
    fontSize: 14,
    lineHeight: 20,
  },

  selectedLocation: {
    backgroundColor: '#f0f8f3',
    borderRadius: 10,
    padding: 11,
    marginTop: 8,
  },

  selectedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16834d',
    marginBottom: 3,
  },

  selectedText: {
    fontSize: 13,
    color: '#333',
  },

  routeButton: {
    height: 52,
    borderRadius: 11,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  routeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  capacityButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#eeeeee',
    alignItems: 'center',
    justifyContent: 'center',
  },

  capacityButtonText: {
    fontSize: 25,
    color: '#222',
  },

  capacityDisplay: {
    alignItems: 'center',
    minWidth: 130,
  },

  capacityNumber: {
    fontSize: 30,
    fontWeight: '700',
    color: '#111',
  },

  capacityLabel: {
    fontSize: 12,
    color: '#777',
  },

  occupancyRow: {
    flexDirection: 'row',
    gap: 8,
  },

  occupancyButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d7d7d7',
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: 'center',
  },

  occupancyButtonSelected: {
    backgroundColor: '#222',
    borderColor: '#222',
  },

  occupancyText: {
    fontSize: 12,
    color: '#444',
    textTransform: 'capitalize',
  },

  occupancyTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },

  broadcastButton: {
    height: 58,
    borderRadius: 14,
    backgroundColor: '#16834d',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  broadcastButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  tripControls: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  pauseButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#e0a800',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resumeButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#16834d',
    alignItems: 'center',
    justifyContent: 'center',
  },

  endButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#c62828',
    alignItems: 'center',
    justifyContent: 'center',
  },

  controlButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  broadcastInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f8ee',
    borderRadius: 12,
    padding: 13,
    marginBottom: 12,
  },

  broadcastIndicator: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#16834d',
    marginRight: 10,
  },

  broadcastTextContainer: {
    flex: 1,
  },

  broadcastTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16834d',
  },

  broadcastDescription: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },

  sosButton: {
    height: 50,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#c62828',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sosText: {
    color: '#c62828',
    fontSize: 15,
    fontWeight: '700',
  },
});


export default DriverDashboard;