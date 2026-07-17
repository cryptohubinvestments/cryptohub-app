import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Bitcoin, X, Award, Clock } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { fetchBtcPrice, usdToBtc, btcToUsd, INVESTMENT_TIERS, getInvestmentTier } from '@/lib/btc';
import { createInvestment, closeInvestment, calculateProfit, getActiveInvestments } from '@/lib/operations';
import { noOutline } from '@/lib/inputStyle';

export default function InvestScreen() {
  const { user, refreshUser } = useAuth();
  const [btcPrice, setBtcPrice] = useState(0);
  const [usdAmount, setUsdAmount] = useState('');
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [, setTick] = useState(0);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [price, invs] = await Promise.all([fetchBtcPrice(), getActiveInvestments(user.id)]);
    setBtcPrice(price); setInvestments(invs);
  }, [user]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    const ticker = setInterval(() => setTick(t => t + 1), 1000);
    return () => { clearInterval(interval); clearInterval(ticker); };
  }, [loadData]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await refreshUser(); await loadData(); setRefreshing(false); }, [refreshUser, loadData]);

  const usdValue = parseFloat(usdAmount) || 0;
  const btcEquiv = btcPrice > 0 ? usdToBtc(usdValue, btcPrice) : 0;
  const tier = usdValue > 0 ? getInvestmentTier(usdValue) : null;

  const handleInvest = async () => {
    setError('');
    if (!user) return;
    if (usdValue < 50) { setError('Minimum investment is $50'); return; }
    setLoading(true);
    const { error: err } = await createInvestment(user.id, usdValue, Number(user.btc_balance));
    setLoading(false);
    if (err) { setError(err); return; }
    setUsdAmount(''); await refreshUser(); await loadData();
  };

  const handleClose = async (investmentId: string) => {
    if (!user) return;
    const { error: err } = await closeInvestment(investmentId, user.id);
    if (err) { setError(err); return; }
    await refreshUser(); await loadData();
  };

  if (!user) return null;

  const availableBtc = Number(user.btc_balance);
  const availableUsd = btcToUsd(availableBtc, btcPrice);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 90 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}><Text style={styles.pageTitle}>Invest Bitcoin</Text><Text style={styles.pageSubtitle}>Earn hourly returns on your BTC</Text></View>
        <View style={styles.investCard}>
          <Text style={styles.cardLabel}>Amount (USD)</Text>
          <View style={styles.amountInput}><Text style={styles.currencySymbol}>$</Text><TextInput style={[styles.amountField, noOutline]} placeholder="0.00" placeholderTextColor={Colors.textMuted} value={usdAmount} onChangeText={setUsdAmount} keyboardType="decimal-pad" /></View>
          <View style={styles.btcEquivRow}><Bitcoin color={Colors.primary} size={13} strokeWidth={2.5} /><Text style={styles.btcEquivText}>{btcEquiv.toFixed(8)} BTC</Text></View>
          <View style={styles.availableRow}><Text style={styles.availableLabel}>Available</Text><Text style={styles.availableValue}>{availableBtc.toFixed(8)} BTC (${availableUsd.toFixed(2)})</Text></View>
          {tier && (<View style={styles.tierBadge}><Award color={Colors.primary} size={13} strokeWidth={2.5} /><Text style={styles.tierBadgeText}>{tier.name} Tier — +{tier.roi}%/hr</Text></View>)}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={styles.investBtn} onPress={handleInvest} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#0A84FF', '#0055CC']} style={styles.investBtnGradient}>{loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.investBtnText}>Invest</Text>}</LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investment Tiers</Text>
          <View style={styles.tiersList}>
            {INVESTMENT_TIERS.map((t) => (
              <View key={t.name} style={styles.tierCard}>
                <View style={styles.tierHeader}><View style={styles.tierIconWrap}><Award color={Colors.primary} size={15} strokeWidth={2.5} /></View><View style={{ flex: 1 }}><Text style={styles.tierName}>{t.name}</Text><Text style={styles.tierRange}>${t.min.toLocaleString()}{t.max ? ` - $${t.max.toLocaleString()}` : '+'}</Text></View><View style={styles.roiBadge}><Text style={styles.roiText}>+{t.roi}%/hr</Text></View></View>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Investments</Text>
          {investments.length === 0 ? (
            <View style={styles.emptyState}><TrendingUp color={Colors.textMuted} size={26} strokeWidth={1.5} /><Text style={styles.emptyText}>No active investments</Text><Text style={styles.emptySubtext}>Start investing to see live profits</Text></View>
          ) : (
            <View style={styles.investmentsList}>
              {investments.map((inv) => {
                const { elapsedHours, profitUsd, profitBtc, currentValueUsd, currentValueBtc } = calculateProfit(inv, btcPrice);
                return (
                  <View key={inv.id} style={styles.investmentCard}>
                    <View style={styles.investmentHeader}><View style={styles.investmentTierIcon}><Award color={Colors.primary} size={13} strokeWidth={2.5} /></View><Text style={styles.investmentId}>#{inv.id.slice(0, 8).toUpperCase()}</Text><View style={styles.statusBadge}><View style={styles.statusDot} /><Text style={styles.statusText}>Active</Text></View></View>
                    <View style={styles.investmentGrid}>
                      <View style={styles.gridItem}><Text style={styles.gridLabel}>Principal</Text><Text style={styles.gridValue}>{Number(inv.principal_btc).toFixed(6)} BTC</Text><Text style={styles.gridSub}>${Number(inv.principal_usd).toFixed(0)}</Text></View>
                      <View style={styles.gridItem}><Text style={styles.gridLabel}>Hourly ROI</Text><Text style={[styles.gridValue, { color: Colors.primary }]}>+{Number(inv.hourly_roi_percent)}%</Text><Text style={styles.gridSub}>per hour</Text></View>
                      <View style={styles.gridItem}><Text style={styles.gridLabel}>Running</Text><Text style={styles.gridValue}>{formatDuration(elapsedHours)}</Text><Text style={styles.gridSub}>{new Date(inv.started_at).toLocaleDateString()}</Text></View>
                      <View style={styles.gridItem}><Text style={styles.gridLabel}>Profit</Text><Text style={[styles.gridValue, { color: Colors.success }]}>+{profitBtc.toFixed(6)}</Text><Text style={[styles.gridSub, { color: Colors.success }]}>+${profitUsd.toFixed(2)}</Text></View>
                    </View>
                    <View style={styles.currentValueRow}><Text style={styles.currentValueLabel}>Current Value</Text><Text style={styles.currentValueAmount}>{currentValueBtc.toFixed(6)} BTC (${currentValueUsd.toFixed(2)})</Text></View>
                    <TouchableOpacity style={styles.closeBtn} onPress={() => handleClose(inv.id)} activeOpacity={0.8}><X color={Colors.error} size={14} strokeWidth={2.5} /><Text style={styles.closeBtnText}>Close</Text></TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.floor(((hours - h) * 60 - m) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  pageHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl + 12, paddingBottom: Spacing.md },
  pageTitle: { fontSize: 20, fontFamily: 'Inter-Bold', color: Colors.text },
  pageSubtitle: { fontSize: 12, fontFamily: 'Inter-Regular', color: Colors.textSecondary, marginTop: 2 },
  investCard: { marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  cardLabel: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.textSecondary, marginBottom: 8 },
  amountInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border },
  currencySymbol: { fontSize: 22, fontFamily: 'Inter-Bold', color: Colors.textMuted, marginRight: 6 },
  amountField: { flex: 1, paddingVertical: 14, fontSize: 22, fontFamily: 'Inter-Bold', color: Colors.text },
  btcEquivRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  btcEquivText: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.primary },
  availableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopColor: Colors.border, borderTopWidth: 1 },
  availableLabel: { fontSize: 11, fontFamily: 'Inter-Regular', color: Colors.textMuted },
  availableValue: { fontSize: 11, fontFamily: 'Inter-SemiBold', color: Colors.text },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: 'rgba(10,132,255,0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(10,132,255,0.2)', alignSelf: 'flex-start' },
  tierBadgeText: { fontSize: 11, fontFamily: 'Inter-SemiBold', color: Colors.primary },
  errorText: { color: Colors.errorLight, fontSize: 12, fontFamily: 'Inter-Medium', marginTop: 8, textAlign: 'center' },
  investBtn: { marginTop: 12, borderRadius: 10, overflow: 'hidden', ...Platform.select({ web: { boxShadow: '0 8px 28px rgba(10,132,255,0.35)' }, default: { elevation: 8, shadowColor: '#0A84FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 } }) },
  investBtnGradient: { justifyContent: 'center', alignItems: 'center', paddingVertical: 14 },
  investBtnText: { color: '#FFF', fontSize: 14, fontFamily: 'Inter-Bold' },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter-Bold', color: Colors.text, marginBottom: 10 },
  tiersList: { gap: 7 },
  tierCard: { backgroundColor: Colors.surface, borderRadius: 10, padding: 11, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  tierIconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(10,132,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  tierName: { fontSize: 13, fontFamily: 'Inter-Bold', color: Colors.text },
  tierRange: { fontSize: 10, fontFamily: 'Inter-Regular', color: Colors.textMuted, marginTop: 1 },
  roiBadge: { backgroundColor: 'rgba(10,132,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16 },
  roiText: { fontSize: 11, fontFamily: 'Inter-Bold', color: Colors.primary },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 5 },
  emptyText: { color: Colors.textMuted, fontSize: 13, fontFamily: 'Inter-Medium' },
  emptySubtext: { color: Colors.textMuted, fontSize: 11, fontFamily: 'Inter-Regular' },
  investmentsList: { gap: 10 },
  investmentCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 13, borderWidth: 1, borderColor: Colors.border },
  investmentHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  investmentTierIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(10,132,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  investmentId: { flex: 1, fontSize: 12, fontFamily: 'Inter-SemiBold', color: Colors.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 16, backgroundColor: 'rgba(10,132,255,0.1)' },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary },
  statusText: { fontSize: 10, fontFamily: 'Inter-SemiBold', color: Colors.primary },
  investmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '47%' },
  gridLabel: { fontSize: 10, fontFamily: 'Inter-Regular', color: Colors.textMuted, marginBottom: 2 },
  gridValue: { fontSize: 12, fontFamily: 'Inter-SemiBold', color: Colors.text },
  gridSub: { fontSize: 10, fontFamily: 'Inter-Regular', color: Colors.textMuted, marginTop: 1 },
  currentValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopColor: Colors.border, borderTopWidth: 1 },
  currentValueLabel: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.textSecondary },
  currentValueAmount: { fontSize: 13, fontFamily: 'Inter-Bold', color: Colors.text },
  closeBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 10, paddingVertical: 10, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  closeBtnText: { fontSize: 12, fontFamily: 'Inter-Bold', color: Colors.error },
});
