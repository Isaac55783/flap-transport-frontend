import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

import OpenStreetMap from '../components/OpenStreetMap';

import {
  useAppDispatch,
  useAppSelector,
} from '../store';

import { logout } from '../store/authSlice';


// ==================================================
// TYPES
// ==================================================

type TroTro = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  route: string;
  availableSeats: number;
  speed?: number;
};

type TripRecord = {
  id: string;
  trotroId: number;
  trotroName: string;
  route: string;
  pickup: string;
  destination: string;
  date: string;
};


// ==================================================
// BACKEND
// ==================================================

const API_URL = 'http://127.0.0.1:5000';


// ==================================================
// DEFAULT ACCRA LOCATION
// ==================================================

const DEFAULT_LATITUDE = 5.6037;
const DEFAULT_LONGITUDE = -0.1870;


// ==================================================
// SAMPLE TRO-TROS
// ==================================================

const initialTroTros: TroTro[] = [
  {
    id: 1,
    name: 'TroTro 1',
    latitude: 5.6037,
    longitude: -0.1870,
    route: 'Madina → Circle',
    availableSeats: 8,
    speed: 30,
  },
  {
    id: 2,
    name: 'TroTro 2',
    latitude: 5.5950,
    longitude: -0.2050,
    route: 'Lapaz → Kaneshie',
    availableSeats: 5,
    speed: 25,
  },
  {
    id: 3,
    name: 'TroTro 3',
    latitude: 5.6200,
    longitude: -0.1700,
    route: 'Madina → 37',
    availableSeats: 12,
    speed: 28,
  },
  {
    id: 4,
    name: 'TroTro 4',
    latitude: 5.5700,
    longitude: -0.2200,
    route: 'Kaneshie → Circle',
    availableSeats: 3,
    speed: 27,
  },
];


// ==================================================
// DISTANCE CALCULATION
// ==================================================

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadius = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}


// ==================================================
// ETA
// ==================================================

function calculateEtaMinutes(
  passengerLat: number,
  passengerLng: number,
  trotro: TroTro
) {
  const distanceKm =
    calculateDistanceKm(
      passengerLat,
      passengerLng,
      trotro.latitude,
      trotro.longitude
    );

  const speed =
    trotro.speed && trotro.speed > 2
      ? trotro.speed
      : 25;

  return Math.max(
    1,
    Math.round(
      (distanceKm / speed) * 60
    )
  );
}


// ==================================================
// PASSENGER DASHBOARD
// ==================================================

export default function PassengerDashboard({
  navigation,
}: any) {

  // ==================================================
  // REDUX
  // ==================================================

  const dispatch = useAppDispatch();

  const user = useAppSelector(
    (state: any) => state.auth.user
  );

  const userName =
    user?.name || 'Passenger';

  // Keep trip history and favourites separate for each signed-in passenger.
  const storageId = String(
    user?.id || user?.phone_number || user?.phone || user?.email || 'guest'
  );
  const tripsStorageKey = `flap_passenger_trips_${storageId}`;
  const favoritesStorageKey = `flap_passenger_favorites_${storageId}`;

  const [myTrips, setMyTrips] = useState<TripRecord[]>([]);
  const [favoriteTroTros, setFavoriteTroTros] = useState<TroTro[]>([]);
  const [activePanel, setActivePanel] = useState<'trips' | 'favorites' | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSavedPassengerData = async () => {
      try {
        const [savedTrips, savedFavorites] = await Promise.all([
          AsyncStorage.getItem(tripsStorageKey),
          AsyncStorage.getItem(favoritesStorageKey),
        ]);

        if (!mounted) return;
        if (savedTrips) {
          const parsedTrips = JSON.parse(savedTrips);
          setMyTrips(Array.isArray(parsedTrips) ? parsedTrips : []);
        } else {
          setMyTrips([]);
        }
        if (savedFavorites) {
          const parsedFavorites = JSON.parse(savedFavorites);
          setFavoriteTroTros(Array.isArray(parsedFavorites) ? parsedFavorites : []);
        } else {
          setFavoriteTroTros([]);
        }
      } catch (error) {
        console.error('Could not load passenger trips/favourites:', error);
      }
    };

    loadSavedPassengerData();
    return () => { mounted = false; };
  }, [tripsStorageKey, favoritesStorageKey]);

  const recordTrip = async (tro: TroTro) => {
    const trip: TripRecord = {
      id: `${Date.now()}-${tro.id}`,
      trotroId: tro.id,
      trotroName: tro.name,
      route: tro.route,
      pickup: pickupText.trim() || 'Pickup not specified',
      destination: destinationText.trim() || 'Destination not specified',
      date: new Date().toISOString(),
    };

    try {
      // Read the stored list first so rapid requests do not overwrite older trips.
      const stored = await AsyncStorage.getItem(tripsStorageKey);
      const previous: TripRecord[] = stored ? JSON.parse(stored) : myTrips;
      const nextTrips = [trip, ...(Array.isArray(previous) ? previous : [])];
      await AsyncStorage.setItem(tripsStorageKey, JSON.stringify(nextTrips));
      setMyTrips(nextTrips);
      setActivePanel('trips');
    } catch (error) {
      console.error('Could not save passenger trip:', error);
    }
  };

  const toggleFavorite = async (tro: TroTro) => {
    const isSaved = favoriteTroTros.some((item) => item.id === tro.id);
    const nextFavorites = isSaved
      ? favoriteTroTros.filter((item) => item.id !== tro.id)
      : [tro, ...favoriteTroTros];

    setFavoriteTroTros(nextFavorites);
    try {
      await AsyncStorage.setItem(favoritesStorageKey, JSON.stringify(nextFavorites));
    } catch (error) {
      console.error('Could not save passenger favourites:', error);
    }
  };

  const removeFavorite = async (troId: number) => {
    const nextFavorites = favoriteTroTros.filter((item) => item.id !== troId);
    setFavoriteTroTros(nextFavorites);
    try {
      await AsyncStorage.setItem(favoritesStorageKey, JSON.stringify(nextFavorites));
    } catch (error) {
      console.error('Could not update passenger favourites:', error);
    }
  };


  // ==================================================
  // PASSENGER LOCATION
  // ==================================================

  const [location, setLocation] =
    useState<Location.LocationObject | null>(
      null
    );

  const [locationLoading, setLocationLoading] =
    useState(true);


  // ==================================================
  // PICKUP AND DESTINATION SEARCH
  // ==================================================

  const [pickupText, setPickupText] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [, setPickupCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchingDestination, setSearchingDestination] = useState(false);

  const useMyCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Please allow FLAP Transport to access your location.'
        );
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = current.coords;

      setLocation(current);
      setPickupCoordinates({ latitude, longitude });

      // Convert GPS coordinates into a human-readable place name.
      let readableAddress = '';

      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (addresses.length > 0) {
          const address = addresses[0];
          readableAddress = [
            address.name,
            address.street,
            address.district,
            address.subregion,
            address.city,
            address.region,
            address.country,
          ]
            .filter(Boolean)
            .filter((value, index, array) => array.indexOf(value) === index)
            .join(', ');
        }
      } catch (geocodeError) {
        console.warn('Device reverse geocoding failed; trying map provider:', geocodeError);
      }

      // Use OpenStreetMap as a fallback if the device returns no address.
      if (!readableAddress) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );

          if (response.ok) {
            const result = await response.json();
            const parts = result.address || {};
            readableAddress = [
              parts.amenity,
              parts.building,
              parts.road,
              parts.neighbourhood,
              parts.suburb,
              parts.city_district,
              parts.city,
              parts.town,
              parts.village,
              parts.county,
              parts.state,
              parts.country,
            ]
              .filter(Boolean)
              .filter((value, index, array) => array.indexOf(value) === index)
              .join(', ');

            if (!readableAddress && result.display_name) {
              readableAddress = result.display_name;
            }
          }
        } catch (fallbackError) {
          console.warn('OpenStreetMap reverse geocoding failed:', fallbackError);
        }
      }

      // Never display raw GPS numbers in the pickup field.
      setPickupText(readableAddress || 'Current location (address unavailable)');
    } catch (error) {
      console.error('Could not detect pickup location:', error);
      Alert.alert(
        'Location Error',
        'Unable to detect your current location. Please try again.'
      );
    }
  };

  const searchDestination = async (query: string) => {
    setDestinationText(query);
    setDestinationCoordinates(null);

    if (query.trim().length < 3) {
      setDestinationSuggestions([]);
      return;
    }

    try {
      setSearchingDestination(true);
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=gh&limit=5`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Destination search failed (${response.status})`);
      }

      const results = await response.json();
      setDestinationSuggestions(Array.isArray(results) ? results : []);
    } catch (error) {
      console.error('Destination search failed:', error);
      setDestinationSuggestions([]);
    } finally {
      setSearchingDestination(false);
    }
  };


  // ==================================================
  // TRO-TROS
  // ==================================================

  const [troTros, setTroTros] =
    useState<TroTro[]>(
      initialTroTros
    );

  const [selectedTroTro, setSelectedTroTro] =
    useState<TroTro | null>(null);


  // ==================================================
  // ETA
  // ==================================================

  const [eta, setEta] =
    useState<number | null>(null);


  // ==================================================
  // SOCKET STATUS
  // ==================================================

  const [socketConnected, setSocketConnected] =
    useState(false);


  // ==================================================
  // PASSENGER LOCATION TRACKING
  // ==================================================

  useEffect(() => {

    let mounted = true;

    let locationSubscription:
      Location.LocationSubscription | null = null;

    const startLocationTracking = async () => {

      try {

        setLocationLoading(true);

        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {

          if (mounted) {
            setLocationLoading(false);
          }

          Alert.alert(
            'Location Permission',
            'FLAP needs your location to show you on the map.'
          );

          return;
        }

        // ------------------------------------------
        // GET INITIAL LOCATION
        // ------------------------------------------

        const current =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

        if (mounted) {

          console.log(
            'Passenger initial location:',
            current.coords.latitude,
            current.coords.longitude
          );

          setLocation(current);
          setLocationLoading(false);
        }


        // ------------------------------------------
        // CONTINUOUS LOCATION TRACKING
        // ------------------------------------------

        locationSubscription =
          await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 2000,
              distanceInterval: 5,
            },

            (newLocation) => {

              if (!mounted) {
                return;
              }

              console.log(
                'Passenger location updated:',
                newLocation.coords.latitude,
                newLocation.coords.longitude
              );

              setLocation(newLocation);
              setLocationLoading(false);
            }
          );

      } catch (error) {

        console.error(
          'Passenger location tracking error:',
          error
        );

        if (mounted) {

          setLocation(null);
          setLocationLoading(false);
        }
      }
    };


    startLocationTracking();


    return () => {

      mounted = false;

      if (locationSubscription) {

        locationSubscription.remove();
        locationSubscription = null;
      }
    };

  }, []);


  // ==================================================
  // SOCKET.IO
  // ==================================================

  useEffect(() => {

    const socket: Socket = io(API_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });


    // -----------------------------------------------
    // HANDLE DRIVER LOCATION
    // -----------------------------------------------

    const handleLocationUpdate = (
      data: any
    ) => {

      if (
        data?.latitude == null ||
        data?.longitude == null
      ) {
        return;
      }

      const driverId =
        Number(data.driver_id) || 1;

      const newLatitude =
        Number(data.latitude);

      const newLongitude =
        Number(data.longitude);

      if (
        Number.isNaN(newLatitude) ||
        Number.isNaN(newLongitude)
      ) {
        return;
      }

      setTroTros((current) => {

        const exists =
          current.some(
            (tro) =>
              tro.id === driverId
          );


        // ------------------------------------------
        // ADD NEW TRO-TRO
        // ------------------------------------------

        if (!exists) {

          return [
            ...current,

            {
              id: driverId,

              name:
                data.name ||
                `TroTro ${driverId}`,

              latitude:
                newLatitude,

              longitude:
                newLongitude,

              route:
                data.route ||
                'Live route',

              availableSeats:
                data.available_seats != null
                  ? Number(
                      data.available_seats
                    )
                  : 0,

              speed:
                data.speed != null
                  ? Number(
                      data.speed
                    )
                  : 25,
            },
          ];
        }


        // ------------------------------------------
        // UPDATE EXISTING TRO-TRO
        // ------------------------------------------

        return current.map((tro) => {

          if (
            tro.id !== driverId
          ) {
            return tro;
          }

          return {
            ...tro,

            latitude:
              newLatitude,

            longitude:
              newLongitude,

            speed:
              data.speed != null
                ? Number(
                    data.speed
                  )
                : tro.speed || 25,

            availableSeats:
              data.available_seats != null
                ? Number(
                    data.available_seats
                  )
                : tro.availableSeats,

            route:
              data.route ||
              tro.route,
          };

        });

      });

    };


    // -----------------------------------------------
    // CONNECT
    // -----------------------------------------------

    socket.on(
      'connect',
      () => {

        console.log(
          'Passenger connected to live server'
        );

        setSocketConnected(true);
      }
    );


    // -----------------------------------------------
    // DISCONNECT
    // -----------------------------------------------

    socket.on(
      'disconnect',
      () => {

        console.log(
          'Passenger disconnected from live server'
        );

        setSocketConnected(false);
      }
    );


    // -----------------------------------------------
    // DRIVER LOCATION EVENTS
    // -----------------------------------------------

    socket.on(
      'location_update',
      handleLocationUpdate
    );

    socket.on(
      'general_location_update',
      handleLocationUpdate
    );


    // -----------------------------------------------
    // CLEANUP SOCKET
    // -----------------------------------------------

    return () => {

      socket.off(
        'location_update',
        handleLocationUpdate
      );

      socket.off(
        'general_location_update',
        handleLocationUpdate
      );

      socket.disconnect();

    };

  }, []);


  // ==================================================
  // UPDATE ETA
  // ==================================================

  useEffect(() => {

    if (
      !selectedTroTro ||
      !location
    ) {

      setEta(null);

      return;
    }


    const updateEta = () => {

      const current =
        troTros.find(
          (tro) =>
            tro.id ===
            selectedTroTro.id
        );


      if (!current) {

        setEta(null);

        return;
      }


      setEta(
        calculateEtaMinutes(
          location.coords.latitude,
          location.coords.longitude,
          current
        )
      );

    };


    updateEta();


    const interval =
      setInterval(
        updateEta,
        5000
      );


    return () => {

      clearInterval(interval);

    };

  }, [
    selectedTroTro?.id,
    location,
    troTros,
  ]);


  // ==================================================
  // SELECT TRO-TRO
  // ==================================================

  const selectTroTro = useCallback(
    (tro: TroTro) => {

      setSelectedTroTro(tro);

    },
    []
  );


  // ==================================================
  // EXIT / LOG OUT
  // Always return to the Welcome screen. Avoid Alert.alert here,
  // because it may not display/respond correctly on React Native Web.
  // ==================================================

  const handleLogout = () => {
    try {
      // Clear the authenticated user/session from Redux first.
      dispatch(logout());

      // Reset navigation so Back cannot return to the dashboard.
      if (navigation?.reset) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
      } else if (navigation?.navigate) {
        // Fallback for navigators that do not expose reset.
        navigation.navigate('Welcome');
      }
    } catch (error) {
      console.error('Could not exit Passenger Dashboard:', error);
      // Last-resort navigation fallback, when available.
      navigation?.navigate?.('Welcome');
    }
  };


  // ==================================================
  // PASSENGER COORDINATES
  // ==================================================

  const passengerLatitude =
    location?.coords.latitude ??
    DEFAULT_LATITUDE;

  const passengerLongitude =
    location?.coords.longitude ??
    DEFAULT_LONGITUDE;


  // ==================================================
  // RENDER
  // ==================================================

  return (

    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={true}
    >

      <View style={styles.container}>


        {/* ==========================================
            HEADER
        ========================================== */}

        <View style={styles.header}>

          <View>

            <Text style={styles.welcome}>
              Welcome back
            </Text>

            <Text style={styles.name}>
              {userName}
            </Text>

          </View>


          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >

            <Text style={styles.logoutIcon}>
              🚪
            </Text>

          </TouchableOpacity>

        </View>


        {/* ==========================================
            PICKUP AND DESTINATION
        ========================================== */}

        <View style={styles.tripSearchCard}>
          <Text style={styles.tripSearchTitle}>Where would you like to go?</Text>

          <Text style={styles.fieldLabel}>PICKUP LOCATION</Text>
          <View style={styles.locationInputRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <TextInput
              style={styles.locationInput}
              placeholder="Enter your current location"
              placeholderTextColor="#888888"
              value={pickupText}
              onChangeText={(value) => {
                setPickupText(value);
                setPickupCoordinates(null);
              }}
              accessibilityLabel="Pickup location"
              returnKeyType="next"
            />
          </View>

          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={useMyCurrentLocation}
            activeOpacity={0.8}
          >
            <Text style={styles.currentLocationButtonText}>◎ Use My Current Location</Text>
          </TouchableOpacity>

          <View style={styles.fieldDivider} />

          <Text style={styles.fieldLabel}>DESTINATION</Text>
          <View style={styles.locationInputRow}>
            <Text style={styles.destinationIcon}>●</Text>
            <TextInput
              style={styles.locationInput}
              placeholder="Where are you going?"
              placeholderTextColor="#888888"
              value={destinationText}
              onChangeText={searchDestination}
              accessibilityLabel="Destination"
              returnKeyType="search"
            />
          </View>

          {searchingDestination && (
            <Text style={styles.searchStatus}>Searching for places...</Text>
          )}

          {!searchingDestination && destinationText.trim().length >= 3 && destinationSuggestions.length === 0 && !destinationCoordinates && (
            <Text style={styles.searchStatus}>No suggestions yet. Try a nearby town, landmark, or street.</Text>
          )}

          {destinationSuggestions.map((place: any) => (
            <TouchableOpacity
              key={String(place.place_id)}
              style={styles.suggestionRow}
              onPress={() => {
                setDestinationText(place.display_name);
                setDestinationCoordinates({
                  latitude: Number(place.lat),
                  longitude: Number(place.lon),
                });
                setDestinationSuggestions([]);
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.suggestionIcon}>📍</Text>
              <Text style={styles.suggestionText}>{place.display_name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ==========================================
            MAP
        ========================================== */}

        <View style={styles.mapSection}>

          <OpenStreetMap
            latitude={
              location?.coords.latitude
            }

            longitude={
              location?.coords.longitude
            }

            troTros={troTros}

            onSelectTroTro={
              selectTroTro
            }
          />


          {/* ========================================
              PASSENGER MAP MARKER
          ======================================== */}

          {location && (

            <View
              pointerEvents="none"
              style={styles.passengerMarkerOverlay}
            >

              <View
                style={styles.passengerMarkerOuter}
              >

                <View
                  style={styles.passengerMarkerInner}
                />

              </View>

            </View>

          )}


          {/* ----------------------------------------
              LOCATION STATUS
          ---------------------------------------- */}

          <View style={styles.liveBadge}>

            <View
              style={[
                styles.liveDot,
                {
                  backgroundColor:
                    location
                      ? '#00A859'
                      : '#999999',
                },
              ]}
            />

            <Text
              style={[
                styles.liveText,
                {
                  color:
                    location
                      ? '#00A859'
                      : '#777777',
                },
              ]}
            >
              {location
                ? 'LOCATION LIVE'
                : locationLoading
                  ? 'LOCATING...'
                  : 'LOCATION OFF'}
            </Text>

          </View>


          {/* ----------------------------------------
              TRO-TRO COUNT
          ---------------------------------------- */}

          <View style={styles.countBadge}>

            <Text
              style={styles.countNumber}
            >
              {troTros.length}
            </Text>

            <Text
              style={styles.countText}
            >
              tro-tros nearby
            </Text>

          </View>

        </View>


        {/* ==========================================
            SELECTED TRO-TRO
        ========================================== */}

        {selectedTroTro && (

          <View
            style={styles.selectedCard}
          >

            <View
              style={styles.cardHeader}
            >

              <View
                style={styles.busCircle}
              >

                <Text
                  style={styles.busLetter}
                >
                  T
                </Text>

              </View>


              <View
                style={styles.cardTitle}
              >

                <Text
                  style={styles.trotroName}
                >
                  {selectedTroTro.name}
                </Text>

                <Text
                  style={styles.routeText}
                >
                  {selectedTroTro.route}
                </Text>

              </View>


              <TouchableOpacity
                style={styles.favoriteToggle}
                onPress={() => toggleFavorite(selectedTroTro)}
                accessibilityLabel={favoriteTroTros.some((item) => item.id === selectedTroTro.id) ? 'Remove from favourites' : 'Add to favourites'}
                activeOpacity={0.75}
              >
                <Text style={[
                  styles.favoriteToggleText,
                  favoriteTroTros.some((item) => item.id === selectedTroTro.id) && styles.favoriteToggleTextSaved,
                ]}>
                  {favoriteTroTros.some((item) => item.id === selectedTroTro.id) ? '★' : '☆'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedTroTro(null)}
                accessibilityLabel="Close selected trotro"
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>

            </View>


            {/* ETA */}

            <View
              style={styles.etaBox}
            >

              <View>

                <Text
                  style={styles.etaLabel}
                >
                  Estimated arrival
                </Text>

                <Text
                  style={styles.etaValue}
                >
                  {eta != null
                    ? `${eta} min`
                    : 'Calculating...'}
                </Text>

              </View>


              <View
                style={styles.liveStatus}
              >

                <View
                  style={
                    styles.liveStatusDot
                  }
                />

                <Text
                  style={
                    styles.liveStatusText
                  }
                >
                  LIVE
                </Text>

              </View>

            </View>


            {/* INFO */}

            <View
              style={styles.infoRow}
            >

              <Text
                style={styles.infoText}
              >
                {selectedTroTro.availableSeats}{' '}
                seats available
              </Text>

              <Text
                style={styles.infoText}
              >
                {Math.round(
                  selectedTroTro.speed ||
                    0
                )}{' '}
                km/h
              </Text>

            </View>


            {/* REQUEST */}

            <TouchableOpacity
              style={styles.requestButton}
              onPress={() => {
                void recordTrip(selectedTroTro);
              }}
            >

              <Text
                style={
                  styles.requestText
                }
              >
                Request Ride
              </Text>

            </TouchableOpacity>

          </View>

        )}


        {/* ==========================================
            SAVED TRIPS / FAVOURITES
        ========================================== */}
        {activePanel !== null && (
          <View style={styles.savedPanel}>
            <View style={styles.savedPanelHeader}>
              <Text style={styles.savedPanelTitle}>
                {activePanel === 'trips' ? 'My Trips' : 'Favourite Tro-Tros'}
              </Text>
              <TouchableOpacity
                onPress={() => setActivePanel(null)}
                accessibilityLabel="Close saved items"
                style={styles.panelCloseButton}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {activePanel === 'trips' && (
              myTrips.length === 0 ? (
                <Text style={styles.emptySavedText}>No trips recorded yet. Select a trotro and tap Request Ride to save a trip here.</Text>
              ) : (
                <View style={styles.savedList}>
                  {myTrips.map((trip) => (
                    <View key={trip.id} style={styles.savedItem}>
                      <Text style={styles.savedItemTitle}>{trip.trotroName}</Text>
                      <Text style={styles.savedItemText}>{trip.route}</Text>
                      <Text style={styles.savedItemText}>From: {trip.pickup}</Text>
                      <Text style={styles.savedItemText}>To: {trip.destination}</Text>
                      <Text style={styles.savedItemDate}>{new Date(trip.date).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>
              )
            )}

            {activePanel === 'favorites' && (
              favoriteTroTros.length === 0 ? (
                <Text style={styles.emptySavedText}>No favourites saved yet. Select a trotro on the map and tap the star to bookmark it.</Text>
              ) : (
                <View style={styles.savedList}>
                  {favoriteTroTros.map((tro) => (
                    <View key={tro.id} style={styles.savedItem}>
                      <Text style={styles.savedItemTitle}>{tro.name}</Text>
                      <Text style={styles.savedItemText}>{tro.route}</Text>
                      <View style={styles.savedItemActions}>
                        <TouchableOpacity
                          style={styles.savedActionButton}
                          onPress={() => {
                            const liveTro = troTros.find((item) => item.id === tro.id) || tro;
                            setSelectedTroTro(liveTro);
                            setActivePanel(null);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.savedActionText}>View Ride</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeFavoriteButton}
                          onPress={() => { void removeFavorite(tro.id); }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.removeFavoriteText}>Remove ★</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )
            )}
          </View>
        )}

        {/* ==========================================
            BOTTOM ACTIONS
        ========================================== */}
        <View style={styles.bottomPanel}>
          <TouchableOpacity
            style={[styles.actionButton, activePanel === 'trips' && styles.actionButtonActive]}
            onPress={() => setActivePanel(activePanel === 'trips' ? null : 'trips')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconCircle}>
              <Text style={styles.actionIcon}>🚌</Text>
            </View>
            <Text style={styles.actionText}>My Trips</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, activePanel === 'favorites' && styles.actionButtonActive]}
            onPress={() => setActivePanel(activePanel === 'favorites' ? null : 'favorites')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconCircle}>
              <Text style={styles.actionIcon}>⭐</Text>
            </View>
            <Text style={styles.actionText}>Favourites</Text>
          </TouchableOpacity>
        </View>

      </View>

    </ScrollView>

  );
}


// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({

  scrollView: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F4F8FB',
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  container: {
    width: '100%',
    minHeight: '100%',
    backgroundColor: '#F4F8FB',
  },


  // ==================================================
  // HEADER
  // ==================================================

  header: {
    height: 78,
    paddingHorizontal: 22,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF3',
  },

  welcome: {
    fontSize: 13,
    color: '#777777',
  },

  name: {
    marginTop: 2,
    fontSize: 21,
    fontWeight: '700',
    color: '#0D47A1',
  },

  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoutIcon: {
    fontSize: 20,
  },


  // ==================================================
  // PICKUP AND DESTINATION SEARCH
  // ==================================================

  tripSearchCard: {
    marginHorizontal: 18,
    marginTop: 14,
    marginBottom: 2,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2EAF0',
    elevation: 3,
  },

  tripSearchTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16324F',
    marginBottom: 18,
  },

  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#667788',
    marginBottom: 7,
    letterSpacing: 0.8,
  },

  locationInputRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCE5EC',
    borderRadius: 11,
    paddingHorizontal: 12,
    backgroundColor: '#FAFCFE',
  },

  locationIcon: {
    fontSize: 17,
    marginRight: 10,
  },

  destinationIcon: {
    fontSize: 15,
    color: '#E05252',
    marginHorizontal: 3,
    marginRight: 12,
  },

  locationInput: {
    flex: 1,
    minHeight: 46,
    fontSize: 13,
    color: '#233548',
    paddingVertical: 8,
  },

  currentLocationButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 2,
  },

  currentLocationButtonText: {
    color: '#1565C0',
    fontSize: 12,
    fontWeight: '700',
  },

  fieldDivider: {
    height: 1,
    backgroundColor: '#EDF1F5',
    marginVertical: 13,
  },

  searchStatus: {
    color: '#667788',
    fontSize: 12,
    marginTop: 10,
  },

  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F5',
  },

  suggestionIcon: {
    marginRight: 10,
    fontSize: 15,
  },

  suggestionText: {
    flex: 1,
    color: '#263746',
    fontSize: 12,
  },

  // ==================================================
  // MAP
  // ==================================================

  mapSection: {
    marginHorizontal: 18,
    marginTop: 12,
    height: 330,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#DCEAF2',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#D7E2E9',
  },


  // ==================================================
  // PASSENGER MARKER
  // ==================================================

  passengerMarkerOverlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 44,
    height: 44,
    marginLeft: -22,
    marginTop: -22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },

  passengerMarkerOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1565C0',
    elevation: 6,
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  passengerMarkerInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1565C0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },


  // ==================================================
  // LIVE BADGE
  // ==================================================

  liveBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    zIndex: 60,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  liveText: {
    fontSize: 10,
    fontWeight: '800',
  },


  // ==================================================
  // TRO-TRO COUNT
  // ==================================================

  countBadge: {
    position: 'absolute',
    right: 14,
    top: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 3,
    zIndex: 60,
  },

  countNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0D47A1',
    textAlign: 'center',
  },

  countText: {
    fontSize: 9,
    color: '#666666',
  },


  // ==================================================
  // SELECTED TRO-TRO CARD
  // ==================================================

  selectedCard: {
    marginHorizontal: 18,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    elevation: 4,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  busCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  busLetter: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  cardTitle: {
    flex: 1,
    marginLeft: 10,
  },

  trotroName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0D47A1',
  },

  routeText: {
    marginTop: 3,
    fontSize: 12,
    color: '#666666',
  },

  closeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#777777',
    padding: 5,
  },

  favoriteToggle: {
    minWidth: 34,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },

  favoriteToggleText: {
    fontSize: 27,
    color: '#7A8793',
  },

  favoriteToggleTextSaved: {
    color: '#F5A623',
  },


  // ==================================================
  // ETA
  // ==================================================

  etaBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F1F8FE',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  etaLabel: {
    fontSize: 11,
    color: '#666666',
  },

  etaValue: {
    marginTop: 2,
    fontSize: 23,
    fontWeight: '800',
    color: '#1565C0',
  },

  liveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  liveStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00A859',
    marginRight: 5,
  },

  liveStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00A859',
  },


  // ==================================================
  // INFO
  // ==================================================

  infoRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  infoText: {
    fontSize: 12,
    color: '#555555',
  },


  // ==================================================
  // REQUEST BUTTON
  // ==================================================

  requestButton: {
    marginTop: 12,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  requestText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },


  // ==================================================
  // SAVED TRIPS / FAVOURITES
  // ==================================================

  savedPanel: {
    marginHorizontal: 18,
    marginTop: 12,
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2EAF0',
  },

  savedPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  savedPanelTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#16324F',
  },

  panelCloseButton: {
    paddingLeft: 10,
  },

  savedList: {
    gap: 10,
  },

  emptySavedText: {
    paddingVertical: 10,
    color: '#667788',
    fontSize: 13,
    lineHeight: 19,
  },

  savedItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E5EDF3',
  },

  savedItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D47A1',
    marginBottom: 4,
  },

  savedItemText: {
    fontSize: 12,
    color: '#4D5D6B',
    marginTop: 3,
  },

  savedItemDate: {
    fontSize: 10,
    color: '#7B8791',
    marginTop: 7,
  },

  savedItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },

  savedActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1565C0',
  },

  savedActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  removeFavoriteButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFF1F0',
  },

  removeFavoriteText: {
    color: '#B42318',
    fontSize: 11,
    fontWeight: '700',
  },

  // ==================================================
  // BOTTOM ACTIONS
  // ==================================================

  bottomPanel: {
    minHeight: 82,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },

  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },

  actionButtonActive: {
    opacity: 0.75,
  },

  actionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF4FC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionIcon: {
    fontSize: 20,
  },

  actionText: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#555555',
  },

});