import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, User, ChevronLeft } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { signIn } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { noOutline } from '@/lib/inputStyle';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passcodeRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    setError('');
    if (!username.trim() || passcode.length !== 6) { setError('Enter username and 6-digit passcode'); return; }
    setLoading(true);
    const { user, error: err } = await signIn(username, passcode);
    setLoading(false);
    if (err) { setError(err); return; }
    if (user) { setUser(user); router.replace('/(tabs)'); }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/')}>
              <ChevronLeft color={Colors.text} size={20} strokeWidth={2} />
            </TouchableOpacity>

            <View style={styles.logoWrap}>
              <LinearGradient colors={['#0A84FF', '#0055CC']} style={styles.logoCircle}>
                <Text style={styles.logoText}>₿</Text>
              </LinearGradient>
              <Text style={styles.appName}>CryptoHub</Text>
              <Text style={styles.tagline}>Welcome back</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputRow}>
                <User color={Colors.textMuted} size={17} strokeWidth={2} />
                <TextInput
                  style={[styles.input, noOutline]}
                  placeholder="Your username"
                  placeholderTextColor={Colors.textMuted}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={styles.label}>6-Digit Passcode</Text>
              <TouchableOpacity style={styles.passcodeContainer} onPress={() => passcodeRef.current?.focus()} activeOpacity={1}>
                <View style={styles.passcodeDotsRow}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.passcodeDot,
                        passcode.length > i ? styles.passcodeDotFilled : null,
                        error && passcode.length < 6 ? styles.passcodeDotError : null,
                      ]}
                    />
                  ))}
                </View>
                <TextInput
                  ref={passcodeRef}
                  style={[styles.hiddenPasscodeInput, noOutline]}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                  value={passcode}
                  onChangeText={(v) => { setPasscode(v.replace(/\D/g, '')); if (error) setError(''); }}
                  textContentType="oneTimeCode"
                />
              </TouchableOpacity>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                <LinearGradient colors={['#0A84FF', '#0055CC']} style={styles.loginGradient}>
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <>
                      <Text style={styles.loginBtnText}>Sign In</Text>
                      <ArrowRight color="#FFF" size={18} strokeWidth={2.5} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.signUpLink} onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.signUpLinkText}>Don't have an account? </Text>
              <Text style={styles.signUpLinkBold}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xxl },
  backBtn: { position: 'absolute', top: Spacing.xl + 12, left: Spacing.lg, width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: { width: 64, height: 64, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoText: { fontSize: 34, fontFamily: 'Inter-ExtraBold', color: '#FFF' },
  appName: { fontSize: 24, fontFamily: 'Inter-ExtraBold', color: Colors.text, marginBottom: 3 },
  tagline: { fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.textSecondary },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, borderWidth: 1, borderColor: Colors.border },
  label: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 14, fontFamily: 'Inter-Regular', color: Colors.text },
  passcodeContainer: { backgroundColor: Colors.background, borderRadius: 12, paddingVertical: 16, borderWidth: 1, borderColor: Colors.border, position: 'relative' },
  passcodeDotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 },
  passcodeDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(142,155,184,0.2)' },
  passcodeDotFilled: { backgroundColor: Colors.text, transform: [{ scale: 1.1 }] },
  passcodeDotError: { borderColor: Colors.error, borderWidth: 1 },
  hiddenPasscodeInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, fontSize: 1 },
  errorText: { color: Colors.errorLight, fontSize: 12, fontFamily: 'Inter-Medium', marginTop: 8, textAlign: 'center' },
  loginBtn: { marginTop: 16, borderRadius: 10, overflow: 'hidden', ...Platform.select({ web: { boxShadow: '0 8px 28px rgba(10,132,255,0.35)' }, default: { elevation: 8, shadowColor: '#0A84FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 } }) },
  loginGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, gap: 7 },
  loginBtnText: { color: '#FFF', fontSize: 15, fontFamily: 'Inter-Bold' },
  signUpLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg },
  signUpLinkText: { color: Colors.textSecondary, fontSize: 13, fontFamily: 'Inter-Regular' },
  signUpLinkBold: { color: Colors.primary, fontSize: 13, fontFamily: 'Inter-Bold' },
});
