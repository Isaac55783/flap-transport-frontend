import React, { useState } from 'react';

import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import {
  TextInput,
  Button,
  Text,
  Surface,
  HelperText,
  useTheme,
} from 'react-native-paper';

import { apiService } from '../services/api';
import { socketService } from '../services/socket';

import { useAppDispatch } from '../store';

import {
  authSuccess,
  startAuth,
  authFailure,
} from '../store/authSlice';


export default function OTPScreen({
  route,
  navigation,
}: any) {

  const theme = useTheme();
  const dispatch = useAppDispatch();

  // =====================================================
  // DATA FROM REGISTRATION
  // =====================================================

  const phoneNumber = route?.params?.phoneNumber;

  const role = route?.params?.role || 'passenger';

  // This is the REAL name entered during registration.
  const registeredFullName =
    typeof route?.params?.fullName === 'string'
      ? route.params.fullName.trim()
      : '';

  const email =
    typeof route?.params?.email === 'string'
      ? route.params.email.trim()
      : '';

  const dob =
    typeof route?.params?.dob === 'string'
      ? route.params.dob.trim()
      : '';

  const emergencyContact =
    typeof route?.params?.emergencyContact === 'string'
      ? route.params.emergencyContact.trim()
      : '';


  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  // =====================================================
  // VERIFY OTP
  // =====================================================

  const handleVerifyOTP = async () => {

    setErrorMsg(null);

    const trimmedOtp = otpCode.trim();


    // -----------------------------------------------------
    // VALIDATE OTP
    // -----------------------------------------------------

    if (!trimmedOtp) {
      setErrorMsg(
        'Please enter the 6-digit verification code.'
      );
      return;
    }

    if (!/^\d{6}$/.test(trimmedOtp)) {
      setErrorMsg(
        'Code must be exactly 6 digits.'
      );
      return;
    }


    // -----------------------------------------------------
    // VALIDATE PHONE
    // -----------------------------------------------------

    if (!phoneNumber) {
      setErrorMsg(
        'Phone number is missing. Please go back and request a new code.'
      );
      return;
    }


    // -----------------------------------------------------
    // VALIDATE REGISTERED NAME
    // -----------------------------------------------------

    if (!registeredFullName) {
      setErrorMsg(
        'Your registered name could not be found. Please go back and register again.'
      );
      return;
    }


    setIsLoading(true);

    dispatch(startAuth());


    try {

      console.log('=================================');
      console.log('VERIFYING OTP');
      console.log('=================================');

      console.log('Phone:', phoneNumber);
      console.log('Role:', role);
      console.log('OTP:', trimmedOtp);

      console.log(
        'REGISTERED FULL NAME:',
        registeredFullName
      );


      // ===================================================
      // VERIFY OTP WITH BACKEND
      // ===================================================

      const res = await apiService.verify(
        phoneNumber,
        trimmedOtp,
        role
      );


      console.log(
        'OTP VERIFICATION RESPONSE:',
        res
      );


      // ---------------------------------------------------
      // ACCESS TOKEN
      // ---------------------------------------------------

      if (!res?.access_token) {
        throw new Error(
          'Verification succeeded but no access token was returned.'
        );
      }


      // ---------------------------------------------------
      // USER
      // ---------------------------------------------------

      if (!res?.user) {
        throw new Error(
          'Verification succeeded but no user information was returned.'
        );
      }


      // ===================================================
      // IMPORTANT NAME FIX
      // ===================================================
      //
      // The backend may contain an old/generated name such
      // as:
      //
      // "TroTro User 6710"
      //
      // The real name entered during registration is already
      // available in registeredFullName.
      //
      // Therefore, for BOTH passengers and drivers, use the
      // real registration name.
      // ===================================================

      const authenticatedUser = {
        ...res.user,

        // IMPORTANT:
        // Always preserve the real name entered during
        // registration for both passenger and driver.
        ...(registeredFullName
          ? {
              name: registeredFullName,
            }
          : {}),

        // Keep passenger registration information available
        // when supplied.
        ...(role === 'passenger'
          ? {
              ...(email
                ? { email }
                : {}),

              ...(dob
                ? { dob }
                : {}),

              ...(emergencyContact
                ? {
                    emergencyContact,
                  }
                : {}),
            }
          : {}),
      };


      console.log(
        '================================='
      );

      console.log(
        'FINAL USER SAVED TO AUTH'
      );

      console.log(
        authenticatedUser
      );

      console.log(
        'FINAL DISPLAY NAME:',
        authenticatedUser.name
      );

      console.log(
        'FINAL USER ROLE:',
        authenticatedUser.role
      );

      console.log(
        '================================='
      );


      // ===================================================
      // SAVE AUTHENTICATION
      // ===================================================

      dispatch(
        authSuccess({
          token: res.access_token,

          // IMPORTANT:
          // Save authenticatedUser, not res.user.
          //
          // This ensures the real registered name reaches
          // the Driver Dashboard and Passenger Dashboard.
          user: authenticatedUser,

          profile: res.profile,
        })
      );


      // ===================================================
      // SOCKET
      // ===================================================

      try {

        socketService.connect();

      } catch (socketError) {

        console.warn(
          'Socket connection failed:',
          socketError
        );

      }


      // ===================================================
      // NAVIGATION
      // =====================================================

      if (authenticatedUser.role === 'admin') {

        navigation.replace(
          'AdminDashboard'
        );

      } else if (
        authenticatedUser.role === 'driver'
      ) {

        navigation.replace(
          'DriverDashboard'
        );

      } else {

        navigation.replace(
          'PassengerDashboard'
        );

      }


    } catch (err: any) {

      console.error(
        'OTP VERIFICATION ERROR:',
        err
      );


      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Verification failed. Please check the code and try again.';


      setErrorMsg(message);

      dispatch(
        authFailure(message)
      );


    } finally {

      setIsLoading(false);

    }

  };


  // =====================================================
  // SCREEN
  // =====================================================

  return (

    <KeyboardAvoidingView
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }

      style={[
        styles.container,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
    >

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >

        <Surface
          style={styles.card}
          elevation={2}
        >

          <Text
            variant="titleLarge"
            style={styles.title}
          >
            Enter OTP Code
          </Text>


          <Text
            variant="bodyMedium"
            style={styles.subtitle}
          >
            A 6-digit confirmation code has been sent
            to {phoneNumber}. Enter the code below to
            complete verification.
          </Text>


          <TextInput
            label="6-Digit Verification Code"

            value={otpCode}

            onChangeText={(text) => {

              const numbersOnly = text
                .replace(/[^0-9]/g, '')
                .slice(0, 6);

              setOtpCode(numbersOnly);

              if (errorMsg) {
                setErrorMsg(null);
              }

            }}

            keyboardType="number-pad"

            maxLength={6}

            mode="outlined"

            placeholder="123456"

            left={
              <TextInput.Icon
                icon="key"
              />
            }

            style={styles.input}

            disabled={isLoading}

            error={!!errorMsg}

            autoFocus
          />


          {errorMsg && (

            <HelperText
              type="error"
              visible={true}
            >
              {errorMsg}
            </HelperText>

          )}


          <Button
            mode="contained"

            onPress={handleVerifyOTP}

            loading={isLoading}

            disabled={isLoading}

            style={styles.button}

            contentStyle={styles.btnContent}
          >
            Confirm & Log In
          </Button>


          <Button
            mode="text"

            onPress={() =>
              navigation.goBack()
            }

            style={styles.backButton}

            disabled={isLoading}
          >
            Resend Code / Change Number
          </Button>

        </Surface>

      </ScrollView>

    </KeyboardAvoidingView>

  );
}


// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
  },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },

  card: {
    padding: 24,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },

  title: {
    fontWeight: 'bold',
    color: '#00A859',
    marginBottom: 8,
    textAlign: 'center',
  },

  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  input: {
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 20,
  },

  button: {
    marginTop: 16,
    borderRadius: 12,
  },

  btnContent: {
    paddingVertical: 8,
  },

  backButton: {
    marginTop: 12,
  },

});