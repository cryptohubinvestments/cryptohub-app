import { supabase } from './supabase';
import { fetchBtcPrice, usdToBtc, getInvestmentTier } from './btc';
import { createTransaction, updateUserBalance } from './auth';

export async function submitDepositProof(
  userId: string,
  screenshotUrl: string,
  transactionId: string,
  usdAmount: number
): Promise<{ error?: string }> {
  const price = await fetchBtcPrice();
  const btcAmount = usdToBtc(usdAmount, price);
  const { error } = await supabase.from('deposit_proofs').insert({
    user_id: userId,
    screenshot_url: screenshotUrl,
    transaction_id: transactionId,
    usd_amount: usdAmount,
    btc_amount: btcAmount,
    status: 'pending',
  });
  if (error) return { error: error.message };
  return {};
}

export async function approveDepositProof(
  proofId: string
): Promise<{ error?: string }> {
  const { data: proof, error: fetchError } = await supabase
    .from('deposit_proofs')
    .select('*')
    .eq('id', proofId)
    .maybeSingle();
  if (fetchError || !proof) return { error: 'Proof not found' };
  if (proof.status === 'approved') return { error: 'Already approved' };

  const { data: user } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', proof.user_id)
    .maybeSingle();
  if (!user) return { error: 'User not found' };

  const newBalance = Number(user.btc_balance) + Number(proof.btc_amount);
  await supabase
    .from('app_users')
    .update({
      btc_balance: newBalance,
      withdrawal_unlocked: true,
    })
    .eq('id', user.id);

  await supabase
    .from('deposit_proofs')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', proofId);

  await createTransaction(
    user.id,
    'deposit',
    Number(proof.btc_amount),
    Number(proof.usd_amount),
    'Bitcoin deposit approved',
    'completed'
  );

  // Check referral: if this is the user's first approved deposit, pay referrer
  await checkAndPayReferral(user.id);

  return {};
}

export async function rejectDepositProof(
  proofId: string,
  note?: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('deposit_proofs')
    .update({
      status: 'rejected',
      admin_note: note || 'Rejected by admin',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', proofId);
  if (error) return { error: error.message };
  return {};
}

export async function checkAndPayReferral(userId: string): Promise<void> {
  const { data: user } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (!user || !user.referred_by) return;

  const { data: referral } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_id', userId)
    .maybeSingle();
  if (!referral || referral.reward_paid) return;

  // Pay referrer
  const { data: referrer } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', user.referred_by)
    .maybeSingle();
  if (!referrer) return;

  const rewardBtc = Number(referral.reward_btc);
  const newReferrerBalance = Number(referrer.btc_balance) + rewardBtc;
  await supabase
    .from('app_users')
    .update({ btc_balance: newReferrerBalance })
    .eq('id', referrer.id);

  await supabase
    .from('referrals')
    .update({ deposit_approved: true, reward_paid: true })
    .eq('id', referral.id);

  const price = await fetchBtcPrice();
  const rewardUsd = rewardBtc * price;
  await createTransaction(
    referrer.id,
    'referral_reward',
    rewardBtc,
    rewardUsd,
    `Referral reward — ${user.username} made their first deposit`,
    'completed'
  );
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

export async function createInvestment(
  userId: string,
  usdAmount: number,
  currentBalanceBtc: number
): Promise<{ error?: string; investment?: any }> {
  if (usdAmount < 50) return { error: 'Minimum investment is $50' };

  const price = await fetchBtcPrice();
  const btcAmount = usdToBtc(usdAmount, price);
  if (btcAmount > currentBalanceBtc) return { error: 'Insufficient BTC balance' };

  const tier = getInvestmentTier(usdAmount);
  const { data: investment, error } = await supabase
    .from('investments')
    .insert({
      user_id: userId,
      principal_btc: btcAmount,
      principal_usd: usdAmount,
      hourly_roi_percent: tier.roi,
      status: 'active',
    })
    .select()
    .single();
  if (error || !investment) return { error: 'Failed to create investment' };

  // Deduct BTC from balance
  const newBalance = currentBalanceBtc - btcAmount;
  await updateUserBalance(userId, newBalance);

  await createTransaction(
    userId,
    'investment',
    btcAmount,
    usdAmount,
    `Investment created — ${tier.name} tier @ ${tier.roi}%/hr`,
    'completed'
  );

  return { investment };
}

export function calculateProfit(investment: any, currentPrice: number): {
  elapsedHours: number;
  profitUsd: number;
  profitBtc: number;
  currentValueUsd: number;
  currentValueBtc: number;
} {
  const startedAt = new Date(investment.started_at).getTime();
  const now = Date.now();
  const elapsedMs = Math.max(0, now - startedAt);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const roi = Number(investment.hourly_roi_percent) / 100;
  const principalUsd = Number(investment.principal_usd);
  const profitUsd = principalUsd * roi * elapsedHours;
  const profitBtc = profitUsd / currentPrice;
  const currentValueUsd = principalUsd + profitUsd;
  const currentValueBtc = currentValueUsd / currentPrice;
  return { elapsedHours, profitUsd, profitBtc, currentValueUsd, currentValueBtc };
}

export async function closeInvestment(
  investmentId: string,
  userId: string
): Promise<{ error?: string }> {
  const { data: investment, error: fetchError } = await supabase
    .from('investments')
    .select('*')
    .eq('id', investmentId)
    .maybeSingle();
  if (fetchError || !investment) return { error: 'Investment not found' };
  if (investment.status !== 'active') return { error: 'Investment already closed' };

  const price = await fetchBtcPrice();
  const { profitBtc, profitUsd, currentValueBtc } = calculateProfit(investment, price);

  const { data: user } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (!user) return { error: 'User not found' };

  // Return principal + profit
  const totalReturnBtc = Number(investment.principal_btc) + profitBtc;
  const newBalance = Number(user.btc_balance) + totalReturnBtc;
  await updateUserBalance(userId, newBalance);

  await supabase
    .from('investments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      profit_collected_btc: profitBtc,
    })
    .eq('id', investmentId);

  await createTransaction(
    userId,
    'investment_return',
    totalReturnBtc,
    Number(investment.principal_usd) + profitUsd,
    `Investment closed — Principal + $${profitUsd.toFixed(2)} profit`,
    'completed'
  );

  return {};
}

export async function requestWithdrawal(
  userId: string,
  btcAmount: number,
  walletAddress: string
): Promise<{ error?: string }> {
  const { data: user } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (!user) return { error: 'User not found' };
  if (!user.withdrawal_unlocked) return { error: 'Withdrawals locked' };
  if (btcAmount <= 0) return { error: 'Enter a valid amount' };
  if (btcAmount > Number(user.btc_balance)) return { error: 'Insufficient balance' };

  const price = await fetchBtcPrice();
  const usdAmount = btcAmount * price;

  const { error } = await supabase.from('withdrawals').insert({
    user_id: userId,
    btc_amount: btcAmount,
    usd_amount: usdAmount,
    wallet_address: walletAddress,
    status: 'pending',
  });
  if (error) return { error: error.message };

  // Deduct balance immediately (held in escrow)
  const newBalance = Number(user.btc_balance) - btcAmount;
  await updateUserBalance(userId, newBalance);

  await createTransaction(
    userId,
    'withdrawal',
    btcAmount,
    usdAmount,
    `Withdrawal to ${walletAddress.slice(0, 12)}...`,
    'pending'
  );

  return {};
}

export async function approveWithdrawal(withdrawalId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('withdrawals')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', withdrawalId);
  if (error) return { error: error.message };

  const { data: w } = await supabase.from('withdrawals').select('*').eq('id', withdrawalId).maybeSingle();
  if (w) {
    await supabase.from('transactions').update({ status: 'completed' }).eq('user_id', w.user_id).eq('type', 'withdrawal').order('created_at', { ascending: false }).limit(1);
  }
  return {};
}

export async function rejectWithdrawal(withdrawalId: string, note?: string): Promise<{ error?: string }> {
  const { data: w } = await supabase.from('withdrawals').select('*').eq('id', withdrawalId).maybeSingle();
  if (!w) return { error: 'Withdrawal not found' };

  // Refund the BTC
  const { data: user } = await supabase.from('app_users').select('*').eq('id', w.user_id).maybeSingle();
  if (user) {
    const newBalance = Number(user.btc_balance) + Number(w.btc_amount);
    await updateUserBalance(user.id, newBalance);
  }

  const { error } = await supabase
    .from('withdrawals')
    .update({ status: 'rejected', admin_note: note || 'Rejected by admin', reviewed_at: new Date().toISOString() })
    .eq('id', withdrawalId);
  if (error) return { error: error.message };

  await supabase.from('transactions').update({ status: 'failed' }).eq('user_id', w.user_id).eq('type', 'withdrawal').order('created_at', { ascending: false }).limit(1);
  return {};
}

export async function adminAdjustBalance(
  userId: string,
  deltaBtc: number,
  reason: string
): Promise<{ error?: string }> {
  const { data: user } = await supabase.from('app_users').select('*').eq('id', userId).maybeSingle();
  if (!user) return { error: 'User not found' };
  const newBalance = Number(user.btc_balance) + deltaBtc;
  if (newBalance < 0) return { error: 'Balance cannot go negative' };
  await updateUserBalance(userId, newBalance);
  const price = await fetchBtcPrice();
  await createTransaction(
    userId,
    deltaBtc > 0 ? 'bonus' : 'withdrawal',
    Math.abs(deltaBtc),
    Math.abs(deltaBtc) * price,
    `Admin adjustment: ${reason}`,
    'completed'
  );
  return {};
}
