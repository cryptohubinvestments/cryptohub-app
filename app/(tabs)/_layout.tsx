import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Home, ArrowDownToLine, TrendingUp, ArrowUpFromLine } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 0,
          borderBottomWidth: 0,
          borderLeftWidth: 0,
          borderRightWidth: 0,
          borderColor: 'transparent',
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
          paddingHorizontal: 4,
          marginHorizontal: 8,
          marginBottom: 10,
          borderRadius: 16,
          position: 'absolute',
          ...Platform.select({
            web: { boxShadow: '0 -2px 14px rgba(0,0,0,0.3)' },
            default: { elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 8 },
          }),
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontFamily: 'Inter-Medium', fontSize: 9, marginTop: 3, marginBottom: 0, includeFontPadding: false, lineHeight: 12 },
        tabBarIconStyle: { marginTop: 0, marginBottom: 0, height: 20, width: 20 },
        tabBarItemStyle: { paddingVertical: 0, paddingHorizontal: 2, marginHorizontal: 0, justifyContent: 'center', alignItems: 'center', height: 48 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Home color={color} size={20} strokeWidth={2} /> }} />
      <Tabs.Screen name="deposit" options={{ title: 'Deposit', tabBarIcon: ({ color }) => <ArrowDownToLine color={color} size={20} strokeWidth={2} /> }} />
      <Tabs.Screen name="invest" options={{ title: 'Invest', tabBarIcon: ({ color }) => <TrendingUp color={color} size={20} strokeWidth={2} /> }} />
      <Tabs.Screen name="withdraw" options={{ title: 'Withdraw', tabBarIcon: ({ color }) => <ArrowUpFromLine color={color} size={20} strokeWidth={2} /> }} />
    </Tabs>
  );
}
