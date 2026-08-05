import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { BirdSpecies, Hotspot, LeaderboardEntry, MigrationRoute, RewardMilestone, Sighting, User } from './types';
import {
  BIRD_SPECIES_LIST,
  HOTSPOTS,
  INITIAL_SIGHTINGS,
  INITIAL_USER_FREE,
  INITIAL_USER_PAID,
  LEADERBOARD_DATA,
  MIGRATION_ROUTES,
  REWARD_MILESTONES,
} from './data/mockData';
import { Navbar } from './components/Navbar';
import { InteractiveMap } from './components/InteractiveMap';
import { SightingLogger } from './components/SightingLogger';
import { CommunityFeed } from './components/CommunityFeed';
import { LeaderboardAndRewards } from './components/LeaderboardAndRewards';
import { VIPHotspots } from './components/VIPHotspots';
import { AuthModal } from './components/AuthModal';
import { AuthPage } from './components/AuthPage';
import { SettingsPage } from './components/SettingsPage';
import { AIBirdIdentifierModal } from './components/AIBirdIdentifierModal';
import { AccountRestrictionModal } from './components/AccountRestrictionModal';
import { PaymentModal } from './components/PaymentModal.js';
import { SubscriptionRecord } from './services/subscriptionService.js';
import { supabase } from './supabaseClient.js';
import {
  fetchSightingsFromSupabase,
  createSightingInSupabase,
  updateSightingInSupabase,
  deleteSightingInSupabase,
  fetchUserSightingsCountFromSupabase,
} from './services/sightingsService';
import { CheckCircle2, Sparkles, AlertCircle, Compass, Lock } from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'map' | 'log' | 'feed' | 'leaderboard' | 'hotspots' | 'auth' | 'settings'>('map');

  // App Core Data States with localStorage persistence
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('aerotrack_user');
    const user = saved ? JSON.parse(saved) : INITIAL_USER_FREE;
    delete user.restrictedUntil;
    delete user.restrictionReason;
    return user;
  });

  // Ensure any cached suspension is cleared for testing
  useEffect(() => {
    if (currentUser.restrictedUntil || currentUser.restrictionReason) {
      setCurrentUser(prev => {
        const cleaned = { ...prev };
        delete cleaned.restrictedUntil;
        delete cleaned.restrictionReason;
        return cleaned;
      });
    }
  }, []);

  const [sightings, setSightings] = useState<Sighting[]>(() => {
    const saved = localStorage.getItem('aerotrack_sightings');
    return saved ? JSON.parse(saved) : INITIAL_SIGHTINGS;
  });

  const [rewardMilestones, setRewardMilestones] = useState<RewardMilestone[]>(() => {
    const saved = localStorage.getItem('aerotrack_rewards');
    return saved ? JSON.parse(saved) : REWARD_MILESTONES;
  });

  // Map Picker State
  const [isPickerMode, setIsPickerMode] = useState<boolean>(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  
  // AI Bird Scanner Modal State
  const [isAiScannerOpen, setIsAiScannerOpen] = useState<boolean>(false);

  // Paystack & Flutterwave Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  // Account Restriction Modal State
  const [isRestrictionModalOpen, setIsRestrictionModalOpen] = useState<boolean>(false);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'pro' } | null>(null);

  const showToast = (text: string, type: 'success' | 'pro' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Persist User
  useEffect(() => {
    localStorage.setItem('aerotrack_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Persist Sightings
  useEffect(() => {
    localStorage.setItem('aerotrack_sightings', JSON.stringify(sightings));
  }, [sightings]);

  // Persist Rewards
  useEffect(() => {
    localStorage.setItem('aerotrack_rewards', JSON.stringify(rewardMilestones));
  }, [rewardMilestones]);

  // Auth Session State
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isLoggedIn = !!session;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    showToast('Signed out successfully.', 'success');
    setActiveTab('auth');
  };

  // Protect private pages with supabase.auth.getSession() — if no session, redirect to /login
  useEffect(() => {
    const privatePages = ['settings', 'log'];
    if (privatePages.includes(activeTab)) {
      supabase.auth.getSession().then(({ data }) => {
        if (!data?.session) {
          showToast('Please sign in to access this page.', 'success');
          setActiveTab('auth');
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/login');
          }
        }
      });
    }
  }, [activeTab]);

  // Toggle User Tier / Open Paystack & Flutterwave Payment Modal
  const handleToggleUserTier = () => {
    if (currentUser.tier === 'free') {
      setIsPaymentModalOpen(true);
    } else {
      const updatedUser: User = {
        ...currentUser,
        tier: 'free',
      };
      setCurrentUser(updatedUser);
      showToast('Switched to Free Observer mode.', 'success');
    }
  };

  // Payment Success Callback (Paystack / Flutterwave)
  const handlePaymentSuccess = (newTier: 'paid', subscription: SubscriptionRecord) => {
    const updatedUser: User = {
      ...currentUser,
      tier: 'paid',
    };
    setCurrentUser(updatedUser);
    showToast(`🎉 VIP PRO Unlocked via ${subscription.provider.toUpperCase()}! Ref: ${subscription.transactionRef}`, 'pro');
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  // Sync user sightings count from Supabase database
  useEffect(() => {
    async function syncSightingsCount() {
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData?.user?.id;

      if (authUserId) {
        const { count, error } = await supabase
          .from('sightings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUserId);

        if (!error && count !== null) {
          setCurrentUser((prev) => ({ ...prev, sightingsCount: count }));
          return;
        }
      }

      // Fallback for local state when offline or unauthenticated
      const activeUserId = authUserId || currentUser.id;
      const userSightings = sightings.filter(
        (s) => s.userId === activeUserId || (s.userName && s.userName.toLowerCase() === currentUser.name.toLowerCase())
      );
      setCurrentUser((prev) => ({ ...prev, sightingsCount: userSightings.length }));
    }

    syncSightingsCount();
  }, [session, sightings]);

  // Load sightings from Supabase
  useEffect(() => {
    async function loadData() {
      const { data } = await fetchSightingsFromSupabase();
      if (data && data.length > 0) {
        setSightings(data);
      }
    }
    loadData();
  }, [session]);

  // Add Sighting Handler
  const handleAddSighting = (newSighting: Sighting) => {
    // Ensure owner userId matches current auth user if available
    const sightingWithUser: Sighting = {
      ...newSighting,
      userId: session?.user?.id || currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      userTier: currentUser.tier,
    };

    setSightings((prev) => [sightingWithUser, ...prev]);

    // Save to Supabase
    createSightingInSupabase(sightingWithUser).then(({ data }) => {
      if (data) {
        setSightings((prev) => prev.map((item) => (item.id === sightingWithUser.id ? data : item)));
      }
    });

    // Update User Stats & Points
    const updatedUser: User = {
      ...currentUser,
      sightingsCount: currentUser.sightingsCount + 1,
      points: currentUser.points + 100,
    };
    setCurrentUser(updatedUser);

    // Update Reward Milestones Progress
    setRewardMilestones((prev) =>
      prev.map((m) => {
        if (updatedUser.sightingsCount >= m.requiredSightings) {
          return { ...m, unlocked: true };
        }
        return m;
      })
    );

    // Turn off picker mode
    setIsPickerMode(false);
    setPickedCoords(null);

    showToast(`✓ Logged sighting for ${newSighting.speciesName}! +100 Points added.`, 'success');
    setActiveTab('map');
  };

  // Like Sighting Handler
  const handleLikeSighting = (id: string) => {
    let updatedLikesCount = 0;
    setSightings((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const liked = !s.likedByMe;
          updatedLikesCount = liked ? s.likesCount + 1 : Math.max(0, s.likesCount - 1);
          return {
            ...s,
            likedByMe: liked,
            likesCount: updatedLikesCount,
          };
        }
        return s;
      })
    );

    updateSightingInSupabase(id, { likesCount: updatedLikesCount });
  };

  // Add Comment Handler
  const handleAddComment = (sightingId: string, content: string) => {
    let updatedComments: any[] = [];
    setSightings((prev) =>
      prev.map((s) => {
        if (s.id === sightingId) {
          const newCm = {
            id: `cm_${Date.now()}`,
            userId: session?.user?.id || currentUser.id,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            content,
            timestamp: 'Just now',
          };
          updatedComments = [...s.comments, newCm];
          return {
            ...s,
            comments: updatedComments,
          };
        }
        return s;
      })
    );

    if (updatedComments.length > 0) {
      updateSightingInSupabase(sightingId, { comments: updatedComments });
    }
  };

  // Delete Sighting Handler
  const handleDeleteSighting = (id: string) => {
    setSightings((prev) => prev.filter((s) => s.id !== id));
    deleteSightingInSupabase(id);
    showToast('✓ Sighting deleted successfully.', 'success');
  };

  // Jump to specific map coordinates
  const handleJumpToMapSighting = (sighting: Sighting) => {
    setActiveTab('map');
  };

  // Request Pick on Map Trigger
  const handleRequestPickOnMap = () => {
    setIsPickerMode(true);
    setActiveTab('map');
  };

  // Claim Reward Perk
  const handleClaimReward = (rewardId: string) => {
    setRewardMilestones((prev) =>
      prev.map((m) => (m.id === rewardId ? { ...m, unlocked: true } : m))
    );

    // Grant 1 month VIP if Silver Sentinel claimed
    if (rewardId === 'rw_02' && currentUser.tier !== 'paid') {
      setCurrentUser((prev) => ({ ...prev, tier: 'paid' }));
      showToast('🎁 Claimed Silver Sentinel Perk: 1 Month VIP Hotspot Access Activated!', 'pro');
    } else {
      showToast('🎁 Perk claimed successfully!', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center space-x-3 backdrop-blur-md ${
              toastMessage.type === 'pro'
                ? 'bg-amber-950/90 border-amber-500/80 text-amber-200'
                : 'bg-emerald-950/90 border-emerald-500/80 text-emerald-200'
            }`}
          >
            {toastMessage.type === 'pro' ? (
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <p className="text-xs font-bold leading-snug">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Main Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        onToggleUserTier={handleToggleUserTier}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenAiScanner={() => setIsAiScannerOpen(true)}
      />

      {/* Primary View Router */}
      <main className="flex-1 w-full">
        {activeTab === 'map' && (
          <InteractiveMap
            sightings={sightings}
            hotspots={HOTSPOTS}
            migrationRoutes={MIGRATION_ROUTES}
            speciesList={BIRD_SPECIES_LIST}
            currentUser={currentUser}
            onSelectSighting={(s) => {}}
            onSelectHotspot={(hs) => {}}
            onUpgradePrompt={() => {
              if (currentUser.tier === 'free') {
                handleToggleUserTier();
              }
            }}
            isPickerMode={isPickerMode}
            onPickCoordinates={(coords) => {
              setPickedCoords(coords);
              setIsPickerMode(false);
              setActiveTab('log');
              showToast(`Coordinates selected: Lat ${coords.lat}, Lng ${coords.lng}`, 'success');
            }}
            selectedCoordinates={pickedCoords}
          />
        )}

        {activeTab === 'log' && (
          <SightingLogger
            speciesList={BIRD_SPECIES_LIST}
            currentUser={currentUser}
            onAddSighting={handleAddSighting}
            onCancel={() => setActiveTab('map')}
            onRequestPickOnMap={handleRequestPickOnMap}
            initialCoords={pickedCoords}
            onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
            onOpenRestrictionModal={() => setIsRestrictionModalOpen(true)}
          />
        )}

        {activeTab === 'feed' && (
          <CommunityFeed
            sightings={sightings}
            currentUser={currentUser}
            onLikeSighting={handleLikeSighting}
            onDeleteSighting={handleDeleteSighting}
            onAddComment={handleAddComment}
            onJumpToMapSighting={handleJumpToMapSighting}
            onOpenLogModal={() => setActiveTab('log')}
            onUpgradeToPro={handleToggleUserTier}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardAndRewards
            leaderboardData={LEADERBOARD_DATA}
            rewardMilestones={rewardMilestones}
            currentUser={currentUser}
            onClaimReward={handleClaimReward}
            onUpgradeToPro={handleToggleUserTier}
          />
        )}

        {activeTab === 'hotspots' && (
          <VIPHotspots
            hotspots={HOTSPOTS}
            currentUser={currentUser}
            onUpgradeToPro={handleToggleUserTier}
            onSelectHotspotOnMap={(hs) => {
              setActiveTab('map');
            }}
          />
        )}

        {activeTab === 'auth' && (
          <AuthPage
            currentUser={currentUser}
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              showToast(`Logged in as ${user.name} (${user.tier.toUpperCase()})`, user.tier === 'paid' ? 'pro' : 'success');
            }}
            onGoToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            currentUser={currentUser}
            onSaveUser={(updatedUser) => {
              setCurrentUser(updatedUser);
              showToast('✓ Profile and personal address saved successfully!', 'success');
            }}
            onToggleUserTier={handleToggleUserTier}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Quick Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onSwitchUser={(newUser) => {
          setCurrentUser(newUser);
          showToast(`Logged in as ${newUser.name}`, 'success');
        }}
      />

      {/* AI Bird Vision Species Scanner Modal */}
      <AIBirdIdentifierModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
        speciesList={BIRD_SPECIES_LIST}
        onSelectForSighting={(identifiedData) => {
          setActiveTab('log');
          showToast(`AI Identified ${identifiedData.speciesName}! Log details pre-populated.`, 'success');
        }}
      />

      {/* Account 3-Day Restriction Notice Modal */}
      <AccountRestrictionModal
        isOpen={isRestrictionModalOpen}
        onClose={() => setIsRestrictionModalOpen(false)}
        user={currentUser}
        onClearRestrictionForDemo={() => {
          setCurrentUser((prev) => ({
            ...prev,
            restrictedUntil: undefined,
            restrictionReason: undefined,
          }));
          setIsRestrictionModalOpen(false);
          showToast('Account restriction reset for demo testing.', 'success');
        }}
      />

      {/* Paystack & Flutterwave Gateway Subscription Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        currentUser={currentUser}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
