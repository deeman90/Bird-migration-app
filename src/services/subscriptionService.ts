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
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase Subscription] Note fetching subscription from Supabase:', error.message);
      // Fallback to local cached subscription
      try {
        const local = localStorage.getItem(`aerotrack_subscription_${userId}`);
        if (local) return JSON.parse(local);
      } catch {
        // ignore
      }
      return null;
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

    // Check local fallback if no remote record found
    try {
      const local = localStorage.getItem(`aerotrack_subscription_${userId}`);
      if (local) return JSON.parse(local);
    } catch {
      // ignore
    }

    return null;
  } catch (err) {
    console.error('[Supabase Subscription] Exception during fetch:', err);
    try {
      const local = localStorage.getItem(`aerotrack_subscription_${userId}`);
      if (local) return JSON.parse(local);
    } catch {
      // ignore
    }
    return null;
  }
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
    if (!existingId && sub.id) {
      payload.id = sub.id;
    }

    // Adaptive retry loop: if Supabase schema cache reports missing columns (e.g. email_token),
    // automatically strip that column and retry up to 6 times.
    for (let attempt = 0; attempt < 6; attempt++) {
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
      // Example 1: "Could not find the 'email_token' column of 'subscriptions' in the schema cache"
      // Example 2: "column \"email_token\" of relation \"subscriptions\" does not exist"
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

      // If it's another error (e.g. table not created yet or RLS policy), warn and return localRecord
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

    if (error) {
      if (error.message.includes('cancel_at_period_end') || error.message.includes('column')) {
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('user_id', userId);
      } else {
        console.warn('[Supabase Subscription] Error cancelling subscription:', error.message);
      }
    }
    return true;
  } catch (err) {
    console.error('[Supabase Subscription] Exception during cancel:', err);
    return false;
  }
}
