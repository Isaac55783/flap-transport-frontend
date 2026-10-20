
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { apiService } from '../services/api';

export default function DriverRegisterScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');

  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [seatingCapacity, setSeatingCapacity] = useState('');
  const [driverLicense, setDriverLicense] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const validatePhone = (num: string) => {
    const cleanNum = num.replace(/\s+/g, '');

    // Ghana phone number:
    // 0244123456 or +233244123456
    const phoneRegex = /^(?:\+233|0)[25][0-9]{8}$/;

    return phoneRegex.test(cleanNum);
  };

  const handleContinue = async () => {
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();
    const cleanDob = dob.trim();

    const cleanMake = vehicleMake.trim();
    const cleanModel = vehicleModel.trim();
    const cleanColor = vehicleColor.trim();
    const cleanPlate = licensePlate.trim();
    const cleanCapacity = seatingCapacity.trim();
    const cleanDriverLicense = driverLicense.trim();

    // -----------------------------
    // PERSONAL INFORMATION
    // -----------------------------

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

    // -----------------------------
    // VEHICLE INFORMATION
    // -----------------------------

    if (!cleanMake) {
      Alert.alert(
        'Required Field',
        'Please enter the vehicle make.'
      );
      return;
    }

    if (!cleanModel) {
      Alert.alert(
        'Required Field',
        'Please enter the vehicle model.'
      );
      return;
    }

    if (!cleanColor) {
      Alert.alert(
        'Required Field',
        'Please enter the vehicle color.'
      );
      return;
    }

    if (!cleanPlate) {
      Alert.alert(
        'Required Field',
        'Please enter the license plate number.'
      );
      return;
    }

    if (!cleanCapacity) {
      Alert.alert(
        'Required Field',
        'Please enter the seating capacity.'
      );
      return;
    }

    const capacity = Number(cleanCapacity);

    if (!Number.isInteger(capacity) || capacity <= 0) {
      Alert.alert(
        'Invalid Seating Capacity',
        'Please enter a valid seating capacity.'
      );
      return;
    }

    if (!cleanDriverLicense) {
      Alert.alert(
        'Required Field',
        "Please enter the driver's license number."
      );
      return;
    }

    // -----------------------------
    // FORMAT PHONE NUMBER
    // -----------------------------

    let formattedPhone = cleanPhone.replace(/\s+/g, '');

    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+233' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('233')) {
      formattedPhone = '+' + formattedPhone;
    }

    setIsLoading(true);

    try {
      // -----------------------------
      // STEP 1: REGISTER DRIVER FIRST
      // -----------------------------

      try {
        const registrationResponse =
          await apiService.registerDriver({
            name: cleanName,
            phone_number: formattedPhone,
            license_number: cleanDriverLicense,
            vehicle_model: `${cleanMake} ${cleanModel}`,
            vehicle_color: cleanColor,
            plate_number: cleanPlate,
            capacity: capacity,
          });

        console.log(
          'Driver registration successful:',
          registrationResponse
        );
      } catch (registrationError: any) {
        const status = registrationError?.response?.status;
        const responseData = registrationError?.response?.data;

        console.log(
          'Driver registration response:',
          status,
          responseData
        );

        // If this phone number already belongs to a driver,
        // continue to request an OTP instead of registering twice.
        if (
          status === 409 &&
          responseData?.role === 'driver'
        ) {
          console.log(
            'Driver account already exists. Continuing to OTP.'
          );
        } else {
          throw registrationError;
        }
      }

      // -----------------------------
      // STEP 2: REQUEST OTP
      // -----------------------------

      const response = await apiService.login(
        formattedPhone,
        'driver'
      );

      console.log(
        'Driver registration OTP response:',
        response
      );

      if (!response) {
        throw new Error(
          'The server did not return an OTP response.'
        );
      }

      // -----------------------------
      // STEP 3: NAVIGATE TO OTP SCREEN
      // -----------------------------

      navigation.navigate('OTP', {
        phoneNumber: formattedPhone,
        role: 'driver',

        // Development/testing only.
        // Uses the OTP returned by the backend, if provided.
        mockCode: response.otp || undefined,

        // Keep registration information available
        // for the next registration step.
        fullName: cleanName,
        email: cleanEmail,
        dob: cleanDob,

        vehicleMake: cleanMake,
        vehicleModel: cleanModel,
        vehicleColor: cleanColor,
        licensePlate: cleanPlate,
        seatingCapacity: capacity,
        driverLicense: cleanDriverLicense,
      });

    } catch (error: any) {
      console.error(
        'Driver registration error:',
        error?.response?.status,
        error?.response?.data || error?.message
      );

      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Unable to send verification code. Please try again.';

      Alert.alert(
        'Registration Error',
        message
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          disabled={isLoading}
        >
          <Text style={styles.backText}>
            ← Back
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Driver Registration
        </Text>

        <Text style={styles.section}>
          Personal Information
        </Text>

        <TextInput
          placeholder="Full Name *"
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          editable={!isLoading}
        />

        <TextInput
          placeholder="Phone Number *"
          keyboardType="phone-pad"
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          editable={!isLoading}
        />

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

        <TextInput
          placeholder="Date of Birth *"
          style={styles.input}
          value={dob}
          onChangeText={setDob}
          editable={!isLoading}
        />

        <Text style={styles.section}>
          Vehicle Information
        </Text>

        <TextInput
          placeholder="Vehicle Make *"
          style={styles.input}
          value={vehicleMake}
          onChangeText={setVehicleMake}
          editable={!isLoading}
        />

        <TextInput
          placeholder="Vehicle Model *"
          style={styles.input}
          value={vehicleModel}
          onChangeText={setVehicleModel}
          editable={!isLoading}
        />

        <TextInput
          placeholder="Vehicle Color *"
          style={styles.input}
          value={vehicleColor}
          onChangeText={setVehicleColor}
          editable={!isLoading}
        />

        <TextInput
          placeholder="License Plate Number *"
          style={styles.input}
          value={licensePlate}
          onChangeText={setLicensePlate}
          autoCapitalize="characters"
          editable={!isLoading}
        />

        <TextInput
          placeholder="Seating Capacity *"
          keyboardType="numeric"
          style={styles.input}
          value={seatingCapacity}
          onChangeText={setSeatingCapacity}
          editable={!isLoading}
        />

        <TextInput
          placeholder="Driver's License Number *"
          style={styles.input}
          value={driverLicense}
          onChangeText={setDriverLicense}
          autoCapitalize="characters"
          editable={!isLoading}
        />

        <TouchableOpacity
          style={styles.uploadButton}
          disabled={isLoading}
          onPress={() => {
            Alert.alert(
              'Coming Soon',
              "Driver's license upload will be connected to document storage next."
            );
          }}
        >
          <Text style={styles.uploadText}>
            Upload Driver's License
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.uploadButton}
          disabled={isLoading}
          onPress={() => {
            Alert.alert(
              'Coming Soon',
              'Vehicle registration upload will be connected to document storage next.'
            );
          }}
        >
          <Text style={styles.uploadText}>
            Upload Vehicle Registration
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.continueButton,
            isLoading && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={isLoading}
        >
          <Text style={styles.continueText}>
            {isLoading
              ? 'Sending Code...'
              : 'Continue to OTP'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    marginBottom: 25,
  },

  section: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 10,
    color: '#444',
  },

  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#DDD',
  },

  uploadButton: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },

  uploadText: {
    color: '#1565C0',
    fontWeight: '600',
  },

  continueButton: {
    backgroundColor: '#1565C0',
    padding: 18,
    borderRadius: 12,
    marginTop: 20,
  },

  disabledButton: {
    opacity: 0.6,
  },

  continueText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
