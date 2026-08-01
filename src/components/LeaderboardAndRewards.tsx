import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { LeaderboardEntry, RewardMilestone, User } from '../types';
import { Award, Trophy, Crown, Zap, ShieldCheck, Sparkles, CheckCircle2, ChevronRight, Gift, Compass } from 'lucide-react';

interface LeaderboardAndRewardsProps {
  leaderboardData: Record<string, LeaderboardEntry[]>;
  rewardMilestones: RewardMilestone[];
  currentUser: User;
  onClaimReward: (rewardId: string) => void;
  onUpgradeToPro: () => void;
}

export const LeaderboardAndRewards: React.FC<LeaderboardAndRewardsProps> = ({
  leaderboardData,
  rewardMilestones,
  currentUser,
  onClaimReward,
  onUpgradeToPro,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('Global');

  const regions = ['Global', 'North America', 'Europe', 'Asia-Pacific'];
  const currentLeaderboard = leaderboardData[selectedRegion] || leaderboardData['Global'] || [];

  const top3 = currentLeaderboard.slice(0, 3);
  const remainingRanks = currentLeaderboard.slice(3);

  const handleClaim = (rewardId: string) => {
    onClaimReward(rewardId);
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      
      {/* Page Title Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2">
              <Trophy className="w-8 h-8 text-amber-400" />
              <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
                Regional Leaderboards & Sentinel Rewards
              </h1>
            </div>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl">
              Earn points and seasonal rewards by logging verified bird sightings. Top contributors earn <strong>Free VIP Hotspot Passes</strong> and official Ornithology Badges!
            </p>
          </div>

          {/* User Score Summary Card */}
          <div className="bg-slate-950/80 border border-amber-500/30 p-4 rounded-2xl flex items-center space-x-4 shadow-xl shrink-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-400"
            />
            <div>
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Your Contribution</p>
              <h4 className="text-lg font-bold text-white">{currentUser.name}</h4>
              <div className="flex items-center space-x-3 text-xs text-slate-300 mt-0.5">
                <span>🏆 <strong>{currentUser.points}</strong> pts</span>
                <span>•</span>
                <span>🦅 <strong>{currentUser.sightingsCount}</strong> sightings</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards & Milestones Progress Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center space-x-2 text-amber-400">
              <Gift className="w-5 h-5" />
              <span>Migration Contributor Reward Track</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Log sightings to unlock VIP hot-spot passes, field badges, and research perks.
            </p>
          </div>

          <div className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl self-start">
            Current Tier: {currentUser.tier === 'paid' ? 'VIP PRO Member' : 'Free Observer'}
          </div>
        </div>

        {/* Milestone Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rewardMilestones.map((m) => {
            const isUnlocked = currentUser.sightingsCount >= m.requiredSightings || m.unlocked;
            const progress = Math.min(100, Math.round((currentUser.sightingsCount / m.requiredSightings) * 100));

            return (
              <div
                key={m.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                  isUnlocked
                    ? 'bg-gradient-to-b from-amber-500/10 to-slate-950 border-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950 border-slate-800 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Crown className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {m.requiredSightings} Sightings
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-white">{m.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{m.description}</p>
                </div>

                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                    <span>Progress</span>
                    <span>{progress}% ({currentUser.sightingsCount}/{m.requiredSightings})</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <p className="text-[11px] text-amber-300 font-medium italic">🎁 Perk: {m.perk}</p>

                  <button
                    disabled={!isUnlocked}
                    onClick={() => handleClaim(m.id)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      isUnlocked
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/25 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {m.unlocked ? '✓ Perk Claimed' : isUnlocked ? 'Claim Reward Perk 🎉' : 'Locked (Keep Logging)'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard Table & Regional Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Regional Birdwatcher Rankings</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Top contributors sorted by verified observations</p>
          </div>

          {/* Region Tabs */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
            {regions.map((reg) => (
              <button
                key={reg}
                onClick={() => setSelectedRegion(reg)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedRegion === reg
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>
        </div>

        {/* Top 3 Podium Visual Display */}
        {top3.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
            {/* 2nd Place */}
            {top3[1] && (
              <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl text-center flex flex-col items-center justify-between order-2 sm:order-1">
                <span className="text-2xl mb-1">🥈</span>
                <img src={top3[1].avatar} alt={top3[1].name} className="w-16 h-16 rounded-full object-cover ring-4 ring-slate-400 mb-2" />
                <h4 className="font-bold text-sm text-white">{top3[1].name}</h4>
                <p className="text-xs text-slate-400">{top3[1].region}</p>
                <div className="mt-3 bg-slate-900 w-full py-1.5 rounded-xl text-xs text-emerald-400 font-bold">
                  {top3[1].sightings} Sightings
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <div className="bg-gradient-to-b from-amber-500/20 to-slate-950 border-2 border-amber-500/60 p-6 rounded-2xl text-center flex flex-col items-center justify-between shadow-2xl order-1 sm:order-2 transform sm:-translate-y-2">
                <span className="text-3xl mb-1">👑</span>
                <img src={top3[0].avatar} alt={top3[0].name} className="w-20 h-20 rounded-full object-cover ring-4 ring-amber-400 mb-2 shadow-xl" />
                <h4 className="font-extrabold text-base text-amber-300">{top3[0].name}</h4>
                <p className="text-xs text-amber-200/80 font-medium">{top3[0].badgeTitle}</p>
                <div className="mt-3 bg-amber-500 text-slate-950 w-full py-2 rounded-xl text-xs font-extrabold shadow-lg">
                  🥇 {top3[0].sightings} Verified Sightings
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl text-center flex flex-col items-center justify-between order-3">
                <span className="text-2xl mb-1">🥉</span>
                <img src={top3[2].avatar} alt={top3[2].name} className="w-16 h-16 rounded-full object-cover ring-4 ring-amber-700 mb-2" />
                <h4 className="font-bold text-sm text-white">{top3[2].name}</h4>
                <p className="text-xs text-slate-400">{top3[2].region}</p>
                <div className="mt-3 bg-slate-900 w-full py-1.5 rounded-xl text-xs text-emerald-400 font-bold">
                  {top3[2].sightings} Sightings
                </div>
              </div>
            )}
          </div>
        )}

        {/* Full Rankings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Observer</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4 text-center">Verified Sightings</th>
                <th className="py-3 px-4 text-center">Rare Species</th>
                <th className="py-3 px-4">Perk Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {currentLeaderboard.map((usr) => {
                const isCurrentUser = usr.userId === currentUser.id || usr.name.includes('(You)');

                return (
                  <tr
                    key={usr.userId}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isCurrentUser ? 'bg-amber-500/10 border-l-4 border-l-amber-500 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-300">#{usr.rank}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <img src={usr.avatar} alt={usr.name} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-100">{usr.name}</span>
                            {usr.tier === 'paid' && (
                              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                                PRO
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">{usr.badgeTitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{usr.region}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-emerald-400 font-bold">{usr.sightings}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-amber-400 font-bold">{usr.rareCount}</td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="bg-slate-950 border border-slate-800 text-[11px] px-2.5 py-1 rounded-lg text-amber-300 block truncate max-w-xs">
                        🎁 {usr.rewardUnlocked}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
