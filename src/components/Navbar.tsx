import React from 'react';
import { User } from '../types';
import { Navigation, Compass, PlusCircle, Users, Award, ShieldCheck, Lock, Sparkles, User as UserIcon, LogOut, Settings } from 'lucide-react';

interface NavbarProps {
  activeTab: 'map' | 'log' | 'feed' | 'leaderboard' | 'hotspots' | 'auth' | 'settings';
  setActiveTab: (tab: 'map' | 'log' | 'feed' | 'leaderboard' | 'hotspots' | 'auth' | 'settings') => void;
  currentUser: User;
  isLoggedIn?: boolean;
  onLogout?: () => void;
  onToggleUserTier: () => void;
  onOpenAuthModal: () => void;
  onOpenAiScanner?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  isLoggedIn = false,
  onLogout,
  onToggleUserTier,
  onOpenAuthModal,
  onOpenAiScanner,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0b0c0d]/95 backdrop-blur-md border-b border-[rgba(237,238,239,0.1)] text-[#edeeef]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('map')}>
            <div className="px-2.5 h-9 rounded-md bg-[#00ffaa] flex items-center justify-center text-[#0b0c0d] font-syne font-black text-sm tracking-tight space-x-1.5 shadow-sm shadow-[#00ffaa]/20">
              <Compass className="w-4 h-4 stroke-[2.5]" />
              <span className="leading-none">BMA</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono-code text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#00ffaa]/10 text-[#00ffaa] border border-[#00ffaa]/30">
                  Bird Migration App
                </span>
              </div>
              <p className="font-mono-code text-[10px] text-[#edeeef]/50 uppercase tracking-wider hidden sm:block mt-0.5">
                Global Flyway & Sightings Network
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-[rgba(237,238,239,0.04)] p-1 rounded-md border border-[rgba(237,238,239,0.08)]">
            <button
              onClick={() => setActiveTab('map')}
              className={`font-mono-code flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'map'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20'
                  : 'text-[#edeeef]/60 hover:text-[#edeeef] hover:bg-[#edeeef]/5'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Flyway Map</span>
            </button>

            <button
              onClick={() => setActiveTab('log')}
              className={`font-mono-code flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'log'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20'
                  : 'text-[#edeeef]/60 hover:text-[#edeeef] hover:bg-[#edeeef]/5'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#00ffaa]" />
              <span>Log Sighting</span>
            </button>

            <button
              onClick={() => setActiveTab('feed')}
              className={`font-mono-code flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'feed'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20'
                  : 'text-[#edeeef]/60 hover:text-[#edeeef] hover:bg-[#edeeef]/5'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Community Feed</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`font-mono-code flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20'
                  : 'text-[#edeeef]/60 hover:text-[#edeeef] hover:bg-[#edeeef]/5'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Ranks</span>
            </button>

            <button
              onClick={() => setActiveTab('hotspots')}
              className={`font-mono-code flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'hotspots'
                  ? 'bg-amber-400 text-[#0b0c0d] shadow-sm shadow-amber-400/20'
                  : 'text-[#edeeef]/60 hover:text-[#edeeef] hover:bg-[#edeeef]/5'
              }`}
            >
              {currentUser.tier === 'paid' ? (
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>VIP Hotspots</span>
              {currentUser.tier === 'paid' && (
                <span className="text-[9px] bg-amber-400 text-slate-950 font-bold px-1 rounded">
                  PRO
                </span>
              )}
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-2.5">
            {/* AI Vision Species Scanner Button */}
            {onOpenAiScanner && (
              <button
                onClick={onOpenAiScanner}
                className="font-mono-code flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#00ffaa]/10 border border-[#00ffaa]/40 text-[#00ffaa] hover:bg-[#00ffaa]/20 transition-all cursor-pointer"
                title="Identify bird species from image using Gemini AI Vision"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#00ffaa]" />
                <span className="hidden sm:inline uppercase">AI Bird Vision</span>
                <span className="sm:hidden uppercase">AI Scan</span>
              </button>
            )}

            {/* Quick Tier Switcher */}
            <button
              onClick={onToggleUserTier}
              title="Click to toggle between Free Observer and Paid VIP Birder status for evaluation"
              className={`font-mono-code flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium border transition-all ${
                currentUser.tier === 'paid'
                  ? 'bg-amber-400/10 border-amber-400/40 text-amber-300 hover:bg-amber-400/20'
                  : 'bg-[rgba(237,238,239,0.06)] border-[rgba(237,238,239,0.15)] text-[#edeeef]/80 hover:border-[#00ffaa]/50'
              }`}
            >
              {currentUser.tier === 'paid' ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>PRO Active</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Free Mode</span>
                  <span className="text-[10px] text-[#00ffaa] font-bold ml-1 hover:underline">Demo Pro</span>
                </>
              )}
            </button>

            {/* User Account / Settings Button */}
            {isLoggedIn ? (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveTab('settings')}
                  title="Click to manage personal profile and settings"
                  className={`flex items-center justify-center space-x-2 p-1.5 px-3 rounded-md border cursor-pointer transition-all ${
                    activeTab === 'settings'
                      ? 'bg-[#00ffaa]/15 border-[#00ffaa] ring-1 ring-[#00ffaa]/30 text-[#00ffaa]'
                      : 'bg-[rgba(237,238,239,0.06)] hover:bg-[rgba(237,238,239,0.1)] border-[rgba(237,238,239,0.12)] text-[#edeeef]/90'
                  }`}
                >
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
                    alt="Settings Profile"
                    className="w-6 h-6 rounded-full object-cover shrink-0 border border-[#00ffaa]/40"
                  />
                  <span className="font-mono-code text-xs uppercase font-bold tracking-wider">Settings</span>
                </button>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="Log Out"
                    className="p-1.5 rounded-md border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('auth')}
                className={`font-mono-code flex items-center space-x-2 px-3.5 py-1.5 rounded-md border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'auth'
                    ? 'bg-[#00ffaa] border-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20'
                    : 'bg-[#00ffaa]/10 border-[#00ffaa]/40 text-[#00ffaa] hover:bg-[#00ffaa]/20'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Tabs Bar */}
      <div className="md:hidden flex items-center justify-around bg-[#0b0c0d] border-t border-[rgba(237,238,239,0.1)] px-1 py-1.5 overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center justify-center min-h-[44px] px-2.5 py-1 text-[10px] font-mono-code uppercase rounded transition-colors shrink-0 ${
            activeTab === 'map' ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/10' : 'text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <Compass className="w-4 h-4 mb-0.5" />
          <span>Map</span>
        </button>

        <button
          onClick={() => setActiveTab('log')}
          className={`flex flex-col items-center justify-center min-h-[44px] px-2.5 py-1 text-[10px] font-mono-code uppercase rounded transition-colors shrink-0 ${
            activeTab === 'log' ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/10' : 'text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <PlusCircle className="w-4 h-4 mb-0.5" />
          <span>Log</span>
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center justify-center min-h-[44px] px-2.5 py-1 text-[10px] font-mono-code uppercase rounded transition-colors shrink-0 ${
            activeTab === 'feed' ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/10' : 'text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>Feed</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex flex-col items-center justify-center min-h-[44px] px-2.5 py-1 text-[10px] font-mono-code uppercase rounded transition-colors shrink-0 ${
            activeTab === 'leaderboard' ? 'text-amber-400 font-bold bg-amber-400/10' : 'text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <Award className="w-4 h-4 mb-0.5 text-amber-400" />
          <span>Ranks</span>
        </button>

        <button
          onClick={() => setActiveTab('hotspots')}
          className={`flex flex-col items-center justify-center min-h-[44px] px-2.5 py-1 text-[10px] font-mono-code uppercase rounded transition-colors shrink-0 ${
            activeTab === 'hotspots' ? 'text-amber-400 font-bold bg-amber-400/10' : 'text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <Sparkles className="w-4 h-4 mb-0.5 text-amber-400" />
          <span>VIP</span>
        </button>

        {isLoggedIn ? (
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center min-h-[44px] px-2.5 py-1 text-[10px] font-mono-code uppercase rounded transition-colors shrink-0 ${
              activeTab === 'settings' ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/10' : 'text-[#edeeef]/60 hover:text-[#edeeef]'
            }`}
          >
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
              alt="Settings"
              className="w-4 h-4 rounded-full object-cover mb-0.5 border border-[#00ffaa]/50 shrink-0"
            />
            <span>Settings</span>
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('auth')}
            className={`flex flex-col items-center justify-center min-h-[44px] px-2.5 py-1 text-[10px] font-mono-code uppercase rounded transition-colors shrink-0 ${
              activeTab === 'auth' ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/10' : 'text-[#edeeef]/60 hover:text-[#edeeef]'
            }`}
          >
            <UserIcon className="w-4 h-4 mb-0.5" />
            <span>Log In</span>
          </button>
        )}
      </div>
    </header>
  );
};
