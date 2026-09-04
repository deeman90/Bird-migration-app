import React, { useState, useMemo } from 'react';
import { Sighting, User } from '../types';
import { 
  Table, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  MapPin, 
  Heart, 
  Trash2, 
  ExternalLink, 
  ShieldCheck, 
  RefreshCw, 
  Database, 
  Sparkles, 
  CheckCircle2, 
  Eye, 
  Calendar,
  Layers,
  PlusCircle,
  Clock
} from 'lucide-react';

interface SightingsTableProps {
  sightings: Sighting[];
  currentUser: User;
  sessionUserId?: string;
  onLikeSighting: (id: string) => void;
  onDeleteSighting?: (id: string) => void;
  onJumpToMapSighting: (sighting: Sighting) => void;
  onOpenLogModal: () => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

type SortField = 'timestamp' | 'speciesName' | 'userName' | 'flockCount' | 'pointsEarned';
type SortDirection = 'asc' | 'desc';

export const SightingsTable: React.FC<SightingsTableProps> = ({
  sightings,
  currentUser,
  sessionUserId,
  onLikeSighting,
  onDeleteSighting,
  onJumpToMapSighting,
  onOpenLogModal,
  onRefresh,
  isRefreshing = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('All');
  const [filterScope, setFilterScope] = useState<'all' | 'mine' | 'verified'>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedSighting, setSelectedSighting] = useState<Sighting | null>(null);

  const effectiveUserId = sessionUserId || currentUser.id;

  // Available unique species for filter dropdown
  const availableSpecies = useMemo(() => {
    return Array.from(new Set(sightings.map((s) => s.speciesName))).sort();
  }, [sightings]);

  // Filter sightings
  const filteredSightings = useMemo(() => {
    return sightings.filter((s) => {
      // Filter scope
      if (filterScope === 'mine') {
        const isMine =
          s.userId === effectiveUserId ||
          s.userId === currentUser.id ||
          (s.userName && currentUser.name && s.userName.toLowerCase() === currentUser.name.toLowerCase());
        if (!isMine) return false;
      } else if (filterScope === 'verified') {
        if (!s.verified) return false;
      }

      // Species filter
      if (selectedSpecies !== 'All' && s.speciesName !== selectedSpecies) {
        return false;
      }

      // Search term
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesQuery =
          s.speciesName.toLowerCase().includes(query) ||
          (s.scientificName && s.scientificName.toLowerCase().includes(query)) ||
          s.locationName.toLowerCase().includes(query) ||
          s.userName.toLowerCase().includes(query) ||
          (s.region && s.region.toLowerCase().includes(query)) ||
          (s.notes && s.notes.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [sightings, filterScope, selectedSpecies, searchTerm, effectiveUserId, currentUser]);

  // Sort sightings
  const sortedSightings = useMemo(() => {
    return [...filteredSightings].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'timestamp') {
        valA = new Date(a.timestamp).getTime() || 0;
        valB = new Date(b.timestamp).getTime() || 0;
      } else if (sortField === 'flockCount') {
        valA = a.flockCount || 1;
        valB = b.flockCount || 1;
      } else if (sortField === 'pointsEarned') {
        valA = a.pointsEarned || 100;
        valB = b.pointsEarned || 100;
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredSightings, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const isOwner = (s: Sighting) => {
    return (
      s.userId === effectiveUserId ||
      s.userId === currentUser.id ||
      (s.userName && currentUser.name && s.userName.toLowerCase() === currentUser.name.toLowerCase())
    );
  };

  return (
    <div id="sightings-table-container" className="space-y-4">
      {/* Control Bar: Filters, Search, Refresh */}
      <div className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.12)] rounded-lg p-3 sm:p-4 text-[#edeeef] shadow-lg flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#edeeef]/40 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table by species, observer, coordinates, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#121417] border border-[rgba(237,238,239,0.15)] rounded-md pl-9 pr-4 py-2 text-xs font-mono-code text-[#edeeef] placeholder-[#edeeef]/40 focus:outline-none focus:border-[#00ffaa]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#edeeef]/40 hover:text-[#edeeef]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Species Dropdown */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="font-mono-code text-[11px] text-[#edeeef]/50 uppercase tracking-widest hidden lg:inline">Species:</span>
            <select
              value={selectedSpecies}
              onChange={(e) => setSelectedSpecies(e.target.value)}
              className="bg-[#121417] border border-[rgba(237,238,239,0.15)] rounded-md px-3 py-2 text-xs font-mono-code text-[#edeeef] focus:outline-none focus:border-[#00ffaa] cursor-pointer"
            >
              <option value="All">All Species ({availableSpecies.length})</option>
              {availableSpecies.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Database Table Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="min-h-[38px] px-3.5 py-2 rounded-md bg-[#121417] hover:bg-[#1a1d22] border border-[rgba(237,238,239,0.18)] text-[#00ffaa] font-mono-code text-xs font-semibold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              title="Force reload latest sightings from Supabase public.sighting_logs / public.sightings table"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00ffaa]' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh Table'}</span>
            </button>
          )}

          {/* Log Sighting Quick Button */}
          <button
            onClick={onOpenLogModal}
            className="min-h-[38px] px-4 py-2 rounded-md bg-[#00ffaa] hover:bg-[#00ffaa]/90 text-[#0b0c0d] font-syne font-extrabold text-xs uppercase tracking-wider shadow-md shadow-[#00ffaa]/20 transition-all flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Log Sighting</span>
          </button>
        </div>

        {/* Scope Pills & Table Stats */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[rgba(237,238,239,0.08)]">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setFilterScope('all')}
              className={`px-3 py-1 rounded text-xs font-mono-code uppercase tracking-wider transition-all cursor-pointer ${
                filterScope === 'all'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] font-bold shadow-sm'
                  : 'bg-[rgba(237,238,239,0.06)] text-[#edeeef]/70 hover:bg-[rgba(237,238,239,0.12)]'
              }`}
            >
              All Records ({sightings.length})
            </button>

            <button
              onClick={() => setFilterScope('mine')}
              className={`px-3 py-1 rounded text-xs font-mono-code uppercase tracking-wider transition-all cursor-pointer ${
                filterScope === 'mine'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] font-bold shadow-sm'
                  : 'bg-[rgba(237,238,239,0.06)] text-[#edeeef]/70 hover:bg-[rgba(237,238,239,0.12)]'
              }`}
            >
              My Sightings ({sightings.filter(isOwner).length})
            </button>

            <button
              onClick={() => setFilterScope('verified')}
              className={`px-3 py-1 rounded text-xs font-mono-code uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer ${
                filterScope === 'verified'
                  ? 'bg-[#00ffaa] text-[#0b0c0d] font-bold shadow-sm'
                  : 'bg-[rgba(237,238,239,0.06)] text-[#edeeef]/70 hover:bg-[rgba(237,238,239,0.12)]'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Verified Only</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-[11px] font-mono-code text-[#edeeef]/60">
            <span className="flex items-center space-x-1 text-[#00ffaa]">
              <span className="w-2 h-2 rounded-full bg-[#00ffaa] animate-pulse inline-block" />
              <span>Supabase Live DB</span>
            </span>
            <span>•</span>
            <span>Showing {sortedSightings.length} of {sightings.length} entries</span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#0b0c0d] border border-[rgba(237,238,239,0.12)] rounded-lg shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-code border-collapse">
            <thead>
              <tr className="bg-[#121417] border-b border-[rgba(237,238,239,0.12)] text-[#edeeef]/70 uppercase text-[10px] tracking-wider select-none">
                <th className="p-3 sm:px-4 sm:py-3 w-12 text-center">Photo</th>
                
                <th 
                  className="p-3 sm:px-4 sm:py-3 cursor-pointer hover:text-[#00ffaa] transition-colors"
                  onClick={() => handleSort('speciesName')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Bird Species</span>
                    {sortField === 'speciesName' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#00ffaa]" /> : <ArrowDown className="w-3 h-3 text-[#00ffaa]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>

                <th 
                  className="p-3 sm:px-4 sm:py-3 cursor-pointer hover:text-[#00ffaa] transition-colors"
                  onClick={() => handleSort('userName')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Observer</span>
                    {sortField === 'userName' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#00ffaa]" /> : <ArrowDown className="w-3 h-3 text-[#00ffaa]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>

                <th className="p-3 sm:px-4 sm:py-3">
                  <span>Location & Flyway</span>
                </th>

                <th 
                  className="p-3 sm:px-4 sm:py-3 cursor-pointer hover:text-[#00ffaa] transition-colors whitespace-nowrap"
                  onClick={() => handleSort('timestamp')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Observed At</span>
                    {sortField === 'timestamp' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#00ffaa]" /> : <ArrowDown className="w-3 h-3 text-[#00ffaa]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>

                <th 
                  className="p-3 sm:px-4 sm:py-3 text-center cursor-pointer hover:text-[#00ffaa] transition-colors"
                  onClick={() => handleSort('flockCount')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Flock</span>
                    {sortField === 'flockCount' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#00ffaa]" /> : <ArrowDown className="w-3 h-3 text-[#00ffaa]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>

                <th 
                  className="p-3 sm:px-4 sm:py-3 text-center cursor-pointer hover:text-[#00ffaa] transition-colors"
                  onClick={() => handleSort('pointsEarned')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Points</span>
                    {sortField === 'pointsEarned' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#00ffaa]" /> : <ArrowDown className="w-3 h-3 text-[#00ffaa]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>

                <th className="p-3 sm:px-4 sm:py-3 text-center">Cloud DB</th>

                <th className="p-3 sm:px-4 sm:py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[rgba(237,238,239,0.06)]">
              {sortedSightings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#edeeef]/40 font-mono-code">
                    <Database className="w-8 h-8 mx-auto text-[#edeeef]/20 mb-2" />
                    <p className="font-bold text-xs uppercase text-[#edeeef]/70">No matching sightings in table</p>
                    <p className="text-[11px] mt-1 text-[#edeeef]/40">
                      Try clearing your search query or log a new observation to populate the table.
                    </p>
                    <button
                      onClick={onOpenLogModal}
                      className="mt-3 px-3 py-1.5 rounded bg-[#00ffaa] text-[#0b0c0d] font-syne font-bold text-xs uppercase tracking-wider inline-flex items-center space-x-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Log First Sighting</span>
                    </button>
                  </td>
                </tr>
              ) : (
                sortedSightings.map((s) => {
                  const owner = isOwner(s);
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-[rgba(237,238,239,0.03)] transition-colors group"
                    >
                      {/* Photo Thumbnail */}
                      <td className="p-2 sm:px-3 sm:py-2.5 text-center">
                        <div className="relative w-10 h-10 rounded overflow-hidden bg-[#121417] border border-[rgba(237,238,239,0.15)] mx-auto shrink-0">
                          <img
                            src={s.photoUrl}
                            alt={s.speciesName}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            loading="lazy"
                          />
                        </div>
                      </td>

                      {/* Species & Scientific Name */}
                      <td className="p-3 sm:px-4 sm:py-3">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-syne font-bold text-sm text-[#edeeef]">
                              {s.speciesName}
                            </span>
                            {s.verified && (
                              <span title="Verified Observation" className="inline-flex items-center">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#00ffaa] shrink-0" />
                              </span>
                            )}
                            {(s.isRareSpecies || (s.pointsEarned && s.pointsEarned > 150)) && (
                              <span className="bg-amber-400/20 text-amber-300 text-[9px] font-bold px-1 py-0.2 rounded uppercase border border-amber-400/30">
                                Rare
                              </span>
                            )}
                          </div>
                          {s.scientificName && (
                            <span className="text-[11px] italic text-[#edeeef]/50 font-sans">
                              {s.scientificName}
                            </span>
                          )}
                          {s.behavior && (
                            <span className="text-[10px] text-[#00ffaa]/80 uppercase mt-0.5">
                              Behavior: {s.behavior}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Observer Profile */}
                      <td className="p-3 sm:px-4 sm:py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <img
                            src={s.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={s.userName}
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-[rgba(237,238,239,0.15)]"
                          />
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-1">
                              <span className="font-semibold text-xs text-[#edeeef]">
                                {s.userName}
                              </span>
                              {owner && (
                                <span className="text-[9px] text-[#00ffaa] font-bold uppercase">(You)</span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#edeeef]/40 uppercase">
                              {s.userTier === 'paid' ? 'VIP PRO' : 'Free Observer'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Location & Flyway Region */}
                      <td className="p-3 sm:px-4 sm:py-3 max-w-[200px]">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-1 text-xs text-[#edeeef] truncate">
                            <MapPin className="w-3 h-3 text-[#00ffaa] shrink-0" />
                            <span className="truncate" title={s.locationName}>{s.locationName}</span>
                          </div>
                          <div className="text-[10px] text-[#edeeef]/50 font-mono-code uppercase mt-0.5">
                            {s.region || 'Global Flyway'} • [{Number(s.latitude).toFixed(2)}, {Number(s.longitude).toFixed(2)}]
                          </div>
                        </div>
                      </td>

                      {/* Observed Date / Time */}
                      <td className="p-3 sm:px-4 sm:py-3 whitespace-nowrap text-[11px] text-[#edeeef]/70">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-[#edeeef]/40" />
                          <span>{formatDateTime(s.timestamp)}</span>
                        </div>
                      </td>

                      {/* Flock Size */}
                      <td className="p-3 sm:px-4 sm:py-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[rgba(237,238,239,0.06)] border border-[rgba(237,238,239,0.1)] text-[#edeeef] font-bold">
                          {s.flockCount || 1}
                        </span>
                      </td>

                      {/* Points Earned */}
                      <td className="p-3 sm:px-4 sm:py-3 text-center whitespace-nowrap">
                        <span className="text-[#00ffaa] font-bold">
                          +{s.pointsEarned || 100}
                        </span>
                      </td>

                      {/* Cloud Sync Status */}
                      <td className="p-3 sm:px-4 sm:py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase" title="Live Synced in Supabase sighting_logs / sightings view">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                          <span>Synced</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 sm:px-4 sm:py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Jump to Map */}
                          <button
                            onClick={() => onJumpToMapSighting(s)}
                            className="p-1.5 rounded bg-[rgba(237,238,239,0.06)] hover:bg-[#00ffaa]/20 text-[#edeeef]/80 hover:text-[#00ffaa] transition-colors cursor-pointer"
                            title="Locate on Radar Flyway Map"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>

                          {/* Like */}
                          <button
                            onClick={() => onLikeSighting(s.id)}
                            className={`p-1.5 rounded transition-colors cursor-pointer flex items-center space-x-1 ${
                              s.likedByMe
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-[rgba(237,238,239,0.06)] hover:bg-rose-500/10 text-[#edeeef]/70 hover:text-rose-400'
                            }`}
                            title="Like Observation"
                          >
                            <Heart className={`w-3.5 h-3.5 ${s.likedByMe ? 'fill-rose-400' : ''}`} />
                            <span className="text-[10px] font-bold">{s.likesCount || 0}</span>
                          </button>

                          {/* Delete (if owner or permitted) */}
                          {onDeleteSighting && owner && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete observation of ${s.speciesName} from database?`)) {
                                  onDeleteSighting(s.id);
                                }
                              }}
                              className="p-1.5 rounded bg-[rgba(237,238,239,0.06)] hover:bg-rose-500/20 text-[#edeeef]/60 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete from Supabase Table"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-[#121417] border-t border-[rgba(237,238,239,0.12)] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono-code text-[#edeeef]/50 gap-2">
          <div className="flex items-center space-x-2">
            <Database className="w-3.5 h-3.5 text-[#00ffaa]" />
            <span>Target Tables: <code className="text-[#00ffaa]">public.sighting_logs</code> &amp; <code className="text-[#00ffaa]">public.sightings</code></span>
          </div>
          <div>
            <span>PostgreSQL Row Level Security (RLS) Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
