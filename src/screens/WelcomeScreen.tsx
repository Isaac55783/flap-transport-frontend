import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { Button, Text, Surface, useTheme } from 'react-native-paper';
import { useAppDispatch } from '../store';
import { setRole } from '../store/authSlice';

export default function WelcomeScreen({ navigation }: any) {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const handleRoleSelect = (role: 'passenger' | 'driver' | 'admin') => {
    dispatch(setRole(role));
    navigation.navigate('AuthChoice', { role })
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.card} elevation={2}>
        <View style={styles.header}>
          <Text variant="headlineLarge" style={styles.title}>Flap Transport</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Ghana's Smart Real-Time Tro Tro Navigation System
          </Text>
        </View>

        <Text variant="titleMedium" style={styles.choiceTitle}>Select Your Role</Text>

        <Button 
          mode="contained" 
          onPress={() => handleRoleSelect('passenger')} 
          style={styles.button}
          contentStyle={styles.btnContent}
          icon="walk"
        >
          I am a Passenger
        </Button>

        <Button 
          mode="contained" 
          onPress={() => handleRoleSelect('driver')} 
          style={[styles.button, { backgroundColor: theme.colors.primaryContainer }]}
          textColor={theme.colors.onPrimaryContainer}
          contentStyle={styles.btnContent}
          icon="steering"
        >
          I am a Driver
        </Button>

        
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: '#00A859',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  choiceTitle: {
    marginBottom: 20,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 12,
  },
  btnContent: {
    paddingVertical: 8,
  },
  adminButton: {
    marginTop: 10,
  }
});
