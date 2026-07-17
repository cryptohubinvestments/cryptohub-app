import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Settings, ArrowDownToLine, TrendingUp, ArrowUpFromLine,
  Eye, EyeOff, ArrowUpRight, Gift, Clock,
} from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { fetchBtcPrice, btcToUsd } from '@/lib/btc';
import { getUserTransactions } from '@/lib/auth';

const ACTIVITY_ICONS: Record<string, any> = {
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  investment: TrendingUp,
  investment_return: TrendingUp,
  profit: TrendingUp,
  referral_reward: Gift,
  bonus: Gift,
};

export default function HomeScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [btcPrice, setBtcPrice] = useState(0);
  const [prevPrice, setPrevPrice] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const dotAnim = useRef(new Animated.Value(0.4)).current;

  const loadData = useCallback(async () => {
    if (!user) return;
    const [price, txs] = await Promise.all([
      fetchBtcPrice(),
      getUserTransactions(user.id, 4),
    ]);
    setPrevPrice(btcPrice);
    setBtcPrice(price);
    setTransactions(txs);
  }, [user]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => { clearInterval(interval); pulse.stop(); };
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    await loadData();
    setRefreshing(false);
  }, [refreshUser, loadData]);

  if (!user) return null;

  const usdValue = btcToUsd(Number(user.btc_balance), btcPrice);
  const priceIsUp = btcPrice >= prevPrice;

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient colors={['#1A8FFF', '#0055CC']} style={styles.headerLogo}>
              <Text style={styles.headerLogoChar}>₿</Text>
            </LinearGradient>
            <View>
              <Text style={styles.welcomeText}>Welcome</Text>
              <Text style={styles.usernameText}>{user.username}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.livePriceWrap}>
              <Animated.View style={[styles.priceDot, { backgroundColor: priceIsUp ? Colors.success : Colors.error, opacity: dotAnim }]} />
              <Text style={[styles.livePriceText, { color: priceIsUp ? Colors.success : Colors.error }]}>
                ${btcPrice > 0 ? btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '---'}
              </Text>
            </View>
            <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')} activeOpacity={0.7}>
              <Settings color={Colors.text} size={18} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        <LinearGradient colors={['#0F2447', '#0A1A35', '#061124']} style={styles.portfolioCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.portfolioHeader}>
            <Text style={styles.portfolioLabel}>Total Portfolio</Text>
            <TouchableOpacity onPress={() => setBalanceHidden(h => !h)} style={styles.eyeBtn}>
              {balanceHidden ? <EyeOff color="rgba(255,255,255,0.6)" size={15} strokeWidth={2} /> : <Eye color="rgba(255,255,255,0.6)" size={15} strokeWidth={2} />}
            </TouchableOpacity>
          </View>
          {balanceHidden ? (
            <>
              <Text style={styles.btcBalance}>•••••• BTC</Text>
              <Text style={styles.usdValue}>= $•••••• USD</Text>
            </>
          ) : (
            <>
              <Text style={styles.btcBalance}>{Number(user.btc_balance).toFixed(8)} BTC</Text>
              <Text style={styles.usdValue}>= ${usdValue.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD</Text>
            </>
          )}
        </LinearGradient>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBox} onPress={() => router.push('/(tabs)/deposit')} activeOpacity={0.8}>
            <View style={styles.actionBoxIcon}><ArrowDownToLine color="#FFF" size={18} strokeWidth={2} /></View>
            <Text style={styles.actionBoxText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBox} onPress={() => router.push('/(tabs)/invest')} activeOpacity={0.8}>
            <View style={styles.actionBoxIcon}><TrendingUp color="#FFF" size={18} strokeWidth={2} /></View>
            <Text style={styles.actionBoxText}>Invest</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBox} onPress={() => router.push('/(tabs)/withdraw')} activeOpacity={0.8}>
            <View style={styles.actionBoxIcon}><ArrowUpFromLine color="#FFF" size={18} strokeWidth={2} /></View>
            <Text style={styles.actionBoxText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <TouchableOpacity onPress={() => router.push('/activities')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
          </View>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Clock color={Colors.textMuted} size={26} strokeWidth={1.5} />
              <Text style={styles.emptyText}>No activities yet</Text>
            </View>
          ) : (
            <View style={styles.activitiesList}>
              {transactions.map((tx) => {
                const Icon = ACTIVITY_ICONS[tx.type] || ArrowUpRight;
                const isPositive = ['deposit', 'profit', 'referral_reward', 'bonus', 'investment_return'].includes(tx.type);
                return (
                  <View key={tx.id} style={styles.activityItem}>
                    <View style={styles.activityIconWrap}><Icon color={Colors.primary} size={15} strokeWidth={2.5} /></View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle} numberOfLines={1}>{tx.description || tx.type}</Text>
                      <Text style={styles.activityTime}>{formatTime(tx.created_at)}</Text>
                    </View>
                    <View style={styles.activityAmount}>
                      <Text style={[styles.activityBtc, { color: isPositive ? Colors.success : Colors.error }]}>{isPositive ? '+' : '-'}{Number(tx.btc_amount).toFixed(6)} BTC</Text>
                      <Text style={styles.activityUsd}>${Number(tx.usd_amount).toFixed(2)}</Text>
                    </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl + 12, paddingBottom: Spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headerLogoChar: { fontSize: 19, fontFamily: 'Inter-ExtraBold', color: '#FFF' },
  welcomeText: { fontSize: 12, fontFamily: 'Inter-Regular', color: Colors.textSecondary },
  usernameText: { fontSize: 18, fontFamily: 'Inter-Bold', color: Colors.text, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  livePriceWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surface, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 18, borderWidth: 1, borderColor: Colors.border },
  priceDot: { width: 6, height: 6, borderRadius: 3 },
  livePriceText: { fontSize: 11, fontFamily: 'Inter-Bold' },
  settingsBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  portfolioCard: { marginHorizontal: Spacing.lg, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg },
  portfolioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  portfolioLabel: { fontSize: 12, fontFamily: 'Inter-Medium', color: 'rgba(255,255,255,0.6)' },
  eyeBtn: { padding: 4 },
  btcBalance: { fontSize: 26, fontFamily: 'Inter-ExtraBold', color: '#FFF', marginBottom: 2 },
  usdValue: { fontSize: 13, fontFamily: 'Inter-Medium', color: 'rgba(255,255,255,0.6)' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, gap: 10 },
  actionBox: { flex: 1, alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: Colors.border },
  actionBoxIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  actionBoxText: { fontSize: 11, fontFamily: 'Inter-SemiBold', color: Colors.text },
  section: { paddingHorizontal: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter-Bold', color: Colors.text },
  seeAllText: { fontSize: 12, fontFamily: 'Inter-SemiBold', color: Colors.primary },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 6 },
  emptyText: { color: Colors.textMuted, fontSize: 12, fontFamily: 'Inter-Regular' },
  activitiesList: { gap: 6 },
  activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 10, borderWidth: 1, borderColor: Colors.border },
  activityIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(10,132,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  activityContent: { flex: 1, marginLeft: 9 },
  activityTitle: { fontSize: 12, fontFamily: 'Inter-SemiBold', color: Colors.text },
  activityTime: { fontSize: 10, fontFamily: 'Inter-Regular', color: Colors.textMuted, marginTop: 1 },
  activityAmount: { alignItems: 'flex-end' },
  activityBtc: { fontSize: 11, fontFamily: 'Inter-SemiBold' },
  activityUsd: { fontSize: 10, fontFamily: 'Inter-Regular', color: Colors.textMuted, marginTop: 1 },
});
