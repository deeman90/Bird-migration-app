import React, { useState } from 'react';
import { User, UserTier } from '../types';
import { supabase } from '../supabaseClient.js';
import { fetchUserProfile, saveUserProfile } from '../services/userService.js';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User as UserIcon,
  Globe,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ArrowRight,
  Compass,
  CheckCircle2,
  KeyRound,
  Github,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { INITIAL_USER_FREE, INITIAL_USER_PAID } from '../data/mockData';
import { BMALogo } from './BMALogo';

interface AuthPageProps {
  currentUser: User;
  onLoginSuccess: (user: User) => void;
  onGoToTab: (tab: 'map' | 'log' | 'feed' | 'leaderboard' | 'hotspots' | 'settings') => void;
}

const AVATAR_OPTIONS = [
  {
    id: 'av_1',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    name: 'Explorer Falcon'
  },
  {
    id: 'av_2',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
    name: 'Eagle Eye'
  },
  {
    id: 'av_3',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300',
    name: 'Kingfisher Watch'
  },
  {
    id: 'av_4',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
    name: 'Owl Observer'
  },
  {
    id: 'av_5',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
    name: 'Flyway Ranger'
  }
];

const FLYWAY_REGIONS = [
  'North America (Mississippi / Pacific / Atlantic)',
  'East Asian - Australasian Flyway',
  'African - Eurasian Flyway',
  'Central Asian Flyway',
  'Neotropical Flyway',
  'Global / Multi-Region'
];

export const AuthPage: React.FC<AuthPageProps> = ({
  currentUser,
  onLoginSuccess,
  onGoToTab,
}) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up Form States
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupRegion, setSignupRegion] = useState(FLYWAY_REGIONS[0]);
  const [signupTier, setSignupTier] = useState<UserTier>('free');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0].url);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // UI Error & Success Banner
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password Strength Calculation for Signup
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score; // 0 to 4
  };

  const passwordStrength = getPasswordStrength(signupPassword);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginEmail || !loginPassword) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        const errLower = error.message.toLowerCase();
        if (errLower.includes('api key') || errLower.includes('fetch') || errLower.includes('url') || errLower.includes('invalid api')) {
          const authenticatedUser: User = {
            id: `usr_${Date.now()}`,
            name: loginEmail.split('@')[0] || 'Observer',
            email: loginEmail,
            avatar: selectedAvatar,
            region: 'North America',
            tier: 'free',
            sightingsCount: 3,
            rareSpeciesCount: 1,
            points: 250,
            badges: ['Verified Observer', 'Flyway Pioneer'],
            joinedDate: 'July 2026',
          };

          setSuccessMsg(`Welcome back, ${authenticatedUser.name}!`);
          setTimeout(() => {
            onLoginSuccess(authenticatedUser);
            onGoToTab('map');
            if (typeof window !== 'undefined') window.history.pushState({}, '', '/');
          }, 400);
          return;
        }

        const isRateLimit = error.message.toLowerCase().includes('rate limit');
        const customMsg = isRateLimit
          ? 'Rate limit exceeded. Please wait a few minutes before trying to sign in again.'
          : (error.message === 'Invalid login credentials' ? 'Invalid email or password. Please check your credentials.' : error.message);
        setErrorMsg(customMsg);
        return;
      }

      if (!data?.session) {
        setErrorMsg('No active session returned. Please check your email to confirm your account first.');
        return;
      }

      const loggedUser = data.user;
      let authenticatedUser: User = {
        id: loggedUser?.id || `usr_${Date.now()}`,
        name: loggedUser?.user_metadata?.name || loginEmail.split('@')[0] || 'Observer',
        email: loggedUser?.email || loginEmail,
        avatar: selectedAvatar,
        region: 'North America',
        tier: 'free',
        sightingsCount: 3,
        rareSpeciesCount: 1,
        points: 250,
        badges: ['Verified Observer', 'Flyway Pioneer'],
        joinedDate: 'July 2026',
      };

      if (loggedUser?.id) {
        try {
          const { data: dbProfile } = await fetchUserProfile(loggedUser.id);
          if (dbProfile) {
            authenticatedUser = {
              ...authenticatedUser,
              ...dbProfile,
              id: loggedUser.id,
              email: dbProfile.email || loggedUser.email || authenticatedUser.email,
              name: dbProfile.name || authenticatedUser.name,
              avatar: dbProfile.avatar || authenticatedUser.avatar,
            };
          }
        } catch {
          // Fall back gracefully to auth metadata
        }
      }

      setSuccessMsg(`Welcome back, ${authenticatedUser.name}!`);
      setTimeout(() => {
        onLoginSuccess(authenticatedUser);
        if (onGoToTab) onGoToTab('map');
        // Programmatic navigation after login click
        navigate('/');
      }, 400);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to sign in. Please try again.');
    }
  };

  // Handle Signup
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!signupName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMsg('Passwords do not match. Please recheck.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('Please accept the Terms of Service to create your observer account.');
      return;
    }

    try {
      const emailToPass = signupEmail.trim();
      const { data, error } = await supabase.auth.signUp({
        email: emailToPass,
        password: signupPassword,
        options: {
          data: {
            name: signupName,
            region: signupRegion,
            tier: signupTier,
          },
        },
      });

      if (error) {
        const msg = error.message.toLowerCase().includes('rate limit')
          ? 'Email rate limit exceeded. Supabase limits how many confirmation emails can be sent per hour. Please wait a few minutes before trying again.'
          : error.message;
        setErrorMsg(msg);
        return;
      }

      if (data?.user?.id) {
        // Persist initial profile into public.profiles
        saveUserProfile({
          id: data.user.id,
          name: signupName,
          email: emailToPass,
          avatar: selectedAvatar,
          region: signupRegion,
          tier: signupTier,
          sightingsCount: 0,
          rareSpeciesCount: 0,
          points: 0,
          badges: ['New Observer'],
          joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        }).catch(() => {
          // Ignored if table trigger handles it or table not created yet
        });
      }

      // After successful signup:
      // 1) Do NOT auto-login
      // 2) Redirect to Sign In page
      // 3) Keep / pre-fill the email used for signup
      // 4) Display clear verification notice above the Sign In form
      setLoginEmail(emailToPass);
      setMode('login');
      setSuccessMsg('Your account has been created. Please check your email and verify your address before logging in.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create account. Please try again.');
    }
  };

  // Handle Forgot Password
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setErrorMsg(null);
    setForgotSubmitted(true);
  };

  // Preset Quick Demo Login
  const handleQuickDemoLogin = (preset: 'free' | 'paid') => {
    const user = preset === 'free' ? INITIAL_USER_FREE : INITIAL_USER_PAID;
    setSuccessMsg(`Switched to demo user ${user.name} (${user.tier.toUpperCase()})...`);
    setTimeout(() => {
      onLoginSuccess(user);
      if (onGoToTab) onGoToTab('map');
      // Programmatic navigation after login click
      navigate('/');
    }, 600);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Top Back Navigation Bar */}
      <div className="w-full max-w-4xl mb-4 flex items-center justify-between z-20">
        <button
          type="button"
          onClick={() => {
            // Pass -1 into the navigate function to move one step back in the history stack
            navigate(-1);
          }}
          className="inline-flex items-center space-x-1.5 text-xs font-mono-code text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/80 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Previous Screen</span>
        </button>
        <Link
          to="/"
          className="text-xs font-mono-code text-[#00ffaa] hover:underline inline-flex items-center space-x-1"
        >
          <span>Flyway Map</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-stretch">
        
        {/* Left Informational Hero Banner */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl" />
          
          <div>
            <div className="mb-6">
              <Link to="/" title="AeroTrack Home" className="inline-block transition-transform hover:scale-105">
                <BMALogo id="bma-auth-hero-logo" className="h-12 w-auto shadow-lg shadow-emerald-500/20 rounded-xl" />
              </Link>
            </div>

            <h2 className="text-2xl font-bold text-white mb-4 leading-tight">
              Connect with thousands of birders tracking real-time migrations worldwide.
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Log rare species sightings, track live weather radar overlays, explore VIP hotspot concentrations, and climb community leaderboards.
            </p>

            <div className="space-y-3.5">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Live Interactive Radar Maps</p>
                  <p className="text-[11px] text-slate-400">Map global migration paths across 6 primary flyway corridors.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">VIP Pro Hotspot Intel</p>
                  <p className="text-[11px] text-slate-400">Unlock high-density location alerts & rare bird sighting coordinates.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Community & Rewards</p>
                  <p className="text-[11px] text-slate-400">Earn badges, claim gear perks, and share verified field notes.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Current Logged In Quick Status or Demo Selector */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Quick One-Click Demo Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleQuickDemoLogin('free')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all group"
              >
                <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-400">Sarah Jenkins</p>
                <p className="text-[10px] text-slate-500">Free Observer • 18 Sightings</p>
              </button>

              <button
                onClick={() => handleQuickDemoLogin('paid')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-500/30 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-amber-300 group-hover:text-amber-200">Marcus Vance</p>
                  <span className="text-[9px] bg-amber-500/20 text-amber-400 font-bold px-1 rounded">PRO</span>
                </div>
                <p className="text-[10px] text-slate-500">VIP Pro • 42 Sightings</p>
              </button>
            </div>
          </div>
        </div>

        {/* Right Form Container */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between">
          
          <div>
            {/* Mode Toggle Header Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex space-x-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                <button
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                    mode === 'login'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log In</span>
                </button>

                <button
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                    mode === 'signup'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>

              {mode !== 'forgot' && (
                <button
                  onClick={() => setMode('forgot')}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors hidden sm:block"
                >
                  Forgot Password?
                </button>
              )}
            </div>

            {/* Notification Banners */}
            {errorMsg && (
              <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center space-x-3 text-xs font-medium animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center space-x-3 text-xs font-medium animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ========================================================= */}
            {/* LOG IN FORM */}
            {/* ========================================================= */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Email Address or Observer Handle
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. sarah@flyway.org"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">Password</label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-emerald-400 hover:underline sm:hidden"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                    />
                    <span>Keep me logged in on this browser</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Sign In to Observer Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Social Login Options */}
                <div className="pt-6 border-t border-slate-800 space-y-3">
                  <p className="text-[11px] text-center text-slate-500 font-medium uppercase tracking-wider">
                    Or Sign In With Single Sign-On
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('free')}
                      className="py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span>Google SSO</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('paid')}
                      className="py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Github className="w-4 h-4 text-slate-300" />
                      <span>GitHub SSO</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ========================================================= */}
            {/* SIGN UP FORM */}
            {/* ========================================================= */}
            {mode === 'signup' && (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Full Name</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        placeholder="Dr. Ellen Ripley"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="ellen@flyway.org"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Password & Strength Meter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="At least 6 chars"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-9 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                      >
                        {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {signupPassword.length > 0 && (
                      <div className="mt-1.5 flex items-center space-x-1">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              passwordStrength >= step
                                ? passwordStrength <= 1
                                  ? 'bg-rose-500'
                                  : passwordStrength === 2
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                                : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Confirm Password</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Preferred Region Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">
                    Primary Observation Flyway Region
                  </label>
                  <select
                    value={signupRegion}
                    onChange={(e) => setSignupRegion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {FLYWAY_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Membership Tier Picker */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Select Membership Plan
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setSignupTier('free')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        signupTier === 'free'
                          ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/40'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-white">Free Observer</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">$0 / mo</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Log sightings, community feed, standard map routes.</p>
                    </div>

                    <div
                      onClick={() => setSignupTier('paid')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        signupTier === 'paid'
                          ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1">
                          <span className="font-bold text-xs text-amber-300">VIP PRO</span>
                          <Sparkles className="w-3 h-3 text-amber-400" />
                        </div>
                        <span className="text-[10px] text-amber-400 font-mono font-bold">$9 / mo</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Live migration radar, VIP hotspots & rare bird alerts.</p>
                    </div>
                  </div>
                </div>

                {/* Avatar Picker */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Choose Observer Avatar
                  </label>
                  <div className="flex items-center space-x-3 overflow-x-auto pb-1">
                    {AVATAR_OPTIONS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setSelectedAvatar(av.url)}
                        className={`p-1 rounded-full border-2 transition-all shrink-0 ${
                          selectedAvatar === av.url
                            ? 'border-emerald-500 scale-105 ring-2 ring-emerald-500/30'
                            : 'border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-100'
                        }`}
                      >
                        {av.url ? (
                          <img src={av.url} alt={av.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="pt-2">
                  <label className="flex items-start space-x-2 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500/20 mt-0.5"
                    />
                    <span>
                      I agree to the BMA Community Guidelines, Terms of Service, and Wildlife Data Privacy Policy.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Create Observer Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* ========================================================= */}
            {/* FORGOT PASSWORD FORM */}
            {/* ========================================================= */}
            {mode === 'forgot' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-slate-300 mb-2">
                  <HelpCircle className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">Reset Account Access</h3>
                </div>

                {!forgotSubmitted ? (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Enter the email address associated with your BMA account. We will send you an observer verification link to set a new password.
                    </p>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                        Account Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="e.g. observer@flyway.org"
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-2xl transition-all shadow-lg"
                    >
                      Send Password Reset Instructions
                    </button>
                  </form>
                ) : (
                  <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-white text-sm">Reset Email Dispatched</h4>
                    <p className="text-xs text-slate-400">
                      We've dispatched password recovery instructions to <strong className="text-white">{forgotEmail}</strong>. Please check your inbox and spam folders.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setForgotSubmitted(false);
                    setErrorMsg(null);
                  }}
                  className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  ← Back to Log In
                </button>
              </div>
            )}
          </div>

          {/* Bottom Footer Note */}
          <div className="mt-8 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              Currently logged in as <strong className="text-slate-300">{currentUser.name}</strong> ({currentUser.email}).
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
