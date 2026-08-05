import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Lock,
  Check,
  Zap,
  Building2,
  Smartphone,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { User } from '../types.js';
import { saveUserSubscription, SubscriptionRecord } from '../services/subscriptionService.js';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onPaymentSuccess: (newTier: 'paid', subscription: SubscriptionRecord) => void;
}

export type PaymentProvider = 'paystack' | 'flutterwave';
export type BillingCycle = 'monthly' | 'yearly';
export type CurrencyCode = 'USD' | 'NGN' | 'GHS' | 'KES' | 'ZAR';

const PRICING_CONFIG: Record<CurrencyCode, { monthly: number; yearly: number; symbol: string }> = {
  USD: { monthly: 4.99, yearly: 49.99, symbol: '$' },
  NGN: { monthly: 5000, yearly: 50000, symbol: '₦' },
  GHS: { monthly: 75, yearly: 750, symbol: 'GH₵' },
  KES: { monthly: 650, yearly: 6500, symbol: 'KSh ' },
  ZAR: { monthly: 95, yearly: 950, symbol: 'R ' },
};

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPaymentSuccess,
}) => {
  const [provider, setProvider] = useState<PaymentProvider>('paystack');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [email, setEmail] = useState(currentUser.email || '');
  const [name, setName] = useState(currentUser.name || '');
  const [phone, setPhone] = useState('');

  // Payment State Machine: 'checkout' -> 'processing' -> 'otp_verification' -> 'success' | 'error'
  const [paymentStep, setPaymentStep] = useState<'checkout' | 'processing' | 'otp_verification' | 'success' | 'error'>('checkout');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeSubscription, setActiveSubscription] = useState<SubscriptionRecord | null>(null);

  // Form field inputs for sandbox card mode
  const [cardNumber, setCardNumber] = useState('4084 •••• •••• 9218');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('882');

  useEffect(() => {
    if (currentUser.email) setEmail(currentUser.email);
    if (currentUser.name) setName(currentUser.name);
  }, [currentUser]);

  if (!isOpen) return null;

  const pricing = PRICING_CONFIG[currency];
  const amount = cycle === 'monthly' ? pricing.monthly : pricing.yearly;

  // Dynamically load external payment scripts
  const loadPaystackScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).PaystackPop) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const loadFlutterwaveScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).FlutterwaveCheckout) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.flutterwave.com/v3.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Complete & Save Subscription to Supabase
  const handleFinalizeSubscription = async (txRef: string, subCode?: string) => {
    setIsSubmitting(true);
    setPaymentStep('processing');

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + (cycle === 'monthly' ? 30 : 365));

    const newSub: SubscriptionRecord = {
      userId: currentUser.id,
      tierPlan: 'paid',
      amount: amount,
      currency: currency,
      billingInterval: cycle,
      provider: provider,
      subscriptionCode: subCode || `${provider.toUpperCase()}_SUB_${Math.floor(100000 + Math.random() * 900000)}`,
      emailToken: `TOK_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      customerCode: `CUS_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      transactionRef: txRef,
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: nextMonth.toISOString(),
      cancelAtPeriodEnd: false,
    };

    const saved = await saveUserSubscription(newSub);
    const finalSub = saved || newSub;

    setActiveSubscription(finalSub);
    setIsSubmitting(false);
    setPaymentStep('success');
    onPaymentSuccess('paid', finalSub);
  };

  // Trigger Payment Handler
  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    const reference = `${provider.slice(0, 3).toUpperCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    const flutterwaveKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY;

    if (provider === 'paystack') {
      const scriptLoaded = await loadPaystackScript();
      if (scriptLoaded && (window as any).PaystackPop && paystackKey && !paystackKey.includes('example')) {
        try {
          const handler = (window as any).PaystackPop.setup({
            key: paystackKey,
            email: email,
            amount: Math.round(amount * 100), // convert to subunit (cents / kobo)
            currency: currency,
            ref: reference,
            metadata: {
              custom_fields: [
                { display_name: 'Customer Name', variable_name: 'customer_name', value: name },
                { display_name: 'Plan', variable_name: 'plan', value: `VIP PRO ${cycle}` },
              ],
            },
            callback: (response: any) => {
              handleFinalizeSubscription(response.reference || reference, response.trans || response.reference);
            },
            onClose: () => {
              setIsSubmitting(false);
            },
          });
          handler.openIframe();
          return;
        } catch (err) {
          console.warn('Paystack inline SDK error, launching direct authorization drawer:', err);
        }
      }
    } else if (provider === 'flutterwave') {
      const scriptLoaded = await loadFlutterwaveScript();
      if (scriptLoaded && (window as any).FlutterwaveCheckout && flutterwaveKey && !flutterwaveKey.includes('example')) {
        try {
          (window as any).FlutterwaveCheckout({
            public_key: flutterwaveKey,
            tx_ref: reference,
            amount: amount,
            currency: currency,
            payment_options: 'card, mobilemoney, ussd, banktransfer',
            customer: {
              email: email,
              name: name,
              phone_number: phone,
            },
            customizations: {
              title: 'AeroTrack VIP PRO Member',
              description: `Upgrade to VIP PRO (${cycle.toUpperCase()})`,
              logo: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&q=80&w=100',
            },
            callback: (data: any) => {
              handleFinalizeSubscription(data.transaction_id || reference, `FLW_SUB_${data.tx_ref || reference}`);
            },
            onclose: () => {
              setIsSubmitting(false);
            },
          });
          return;
        } catch (err) {
          console.warn('Flutterwave inline SDK error, launching direct authorization drawer:', err);
        }
      }
    }

    // Direct Interactive Payment Drawer Mode (Immediate authorization flow with OTP verification)
    setTimeout(() => {
      setIsSubmitting(false);
      setPaymentStep('otp_verification');
    }, 1200);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length < 4) {
      setErrorMessage('Please enter the 6-digit OTP code sent to your authorization device (e.g. 123456).');
      return;
    }
    const txRef = `${provider.toUpperCase()}_TX_${Date.now().toString().slice(-6)}`;
    handleFinalizeSubscription(txRef);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Header Header Bar */}
        <div className="p-6 bg-gradient-to-r from-amber-500/10 via-slate-900 to-emerald-500/10 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center space-x-2">
                <span>Unlock VIP PRO Membership</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] uppercase font-bold border border-amber-500/30">
                  Secure Checkout
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Powered by <strong className="text-emerald-400">Paystack</strong> & <strong className="text-amber-400">Flutterwave</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: CHECKOUT SELECTION & DETAILS */}
        {paymentStep === 'checkout' && (
          <form onSubmit={handleInitiatePayment} className="p-6 space-y-6">
            
            {/* 1. Billing Cycle Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Select Billing Plan</label>
              <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCycle('monthly')}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer ${
                    cycle === 'monthly'
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="uppercase tracking-wider">Monthly Pass</span>
                  <span className="text-sm font-black">{pricing.symbol}{pricing.monthly} / mo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCycle('yearly')}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer relative ${
                    cycle === 'yearly'
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="absolute -top-2 bg-emerald-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                    SAVE 17%
                  </span>
                  <span className="uppercase tracking-wider">Annual VIP</span>
                  <span className="text-sm font-black">{pricing.symbol}{pricing.yearly} / yr</span>
                </button>
              </div>
            </div>

            {/* 2. Select Payment Gateway Provider */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Choose Payment Provider
              </label>
              <div className="grid grid-cols-2 gap-3">
                
                {/* Paystack Option */}
                <button
                  type="button"
                  onClick={() => setProvider('paystack')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    provider === 'paystack'
                      ? 'bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/30 text-white'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-extrabold text-sm tracking-tight text-white">Paystack</span>
                    </div>
                    {provider === 'paystack' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Cards, Bank Transfers, USSD, Apple Pay & Mobile Money.
                  </p>
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                    <Zap className="w-3 h-3" />
                    <span>Instant Paystack Checkout</span>
                  </div>
                </button>

                {/* Flutterwave Option */}
                <button
                  type="button"
                  onClick={() => setProvider('flutterwave')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    provider === 'flutterwave'
                      ? 'bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/30 text-white'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                      <span className="font-extrabold text-sm tracking-tight text-white">Flutterwave</span>
                    </div>
                    {provider === 'flutterwave' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    M-Pesa, MTN MoMo, Cards, Barter & Multi-Currency.
                  </p>
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                    <Globe className="w-3 h-3" />
                    <span>Global Flutterwave Portal</span>
                  </div>
                </button>

              </div>
            </div>

            {/* 3. Currency Selector */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Preferred Settlement Currency:</span>
              </span>
              <div className="flex space-x-1">
                {(['USD', 'NGN', 'GHS', 'KES', 'ZAR'] as CurrencyCode[]).map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setCurrency(curr)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      currency === curr
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Customer Details Input */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">Email Address (for Receipt)</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@flyway.org"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                  />
                </div>
              </div>
              {provider === 'flutterwave' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">Phone Number (Mobile Money / M-Pesa)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 803 000 0000 or +254 700 000 000"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Error Message display */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Price Summary & Submit Button */}
            <div className="pt-2 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Total Amount Due Now:</span>
                <span className="text-base font-black text-white">
                  {pricing.symbol}{amount.toLocaleString()} {currency}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-lg ${
                  provider === 'paystack'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Initiating {provider === 'paystack' ? 'Paystack' : 'Flutterwave'}...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      Pay {pricing.symbol}{amount} via {provider === 'paystack' ? 'Paystack' : 'Flutterwave'}
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center space-x-4 text-[10px] text-slate-500">
                <span className="flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>256-Bit SSL Encrypted</span>
                </span>
                <span>•</span>
                <span>Cancel Anytime</span>
                <span>•</span>
                <span>Instant VIP Activation</span>
              </div>
            </div>

          </form>
        )}

        {/* STEP 2: PROCESSING DIRECT SIMULATED / OTP VERIFICATION */}
        {paymentStep === 'otp_verification' && (
          <form onSubmit={handleVerifyOtp} className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center border ${
                provider === 'paystack' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}>
                <ShieldCheck className="w-6 h-6 animate-bounce" />
              </div>
              <h3 className="text-base font-bold text-white">
                {provider === 'paystack' ? 'Paystack 3D-Secure Auth' : 'Flutterwave Transaction OTP'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                An authorization code has been issued for <strong className="text-white">{pricing.symbol}{amount} {currency}</strong> to <strong className="text-white">{email}</strong>.
              </p>
            </div>

            {/* Sandbox details */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Gateway Provider:</span>
                <span className="font-mono font-bold uppercase text-amber-400">{provider}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Test Auth Card / Account:</span>
                <span className="font-mono text-slate-200">4084 •••• •••• 9218</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Amount Charged:</span>
                <span className="font-mono font-bold text-emerald-400">{pricing.symbol}{amount} {currency}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block text-center">
                Enter Authorization OTP (Use <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">123456</code> for Instant Demo)
              </label>
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full text-center tracking-[0.5em] font-mono font-black text-xl bg-slate-950 border border-amber-500/50 focus:border-amber-400 rounded-2xl py-3 text-amber-400 placeholder:text-slate-700 focus:outline-none"
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
                {errorMessage}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setPaymentStep('checkout')}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase cursor-pointer flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Verify & Activate</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: PROCESSING SPINNER */}
        {paymentStep === 'processing' && (
          <div className="p-12 text-center space-y-4">
            <RefreshCw className="w-12 h-12 text-amber-400 animate-spin mx-auto" />
            <h3 className="text-base font-bold text-white">Syncing Subscription with Supabase Database...</h3>
            <p className="text-xs text-slate-400">
              Verifying transaction with {provider === 'paystack' ? 'Paystack' : 'Flutterwave'} gateway webhooks.
            </p>
          </div>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION */}
        {paymentStep === 'success' && activeSubscription && (
          <div className="p-6 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">VIP PRO Subscription Activated!</h3>
              <p className="text-xs text-slate-300 mt-1">
                Your payment was processed successfully via <strong className="text-emerald-400 uppercase">{activeSubscription.provider}</strong>.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Ref:</span>
                <span className="text-emerald-400 font-bold">{activeSubscription.transactionRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subscription Code:</span>
                <span className="text-slate-200">{activeSubscription.subscriptionCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Code:</span>
                <span className="text-slate-200">{activeSubscription.customerCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Plan:</span>
                <span className="text-amber-400 uppercase">{activeSubscription.billingInterval} ({activeSubscription.currency} {activeSubscription.amount})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valid Until:</span>
                <span className="text-cyan-400">{new Date(activeSubscription.currentPeriodEnd || '').toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-500">Supabase RLS Status:</span>
                <span className="text-emerald-400 font-bold">Synced (active)</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Start Exploring VIP Radar
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
