import React from 'react';
import { Hotspot, User } from '../types';
import { Lock, Sparkles, ShieldCheck, Compass, Radio, Eye, Zap, Flame, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';

interface VIPHotspotsProps {
  hotspots: Hotspot[];
  currentUser: User;
  onUpgradeToPro: () => void;
  onSelectHotspotOnMap: (hotspot: Hotspot) => void;
}

export const VIPHotspots: React.FC<VIPHotspotsProps> = ({
  hotspots,
  currentUser,
  onUpgradeToPro,
  onSelectHotspotOnMap,
}) => {
  const isPaid = currentUser.tier === 'paid';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      
      {/* Header Showcase Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs px-3 py-1 rounded-full flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>EXCLUSIVE FEATURE</span>
              </span>
              {isPaid && (
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-xs px-3 py-1 rounded-full flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>VIP UNLOCKED</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-white via-amber-100 to-amber-300 bg-clip-text text-transparent">
              High-Traffic Birding Hotspots & Live Radar
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Track major global flyway chokepoints where millions of migratory raptors, waders, and songbirds bottleneck during peak seasonal migrations.
            </p>
          </div>

          {!isPaid && (
            <button
              onClick={onUpgradeToPro}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/25 hover:scale-105 transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-slate-950" />
              <span>Unlock VIP Hotspot Pass</span>
            </button>
          )}
        </div>
      </div>

      {/* Free User Paywall Upgrade Banner */}
      {!isPaid && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <Lock className="w-5 h-5" />
                <span>Restricted Access for Free Plan</span>
              </div>
              <h2 className="text-xl font-bold text-white">
                Viewing Limited Sighting Summaries
              </h2>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Only Paid Members can access live radar bird density streams, rare species arrival alerts, and precise coordinates in high-traffic migration funnels.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Live Flyway Radar Density (birds/hr)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Rare & Endangered Species Arrival Stream</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Optimum Observing Window Clock</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Thermal Wind Vector Projections</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/80 p-5 rounded-2xl border border-amber-500/40 text-center w-full md:w-72 shrink-0 space-y-3">
              <p className="text-xs text-amber-300 font-semibold uppercase tracking-wider">Evaluation Pro Access</p>
              <div className="text-2xl font-extrabold text-white">$9.99 <span className="text-xs font-normal text-slate-400">/ season</span></div>
              <button
                onClick={onUpgradeToPro}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                Activate Demo Pro Access Instantly
              </button>
              <p className="text-[10px] text-slate-400">1-click instant unlock for reviewers</p>
            </div>
          </div>
        </div>
      )}

      {/* Hotspots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotspots.map((hs) => {
          const isLocked = hs.isExclusive && !isPaid;

          return (
            <div
              key={hs.id}
              className={`bg-slate-900 border rounded-3xl overflow-hidden flex flex-col justify-between text-white shadow-xl transition-all relative ${
                isLocked ? 'border-amber-500/30 bg-slate-950/90' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Photo Header */}
                <div className="relative h-44 overflow-hidden bg-slate-950">
                  {hs.photoUrl ? (
                    <img
                      src={hs.photoUrl}
                      alt={hs.name}
                      className={`w-full h-full object-cover ${isLocked ? 'blur-sm opacity-60' : 'hover:scale-105 transition-transform duration-300'}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                      No Photo
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent"></div>

                  <div className="absolute top-3 left-3 flex items-center space-x-1.5">
                    <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase shadow">
                      {hs.trafficRating} TRAFFIC
                    </span>
                    {hs.isExclusive && (
                      <span className="bg-slate-950/80 text-amber-300 border border-amber-500/50 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md">
                        VIP
                      </span>
                    )}
                  </div>

                  {isLocked && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center text-center p-4">
                      <Lock className="w-8 h-8 text-amber-400 mb-2" />
                      <h4 className="font-bold text-sm text-white">VIP Exclusive Hotspot</h4>
                      <p className="text-[11px] text-slate-300 mt-1 max-w-xs">Upgrade to view live flyway radar & coordinates.</p>
                      <button
                        onClick={onUpgradeToPro}
                        className="mt-3 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
                      >
                        Unlock Hotspot
                      </button>
                    </div>
                  )}

                  {!isLocked && (
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-bold bg-slate-950/90 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                        📡 {hs.currentDensity}
                      </span>
                      <span className="text-slate-300 font-medium bg-slate-950/90 px-2 py-1 rounded-lg">
                        Peak: {hs.peakMonth}
                      </span>
                    </div>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg text-white leading-tight">{hs.name}</h3>
                    <p className="text-xs text-amber-400/90 font-medium mt-1 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{hs.locationName} ({hs.region})</span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{hs.description}</p>

                  {/* Rare Species Present Badges */}
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                      Rare Migrants Active Now:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {hs.rareSpeciesPresent.map((sp) => (
                        <span
                          key={sp}
                          className="text-[10px] bg-slate-950 border border-slate-800 text-amber-300 px-2 py-0.5 rounded-md"
                        >
                          🦅 {sp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  Flyway: <strong className="text-slate-200">{hs.flywayType}</strong>
                </div>

                <button
                  onClick={() => onSelectHotspotOnMap(hs)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center space-x-1 transition-colors"
                >
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Locate on Map</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
