import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

export const DEPOSIT_BTC_ADDRESS = 'bc1qlwhhjgpwwnfcya0ksj9gc9a7pxpx2yr7ymg5s0';
export const SIGNUP_BONUS_USD = 50;
export const REFERRAL_REWARD_USD = 25;
