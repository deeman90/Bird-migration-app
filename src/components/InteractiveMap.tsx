import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { BirdSpecies, Hotspot, MigrationRoute, Sighting, User } from '../types';
import { Layers, Play, Pause, Filter, ShieldAlert, Sparkles, MapPin, Eye, Lock, RefreshCw, Compass, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface InteractiveMapProps {
  sightings: Sighting[];
  hotspots: Hotspot[];
  migrationRoutes: MigrationRoute[];
  speciesList: BirdSpecies[];
  currentUser: User;
  onSelectSighting?: (sighting: Sighting) => void;
  onSelectHotspot?: (hotspot: Hotspot) => void;
  onUpgradePrompt?: () => void;
  isPickerMode?: boolean;
  onPickCoordinates?: (coords: { lat: number; lng: number }) => void;
  selectedCoordinates?: { lat: number; lng: number } | null;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  sightings,
  hotspots,
  migrationRoutes,
  speciesList,
  currentUser,
  onSelectSighting,
  onSelectHotspot,
  onUpgradePrompt,
  isPickerMode = false,
  onPickCoordinates,
  selectedCoordinates,
}) => {
  const { isLight } = useTheme();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);

  // Map Filter States
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [showSightings, setShowSightings] = useState<boolean>(true);
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [selectedSeason, setSelectedSeason] = useState<string>('All');
  const [selectedSpeciesFilter, setSelectedSpeciesFilter] = useState<string>('All');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('All');
  const [timePlaybackMonthIndex, setTimePlaybackMonthIndex] = useState<number>(4); // May by default
  const [isPlayingTimeAnimation, setIsPlayingTimeAnimation] = useState<boolean>(false);
  const [mapTileStyle, setMapTileStyle] = useState<'dark' | 'satellite' | 'topo'>('dark');

  const months = MONTHS;

  // Available unique regions (memoized to avoid re-calculating on every render)
  const availableRegions = useMemo(() => {
    return Array.from(
      new Set(
        sightings
          .map((s) => s.region || s.locationName.split(',').pop()?.trim())
          .filter(Boolean) as string[]
      )
    ).sort();
  }, [sightings]);

  // Initialize Map with hardware-accelerated canvas renderer
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center globally focused
    const map = L.map(mapContainerRef.current, {
      center: [25, 0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      preferCanvas: true, // Hardware-accelerated canvas for vector paths & polylines
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial Tile Layer
    const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    });
    darkTiles.addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Debounced ResizeObserver to prevent layout thrashing and continuous invalidateSize calls
    let resizeTimer: any = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        try {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize({ debounceMoveend: true });
          }
        } catch {
          // ignore
        }
      }, 150);
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      try {
        map.remove();
      } catch {
        // ignore
      }
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Tile Style changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    try {
      mapInstanceRef.current.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          try {
            mapInstanceRef.current?.removeLayer(layer);
          } catch {
            // ignore
          }
        }
      });

      let newTileUrl = isLight
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      let attribution = '&copy; CARTO & OpenStreetMap';

      if (mapTileStyle === 'satellite') {
        newTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        attribution = '&copy; Esri World Imagery';
      } else if (mapTileStyle === 'topo') {
        newTileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
        attribution = '&copy; OpenTopoMap';
      }

      L.tileLayer(newTileUrl, {
        attribution,
        maxZoom: 18,
      }).addTo(mapInstanceRef.current);
    } catch (err) {
      console.warn('Map tile layer update notice:', err);
    }
  }, [mapTileStyle, isLight]);

  // Click handler for picker mode
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isPickerMode && onPickCoordinates) {
        onPickCoordinates({ lat: Number(e.latlng.lat.toFixed(5)), lng: Number(e.latlng.lng.toFixed(5)) });
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isPickerMode, onPickCoordinates]);

  // Update Picker Pin
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    if (isPickerMode && selectedCoordinates) {
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.setLatLng([selectedCoordinates.lat, selectedCoordinates.lng]);
      } else {
        const pickerIcon = L.divIcon({
          className: 'custom-picker-pin',
          html: `<div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center animate-bounce text-slate-950 font-bold text-xs">📍</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
        pickerMarkerRef.current = L.marker([selectedCoordinates.lat, selectedCoordinates.lng], { icon: pickerIcon }).addTo(
          mapInstanceRef.current
        );
      }
    } else if (pickerMarkerRef.current) {
      mapInstanceRef.current.removeLayer(pickerMarkerRef.current);
      pickerMarkerRef.current = null;
    }
  }, [isPickerMode, selectedCoordinates]);

  // Playback Animation Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayingTimeAnimation) {
      interval = setInterval(() => {
        setTimePlaybackMonthIndex((prev) => (prev + 1) % 12);
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [isPlayingTimeAnimation]);

  // Render Markers and Migration Routes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !routesLayerRef.current) return;

    const markersGroup = markersLayerRef.current;
    const routesGroup = routesLayerRef.current;

    markersGroup.clearLayers();
    routesGroup.clearLayers();

    const currentMonthName = months[timePlaybackMonthIndex];

    // 1. Render Migration Routes
    try {
      if (showRoutes) {
        migrationRoutes.forEach((route) => {
          if (selectedSpeciesFilter !== 'All' && route.speciesId !== selectedSpeciesFilter) return;

          // Draw animated Polyline
          const latLngs = (route.pathPoints || []).map((p) => [p.lat, p.lng] as [number, number]);
          const polyline = L.polyline(latLngs, {
            color: route.color,
            weight: 3.5,
            opacity: 0.85,
            dashArray: '8, 8',
            className: 'animated-flyway-path',
          });

          polyline.bindPopup(`
            <div class="p-2 text-slate-900">
              <h4 class="font-bold text-sm text-slate-900">${route.speciesName} Migration Path</h4>
              <p class="text-xs text-emerald-700 font-semibold">${route.flywayName}</p>
              <p class="text-xs text-slate-600 mt-1">Total Distance: ${route.totalDistanceKm?.toLocaleString() || 0} km</p>
              <div class="mt-2 text-[11px] bg-slate-100 p-1.5 rounded">
                Status: <strong>${route.status}</strong>
              </div>
            </div>
          `);

          routesGroup.addLayer(polyline);

          // Draw Stopover Nodes using fast hardware-accelerated circleMarkers
          (route.pathPoints || []).forEach((pt) => {
            if (isNaN(Number(pt.lat)) || isNaN(Number(pt.lng))) return;
            const nodeMarker = L.circleMarker([pt.lat, pt.lng], {
              radius: 4,
              fillColor: route.color,
              color: '#ffffff',
              weight: 1.5,
              opacity: 1,
              fillOpacity: 0.9,
            });
            nodeMarker.bindTooltip(`${pt.name} (${pt.season || 'Flyway Waypoint'})`, { direction: 'top', offset: [0, -4] });
            routesGroup.addLayer(nodeMarker);
          });
        });
      }

      // 2. Render Sightings (Free users can ONLY view their own bird log sightings)
      const isFreeUser = currentUser.tier === 'free';
      const accessibleSightings = isFreeUser
        ? sightings.filter((s) => s.userId === currentUser.id || Boolean(s.userName && currentUser?.name && s.userName.toLowerCase() === currentUser.name.toLowerCase()))
        : sightings;

      if (showSightings) {
        accessibleSightings.forEach((s) => {
          if (selectedSpeciesFilter !== 'All' && s.speciesId !== selectedSpeciesFilter) return;
          const loc = s.locationName || '';
          const reg = s.region || '';
          if (
            selectedRegionFilter !== 'All' &&
            reg !== selectedRegionFilter &&
            !loc.toLowerCase().includes(selectedRegionFilter.toLowerCase())
          ) {
            return;
          }

          const lat = Number(s.latitude);
          const lng = Number(s.longitude);
          if (isNaN(lat) || isNaN(lng)) return;

          const sightingIcon = L.divIcon({
            className: 'sighting-pin',
            html: `
              <div class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform pulsing-sighting-marker">
                <span class="text-xs">🦅</span>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const marker = L.marker([lat, lng], { icon: sightingIcon });

        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 text-slate-900 max-w-xs';
        popupContent.innerHTML = `
          <div class="relative">
            ${s.photoUrl ? `<img src="${s.photoUrl}" alt="${s.speciesName}" class="w-full h-28 object-cover rounded-lg mb-2" />` : ''}
            <span class="absolute top-1 right-1 bg-slate-950/80 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
              Flock: ${s.flockCount}
            </span>
          </div>
          <h4 class="font-bold text-sm text-slate-900">${s.speciesName}</h4>
          <p class="text-xs text-slate-500 italic">${s.scientificName}</p>
          <div class="mt-1 flex items-center justify-between text-xs text-slate-600 border-t pt-1 border-slate-200">
            <span>📍 ${s.locationName}</span>
          </div>
          <p class="text-xs text-slate-700 mt-1 line-clamp-2">${s.notes}</p>
          <div class="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>By ${s.userName}</span>
            <span>${s.timestamp}</span>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => {
          if (onSelectSighting) onSelectSighting(s);
        });

        markersGroup.addLayer(marker);
      });
    }

    // 3. Render Hotspots (With VIP Lock logic)
    if (showHotspots) {
      hotspots.forEach((hs) => {
        const isUserPaid = currentUser.tier === 'paid';
        const isLockedForFreeUser = hs.isExclusive && !isUserPaid;

        const hotspotIcon = L.divIcon({
          className: 'hotspot-pin',
          html: `
            <div class="relative w-8 h-8 rounded-full ${
              isLockedForFreeUser ? 'bg-amber-600/90 border-2 border-amber-300' : 'bg-amber-500 border-2 border-white'
            } flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 transition-transform pulsing-hotspot-marker">
              ${isLockedForFreeUser ? '🔒' : '🔥'}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([hs.latitude, hs.longitude], { icon: hotspotIcon });

        const popupDiv = document.createElement('div');
        popupDiv.className = 'p-2 max-w-xs text-slate-900';

        if (isLockedForFreeUser) {
          popupDiv.innerHTML = `
            <div class="bg-slate-950 text-white p-3 rounded-lg border border-amber-500/40">
              <div class="flex items-center space-x-1.5 text-amber-400 font-bold text-xs mb-1">
                <span>🔒 VIP Exclusive Birding Hotspot</span>
              </div>
              <h4 class="font-bold text-sm text-slate-100">${hs.name}</h4>
              <p class="text-xs text-slate-400 mt-1">High-density flyway chokepoint with real-time migration radar & rare bird alerts.</p>
              <div class="mt-3 bg-amber-500/10 border border-amber-500/30 p-2 rounded text-center">
                <p class="text-[11px] text-amber-300 font-medium">Only Paid Members can view live flyway radar & coordinates.</p>
                <button id="upgrade-btn-${hs.id}" class="mt-2 w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded shadow transition-all">
                  Unlock VIP Hotspot Access
                </button>
              </div>
            </div>
          `;

          setTimeout(() => {
            const btn = document.getElementById(`upgrade-btn-${hs.id}`);
            if (btn && onUpgradePrompt) {
              btn.onclick = () => onUpgradePrompt();
            }
          }, 100);
        } else {
          popupDiv.innerHTML = `
            <div>
              <div class="relative">
                ${hs.photoUrl ? `<img src="${hs.photoUrl}" alt="${hs.name}" class="w-full h-28 object-cover rounded-lg mb-2" />` : ''}
                <span class="absolute top-1 right-1 bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                  ${hs.trafficRating.toUpperCase()} TRAFFIC
                </span>
              </div>
              <h4 class="font-bold text-sm text-slate-900">${hs.name}</h4>
              <p class="text-xs text-slate-500">📍 ${hs.locationName}</p>
              <p class="text-xs text-slate-700 mt-1 line-clamp-2">${hs.description}</p>
              <div class="mt-2 bg-slate-100 p-2 rounded text-xs">
                <div class="flex justify-between text-slate-700">
                  <span>Radar Density:</span>
                  <strong class="text-emerald-700">${hs.currentDensity}</strong>
                </div>
                <div class="flex justify-between text-slate-700 mt-0.5">
                  <span>Peak Season:</span>
                  <strong>${hs.peakMonth}</strong>
                </div>
              </div>
            </div>
          `;
        }

        marker.bindPopup(popupDiv);
        marker.on('click', () => {
          if (onSelectHotspot) onSelectHotspot(hs);
        });

        markersGroup.addLayer(marker);
      });
    }
  } catch (err) {
    console.warn('Map markers and layers render notice:', err);
  }
  }, [
    showRoutes,
    showSightings,
    showHotspots,
    selectedSpeciesFilter,
    selectedRegionFilter,
    migrationRoutes,
    sightings,
    hotspots,
    currentUser.tier,
  ]);

  return (
    <div className="relative w-full h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-4rem)] min-h-[480px] bg-slate-950 overflow-hidden flex flex-col">
      {/* Map Control Overlay Banner */}
      <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pointer-events-none">
        
        {/* Layer Toggles & Filters */}
        <div className="pointer-events-auto max-w-full overflow-x-auto flex items-center gap-1.5 bg-[#0b0c0d]/90 backdrop-blur-md p-1.5 sm:p-2 rounded-lg border border-[rgba(237,238,239,0.1)] text-[#edeeef] shadow-xl no-scrollbar">
          <div className="flex items-center space-x-1 pr-1.5 border-r border-[rgba(237,238,239,0.1)] shrink-0">
            <Compass className="w-3.5 h-3.5 text-[#00ffaa]" />
            <span className="font-mono-code text-[10px] uppercase font-bold text-[#edeeef]/70 hidden sm:inline">Layers:</span>
          </div>

          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`min-h-[32px] px-2.5 py-1 rounded text-xs font-mono-code uppercase tracking-wider transition-all flex items-center space-x-1 shrink-0 cursor-pointer active:scale-95 ${
              showRoutes ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'bg-[rgba(237,238,239,0.05)] text-[#edeeef]/50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span>
            <span>Flyways</span>
          </button>

          {currentUser.tier === 'free' && (
            <div className="bg-amber-400/10 border border-amber-400/30 px-2 py-1 rounded text-amber-300 text-[10px] font-mono-code flex items-center space-x-1 shrink-0">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Mine Only</span>
            </div>
          )}

          <button
            onClick={() => setShowSightings(!showSightings)}
            className={`min-h-[32px] px-2.5 py-1 rounded text-xs font-mono-code uppercase tracking-wider transition-all flex items-center space-x-1 shrink-0 cursor-pointer active:scale-95 ${
              showSightings ? 'bg-[#00ffaa]/20 text-[#00ffaa] border border-[#00ffaa]/40 font-bold' : 'bg-[rgba(237,238,239,0.05)] text-[#edeeef]/50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ffaa] inline-block"></span>
            <span>
              Sightings (
              {currentUser.tier === 'free'
                ? sightings.filter((s) => s.userId === currentUser.id || Boolean(s.userName && currentUser?.name && s.userName.toLowerCase() === currentUser.name.toLowerCase())).length
                : sightings.length}
              )
            </span>
          </button>

          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className={`min-h-[32px] px-2.5 py-1 rounded text-xs font-mono-code uppercase tracking-wider transition-all flex items-center space-x-1 shrink-0 cursor-pointer active:scale-95 ${
              showHotspots ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'bg-[rgba(237,238,239,0.05)] text-[#edeeef]/50'
            }`}
          >
            {currentUser.tier === 'paid' ? (
              <Sparkles className="w-3 h-3 text-amber-300" />
            ) : (
              <Lock className="w-3 h-3 text-amber-400" />
            )}
            <span>VIP Hotspots ({hotspots.length})</span>
          </button>

          {/* Species Dropdown Filter */}
          <div className="flex items-center space-x-1 pl-1 border-l border-[rgba(237,238,239,0.1)] shrink-0">
            <select
              value={selectedSpeciesFilter}
              onChange={(e) => setSelectedSpeciesFilter(e.target.value)}
              className="bg-[#0b0c0d] text-xs font-mono-code text-[#edeeef] border border-[rgba(237,238,239,0.15)] rounded px-2 py-1.5 focus:outline-none focus:border-[#00ffaa] min-h-[32px]"
            >
              <option value="All">All Species</option>
              {speciesList.map((sp) => (
                <option key={sp.id} value={sp.id} className="bg-[#0b0c0d]">
                  {sp.commonName}
                </option>
              ))}
            </select>
          </div>

          {/* Region / Location Dropdown Filter */}
          <div className="flex items-center space-x-1 shrink-0">
            <select
              value={selectedRegionFilter}
              onChange={(e) => setSelectedRegionFilter(e.target.value)}
              className="bg-[#0b0c0d] text-xs font-mono-code text-[#edeeef] border border-[rgba(237,238,239,0.15)] rounded px-2 py-1.5 focus:outline-none focus:border-[#00ffaa] min-h-[32px]"
            >
              <option value="All">All Locations</option>
              {availableRegions.map((reg) => (
                <option key={reg} value={reg} className="bg-[#0b0c0d]">
                  {reg}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tile Style Picker */}
        <div className="pointer-events-auto self-end sm:self-auto flex items-center space-x-1 bg-[#0b0c0d]/90 backdrop-blur-md p-1 rounded-lg border border-[rgba(237,238,239,0.1)] text-xs shrink-0 shadow-xl">
          <button
            onClick={() => setMapTileStyle('dark')}
            className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-mono-code uppercase transition-all cursor-pointer min-h-[28px] ${
              mapTileStyle === 'dark' ? 'bg-[#00ffaa] text-[#0b0c0d] font-bold' : 'text-[#edeeef]/60 hover:text-[#edeeef]'
            }`}
          >
            Vector
          </button>
          <button
            onClick={() => setMapTileStyle('satellite')}
            className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-mono-code uppercase transition-all cursor-pointer min-h-[28px] ${
              mapTileStyle === 'satellite' ? 'bg-[#00ffaa] text-[#0b0c0d] font-bold' : 'text-[#edeeef]/60 hover:text-[#edeeef]'
            }`}
          >
            Satellite
          </button>
        </div>
      </div>

      {/* Map Target / Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Picker Banner Mode Instructions */}
      {isPickerMode && (
        <div className="absolute top-16 sm:top-20 left-1/2 transform -translate-x-1/2 z-30 bg-[#00ffaa] text-[#0b0c0d] font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-lg shadow-2xl flex items-center space-x-2 border border-[#0b0c0d] animate-bounce w-[92%] max-w-md justify-center text-center">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>Tap anywhere on the map to set coordinates!</span>
        </div>
      )}

      {/* Time Playback Slider Bar at Bottom (Positioned above mobile bottom dock) */}
      <div className="absolute bottom-20 md:bottom-4 left-2 right-2 sm:left-1/2 sm:transform sm:-translate-x-1/2 sm:w-full sm:max-w-xl z-30 bg-[#0b0c0d]/95 backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-[rgba(237,238,239,0.12)] shadow-2xl text-[#edeeef]">
        <div className="flex items-center justify-between mb-1 gap-2">
          <div className="flex items-center space-x-2 min-h-[32px]">
            <button
              onClick={() => setIsPlayingTimeAnimation(!isPlayingTimeAnimation)}
              className="p-1.5 sm:p-2 rounded bg-[#00ffaa] text-[#0b0c0d] hover:bg-[#00ffaa]/90 transition-colors shrink-0 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center active:scale-95"
              title={isPlayingTimeAnimation ? 'Pause Seasonal Playback' : 'Play Seasonal Flyway Motion'}
            >
              {isPlayingTimeAnimation ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>
            <span className="text-xs font-mono-code text-[#edeeef]/80 uppercase tracking-wider">
              Month: <span className="text-[#00ffaa] font-bold">{months[timePlaybackMonthIndex]}</span>
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[10px] font-mono-code text-[#edeeef]/50 uppercase">
            <span className="hidden sm:inline">Seasonal Flyway Motion</span>
            <button
              onClick={() => setTimePlaybackMonthIndex(4)}
              className="hover:text-[#00ffaa] transition-colors flex items-center space-x-1 p-1 cursor-pointer min-h-[32px]"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Timeline Range Slider */}
        <div className="flex items-center space-x-2 py-1">
          <input
            type="range"
            min={0}
            max={11}
            value={timePlaybackMonthIndex}
            onChange={(e) => setTimePlaybackMonthIndex(Number(e.target.value))}
            className="w-full h-2.5 bg-[rgba(237,238,239,0.15)] rounded-lg appearance-none cursor-pointer accent-[#00ffaa]"
          />
        </div>

        {/* Month Labels */}
        <div className="flex justify-between text-[9px] sm:text-[10px] text-[#edeeef]/40 font-mono-code mt-0.5 overflow-x-auto gap-0.5">
          {months.map((m, idx) => (
            <span
              key={m}
              onClick={() => setTimePlaybackMonthIndex(idx)}
              className={`cursor-pointer px-1 py-0.5 transition-colors rounded ${idx === timePlaybackMonthIndex ? 'text-[#00ffaa] font-bold underline bg-[#00ffaa]/10' : 'hover:text-[#edeeef]'}`}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
