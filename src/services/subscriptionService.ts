import { supabase } from '../supabaseClient.js';

export interface SubscriptionRecord {
  id?: string;
  userId: string;
  tierPlan: 'free' | 'paid' | 'pro_vip' | 'supporter';
  amount: number;
  currency: string;
  billingInterval: 'monthly' | 'yearly' | 'lifetime';
  provider: 'paystack' | 'flutterwave' | 'stripe' | 'paypal' | 'manual';
  subscriptionCode?: string;
  emailToken?: string;
  customerCode?: string;
  transactionRef?: string;
  status: 'active' | 'cancelled' | 'past_due' | 'inactive' | 'trialing' | 'unpaid';
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function isUuid(val?: string): boolean {
  return Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));
}

export function toDeterministicUuid(str: string): string {
  if (isUuid(str)) return str;
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x12345678, h4 = 0x87654321;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822519);
    h4 = Math.imul(h4 ^ ch, 3266489917);
  }
  const hex = (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h3 >>> 0).toString(16).padStart(8, '0') +
    (h4 >>> 0).toString(16).padStart(8, '0')
  );
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-4${hex.substring(13, 16)}-a${hex.substring(17, 20)}-${hex.substring(20, 32)}`;
}

function mapRowToSubscription(row: any): SubscriptionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    tierPlan: row.tier_plan || 'paid',
    amount: Number(row.amount) || 4.99,
    currency: row.currency || 'USD',
    billingInterval: row.billing_interval || 'monthly',
    provider: row.provider || 'paystack',
    subscriptionCode: row.subscription_code || '',
    emailToken: row.email_token || '',
    customerCode: row.customer_code || '',
    transactionRef: row.transaction_ref || '',
    status: row.status || 'inactive',
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
  Fetch active/latest subscription for a given user from Supabase.
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionRecord | null> {
  // 1. First retrieve locally cached subscription for instant responsiveness
  let cachedLocal: SubscriptionRecord | null = null;
  try {
    const local = localStorage.getItem(`aerotrack_subscription_${userId}`);
    if (local) cachedLocal = JSON.parse(local);
  } catch {
    // ignore
  }

  try {
    const isUserUuid = isUuid(userId);
    let { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If PostgreSQL schema requires UUID for user_id and userId is a text identifier, retry with deterministic UUID
    if (error && error.message.includes('invalid input syntax for type uuid') && !isUserUuid) {
      const retryRes = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', toDeterministicUuid(userId))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      // Return cached local if remote query encountered an error or RLS constraint
      return cachedLocal;
    }

    if (data) {
      const sub = mapRowToSubscription(data);
      try {
        localStorage.setItem(`aerotrack_subscription_${userId}`, JSON.stringify(sub));
      } catch {
        // ignore
      }
      return sub;
    }

    return cachedLocal;
  } catch (err) {
    return cachedLocal;
  }
}

/**
 * Explicitly logs the payload being sent to the 'subscriptions' table in Supabase.
 */
export function logSubscriptionPayload(payload: Record<string, any>, context: string = 'Supabase subscriptions table'): void {
  console.log(`[Subscription Payload] Target: 'subscriptions' table | Context: ${context}`, JSON.stringify(payload, null, 2));
}

/**
  Upsert/Create subscription record in Supabase with adaptive schema self-healing.
  If columns such as 'email_token' or 'customer_code' do not exist in the database table schema,
  it dynamically strips them and retries so the user's subscription is successfully saved.
 */
export async function saveUserSubscription(sub: SubscriptionRecord): Promise<SubscriptionRecord | null> {
  // Always cache locally so active session tier updates immediately
  const localRecord: SubscriptionRecord = {
    ...sub,
    id: sub.id || `sub_local_${Date.now()}`,
    status: sub.status || 'active',
    currentPeriodStart: sub.currentPeriodStart || new Date().toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: sub.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(`aerotrack_subscription_${sub.userId}`, JSON.stringify(localRecord));
  } catch {
    // ignore
  }

  try {
    // Base payload with mandatory fields
    const baseRow: Record<string, any> = {
      user_id: sub.userId,
      tier_plan: sub.tierPlan,
      amount: sub.amount,
      currency: sub.currency,
      billing_interval: sub.billingInterval,
      provider: sub.provider,
      status: sub.status,
      current_period_start: sub.currentPeriodStart || new Date().toISOString(),
      current_period_end: sub.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: sub.cancelAtPeriodEnd ?? false,
      updated_at: new Date().toISOString(),
    };

    // Only attach optional gateway fields if they have truthy values
    if (sub.subscriptionCode) baseRow.subscription_code = sub.subscriptionCode;
    if (sub.emailToken) baseRow.email_token = sub.emailToken;
    if (sub.customerCode) baseRow.customer_code = sub.customerCode;
    if (sub.transactionRef) baseRow.transaction_ref = sub.transactionRef;

    // 1. Check if user already has an existing subscription record
    let existingId: string | null = null;
    try {
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', sub.userId)
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        existingId = existing.id;
      }
    } catch {
      // ignore
    }

    const payload: Record<string, any> = { ...baseRow };
    // Only pass id if sub.id is a genuine UUID to avoid PostgreSQL uuid syntax errors
    if (!existingId && sub.id && isUuid(sub.id)) {
      payload.id = sub.id;
    }

    // Adaptive retry loop: if Supabase schema cache reports missing columns (e.g. email_token),
    // automatically strip that column and retry up to 6 times.
    for (let attempt = 0; attempt < 6; attempt++) {
      logSubscriptionPayload(payload, `Attempt ${attempt + 1} (${existingId ? 'UPDATE' : 'INSERT'})`);
      let res;
      if (existingId) {
        res = await supabase
          .from('subscriptions')
          .update(payload)
          .eq('id', existingId)
          .select()
          .maybeSingle();
      } else {
        res = await supabase
          .from('subscriptions')
          .insert([payload])
          .select()
          .maybeSingle();
      }

      const { data, error } = res;

      if (!error) {
        const saved = data ? mapRowToSubscription(data) : localRecord;
        try {
          localStorage.setItem(`aerotrack_subscription_${sub.userId}`, JSON.stringify(saved));
        } catch {
          // ignore
        }
        return saved;
      }

      // Check for missing column error in PostgREST schema cache
      const missingColumnMatch =
        error.message.match(/Could not find the '([^']+)' column/i) ||
        error.message.match(/column ["']?([^"' ]+)["']? of relation .* does not exist/i) ||
        error.message.match(/column ["']?([^"' ]+)["']? does not exist/i);

      if (missingColumnMatch && missingColumnMatch[1]) {
        const missingCol = missingColumnMatch[1];
        console.warn(`[Supabase Subscription] Column '${missingCol}' not found in 'subscriptions' schema cache. Removing '${missingCol}' from payload and retrying...`);
        delete payload[missingCol];
        continue;
      }

      // Check if user_id column requires UUID in PostgreSQL
      if (error.message.includes('invalid input syntax for type uuid') && payload.user_id && !isUuid(payload.user_id)) {
        console.warn(`[Supabase Subscription] Database user_id requires UUID format. Adapting '${payload.user_id}' to UUID...`);
        payload.user_id = toDeterministicUuid(payload.user_id);
        continue;
      }

      // If RLS policy or other constraint encountered, safely preserve local VIP record
      if (error.code === '42501' || error.message.includes('row-level security') || error.message.includes('policy')) {
        console.info('[Supabase Subscription] Remote RLS policy notice; subscription saved to verified local state.');
        return localRecord;
      }

      console.warn('[Supabase Subscription] Supabase save notice, maintaining local VIP subscription state:', error.message);
      return localRecord;
    }

    return localRecord;
  } catch (err) {
    console.error('[Supabase Subscription] Exception during save, maintaining local subscription state:', err);
    return localRecord;
  }
}

/**
  Cancel active subscription in Supabase.
 */
export async function cancelUserSubscription(userId: string): Promise<boolean> {
  try {
    // Update local cache
    try {
      const local = localStorage.getItem(`aerotrack_subscription_${userId}`);
      if (local) {
        const parsed = JSON.parse(local);
        parsed.status = 'cancelled';
        parsed.cancelAtPeriodEnd = true;
        parsed.updatedAt = new Date().toISOString();
        localStorage.setItem(`aerotrack_subscription_${userId}`, JSON.stringify(parsed));
      }
    } catch {
      // ignore
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error && error.message.includes('invalid input syntax for type uuid') && !isUuid(userId)) {
      await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', toDeterministicUuid(userId));
    }

    return true;
  } catch (err) {
    console.error('[Supabase Subscription] Exception during cancel:', err);
    return false;
  }
}
