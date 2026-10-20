import React, { useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';


export default function AuthChoiceScreen({
  navigation,
}: any) {

  const [selectedRole, setSelectedRole] = useState<
    'passenger' | 'driver' | null
  >(null);


  // =====================================================
  // SELECT ROLE
  // =====================================================

  const handleRoleSelect = (
    role: 'passenger' | 'driver'
  ) => {

    setSelectedRole(role);

  };


  // =====================================================
  // CREATE ACCOUNT
  // =====================================================

  const handleCreateAccount = () => {

    if (!selectedRole) {
      return;
    }

    if (selectedRole === 'passenger') {

      navigation.navigate(
        'PassengerRegister'
      );

    } else {

      navigation.navigate(
        'DriverRegister'
      );

    }

  };


  // =====================================================
  // SIGN IN
  // =====================================================

  const handleSignIn = () => {

    if (!selectedRole) {
      return;
    }

    navigation.navigate(
      'Login',
      {
        role: selectedRole,
      }
    );

  };


  // =====================================================
  // SCREEN
  // =====================================================

  return (

    <SafeAreaView style={styles.container}>

      {/* BACK BUTTON */}

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >

        <Text style={styles.backText}>
          ← Back
        </Text>

      </TouchableOpacity>


      {/* TITLE */}

      <Text style={styles.title}>
        Choose Your Role
      </Text>


      <Text style={styles.subtitle}>
        Select how you want to use Flap Transport
      </Text>


      {/* PASSENGER */}

      <TouchableOpacity
        style={[
          styles.card,
          selectedRole === 'passenger' &&
            styles.selectedCard,
        ]}
        onPress={() =>
          handleRoleSelect('passenger')
        }
        activeOpacity={0.8}
      >

        <Text style={styles.cardTitle}>
          Passenger
        </Text>

        <Text style={styles.cardDescription}>
          Book rides and travel easily.
        </Text>


        {selectedRole === 'passenger' && (

          <Text style={styles.selectedText}>
            ✓ Passenger selected
          </Text>

        )}

      </TouchableOpacity>


      {/* DRIVER */}

      <TouchableOpacity
        style={[
          styles.card,
          selectedRole === 'driver' &&
            styles.selectedCard,
        ]}
        onPress={() =>
          handleRoleSelect('driver')
        }
        activeOpacity={0.8}
      >

        <Text style={styles.cardTitle}>
          Driver
        </Text>

        <Text style={styles.cardDescription}>
          Register your vehicle and receive
          passengers.
        </Text>


        {selectedRole === 'driver' && (

          <Text style={styles.selectedText}>
            ✓ Driver selected
          </Text>

        )}

      </TouchableOpacity>


      {/* CREATE ACCOUNT */}

      {selectedRole && (

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateAccount}
          activeOpacity={0.8}
        >

          <Text style={styles.createText}>
            Create {selectedRole === 'passenger'
              ? 'Passenger'
              : 'Driver'} Account
          </Text>

        </TouchableOpacity>

      )}


      {/* SIGN IN */}

      {selectedRole && (

        <View style={styles.signInContainer}>

          <Text style={styles.signInQuestion}>
            Already have an account?
          </Text>


          <TouchableOpacity
            onPress={handleSignIn}
            activeOpacity={0.7}
          >

            <Text style={styles.loginText}>
              Sign In as {selectedRole === 'passenger'
                ? 'Passenger'
                : 'Driver'}
            </Text>

          </TouchableOpacity>

        </View>

      )}

    </SafeAreaView>

  );

}


// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F4F8FB',
    padding: 24,
    justifyContent: 'center',
  },


  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },


  backText: {
    fontSize: 16,
    color: '#1565C0',
    fontWeight: '600',
  },


  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0D47A1',
    marginBottom: 10,
  },


  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 35,
    fontSize: 16,
  },


  card: {
    backgroundColor: '#1565C0',
    borderRadius: 18,
    padding: 25,
    marginBottom: 20,
    elevation: 4,
    borderWidth: 3,
    borderColor: 'transparent',
  },


  selectedCard: {
    borderColor: '#00A859',
    backgroundColor: '#0D5CB8',
  },


  cardTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },


  cardDescription: {
    color: 'white',
    fontSize: 15,
  },


  selectedText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 12,
  },


  createButton: {
    backgroundColor: '#00A859',
    borderRadius: 12,
    padding: 17,
    marginTop: 5,
    alignItems: 'center',
  },


  createText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 17,
  },


  signInContainer: {
    marginTop: 22,
    alignItems: 'center',
  },


  signInQuestion: {
    color: '#666',
    fontSize: 15,
    marginBottom: 5,
  },


  loginText: {
    color: '#1565C0',
    fontWeight: 'bold',
    fontSize: 17,
  },

});

