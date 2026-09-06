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
import { fetchUserProfile, saveUserProfile } from './services/userService.js';
import { CheckCircle2, Sparkles, AlertCircle, Compass, Lock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Tab mapped dynamically from current router URL path
  const getTabFromPath = (path: string): 'map' | 'log' | 'feed' | 'leaderboard' | 'hotspots' | 'auth' | 'settings' => {
    if (path.startsWith('/log')) return 'log';
    if (path.startsWith('/feed')) return 'feed';
    if (path.startsWith('/leaderboard') || path.startsWith('/ranks')) return 'leaderboard';
    if (path.startsWith('/hotspots')) return 'hotspots';
    if (path.startsWith('/auth') || path.startsWith('/login') || path.startsWith('/signup')) return 'auth';
    if (path.startsWith('/settings') || path.startsWith('/profile')) return 'settings';
    return 'map';
  };

  const activeTab = getTabFromPath(location.pathname);
  const setActiveTab = (tab: 'map' | 'log' | 'feed' | 'leaderboard' | 'hotspots' | 'auth' | 'settings') => {
    const targetPath = tab === 'map' ? '/' : `/${tab}`;
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  // App Core Data States with localStorage persistence
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('aerotrack_user');
      const user = saved ? JSON.parse(saved) : INITIAL_USER_FREE;
      delete user.restrictedUntil;
      delete user.restrictionReason;
      return user;
    } catch {
      return INITIAL_USER_FREE;
    }
  });

  // Ensure any cached suspension is cleared for testing
  useEffect(() => {
    try {
      if (currentUser.restrictedUntil || currentUser.restrictionReason) {
        setCurrentUser(prev => {
          const cleaned = { ...prev };
          delete cleaned.restrictedUntil;
          delete cleaned.restrictionReason;
          return cleaned;
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const [sightings, setSightings] = useState<Sighting[]>(() => {
    try {
      const saved = localStorage.getItem('aerotrack_sightings');
      return saved ? JSON.parse(saved) : INITIAL_SIGHTINGS;
    } catch {
      return INITIAL_SIGHTINGS;
    }
  });

  const [rewardMilestones, setRewardMilestones] = useState<RewardMilestone[]>(() => {
    try {
      const saved = localStorage.getItem('aerotrack_rewards');
      return saved ? JSON.parse(saved) : REWARD_MILESTONES;
    } catch {
      return REWARD_MILESTONES;
    }
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
  const [isRefreshingSightings, setIsRefreshingSightings] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'pro' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Persist User
  useEffect(() => {
    try {
      localStorage.setItem('aerotrack_user', JSON.stringify(currentUser));
    } catch {
      // ignore
    }
  }, [currentUser]);

  // Persist Sightings
  useEffect(() => {
    try {
      localStorage.setItem('aerotrack_sightings', JSON.stringify(sightings));
    } catch {
      // ignore
    }
  }, [sightings]);

  // Persist Rewards
  useEffect(() => {
    try {
      localStorage.setItem('aerotrack_rewards', JSON.stringify(rewardMilestones));
    } catch {
      // ignore
    }
  }, [rewardMilestones]);

  // Auth Session State
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    try {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data?.session || null);
      }).catch((err) => {
        console.warn('Initial session check note:', err);
      });
    } catch (err) {
      console.warn('Get session init notice:', err);
    }

    try {
      const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => {
        setSession(currentSession);
      });

      return () => {
        data?.subscription?.unsubscribe?.();
      };
    } catch (err) {
      console.warn('Auth state listener init notice:', err);
    }
  }, []);

  // Sync user profile from Supabase profiles table
  useEffect(() => {
    async function loadUserProfile() {
      try {
        const authUserId = session?.user?.id;
        if (authUserId) {
          const { data: dbProfile } = await fetchUserProfile(authUserId);
          if (dbProfile) {
            setCurrentUser((prev) => ({
              ...prev,
              ...dbProfile,
              id: authUserId,
              email: dbProfile.email || session?.user?.email || prev.email,
              name: dbProfile.name || prev.name,
              avatar: dbProfile.avatar || prev.avatar,
              address: dbProfile.address || prev.address,
            }));
          }
        }
      } catch (err) {
        console.warn('Load user profile notice:', err);
      }
    }
    loadUserProfile();
  }, [session]);

  const isLoggedIn = !!session;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out notice:', err);
    }
    setSession(null);
    showToast('Signed out successfully.', 'success');
    navigate('/auth');
  };

  // Protect private pages with supabase.auth.getSession() — if no session, redirect to /auth
  useEffect(() => {
    const privatePages = ['settings', 'log'];
    if (privatePages.includes(activeTab)) {
      try {
        supabase.auth.getSession().then(({ data }) => {
          if (!data?.session) {
            showToast('Please sign in to access this page.', 'success');
            navigate('/auth');
          }
        }).catch((err) => {
          console.warn('Auth check notice:', err);
        });
      } catch (err) {
        console.warn('Private page session check notice:', err);
      }
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
    console.log('[handlePaymentSuccess] Inspecting subscription object before processing:', subscription);
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
      try {
        const { data: authData } = await supabase.auth.getUser();
        const authUserId = authData?.user?.id;

        if (authUserId) {
          const { count, error } = await supabase
            .from('sightings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', authUserId);

          if (!error && count !== null) {
            setCurrentUser((prev) => (prev.sightingsCount === count ? prev : { ...prev, sightingsCount: count }));
            return;
          }
        }

        // Fallback for local state when offline or unauthenticated
        const activeUserId = authUserId || currentUser.id;
        const userSightings = sightings.filter(
          (s) => s.userId === activeUserId || Boolean(s.userName && currentUser?.name && s.userName.toLowerCase() === currentUser.name.toLowerCase())
        );
        setCurrentUser((prev) => (prev.sightingsCount === userSightings.length ? prev : { ...prev, sightingsCount: userSightings.length }));
      } catch (err) {
        console.warn('Sync sightings count notice:', err);
      }
    }

    syncSightingsCount();
  }, [session, sightings]);

  // Load sightings from Supabase
  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await fetchSightingsFromSupabase();
        if (!error && data && data.length > 0) {
          setSightings(data);
        }
      } catch (err) {
        console.warn('Load sightings notice:', err);
      }
    }
    loadData();
  }, [session]);

  // Realtime subscription: keep sightings in sync across tabs or external database modifications
  useEffect(() => {
    let channel: any = null;
    try {
      channel = supabase
        .channel('supabase-sightings-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sighting_logs' },
          async () => {
            try {
              const { data } = await fetchSightingsFromSupabase();
              if (data) setSightings(data);
            } catch (err) {
              console.warn('Realtime fetch sightings notice:', err);
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.warn('Realtime subscription notice:', status, err);
          }
        });
    } catch (err) {
      console.warn('Realtime channel setup notice:', err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Force Refresh Sightings from Supabase Table
  const handleRefreshSightings = async () => {
    setIsRefreshingSightings(true);
    try {
      const { data, error } = await fetchSightingsFromSupabase();
      if (!error && data) {
        setSightings(data);
        showToast(`✓ Refreshed ${data.length} observations from Supabase database table!`, 'success');
      } else if (error) {
        showToast(`Notice: ${error.message || 'Could not fetch cloud sightings'}`, 'pro');
      }
    } catch (err: any) {
      showToast('Error syncing sightings table: ' + (err?.message || 'unknown error'), 'pro');
    } finally {
      setIsRefreshingSightings(false);
    }
  };

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

    // Save to Supabase (view or sighting_logs table fallback)
    createSightingInSupabase(sightingWithUser)
      .then(({ data, error }) => {
        if (data) {
          setSightings((prev) => prev.map((item) => (item.id === sightingWithUser.id ? data : item)));
          showToast('✓ Sighting persisted to Supabase database table!', 'success');
        } else if (error) {
          console.warn('Supabase sighting persist warning:', error.message);
        }
      })
      .catch((err) => {
        console.warn('Supabase sighting persist error:', err);
      });

    // Update User Stats, Points & Badges
    const pointsAwarded = newSighting.pointsEarned !== undefined ? newSighting.pointsEarned : 100;
    const isRare = newSighting.isRareSpecies || false;

    const RARE_BADGE = 'Rare Species Finder 🦅';
    let currentBadges = currentUser.badges || [];
    if (isRare && !currentBadges.includes(RARE_BADGE)) {
      currentBadges = [...currentBadges, RARE_BADGE];
    }

    const updatedUser: User = {
      ...currentUser,
      sightingsCount: currentUser.sightingsCount + 1,
      rareSpeciesCount: isRare ? (currentUser.rareSpeciesCount || 0) + 1 : currentUser.rareSpeciesCount,
      points: (currentUser.points || 0) + pointsAwarded,
      badges: currentBadges,
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

    if (isRare) {
      showToast(`🚨 RARE / EXTINCT SPECIES RECORDED! +${pointsAwarded} Points & 'Rare Species Finder 🦅' Badge Awarded!`, 'pro');
    } else {
      showToast(`✓ Logged sighting for ${newSighting.speciesName}! +${pointsAwarded} Points added.`, 'success');
    }
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
        <div className="fixed top-16 sm:top-20 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center space-x-3 backdrop-blur-md ${
              toastMessage.type === 'pro'
                ? 'bg-amber-950/95 border-amber-500/80 text-amber-200 shadow-amber-950/50'
                : 'bg-emerald-950/95 border-emerald-500/80 text-emerald-200 shadow-emerald-950/50'
            }`}
          >
            {toastMessage.type === 'pro' ? (
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <p className="text-xs font-bold leading-snug break-words">{toastMessage.text}</p>
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
      <main className={`flex-1 w-full ${activeTab === 'map' ? 'pb-16 md:pb-0' : 'pb-24 md:pb-12'}`}>
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
            existingSightings={sightings}
          />
        )}

        {activeTab === 'feed' && (
          <CommunityFeed
            sightings={sightings}
            currentUser={currentUser}
            sessionUserId={session?.user?.id}
            onLikeSighting={handleLikeSighting}
            onDeleteSighting={handleDeleteSighting}
            onAddComment={handleAddComment}
            onJumpToMapSighting={handleJumpToMapSighting}
            onOpenLogModal={() => setActiveTab('log')}
            onUpgradeToPro={handleToggleUserTier}
            onRefreshSightings={handleRefreshSightings}
            isRefreshingSightings={isRefreshingSightings}
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
              saveUserProfile(updatedUser)
                .then(({ isTableMissing, error }) => {
                  if (isTableMissing) {
                    showToast('✓ Saved locally. Execute create_user_profiles_table.sql in Supabase SQL editor to enable cloud DB.', 'success');
                  } else if (error) {
                    showToast('✓ Profile updated locally.', 'success');
                  } else {
                    showToast('✓ Personal profile, photo and address synced with Supabase!', 'success');
                  }
                })
                .catch((err) => {
                  console.warn('Profile save note:', err);
                  showToast('✓ Profile updated locally.', 'success');
                });
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
