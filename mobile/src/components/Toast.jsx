import React, { useEffect, useRef } from 'react'
import { Animated, Text, StyleSheet } from 'react-native'
import colors from '../theme/colors'

export default function Toast({ message, type = 'success', visible, onHide }) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide?.())
    }
  }, [visible])

  if (!visible) return null

  return (
    <Animated.View style={[s.toast, type === 'error' ? s.error : s.success, { opacity }]}>
      <Text style={s.text}>{message}</Text>
    </Animated.View>
  )
}

// Hook pour gérer le toast
export function useToast() {
  const [toast, setToast] = React.useState({ visible: false, message: '', type: 'success' })
  const showToast = (message, type = 'success') => setToast({ visible: true, message, type })
  const hideToast = () => setToast((t) => ({ ...t, visible: false }))
  return { toast, showToast, hideToast }
}

const s = StyleSheet.create({
  toast: {
    position: 'absolute', bottom: 100, left: 20, right: 20,
    borderRadius: 12, padding: 14, zIndex: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
  },
  success: { backgroundColor: colors.navy },
  error: { backgroundColor: colors.red },
  text: { color: '#fff', fontSize: 14, fontWeight: '500', textAlign: 'center' },
})
