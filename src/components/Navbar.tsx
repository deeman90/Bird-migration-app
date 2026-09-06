import React from 'react';
import { User } from '../types';
import { Navigation, Compass, PlusCircle, Users, Award, Lock, Sparkles, User as UserIcon, LogOut, Settings, Heart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BMALogo } from './BMALogo';

interface NavbarProps {
  activeTab: 'map' | 'log' | 'feed' | 'leaderboard' | 'hotspots' | 'auth' | 'settings' | 'donate' | 'diagnostic';
  setActiveTab: (tab: 'map' | 'log' | 'feed' | 'leaderboard' | 'hotspots' | 'auth' | 'settings' | 'donate' | 'diagnostic') => void;
  currentUser: User;
  isLoggedIn?: boolean;
  onLogout?: () => void;
  onToggleUserTier?: () => void;
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
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    // Programmatic navigation on logout
    navigate('/auth');
  };

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0b0c0d]/95 backdrop-blur-md border-b border-[rgba(237,238,239,0.1)] text-[#edeeef] pt-safe">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            
            {/* Brand Logo - Declarative Link */}
            <Link
              to="/"
              id="brand-logo-button"
              className="flex items-center cursor-pointer select-none transition-transform active:scale-95"
              title="AeroTrack Flyway Map Home"
            >
              <BMALogo className="h-8 sm:h-9 w-auto shadow-sm shadow-[#059669]/30 rounded-xl" />
            </Link>

            {/* Desktop Navigation Tabs - Declarative Link Components */}
            <nav className="hidden md:flex items-center space-x-1 bg-[rgba(237,238,239,0.04)] p-1 rounded-md border border-[rgba(237,238,239,0.08)]">
              <Link
                to="/"
                className={`font-mono-code flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'map'
                    ? 'bg-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20 font-bold'
                    : 'text-[#edeeef]/60 hover:text-[#edeeef] hover:bg-[#edeeef]/5'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Flyway Map</span>
              </Link>

              <Link
                to="/log"
                className={`font-mono-code flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'log'
                    ? 'bg-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20 font-bold'
                    : 'text-[#edeeef]/60 hover:text-[#edeeef] hover:bg-[#edeeef]/5'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#00ffaa]" />
                <span>Log Sighting</span>
              </Link>

              <Link
                to="/feed"
                className={`font-mono-code flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'feed'
                    ? 'bg-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20 font-bold'
                    : 'text-[#edeeef]/60 hover:text-[#edeeef] hover:bg-[#edeeef]/5'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Community Feed</span>
              </Link>

              <Link
                to="/leaderboard"
                className={`font-mono-code flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'leaderboard'
                    ? 'bg-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20 font-bold'
                    : 'text-[#edeeef]/60 hover:text-[#edeeef] hover:bg-[#edeeef]/5'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Ranks</span>
              </Link>

              <Link
                to="/hotspots"
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
              </Link>

              <Link
                to="/donate"
                className={`font-mono-code flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'donate'
                    ? 'bg-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20 font-bold'
                    : 'text-[#edeeef]/60 hover:text-[#00ffaa] hover:bg-[#00ffaa]/10'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${activeTab === 'donate' ? 'fill-[#0b0c0d] text-[#0b0c0d]' : 'text-rose-400'}`} />
                <span>Donate</span>
              </Link>
            </nav>

            {/* Right Action Bar */}
            <div className="flex items-center space-x-1.5 sm:space-x-2.5">
              {/* Conservation Donation Quick Button */}
              <Link
                to="/donate"
                title="Donate to Avian Conservation & Flyway Research"
                className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-mono-code font-bold uppercase tracking-wider transition-all cursor-pointer min-h-[36px] border ${
                  activeTab === 'donate'
                    ? 'bg-[#00ffaa] text-[#0b0c0d] border-[#00ffaa] shadow-sm shadow-[#00ffaa]/20'
                    : 'bg-[#00ffaa]/10 border-[#00ffaa]/30 text-[#00ffaa] hover:bg-[#00ffaa]/20 hover:border-[#00ffaa]/50'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${activeTab === 'donate' ? 'fill-[#0b0c0d]' : 'fill-[#00ffaa]'}`} />
                <span>Donate</span>
              </Link>

              {/* User Account / Settings Button - Declarative Link */}
              {isLoggedIn ? (
                <div className="flex items-center space-x-1">
                  <Link
                    to="/settings"
                    title="Click to manage personal profile and settings"
                    className={`flex items-center justify-center space-x-1.5 p-1 sm:p-1.5 sm:px-2.5 rounded-md border cursor-pointer transition-all min-h-[36px] ${
                      activeTab === 'settings'
                        ? 'bg-[#00ffaa]/15 border-[#00ffaa] ring-1 ring-[#00ffaa]/30 text-[#00ffaa]'
                        : 'bg-[rgba(237,238,239,0.06)] hover:bg-[rgba(237,238,239,0.1)] border-[rgba(237,238,239,0.12)] text-[#edeeef]/90'
                    }`}
                  >
                    {(currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300') ? (
                      <img
                        src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
                        alt="Settings Profile"
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0 border border-[#00ffaa]/40"
                      />
                    ) : null}
                    <span className="font-mono-code text-[11px] uppercase font-bold tracking-wider hidden sm:inline">Settings</span>
                  </Link>
                  {onLogout && (
                    <button
                      onClick={handleLogoutClick}
                      title="Log Out"
                      className="p-1.5 rounded-md border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <Link
                  to="/auth"
                  className={`font-mono-code flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-md border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer min-h-[36px] ${
                    activeTab === 'auth'
                      ? 'bg-[#00ffaa] border-[#00ffaa] text-[#0b0c0d] shadow-sm shadow-[#00ffaa]/20 font-bold'
                      : 'bg-[#00ffaa]/10 border-[#00ffaa]/40 text-[#00ffaa] hover:bg-[#00ffaa]/20'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Log In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Dock (Fixed at bottom on phones) - Declarative Link Components */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0c0d]/95 backdrop-blur-xl border-t border-[rgba(237,238,239,0.12)] px-2 pt-1 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex items-center justify-around"
      >
        {/* Flyway Map Tab */}
        <Link
          to="/"
          className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[48px] text-[10px] font-mono-code uppercase rounded-lg transition-all active:scale-95 cursor-pointer ${
            activeTab === 'map'
              ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/10'
              : 'text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <Compass className={`w-5 h-5 mb-0.5 ${activeTab === 'map' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span>Map</span>
        </Link>

        {/* Log Sighting Tab (Highlighted Action) */}
        <Link
          to="/log"
          className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[48px] text-[10px] font-mono-code uppercase rounded-lg transition-all active:scale-95 cursor-pointer ${
            activeTab === 'log'
              ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/15 ring-1 ring-[#00ffaa]/40'
              : 'text-[#edeeef]/70 hover:text-[#00ffaa]'
          }`}
        >
          <PlusCircle className={`w-5 h-5 mb-0.5 text-[#00ffaa] ${activeTab === 'log' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span>Log</span>
        </Link>

        {/* Community Feed Tab */}
        <Link
          to="/feed"
          className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[48px] text-[10px] font-mono-code uppercase rounded-lg transition-all active:scale-95 cursor-pointer ${
            activeTab === 'feed'
              ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/10'
              : 'text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <Users className={`w-5 h-5 mb-0.5 ${activeTab === 'feed' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span>Feed</span>
        </Link>

        {/* Leaderboard / Ranks Tab */}
        <Link
          to="/leaderboard"
          className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[48px] text-[10px] font-mono-code uppercase rounded-lg transition-all active:scale-95 cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'text-amber-400 font-bold bg-amber-400/10'
              : 'text-[#edeeef]/60 hover:text-[#edeeef]'
          }`}
        >
          <Award className={`w-5 h-5 mb-0.5 text-amber-400 ${activeTab === 'leaderboard' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span>Ranks</span>
        </Link>

        {/* VIP Hotspots Tab */}
        <Link
          to="/hotspots"
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
        </Link>

        {/* User Settings / Auth Tab */}
        {isLoggedIn ? (
          <Link
            to="/settings"
            className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[48px] text-[10px] font-mono-code uppercase rounded-lg transition-all active:scale-95 cursor-pointer ${
              activeTab === 'settings'
                ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/10'
                : 'text-[#edeeef]/60 hover:text-[#edeeef]'
            }`}
          >
            {(currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300') ? (
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
                alt="Settings"
                className="w-5 h-5 rounded-full object-cover mb-0.5 border border-[#00ffaa]/50 shrink-0"
              />
            ) : null}
            <span>Profile</span>
          </Link>
        ) : (
          <Link
            to="/auth"
            className={`flex-1 flex flex-col items-center justify-center py-1.5 min-h-[48px] text-[10px] font-mono-code uppercase rounded-lg transition-all active:scale-95 cursor-pointer ${
              activeTab === 'auth'
                ? 'text-[#00ffaa] font-bold bg-[#00ffaa]/10'
                : 'text-[#edeeef]/60 hover:text-[#edeeef]'
            }`}
          >
            <UserIcon className="w-5 h-5 mb-0.5" />
            <span>Account</span>
          </Link>
        )}
      </nav>
    </>
  );
};
