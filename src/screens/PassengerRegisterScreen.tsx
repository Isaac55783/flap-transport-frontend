import React, { useState } from 'react';

import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { apiService } from '../services/api';

export default function PassengerRegisterScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ---------------------------------------
  // VALIDATE GHANA PHONE NUMBER
  // ---------------------------------------
  const validatePhone = (num: string) => {
    const cleanNum = num.replace(/\s+/g, '');

    const phoneRegex = /^(?:\+233|0)[235][0-9]{8}$/;

    return phoneRegex.test(cleanNum);
  };

  // ---------------------------------------
  // FORMAT GHANA PHONE NUMBER
  // ---------------------------------------
  const formatGhanaPhone = (num: string) => {
    const cleanNum = num.replace(/\s+/g, '');

    if (cleanNum.startsWith('0')) {
      return '+233' + cleanNum.substring(1);
    }

    if (cleanNum.startsWith('233')) {
      return '+' + cleanNum;
    }

    return cleanNum;
  };

  // ---------------------------------------
  // REGISTER PASSENGER
  // ---------------------------------------
  const handleContinue = async () => {
    if (isLoading) {
      return;
    }

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();
    const cleanDob = dob.trim();
    const cleanEmergencyContact = emergencyContact.trim();

    // ---------------------------------------
    // VALIDATION
    // ---------------------------------------

    if (!cleanName) {
      Alert.alert(
        'Required Field',
        'Please enter your full name.'
      );
      return;
    }

    if (!cleanPhone) {
      Alert.alert(
        'Required Field',
        'Please enter your phone number.'
      );
      return;
    }

    if (!validatePhone(cleanPhone)) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid Ghana phone number, for example 0244123456 or +233244123456.'
      );
      return;
    }

    if (!cleanEmail) {
      Alert.alert(
        'Required Field',
        'Please enter your email address.'
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      Alert.alert(
        'Invalid Email',
        'Please enter a valid email address.'
      );
      return;
    }

    if (!cleanDob) {
      Alert.alert(
        'Required Field',
        'Please enter your date of birth.'
      );
      return;
    }

    const formattedPhone = formatGhanaPhone(cleanPhone);

    setIsLoading(true);

    try {
      // ---------------------------------------
      // STEP 1: REGISTER PASSENGER
      // ---------------------------------------

      try {
        const registrationResponse =
          await apiService.registerPassenger(
            cleanName,
            formattedPhone
          );

        console.log(
          'Passenger registration successful:',
          registrationResponse
        );
      } catch (registrationError: any) {
        const status =
          registrationError?.response?.status;

        const responseData =
          registrationError?.response?.data;

        console.log(
          'Registration error:',
          status,
          responseData
        );

        // ---------------------------------------
        // PHONE ALREADY EXISTS
        // ---------------------------------------

        if (status === 409) {
          const existingRole =
            responseData?.role;

          // ---------------------------------------
          // PHONE BELONGS TO DRIVER
          // ---------------------------------------

          if (existingRole === 'driver') {
            Alert.alert(
              'Driver Account Found',
              'This phone number is already registered as a driver. Please use your driver login instead of creating a passenger account.'
            );

            return;
          }

          // ---------------------------------------
          // PHONE BELONGS TO ADMIN
          // ---------------------------------------

          if (existingRole === 'admin') {
            Alert.alert(
              'Account Already Exists',
              'This phone number is registered as an administrator account. Please use the appropriate login.'
            );

            return;
          }

          // ---------------------------------------
          // PHONE BELONGS TO PASSENGER
          // ---------------------------------------
          //
          // This is okay.
          // We continue to OTP login below.
          //

          if (existingRole === 'passenger') {
            console.log(
              'Passenger already exists. Continuing to OTP.'
            );
          } else {
            Alert.alert(
              'Account Already Exists',
              'This phone number is already registered. Please use the login option.'
            );

            return;
          }
        } else {
          // Any error other than 409 should stop.
          throw registrationError;
        }
      }

      // ---------------------------------------
      // STEP 2: REQUEST OTP
      // ---------------------------------------

      console.log(
        'Requesting passenger OTP for:',
        formattedPhone
      );

      const otpResponse = await apiService.login(
        formattedPhone,
        'passenger'
      );

      console.log(
        'OTP response:',
        otpResponse
      );

      // ---------------------------------------
      // STEP 3: CHECK OTP RESPONSE
      // ---------------------------------------

      if (!otpResponse) {
        throw new Error(
          'The server did not return an OTP response.'
        );
      }

      // ---------------------------------------
      // STEP 4: NAVIGATE TO OTP SCREEN
      // ---------------------------------------

      navigation.navigate('OTP', {
        phoneNumber: formattedPhone,
        role: 'passenger',

        // Development only.
        // Your backend currently returns the OTP.
        mockCode: otpResponse.otp || undefined,

        fullName: cleanName,
        email: cleanEmail,
        dob: cleanDob,
        emergencyContact: cleanEmergencyContact,
      });

    } catch (error: any) {
      console.error(
        'Passenger registration/login error:',
        error
      );

      const status =
        error?.response?.status;

      const serverError =
        error?.response?.data?.error;

      let message =
        serverError ||
        error?.message ||
        'Unable to continue. Please try again.';

      // ---------------------------------------
      // HANDLE AUTH 403
      // ---------------------------------------

      if (status === 403) {
        const registeredRole =
          error?.response?.data?.registered_role;

        if (registeredRole === 'driver') {
          message =
            'This phone number is registered as a driver. Please use the driver login.';
        } else if (registeredRole === 'admin') {
          message =
            'This phone number is registered as an administrator account.';
        } else {
          message =
            'This phone number cannot be used for passenger login.';
        }
      }

      Alert.alert(
        'Registration Error',
        message
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------
  // SCREEN
  // ---------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >

        {/* BACK BUTTON */}

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          disabled={isLoading}
        >
          <Text style={styles.backText}>
            ← Back
          </Text>
        </TouchableOpacity>

        {/* TITLE */}

        <Text style={styles.title}>
          Passenger Registration
        </Text>

        <Text style={styles.subtitle}>
          Create your passenger account
        </Text>

        {/* NAME */}

        <TextInput
          placeholder="Full Name *"
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          editable={!isLoading}
        />

        {/* PHONE */}

        <TextInput
          placeholder="Phone Number *"
          keyboardType="phone-pad"
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          editable={!isLoading}
        />

        {/* EMAIL */}

        <TextInput
          placeholder="Email Address *"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
        />

        {/* DATE OF BIRTH */}

        <TextInput
          placeholder="Date of Birth *"
          style={styles.input}
          value={dob}
          onChangeText={setDob}
          editable={!isLoading}
        />

        {/* EMERGENCY CONTACT */}

        <TextInput
          placeholder="Emergency Contact (Optional)"
          keyboardType="phone-pad"
          style={styles.input}
          value={emergencyContact}
          onChangeText={setEmergencyContact}
          editable={!isLoading}
        />

        {/* CONTINUE BUTTON */}

        <TouchableOpacity
          style={[
            styles.continueButton,
            isLoading && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueText}>
              Continue to OTP
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------
// STYLES
// ---------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8FB',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  backButton: {
    marginBottom: 15,
  },

  backText: {
    color: '#1565C0',
    fontSize: 16,
    fontWeight: 'bold',
  },

  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#0D47A1',
  },

  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 25,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },

  continueButton: {
    backgroundColor: '#1565C0',
    padding: 18,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
  },

  disabledButton: {
    opacity: 0.6,
  },

  continueText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
  },
});