import React, { useState } from 'react';
import { User, UserTier } from '../types';
import { X, User as UserIcon, ShieldCheck } from 'lucide-react';
import { DEFAULT_USER } from '../data/mockData';

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
  // Profile fields
  const [name, setName] = useState<string>(currentUser.name || '');
  const [email, setEmail] = useState<string>(currentUser.email || '');
  const [region, setRegion] = useState<string>(currentUser.region || 'North America');
  const [tier, setTier] = useState<UserTier>(currentUser.tier || 'free');

  if (!isOpen) return null;

  const handleCustomUserSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: User = {
      ...currentUser,
      id: currentUser.id && currentUser.id !== 'guest' ? currentUser.id : `usr_${Date.now()}`,
      name: name.trim() || 'Observer',
      email: email.trim(),
      region: region || 'Global',
      tier: tier,
    };
    onSwitchUser(updatedUser);
    onClose();
  };

  const handleResetGuest = () => {
    onSwitchUser(DEFAULT_USER);
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
              <h3 className="font-bold text-lg text-white">Observer Profile Settings</h3>
              <p className="text-xs text-slate-400">Configure your active credentials and membership tier</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Settings Form */}
        <div className="p-6 space-y-6">
          <form onSubmit={handleCustomUserSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Email</label>
                <input
                  type="email"
                  placeholder="e.g. observer@flyway.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Flyway Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Global">Global</option>
                <option value="North America">North America</option>
                <option value="Europe">Europe</option>
                <option value="Asia-Pacific">Asia-Pacific</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Membership Tier</label>
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

            <div className="pt-2 flex items-center space-x-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                Save Profile
              </button>
              <button
                type="button"
                onClick={handleResetGuest}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all"
              >
                Reset Guest
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
