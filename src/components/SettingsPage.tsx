import React, { useState, useEffect } from 'react';
import { User, UserAddress, UserTier } from '../types';
import { uploadFileToSupabaseStorage, deleteFileFromSupabaseStorage } from '../services/storageService.js';
import { getUserSubscription, cancelUserSubscription, SubscriptionRecord } from '../services/subscriptionService.js';
import {
  User as UserIcon,
  Camera,
  MapPin,
  Mail,
  Phone,
  Globe,
  Twitter,
  Instagram,
  Bell,
  Shield,
  Check,
  Save,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Lock,
  Upload,
  Link,
  Info,
  CheckCircle2,
  Award,
  Sliders,
  Compass,
  ChevronRight,
  LogOut,
  Gift,
  Copy,
  Share2,
  Users,
} from 'lucide-react';

interface SettingsPageProps {
  currentUser: User;
  onSaveUser: (updatedUser: User) => void;
  onToggleUserTier: () => void;
  onLogout?: () => void;
}

const PRESET_AVATARS = [
  {
    id: 'av_1',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    name: 'Coastal Observer',
  },
  {
    id: 'av_2',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
    name: 'Eagle Spotter',
  },
  {
    id: 'av_3',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300',
    name: 'Flyway Ranger',
  },
  {
    id: 'av_4',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
    name: 'Owl Tracker',
  },
  {
    id: 'av_5',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
    name: 'Dr. Ornithologist',
  },
];

const REGION_OPTIONS = [
  'North America',
  'South America',
  'Europe',
  'Asia & Pacific',
  'Africa & Middle East',
  'Global / Multi-region',
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentUser,
  onSaveUser,
  onToggleUserTier,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'address' | 'social' | 'notifications' | 'referral' | 'account'>('profile');

  // Local Form States initialized from currentUser
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [region, setRegion] = useState(currentUser.region || 'North America');
  const [bio, setBio] = useState(currentUser.bio || '');

  // Referral Program States
  const defaultRefCode = currentUser.referralCode || `BMA-${(currentUser.name || 'BIRDER').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-${(currentUser.id || '777').slice(-4).toUpperCase()}`;
  const [referralCode, setReferralCode] = useState(defaultRefCode);
  const [referredCount, setReferredCount] = useState(currentUser.referredCount || 3);
  const [hasCopied, setHasCopied] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [referralStatusMsg, setReferralStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active Supabase Subscription Record state
  const [dbSub, setDbSub] = useState<SubscriptionRecord | null>(null);

  useEffect(() => {
    async function loadSub() {
      if (currentUser.id) {
        const sub = await getUserSubscription(currentUser.id);
        setDbSub(sub);
      }
    }
    loadSub();
  }, [currentUser.id, currentUser.tier]);

  // Address fields
  const [street, setStreet] = useState(currentUser.address?.street || '');
  const [city, setCity] = useState(currentUser.address?.city || '');
  const [state, setState] = useState(currentUser.address?.state || '');
  const [postalCode, setPostalCode] = useState(currentUser.address?.postalCode || '');
  const [country, setCountry] = useState(currentUser.address?.country || '');

  // Birder details
  const [favoriteBird, setFavoriteBird] = useState(currentUser.favoriteBird || '');
  const [cameraGear, setCameraGear] = useState(currentUser.cameraGear || '');

  // Social
  const [socialWebsite, setSocialWebsite] = useState(currentUser.socialWebsite || '');
  const [socialTwitter, setSocialTwitter] = useState(currentUser.socialTwitter || '');
  const [socialInstagram, setSocialInstagram] = useState(currentUser.socialInstagram || '');

  // Preferences
  const [migrationAlerts, setMigrationAlerts] = useState(
    currentUser.emailNotifications?.migrationAlerts ?? true
  );
  const [communityActivity, setCommunityActivity] = useState(
    currentUser.emailNotifications?.communityActivity ?? true
  );
  const [weeklyDigest, setWeeklyDigest] = useState(
    currentUser.emailNotifications?.weeklyDigest ?? false
  );
  const [privacyMode, setPrivacyMode] = useState<'public' | 'blurred_location' | 'private'>(
    currentUser.privacyMode || 'public'
  );

  // Custom Image URL Input
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  // Handle Avatar Image Upload from Local Computer
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSavedMessage('File size exceeds 5MB limit. Please select a smaller photo.');
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 4000);
        return;
      }
      setSavedMessage('Uploading avatar to secure storage...');
      setIsSaved(true);

      const result = await uploadFileToSupabaseStorage({
        file,
        userId: currentUser.id || 'usr_001',
        featureName: 'avatars',
        itemId: 'profile',
      });

      if (result.signedUrl) {
        if (avatar && avatar !== result.signedUrl) {
          await deleteFileFromSupabaseStorage(avatar);
        }
        setAvatar(result.signedUrl);
        setSavedMessage('Avatar uploaded to Storage successfully!');
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setAvatar(reader.result as string);
          }
        };
        reader.readAsDataURL(file);
        setSavedMessage('Avatar preview loaded.');
      }
      setTimeout(() => setIsSaved(false), 4000);
    }
  };

  // Copy Referral Code Handler
  const handleCopyReferralCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralCode);
    }
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2500);
  };

  // Redeem Friend's Referral Code Handler
  const handleRedeemFriendCode = (e?: React.SyntheticEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    const cleanCode = friendCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setReferralStatusMsg({ type: 'error', text: 'Please enter a valid referral code.' });
      return;
    }
    if (cleanCode === referralCode.toUpperCase()) {
      setReferralStatusMsg({ type: 'error', text: 'You cannot redeem your own referral code!' });
      return;
    }

    const bonusPoints = 50;
    const newPointsTotal = (currentUser.points || 0) + bonusPoints;
    const updatedUser: User = {
      ...currentUser,
      points: newPointsTotal,
      referralCode,
      referredCount,
    };

    onSaveUser(updatedUser);
    setReferralStatusMsg({
      type: 'success',
      text: `🎉 Success! Referral code "${cleanCode}" applied! +${bonusPoints} Flyway Points added to your account.`,
    });
    setFriendCodeInput('');
  };

  // Quick Sample Address Fill
  const handleFillSampleAddress = () => {
    setStreet('1200 San Antonio Road');
    setCity('Palo Alto');
    setState('CA');
    setPostalCode('94303');
    setCountry('United States');
  };

  // Save Settings Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedUser: User = {
      ...currentUser,
      name,
      email,
      phone,
      avatar: avatar || currentUser.avatar,
      region,
      bio,
      address: {
        street,
        city,
        state,
        postalCode,
        country,
      },
      favoriteBird,
      cameraGear,
      socialWebsite,
      socialTwitter,
      socialInstagram,
      emailNotifications: {
        migrationAlerts,
        communityActivity,
        weeklyDigest,
      },
      privacyMode,
      referralCode,
      referredCount,
    };

    onSaveUser(updatedUser);
    setIsSaved(true);
    setSavedMessage('Profile and personal information updated successfully!');

    setTimeout(() => {
      setIsSaved(false);
      setSavedMessage('');
    }, 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 animate-in fade-in duration-300 text-[#edeeef]">
      
      {/* Page Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-[rgba(237,238,239,0.1)]">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-mono-code text-[10px] uppercase tracking-widest text-[#00ffaa]">
              BMA Systems
            </span>
          </div>
          <h1 className="font-syne font-extrabold text-3xl sm:text-5xl text-[#edeeef] tracking-tight leading-none">
            Account Settings
          </h1>
          <p className="text-[#edeeef]/60 text-xs sm:text-sm mt-2 max-w-lg">
            Manage your personal profile, address, flyway preferences, and privacy controls.
          </p>
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full sm:w-auto min-h-[44px] bg-[#00ffaa] text-[#0b0c0d] font-syne font-extrabold text-xs sm:text-sm uppercase tracking-wider py-3 px-6 hover:bg-[#00ffaa]/90 shadow-lg shadow-[#00ffaa]/20 transition-all cursor-pointer rounded flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save All Changes</span>
          </button>
        </div>
      </div>

      {/* Save Toast Notification */}
      {isSaved && (
        <div className="mb-6 p-4 rounded bg-[#00ffaa]/10 border border-[#00ffaa]/40 text-[#00ffaa] flex items-center justify-between shadow-xl animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-[#00ffaa] shrink-0" />
            <p className="font-mono-code text-xs uppercase tracking-wider font-semibold">{savedMessage}</p>
          </div>
        </div>
      )}

      {/* Grid Layout: Left Tabs/Navigation & Profile Card, Right Content Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* Left Column (Navigation & Live Profile Card) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Navigation Tabs List */}
          <div className="bg-[rgba(237,238,239,0.03)] border border-[rgba(237,238,239,0.1)] rounded p-2 flex overflow-x-auto lg:flex-col gap-1 no-scrollbar">
            <span className="font-mono-code text-[10px] text-[#edeeef]/50 uppercase tracking-widest px-3 py-1.5 hidden lg:block">Navigation</span>
            <button
              onClick={() => setActiveTab('profile')}
              className={`min-h-[44px] shrink-0 lg:w-full flex items-center justify-between px-3.5 py-2.5 rounded text-xs font-mono-code uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] font-bold'
                  : 'text-[#edeeef]/60 hover:bg-[#edeeef]/5 hover:text-[#edeeef]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <UserIcon className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Personal Info</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60 hidden lg:block" />
            </button>

            <button
              onClick={() => setActiveTab('address')}
              className={`min-h-[44px] shrink-0 lg:w-full flex items-center justify-between px-3.5 py-2.5 rounded text-xs font-mono-code uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'address'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] font-bold'
                  : 'text-[#edeeef]/60 hover:bg-[#edeeef]/5 hover:text-[#edeeef]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Address</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60 hidden lg:block" />
            </button>

            <button
              onClick={() => setActiveTab('social')}
              className={`min-h-[44px] shrink-0 lg:w-full flex items-center justify-between px-3.5 py-2.5 rounded text-xs font-mono-code uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'social'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] font-bold'
                  : 'text-[#edeeef]/60 hover:bg-[#edeeef]/5 hover:text-[#edeeef]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Globe className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Social Links</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60 hidden lg:block" />
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`min-h-[44px] shrink-0 lg:w-full flex items-center justify-between px-3.5 py-2.5 rounded text-xs font-mono-code uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] font-bold'
                  : 'text-[#edeeef]/60 hover:bg-[#edeeef]/5 hover:text-[#edeeef]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Bell className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Alerts</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60 hidden lg:block" />
            </button>

            <button
              onClick={() => setActiveTab('referral')}
              className={`min-h-[44px] shrink-0 lg:w-full flex items-center justify-between px-3.5 py-2.5 rounded text-xs font-mono-code uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'referral'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] font-bold'
                  : 'text-[#edeeef]/60 hover:bg-[#edeeef]/5 hover:text-[#edeeef]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Gift className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Referral Program</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60 hidden lg:block" />
            </button>

            <button
              onClick={() => setActiveTab('account')}
              className={`min-h-[44px] shrink-0 lg:w-full flex items-center justify-between px-3.5 py-2.5 rounded text-xs font-mono-code uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'account'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] font-bold'
                  : 'text-[#edeeef]/60 hover:bg-[#edeeef]/5 hover:text-[#edeeef]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Shield className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Tier & Access</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60 hidden lg:block" />
            </button>
          </div>

          {/* Live Profile Card Preview (Matching Design HTML Preview Pane) */}
          <div className="border border-[rgba(237,238,239,0.1)] rounded p-5 bg-[#0b0c0d]">
            <span className="font-mono-code text-[10px] text-[#edeeef]/60 uppercase tracking-widest block mb-4">
              Profile Card Preview
            </span>

            <div className="aspect-square w-full bg-[rgba(237,238,239,0.05)] mb-4 overflow-hidden rounded border border-[rgba(237,238,239,0.1)]">
              <img
                src={avatar || currentUser.avatar}
                alt={name || 'Profile Avatar'}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="font-syne text-2xl font-extrabold text-[#edeeef] tracking-tight">
              {name || 'Birder Observer'}
            </div>
            <div className="font-mono-code text-xs text-[#edeeef]/60 mb-4">
              {email || 'observer@bma.io'}
            </div>

            <div className="space-y-0 text-xs">
              <div className="py-2.5 border-t border-[rgba(237,238,239,0.1)] flex justify-between font-mono-code">
                <span className="text-[#edeeef]/60">Status</span>
                <span className="text-[#00ffaa] font-semibold">
                  {currentUser.tier === 'paid' ? 'VIP PRO Observer' : 'Free Observer'}
                </span>
              </div>
              <div className="py-2.5 border-t border-[rgba(237,238,239,0.1)] flex justify-between font-mono-code">
                <span className="text-[#edeeef]/60">Flyway Region</span>
                <span className="text-[#edeeef]">{region}</span>
              </div>
              <div className="py-2.5 border-t border-[rgba(237,238,239,0.1)] flex justify-between font-mono-code">
                <span className="text-[#edeeef]/60">Joined BMA</span>
                <span className="text-[#edeeef]">July 2026</span>
              </div>
            </div>

            {bio && (
              <p className="mt-4 text-xs text-[#edeeef]/70 bg-[rgba(237,238,239,0.04)] p-3 rounded border border-[rgba(237,238,239,0.08)] italic">
                "{bio}"
              </p>
            )}
          </div>

        </div>

        {/* Right Column (Form Details Container) */}
        <div className="lg:col-span-8">
          <form onSubmit={handleSubmit} className="border border-[rgba(237,238,239,0.1)] rounded p-6 sm:p-8 bg-[#0b0c0d] space-y-8">
            
            {/* TAB 1: Personal Info & Bio */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-[rgba(237,238,239,0.1)] pb-4">
                  <h2 className="font-syne text-xl font-bold text-[#edeeef] flex items-center space-x-2">
                    <UserIcon className="w-5 h-5 text-[#00ffaa]" />
                    <span>Personal Details & Identity</span>
                  </h2>
                  <p className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-wider mt-1">
                    Update your public birder identity, avatar photo, and contact information.
                  </p>
                </div>

                {/* Avatar Selection & Upload */}
                <div className="space-y-4">
                  <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block">
                    Profile Picture / Avatar
                  </label>

                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded bg-[rgba(237,238,239,0.04)] border border-[rgba(237,238,239,0.1)]">
                    <img
                      src={avatar || currentUser.avatar}
                      alt="Avatar Preview"
                      className="w-20 h-20 rounded object-cover ring-1 ring-[#00ffaa] shrink-0"
                    />

                    <div className="space-y-3 w-full">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* File Upload Trigger */}
                        <label className="flex items-center space-x-2 px-3.5 py-2 rounded bg-[rgba(237,238,239,0.1)] hover:bg-[rgba(237,238,239,0.2)] text-xs font-mono-code text-[#edeeef] uppercase tracking-wider cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5 text-[#00ffaa]" />
                          <span>Upload Image File</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>

                        {/* Direct URL Input */}
                        <div className="flex-1 min-w-[200px]">
                          <input
                            type="url"
                            placeholder="Or paste image URL (https://...)"
                            value={avatar}
                            onChange={(e) => setAvatar(e.target.value)}
                            className="w-full px-3 py-2 rounded bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] text-xs text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                          />
                        </div>
                      </div>


                    </div>
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Jane Goodall"
                      className="w-full px-4 py-3 rounded bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. observer@bma.io"
                      className="w-full px-4 py-3 rounded bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-3 rounded bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block">
                      Flyway Region
                    </label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full px-4 py-3 rounded bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                    >
                      {REGION_OPTIONS.map((r) => (
                        <option key={r} value={r} className="bg-[#0b0c0d] text-[#edeeef]">
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block">
                    Bio / Birder Statement
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell the community about your birding background..."
                    className="w-full px-4 py-3 rounded bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div className="space-y-1.5">
                    <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block">
                      Favorite Species
                    </label>
                    <input
                      type="text"
                      value={favoriteBird}
                      onChange={(e) => setFavoriteBird(e.target.value)}
                      placeholder="e.g. Peregrine Falcon"
                      className="w-full px-4 py-3 rounded bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block">
                      Optics & Gear
                    </label>
                    <input
                      type="text"
                      value={cameraGear}
                      onChange={(e) => setCameraGear(e.target.value)}
                      placeholder="e.g. Swarovski 10x42, Canon R5"
                      className="w-full px-4 py-3 rounded bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Address & Location */}
            {activeTab === 'address' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-[rgba(237,238,239,0.1)] pb-4">
                  <div>
                    <h2 className="font-syne text-xl font-bold text-[#edeeef] flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-[#00ffaa]" />
                      <span>Address & Location Information</span>
                    </h2>
                    <p className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-wider mt-1">
                      Your residential or mailing address for regional birding updates and rewards delivery.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleFillSampleAddress}
                    className="text-xs font-mono-code text-[#00ffaa] hover:bg-[#00ffaa]/10 px-3 py-1.5 rounded border border-[#00ffaa]/30 transition-all uppercase tracking-wider"
                  >
                    + Fill Sample Address
                  </button>
                </div>

                {/* Street Address */}
                <div className="space-y-1.5">
                  <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="e.g. 1200 San Antonio Road, Suite 400"
                    className="w-full px-4 py-3 rounded bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                  />
                </div>

                {/* City & State */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Palo Alto"
                      className="w-full px-4 py-3 rounded bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block">
                      State / Province / Region
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. California (CA)"
                      className="w-full px-4 py-3 rounded bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                    />
                  </div>
                </div>

                {/* Postal Code & Country */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block">
                      Postal / ZIP Code
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 94303"
                      className="w-full px-4 py-3 rounded bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono-code text-xs text-[#edeeef]/60 uppercase tracking-widest block">
                      Country
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. United States"
                      className="w-full px-4 py-3 rounded bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.15)] text-sm text-[#edeeef] focus:outline-none focus:border-[#00ffaa]"
                    />
                  </div>
                </div>

                <div className="p-4 rounded bg-[rgba(237,238,239,0.04)] border border-[rgba(237,238,239,0.1)] flex items-start space-x-3 text-xs text-[#edeeef]/60 font-mono-code">
                  <Info className="w-4 h-4 text-[#00ffaa] shrink-0 mt-0.5" />
                  <p>
                    Address data is strictly encrypted and used solely for regional flyway research logs and sending unlocked physical leaderboard badges & milestone rewards.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: Social & External Links */}
            {activeTab === 'social' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Globe className="w-5 h-5 text-emerald-400" />
                    <span>Social Media & Birding Links</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Connect your personal website, eBird profile, and social accounts.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Personal Website / eBird Profile
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="url"
                      value={socialWebsite}
                      onChange={(e) => setSocialWebsite(e.target.value)}
                      placeholder="https://ebird.org/profile/..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    X (Twitter) Handle
                  </label>
                  <div className="relative">
                    <Twitter className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={socialTwitter}
                      onChange={(e) => setSocialTwitter(e.target.value)}
                      placeholder="@alex_flyway"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Instagram Handle
                  </label>
                  <div className="relative">
                    <Instagram className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={socialInstagram}
                      onChange={(e) => setSocialInstagram(e.target.value)}
                      placeholder="@alex_birder"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Notifications & Privacy */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Bell className="w-5 h-5 text-emerald-400" />
                    <span>Notification Preferences & Privacy</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Control how BMA alerts you about rare bird sightings and how your GPS data is displayed.
                  </p>
                </div>

                {/* Email Toggles */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-200">Email Notifications</h3>
                  
                  <label className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">Migration & Rare Species Alerts</p>
                      <p className="text-xs text-slate-400">Receive instant alerts when endangered species cross your flyway.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={migrationAlerts}
                      onChange={(e) => setMigrationAlerts(e.target.checked)}
                      className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">Community Comments & Likes</p>
                      <p className="text-xs text-slate-400">Notify when other birders comment on or verify your logged sightings.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={communityActivity}
                      onChange={(e) => setCommunityActivity(e.target.checked)}
                      className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">Weekly Flyway Digest</p>
                      <p className="text-xs text-slate-400">Summary of top regional hotspots, seasonal flight trends, and leaderboards.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={weeklyDigest}
                      onChange={(e) => setWeeklyDigest(e.target.checked)}
                      className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                    />
                  </label>
                </div>

                {/* Location Privacy Selector */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-200">Sighting Location Privacy</h3>
                  <p className="text-xs text-slate-400">
                    Choose how precisely your bird sighting GPS coordinates appear to the public community.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPrivacyMode('public')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        privacyMode === 'public'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold text-white mb-1">Exact Pin (Public)</p>
                      <p className="text-[11px]">Displays high-accuracy GPS coordinates for science logs.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrivacyMode('blurred_location')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        privacyMode === 'blurred_location'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold text-white mb-1">Blurred Grid (~2km)</p>
                      <p className="text-[11px]">Protects nesting locations while remaining useful for maps.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrivacyMode('private')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        privacyMode === 'private'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold text-white mb-1">Private (Only Me)</p>
                      <p className="text-[11px]">Visible only to your account and research partners.</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Referral Program & Points */}
            {activeTab === 'referral' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Gift className="w-5 h-5 text-[#00ffaa]" />
                    <span>Referral Program & Bonus Points</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Share your unique referral code with fellow birdwatchers to earn extra Flyway Points and unlock VIP perks!
                  </p>
                </div>

                {/* Referral Status Banner */}
                {referralStatusMsg && (
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      referralStatusMsg.type === 'success'
                        ? 'bg-[#00ffaa]/10 border-[#00ffaa]/40 text-[#00ffaa]'
                        : 'bg-red-500/10 border-red-500/40 text-red-400'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <p className="text-xs font-semibold">{referralStatusMsg.text}</p>
                    </div>
                  </div>
                )}

                {/* Main Referral Code Card */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-[#00ffaa]" />
                        <span>Your Unique Referral Code</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Share this code with new users when they register to earn <strong className="text-[#00ffaa]">+50 bonus points</strong> per referral.
                      </p>
                    </div>
                    <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-[#00ffaa]/10 border border-[#00ffaa]/30 text-[#00ffaa] text-[11px] font-mono-code font-bold tracking-wider">
                      +50 PTS / REFERRAL
                    </span>
                  </div>

                  {/* Referral Code Textfield & Copy Button */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#00ffaa] rounded-xl px-4 py-3 text-sm font-mono-code font-extrabold text-[#00ffaa] tracking-widest focus:outline-none shadow-inner"
                        placeholder="YOUR-REFERRAL-CODE"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono-code text-slate-500 uppercase">
                        Your Code
                      </span>
                    </div>

                    {/* Referral Action Buttons */}
                    <button
                      type="button"
                      onClick={handleCopyReferralCode}
                      className="px-6 py-3 rounded-xl bg-[#00ffaa] text-[#0b0c0d] font-syne font-extrabold text-xs uppercase tracking-wider hover:bg-[#00ffaa]/90 transition-all cursor-pointer shadow-lg shadow-[#00ffaa]/20 flex items-center justify-center space-x-2 shrink-0"
                    >
                      {hasCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Code Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Referral Code</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Referral Link Preview */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono-code text-slate-400 overflow-x-auto">
                    <span className="truncate">https://bma.io/join?ref={referralCode}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(`https://bma.io/join?ref=${referralCode}`);
                        }
                        setHasCopied(true);
                        setTimeout(() => setHasCopied(false), 2500);
                      }}
                      className="ml-2 text-[#00ffaa] hover:underline flex items-center space-x-1 shrink-0 font-sans text-[11px]"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </button>
                  </div>
                </div>

                {/* Redeem Friend's Referral Code Section */}
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Gift className="w-4 h-4 text-amber-400" />
                      <span>Have a Friend's Referral Code?</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Enter a birder referral code below to instantly claim your +50 bonus points.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={friendCodeInput}
                      onChange={(e) => setFriendCodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRedeemFriendCode();
                        }
                      }}
                      placeholder="e.g. BMA-BIRDER-9921"
                      className="flex-1 bg-slate-900 border border-slate-800 focus:border-amber-400 rounded-xl px-4 py-3 text-sm font-mono-code text-white placeholder:text-slate-600 focus:outline-none uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => handleRedeemFriendCode()}
                      className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 shrink-0 shadow-lg shadow-amber-500/20"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Redeem Bonus Points</span>
                    </button>
                  </div>
                </div>

                {/* Referral Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <p className="text-2xl font-extrabold text-[#00ffaa]">{referredCount}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Successful Referrals</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <p className="text-2xl font-extrabold text-amber-400">+{referredCount * 50} PTS</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Points Earned via Referrals</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <p className="text-2xl font-extrabold text-cyan-400">{currentUser.points || 0} PTS</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Total Flyway Points</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Membership & Account Tier */}
            {activeTab === 'account' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-amber-400" />
                    <span>Membership Status & Plan Management</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage your BMA VIP Flyway subscription and unlock live radar features.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      {currentUser.tier === 'paid' ? (
                        <ShieldCheck className="w-6 h-6 text-amber-400 animate-pulse" />
                      ) : (
                        <Lock className="w-6 h-6 text-slate-400" />
                      )}
                      <h3 className="text-lg font-extrabold text-white flex items-center space-x-2">
                        <span>{currentUser.tier === 'paid' ? 'VIP PRO Member' : 'Free Observer Tier'}</span>
                        {currentUser.tier === 'paid' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] uppercase font-bold border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300 max-w-md">
                      {currentUser.tier === 'paid'
                        ? 'You have full unlocked access to real-time satellite flight radar, high-density VIP hotspots, and rare species notifications.'
                        : 'Upgrade to VIP PRO via Paystack or Flutterwave for live migration tracking, rare bird radar alerts, and exclusive access to protected sanctuary hotspots.'}
                    </p>

                    {/* Supported Payment Gateways Badges */}
                    <div className="mt-3 flex items-center space-x-2 text-[10px] font-mono">
                      <span className="text-slate-400 font-sans text-xs">Supported Payment Gateways:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                        Paystack
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                        Flutterwave
                      </span>
                    </div>

                    {/* Active Membership Record Detail */}
                    {dbSub && currentUser.tier === 'paid' && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                        <p className="text-amber-400 font-bold flex items-center space-x-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Active Membership Details:</span>
                        </p>
                        <p>• Gateway: <strong className="text-white uppercase">{dbSub.provider}</strong></p>
                        <p>• Reference: <strong className="text-emerald-400">{dbSub.transactionRef}</strong></p>
                        <p>• Plan Code: <span className="text-slate-400">{dbSub.subscriptionCode}</span></p>
                        <p>• Renews / Valid Until: <span className="text-cyan-400">{new Date(dbSub.currentPeriodEnd || '').toLocaleDateString()}</span></p>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onToggleUserTier}
                    className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-lg ${
                      currentUser.tier === 'paid'
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/20'
                    }`}
                  >
                    {currentUser.tier === 'paid' ? 'Manage / Cancel Plan' : 'Pay via Paystack / Flutterwave ($4.99/mo)'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-xl font-extrabold text-emerald-400">{currentUser.sightingsCount}</p>
                    <p className="text-[11px] text-slate-400">Total Sightings</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-xl font-extrabold text-amber-400">{currentUser.rareSpeciesCount}</p>
                    <p className="text-[11px] text-slate-400">Rare Birds Spot</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-xl font-extrabold text-cyan-400">{currentUser.points}</p>
                    <p className="text-[11px] text-slate-400">Flyway Points</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-xl font-extrabold text-purple-400">{currentUser.badges?.length || 0}</p>
                    <p className="text-[11px] text-slate-400">Badges Unlocked</p>
                  </div>
                </div>

                {currentUser.badges && currentUser.badges.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-2">
                    <p className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-purple-400" />
                      <span>Unlocked Observer Badges:</span>
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {currentUser.badges.map((b, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Bottom Form Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <div className="flex items-center space-x-4">
                <p className="text-xs text-slate-500">
                  Joined BMA on {currentUser.joinedDate || '2025'}
                </p>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
};
