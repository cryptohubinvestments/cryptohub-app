import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, Platform, KeyboardAvoidingView,
  Image as RNImage,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bitcoin, Copy, Check, Upload, AlertTriangle, ArrowLeft, ChevronRight,
} from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { DEPOSIT_BTC_ADDRESS, supabase } from '@/lib/supabase';
import { submitDepositProof } from '@/lib/operations';
import { fetchBtcPrice, usdToBtc } from '@/lib/btc';
import { noOutline } from '@/lib/inputStyle';

const BLUE_SHADOW = Platform.OS === 'web' ? ({ boxShadow: '0 8px 28px rgba(10,132,255,0.38)' } as any) : { elevation: 8, shadowColor: '#0A84FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 12 };
const CARD_SHADOW = Platform.OS === 'web' ? ({ boxShadow: '0 4px 18px rgba(0,0,0,0.32)' } as any) : { elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8 };

export default function DepositScreen() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [txId, setTxId] = useState('');
  const [usdInput, setUsdInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [btcPrice, setBtcPrice] = useState(0);

  const handleCopy = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try { await navigator.clipboard.writeText(DEPOSIT_BTC_ADDRESS); } catch {}
    } else {
      try { const { setStringAsync } = await import('expo-clipboard'); await setStringAsync(DEPOSIT_BTC_ADDRESS); } catch {}
    }
    setCopied(true); setTimeout(() => setCopied(false), 2200);
  };

  const handlePickImage = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = (e: any) => { const file = e.target?.files?.[0]; if (file) { setScreenshotFile(file); setScreenshotUri(URL.createObjectURL(file)); } };
      input.click();
    } else {
      try { const ImagePicker = await import('expo-image-picker'); const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 }); if (!result.canceled && result.assets.length > 0) { setScreenshotUri(result.assets[0].uri); } } catch { setFormError('Unable to open image picker'); }
    }
  };

  const uploadScreenshot = async (): Promise<string | null> => {
    if (Platform.OS === 'web' && screenshotFile) {
      const fileName = `deposit_${user!.id}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('deposit-screenshots').upload(fileName, screenshotFile, { contentType: 'image/jpeg' });
      if (uploadError) return null;
      const { data } = supabase.storage.from('deposit-screenshots').getPublicUrl(fileName);
      return data.publicUrl;
    }
    return screenshotUri;
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!screenshotUri) { setFormError('Please upload a payment screenshot'); return; }
    if (!txId.trim()) { setFormError('Please enter the transaction ID'); return; }
    const usd = parseFloat(usdInput);
    if (!usd || usd <= 0) { setFormError('Enter the USD amount you sent'); return; }
    if (!user) { setFormError('Session expired, please log in again'); return; }
    setSubmitting(true);
    try {
      const screenshotUrl = await uploadScreenshot();
      if (!screenshotUrl) { setSubmitting(false); setFormError('Failed to upload screenshot. Please try again.'); return; }
      const { error } = await submitDepositProof(user.id, screenshotUrl, txId.trim(), usd);
      setSubmitting(false);
      if (error) { setFormError(error); return; }
      setSubmitted(true);
      setTimeout(() => { setShowForm(false); setSubmitted(false); setScreenshotUri(null); setScreenshotFile(null); setTxId(''); setUsdInput(''); }, 2800);
    } catch { setSubmitting(false); setFormError('Something went wrong. Please try again.'); }
  };

  const usdNum = parseFloat(usdInput) || 0;
  const btcEquiv = btcPrice > 0 && usdNum > 0 ? usdToBtc(usdNum, btcPrice) : 0;

  if (showForm) {
    return (
      <View style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)} style={styles.backBtn}><ArrowLeft color={Colors.text} size={18} strokeWidth={2.2} /></TouchableOpacity>
            <Text style={styles.formHeaderTitle}>Submit Payment Proof</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {submitted ? (
              <View style={styles.successBox}>
                <View style={styles.successCircle}><Check color={Colors.primary} size={34} strokeWidth={2.5} /></View>
                <Text style={styles.successTitle}>Proof Submitted!</Text>
                <Text style={styles.successMsg}>Your deposit is pending admin review. It is usually approved within 30 minutes.</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.label}>Payment Screenshot</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={handlePickImage} activeOpacity={0.8}>
                  {screenshotUri ? (
                    <View>
                      <RNImage source={{ uri: screenshotUri }} style={styles.previewImg} />
                      <View style={styles.changeBadge}><Text style={styles.changeBadgeText}>Tap to change</Text></View>
                    </View>
                  ) : (
                    <View style={styles.uploadPlaceholder}><Upload color={Colors.textMuted} size={26} strokeWidth={1.5} /><Text style={styles.uploadHint}>Tap to upload screenshot</Text><Text style={styles.uploadSub}>PNG or JPG</Text></View>
                  )}
                </TouchableOpacity>
                <Text style={styles.label}>Transaction ID (Hash)</Text>
                <View style={styles.inputRow}><TextInput style={[styles.input, noOutline]} placeholder="e.g. 3a1b2c4d5e6f..." placeholderTextColor={Colors.textMuted} value={txId} onChangeText={setTxId} autoCapitalize="none" autoCorrect={false} /></View>
                <Text style={styles.label}>USD Amount Sent</Text>
                <View style={styles.inputRow}><Text style={styles.inputPrefix}>$</Text><TextInput style={[styles.input, { flex: 1 }, noOutline]} placeholder="0.00" placeholderTextColor={Colors.textMuted} value={usdInput} onChangeText={setUsdInput} keyboardType="decimal-pad" /></View>
                {usdNum > 0 && btcPrice > 0 ? <Text style={styles.btcEquiv}>≈ {btcEquiv.toFixed(8)} BTC</Text> : null}
                {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
                <TouchableOpacity style={[styles.submitWrap, BLUE_SHADOW]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.86}>
                  <LinearGradient colors={['#1A8FFF', '#0055CC']} style={styles.submitGrad}>
                    {submitting ? <ActivityIndicator color="#FFF" size="small" /> : (<><Text style={styles.submitText}>Submit Proof</Text><ChevronRight color="#FFF" size={18} strokeWidth={2.5} /></>)}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.mainScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}><Text style={styles.pageTitle}>Deposit Bitcoin</Text><Text style={styles.pageSub}>Fund your account with BTC</Text></View>
        <View style={styles.warningBanner}><AlertTriangle color={Colors.warning} size={14} strokeWidth={2.5} /><Text style={styles.warningText}>Only send Bitcoin (BTC) to the address below. Sending any other asset may result in permanent loss.</Text></View>
        <View style={[styles.addressCard, CARD_SHADOW]}>
          <View style={styles.addressCardHeader}><View style={styles.addrIconWrap}><Bitcoin color={Colors.primary} size={16} strokeWidth={2.5} /></View><Text style={styles.addressCardTitle}>Bitcoin Deposit Address</Text></View>
          <View style={styles.addressBox}><Text style={styles.addressStr} selectable>{DEPOSIT_BTC_ADDRESS}</Text></View>
          <TouchableOpacity style={[styles.copyBtn, copied && styles.copyBtnActive]} onPress={handleCopy} activeOpacity={0.82}>
            {copied ? (<><Check color={Colors.primary} size={14} strokeWidth={2.5} /><Text style={[styles.copyBtnText, { color: Colors.primary }]}>Address Copied!</Text></>) : (<><Copy color={Colors.text} size={14} strokeWidth={2.5} /><Text style={styles.copyBtnText}>Copy Address</Text></>)}
          </TouchableOpacity>
        </View>
        <View style={styles.importantBox}><Text style={styles.importantTitle}>Important</Text><Text style={styles.importantText}>Only send Bitcoin (BTC) to this address. After sending, submit your payment proof below. Deposits are credited after admin verification, usually within 30 minutes.</Text></View>
        <TouchableOpacity style={[styles.sentWrap, BLUE_SHADOW]} onPress={() => { fetchBtcPrice().then(setBtcPrice); setShowForm(true); }} activeOpacity={0.86}>
          <LinearGradient colors={['#1A8FFF', '#0055CC']} style={styles.sentGrad}><Bitcoin color="#FFF" size={17} strokeWidth={2.5} /><Text style={styles.sentText}>I Have Sent Bitcoin</Text><ChevronRight color="#FFF" size={17} strokeWidth={2.5} /></LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  mainScroll: { paddingBottom: 100 },
  pageHeader: { paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  pageTitle: { fontSize: 22, fontFamily: 'Inter-Bold', color: Colors.text },
  pageSub: { fontSize: 12, fontFamily: 'Inter-Regular', color: Colors.textSecondary, marginTop: 2 },
  warningBanner: { marginHorizontal: Spacing.lg, marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.22)' },
  warningText: { flex: 1, fontSize: 11, fontFamily: 'Inter-Regular', color: Colors.textSecondary, lineHeight: 17 },
  addressCard: { marginHorizontal: Spacing.lg, marginBottom: 12, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border },
  addressCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  addrIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(10,132,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  addressCardTitle: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: Colors.text },
  addressBox: { backgroundColor: Colors.background, borderRadius: 9, padding: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  addressStr: { fontSize: 11, fontFamily: 'Inter-Medium', color: Colors.primary, textAlign: 'center', letterSpacing: 0.4, lineHeight: 18 },
  copyBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, backgroundColor: Colors.surfaceLight, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  copyBtnActive: { backgroundColor: 'rgba(10,132,255,0.08)', borderColor: 'rgba(10,132,255,0.3)' },
  copyBtnText: { fontSize: 12, fontFamily: 'Inter-SemiBold', color: Colors.text },
  importantBox: { marginHorizontal: Spacing.lg, marginBottom: 20, backgroundColor: 'rgba(10,132,255,0.06)', borderRadius: 10, padding: 13, borderWidth: 1, borderColor: 'rgba(10,132,255,0.2)' },
  importantTitle: { fontSize: 12, fontFamily: 'Inter-Bold', color: Colors.primary, marginBottom: 5 },
  importantText: { fontSize: 11, fontFamily: 'Inter-Regular', color: Colors.textSecondary, lineHeight: 18 },
  sentWrap: { marginHorizontal: Spacing.lg, borderRadius: Radius.lg, overflow: 'hidden' },
  sentGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, gap: 8 },
  sentText: { fontSize: 15, fontFamily: 'Inter-Bold', color: '#FFF' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  formHeaderTitle: { fontSize: 15, fontFamily: 'Inter-Bold', color: Colors.text },
  formScroll: { padding: Spacing.lg, paddingBottom: 80 },
  successBox: { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 20 },
  successCircle: { width: 70, height: 70, borderRadius: 35, marginBottom: 16, backgroundColor: 'rgba(10,132,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(10,132,255,0.3)' },
  successTitle: { fontSize: 19, fontFamily: 'Inter-Bold', color: Colors.text, marginBottom: 9 },
  successMsg: { fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  label: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.textSecondary, marginBottom: 6, marginTop: 16 },
  uploadBox: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', minHeight: 110, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uploadPlaceholder: { alignItems: 'center', gap: 6, paddingVertical: 22 },
  uploadHint: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.textSecondary },
  uploadSub: { fontSize: 10, fontFamily: 'Inter-Regular', color: Colors.textMuted },
  previewImg: { width: '100%', height: 130, resizeMode: 'cover' },
  changeBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(10,132,255,0.85)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  changeBadgeText: { color: '#FFF', fontSize: 10, fontFamily: 'Inter-SemiBold' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border },
  input: { paddingVertical: 12, fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.text },
  inputPrefix: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: Colors.textMuted, marginRight: 4 },
  btcEquiv: { fontSize: 11, fontFamily: 'Inter-Medium', color: Colors.primary, marginTop: 5 },
  errorText: { color: Colors.errorLight, fontSize: 12, fontFamily: 'Inter-Medium', marginTop: 10, textAlign: 'center' },
  submitWrap: { marginTop: 20, borderRadius: Radius.lg, overflow: 'hidden' },
  submitGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, gap: 8 },
  submitText: { fontSize: 15, fontFamily: 'Inter-Bold', color: '#FFF' },
});
