import React, { useState } from 'react';
import { AFLClub, AFL_CLUBS, PlayerCard } from '../types';
import { Film, ArrowLeft, ArrowRight, CheckCircle, Smartphone, MapPin, ShieldAlert, Sparkles, Trophy, Play, Heart, Star, Compass, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LivePitchProps {
  userClub: AFLClub | null;
  onSelectClub: (clubId: string) => void;
  cards: PlayerCard[];
  onAddWakeUpSession: (count: number) => void;
  onTriggerConquestWin: () => void;
}

export default function LivePitch({
  userClub,
  onSelectClub,
  cards,
  onAddWakeUpSession,
  onTriggerConquestWin
}: LivePitchProps) {
  const [currentScene, setCurrentScene] = useState<number>(0);
  const [sceneInteractiveState, setSceneInteractiveState] = useState<string>('IDLE');
  const [pitchKicks, setPitchKicks] = useState<number>(0);

  // Scenes matching the user's spec exactly
  const scenes = [
    {
      title: 'SCENE 1: THE SIGN-UP & THE AWAY LOOP',
      narrative: `Start on a rainy Tuesday evening in the suburbs. You open the app and make your permanent choice: you select your AFL club, locking in your team colors forever. There is no turning back; you are bound to your faction. Cut to the core "Away Loop" on your phone. You encounter a wild player card spawning on your couch—a Silver-tier asset. The game transitions to a 3D canvas tracking a "Flick-to-Kick" mechanic. You swipe your finger across the glass, executing a sharp, curved checkside kick toward virtual goalposts superimposed over your living room wall. A dynamic wind vector indicator shows a heavy crosswind, but your player's high Finesse trait allows the ball to bend seamlessly through the center of the big sticks. Text overlays flash: "GOAL! +15 Skill XP." You are training your squad during the week, preparing them for war on the weekend.`,
      actionLabel: 'Pledge Club Faction & Train',
      interactiveType: 'CLUB_PLEDGE'
    },
    {
      title: 'SCENE 2: THE TEAM HUB RESTOCK',
      narrative: `Transition to Thursday morning at an authorized AFL Training Facility. You are walking past the club's training oval. Your phone vibrates via passive GPS geofencing as you step into the 100-meter facility radius. You tap "Check-In" on a sleek, branded UI interface. A 10-minute countdown clock begins ticking down, and a 3D loot bundle bursts open on your screen, awarding you 3 rare "Wake Up Session" consumable items. You see your inventory counter hit 42/50. You know these items are precious—they are the only fuel capable of saving your star players from the dreaded "Omitted" bench state once they fall in battle.`,
      actionLabel: 'Simulate Hub restock (+3 Wake Ups)',
      interactiveType: 'RESTOCK'
    },
    {
      title: 'SCENE 3: THE MATCH DAY GAUNTLET AT THE MCG',
      narrative: `Fast-forward to Saturday afternoon at the Melbourne Cricket Ground (MCG). A massive crowd of 90,000 roaring fans fills the concourse. The air is thick with anticipation. You stand on the stadium lawns, 40 meters away from Gate 3, safely inside a wide 30-50m virtual buffer zone that prevents crowd bottlenecks. You open the Match Day map overlay. Gate 3 is flashing a vibrant, hostile color—it is currently held by a rival club. You tap the gate node, instantly downloading the active 10-man defensive gauntlet.`,
      actionLabel: 'Inspect MCG Gate 3 Node',
      interactiveType: 'GAUNTLET_INSPECT'
    },
    {
      title: 'SCENE 4: THE ALL-OR-NOTHING CONQUEST',
      narrative: `You enter the gauntlet. It is a high-velocity, rapid-fire, sequential showdown. You face Slot 1, executing a snap goal in a single, clutch input. The defender falls. You slide into Slot 2, then Slot 3, your heart racing under the strict 5-minute failure lockout timer. One miss, and you are banned from trying again until the next quarter break. You reach Slot 10—the absolute Boss of the gate. The stadium crosswinds on your screen are brutal, but you call upon your max-stat Power forward. You execute a flawless, high-velocity swipe. The virtual footy punches straight through the heavy wind, splitting the middle goals.`,
      actionLabel: 'Enter Clutch Boss Battle (Kick Goal!)',
      interactiveType: 'BOSS_KICK'
    },
    {
      title: 'SCENE 5: TURNING THE STADIUM TEAM COLORS',
      narrative: `The moment the final goal registers, the server validates your win. You beat the race-condition—you were the first fan to finish the gauntlet. The screen flashes triumphantly. Instantly, the virtual overlay of MCG Gate 3 flips, erupting into your club's iconic colors and roaring mascot. Across the top of the app, the live global Stadium Dominance Ticker updates in real-time: your club has just taken a 60% majority stake of the venue's territory. Around you on the real-world lawns, other fans look up from their phones, cheering or groaning as they see the gate change color on their screens. Your 10 victorious players are now locked inside the gym nodes as the new defensive wall, while the previous defenders are sent back to their owners' phones, thoroughly "Omitted" and broken, waiting for a Wake Up Session. This is not just a game; it is digital territory warfare on holy sporting ground.`,
      actionLabel: 'Trigger Grand Arena Victory colors',
      interactiveType: 'CELEBRATE_FLIP'
    }
  ];

  const handleNext = () => {
    if (currentScene < scenes.length - 1) {
      setCurrentScene(prev => prev + 1);
      setSceneInteractiveState('IDLE');
    }
  };

  const handlePrev = () => {
    if (currentScene > 0) {
      setCurrentScene(prev => prev - 1);
      setSceneInteractiveState('IDLE');
    }
  };

  // Launch simulated mini-actions matching the walk-through script
  const executeInteractiveAction = (type: string) => {
    if (type === 'CLUB_PLEDGE') {
      setSceneInteractiveState('SELECT_CLUB');
    } else if (type === 'RESTOCK') {
      setSceneInteractiveState('LOADING');
      setTimeout(() => {
        onAddWakeUpSession(3);
        setSceneInteractiveState('RESTOCKED');
      }, 1200);
    } else if (type === 'GAUNTLET_INSPECT') {
      setSceneInteractiveState('GAUNTLET_SHOWN');
    } else if (type === 'BOSS_KICK') {
      setSceneInteractiveState('KICK_SWIPE_PREP');
    } else if (type === 'CELEBRATE_FLIP') {
      setSceneInteractiveState('CELEBRATING');
      onTriggerConquestWin();
    }
  };

  const handleBossKick = (success: boolean) => {
    if (success) {
      setSceneInteractiveState('BOSS_KICKED_GOAL');
      setPitchKicks(prev => prev + 1);
    } else {
      setSceneInteractiveState('BOSS_MISSED');
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-white/10 text-stone-200 overflow-hidden shadow-2xl">
      
      {/* Top Graphic cinematic backdrop bar */}
      <div className="bg-zinc-950 border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Film className="h-5 w-5 text-yellow-500 animate-pulse" />
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-wider">Cinematic Filmstrip Walkthrough</h2>
            <p className="text-[10px] text-zinc-500 font-mono">AR OVERLAY STAGE • AFL SCENARIO RUNNER</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-900 p-1.5 px-3 rounded border border-white/5">
          {scenes.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-none transition-all ${
                i === currentScene ? 'bg-yellow-500' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main timeline Split */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        
        {/* Narrator timeline commentary frame */}
        <div className="p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5 space-y-6 bg-zinc-900/40">
          <div className="space-y-4">
            <div className="inline-block">
              <span className="text-[9px] font-mono font-black text-yellow-500 uppercase tracking-widest bg-yellow-950/20 p-2 rounded border border-yellow-500/10">
                {scenes[currentScene].title}
              </span>
            </div>
            
            <p className="text-zinc-300 leading-relaxed text-sm md:text-base italic bg-zinc-950/50 border-l border-yellow-500 p-4 rounded font-mono whitespace-pre-line shadow-inner">
              "{scenes[currentScene].narrative}"
            </p>
          </div>

          <div className="flex justify-between items-center pt-2 gap-4">
            <button
              onClick={handlePrev}
              disabled={currentScene === 0}
              className="flex-1 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 disabled:hover:bg-zinc-950 border border-white/10 hover:border-zinc-500 rounded text-xs font-bold font-mono uppercase tracking-widest text-[#f3f4f6] disabled:opacity-20 cursor-pointer transition-all"
            >
              <ArrowLeft className="h-4 w-4 inline mr-1" />
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentScene === scenes.length - 1}
              className="flex-1 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 disabled:hover:bg-zinc-950 border border-white/10 hover:border-zinc-500 rounded text-xs font-bold font-mono uppercase tracking-widest text-[#f3f4f6] disabled:opacity-20 cursor-pointer transition-all"
            >
              Next
              <ArrowRight className="h-4 w-4 inline ml-1" />
            </button>
          </div>
        </div>

        {/* Live Simulator Interface Stage */}
        <div className="bg-zinc-950 p-6 flex flex-col justify-between items-center text-center">
          
          <div className="w-full max-w-[280px] bg-zinc-900 border-4 border-zinc-850 aspect-[9/16] rounded-[32px] overflow-hidden relative shadow-[0_0_25px_rgba(0,0,0,0.5)] flex flex-col justify-between p-4 bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/5">
            
            {/* Top Phone notch speaker */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-zinc-850 rounded-full flex items-center justify-center pointer-events-none z-20">
              <span className="w-6 h-1 bg-black rounded" />
            </div>

            {/* Simulated Live AR Dashboard screens */}
            <div className="h-full flex flex-col justify-between pt-6 pb-2 relative font-sans">
              
              {/* Scene content renders based on scenario state */}
              {sceneInteractiveState === 'IDLE' && (
                <div className="my-auto space-y-4 flex flex-col items-center p-3 animate-fade-in">
                  <Smartphone className="h-12 w-12 text-zinc-600 animate-pulse" />
                  <h4 className="text-[10px] font-black text-zinc-400 tracking-widest uppercase font-mono">AWAITING STIMULUS</h4>
                  <p className="text-[10.5px] text-zinc-500 leading-snug">
                    Tap the training action trigger below to simulate this segment of the onboarding route.
                  </p>
                </div>
              )}

              {/* CLUB CHOICE INTERACTIVE MOCK */}
              {sceneInteractiveState === 'SELECT_CLUB' && (
                <div className="my-auto space-y-3 animate-fade-in p-1">
                  <UserCheck className="h-10 w-10 text-yellow-500 mx-auto" />
                  <h4 className="text-[10px] font-black text-white uppercase text-center font-mono tracking-wider">FACTION REGISTRATION</h4>
                  <p className="text-[9px] text-zinc-400 text-center uppercase tracking-wider font-mono">Lock in your AFL Club faction:</p>
                  
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {AFL_CLUBS.slice(0, 4).map(club => {
                      const isSelected = userClub?.id === club.id;
                      return (
                        <button
                          key={club.id}
                          onClick={() => {
                            onSelectClub(club.id);
                            setSceneInteractiveState('CLUB_CHOOSEN_STAGE');
                          }}
                          className={`p-2 rounded text-[9px] font-black uppercase text-center cursor-pointer transition-all ${
                            isSelected ? 'ring-2 ring-yellow-500' : 'opacity-90 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: club.colors.primary, color: club.colors.secondary }}
                        >
                          {club.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {sceneInteractiveState === 'CLUB_CHOOSEN_STAGE' && (
                <div className="my-auto text-center space-y-4 p-4 animate-scale-up">
                  <div className="h-12 w-12 rounded-full mx-auto flex items-center justify-center font-bold" style={{ backgroundColor: userClub?.colors.primary, color: userClub?.colors.secondary }}>
                    AFL
                  </div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">FACTION SECURED!</h4>
                  <p className="text-[10px] text-yellow-400 font-bold bg-yellow-950/20 py-2 px-1 rounded border border-yellow-500/20 uppercase tracking-widest font-mono text-center">
                    {userClub?.name} selection hardcoded. Welcome, Faction General!
                  </p>
                </div>
              )}

              {/* RESTOCK LOOT ANIM */}
              {sceneInteractiveState === 'LOADING' && (
                <div className="my-auto space-y-3 animate-pulse">
                  <div className="h-10 w-10 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto animate-spin" />
                  <p className="text-[10px] text-yellow-500 font-mono uppercase tracking-widest">Validating geofencing...</p>
                </div>
              )}

              {sceneInteractiveState === 'RESTOCKED' && (
                <div className="my-auto p-4 space-y-3 animate-scale-up text-center bg-yellow-950/10 border border-yellow-500/20 rounded">
                  <Sparkles className="h-10 w-10 text-yellow-400 mx-auto" />
                  <h4 className="text-xs font-black text-yellow-400 uppercase tracking-widest font-mono">LOOT BURST</h4>
                  <p className="text-[10px] text-zinc-300 leading-relaxed font-mono">CHECKED IN @ FACILITY OVAL. OBTAINED 3 WAKE UP AMPOULES.</p>
                  <p className="text-[9px] text-zinc-500 font-mono">SUPPLY: +3 ADDED</p>
                </div>
              )}

              {/* GAUNTLET INSPECTION SANE */}
              {sceneInteractiveState === 'GAUNTLET_SHOWN' && (
                <div className="my-auto space-y-2 p-2 text-left bg-zinc-950 rounded border border-white/5">
                  <div className="text-center pb-1.5 border-b border-white/5">
                    <span className="text-[8px] font-mono text-zinc-500 block uppercase tracking-widest">MCG PORTAL AREA G3</span>
                    <span className="text-[10px] font-black text-red-500 uppercase font-mono tracking-widest">10-MAN SQUAD DETECTED</span>
                  </div>
                  
                  <div className="space-y-1 overflow-y-auto max-h-[160px] pr-1 scrollbar-none text-[9.5px] font-mono">
                    <div className="p-1 px-1.5 rounded bg-zinc-900 border border-white/5 flex justify-between">
                      <span className="text-red-400 font-mono">Slot 1: Full-forward</span>
                      <span className="text-zinc-500">LVL 12</span>
                    </div>
                    <div className="p-1 px-1.5 rounded bg-zinc-900 border border-white/5 flex justify-between">
                      <span className="text-red-400 font-mono">Slot 2: Ruck Rover</span>
                      <span className="text-zinc-500">LVL 15</span>
                    </div>
                    <div className="p-1 px-1.5 rounded bg-zinc-900/40 flex justify-between text-zinc-600 text-[8px]">
                      <span>[Slots 3-9 sequential guards]</span>
                    </div>
                    <div className="p-1 px-1.5 rounded bg-red-950/20 border border-red-500/20 flex justify-between font-bold">
                      <span className="text-yellow-500 uppercase font-bold">SLOT 10: RIVAL LEGEND</span>
                      <span className="text-red-500 font-mono font-black">BOSS</span>
                    </div>
                  </div>
                  <p className="text-[8px] text-zinc-500 text-center leading-dense pt-1 uppercase font-mono">
                    5-min lockout timer. Conquering all 10 flips the gate canopy.
                  </p>
                </div>
              )}

              {/* CLUTCH KICK MECHANIC INTERACT */}
              {sceneInteractiveState === 'KICK_SWIPE_PREP' && (
                <div className="my-auto text-center space-y-4 p-4 bg-yellow-950/10 border border-yellow-500/20 rounded">
                  <div className="flex justify-center items-center gap-1.5 text-yellow-500 text-[10px] font-mono uppercase tracking-widest font-black">
                    <Compass className="h-3.5 w-3.5 animate-spin text-yellow-500" />
                    <span>Crosswind Vector: 25 km/h W</span>
                  </div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Slot 10: Drop Punt</h4>
                  <div className="h-16 w-16 bg-red-700 hover:bg-red-600 rounded-full mx-auto flex items-center justify-center animate-bounce cursor-pointer border border-white/10 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-transform" onClick={() => handleBossKick(true)}>
                    <span className="text-[10px] text-white font-black uppercase font-mono tracking-wider">SWIPE!</span>
                  </div>
                  <p className="text-[9px] text-zinc-400 uppercase font-mono">
                    Click the ball to swipe and kick with maximum Finesse/Power traits.
                  </p>
                </div>
              )}

              {sceneInteractiveState === 'BOSS_KICKED_GOAL' && (
                <div className="my-auto text-center space-y-3 p-4 bg-green-950/20 border border-green-500/20 rounded">
                  <Trophy className="h-10 w-10 text-green-400 mx-auto animate-bounce" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">GOAL! THE BIG STICKS SPLIT!</h4>
                  <p className="text-[10px] text-emerald-400 font-mono uppercase">YOUR POWER KICK DEFIES THE SEVERE WIND VECTOR.</p>
                  <button className="px-3 py-1.5 bg-yellow-500 text-black font-black text-[9px] uppercase rounded mx-auto block cursor-pointer" onClick={() => setSceneInteractiveState('CELEBRATE_FLIP')}>
                    Flip Gate Canopy
                  </button>
                </div>
              )}

              {/* COLOR CELEBRATION CHUTE */}
              {sceneInteractiveState === 'CELEBRATING' && (
                <div className="my-auto text-center space-y-4 p-4 animate-pulse">
                  <div className="h-14 w-14 rounded mx-auto flex items-center justify-center font-black animate-spin" style={{ backgroundColor: userClub?.colors.primary || '#e4e4e7', color: userClub?.colors.secondary || '#18181b' }}>
                     {userClub?.mascot.substring(0, 3).toUpperCase() || 'AFL'}
                  </div>
                  <h3 className="text-sm font-black tracking-widest text-yellow-500 uppercase">MCG GATE 3 SECURED!</h3>
                  <p className="text-zinc-300 text-[10px] font-mono leading-relaxed">
                    Gate canopy virtual laser mesh erupts into {userClub?.name || 'your own'} club colors.
                  </p>
                  <div className="text-[9px] text-[#22c55e] uppercase font-mono font-bold tracking-widest bg-green-950/20 py-1.5 px-2 rounded border border-green-500/10">
                     ticker: {userClub?.name || 'Your club'} 60%
                  </div>
                </div>
              )}

              {/* Status Header overlay inside simulated smartphone screen */}
              <div className="border-t border-white/5 pt-1.5 flex justify-between items-center text-[8.5px] font-mono text-zinc-500 uppercase tracking-wider">
                <span>STIMULATED STATE: {sceneInteractiveState}</span>
                <span>GOAL KICKS: {pitchKicks}</span>
              </div>
            </div>

          </div>

          {/* Active scene execute button trigger */}
          <button
            onClick={() => executeInteractiveAction(scenes[currentScene].interactiveType)}
            className="w-full mt-4 bg-yellow-500 hover:bg-yellow-400 text-black text-[10px] uppercase font-black tracking-widest py-3 rounded transition-all cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.15)] flex items-center justify-center gap-1.5"
          >
            <Play className="h-4 w-4 text-black fill-black" />
            {scenes[currentScene].actionLabel}
          </button>
        </div>

      </div>

    </div>
  );
}
