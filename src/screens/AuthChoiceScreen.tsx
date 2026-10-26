import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useAppDispatch } from '../store';
import { setRole } from '../store/authSlice';

type UserRole = 'passenger' | 'driver';

export default function AuthChoiceScreen({
  navigation,
  route,
}: any) {
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();

  const incomingRole = route?.params?.role;
  const validIncomingRole: UserRole | null =
    incomingRole === 'passenger' || incomingRole === 'driver'
      ? incomingRole
      : null;

  const [selectedRole, setSelectedRole] =
    useState<UserRole | null>(validIncomingRole);

  const [showRolePicker, setShowRolePicker] =
    useState(!validIncomingRole);

  useEffect(() => {
    if (validIncomingRole) {
      setSelectedRole(validIncomingRole);
      dispatch(setRole(validIncomingRole));
      setShowRolePicker(false);
    }
  }, [validIncomingRole, dispatch]);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    dispatch(setRole(role));
    setShowRolePicker(false);
  };

  const handleCreateAccount = () => {
    if (!selectedRole) return;

    dispatch(setRole(selectedRole));

    if (selectedRole === 'passenger') {
      navigation.navigate('PassengerRegister', {
        role: selectedRole,
      });
    } else {
      navigation.navigate('DriverRegister', {
        role: selectedRole,
      });
    }
  };

  const handleSignIn = () => {
    if (!selectedRole) return;

    dispatch(setRole(selectedRole));

    navigation.navigate('Login', {
      role: selectedRole,
    });
  };

  const roleName =
    selectedRole === 'passenger' ? 'Passenger' : 'Driver';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: width < 380 ? 16 : 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>
            Welcome to Flap Transport
          </Text>

          <Text style={styles.subtitle}>
            Sign in to your account or create a new one.
          </Text>

          {selectedRole && !showRolePicker ? (
            <View style={styles.selectedRoleCard}>
              <Text style={styles.roleLabel}>
                YOUR SELECTED ROLE
              </Text>

              <Text style={styles.selectedRoleTitle}>
                {roleName}
              </Text>

              <Text style={styles.roleDescription}>
                {selectedRole === 'passenger'
                  ? 'Book rides and travel easily.'
                  : 'Register your vehicle and receive passengers.'}
              </Text>

              <TouchableOpacity
                onPress={() => setShowRolePicker(true)}
                style={styles.changeRoleButton}
                accessibilityRole="button"
              >
                <Text style={styles.changeRoleText}>
                  Change role
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.sectionTitle}>
                Choose your role
              </Text>

              <TouchableOpacity
                style={styles.card}
                onPress={() => handleRoleSelect('passenger')}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.cardTitle}>Passenger</Text>
                <Text style={styles.cardDescription}>
                  Book rides and travel easily.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.card}
                onPress={() => handleRoleSelect('driver')}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.cardTitle}>Driver</Text>
                <Text style={styles.cardDescription}>
                  Register your vehicle and receive passengers.
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedRole && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateAccount}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.createText}>
                  Create {roleName} Account
                </Text>
              </TouchableOpacity>

              <View style={styles.signInContainer}>
                <Text style={styles.signInQuestion}>
                  Already have an account?
                </Text>

                <TouchableOpacity
                  onPress={handleSignIn}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text style={styles.loginText}>
                    Sign In as {roleName}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8FB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: '#1565C0',
    fontWeight: '600',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0D47A1',
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 28,
    fontSize: 16,
    lineHeight: 23,
  },
  sectionTitle: {
    color: '#263238',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  selectedRoleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D8E5EF',
    elevation: 3,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#64748B',
    marginBottom: 8,
  },
  selectedRoleTitle: {
    color: '#0D47A1',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  roleDescription: {
    color: '#52616B',
    fontSize: 15,
    lineHeight: 22,
  },
  changeRoleButton: {
    alignSelf: 'flex-start',
    marginTop: 18,
    paddingVertical: 8,
  },
  changeRoleText: {
    color: '#1565C0',
    fontSize: 15,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#1565C0',
    borderRadius: 16,
    padding: 22,
    marginBottom: 16,
    elevation: 3,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardDescription: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    marginTop: 24,
  },
  createButton: {
    backgroundColor: '#00A859',
    borderRadius: 12,
    paddingVertical: 17,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  createText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 17,
    textAlign: 'center',
  },
  signInContainer: {
    marginTop: 22,
    alignItems: 'center',
  },
  signInQuestion: {
    color: '#666',
    fontSize: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  loginText: {
    color: '#1565C0',
    fontWeight: 'bold',
    fontSize: 17,
    textAlign: 'center',
  },
});
