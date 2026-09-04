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
      console.warn('[Supabase Subscription] Error fetching subscription:', error.message);
      return null;
    }

    return data ? mapRowToSubscription(data) : null;
  } catch (err) {
    console.error('[Supabase Subscription] Exception during fetch:', err);
    return null;
  }
}

/**
  Upsert/Create subscription record in Supabase without requiring ON CONFLICT constraint on user_id.
 */
export async function saveUserSubscription(sub: SubscriptionRecord): Promise<SubscriptionRecord | null> {
  try {
    const row: Record<string, any> = {
      user_id: sub.userId,
      tier_plan: sub.tierPlan,
      amount: sub.amount,
      currency: sub.currency,
      billing_interval: sub.billingInterval,
      provider: sub.provider,
      subscription_code: sub.subscriptionCode || null,
      email_token: sub.emailToken || null,
      customer_code: sub.customerCode || null,
      transaction_ref: sub.transactionRef || null,
      status: sub.status,
      current_period_start: sub.currentPeriodStart || new Date().toISOString(),
      current_period_end: sub.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: sub.cancelAtPeriodEnd ?? false,
      updated_at: new Date().toISOString(),
    };

    // 1. Check if user already has an existing subscription record
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', sub.userId)
      .limit(1)
      .maybeSingle();

    let data;
    let error;

    if (existing?.id) {
      // Update existing record using Primary Key ID
      const res = await supabase
        .from('subscriptions')
        .update(row)
        .eq('id', existing.id)
        .select()
        .single();
      data = res.data;
      error = res.error;
    } else {
      // Insert new record
      if (sub.id) {
        row.id = sub.id;
      }
      const res = await supabase
        .from('subscriptions')
        .insert([row])
        .select()
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('[Supabase Subscription] Error saving subscription:', error.message);
      return null;
    }

    return data ? mapRowToSubscription(data) : null;
  } catch (err) {
    console.error('[Supabase Subscription] Exception during save:', err);
    return null;
  }
}

/**
  Cancel active subscription in Supabase.
 */
export async function cancelUserSubscription(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[Supabase Subscription] Error cancelling subscription:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase Subscription] Exception during cancel:', err);
    return false;
  }
}
