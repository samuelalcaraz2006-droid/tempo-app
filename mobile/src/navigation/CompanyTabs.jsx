import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Text } from 'react-native'
import colors from '../theme/colors'
import CompanyHomeScreen from '../screens/company/CompanyHomeScreen'
import CandidatesScreen from '../screens/company/CandidatesScreen'
import PublishMissionScreen from '../screens/company/PublishMissionScreen'
import StatsScreen from '../screens/company/StatsScreen'
import ContractsScreen from '../screens/company/ContractsScreen'
import CompanyMessagesScreen from '../screens/company/CompanyMessagesScreen'
import ChatScreen from '../screens/worker/ChatScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const TABS = [
  { name: 'DashboardTab', label: 'Dashboard', icon: '📊' },
  { name: 'PublierTab', label: 'Publier', icon: '➕' },
  { name: 'MessagesTab', label: 'Messages', icon: '💬' },
  { name: 'StatsTab', label: 'Stats', icon: '📈' },
  { name: 'ContratsTab', label: 'Contrats', icon: '📄' },
]

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CompanyHome" component={CompanyHomeScreen} />
      <Stack.Screen name="Candidates" component={CandidatesScreen} />
    </Stack.Navigator>
  )
}

function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CompanyMessages" component={CompanyMessagesScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  )
}

export default function CompanyTabs() {
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
      <Tab.Screen name="DashboardTab" component={DashboardStack} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="PublierTab" component={PublishMissionScreen} options={{ title: 'Publier' }} />
      <Tab.Screen name="MessagesTab" component={MessagesStack} options={{ title: 'Messages' }} />
      <Tab.Screen name="StatsTab" component={StatsScreen} options={{ title: 'Stats' }} />
      <Tab.Screen name="ContratsTab" component={ContractsScreen} options={{ title: 'Contrats' }} />
    </Tab.Navigator>
  )
}
