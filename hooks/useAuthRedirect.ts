import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export function useAuthRedirect() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminRoute = segments[0] === 'admin';
    const isLanding = (segments as readonly string[]).length === 0;

    if (inAdminRoute) return;

    if (!user && !inAuthGroup && !isLanding) {
      router.replace('/');
    } else if (user && (inAuthGroup || isLanding)) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);
}
