import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';
import { COLORS } from '../constants/colors';

const Stack = createStackNavigator();
const ForceStack = createStackNavigator();

const ForceChangePasswordNavigator: React.FC = () => (
  <ForceStack.Navigator
    screenOptions={{
      headerShown: true,
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: COLORS.textWhite,
      headerLeft: () => null,
    }}
  >
    <ForceStack.Screen
      name="ForceChangePassword"
      component={ChangePasswordScreen}
      options={{ title: 'Change Password Required' }}
    />
  </ForceStack.Navigator>
);

const AppNavigator: React.FC = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const mustChangePassword = isAuthenticated && user?.mustChangePassword;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : mustChangePassword ? (
          <Stack.Screen name="ForceChangePassword" component={ForceChangePasswordNavigator} />
        ) : (
          <Stack.Screen name="MainTabs" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
