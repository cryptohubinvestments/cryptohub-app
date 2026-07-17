import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpFromLine, Lock, Bitcoin, AlertTriangle, Check } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { fetchBtcPrice, btcToUsd } from '@/lib/btc';
import { requestWithdrawal } from '@/lib/operations';
import { noOutline } from '@/lib/inputStyle';

export default function WithdrawScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [btcPrice, setBtcPrice] = useState(0);
  const [btcAmount, setBtcAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => { setBtcPrice(await fetchBtcPrice()); }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await refreshUser(); await loadData(); setRefreshing(false); }, [refreshUser, loadData]);
  if (!user) return null;

  const isLocked = !user.withdrawal_unlocked;
  const availableBtc = Number(user.btc_balance);
  const availableUsd = btcToUsd(availableBtc, btcPrice);
  const inputBtc = parseFloat(btcAmount) || 0;
  const inputUsd = btcToUsd(inputBtc, btcPrice);

  const handleWithdraw = async () => {
    setError('');
    if (inputBtc <= 0) { setError('Enter a valid BTC amount'); return; }
    if (!walletAddress.trim()) { setError('Enter your BTC wallet address'); return; }
    setLoading(true);
    const { error: err } = await requestWithdrawal(user.id, inputBtc, walletAddress.trim());
    setLoading(false);
    if (err) { setError(err); return; }
    setSuccess(true); setBtcAmount(''); setWalletAddress('');
    await refreshUser();
    setTimeout(() => setSuccess(false), 3000);
  };

  if (isLocked) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
          <View style={styles.lockedContainer}>
            <View style={styles.lockedIcon}><Lock color={Colors.warning} size={40} strokeWidth={2} /></View>
            <Text style={styles.lockedTitle}>Withdrawals Locked</Text>
            <Text style={styles.lockedText}>You must complete your first Bitcoin deposit before withdrawals are enabled.</Text>
            <TouchableOpacity style={styles.lockedBtn} onPress={() => router.push('/(tabs)/deposit')} activeOpacity={0.8}>
              <LinearGradient colors={['#0A84FF', '#0055CC']} style={styles.lockedBtnGradient}>
                <Bitcoin color="#FFF" size={16} strokeWidth={2.5} />
                <Text style={styles.lockedBtnText}>Make First Deposit</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 90 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Withdraw Bitcoin</Text>
          <Text style={styles.pageSubtitle}>Send BTC to any wallet address</Text>
        </View>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceBtc}>{availableBtc.toFixed(8)} BTC</Text>
          <Text style={styles.balanceUsd}>≈ ${availableUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD</Text>
        </View>
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Amount (BTC)</Text>
          <View style={styles.formInput}>
            <Bitcoin color={Colors.primary} size={16} strokeWidth={2.5} />
            <TextInput style={[styles.formTextInput, noOutline]} placeholder="0.00000000" placeholderTextColor={Colors.textMuted} value={btcAmount} onChangeText={setBtcAmount} keyboardType="decimal-pad" />
            <TouchableOpacity onPress={() => setBtcAmount(String(availableBtc))}><Text style={styles.maxBtn}>MAX</Text></TouchableOpacity>
          </View>
          <Text style={styles.usdEquiv}>≈ ${inputUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD</Text>
          <Text style={styles.formLabel}>Bitcoin Wallet Address</Text>
          <View style={styles.formInput}>
            <TextInput style={[styles.formTextInput, noOutline]} placeholder="Enter your BTC wallet address" placeholderTextColor={Colors.textMuted} value={walletAddress} onChangeText={setWalletAddress} autoCapitalize="none" autoCorrect={false} />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success && (<View style={styles.successBanner}><Check color={Colors.primary} size={16} strokeWidth={2.5} /><Text style={styles.successText}>Withdrawal submitted! Pending admin approval.</Text></View>)}
          <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#0A84FF', '#0055CC']} style={styles.withdrawBtnGradient}>
              {loading ? <ActivityIndicator color="#FFF" size="small" /> : (<><ArrowUpFromLine color="#FFF" size={16} strokeWidth={2.5} /><Text style={styles.withdrawBtnText}>Request Withdrawal</Text></>)}
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}><AlertTriangle color={Colors.warning} size={15} strokeWidth={2.5} /><Text style={styles.infoTitle}>Withdrawal Info</Text></View>
          <Text style={styles.infoText}>Withdrawals are processed within 24 hours after admin approval.</Text>
          <Text style={styles.infoText}>Double-check your wallet address — Bitcoin transactions are irreversible.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  pageHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl + 12, paddingBottom: Spacing.md },
  pageTitle: { fontSize: 20, fontFamily: 'Inter-Bold', color: Colors.text },
  pageSubtitle: { fontSize: 12, fontFamily: 'Inter-Regular', color: Colors.textSecondary, marginTop: 2 },
  lockedContainer: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },
  lockedIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(245,158,11,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg, borderWidth: 2, borderColor: 'rgba(245,158,11,0.3)' },
  lockedTitle: { fontSize: 20, fontFamily: 'Inter-Bold', color: Colors.text, marginBottom: Spacing.sm },
  lockedText: { fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  lockedBtn: { borderRadius: Radius.lg, overflow: 'hidden', ...Platform.select({ web: { boxShadow: '0 8px 28px rgba(10,132,255,0.35)' }, default: { elevation: 8, shadowColor: '#0A84FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 } }) },
  lockedBtnGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 24, gap: 7 },
  lockedBtnText: { color: '#FFF', fontSize: 14, fontFamily: 'Inter-Bold' },
  balanceCard: { marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  balanceLabel: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.textSecondary, marginBottom: 6 },
  balanceBtc: { fontSize: 22, fontFamily: 'Inter-ExtraBold', color: Colors.text },
  balanceUsd: { fontSize: 13, fontFamily: 'Inter-Medium', color: Colors.textMuted, marginTop: 2 },
  formCard: { marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  formLabel: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.textSecondary, marginBottom: 6, marginTop: 10 },
  formInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: Colors.border, gap: 7 },
  formTextInput: { flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter-Regular', color: Colors.text },
  maxBtn: { color: Colors.primary, fontSize: 11, fontFamily: 'Inter-Bold', paddingHorizontal: 6 },
  usdEquiv: { fontSize: 11, fontFamily: 'Inter-Medium', color: Colors.primary, marginTop: 4 },
  errorText: { color: Colors.errorLight, fontSize: 12, fontFamily: 'Inter-Medium', marginTop: 8, textAlign: 'center' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(10,132,255,0.08)', borderRadius: 8, padding: 10, marginTop: 8, borderWidth: 1, borderColor: 'rgba(10,132,255,0.2)' },
  successText: { color: Colors.primary, fontSize: 12, fontFamily: 'Inter-Medium', flex: 1 },
  withdrawBtn: { marginTop: 14, borderRadius: 10, overflow: 'hidden', ...Platform.select({ web: { boxShadow: '0 8px 28px rgba(10,132,255,0.35)' }, default: { elevation: 8, shadowColor: '#0A84FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 } }) },
  withdrawBtnGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, gap: 7 },
  withdrawBtnText: { color: '#FFF', fontSize: 14, fontFamily: 'Inter-Bold' },
  infoCard: { marginHorizontal: Spacing.lg, backgroundColor: 'rgba(245,158,11,0.06)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  infoTitle: { fontSize: 12, fontFamily: 'Inter-Bold', color: Colors.warning },
  infoText: { fontSize: 11, fontFamily: 'Inter-Regular', color: Colors.textSecondary, lineHeight: 17, marginBottom: 4 },
});
