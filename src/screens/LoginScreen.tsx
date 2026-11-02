import React, { useState } from 'react';

import {
  StyleSheet,
  View,
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

export default function LoginScreen({
  route,
  navigation,
}: any) {
  const theme = useTheme();

  const { role } = route.params || {
    role: 'passenger',
  };

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ===================================================
  // GHANA PHONE VALIDATION
  // ===================================================

  const validatePhone = (num: string) => {
    const cleanNum = num.replace(/\s+/g, '');

    const phoneRegex = /^(?:\+233|0)[25][0-9]{8}$/;

    return phoneRegex.test(cleanNum);
  };

  // ===================================================
  // FORMAT GHANA PHONE
  // ===================================================

  const formatPhoneNumber = (num: string) => {
    const cleanNum = num.replace(/\s+/g, '');

    if (cleanNum.startsWith('0')) {
      return '+233' + cleanNum.slice(1);
    }

    return cleanNum;
  };

  // ===================================================
  // SEND OTP
  // ===================================================

  const handleSendOTP = async () => {
    setErrorMsg(null);

    const trimmedPhone = phoneNumber.trim();

    if (!trimmedPhone) {
      setErrorMsg('Phone number is required.');
      return;
    }

    if (!validatePhone(trimmedPhone)) {
      setErrorMsg(
        'Enter a valid Ghana phone number, e.g. 0244123456 or +233554123456.'
      );
      return;
    }

    const formattedPhone =
      formatPhoneNumber(trimmedPhone);

    setIsLoading(true);

    try {
      console.log(
        'Sending login request:',
        formattedPhone,
        role
      );

      const response = await apiService.login(
        formattedPhone,
        role
      );

      console.log(
        'Backend login response:',
        response
      );

      setIsLoading(false);

      navigation.navigate('OTP', {
        phoneNumber: formattedPhone,
        role,

        // Development/testing only.
        // Remove this when your backend sends
        // OTP through SMS.
        mockCode:
  typeof window !== 'undefined' &&
  window.location.hostname === 'flap-transport-frontend.onrender.com'
    ? response?.otp
    : undefined,
      });

    } catch (error: any) {
      console.error(
        'Login error:',
        error
      );

      setIsLoading(false);

      const backendMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message;

      if (backendMessage) {
        setErrorMsg(backendMessage);
      } else if (error?.code === 'ECONNABORTED') {
        setErrorMsg(
          'The server took too long to respond. Please try again.'
        );
      } else if (error?.message === 'Network Error') {
        setErrorMsg(
          'Cannot connect to the server. Make sure your backend is running and your phone/emulator can reach your computer.'
        );
      } else {
        setErrorMsg(
          'Failed to send verification code. Please try again.'
        );
      }
    }
  };

  // ===================================================
  // UI
  // ===================================================

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
            Verify Your Identity
          </Text>

          <Text
            variant="bodyMedium"
            style={styles.subtitle}
          >
            Enter your mobile number to authenticate.
            We will send an instant 6-digit OTP
            verification code.
          </Text>

          <TextInput
            label="Ghana Phone Number"
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);

              if (errorMsg) {
                setErrorMsg(null);
              }
            }}
            keyboardType="phone-pad"
            mode="outlined"
            placeholder="024 412 3456"
            left={
              <TextInput.Icon icon="phone" />
            }
            style={styles.input}
            disabled={isLoading}
            error={!!errorMsg}
          />

          {errorMsg && (
            <HelperText
              type="error"
              visible={!!errorMsg}
            >
              {errorMsg}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleSendOTP}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            contentStyle={styles.btnContent}
          >
            {isLoading
              ? 'Sending Code...'
              : 'Send Verification Code'}
          </Button>

          <Button
            mode="outlined"
            onPress={() =>
              navigation.goBack()
            }
            style={styles.backButton}
            disabled={isLoading}
          >
            Change Role
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
    borderRadius: 12,
  },
});

