import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const setOffMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  /*
   * Green Set-Off marker
   */
  const createSetOffIcon = () =>
    L.divIcon({
      className: 'flap-map-marker',
      html: `
        <div style="
          width: 34px;
          height: 34px;
          border-radius: 50% 50% 50% 0;
          background: #16834d;
          border: 3px solid #ffffff;
          box-shadow: 0 3px 10px rgba(0,0,0,0.35);
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #ffffff;
          "></div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34],
    });

  /*
   * Red Destination marker
   */
  const createDestinationIcon = () =>
    L.divIcon({
      className: 'flap-map-marker',
      html: `
        <div style="
          width: 34px;
          height: 34px;
          border-radius: 50% 50% 50% 0;
          background: #d32f2f;
          border: 3px solid #ffffff;
          box-shadow: 0 3px 10px rgba(0,0,0,0.35);
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #ffffff;
          "></div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34],
    });

  /*
   * Blue live TroTro marker
   */
  const createDriverIcon = () =>
    L.divIcon({
      className: 'flap-driver-marker',
      html: `
        <div style="
          position: relative;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: rgba(21,101,192,0.18);
            animation: flapPulse 1.8s infinite;
          "></div>

          <div style="
            position: relative;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: #1565c0;
            border: 4px solid #ffffff;
            box-shadow: 0 3px 12px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
          ">
            🚐
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24],
    });

  /*
   * Create map.
   */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([5.6037, -0.1870], 12);

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }
    ).addTo(map);

    mapRef.current = map;

    /*
     * Leaflet sometimes needs a size refresh when
     * rendered inside an Expo/React Native container.
     */
    setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => {
      map.remove();
      mapRef.current = null;

      setOffMarkerRef.current = null;
      destinationMarkerRef.current = null;
      driverMarkerRef.current = null;
      routeLineRef.current = null;
    };
  }, []);

  /*
   * Draw Set-Off, Destination and route.
   */
  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    /*
     * Remove previous Set-Off marker.
     */
    if (setOffMarkerRef.current) {
      setOffMarkerRef.current.remove();
      setOffMarkerRef.current = null;
    }

    /*
     * Remove previous Destination marker.
     */
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    /*
     * Remove previous route.
     */
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    /*
     * Green Set-Off marker.
     */
    if (setOffPoint) {
      setOffMarkerRef.current = L.marker(
        [
          setOffPoint.latitude,
          setOffPoint.longitude,
        ],
        {
          icon: createSetOffIcon(),
          zIndexOffset: 500,
        }
      )
        .addTo(map)
        .bindPopup(`
          <div style="font-family: Arial, sans-serif;">
            <strong style="color:#16834d;">
              Set-Off Point
            </strong>
            <br/>
            <span>
              ${setOffPoint.name || 'Selected starting point'}
            </span>
          </div>
        `);
    }

    /*
     * Red Destination marker.
     */
    if (destination) {
      destinationMarkerRef.current = L.marker(
        [
          destination.latitude,
          destination.longitude,
        ],
        {
          icon: createDestinationIcon(),
          zIndexOffset: 500,
        }
      )
        .addTo(map)
        .bindPopup(`
          <div style="font-family: Arial, sans-serif;">
            <strong style="color:#d32f2f;">
              Final Destination
            </strong>
            <br/>
            <span>
              ${destination.name || 'Selected destination'}
            </span>
          </div>
        `);
    }

    /*
     * Route line between Set-Off and Destination.
     */
    if (setOffPoint && destination) {
      routeLineRef.current = L.polyline(
        [
          [
            setOffPoint.latitude,
            setOffPoint.longitude,
          ],
          [
            destination.latitude,
            destination.longitude,
          ],
        ],
        {
          color: '#16834d',
          weight: 6,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round',
        }
      ).addTo(map);

      /*
       * Keep the route visible on the map.
       */
      const bounds = L.latLngBounds([
        [
          setOffPoint.latitude,
          setOffPoint.longitude,
        ],
        [
          destination.latitude,
          destination.longitude,
        ],
      ]);

      /*
       * If a live TroTro already exists, include it
       * in the map bounds too.
       */
      if (driverLocation) {
        bounds.extend([
          driverLocation.latitude,
          driverLocation.longitude,
        ]);
      }

      map.fitBounds(bounds, {
        padding: [55, 55],
        maxZoom: 14,
        animate: true,
      });
    } else if (setOffPoint) {
      map.setView(
        [
          setOffPoint.latitude,
          setOffPoint.longitude,
        ],
        14,
        {
          animate: true,
        }
      );
    } else if (destination) {
      map.setView(
        [
          destination.latitude,
          destination.longitude,
        ],
        14,
        {
          animate: true,
        }
      );
    }
  }, [setOffPoint, destination]);

  /*
   * Live TroTro location.
   */
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !driverLocation) {
      return;
    }

    const position: [number, number] = [
      driverLocation.latitude,
      driverLocation.longitude,
    ];

    /*
     * Create the live TroTro marker once.
     */
    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker(position, {
        icon: createDriverIcon(),
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: Arial, sans-serif;">
            <strong style="color:#1565c0;">
              Your TroTro
            </strong>
            <br/>
            <span>
              Broadcasting live location
            </span>
          </div>
        `);
    } else {
      /*
       * Smoothly update its position.
       */
      driverMarkerRef.current.setLatLng(position);
    }

    /*
     * Keep the live vehicle visible.
     */
    map.panTo(position, {
      animate: true,
      duration: 0.8,
    });
  }, [driverLocation]);

  return (
    <View style={styles.container}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />

      <style>
        {`
          @keyframes flapPulse {
            0% {
              transform: scale(0.75);
              opacity: 0.85;
            }

            70% {
              transform: scale(1.35);
              opacity: 0;
            }

            100% {
              transform: scale(1.35);
              opacity: 0;
            }
          }

          .flap-map-marker,
          .flap-driver-marker {
            background: transparent !important;
            border: none !important;
          }
        `}
      </style>
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
});

