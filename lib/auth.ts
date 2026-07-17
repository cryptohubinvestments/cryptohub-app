import { supabase } from './supabase';
import { hashPasscode } from './crypto';
import { SIGNUP_BONUS_USD, REFERRAL_REWARD_USD } from './supabase';
import { fetchBtcPrice, usdToBtc } from './btc';

export interface AppUser {
  id: string;
  username: string;
  passcode_hash: string;
  referral_code: string;
  referred_by: string | null;
  btc_balance: number;
  withdrawal_unlocked: boolean;
  created_at: string;
}

const SESSION_KEY = 'crypto_hub_session_user_id';

export async function signUp(
  username: string,
  passcode: string,
  referralCode?: string
): Promise<{ user?: AppUser; error?: string }> {
  const trimmedName = username.trim();
  if (trimmedName.length < 3) return { error: 'Username must be at least 3 characters' };
  if (!/^\d{6}$/.test(passcode)) return { error: 'Passcode must be exactly 6 digits' };

  // Check if username already exists
  const { data: existing } = await supabase
    .from('app_users')
    .select('id')
    .eq('username', trimmedName)
    .maybeSingle();
  if (existing) return { error: 'Username already taken' };

  let referrerId: string | null = null;
  if (referralCode) {
    const { data: referrer } = await supabase
      .from('app_users')
      .select('id')
      .eq('referral_code', referralCode.trim().toUpperCase())
      .maybeSingle();
    if (referrer) referrerId = referrer.id;
  }

  let passcodeHash: string;
  try {
    passcodeHash = await hashPasscode(passcode);
  } catch (e) {
    return { error: 'Security error. Please try again.' };
  }
  const { data: newUser, error: insertError } = await supabase
    .from('app_users')
    .insert({
      username: trimmedName,
      passcode_hash: passcodeHash,
      referred_by: referrerId,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
      return { error: 'Username already taken' };
    }
    return { error: 'Failed to create account. Please try again.' };
  }
  if (!newUser) return { error: 'Failed to create account. Please try again.' };

  // Credit $50 signup bonus in BTC
  const price = await fetchBtcPrice();
  const bonusBtc = usdToBtc(SIGNUP_BONUS_USD, price);
  await supabase.from('app_users').update({ btc_balance: bonusBtc }).eq('id', newUser.id);

  // Create referral record if applicable
  if (referrerId) {
    const rewardBtc = usdToBtc(REFERRAL_REWARD_USD, price);
    await supabase.from('referrals').insert({
      referrer_id: referrerId,
      referred_id: newUser.id,
      reward_btc: rewardBtc,
    });
  }

  // Create bonus transaction
  await supabase.from('transactions').insert({
    user_id: newUser.id,
    type: 'bonus',
    btc_amount: bonusBtc,
    usd_amount: SIGNUP_BONUS_USD,
    description: 'Welcome bonus — $50 BTC credited',
    status: 'completed',
  });

  await setSession(newUser.id);
  return { user: { ...newUser, btc_balance: bonusBtc } };
}

export async function signIn(
  username: string,
  passcode: string
): Promise<{ user?: AppUser; error?: string }> {
  const trimmedName = username.trim();
  if (!trimmedName || !passcode) return { error: 'Enter username and passcode' };

  const { data: user, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('username', trimmedName)
    .maybeSingle();
  if (error || !user) return { error: 'Invalid username or passcode' };

  let passcodeHash: string;
  try {
    passcodeHash = await hashPasscode(passcode);
  } catch {
    return { error: 'Sign-in error. Please try again.' };
  }
  if (user.passcode_hash !== passcodeHash) return { error: 'Invalid username or passcode' };

  await setSession(user.id);
  return { user };
}

export async function setSession(userId: string): Promise<void> {
  try {
    localStorage.setItem(SESSION_KEY, userId);
  } catch {
    // ignore
  }
}

export async function getSession(): Promise<string | null> {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const id = await getSession();
  if (!id) return null;
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function updateUserBalance(
  userId: string,
  newBalance: number
): Promise<boolean> {
  const { error } = await supabase
    .from('app_users')
    .update({ btc_balance: newBalance })
    .eq('id', userId);
  return !error;
}

export async function createTransaction(
  userId: string,
  type: string,
  btcAmount: number,
  usdAmount: number,
  description: string,
  status = 'completed'
): Promise<void> {
  await supabase.from('transactions').insert({
    user_id: userId,
    type,
    btc_amount: btcAmount,
    usd_amount: usdAmount,
    description,
    status,
  });
}

export async function adminLogin(username: string, passcode: string): Promise<{ success?: boolean; error?: string }> {
  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('username', username.trim())
    .maybeSingle();
  if (error || !admin) return { error: 'Invalid admin credentials' };
  let passcodeHash: string;
  try {
    passcodeHash = await hashPasscode(passcode);
  } catch {
    return { error: 'Admin login error. Please try again.' };
  }
  if (admin.passcode_hash !== passcodeHash) return { error: 'Invalid admin credentials' };
  return { success: true };
}

export async function getUserTransactions(
  userId: string,
  limit = 100
): Promise<any[]> {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getActiveInvestments(userId: string): Promise<any[]> {
  const { data } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('started_at', { ascending: false });
  return data || [];
}

export async function getCompletedInvestments(userId: string): Promise<any[]> {
  const { data } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20);
  return data || [];
}
