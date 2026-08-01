import React, { useState } from 'react';
import { Sighting, User } from '../types';
import { Heart, MessageSquare, MapPin, Search, Filter, ShieldCheck, Sparkles, Share2, PlusCircle, UserCheck, CheckCircle2, Lock, Trash2 } from 'lucide-react';

interface CommunityFeedProps {
  sightings: Sighting[];
  currentUser: User;
  onLikeSighting: (id: string) => void;
  onDeleteSighting?: (id: string) => void;
  onAddComment: (sightingId: string, commentText: string) => void;
  onJumpToMapSighting: (sighting: Sighting) => void;
  onOpenLogModal: () => void;
  onUpgradeToPro?: () => void;
}

export const CommunityFeed: React.FC<CommunityFeedProps> = ({
  sightings,
  currentUser,
  onLikeSighting,
  onDeleteSighting,
  onAddComment,
  onJumpToMapSighting,
  onOpenLogModal,
  onUpgradeToPro,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('All');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [filterType, setFilterType] = useState<'all' | 'verified' | 'mine' | 'hotspots'>('all');
  const [activeCommentDrawerId, setActiveCommentDrawerId] = useState<string | null>(null);
  const [copiedSightingId, setCopiedSightingId] = useState<string | null>(null);
  const [commentInputText, setCommentInputText] = useState<string>('');

  const isFreeUser = currentUser.tier === 'free';

  // Free users can ONLY view their own bird log sightings
  const accessibleSightings = isFreeUser
    ? sightings.filter((s) => s.userId === currentUser.id || s.userName.toLowerCase() === currentUser.name.toLowerCase())
    : sightings;

  // Derive unique species and location regions for dropdown filters
  const availableSpecies = Array.from(new Set(sightings.map((s) => s.speciesName))).sort();
  const availableRegions = Array.from(
    new Set(
      sightings.map((s) => {
        if (s.region) return s.region;
        const parts = s.locationName.split(',');
        return parts[parts.length - 1]?.trim() || s.locationName;
      }).filter(Boolean)
    )
  ).sort();

  const filteredSightings = accessibleSightings.filter((s) => {
    const matchesSearch =
      s.speciesName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.scientificName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.userName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedSpecies !== 'All' && s.speciesName !== selectedSpecies) return false;

    if (
      selectedRegion !== 'All' &&
      s.region !== selectedRegion &&
      !s.locationName.toLowerCase().includes(selectedRegion.toLowerCase())
    ) {
      return false;
    }

    if (filterType === 'verified') return s.verified;
    if (filterType === 'mine') return s.userId === currentUser.id || s.userName.toLowerCase() === currentUser.name.toLowerCase();
    if (filterType === 'hotspots') return s.isHotspotExclusive;

    return true;
  });

  const handleCommentSubmit = (sightingId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInputText.trim()) return;
    onAddComment(sightingId, commentInputText.trim());
    setCommentInputText('');
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 text-[#edeeef]">
      
      {/* Header Banner & Controls */}
      <div className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.1)] rounded p-4 sm:p-6 text-[#edeeef] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono-code text-[10px] text-[#00ffaa] uppercase tracking-widest block">Live Radar Stream</span>
            {isFreeUser && (
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-mono-code px-2 py-0.5 rounded uppercase font-bold flex items-center space-x-1">
                <Lock className="w-2.5 h-2.5" />
                <span>Free Tier Limit</span>
              </span>
            )}
          </div>
          <h1 className="font-syne font-extrabold text-xl sm:text-2xl text-[#edeeef] tracking-tight mt-0.5">
            {isFreeUser ? 'My Bird Sightings Log' : 'Community Observations'}
          </h1>
          <p className="font-mono-code text-xs text-[#edeeef]/60 mt-1 uppercase tracking-wider">
            {isFreeUser
              ? `Viewing your logged observations (${accessibleSightings.length} total). Upgrade to PRO to view all global community sightings.`
              : 'Real-time bird sightings posted by birdwatchers across global flyways.'}
          </p>
        </div>

        <button
          onClick={onOpenLogModal}
          className="min-h-[44px] px-5 py-2.5 rounded bg-[#00ffaa] hover:bg-[#00ffaa]/90 text-[#0b0c0d] font-syne font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#00ffaa]/20 transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Log Observation</span>
        </button>
      </div>

      {/* Free Tier Restriction Alert Banner */}
      {isFreeUser && (
        <div className="bg-amber-400/10 border border-amber-400/30 rounded p-4 text-[#edeeef] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-9 h-9 rounded bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5 sm:mt-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-syne font-bold text-sm text-amber-300">Free Observer Access</span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-mono-code px-1.5 py-0.5 rounded uppercase font-bold">Free Plan</span>
              </div>
              <p className="font-mono-code text-xs text-[#edeeef]/70 mt-0.5">
                As a free user, you can view your own logged sightings only ({accessibleSightings.length} logged). Unlock full access to global community sightings from ornithologists worldwide!
              </p>
            </div>
          </div>

          {onUpgradeToPro && (
            <button
              onClick={onUpgradeToPro}
              className="min-h-[40px] px-4 py-2 rounded bg-amber-400 hover:bg-amber-300 text-[#0b0c0d] font-syne font-extrabold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Unlock VIP PRO Global Sightings</span>
            </button>
          )}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col space-y-3 bg-[rgba(237,238,239,0.03)] p-3 sm:p-4 rounded border border-[rgba(237,238,239,0.1)]">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#edeeef]/40 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search species, place, or observer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0b0c0d] border border-[rgba(237,238,239,0.15)] rounded pl-9 pr-4 py-2 text-xs font-mono-code text-[#edeeef] placeholder-[#edeeef]/40 focus:outline-none focus:border-[#00ffaa]"
            />
          </div>

          {/* Species Dropdown Filter */}
          <div className="flex items-center space-x-2">
            <span className="font-mono-code text-[10px] text-[#edeeef]/50 uppercase tracking-widest shrink-0 hidden sm:inline">Species:</span>
            <select
              value={selectedSpecies}
              onChange={(e) => setSelectedSpecies(e.target.value)}
              className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.15)] rounded px-3 py-2 text-xs font-mono-code text-[#edeeef] focus:outline-none focus:border-[#00ffaa] w-full sm:w-auto"
            >
              <option value="All">All Species ({availableSpecies.length})</option>
              {availableSpecies.map((sp) => (
                <option key={sp} value={sp} className="bg-[#0b0c0d]">
                  {sp}
                </option>
              ))}
            </select>
          </div>

          {/* Location / Region Dropdown Filter */}
          <div className="flex items-center space-x-2">
            <span className="font-mono-code text-[10px] text-[#edeeef]/50 uppercase tracking-widest shrink-0 hidden sm:inline">Location:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.15)] rounded px-3 py-2 text-xs font-mono-code text-[#edeeef] focus:outline-none focus:border-[#00ffaa] w-full sm:w-auto"
            >
              <option value="All">All Locations / Regions</option>
              {availableRegions.map((reg) => (
                <option key={reg} value={reg} className="bg-[#0b0c0d]">
                  {reg}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Pills & Type Switches */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[rgba(237,238,239,0.08)]">
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              onClick={() => setFilterType('all')}
              className={`min-h-[36px] px-3 py-1.5 rounded text-xs font-mono-code uppercase tracking-wider whitespace-nowrap transition-all ${
                filterType === 'all'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] font-bold shadow-md shadow-[#00ffaa]/20'
                  : 'bg-[rgba(237,238,239,0.05)] text-[#edeeef]/70 hover:bg-[rgba(237,238,239,0.1)]'
              }`}
            >
              {isFreeUser ? `My Sightings (${accessibleSightings.length})` : `All Sightings (${sightings.length})`}
            </button>

            <button
              onClick={() => setFilterType('verified')}
              className={`min-h-[36px] px-3 py-1.5 rounded text-xs font-mono-code uppercase tracking-wider whitespace-nowrap transition-all flex items-center space-x-1 ${
                filterType === 'verified'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] font-bold shadow-md shadow-[#00ffaa]/20'
                  : 'bg-[rgba(237,238,239,0.05)] text-[#edeeef]/70 hover:bg-[rgba(237,238,239,0.1)]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified</span>
            </button>

            {!isFreeUser && (
              <button
                onClick={() => setFilterType('mine')}
                className={`min-h-[36px] px-3 py-1.5 rounded text-xs font-mono-code uppercase tracking-wider whitespace-nowrap transition-all ${
                  filterType === 'mine'
                    ? 'bg-[#00ffaa] text-[#0b0c0d] font-bold shadow-md shadow-[#00ffaa]/20'
                    : 'bg-[rgba(237,238,239,0.05)] text-[#edeeef]/70 hover:bg-[rgba(237,238,239,0.1)]'
                }`}
              >
                Mine
              </button>
            )}

            <button
              onClick={() => {
                if (isFreeUser && onUpgradeToPro) {
                  onUpgradeToPro();
                } else {
                  setFilterType('hotspots');
                }
              }}
              className={`min-h-[36px] px-3 py-1.5 rounded text-xs font-mono-code uppercase tracking-wider whitespace-nowrap transition-all flex items-center space-x-1 ${
                filterType === 'hotspots'
                  ? 'bg-amber-400 text-[#0b0c0d] font-bold shadow-md'
                  : 'bg-[rgba(237,238,239,0.05)] text-amber-300 hover:bg-[rgba(237,238,239,0.1)] border border-amber-400/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>VIP Hotspots {isFreeUser ? '(PRO Only)' : ''}</span>
            </button>
          </div>

          {/* Active Filter Badges & Reset */}
          {(selectedSpecies !== 'All' || selectedRegion !== 'All' || searchTerm.trim() !== '') && (
            <button
              onClick={() => {
                setSelectedSpecies('All');
                setSelectedRegion('All');
                setSearchTerm('');
              }}
              className="text-xs font-mono-code text-[#00ffaa] hover:underline uppercase tracking-wider transition-colors min-h-[32px] px-2 flex items-center"
            >
              Reset Filters ✕
            </button>
          )}
        </div>
      </div>

      {/* Sighting List Stream */}
      <div className="space-y-4 sm:space-y-6">
        {filteredSightings.length === 0 ? (
          <div className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.1)] rounded p-8 sm:p-12 text-center text-[#edeeef]/50 font-mono-code">
            <Filter className="w-8 h-8 mx-auto text-[#edeeef]/30 mb-2" />
            <p className="font-bold text-[#edeeef]/80 uppercase text-xs">No observations found.</p>
            <p className="text-[11px] text-[#edeeef]/40 mt-1">Try resetting search query or log a new observation.</p>
          </div>
        ) : (
          filteredSightings.map((s) => (
            <div
              key={s.id}
              className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.1)] rounded overflow-hidden text-[#edeeef] shadow-xl transition-all"
            >
              {/* Card Header (User profile + Tier) */}
              <div className="p-3.5 sm:p-5 flex items-center justify-between border-b border-[rgba(237,238,239,0.1)]">
                <div className="flex items-center space-x-3">
                  <img
                    src={s.userAvatar}
                    alt={s.userName}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover grayscale ring-1 ring-[rgba(237,238,239,0.2)]"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-syne font-bold text-sm text-[#edeeef]">{s.userName}</span>
                      {s.userTier === 'paid' && (
                        <span className="bg-amber-400/10 text-amber-300 border border-amber-400/30 text-[9px] font-mono-code font-bold px-1.5 py-0.2 rounded uppercase">
                          VIP PRO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] font-mono-code text-[#edeeef]/50 uppercase mt-0.5">
                      <span>{s.region}</span>
                      <span>•</span>
                      <span>{s.timestamp}</span>
                    </div>
                  </div>
                </div>

                {s.verified && (
                  <div className="flex items-center space-x-1 bg-[#00ffaa]/10 text-[#00ffaa] border border-[#00ffaa]/30 px-2.5 py-1 rounded text-[10px] font-mono-code uppercase font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Verified</span>
                  </div>
                )}
              </div>

              {/* Photo & Species Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Photo */}
                <div className="relative group bg-[#0b0c0d] aspect-video md:aspect-auto overflow-hidden">
                  <img
                    src={s.photoUrl}
                    alt={s.speciesName}
                    className="w-full h-full object-cover grayscale group-hover:scale-105 transition-transform duration-300"
                  />
                  {s.isHotspotExclusive && (
                    <div className="absolute top-2.5 left-2.5 bg-[#0b0c0d]/90 text-amber-300 border border-amber-400/40 text-[10px] font-mono-code font-bold px-2 py-1 rounded backdrop-blur-md flex items-center space-x-1 uppercase">
                      <Sparkles className="w-3 h-3" />
                      <span>VIP Hotspot</span>
                    </div>
                  )}

                  <div className="absolute bottom-2.5 left-2.5 bg-[#0b0c0d]/90 backdrop-blur-md text-[#edeeef] text-[10px] font-mono-code uppercase px-2 py-1 rounded border border-[rgba(237,238,239,0.15)]">
                    Flock Count: <span className="text-[#00ffaa] font-bold">{s.flockCount}</span>
                  </div>
                </div>

                {/* Sighting Details */}
                <div className="p-4 sm:p-5 flex flex-col justify-between space-y-3 bg-[rgba(237,238,239,0.02)]">
                  <div>
                    <h3 className="font-syne font-extrabold text-lg sm:text-xl text-[#edeeef] tracking-tight">{s.speciesName}</h3>
                    <p className="text-xs text-[#edeeef]/50 italic font-mono-code mt-0.5">{s.scientificName}</p>

                    <div className="mt-2.5 flex items-center space-x-1.5 text-xs font-mono-code text-[#00ffaa] bg-[#00ffaa]/10 p-2 rounded border border-[#00ffaa]/20">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-[#00ffaa]" />
                      <span className="font-semibold truncate">{s.locationName}</span>
                    </div>

                    <p className="text-xs sm:text-sm text-[#edeeef]/80 mt-2.5 leading-relaxed">{s.notes}</p>

                    {s.weather && (
                      <p className="text-[11px] font-mono-code text-[#edeeef]/60 mt-2 bg-[#0b0c0d] p-2 rounded border border-[rgba(237,238,239,0.1)]">
                        🌤️ Weather: {s.weather}
                      </p>
                    )}
                  </div>

                  {/* Actions & Map Jump */}
                  <div className="pt-2 border-t border-[rgba(237,238,239,0.1)] flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => onJumpToMapSighting(s)}
                      className="min-h-[38px] px-3 py-1.5 rounded bg-[rgba(237,238,239,0.1)] hover:bg-[rgba(237,238,239,0.2)] text-[11px] font-mono-code text-[#edeeef] uppercase tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#00ffaa]" />
                      <span>Map ({s.latitude}, {s.longitude})</span>
                    </button>

                    <span className="text-[10px] font-mono-code uppercase font-semibold px-2 py-1 rounded bg-[rgba(237,238,239,0.06)] text-[#edeeef]/70">
                      {s.behavior}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Likes & Comments */}
              <div className="px-4 py-2.5 bg-[#0b0c0d] border-t border-[rgba(237,238,239,0.1)] flex items-center justify-between gap-2">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <button
                    onClick={() => onLikeSighting(s.id)}
                    className={`min-h-[44px] flex items-center space-x-1.5 text-xs font-mono-code uppercase transition-colors cursor-pointer ${
                      s.likedByMe ? 'text-rose-400' : 'text-[#edeeef]/60 hover:text-rose-400'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${s.likedByMe ? 'fill-current text-rose-400' : ''}`} />
                    <span>{s.likesCount} Likes</span>
                  </button>

                  <button
                    onClick={() =>
                      setActiveCommentDrawerId(activeCommentDrawerId === s.id ? null : s.id)
                    }
                    className="min-h-[44px] flex items-center space-x-1.5 text-xs font-mono-code uppercase text-[#edeeef]/60 hover:text-[#00ffaa] transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{s.comments.length} Comments</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.href);
                      }
                      setCopiedSightingId(s.id);
                      setTimeout(() => setCopiedSightingId(null), 2500);
                    }}
                    className="min-h-[44px] px-2 text-xs font-mono-code uppercase text-[#edeeef]/60 hover:text-[#edeeef] flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {copiedSightingId === s.id ? 'Copied!' : 'Share'}
                    </span>
                  </button>

                  {onDeleteSighting && (s.userId === currentUser.id || s.userName.toLowerCase() === currentUser.name.toLowerCase()) && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this sighting?')) {
                          onDeleteSighting(s.id);
                        }
                      }}
                      title="Delete Sighting"
                      className="min-h-[44px] px-2 text-xs font-mono-code uppercase text-slate-500 hover:text-red-400 flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Comment Drawer Expand */}
              {activeCommentDrawerId === s.id && (
                <div className="p-3.5 sm:p-4 bg-[rgba(237,238,239,0.03)] border-t border-[rgba(237,238,239,0.1)] space-y-3">
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {s.comments.length === 0 ? (
                      <p className="text-xs font-mono-code text-[#edeeef]/50 italic">No comments yet. Be the first to start a conversation!</p>
                    ) : (
                      s.comments.map((cm) => (
                        <div key={cm.id} className="bg-[#0b0c0d] p-2.5 rounded border border-[rgba(237,238,239,0.1)] text-xs font-mono-code">
                          <div className="flex items-center justify-between text-[#edeeef]/50 mb-1">
                            <span className="font-bold text-[#edeeef]">{cm.userName}</span>
                            <span className="text-[10px]">{cm.timestamp}</span>
                          </div>
                          <p className="text-[#edeeef]/80 font-sans">{cm.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Input */}
                  <form onSubmit={(e) => handleCommentSubmit(s.id, e)} className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      placeholder="Write an observation note..."
                      value={commentInputText}
                      onChange={(e) => setCommentInputText(e.target.value)}
                      className="flex-1 bg-[#0b0c0d] border border-[rgba(237,238,239,0.15)] rounded px-3 py-2 text-xs font-mono-code text-[#edeeef] placeholder-[#edeeef]/40 focus:outline-none focus:border-[#00ffaa]"
                    />
                    <button
                      type="submit"
                      className="min-h-[38px] px-4 py-2 bg-[#00ffaa] text-[#0b0c0d] font-syne font-bold text-xs uppercase tracking-wider rounded hover:bg-[#00ffaa]/90 cursor-pointer shrink-0"
                    >
                      Post
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
