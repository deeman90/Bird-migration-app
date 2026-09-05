import React, { useState } from 'react';
import { User, UserTier } from '../types';
import { X, ShieldCheck, User as UserIcon, Lock, Sparkles, Check, LogIn } from 'lucide-react';
import { INITIAL_USER_FREE, INITIAL_USER_PAID } from '../data/mockData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSwitchUser: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchUser,
}) => {
  const [activeTab, setActiveTab] = useState<'switch' | 'custom'>('switch');
  
  // Custom user fields
  const [name, setName] = useState<string>(currentUser.name);
  const [email, setEmail] = useState<string>(currentUser.email);
  const [region, setRegion] = useState<string>(currentUser.region);
  const [tier, setTier] = useState<UserTier>(currentUser.tier);

  if (!isOpen) return null;

  const handleCustomUserSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: User = {
      ...currentUser,
      name: name || 'Birder Observer',
      email: email || 'user@flyway.org',
      region: region || 'North America',
      tier: tier,
    };
    onSwitchUser(updatedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden text-white shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Observer Authentication</h3>
              <p className="text-xs text-slate-400">Switch accounts or configure user credentials</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets Section */}
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block">
              Quick Demo Account Switcher
            </label>

            {/* Free Account Option */}
            <div
              onClick={() => {
                onSwitchUser(INITIAL_USER_FREE);
                onClose();
              }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                currentUser.id === INITIAL_USER_FREE.id
                  ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                {INITIAL_USER_FREE.avatar ? (
                  <img
                    src={INITIAL_USER_FREE.avatar}
                    alt={INITIAL_USER_FREE.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : null}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">{INITIAL_USER_FREE.name}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      FREE PLAN
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{INITIAL_USER_FREE.email} • {INITIAL_USER_FREE.sightingsCount} sightings</p>
                </div>
              </div>

              {currentUser.id === INITIAL_USER_FREE.id && (
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
              )}
            </div>

            {/* Paid Account Option */}
            <div
              onClick={() => {
                onSwitchUser(INITIAL_USER_PAID);
                onClose();
              }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                currentUser.id === INITIAL_USER_PAID.id
                  ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                {INITIAL_USER_PAID.avatar ? (
                  <img
                    src={INITIAL_USER_PAID.avatar}
                    alt={INITIAL_USER_PAID.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400"
                  />
                ) : null}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">{INITIAL_USER_PAID.name}</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                      VIP PRO
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{INITIAL_USER_PAID.email} • {INITIAL_USER_PAID.sightingsCount} sightings</p>
                </div>
              </div>

              {currentUser.id === INITIAL_USER_PAID.id && (
                <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
              )}
            </div>
          </div>

          {/* Edit Custom Profile Settings Form */}
          <form onSubmit={handleCustomUserSave} className="pt-4 border-t border-slate-800 space-y-4">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block">
              Edit Current Profile & Tier
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Region</label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Subscription Plan</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTier('free')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    tier === 'free'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Free Observer
                </button>
                <button
                  type="button"
                  onClick={() => setTier('paid')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    tier === 'paid'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  VIP PRO Member
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Update Profile Details
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};
