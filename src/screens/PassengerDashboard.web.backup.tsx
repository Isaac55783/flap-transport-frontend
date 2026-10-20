import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';

import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';

import OpenStreetMap from '../components/OpenStreetMap';

import {
  useAppDispatch,
  useAppSelector,
} from '../store';

import { logout } from '../store/authSlice';

type TroTro = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  route: string;
  availableSeats: number;
  speed?: number;
};

const API_URL = 'http://127.0.0.1:5000';

const DEFAULT_LATITUDE = 5.6037;
const DEFAULT_LONGITUDE = -0.1870;

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
];

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

export default function PassengerDashboard({
  navigation,
}: any) {
  const dispatch = useAppDispatch();

  const user = useAppSelector(
    (state: any) => state.auth.user
  );

  const userName =
    user?.name || 'Passenger';

  const [location, setLocation] =
    useState<Location.LocationObject | null>(
      null
    );

  const [troTros, setTroTros] =
    useState<TroTro[]>(
      initialTroTros
    );

  const [selectedTroTro, setSelectedTroTro] =
    useState<TroTro | null>(null);

  const [eta, setEta] =
    useState<number | null>(null);

  const [socketConnected, setSocketConnected] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    const getLocation = async () => {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          Alert.alert(
            'Location Permission',
            'FLAP needs your location to show nearby tro-tros.'
          );
          return;
        }

        const current =
          await Location.getCurrentPositionAsync({
            accuracy:
              Location.Accuracy.High,
          });

        if (mounted) {
          setLocation(current);
        }
      } catch (error) {
        console.error(
          'Passenger location error:',
          error
        );

        if (mounted) {
          setLocation(null);
        }
      }
    };

    getLocation();

    const interval = setInterval(
      getLocation,
      10000
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const socket: Socket = io(API_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

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
        const exists = current.some(
          (tro) => tro.id === driverId
        );

        if (!exists) {
          return [
            ...current,
            {
              id: driverId,
              name:
                data.name ||
                `TroTro ${driverId}`,
              latitude: newLatitude,
              longitude: newLongitude,
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
                  ? Number(data.speed)
                  : 25,
            },
          ];
        }

        return current.map((tro) => {
          if (tro.id !== driverId) {
            return tro;
          }

          return {
            ...tro,
            latitude: newLatitude,
            longitude: newLongitude,
            speed:
              data.speed != null
                ? Number(data.speed)
                : tro.speed || 25,
            availableSeats:
              data.available_seats != null
                ? Number(
                    data.available_seats
                  )
                : tro.availableSeats,
            route:
              data.route || tro.route,
          };
        });
      });
    };

    socket.on('connect', () => {
      console.log(
        'Passenger connected to live server'
      );

      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      console.log(
        'Passenger disconnected from live server'
      );

      setSocketConnected(false);
    });

    socket.on(
      'location_update',
      handleLocationUpdate
    );

    socket.on(
      'general_location_update',
      handleLocationUpdate
    );

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

  useEffect(() => {
    if (
      !selectedTroTro ||
      !location
    ) {
      setEta(null);
      return;
    }

    const current =
      troTros.find(
        (tro) =>
          tro.id === selectedTroTro.id
      );

    if (!current) {
      setEta(null);
      return;
    }

    const updateEta = () => {
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

  const selectTroTro = useCallback(
    (tro: TroTro) => {
      setSelectedTroTro(tro);
    },
    []
  );

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            console.log(
              'Passenger logging out'
            );

            /*
             * IMPORTANT:
             * Actually clear the Redux
             * authentication state.
             */
            dispatch(logout());

            /*
             * Then return completely
             * to the Welcome screen.
             */
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'Welcome',
                },
              ],
            });
          },
        },
      ]
    );
  };

  const passengerLatitude =
    location?.coords.latitude ??
    DEFAULT_LATITUDE;

  const passengerLongitude =
    location?.coords.longitude ??
    DEFAULT_LONGITUDE;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.container}>

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

        <View
          style={styles.searchContainer}
        >
          <TouchableOpacity
            style={styles.searchBox}
            onPress={() =>
              navigation.navigate(
                'Search'
              )
            }
            activeOpacity={0.8}
          >
            <Text style={styles.searchIcon}>
              🔍
            </Text>

            <Text
              style={styles.searchPlaceholder}
            >
              Where are you going?
            </Text>
          </TouchableOpacity>
        </View>

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

          <View style={styles.liveBadge}>
            <View
              style={[
                styles.liveDot,
                {
                  backgroundColor:
                    socketConnected
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
                    socketConnected
                      ? '#00A859'
                      : '#777777',
                },
              ]}
            >
              {socketConnected
                ? 'LIVE'
                : 'CONNECTING'}
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countNumber}>
              {troTros.length}
            </Text>

            <Text style={styles.countText}>
              tro-tros nearby
            </Text>
          </View>
        </View>

        {selectedTroTro && (
          <View style={styles.selectedCard}>

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
                onPress={() =>
                  setSelectedTroTro(
                    null
                  )
                }
              >
                <Text
                  style={styles.closeText}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.etaBox}>
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
                  style={styles.liveStatusDot}
                />

                <Text
                  style={styles.liveStatusText}
                >
                  LIVE
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoText}>
                {selectedTroTro.availableSeats}{' '}
                seats available
              </Text>

              <Text style={styles.infoText}>
                {Math.round(
                  selectedTroTro.speed ||
                    0
                )}{' '}
                km/h
              </Text>
            </View>

            <TouchableOpacity
              style={styles.requestButton}
              onPress={() =>
                Alert.alert(
                  'Tro-Tro Selected',
                  `You selected ${selectedTroTro.name}.`
                )
              }
            >
              <Text
                style={styles.requestText}
              >
                Request Ride
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!selectedTroTro && (
          <View style={styles.nearbyPanel}>

            <View
              style={styles.panelHeader}
            >
              <Text
                style={styles.panelTitle}
              >
                Tro-tros near you
              </Text>

              <Text
                style={styles.panelSubtitle}
              >
                {socketConnected
                  ? 'Live locations'
                  : 'Waiting for server'}
              </Text>
            </View>

            {troTros
              .slice(0, 5)
              .map((tro) => (
                <TouchableOpacity
                  key={tro.id}
                  style={styles.troTroRow}
                  onPress={() =>
                    selectTroTro(tro)
                  }
                >
                  <View
                    style={styles.smallBus}
                  >
                    <Text
                      style={
                        styles.smallBusText
                      }
                    >
                      T
                    </Text>
                  </View>

                  <View
                    style={
                      styles.rowInfo
                    }
                  >
                    <Text
                      style={
                        styles.rowName
                      }
                    >
                      {tro.name}
                    </Text>

                    <Text
                      style={
                        styles.rowRoute
                      }
                    >
                      {tro.route}
                    </Text>
                  </View>

                  <View
                    style={styles.rowEta}
                  >
                    <Text
                      style={
                        styles.rowEtaValue
                      }
                    >
                      {location
                        ? `${calculateEtaMinutes(
                            passengerLatitude,
                            passengerLongitude,
                            tro
                          )} min`
                        : '--'}
                    </Text>

                    <Text
                      style={
                        styles.rowEtaLabel
                      }
                    >
                      ETA
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        )}

        <View
          style={styles.bottomPanel}
        >
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate(
                'MyTrips'
              )
            }
          >
            <Text
              style={styles.actionIcon}
            >
              🚌
            </Text>

            <Text
              style={styles.actionText}
            >
              My Trips
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate(
                'Favorites'
              )
            }
          >
            <Text
              style={styles.actionIcon}
            >
              ⭐
            </Text>

            <Text
              style={styles.actionText}
            >
              Favorites
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate(
                'Notifications'
              )
            }
          >
            <Text
              style={styles.actionIcon}
            >
              🔔
            </Text>

            <Text
              style={styles.actionText}
            >
              Alerts
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

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

  searchContainer: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },

  searchBox: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F3F5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  searchIcon: {
    width: 32,
    fontSize: 18,
  },

  searchPlaceholder: {
    color: '#777777',
    fontSize: 14,
  },

  mapSection: {
    marginHorizontal: 18,
    marginTop: 4,
    height: 330,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#DCEAF2',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#D7E2E9',
  },

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
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  liveText: {
    fontSize: 11,
    fontWeight: '800',
  },

  countBadge: {
    position: 'absolute',
    right: 14,
    top: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 3,
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

  infoRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  infoText: {
    fontSize: 12,
    color: '#555555',
  },

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

  nearbyPanel: {
    marginHorizontal: 18,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  panelTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#222222',
  },

  panelSubtitle: {
    fontSize: 11,
    color: '#00A859',
    fontWeight: '700',
  },

  troTroRow: {
    minHeight: 55,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
  },

  smallBus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },

  smallBusText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1565C0',
  },

  rowInfo: {
    flex: 1,
    marginLeft: 9,
  },

  rowName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#222222',
  },

  rowRoute: {
    marginTop: 2,
    fontSize: 10,
    color: '#777777',
  },

  rowEta: {
    alignItems: 'flex-end',
  },

  rowEtaValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1565C0',
  },

  rowEtaLabel: {
    fontSize: 9,
    color: '#888888',
  },

  bottomPanel: {
    minHeight: 75,
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

  actionIcon: {
    fontSize: 20,
  },

  actionText: {
    marginTop: 4,
    fontSize: 10,
    color: '#555555',
  },
});
