import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
} from 'react-native-maps';

type LocationPoint = {
  latitude: number;
  longitude: number;
  name?: string;
};

type DriverMapProps = {
  setOffPoint: LocationPoint | null;
  destination: LocationPoint | null;
  driverLocation?: {
    latitude: number;
    longitude: number;
  } | null;
};

export default function DriverMap({
  setOffPoint,
  destination,
  driverLocation,
}: DriverMapProps) {
  const mapRef = React.useRef<MapView>(null);

  /*
   * Fit the map around the planned route.
   */
  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (setOffPoint && destination) {
      mapRef.current.fitToCoordinates(
        [
          {
            latitude: setOffPoint.latitude,
            longitude: setOffPoint.longitude,
          },
          {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        ],
        {
          edgePadding: {
            top: 70,
            right: 70,
            bottom: 70,
            left: 70,
          },
          animated: true,
        }
      );
    } else if (setOffPoint) {
      mapRef.current.animateToRegion({
        latitude: setOffPoint.latitude,
        longitude: setOffPoint.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      });
    } else if (destination) {
      mapRef.current.animateToRegion({
        latitude: destination.latitude,
        longitude: destination.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      });
    }
  }, [setOffPoint, destination]);

  /*
   * Follow the live TroTro position once broadcasting starts.
   */
  useEffect(() => {
    if (!mapRef.current || !driverLocation) {
      return;
    }

    mapRef.current.animateToRegion(
      {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      },
      1000
    );
  }, [driverLocation]);

  const defaultRegion = {
    latitude: 5.6037,
    longitude: -0.1870,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  };

  const routeCoordinates =
    setOffPoint && destination
      ? [
          {
            latitude: setOffPoint.latitude,
            longitude: setOffPoint.longitude,
          },
          {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        ]
      : [];

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={defaultRegion}
      >
        {setOffPoint && (
          <Marker
            coordinate={{
              latitude: setOffPoint.latitude,
              longitude: setOffPoint.longitude,
            }}
            title="Set-off Point"
            description={setOffPoint.name}
            pinColor="#1B5E20"
          />
        )}

        {destination && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title="Final Destination"
            description={destination.name}
            pinColor="#D32F2F"
          />
        )}

        {routeCoordinates.length === 2 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#1B5E20"
            strokeWidth={5}
          />
        )}

        {driverLocation && (
          <Marker
            coordinate={{
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
            }}
            title="Your TroTro"
            description="Broadcasting live location"
            pinColor="#1565C0"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },

  map: {
    width: '100%',
    height: '100%',
  },
});