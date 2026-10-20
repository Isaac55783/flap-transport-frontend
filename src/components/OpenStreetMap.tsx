import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  StyleSheet,
} from 'react-native';

import L from 'leaflet';

import 'leaflet/dist/leaflet.css';


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


type SelectedLocation = {
  latitude: number;
  longitude: number;
  address: string;
};


type Props = {
  latitude?: number;
  longitude?: number;
  troTros: TroTro[];
  onSelectTroTro?: (tro: TroTro) => void;
  onLocationSelect?: (
    location: SelectedLocation
  ) => void;
};


// ==================================================
// DEFAULT LOCATION
// ==================================================

const DEFAULT_LATITUDE = 5.6037;
const DEFAULT_LONGITUDE = -0.1870;


// ==================================================
// MAP
// ==================================================

export default function OpenStreetMap({
  latitude,
  longitude,
  troTros,
  onSelectTroTro,
  onLocationSelect,
}: Props) {

  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<L.Map | null>(null);

  const resizeObserverRef =
    useRef<ResizeObserver | null>(null);

  const intersectionObserverRef =
    useRef<IntersectionObserver | null>(null);

  const userMarkerRef =
    useRef<L.Marker | null>(null);

  const pickerMarkerRef =
    useRef<L.Marker | null>(null);

  const trotroMarkersRef =
    useRef<Record<number, L.Marker>>({});


  // ==================================================
  // SELECTED LOCATION STATE
  // ==================================================

  const [selectedAddress, setSelectedAddress] =
    useState('');


  // ==================================================
  // MAP INITIALIZATION
  // ==================================================

  useEffect(() => {

    const container =
      containerRef.current;

    if (
      !container ||
      mapRef.current
    ) {
      return;
    }


    const map =
      L.map(container, {
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
      });


    mapRef.current = map;


    // ==================================================
    // OPENSTREETMAP TILES
    // ==================================================

    const tileLayer =
      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          minZoom: 2,

          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',

          crossOrigin: true,
        }
      );


    tileLayer.addTo(map);


    // ==================================================
    // DEFAULT MAP VIEW
    // ==================================================

    map.setView(
      [
        DEFAULT_LATITUDE,
        DEFAULT_LONGITUDE,
      ],
      13
    );


    // ==================================================
    // TILE ERROR
    // ==================================================

    tileLayer.on(
      'tileerror',
      (event) => {

        console.error(
          'OpenStreetMap tile failed to load:',
          event
        );

      }
    );


    // ==================================================
    // MAP READY
    // ==================================================

    map.whenReady(() => {

      console.log(
        'Leaflet map loaded successfully.'
      );


      requestAnimationFrame(() => {
        map.invalidateSize(false);
      });


      window.setTimeout(() => {
        map.invalidateSize(false);
      }, 300);


      window.setTimeout(() => {
        map.invalidateSize(false);
      }, 1000);

    });


    // ==================================================
    // MAP CLICK
    // ==================================================

    map.on(
      'click',
      async (event) => {

        const lat =
          event.latlng.lat;

        const lng =
          event.latlng.lng;


        await selectLocation(
          lat,
          lng
        );

      }
    );


    // ==================================================
    // RESIZE MAP
    // ==================================================

    const resizeMap = () => {

      requestAnimationFrame(() => {

        if (
          mapRef.current === map
        ) {

          map.invalidateSize(false);

        }

      });

    };


    // ==================================================
    // RESIZE OBSERVER
    // ==================================================

    if (
      typeof ResizeObserver !==
      'undefined'
    ) {

      const resizeObserver =
        new ResizeObserver(() => {
          resizeMap();
        });


      resizeObserver.observe(
        container
      );


      resizeObserverRef.current =
        resizeObserver;

    }


    // ==================================================
    // INTERSECTION OBSERVER
    // ==================================================

    if (
      typeof IntersectionObserver !==
      'undefined'
    ) {

      const intersectionObserver =
        new IntersectionObserver(
          (entries) => {

            const entry =
              entries[0];


            if (
              entry &&
              entry.isIntersecting
            ) {

              resizeMap();

            }

          },
          {
            threshold: 0.01,
          }
        );


      intersectionObserver.observe(
        container
      );


      intersectionObserverRef.current =
        intersectionObserver;

    }


    // ==================================================
    // WINDOW RESIZE
    // ==================================================

    window.addEventListener(
      'resize',
      resizeMap
    );


    resizeMap();


    const timer1 =
      window.setTimeout(
        resizeMap,
        300
      );


    const timer2 =
      window.setTimeout(
        resizeMap,
        1000
      );


    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {

      window.clearTimeout(
        timer1
      );

      window.clearTimeout(
        timer2
      );


      window.removeEventListener(
        'resize',
        resizeMap
      );


      resizeObserverRef.current?.disconnect();

      resizeObserverRef.current =
        null;


      intersectionObserverRef.current?.disconnect();

      intersectionObserverRef.current =
        null;


      Object.values(
        trotroMarkersRef.current
      ).forEach(
        (marker) => {
          marker.remove();
        }
      );


      trotroMarkersRef.current =
        {};


      userMarkerRef.current?.remove();

      userMarkerRef.current =
        null;


      pickerMarkerRef.current?.remove();

      pickerMarkerRef.current =
        null;


      map.remove();

      mapRef.current =
        null;

    };

  }, []);


  // ==================================================
  // REVERSE GEOCODING
  // ==================================================

  const reverseGeocode =
    async (
      lat: number,
      lng: number
    ) => {

      try {

        const url =
          `https://nominatim.openstreetmap.org/reverse` +
          `?format=jsonv2` +
          `&lat=${lat}` +
          `&lon=${lng}`;


        const response =
          await fetch(
            url,
            {
              headers: {
                Accept:
                  'application/json',
              },
            }
          );


        if (!response.ok) {
          return '';
        }


        const data =
          await response.json();


        return (
          data.display_name ||
          ''
        );

      } catch (error) {

        console.error(
          'Reverse geocoding failed:',
          error
        );


        return '';

      }

    };


  // ==================================================
  // CREATE PICKER MARKER
  // ==================================================

  const createPickerMarker =
    (
      lat: number,
      lng: number
    ) => {

      const map =
        mapRef.current;


      if (!map) {
        return;
      }


      if (
        !pickerMarkerRef.current
      ) {

        const icon =
          L.divIcon({

            className:
              'flap-picker-marker',

            html: `
              <div style="
                width:28px;
                height:28px;
                background:#1565C0;
                border:4px solid white;
                border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                box-shadow:0 3px 10px rgba(0,0,0,.4);
              ">
                <div style="
                  width:8px;
                  height:8px;
                  background:white;
                  border-radius:50%;
                  margin:6px;
                "></div>
              </div>
            `,

            iconSize: [
              28,
              28,
            ],

            iconAnchor: [
              14,
              28,
            ],

          });


        pickerMarkerRef.current =
          L.marker(
            [
              lat,
              lng,
            ],
            {
              icon,
              draggable: true,
            }
          ).addTo(map);


        pickerMarkerRef.current.on(
          'dragend',
          async () => {

            const marker =
              pickerMarkerRef.current;


            if (!marker) {
              return;
            }


            const position =
              marker.getLatLng();


            const address =
              await reverseGeocode(
                position.lat,
                position.lng
              );


            setSelectedAddress(
              address
            );


            onLocationSelect?.({
              latitude:
                position.lat,

              longitude:
                position.lng,

              address,
            });

          }
        );


      } else {

        pickerMarkerRef.current.setLatLng(
          [
            lat,
            lng,
          ]
        );

      }


      map.setView(
        [
          lat,
          lng,
        ],
        Math.max(
          map.getZoom(),
          15
        ),
        {
          animate: true,
        }
      );

    };


  // ==================================================
  // SELECT LOCATION
  // ==================================================

  const selectLocation =
    async (
      lat: number,
      lng: number
    ) => {

      createPickerMarker(
        lat,
        lng
      );


      const address =
        await reverseGeocode(
          lat,
          lng
        );


      setSelectedAddress(
        address
      );


      onLocationSelect?.({
        latitude: lat,
        longitude: lng,
        address,
      });

    };


  // ==================================================
  // USE MY LOCATION
  // ==================================================

  const useMyLocation =
    () => {

      if (
        typeof navigator ===
          'undefined' ||
        !navigator.geolocation
      ) {

        alert(
          'Location services are not supported on this device.'
        );

        return;

      }


      navigator.geolocation.getCurrentPosition(

        async (position) => {

          const lat =
            position.coords.latitude;

          const lng =
            position.coords.longitude;


          await selectLocation(
            lat,
            lng
          );

        },


        (error) => {

          console.error(
            'GPS error:',
            error
          );


          alert(
            'Unable to get your current location. Please allow location access.'
          );

        },


        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }

      );

    };


  // ==================================================
  // USER LOCATION MARKER
  // ==================================================

  useEffect(() => {

    const map =
      mapRef.current;


    if (
      !map ||
      latitude == null ||
      longitude == null
    ) {

      return;

    }


    const position:
      L.LatLngExpression = [
        latitude,
        longitude,
      ];


    if (
      !userMarkerRef.current
    ) {

      const icon =
        L.divIcon({

          className:
            'flap-user-marker',

          html: `
            <div style="
              width:20px;
              height:20px;
              background:#1565C0;
              border:4px solid white;
              border-radius:50%;
              box-shadow:0 2px 8px rgba(0,0,0,.35);
            "></div>
          `,

          iconSize: [
            20,
            20,
          ],

          iconAnchor: [
            10,
            10,
          ],

        });


      userMarkerRef.current =
        L.marker(
          position,
          {
            icon,
          }
        ).addTo(map);


    } else {

      userMarkerRef.current.setLatLng(
        position
      );

    }

  }, [
    latitude,
    longitude,
  ]);


  // ==================================================
  // TRO-TRO MARKERS
  // ==================================================

  useEffect(() => {

    const map =
      mapRef.current;


    if (!map) {
      return;
    }


    const activeIds =
      new Set(
        troTros.map(
          (tro) => tro.id
        )
      );


    // ==================================================
    // REMOVE OLD MARKERS
    // ==================================================

    Object.keys(
      trotroMarkersRef.current
    ).forEach(
      (id) => {

        const numericId =
          Number(id);


        if (
          !activeIds.has(
            numericId
          )
        ) {

          trotroMarkersRef.current[
            numericId
          ]?.remove();


          delete trotroMarkersRef.current[
            numericId
          ];

        }

      }
    );


    // ==================================================
    // CREATE / UPDATE MARKERS
    // ==================================================

    troTros.forEach(
      (tro) => {

        const position:
          L.LatLngExpression = [
            tro.latitude,
            tro.longitude,
          ];


        let marker =
          trotroMarkersRef.current[
            tro.id
          ];


        if (!marker) {

          const icon =
            L.divIcon({

              className:
                'flap-trotro-marker',

              html: `
                <div style="
                  width:38px;
                  height:28px;
                  background:#1565C0;
                  border:3px solid white;
                  border-radius:7px;
                  position:relative;
                  box-shadow:0 3px 8px rgba(0,0,0,.35);
                ">

                  <div style="
                    position:absolute;
                    left:6px;
                    top:5px;
                    width:22px;
                    height:8px;
                    background:#B3E5FC;
                    border-radius:2px;
                  "></div>

                  <div style="
                    position:absolute;
                    left:5px;
                    bottom:-5px;
                    width:9px;
                    height:9px;
                    background:#222;
                    border:2px solid white;
                    border-radius:50%;
                  "></div>

                  <div style="
                    position:absolute;
                    right:5px;
                    bottom:-5px;
                    width:9px;
                    height:9px;
                    background:#222;
                    border:2px solid white;
                    border-radius:50%;
                  "></div>

                </div>
              `,

              iconSize: [
                38,
                28,
              ],

              iconAnchor: [
                19,
                14,
              ],

            });


          marker =
            L.marker(
              position,
              {
                icon,
              }
            ).addTo(map);


          marker.bindTooltip(
            `${tro.name}<br>${tro.route}<br>Seats: ${tro.availableSeats}`,
            {
              direction: 'top',
            }
          );


          marker.on(
            'click',
            () => {

              onSelectTroTro?.(
                tro
              );

            }
          );


          trotroMarkersRef.current[
            tro.id
          ] = marker;


        } else {

          marker.setLatLng(
            position
          );

        }

      }
    );

  }, [
    troTros,
    onSelectTroTro,
  ]);


  // ==================================================
  // RENDER
  // ==================================================

  return (

    <View
      style={styles.container}
    >

      {/* ==================================================
          MAP
      ================================================== */}

      <div
        ref={containerRef}
        className="leaflet-map-container"
        style={styles.map}
      />


      {/* Map controls: location button only; map search removed. */}
      <div
        style={{
          position: 'absolute',
          top: 68,
          right: 12,
          zIndex: 1000,
        }}
      >
        <button
          type="button"
          onClick={useMyLocation}
          style={{
            height: '42px',
            padding: '0 12px',
            border: 'none',
            borderRadius: '8px',
            background: 'white',
            color: '#222',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,.15)',
          }}
        >
          📍 My Location
        </button>

        {selectedAddress && (
          <div
            style={{
              marginTop: '8px',
              padding: '10px 12px',
              background: 'white',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#222',
              boxShadow: '0 2px 8px rgba(0,0,0,.15)',
              maxWidth: 'min(320px, calc(100vw - 48px))',
              boxSizing: 'border-box',
            }}
          >
            📍 {selectedAddress}
          </div>
        )}
      </div>

    </View>

  );
}


// ==================================================
// STYLES
// ==================================================

const styles =
  StyleSheet.create({

    container: {
      width: '100%',
      height: '100%',
      minHeight: 330,
      position: 'relative',
      overflow: 'hidden',
    },


    map: {
      width: '100%',
      height: '100%',
      minHeight: 330,
      position: 'relative',
      backgroundColor: '#e5e5e5',
    } as any,

  });