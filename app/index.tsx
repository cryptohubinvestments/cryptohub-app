import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';

interface MarketData {
  price: number;
  change24h: number;
  marketCap: number;
  volume: number;
}

const FLOAT_SHADOW_BLUE =
  Platform.OS === 'web'
    ? ({ boxShadow: '0 8px 32px rgba(10,132,255,0.4)' } as any)
    : { elevation: 8, shadowColor: '#0A84FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 };

const FLOAT_SHADOW_DARK =
  Platform.OS === 'web'
    ? ({ boxShadow: '0 6px 24px rgba(0,0,0,0.35)' } as any)
    : { elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 10 };

export default function LandingScreen() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [marketData, setMarketData] = useState<MarketData | null>(null);

  const splashOpacity = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.75)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const dotPulse = useRef(new Animated.Value(0.35)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(splashOpacity, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(splashScale, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(splashOpacity, { toValue: 0, duration: 380, useNativeDriver: true }).start(() => {
          setShowSplash(false);
          Animated.timing(contentOpacity, { toValue: 1, duration: 450, useNativeDriver: true }).start();
        });
      }, 950);
    });

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 0.35, duration: 850, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -7, duration: 1800, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    float.start();

    loadMarket();
    return () => { pulse.stop(); float.stop(); };
  }, []);

  const loadMarket = async () => {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true'
      );
      const json = await res.json();
      const b = json?.bitcoin;
      if (b) {
        setMarketData({ price: b.usd, change24h: b.usd_24hr_change, marketCap: b.usd_market_cap, volume: b.usd_24hr_vol });
      }
    } catch {
      setMarketData({ price: 114000, change24h: 1.45, marketCap: 2250000000000, volume: 45000000000 });
    }
  };

  const fmt = (n: number) => {
    if (!n || isNaN(n)) return '---';
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
    return `${n.toFixed(0)}`;
  };

  const isUp = !marketData || marketData.change24h >= 0;
  const pct = Math.abs(marketData?.change24h ?? 1.45).toFixed(2);

  if (showSplash) {
    return (
      <View style={styles.splash}>
        <Animated.View style={[styles.splashInner, { opacity: splashOpacity, transform: [{ scale: splashScale }] }]}>
          <LinearGradient colors={['#1A8FFF', '#0055CC']} style={styles.splashLogo}>
            <Text style={styles.splashLogoChar}>₿</Text>
          </LinearGradient>
          <Text style={styles.splashName}>CryptoHub</Text>
          <Text style={styles.splashSub}>Professional Bitcoin Trading</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, backgroundColor: Colors.background, opacity: contentOpacity }}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.nav}>
          <View style={styles.navLeft}>
            <LinearGradient colors={['#1A8FFF', '#0055CC']} style={styles.navLogo}>
              <Text style={styles.navLogoChar}>₿</Text>
            </LinearGradient>
            <Text style={styles.navName}>CryptoHub</Text>
          </View>
          <View style={styles.navRight}>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.navSignIn}>
              <Text style={styles.navSignInText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')} style={styles.navGetStarted}>
              <Text style={styles.navGetStartedText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.body}>
          <View style={[styles.badge, { borderColor: isUp ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)', backgroundColor: isUp ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }]}>
            <Animated.View style={[styles.dot, { backgroundColor: isUp ? Colors.success : Colors.error, opacity: dotPulse }]} />
            <Text style={[styles.badgeText, { color: isUp ? Colors.success : Colors.error }]}>
              Live Market — Bitcoin is {isUp ? 'up' : 'down'} {pct}% today
            </Text>
          </View>

          <Text style={styles.heroLine1}>Trade Crypto</Text>
          <Text style={styles.heroLine2}>Like a Pro</Text>
          <Text style={styles.heroSub}>
            Invest in Bitcoin with real-time profits.{'\n'}Get a{' '}
            <Text style={styles.heroBonusText}>$50 welcome bonus</Text>
            {' '}when you sign up today.
          </Text>

          <View style={[styles.marketCard, FLOAT_SHADOW_DARK]}>
            <View style={styles.marketRow}>
              <Text style={styles.marketLabel}>BITCOIN PRICE</Text>
              <Text style={styles.marketPrice}>
                {marketData ? `$${marketData.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '---'}
              </Text>
            </View>
            <View style={styles.marketDivider} />
            <View style={styles.marketRow}>
              <Text style={styles.marketLabel}>24H CHANGE</Text>
              <View style={styles.changeRow}>
                {isUp ? <TrendingUp color={Colors.success} size={14} strokeWidth={2.5} /> : <TrendingDown color={Colors.error} size={14} strokeWidth={2.5} />}
                <Text style={[styles.marketChange, { color: isUp ? Colors.success : Colors.error }]}>
                  {isUp ? '+' : '-'}{pct}%
                </Text>
              </View>
            </View>
            <View style={styles.marketDivider} />
            <View style={styles.marketRow}>
              <Text style={styles.marketLabel}>MARKET CAP</Text>
              <Text style={styles.marketVal}>{marketData ? fmt(marketData.marketCap) : '---'}</Text>
            </View>
            <View style={styles.marketDivider} />
            <View style={styles.marketRow}>
              <Text style={styles.marketLabel}>24H VOLUME</Text>
              <Text style={styles.marketVal}>{marketData ? fmt(marketData.volume) : '---'}</Text>
            </View>
          </View>

          <Animated.View style={[styles.ctaWrap, FLOAT_SHADOW_BLUE, { transform: [{ translateY: floatY }] }]}>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')} activeOpacity={0.88}>
              <LinearGradient colors={['#1A8FFF', '#0055CC']} style={styles.ctaPrimary}>
                <Text style={styles.ctaPrimaryText}>Get Started</Text>
                <ChevronRight color="#FFF" size={18} strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.ctaSecWrap, FLOAT_SHADOW_DARK, { transform: [{ translateY: floatY }] }]}>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.88} style={styles.ctaSecondary}>
              <Text style={styles.ctaSecondaryText}>Already have an account? Sign In</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  splashInner: { alignItems: 'center', gap: 14 },
  splashLogo: { width: 78, height: 78, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  splashLogoChar: { fontSize: 42, fontFamily: 'Inter-ExtraBold', color: '#FFF' },
  splashName: { fontSize: 32, fontFamily: 'Inter-ExtraBold', color: Colors.text, letterSpacing: -0.5 },
  splashSub: { fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.textSecondary },
  scrollContent: { flexGrow: 1, paddingBottom: 48 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 52, paddingBottom: 12 },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  navLogo: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  navLogoChar: { fontSize: 20, fontFamily: 'Inter-ExtraBold', color: '#FFF' },
  navName: { fontSize: 17, fontFamily: 'Inter-Bold', color: Colors.text },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navSignIn: { paddingHorizontal: 6, paddingVertical: 6 },
  navSignInText: { fontSize: 13, fontFamily: 'Inter-Medium', color: Colors.textSecondary },
  navGetStarted: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  navGetStartedText: { fontSize: 12, fontFamily: 'Inter-Bold', color: '#FFF' },
  body: { alignItems: 'center', paddingHorizontal: 22, paddingTop: 24 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginBottom: 28 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 12, fontFamily: 'Inter-Medium' },
  heroLine1: { fontSize: 42, fontFamily: 'Inter-ExtraBold', color: Colors.text, lineHeight: 50, letterSpacing: -1, textAlign: 'center' },
  heroLine2: { fontSize: 42, fontFamily: 'Inter-ExtraBold', color: Colors.primary, lineHeight: 50, letterSpacing: -1, textAlign: 'center', marginBottom: 16 },
  heroSub: { fontSize: 15, fontFamily: 'Inter-Regular', color: Colors.textSecondary, lineHeight: 23, textAlign: 'center', marginBottom: 28 },
  heroBonusText: { color: Colors.primary, fontFamily: 'Inter-SemiBold' },
  marketCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 26, width: '100%', maxWidth: 300 },
  marketRow: { alignItems: 'center', paddingVertical: 8 },
  marketLabel: { fontSize: 9, fontFamily: 'Inter-Medium', color: Colors.textMuted, letterSpacing: 1, marginBottom: 3, textAlign: 'center' },
  marketPrice: { fontSize: 26, fontFamily: 'Inter-ExtraBold', color: Colors.text, textAlign: 'center' },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' },
  marketChange: { fontSize: 20, fontFamily: 'Inter-ExtraBold', textAlign: 'center' },
  marketVal: { fontSize: 15, fontFamily: 'Inter-Bold', color: Colors.text, textAlign: 'center' },
  marketDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 2 },
  ctaWrap: { width: '100%', maxWidth: 360, borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  ctaPrimary: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16 },
  ctaPrimaryText: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#FFF' },
  ctaSecWrap: { width: '100%', maxWidth: 360, borderRadius: 14 },
  ctaSecondary: { justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(21,27,46,0.7)' },
  ctaSecondaryText: { fontSize: 13, fontFamily: 'Inter-Medium', color: Colors.textSecondary },
});
