import React, { useState, useEffect } from 'react';
import { ConquestNode, AFLClub, TeamHub, SocialEventZone, PlayerCard, AFL_CLUBS, MCG_COORDINATES } from '../types';
import { getDistanceInMeters, generateWildPlayer } from '../utils';
import { MapPin, Navigation, Trophy, HelpCircle, Gift, ShieldAlert, Sparkles, Footprints, Target, Compass, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MapArenaProps {
  userClub: AFLClub;
  userPosition: { latitude: number; longitude: number };
  onMoveTo: (lat: number, lon: number) => void;
  nodes: ConquestNode[];
  onAttackNode: (node: ConquestNode) => void;
  inventory: { wakeUpSessions: number };
  onAddWakeUpSession: (count: number) => void;
  cards: PlayerCard[];
  onCaptureWildPlayer: (player: PlayerCard, hasItemDrop: boolean) => void;
  socialEventActive: boolean;
}

// Fixed positions of Team Hubs and Grassroots Events
const TEAM_HUBS: TeamHub[] = [
  { id: 'collywood-hq', name: 'AIA Vitality Centre (Collingwood HQ)', clubId: 'collingwood', latitude: -37.8242, longitude: 144.9818 },
  { id: 'brisbane-hq', name: 'Brighton Homes Arena (Lions HQ)', clubId: 'brisbane', latitude: -37.8150, longitude: 144.9910 },
  { id: 'carlton-hq', name: 'Ikon Park (Carlton HQ)', clubId: 'carlton', latitude: -37.7842, longitude: 144.9610 }
];

export default function MapArena({
  userClub,
  userPosition,
  onMoveTo,
  nodes,
  onAttackNode,
  inventory,
  onAddWakeUpSession,
  cards,
  onCaptureWildPlayer,
  socialEventActive
}: MapArenaProps) {
  const [selectedNode, setSelectedNode] = useState<ConquestNode | null>(null);
  const [activeTab, setActiveTab] = useState<'RADAR' | 'LEGENDS' | 'INFO'>('RADAR');
  const [lastCheckIn, setLastCheckIn] = useState<{ [hubId: string]: number }>({});
  const [checkInCountdown, setCheckInCountdown] = useState<{ [hubId: string]: number }>({});
  
  // Stochastic Wild Spawns State
  const [wildSpawns, setWildSpawns] = useState<({ card: PlayerCard; lat: number; lon: number; id: string })[]>([]);

  // Ticker Calculations
  const [tickerStats, setTickerStats] = useState<{ [clubId: string]: number }>({});

  useEffect(() => {
    // Generate occupancies
    const stats: { [clubId: string]: number } = {};
    let totalOwned = 0;
    nodes.forEach(node => {
      if (node.ownerClubId) {
        stats[node.ownerClubId] = (stats[node.ownerClubId] || 0) + 1;
        totalOwned++;
      }
    });
    // Convert to percentage of MCG gates
    const percentages: { [clubId: string]: number } = {};
    AFL_CLUBS.forEach(c => {
      const count = stats[c.id] || 0;
      percentages[c.id] = Math.round((count / nodes.length) * 100);
    });
    setTickerStats(percentages);
  }, [nodes]);

  // Timers countdown for Team Hub check-ins
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const updatedCountdowns: { [hubId: string]: number } = {};

      TEAM_HUBS.forEach(hub => {
        const lastCheckedStamp = lastCheckIn[hub.id] || 0;
        const cooldown = 600000; // 10 minutes in milliseconds
        const elapsed = now - lastCheckedStamp;
        if (elapsed < cooldown) {
          updatedCountdowns[hub.id] = Math.ceil((cooldown - elapsed) / 1000);
        }
      });
      setCheckInCountdown(updatedCountdowns);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastCheckIn]);

  // Generate Wild neutral card spawns around the stadium area
  const regenerateWildSpawns = () => {
    const spawnsCount = socialEventActive ? 8 : 4; // 3x to 5x spawn density spike during authorized grassroots social events
    const generated: typeof wildSpawns = [];
    
    // Spread evenly around the MCG center coordinates
    for (let i = 0; i < spawnsCount; i++) {
      const angle = (i * Math.PI * 2) / spawnsCount + (Math.random() - 0.5) * 0.4;
      const distOffset = 0.0004 + Math.random() * 0.0009; // spread in distance degrees to cluster around stadium gates beautifully
      
      const wildCard = generateWildPlayer(socialEventActive); // social events spawn variant drops easily
      generated.push({
        id: `spawn_${i}_${Date.now()}`,
        card: wildCard,
        lat: MCG_COORDINATES.latitude + Math.sin(angle) * distOffset,
        lon: MCG_COORDINATES.longitude + Math.cos(angle) * distOffset
      });
    }
    setWildSpawns(generated);
  };

  useEffect(() => {
    regenerateWildSpawns();
  }, [socialEventActive]);

  // GPS Simulation trigger locations
  const handleTeleport = (lat: number, lon: number, nodeTitle: string) => {
    onMoveTo(lat, lon);
  };

  // Check in to Training Hub with deterministic passive GPS geofencing
  const handleHubCheckIn = (hub: TeamHub) => {
    const distance = getDistanceInMeters(userPosition.latitude, userPosition.longitude, hub.latitude, hub.longitude);
    
    if (distance > 100) {
      alert(`Out of Range! You are ${Math.round(distance)} meters away. Step inside the 100m geofence radius.`);
      return;
    }

    if (checkInCountdown[hub.id]) {
      alert(`LOCKED! Restocked recently. Check back in when cooldown expired.`);
      return;
    }

    // Yield items with defensive limits of 50
    if (inventory.wakeUpSessions >= 50) {
      alert(`Inventory full! Your Wake Up Sessions limits are capped at 50 max.`);
      return;
    }

    const itemsAwarded = Math.min(3, 50 - inventory.wakeUpSessions);
    onAddWakeUpSession(itemsAwarded);
    
    setLastCheckIn(prev => ({
      ...prev,
      [hub.id]: Date.now()
    }));

    alert(`🏆 CHECKED IN! Branded package from ${hub.name} delivered. Earned ${itemsAwarded} Wake Up Session items.`);
  };

  // Catch Wild player neutrals
  const handleCaptureSpawn = (spawnId: string, player: PlayerCard) => {
    // Check range closer (within 100m)
    const spawnObj = wildSpawns.find(s => s.id === spawnId);
    if (!spawnObj) return;

    const distance = getDistanceInMeters(userPosition.latitude, userPosition.longitude, spawnObj.lat, spawnObj.lon);
    if (distance > 120) {
      alert(`Too far to initiate capture! Target is ${Math.round(distance)}m away. Move closer!`);
      return;
    }

    // Catch gives a random 15-30% drop chance for items
    const isLootDropped = Math.random() < 0.25; 
    let lootNotice = '';
    if (isLootDropped) {
      if (inventory.wakeUpSessions < 50) {
        onAddWakeUpSession(1);
        lootNotice = ' +1 Wake Up Session Item dropped!';
      } else {
        lootNotice = ' (Inventory full, item missed)';
      }
    }

    onCaptureWildPlayer(player, isLootDropped);
    setWildSpawns(prev => prev.filter(s => s.id !== spawnId));
    alert(`🎯 CAPTURED! Added ${player.name} (${player.tier}) to your Squad Locker.${lootNotice}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-zinc-900 p-6 rounded-xl border border-white/10 text-stone-200">
      
      {/* LEFT COLUMN: Controls / Status HUD */}
      <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
        <div>
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
            <Compass className="h-5 w-5 text-yellow-500 animate-spin" />
            <div>
              <h2 className="text-lg font-black uppercase text-white tracking-wider">AR Radar HUD</h2>
              <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-mono">GPS SPATIAL SPECTRUM SIMULATOR</span>
            </div>
          </div>

          {/* Active Club Team Banner info */}
          <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">FACTION CONSTR CONVEYOR</span>
                <h4 className="text-base font-black uppercase text-white tracking-tight">{userClub.name} {userClub.mascot}</h4>
              </div>
              <div className="h-10 w-10 rounded flex items-center justify-center font-black text-xs shadow-md border border-white/10" style={{ backgroundColor: userClub.colors.primary, color: userClub.colors.secondary }}>
                AFL
              </div>
            </div>
          </div>

          {/* Ticker percentage status dashboard (STADIUM DOMINANCE) */}
          <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 space-y-3 mb-4">
            <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" />
              CONQUEST DOMINANCE SPLIT
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              {AFL_CLUBS.slice(0, 4).map(club => (
                <div key={club.id} className="p-2 rounded bg-zinc-900 border border-white/5 text-center">
                  <span className="text-[9px] text-zinc-500 font-mono block truncate uppercase">{club.name.substring(0,3)}</span>
                  <span className="text-xs font-black font-mono text-white" style={{ color: club.colors.primary === '#000000' ? '#ffffff' : club.colors.primary }}>
                    {tickerStats[club.id] || 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Location Simulator Joysticks (Premium GPS movement controls for sandboxed environment) */}
          <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                <Footprints className="h-4 w-4 text-yellow-500" />
                GPS Spatial Simulator
              </h4>
              <span className="text-[9px] text-yellow-500 font-mono font-bold bg-yellow-950/40 px-2 py-0.5 rounded border border-yellow-500/20">GRID LOC: ACTIVE</span>
            </div>
            
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              Simulate high-velocity displacement around stadium lawns, checkpoints, or active training facilities to trigger geofences.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTeleport(MCG_COORDINATES.latitude, MCG_COORDINATES.longitude, 'MCG Center')}
                className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded border border-white/5 text-[10px] font-black uppercase text-stone-200 tracking-wider transition-colors"
              >
                Center Arena
              </button>
              <button
                onClick={() => handleTeleport(-37.82085, 144.9840, 'MCG Gate 3')}
                className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded border border-white/5 text-[10px] font-black uppercase text-stone-200 tracking-wider transition-colors"
              >
                Approach Gate 3
              </button>
              <button
                onClick={() => handleTeleport(-37.8242, 144.9818, 'Collingwood HQ')}
                className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded border border-white/5 text-[10px] font-black uppercase text-stone-200 tracking-wider transition-colors"
              >
                AIA HQ Oval
              </button>
              <button
                onClick={() => handleTeleport(-37.8150, 144.9910, 'Lions HQ')}
                className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded border border-white/5 text-[10px] font-black uppercase text-stone-200 tracking-wider transition-colors"
              >
                Punt Rd Oval
              </button>
            </div>

            {/* fine position adjusting */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[10px] text-zinc-500 font-mono block uppercase tracking-wider">fine adjust GPS latitudes:</span>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="range"
                    min="-37.825"
                    max="-37.815"
                    step="0.0001"
                    value={userPosition.latitude}
                    onChange={(e) => onMoveTo(parseFloat(e.target.value), userPosition.longitude)}
                    className="w-full accent-yellow-500 cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="range"
                    min="144.978"
                    max="144.992"
                    step="0.0001"
                    value={userPosition.longitude}
                    onChange={(e) => onMoveTo(userPosition.latitude, parseFloat(e.target.value))}
                    className="w-full accent-yellow-500 cursor-pointer"
                  />
                </div>
              </div>
              <div className="text-[10px] text-center text-zinc-400 font-mono">
                LAT: {userPosition.latitude.toFixed(5)} • LON: {userPosition.longitude.toFixed(5)}
              </div>
            </div>
          </div>
        </div>

        {/* Console logs */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-yellow-500 space-y-1">
          <div>&gt; GPS stream established successfully...</div>
          <div>&gt; Nodes online: 10 geofenced gates...</div>
          <div>&gt; Active events check: {socialEventActive ? 'GRASSROOTS OVAL SPARK ACTIVE (5x density)' : 'Standard loop'}</div>
          {wildSpawns.length > 0 && (
            <div className="text-green-400 font-bold">&gt; Spawns: {wildSpawns.length} wild player cards detected!</div>
          )}
        </div>
      </div>

      {/* CENTER COLUMN: Radar Vector Grid Map (A AR inspired HUD) */}
      <div className="lg:col-span-5 flex flex-col justify-between">
        
        {/* Navigation sub-tabs */}
        <div className="flex bg-zinc-950/60 p-1.5 rounded-lg border border-white/5 gap-2 mb-4">
          <button
            onClick={() => setActiveTab('RADAR')}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded transition-all cursor-pointer ${
              activeTab === 'RADAR' ? 'bg-zinc-805 bg-zinc-800 text-yellow-500 shadow-md font-extrabold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Radar Spectrum Grid
          </button>
          <button
            onClick={() => setActiveTab('LEGENDS')}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded transition-all cursor-pointer ${
              activeTab === 'LEGENDS' ? 'bg-zinc-805 bg-zinc-800 text-yellow-500 shadow-md font-extrabold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Team Hub Check-In
          </button>
        </div>

        {activeTab === 'RADAR' && (() => {
          // Calculate Stadium live status (Neutral, Contested, Under Lock)
          const ownedNodes = nodes.filter(n => n.ownerClubId !== null);
          let stadiumStatus: 'Neutral' | 'Contested' | 'Under Lock' = 'Neutral';

          if (ownedNodes.length === 0) {
            stadiumStatus = 'Neutral';
          } else {
            const firstOwner = ownedNodes[0].ownerClubId;
            const allOwnedBySame = ownedNodes.every(n => n.ownerClubId === firstOwner);
            if (ownedNodes.length === nodes.length && allOwnedBySame) {
              stadiumStatus = 'Under Lock';
            } else {
              stadiumStatus = 'Contested';
            }
          }

          const getStatusStyles = () => {
            switch (stadiumStatus) {
              case 'Neutral':
                return {
                  text: 'text-amber-400',
                  bg: 'bg-amber-950/50 border-amber-500/30',
                  glow: 'shadow-[0_0_30px_rgba(245,158,11,0.25)] border-amber-500/30',
                  badgeText: 'NEUTRAL GROUND',
                  dot: 'bg-amber-500',
                  pulse: 'bg-amber-500/40 animate-ping'
                };
              case 'Under Lock':
                return {
                  text: 'text-emerald-400 border-emerald-500/35',
                  bg: 'bg-emerald-950/50 border-emerald-500/30',
                  glow: 'shadow-[0_0_35px_rgba(16,185,129,0.35)] border-emerald-500/40',
                  badgeText: 'STADIUM UNDER LOCK',
                  dot: 'bg-emerald-400',
                  pulse: 'bg-emerald-400/30 animate-ping'
                };
              case 'Contested':
              default:
                return {
                  text: 'text-red-400 border-red-500/35',
                  bg: 'bg-red-950/50 border-red-500/30',
                  glow: 'shadow-[0_0_40px_rgba(239,68,68,0.4)] border-red-500/40',
                  badgeText: 'CONTESTED ARENA',
                  dot: 'bg-red-500',
                  pulse: 'bg-red-500/40 animate-ping'
                };
            }
          };

          const statusStyles = getStatusStyles();

          // Determine if player has simulated away from the MCG venue (threshold set at 400m)
          const distanceToMCG = getDistanceInMeters(userPosition.latitude, userPosition.longitude, MCG_COORDINATES.latitude, MCG_COORDINATES.longitude);
          const isAroundVenue = distanceToMCG <= 400;

          return (
            <div className="space-y-4">
            
            {/* Real vector compass map card / Selected Div targeted dynamically */}
            <div 
              className={`relative w-full aspect-square bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#09090b_100%)] border rounded-xl overflow-hidden flex flex-col items-center justify-center p-3 transition-all duration-700 ${statusStyles.glow}`}
            >
              
              {/* Floating Dynamic Status Indicator Badge */}
              <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between z-30 select-none">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${statusStyles.bg} ${statusStyles.text}`}>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusStyles.pulse}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${statusStyles.dot}`} />
                  </span>
                  {statusStyles.badgeText}
                </div>
                
                <div className="text-[9px] text-zinc-400 font-mono bg-zinc-950/75 px-2 bg-opacity-70 py-1 rounded border border-white/5 uppercase font-bold tracking-tight">
                  {isAroundVenue ? '🏟️ Vibe: Active Zone' : '🗺️ Away: Tactical Grid'}
                </div>
              </div>

              {isAroundVenue ? (
                <div className="relative w-full h-full flex items-center justify-center pt-8">
              
              {/* Radar Sweeper concentric rings */}
              <div className="absolute inset-0 border border-emerald-950/20 rounded-full scale-75 animate-pulse pointer-events-none" />
              <div className="absolute inset-0 border border-emerald-950/10 rounded-full scale-50 pointer-events-none" />
              
              {/* Crosshair grids */}
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-emerald-950/20 pointer-events-none" />
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-emerald-950/20 pointer-events-none" />

              {/* Geographic Legend Compass Scale */}
              <div className="absolute inset-2 border border-emerald-950/30 rounded-full pointer-events-none flex items-start justify-center pt-1 text-[8px] text-zinc-600 font-mono">
                NORTH (MCG PARADE)
              </div>

              {/* 1. Draw MCG Stadium massive center circle */}
              <div className="absolute w-44 h-44 rounded-full bg-[#112a1f]/35 border-4 border-emerald-900/50 flex flex-col items-center justify-center shadow-inner pointer-events-none">
                <span className="text-[11px] font-black tracking-widest text-[#245e46] font-mono">MCG ARENA</span>
                <span className="text-[8px] font-bold text-[#1a4433] font-mono">STADIUM GRID</span>
              </div>

              {/* Visualized GIS coordinate conversion logic:
                  MCG Center is (-37.81997, 144.98344)
                  Calculate pixel scale offset x, y based on user coordinates.
                  We want map bounds representing [-37.825, -37.815] latitude
                  and [144.978, 144.992] longitude.
              */}
              {(() => {
                const mapWidth = 330;
                const mapHeight = 330;
                // Bounds mapping functions
                const getCoords = (lat: number, lon: number) => {
                  const latCenter = MCG_COORDINATES.latitude;
                  const lonCenter = MCG_COORDINATES.longitude;

                  // scale factor (zoom degree multipliers) - widely spread out to resolve cramped layout
                  const latScale = 110000; 
                  const lonScale = 85000;

                  const dx = (lon - lonCenter) * lonScale;
                  const dy = (latCenter - lat) * latScale; // invert latitude y-axis

                  const x = (mapWidth / 2) + dx;
                  const y = (mapHeight / 2) + dy;
                  return { x, y };
                };

                const userPos = getCoords(userPosition.latitude, userPosition.longitude);

                return (
                  <>
                    {/* SVG canvas overlays for geofence circles and pathways */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {/* geofence 30-50m buffer lines for Gate Nodes */}
                      {nodes.map(node => {
                        const nod = getCoords(node.latitude, node.longitude);
                        return (
                          <g key={`gfx-${node.id}`}>
                            {/* geofence ring representing interaction boundary lawns */}
                            <circle
                              cx={nod.x}
                              cy={nod.y}
                              r={16}
                              fill="rgba(34, 197, 94, 0.04)"
                              stroke={selectedNode?.id === node.id ? '#2dfb84' : 'rgba(34, 197, 94, 0.15)'}
                              strokeWidth={1}
                              className={selectedNode?.id === node.id ? 'animate-pulse' : ''}
                            />
                            {/* Line from User to Selected Node for navigation assistance */}
                            {selectedNode?.id === node.id && (
                              <line
                                x1={userPos.x}
                                y1={userPos.y}
                                x2={nod.x}
                                y2={nod.y}
                                stroke="#facc15"
                                strokeWidth={1}
                                strokeDasharray="3,3"
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* Nodes map markers rendering */}
                    {nodes.map(node => {
                      const pos = getCoords(node.latitude, node.longitude);
                      const ownerClub = AFL_CLUBS.find(c => c.id === node.ownerClubId);
                      
                      return (
                        <div
                          key={node.id}
                          style={{ left: pos.x - 10, top: pos.y - 12 }}
                          onClick={() => setSelectedNode(node)}
                          className="absolute group z-10 cursor-pointer"
                        >
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center shadow-lg border transition-all ${
                            selectedNode?.id === node.id ? 'scale-125 border-yellow-400 ring-2 ring-yellow-400/50' : 'border-neutral-800'
                          }`}
                          style={{
                            backgroundColor: ownerClub ? ownerClub.colors.primary : '#1c1917',
                            color: ownerClub ? ownerClub.colors.secondary : '#a8a29e'
                          }}>
                            <span className="text-[8px] font-black">{node.gateNumber}</span>
                          </div>
                          
                          {/* Floating name tag */}
                          <span className="hidden group-hover:block absolute left-full ml-1 top-0 bg-black/95 text-stone-200 border border-neutral-800 rounded px-1.5 py-0.5 text-[8px] font-bold whitespace-nowrap z-30">
                            G{node.gateNumber} {ownerClub ? ownerClub.name : 'Neutral'}
                          </span>
                        </div>
                      );
                    })}

                    {/* Team Hub check-in facilities */}
                    {TEAM_HUBS.map(hub => {
                      const pos = getCoords(hub.latitude, hub.longitude);
                      const club = AFL_CLUBS.find(c => c.id === hub.clubId);

                      return (
                        <div
                          key={hub.id}
                          style={{ left: pos.x - 10, top: pos.y - 10 }}
                          className="absolute z-10 cursor-pointer"
                        >
                          <div className="h-[18px] w-[18px] rotating rounded-md rotate-45 border border-amber-500 bg-amber-950/80 flex items-center justify-center shadow-md shadow-amber-950/30">
                            <Gift className="h-2.5 w-2.5 -rotate-45 text-amber-400" />
                          </div>
                        </div>
                      );
                    })}

                    {/* Wild Spawns Rendering */}
                    {wildSpawns.map(spawn => {
                      const pos = getCoords(spawn.lat, spawn.lon);
                      return (
                        <div
                          key={spawn.id}
                          style={{ left: pos.x - 12, top: pos.y - 12 }}
                          onClick={() => handleCaptureSpawn(spawn.id, spawn.card)}
                          className="absolute group bg-slate-900 border border-white/25 rounded-md hover:border-yellow-400 px-1.5 py-1 z-20 cursor-pointer text-center shadow-md animate-bounce"
                        >
                          <div className="text-[7.5px] font-mono font-black text-center text-yellow-300">
                            {spawn.card.tier}
                          </div>
                          <div className="text-[7px] text-white truncate max-w-[34px]">
                            {spawn.card.name.split(' ')[0]}
                          </div>
                        </div>
                      );
                    })}

                    {/* Active User GPS Location pin */}
                    <div
                      style={{ left: userPos.x - 10, top: userPos.y - 10 }}
                      className="absolute z-20 w-5 h-5 flex items-center justify-center pointer-events-none"
                    >
                      <div className="absolute w-8 h-8 rounded-full bg-emerald-400/20 animate-ping" />
                      <div className="h-3 w-3 bg-emerald-400 border-2 border-white rounded-full shadow-md" />
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            /* High Fidelity Tactical Table View of Stadium Gates when user is far away */
            <div className="w-full h-full flex flex-col justify-between pt-12 text-left">
              <div className="p-2 border border-white/10 bg-zinc-950/80 rounded-lg text-[10px] text-stone-300 font-mono flex items-center justify-between mb-2 select-none">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse font-mono"></span>
                  Tactical gate data stream
                </span>
                <span className="text-yellow-500 font-extrabold text-[9px] uppercase tracking-wide">Warping Available</span>
              </div>

              <div className="flex-grow overflow-y-auto pr-1 space-y-2 max-h-[290px] w-full scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                <table className="w-full text-left border-collapse text-[10px] font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-500 uppercase text-[8px] tracking-wider font-sans">
                      <th className="pb-1.5 px-2 font-bold">Gate Portal</th>
                      <th className="pb-1.5 px-2 font-bold">Owner</th>
                      <th className="pb-1.5 px-2 font-bold text-center">Distance</th>
                      <th className="pb-1.5 px-2 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {nodes.map(node => {
                      const distanceToGate = getDistanceInMeters(userPosition.latitude, userPosition.longitude, node.latitude, node.longitude);
                      const ownerClub = AFL_CLUBS.find(c => c.id === node.ownerClubId);

                      return (
                        <tr 
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`group hover:bg-white/5 cursor-pointer transition-all duration-150 ${selectedNode?.id === node.id ? 'bg-zinc-800/40 text-yellow-400' : 'text-stone-300'}`}
                        >
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-1.5 font-sans">
                              <span 
                                className="w-4 h-4 rounded-full flex items-center justify-center font-black text-[9px] border shadow-sm font-mono"
                                style={{
                                  backgroundColor: ownerClub ? ownerClub.colors.primary : '#1c1917',
                                  color: ownerClub ? ownerClub.colors.secondary : '#e2e2e2',
                                  borderColor: ownerClub ? ownerClub.colors.primary : '#333'
                                }}
                              >
                                {node.gateNumber}
                              </span>
                              <span className="font-bold truncate max-w-[85px] text-white group-hover:text-yellow-500 transition-colors font-sans">
                                {node.name.replace('MCG Gate ', 'Gate ')}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <span 
                              className="text-[9px] font-black uppercase tracking-tight font-sans"
                              style={{ color: ownerClub ? (ownerClub.colors.primary === '#000000' ? '#ffffff' : ownerClub.colors.primary) : '#777' }}
                            >
                              {ownerClub ? ownerClub.name.substring(0, 10).toUpperCase() : 'NEUTRAL'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center text-zinc-400 font-mono">
                            {Math.round(distanceToGate)}m
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTeleport(node.latitude, node.longitude, node.name);
                                setSelectedNode(node);
                              }}
                              className="px-2 py-0.5 bg-yellow-500 hover:bg-yellow-450 active:scale-95 text-black font-semibold uppercase text-[8px] rounded transition-all tracking-wider font-sans"
                            >
                              Warp
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

            {/* Quick Helper caption */}
            <div className="flex justify-between items-center bg-slate-900/60 p-2 px-3 rounded-lg border border-neutral-800 text-[10px] text-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-600 rotate-45 border border-amber-400 inline-block" /> Team restock Hubs (Items)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-800 border border-stone-500 inline-block text-center text-[7px] leading-3 text-stone-300">G</span> MCG Gates nodes
              </span>
              <span className="flex items-center gap-1.5 bg-yellow-950/20 px-2 py-0.5 rounded border border-yellow-500/10 text-yellow-500">
                <Sparkles className="h-3 w-3 inline" /> Wild card Spawns
              </span>
            </div>
            
          </div>
        );
      })()}

        {activeTab === 'LEGENDS' && (
          <div className="space-y-3 animate-fade-in">
            <h3 className="text-xs font-black text-yellow-500 uppercase tracking-widest">AFL Facility Hub Check-In</h3>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              Authorized training grounds act as consumable replenishment locations. Stand inside the geofence perimeter to claim loot.
            </p>

            <div className="space-y-3">
              {TEAM_HUBS.map(hub => {
                const distance = getDistanceInMeters(userPosition.latitude, userPosition.longitude, hub.latitude, hub.longitude);
                const isWithinRange = distance <= 100;
                const cooldownSeconds = checkInCountdown[hub.id];

                return (
                  <div key={hub.id} className="bg-zinc-950 border border-white/5 rounded-xl p-4 flex justify-between items-center transition-all hover:border-white/10">
                    <div>
                      <h4 className="text-sm font-black text-white italic uppercase tracking-tight">{hub.name}</h4>
                      <p className="text-xs text-zinc-400 mt-1.5 flex items-center gap-1.5 font-mono">
                        <MapPin className="h-3.5 w-3.5 text-red-500" />
                        Radius: <span className={isWithinRange ? 'text-green-400 font-bold' : 'text-zinc-500'}>{Math.round(distance)}m</span>
                        {isWithinRange && <span className="text-emerald-400 font-bold">• Geofenced Portals</span>}
                      </p>
                    </div>

                    <div>
                      {cooldownSeconds ? (
                        <button disabled className="px-4 py-2 bg-zinc-900 border border-white/5 text-zinc-650 text-zinc-500 rounded text-xs font-black w-32 font-mono">
                          COOLDOWN: {Math.floor(cooldownSeconds / 60)}M
                        </button>
                      ) : (
                        <button
                          onClick={() => handleHubCheckIn(hub)}
                          className={`px-4 py-2 rounded text-xs font-black uppercase w-32 tracking-wider transition-all cursor-pointer ${
                            isWithinRange ? 'bg-yellow-500 text-black hover:bg-yellow-400 hover:scale-[1.02]' : 'bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed'
                          }`}
                        >
                          RESTOCK LIST
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* RIGHT COLUMN: Active Node details (Selected MCG Gate details and conquer initiating) */}
      <div className="lg:col-span-3 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 space-y-3 shadow-xl">
            <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Target className="h-4 w-4" />
              MCG GATE CONQUEST FEED
            </h4>

            {selectedNode ? (
              (() => {
                const distance = getDistanceInMeters(userPosition.latitude, userPosition.longitude, selectedNode.latitude, selectedNode.longitude);
                const isGeofenced = distance <= 50; // 30m - 50m active interaction radius
                const ownerClub = AFL_CLUBS.find(c => c.id === selectedNode.ownerClubId);

                return (
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-black text-white italic uppercase tracking-tight">{selectedNode.name}</h3>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">MCG Perimeter Portal Gate #{selectedNode.gateNumber}</p>
                    </div>

                    <div className="p-3 rounded bg-zinc-900 text-xs space-y-2 border border-white/5 leading-relaxed font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">OWNER FACTION:</span>
                        <span className="font-bold text-white uppercase font-black" style={{ color: ownerClub?.colors.primary }}>
                          {ownerClub ? `${ownerClub.name}` : 'NEUTRAL'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">DEFENDER HERO:</span>
                        <span className="text-white font-bold">{selectedNode.conqueringUsername || 'NONE'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">VECTOR GAP:</span>
                        <span className={`font-bold ${isGeofenced ? 'text-green- green-400' : 'text-zinc-300'}`}>
                          {Math.round(distance)}M
                        </span>
                      </div>
                    </div>

                    {/* Geofence Alert Check */}
                    {isGeofenced ? (
                      <div className="bg-emerald-950/20 border border-green-500/20 rounded p-3 text-center text-green-400 text-xs font-mono leading-relaxed">
                        ✔ Inside the {Math.round(selectedNode.gateNumber % 2 === 0 ? 30 : 50)}m interactive buffer zone. GPS drift neutralized. Ready for conflict initiation.
                      </div>
                    ) : (
                      <div className="bg-red-950/20 border border-red-500/20 rounded p-4 text-center space-y-2">
                        <p className="text-red-400 text-xs leading-dense font-mono">
                          ❌ OUT OF GEOFENCE BOUNDS! Approach close to stadium gate to fight.
                        </p>
                        <button
                          onClick={() => handleTeleport(selectedNode.latitude, selectedNode.longitude, selectedNode.name)}
                          className="px-3 py-1 bg-zinc-900 border border-white/10 hover:border-yellow-500 hover:bg-zinc-850 rounded text-[10px] font-black uppercase text-stone-200 mt-1 transition-all tracking-wider"
                        >
                          Simulate Travel
                        </button>
                      </div>
                    )}

                    {/* Conquest triggers */}
                    {isGeofenced && (
                      <button
                        onClick={() => onAttackNode(selectedNode)}
                        className="w-full bg-gradient-to-r from-red-600 to-blue-800 hover:from-red-500 hover:to-blue-700 text-white text-xs font-black py-3 rounded uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] border border-yellow-500/20"
                      >
                        <Zap className="h-4 w-4 inline mr-1" />
                        INITIATE GAUNTLET CHALLENGE
                      </button>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-6 text-zinc-500 text-xs leading-relaxed font-mono uppercase text-[10px]">
                Tap any highlighted Gate node (numbers 1-10) around the MC-Stadium lawn map overlay to inspect guard roster databases.
              </div>
            )}
          </div>

          <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 space-y-2 font-mono text-[11px] text-zinc-400 shadow-lg">
            <span className="text-xs font-black text-white uppercase font-sans flex items-center gap-1.5 tracking-wider">
              <ShieldAlert className="h-4 w-4 text-red-500 animate-pulse" />
              CONQUEST LAWS
            </span>
            <p className="leading-relaxed">
              No partial progress is backed. Secure a consecutive <strong className="text-yellow-500 font-extrabold">10-0 gauntlet win streak</strong> to capture territories. When won, the Gate flipped colors to <strong className="text-yellow-400">{userClub.name}</strong> instantly!
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
