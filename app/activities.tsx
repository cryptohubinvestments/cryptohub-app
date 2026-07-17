import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, Gift, Clock } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
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

export default function ActivitiesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const txs = await getUserTransactions(user.id, 200);
    setTransactions(txs);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (!user) return null;

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />} showsVerticalScrollIndicator={false}>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock color={Colors.textMuted} size={28} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {transactions.map((tx) => {
              const Icon = ACTIVITY_ICONS[tx.type] || TrendingUp;
              const isPositive = ['deposit', 'profit', 'referral_reward', 'bonus', 'investment_return'].includes(tx.type);
              return (
                <View key={tx.id} style={styles.txItem}>
                  <View style={styles.txIconWrap}><Icon color={Colors.primary} size={16} strokeWidth={2.5} /></View>
                  <View style={styles.txContent}>
                    <Text style={styles.txTitle} numberOfLines={1}>{tx.description || tx.type}</Text>
                    <Text style={styles.txTime}>{formatTime(tx.created_at)}</Text>
                    {tx.status !== 'completed' && <Text style={[styles.txStatus, { color: tx.status === 'pending' ? Colors.warning : Colors.error }]}>{tx.status}</Text>}
                  </View>
                  <View style={styles.txAmount}>
                    <Text style={[styles.txBtc, { color: isPositive ? Colors.success : Colors.error }]}>{isPositive ? '+' : '-'}{Number(tx.btc_amount).toFixed(6)} BTC</Text>
                    <Text style={styles.txUsd}>${Number(tx.usd_amount).toFixed(2)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl + 12, paddingBottom: Spacing.md, borderBottomColor: Colors.border, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  backBtnText: { fontSize: 18, color: Colors.text },
  headerTitle: { fontSize: 17, fontFamily: 'Inter-Bold', color: Colors.text },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: 8 },
  emptyText: { color: Colors.textMuted, fontSize: 14, fontFamily: 'Inter-Regular' },
  list: { gap: 8, paddingTop: Spacing.md },
  txItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border },
  txIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(10,132,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  txContent: { flex: 1, marginLeft: 10 },
  txTitle: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: Colors.text },
  txTime: { fontSize: 11, fontFamily: 'Inter-Regular', color: Colors.textMuted, marginTop: 2 },
  txStatus: { fontSize: 10, fontFamily: 'Inter-SemiBold', marginTop: 2 },
  txAmount: { alignItems: 'flex-end' },
  txBtc: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
  txUsd: { fontSize: 10, fontFamily: 'Inter-Regular', color: Colors.textMuted, marginTop: 2 },
});
