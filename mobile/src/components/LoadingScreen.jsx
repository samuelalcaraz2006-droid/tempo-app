import React from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import colors from '../theme/colors'

export default function LoadingScreen({ message = 'Chargement TEMPO...' }) {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.logoIcon}>
          <Text style={s.logoPlay}>▶</Text>
        </View>
        <ActivityIndicator color={colors.brand} size="small" style={{ marginTop: 16 }} />
        <Text style={s.text}>{message}</Text>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoIcon: { width: 48, height: 48, backgroundColor: colors.brand, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoPlay: { color: '#fff', fontSize: 18 },
  text: { color: colors.gray4, fontSize: 13, marginTop: 4 },
})
