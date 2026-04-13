import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../contexts/AuthContext'
import LoadingScreen from '../components/LoadingScreen'
import AuthScreen from '../screens/auth/AuthScreen'
import WorkerTabs from './WorkerTabs'
import CompanyTabs from './CompanyTabs'

const Stack = createNativeStackNavigator()

export default function RootNavigator() {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />

  // Not authenticated
  if (!user || !profile) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
      </Stack.Navigator>
    )
  }

  // Authenticated — route by role
  if (profile.role === 'travailleur') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="WorkerTabs" component={WorkerTabs} />
      </Stack.Navigator>
    )
  }

  if (profile.role === 'entreprise') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="CompanyTabs" component={CompanyTabs} />
      </Stack.Navigator>
    )
  }

  // Fallback (admin or unknown role)
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  )
}
