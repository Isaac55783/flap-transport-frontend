import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';

type Destination = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type Props = {
  navigation: any;
};

export default function SearchScreen({ navigation }: Props) {
  const [searchText, setSearchText] = useState('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);

  /*
   * =========================================================
   * SEARCH PLACES
   * =========================================================
   */

  const searchPlaces = async (query: string) => {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      setDestinations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let places: any[] = [];

      /*
       * -------------------------------------------------------
       * FIRST SEARCH: NOMINATIM
       * -------------------------------------------------------
       */

      const nominatimUrl =
        'https://nominatim.openstreetmap.org/search' +
        `?format=jsonv2` +
        `&q=${encodeURIComponent(cleanQuery + ', Ghana')}` +
        `&countrycodes=gh` +
        `&limit=10` +
        `&addressdetails=1` +
        `&accept-language=en`;

      try {
        const response = await fetch(nominatimUrl);

        if (response.ok) {
          const json = await response.json();

          if (Array.isArray(json)) {
            places = json;
          }
        } else {
          console.warn(
            'Nominatim returned status:',
            response.status
          );
        }
      } catch (error) {
        console.warn(
          'Nominatim request failed:',
          error
        );
      }

      /*
       * -------------------------------------------------------
       * FALLBACK SEARCH: PHOTON
       * -------------------------------------------------------
       */

      if (places.length === 0) {
        const photonUrl =
          'https://photon.komoot.io/api/' +
          `?q=${encodeURIComponent(cleanQuery + ', Ghana')}` +
          `&limit=10` +
          `&lang=en`;

        try {
          const response = await fetch(photonUrl);

          if (response.ok) {
            const json = await response.json();

            if (
              json &&
              Array.isArray(json.features)
            ) {
              places = json.features.map(
                (feature: any, index: number) => {
                  const coordinates =
                    feature.geometry?.coordinates || [];

                  const properties =
                    feature.properties || {};

                  const name =
                    properties.name ||
                    properties.street ||
                    properties.city ||
                    'Destination';

                  const addressParts = [
                    properties.name,
                    properties.street,
                    properties.city,
                    properties.state,
                    properties.country,
                  ].filter(Boolean);

                  return {
                    place_id:
                      `photon-${index}-${coordinates.join('-')}`,

                    name,

                    display_name:
                      addressParts.join(', '),

                    lat: coordinates[1],

                    lon: coordinates[0],
                  };
                }
              );
            }
          }
        } catch (error) {
          console.warn(
            'Photon request failed:',
            error
          );
        }
      }

      /*
       * -------------------------------------------------------
       * CONVERT RESULTS
       * -------------------------------------------------------
       */

      const results: Destination[] = places
        .map((place: any, index: number) => {
          const latitude = Number(place.lat);
          const longitude = Number(place.lon);

          return {
            id: String(
              place.place_id ||
              `destination-${index}`
            ),

            name:
              place.name ||
              place.display_name?.split(',')[0] ||
              'Unknown destination',

            address:
              place.display_name ||
              '',

            latitude,

            longitude,
          };
        })
        .filter(
          (place: Destination) =>
            Number.isFinite(place.latitude) &&
            Number.isFinite(place.longitude)
        );

      setDestinations(results);
    } catch (error) {
      console.error(
        'Destination search error:',
        error
      );

      setDestinations([]);
    } finally {
      setLoading(false);
    }
  };

  /*
   * =========================================================
   * SEARCH WHILE TYPING
   * =========================================================
   */

  useEffect(() => {
    const query = searchText.trim();

    if (query.length < 2) {
      setDestinations([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      searchPlaces(query);
    }, 700);

    return () => {
      clearTimeout(timer);
    };
  }, [searchText]);

  /*
   * =========================================================
   * SELECT DESTINATION
   * =========================================================
   */

  const selectDestination = (
    destination: Destination
  ) => {
    setSearchText(destination.name);
    setDestinations([]);

    navigation.navigate(
      'PassengerDashboard',
      {
        selectedDestination: {
          id: destination.id,
          name: destination.name,
          address: destination.address,
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
      }
    );
  };

  /*
   * =========================================================
   * MANUAL SEARCH
   * =========================================================
   */

  const handleSearch = () => {
    const query = searchText.trim();

    if (query.length < 2) {
      return;
    }

    searchPlaces(query);
  };

  /*
   * =========================================================
   * RENDER DESTINATION
   * =========================================================
   */

  const renderDestination = ({
    item,
  }: {
    item: Destination;
  }) => (
    <TouchableOpacity
      style={styles.resultItem}
      activeOpacity={0.7}
      onPress={() =>
        selectDestination(item)
      }
    >
      <View style={styles.locationIcon}>
        <Text style={styles.locationIconText}>
          📍
        </Text>
      </View>

      <View style={styles.resultTextContainer}>
        <Text
          style={styles.resultName}
          numberOfLines={1}
        >
          {item.name}
        </Text>

        <Text
          style={styles.resultAddress}
          numberOfLines={2}
        >
          {item.address}
        </Text>
      </View>
    </TouchableOpacity>
  );

  /*
   * =========================================================
   * SCREEN
   * =========================================================
   */

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            Search Destination
          </Text>
        </View>

        {/* SEARCH BOX */}

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>
            🔍
          </Text>

          <TextInput
            style={styles.input}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search destination in Ghana"
            placeholderTextColor="#888"
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />

          {searchText.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              activeOpacity={0.7}
              onPress={() => {
                setSearchText('');
                setDestinations([]);
              }}
            >
              <Text style={styles.clearText}>
                ×
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SEARCH BUTTON */}

        <TouchableOpacity
          style={styles.searchButton}
          activeOpacity={0.8}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.searchButtonText}>
              Search
            </Text>
          )}
        </TouchableOpacity>

        {/* LOADING */}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="small"
              color="#1565C0"
            />

            <Text style={styles.loadingText}>
              Searching Ghana...
            </Text>
          </View>
        )}

        {/* RESULTS */}

        {!loading &&
          destinations.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>
                Destinations
              </Text>

              <FlatList
                data={destinations}
                keyExtractor={(item) =>
                  item.id
                }
                renderItem={
                  renderDestination
                }
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}

        {/* NO RESULTS */}

        {!loading &&
          searchText.trim().length >= 2 &&
          destinations.length === 0 && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsIcon}>
                📍
              </Text>

              <Text style={styles.noResultsTitle}>
                No destination found
              </Text>

              <Text style={styles.noResultsText}>
                Try searching for a street,
                landmark, school, station,
                neighbourhood, or place in Ghana.
              </Text>
            </View>
          )}

        {/* INITIAL MESSAGE */}

        {!loading &&
          searchText.trim().length < 2 && (
            <View style={styles.initialContainer}>
              <Text style={styles.initialIcon}>
                🗺️
              </Text>

              <Text style={styles.initialTitle}>
                Where are you going?
              </Text>

              <Text style={styles.initialText}>
                Search for a destination in Ghana
                to continue.
              </Text>
            </View>
          )}
      </View>
    </SafeAreaView>
  );
}

/*
 * ===========================================================
 * STYLES
 * ===========================================================
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },

  backText: {
    fontSize: 34,
    lineHeight: 36,
    color: '#222222',
    marginTop: -4,
  },

  title: {
    fontSize: 21,
    fontWeight: '700',
    color: '#111111',
  },

  searchContainer: {
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },

  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#222222',
  },

  clearButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  clearText: {
    fontSize: 28,
    color: '#777777',
    lineHeight: 30,
  },

  searchButton: {
    height: 52,
    backgroundColor: '#1565C0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },

  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },

  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666666',
  },

  resultsContainer: {
    flex: 1,
    marginTop: 20,
  },

  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 10,
  },

  resultItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  locationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E8F1FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  locationIconText: {
    fontSize: 20,
  },

  resultTextContainer: {
    flex: 1,
  },

  resultName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 4,
  },

  resultAddress: {
    fontSize: 13,
    color: '#777777',
    lineHeight: 18,
  },

  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 70,
  },

  noResultsIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  noResultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 8,
  },

  noResultsText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#777777',
    lineHeight: 21,
  },

  initialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 80,
  },

  initialIcon: {
    fontSize: 46,
    marginBottom: 14,
  },

  initialTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 8,
  },

  initialText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#777777',
    lineHeight: 21,
  },
});