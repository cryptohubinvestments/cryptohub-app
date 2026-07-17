import { supabase } from './supabase';

// CoinGecko free endpoint — no API key required.
const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';

let cachedPrice: number | null = null;
let cachedAt = 0;

export async function fetchBtcPrice(): Promise<number> {
  const now = Date.now();
  if (cachedPrice && now - cachedAt < 60_000) return cachedPrice;
  try {
    const res = await fetch(COINGECKO_URL);
    if (!res.ok) throw new Error('price fetch failed');
    const json = await res.json();
    const price = json?.bitcoin?.usd;
    if (typeof price === 'number' && price > 0) {
      cachedPrice = price;
      cachedAt = now;
      return price;
    }
    throw new Error('invalid price');
  } catch {
    // Fallback to a reasonable default if the API is unreachable.
    if (cachedPrice) return cachedPrice;
    return 114000;
  }
}

export function usdToBtc(usd: number, price: number): number {
  if (!price) return 0;
  return usd / price;
}

export function btcToUsd(btc: number, price: number): number {
  return btc * price;
}

export function getInvestmentTier(usd: number): { name: string; roi: number; min: number; max: number | null; color: string } {
  if (usd >= 10000) return { name: 'Platinum', roi: 25, min: 10000, max: null, color: '#10B981' };
  if (usd >= 5000) return { name: 'Elite', roi: 20, min: 5000, max: 9999, color: '#F59E0B' };
  if (usd >= 1000) return { name: 'Pro', roi: 15, min: 1000, max: 4999, color: '#8B5CF6' };
  if (usd >= 500) return { name: 'Growth', roi: 10, min: 500, max: 999, color: '#06B6D4' };
  return { name: 'Starter', roi: 5, min: 50, max: 500, color: '#3B82F6' };
}

export const INVESTMENT_TIERS = [
  { name: 'Starter', roi: 5, min: 50, max: 500, color: '#3B82F6' },
  { name: 'Growth', roi: 10, min: 500, max: 999, color: '#06B6D4' },
  { name: 'Pro', roi: 15, min: 1000, max: 4999, color: '#8B5CF6' },
  { name: 'Elite', roi: 20, min: 5000, max: 9999, color: '#F59E0B' },
  { name: 'Platinum', roi: 25, min: 10000, max: null, color: '#10B981' },
];
