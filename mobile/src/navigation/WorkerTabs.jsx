import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'
import colors from '../theme/colors'
import WorkerHomeScreen from '../screens/worker/WorkerHomeScreen'
import MissionsListScreen from '../screens/worker/MissionsListScreen'
import MissionDetailScreen from '../screens/worker/MissionDetailScreen'
import ApplicationsScreen from '../screens/worker/ApplicationsScreen'
import EarningsScreen from '../screens/worker/EarningsScreen'
import ProfileScreen from '../screens/worker/ProfileScreen'
import MessagesScreen from '../screens/worker/MessagesScreen'
import ChatScreen from '../screens/worker/ChatScreen'
import NotificationsScreen from '../screens/worker/NotificationsScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const TABS = [
  { name: 'HomeTab', label: 'Accueil', icon: '🏠' },
  { name: 'MissionsTab', label: 'Missions', icon: '📋' },
  { name: 'SuiviTab', label: 'Suivi', icon: '✅' },
  { name: 'GainsTab', label: 'Gains', icon: '💰' },
  { name: 'ProfilTab', label: 'Profil', icon: '👤' },
]

// ── Stacks for screens with nested navigation ──

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkerHome" component={WorkerHomeScreen} />
      <Stack.Screen name="MissionDetail" component={MissionDetailScreen} />
    </Stack.Navigator>
  )
}

function MissionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MissionsList" component={MissionsListScreen} />
      <Stack.Screen name="MissionDetail" component={MissionDetailScreen} />
    </Stack.Navigator>
  )
}

function ProfilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  )
}

export default function WorkerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.gray2, height: 60 },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.gray4,
        tabBarLabelStyle: { fontSize: 10, marginBottom: 4 },
        tabBarIcon: ({ focused }) => {
          const tab = TABS.find((t) => t.name === route.name)
          return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{tab?.icon}</Text>
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Accueil' }} />
      <Tab.Screen name="MissionsTab" component={MissionsStack} options={{ title: 'Missions' }} />
      <Tab.Screen name="SuiviTab" component={ApplicationsScreen} options={{ title: 'Suivi' }} />
      <Tab.Screen name="GainsTab" component={EarningsScreen} options={{ title: 'Gains' }} />
      <Tab.Screen name="ProfilTab" component={ProfilStack} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  )
}
