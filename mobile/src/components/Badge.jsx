import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import colors from '../theme/colors'

const VARIANTS = {
  green: { bg: colors.greenLight, text: colors.greenDark },
  orange: { bg: colors.brandLight, text: colors.brand },
  blue: { bg: colors.blueLight, text: colors.blue },
  gray: { bg: colors.gray1, text: colors.gray6 },
  red: { bg: colors.redLight, text: colors.red },
}

export default function Badge({ label, variant = 'gray', style }) {
  const v = VARIANTS[variant] || VARIANTS.gray
  return (
    <View style={[s.badge, { backgroundColor: v.bg }, style]}>
      <Text style={[s.text, { color: v.text }]}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  badge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  text: { fontSize: 11, fontWeight: '600' },
})
