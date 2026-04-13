import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import colors from '../../theme/colors'

const ROLES = [
  { key: 'travailleur', label: 'Je suis travailleur', icon: '👷', desc: 'Trouvez des missions adaptées à vos compétences' },
  { key: 'entreprise', label: 'Je suis une entreprise', icon: '🏢', desc: 'Publiez des missions et recrutez rapidement' },
]

export default function AuthScreen() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [role, setRole] = useState('travailleur')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [city, setCity] = useState('')
  const [siret, setSiret] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Erreur', 'Email et mot de passe requis')
    setLoading(true)
    const { error } = await login({ email, password })
    setLoading(false)
    if (error) Alert.alert('Erreur de connexion', error.message)
  }

  const handleRegister = async () => {
    if (!email || !password) return Alert.alert('Erreur', 'Email et mot de passe requis')
    if (role === 'travailleur' && (!firstName || !lastName)) return Alert.alert('Erreur', 'Prénom et nom requis')
    if (role === 'entreprise' && !companyName) return Alert.alert('Erreur', 'Nom de l\'entreprise requis')
    setLoading(true)
    const { error } = await register({ email, password, role, firstName, lastName, companyName, city, siret })
    setLoading(false)
    if (error) Alert.alert('Erreur d\'inscription', error.message)
    else Alert.alert('Compte créé', 'Vérifiez votre email pour confirmer votre compte.')
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={s.logo}>
            <View style={s.logoIcon}>
              <Text style={s.logoPlay}>▶</Text>
            </View>
            <Text style={s.logoText}>TEMPO</Text>
          </View>

          <Text style={s.title}>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</Text>

          {/* Role selector (register only) */}
          {mode === 'register' && (
            <View style={s.roleRow}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  style={[s.roleCard, role === r.key && s.roleCardActive]}
                  onPress={() => setRole(r.key)}
                >
                  <Text style={s.roleIcon}>{r.icon}</Text>
                  <Text style={[s.roleLabel, role === r.key && s.roleLabelActive]}>{r.label}</Text>
                  <Text style={s.roleDesc}>{r.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Fields */}
          {mode === 'register' && role === 'travailleur' && (
            <View style={s.row}>
              <TextInput style={[s.input, { flex: 1, marginRight: 8 }]} placeholder="Prénom" placeholderTextColor={colors.gray4} value={firstName} onChangeText={setFirstName} />
              <TextInput style={[s.input, { flex: 1 }]} placeholder="Nom" placeholderTextColor={colors.gray4} value={lastName} onChangeText={setLastName} />
            </View>
          )}

          {mode === 'register' && role === 'entreprise' && (
            <TextInput style={s.input} placeholder="Nom de l'entreprise" placeholderTextColor={colors.gray4} value={companyName} onChangeText={setCompanyName} />
          )}

          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={colors.gray4}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={s.input}
            placeholder="Mot de passe"
            placeholderTextColor={colors.gray4}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {mode === 'register' && (
            <>
              <TextInput style={s.input} placeholder="Ville" placeholderTextColor={colors.gray4} value={city} onChangeText={setCity} />
              {role === 'travailleur' && (
                <TextInput style={s.input} placeholder="SIRET (optionnel)" placeholderTextColor={colors.gray4} value={siret} onChangeText={setSiret} keyboardType="numeric" />
              )}
            </>
          )}

          {/* Submit */}
          <TouchableOpacity style={s.btn} onPress={mode === 'login' ? handleLogin : handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</Text>}
          </TouchableOpacity>

          {/* Switch mode */}
          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')} style={s.switchBtn}>
            <Text style={s.switchText}>
              {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
              <Text style={s.switchLink}>{mode === 'login' ? 'S\'inscrire' : 'Se connecter'}</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 40, gap: 10 },
  logoIcon: { width: 36, height: 36, backgroundColor: colors.brand, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  logoPlay: { color: '#fff', fontSize: 14 },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 3 },
  title: { color: '#fff', fontSize: 26, fontWeight: '600', marginBottom: 24, textAlign: 'center' },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  roleCardActive: { borderColor: colors.brand, backgroundColor: 'rgba(255,85,0,0.12)' },
  roleIcon: { fontSize: 28, marginBottom: 6 },
  roleLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  roleLabelActive: { color: '#fff' },
  roleDesc: { color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'center', lineHeight: 14 },
  row: { flexDirection: 'row', marginBottom: 0 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 14, color: '#fff', fontSize: 15, marginBottom: 12 },
  btn: { backgroundColor: colors.brand, borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  switchLink: { color: colors.brand, fontWeight: '600' },
})
