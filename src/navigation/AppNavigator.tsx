import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from '../screens/WelcomeScreen';
import AuthChoiceScreen from '../screens/AuthChoiceScreen';
import PassengerRegisterScreen from '../screens/PassengerRegisterScreen';
import DriverRegisterScreen from '../screens/DriverRegisterScreen';
import LoginScreen from '../screens/LoginScreen';
import OTPScreen from '../screens/OTPScreen';

import PassengerDashboard from '../screens/PassengerDashboard';
import SearchScreen from '../screens/SearchScreen';
import DriverDashboard from '../screens/DriverDashboard';
import AdminDashboard from '../screens/AdminDashboard';

export type RootStackParamList = {
  Welcome: undefined;
  AuthChoice: undefined;

  PassengerRegister: undefined;
  DriverRegister: undefined;

  Login: { role: 'passenger' | 'driver' | 'admin' };

  OTP: {
    phoneNumber: string;
    role: 'passenger' | 'driver' | 'admin';
    mockCode?: string;
  };

  PassengerDashboard: undefined;
  Search: undefined;
  DriverDashboard: undefined;
  AdminDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right'
        }}
      >

        <Stack.Screen 
          name="Welcome" 
          component={WelcomeScreen} 
        />

        <Stack.Screen 
          name="AuthChoice" 
          component={AuthChoiceScreen} 
        />

        <Stack.Screen 
          name="PassengerRegister" 
          component={PassengerRegisterScreen} 
        />
       <Stack.Screen
       name="Search"
       component={SearchScreen}
      />
        <Stack.Screen 
          name="DriverRegister" 
          component={DriverRegisterScreen} 
        />

        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
        />

        <Stack.Screen 
          name="OTP" 
          component={OTPScreen} 
        />

        <Stack.Screen 
          name="PassengerDashboard" 
          component={PassengerDashboard} 
        />

        <Stack.Screen 
          name="DriverDashboard" 
          component={DriverDashboard} 
        />

        <Stack.Screen 
          name="AdminDashboard" 
          component={AdminDashboard} 
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}