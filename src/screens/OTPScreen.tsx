
import React, { useEffect, useState } from 'react';

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

// IMPORTANT:
// Replace this with your actual Render FRONTEND domain.
// Do not use your Flask backend domain here.
const RENDER_FRONTEND_HOST =
  'YOUR-RENDER-FRONTEND.onrender.com';

export default function OTPScreen({ route, navigation }: any) {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const phoneNumber = route?.params?.phoneNumber;

  const incomingRole = route?.params?.role || 'passenger';
  const role =
    incomingRole === 'customer' ? 'passenger' : incomingRole;

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

  // Only the deployed Render website can display the test OTP.
  const isRenderDeployment =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location.hostname.toLowerCase() ===
      RENDER_FRONTEND_HOST.toLowerCase();

  const passedOtp =
    route?.params?.mockCode ??
    route?.params?.otp ??
    '';

  const [otpCode, setOtpCode] = useState('');

  const [webTestingOtp, setWebTestingOtp] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isRenderDeployment) {
      const code = String(passedOtp);

      setWebTestingOtp(
        /^\d{6}$/.test(code) ? code : ''
      );
    } else {
      // Never display the test OTP locally or on mobile.
      setWebTestingOtp('');
    }

    setOtpCode('');
    setErrorMsg(null);
  }, [passedOtp, isRenderDeployment]);

  const handleVerifyOTP = async () => {
    if (isLoading) return;

    setErrorMsg(null);

    const trimmedOtp = otpCode.trim();

    if (!phoneNumber) {
      setErrorMsg(
        'Phone number is missing. Please return to the login screen.'
      );
      return;
    }

    if (!trimmedOtp) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    if (!/^\d{6}$/.test(trimmedOtp)) {
      setErrorMsg(
        'The verification code must contain exactly 6 digits.'
      );
      return;
    }

    setIsLoading(true);
    dispatch(startAuth());

    try {
      const res = await apiService.verify(
        phoneNumber,
        trimmedOtp,
        role
      );

      if (!res?.access_token) {
        throw new Error(
          'The server did not return an access token. Please try again.'
        );
      }

      if (!res?.user) {
        throw new Error(
          'The server verified the code but did not return user information.'
        );
      }

      const backendName =
        res.user.name ||
        res.user.full_name ||
        res.user.fullName ||
        [
          res.user.first_name,
          res.user.last_name,
        ]
          .filter(Boolean)
          .join(' ')
          .trim();

      const finalName =
        registeredFullName ||
        (typeof backendName === 'string'
          ? backendName.trim()
          : '');

      const authenticatedUser = {
        ...res.user,

        ...(finalName ? { name: finalName } : {}),

        ...(role === 'passenger'
          ? {
              ...(email ? { email } : {}),
              ...(dob ? { dob } : {}),
              ...(emergencyContact
                ? { emergencyContact }
                : {}),
            }
          : {}),
      };

      dispatch(
        authSuccess({
          token: res.access_token,
          user: authenticatedUser,
          profile: res.profile,
        })
      );

      try {
        socketService.connect();
      } catch (socketError) {
        console.warn(
          'Socket connection failed:',
          socketError
        );
      }

      const authenticatedRole =
        res.role ||
        authenticatedUser.role ||
        role;

      if (authenticatedRole === 'admin') {
        navigation.replace('AdminDashboard');
      } else if (authenticatedRole === 'driver') {
        navigation.replace('DriverDashboard');
      } else {
        navigation.replace('PassengerDashboard');
      }
    } catch (err: any) {
      console.error('OTP verification failed:', err);

      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Verification failed. Please check your code and try again.';

      setErrorMsg(message);
      dispatch(authFailure(message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={styles.card} elevation={2}>
          <Text variant="titleLarge" style={styles.title}>
            Enter OTP Code
          </Text>

          <Text variant="bodyMedium" style={styles.subtitle}>
            Enter the 6-digit verification code for {phoneNumber}.
          </Text>

          {isRenderDeployment && (
            <Surface style={styles.webOtpBox} elevation={0}>
              <Text
                variant="labelMedium"
                style={styles.webOtpLabel}
              >
                TEMPORARY WEB TESTING CODE
              </Text>

              <Text
                variant="headlineMedium"
                style={styles.webOtpCode}
              >
                {webTestingOtp || 'Not supplied'}
              </Text>

              <Text
                variant="bodySmall"
                style={styles.webOtpNote}
              >
                Use this code to complete your test login.
              </Text>
            </Surface>
          )}

          <TextInput
            label="6-Digit Verification Code"
            value={otpCode}
            onChangeText={(text) => {
              setOtpCode(
                text.replace(/[^0-9]/g, '').slice(0, 6)
              );

              if (errorMsg) {
                setErrorMsg(null);
              }
            }}
            keyboardType="number-pad"
            maxLength={6}
            mode="outlined"
            placeholder="123456"
            left={<TextInput.Icon icon="key" />}
            style={styles.input}
            disabled={isLoading}
            error={!!errorMsg}
            autoFocus
          />

          {errorMsg && (
            <HelperText type="error" visible>
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
            Confirm &amp; Log In
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            disabled={isLoading}
          >
            Back to Login
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
  webOtpBox: {
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
  },
  webOtpLabel: {
    color: '#1B5E20',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  webOtpCode: {
    color: '#087F43',
    fontWeight: 'bold',
    letterSpacing: 6,
    marginVertical: 8,
  },
  webOtpNote: {
    color: '#1B5E20',
    textAlign: 'center',
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
