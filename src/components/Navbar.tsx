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
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0b0c0d]/95 backdrop-blur-md border-b border-[rgba(237,238,239,0.1)] text-[#edeeef] pt-safe">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            
            {/* Brand Logo */}
            <div
              className="flex items-center space-x-2 sm:space-x-3 cursor-pointer select-none"
              onClick={() => setActiveTab('map')}
            >
              <div className="px-2 sm:px-2.5 h-8 sm:h-9 rounded-md bg-[#00ffaa] flex items-center justify-center text-[#0b0c0d] font-syne font-black text-xs sm:text-sm tracking-tight space-x-1 sm:space-x-1.5 shadow-sm shadow-[#00ffaa]/20">
                <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                <span className="leading-none">BMA</span>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-mono-code text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#00ffaa]/10 text-[#00ffaa] border border-[#00ffaa]/30">
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
                className={`font-mono-code flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'map'
                    ? 'bg-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20 font-bold'
                    : 'text-[#edeeef]/60 hover:text-[#edeeef] hover:bg-[#edeeef]/5'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Flyway Map</span>
              </button>

              <button
                onClick={() => setActiveTab('log')}
                className={`font-mono-code flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'log'
                    ? 'bg-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20 font-bold'
                    : 'text-[#edeeef]/60 hover:text-[#edeeef] hover:bg-[#edeeef]/5'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#00ffaa]" />
                <span>Log Sighting</span>
              </button>

              <button
                onClick={() => setActiveTab('feed')}
                className={`font-mono-code flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'feed'
                    ? 'bg-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20 font-bold'
                    : 'text-[#edeeef]/60 hover:text-[#edeeef] hover:bg-[#edeeef]/5'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Community Feed</span>
              </button>

              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`font-mono-code flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'leaderboard'
                    ? 'bg-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20 font-bold'
                    : 'text-[#edeeef]/60 hover:text-[#edeeef] hover:bg-[#edeeef]/5'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Ranks</span>
              </button>

              <button
                onClick={() => setActiveTab('hotspots')}
                className={`font-mono-code flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'hotspots'
                    ? 'bg-amber-400 text-[#0b0c0d] shadow-sm shadow-amber-400/20 font-bold'
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
            <div className="flex items-center space-x-1.5 sm:space-x-2.5">
              {/* Quick Tier Switcher */}
              <button
                onClick={onToggleUserTier}
                title="Click to toggle between Free Observer and Paid VIP Birder status"
                className={`font-mono-code flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded text-[10px] sm:text-[11px] font-medium border transition-all cursor-pointer min-h-[36px] ${
                  currentUser.tier === 'paid'
                    ? 'bg-amber-400/10 border-amber-400/40 text-amber-300 hover:bg-amber-400/20'
                    : 'bg-[rgba(237,238,239,0.06)] border-[rgba(237,238,239,0.15)] text-[#edeeef]/80 hover:border-[#00ffaa]/50'
                }`}
              >
                {currentUser.tier === 'paid' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-bold">PRO</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="hidden sm:inline">Free</span>
                    <span className="text-[10px] text-[#00ffaa] font-bold">Upgrade</span>
                  </>
                )}
              </button>

              {/* User Account / Settings Button */}
              {isLoggedIn ? (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setActiveTab('settings')}
                    title="Click to manage personal profile and settings"
                    className={`flex items-center justify-center space-x-1.5 p-1 sm:p-1.5 sm:px-2.5 rounded-md border cursor-pointer transition-all min-h-[36px] ${
                      activeTab === 'settings'
                        ? 'bg-[#00ffaa]/15 border-[#00ffaa] ring-1 ring-[#00ffaa]/30 text-[#00ffaa]'
                        : 'bg-[rgba(237,238,239,0.06)] hover:bg-[rgba(237,238,239,0.1)] border-[rgba(237,238,239,0.12)] text-[#edeeef]/90'
                    }`}
                  >
                    <img
                      src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
                      alt="Settings Profile"
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0 border border-[#00ffaa]/40"
                    />
                    <span className="font-mono-code text-[11px] uppercase font-bold tracking-wider hidden sm:inline">Settings</span>
                  </button>
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      title="Log Out"
                      className="p-1.5 rounded-md border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setActiveTab('auth')}
                  className={`font-mono-code flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-md border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer min-h-[36px] ${
                    activeTab === 'auth'
                      ? 'bg-[#00ffaa] border-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20 font-bold'
                      : 'bg-[#00ffaa]/10 border-[#00ffaa]/40 text-[#00ffaa] hover:bg-[#00ffaa]/20'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Log In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Dock (Fixed at bottom on phones) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0c0d]/95 backdrop-blur-xl border-t border-[rgba(237,238,239,0.12)] px-2 pt-1 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex items-center justify-around"
      >
        {/* Flyway Map Tab */}
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[48px] text-[10px] font-mono-code uppercase rounded-lg transition-all active:scale-95 cursor-pointer ${
            activeTab === 'map'
              ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/10'
              : 'text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <Compass className={`w-5 h-5 mb-0.5 ${activeTab === 'map' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span>Map</span>
        </button>

        {/* Log Sighting Tab (Highlighted Action) */}
        <button
          onClick={() => setActiveTab('log')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[48px] text-[10px] font-mono-code uppercase rounded-lg transition-all active:scale-95 cursor-pointer ${
            activeTab === 'log'
              ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/15 ring-1 ring-[#00ffaa]/40'
              : 'text-[#edeeef]/70 hover:text-[#00ffaa]'
          }`}
        >
          <PlusCircle className={`w-5 h-5 mb-0.5 text-[#00ffaa] ${activeTab === 'log' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span>Log</span>
        </button>

        {/* Community Feed Tab */}
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[48px] text-[10px] font-mono-code uppercase rounded-lg transition-all active:scale-95 cursor-pointer ${
            activeTab === 'feed'
              ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/10'
              : 'text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <Users className={`w-5 h-5 mb-0.5 ${activeTab === 'feed' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span>Feed</span>
        </button>

        {/* Leaderboard / Ranks Tab */}
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[48px] text-[10px] font-mono-code uppercase rounded-lg transition-all active:scale-95 cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'text-amber-400 font-bold bg-amber-400/10'
              : 'text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <Award className={`w-5 h-5 mb-0.5 text-amber-400 ${activeTab === 'leaderboard' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span>Ranks</span>
        </button>

        {/* VIP Hotspots Tab */}
        <button
          onClick={() => setActiveTab('hotspots')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[48px] text-[10px] font-mono-code uppercase rounded-lg transition-all active:scale-95 cursor-pointer relative ${
            activeTab === 'hotspots'
              ? 'text-amber-400 font-bold bg-amber-400/10'
              : 'text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <Sparkles className={`w-5 h-5 mb-0.5 text-amber-400 ${activeTab === 'hotspots' ? 'animate-pulse' : ''}`} />
          <span>VIP</span>
          {currentUser.tier === 'paid' && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-400"></span>
          )}
        </button>

        {/* User Settings / Auth Tab */}
        {isLoggedIn ? (
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[48px] text-[10px] font-mono-code uppercase rounded-lg transition-all active:scale-95 cursor-pointer ${
              activeTab === 'settings'
                ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/10'
                : 'text-[#edeeef]/60 hover:text-[#edeeef]'
            }`}
          >
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
              alt="Settings"
              className="w-5 h-5 rounded-full object-cover mb-0.5 border border-[#00ffaa]/50 shrink-0"
            />
            <span>Profile</span>
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('auth')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[48px] text-[10px] font-mono-code uppercase rounded-lg transition-all active:scale-95 cursor-pointer ${
              activeTab === 'auth'
                ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/10'
                : 'text-[#edeeef]/60 hover:text-[#edeeef]'
            }`}
          >
            <UserIcon className="w-5 h-5 mb-0.5" />
            <span>Account</span>
          </button>
        )}
      </nav>
    </>
  );
};
