import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native'
import colors from '../theme/colors'

export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style }) {
  const isPrimary = variant === 'primary'
  return (
    <TouchableOpacity
      style={[s.btn, isPrimary ? s.primary : s.secondary, (disabled || loading) && s.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={isPrimary ? '#fff' : colors.brand} size="small" />
        : <Text style={[s.text, isPrimary ? s.textPrimary : s.textSecondary]}>{title}</Text>
      }
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  btn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.brand },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.gray2 },
  disabled: { opacity: 0.6 },
  text: { fontSize: 14, fontWeight: '600' },
  textPrimary: { color: '#fff' },
  textSecondary: { color: colors.gray6 },
})
