import React from 'react';
import { PlayerCard, AFLClub, AFL_CLUBS } from '../types';
import { Shield, Sparkles, AlertCircle, RefreshCw, Layers, Award, Zap, Heart, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface SquadLockerProps {
  cards: PlayerCard[];
  userClub: AFLClub;
  wakeUpSessions: number;
  onReviveCard: (cardId: string) => void;
  onAddDummyCard: () => void;
}

export default function SquadLocker({
  cards,
  userClub,
  wakeUpSessions,
  onReviveCard,
  onAddDummyCard
}: SquadLockerProps) {
  
  const totalCardsCount = cards.length;
  const omittedCardsCount = cards.filter(c => c.omitted).length;
  const activeCardsCount = totalCardsCount - omittedCardsCount;
  const legendsCount = cards.filter(c => c.tier === 'Legend').length;

  return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-white/10 text-stone-200">
      
      {/* Top Header info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5 mb-6 gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-yellow-500" />
            Squad Locker & Hub Catalog
          </h2>
          <span className="text-xs text-zinc-400 font-mono">
            Maintain your club catalog. Knocked out defenders return as <strong className="text-red-400">Omitted</strong>. Use recovery loops to revive them.
          </span>
        </div>

        {/* Inventory consumable counter (Wake up items with 50 cap) */}
        <div className="mt-3 sm:mt-0 bg-zinc-950 border border-white/5 rounded-xl p-3 flex items-center gap-4 shadow-xl">
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider font-extrabold">Revival Wake-ups</span>
            <span className="text-base font-black font-mono text-yellow-500">{wakeUpSessions} / 50 CAPS</span>
          </div>
          <div className="w-16 bg-zinc-900 h-2 rounded-full overflow-hidden border border-white/5">
            <div 
              className="bg-yellow-500 h-full transition-all duration-300" 
              style={{ width: `${(wakeUpSessions / 50) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Roster Statistics and add options */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-950 border border-white/5 rounded p-3.5">
          <span className="text-[10px] font-mono text-zinc-500 uppercase block font-black tracking-widest">Total Catalog</span>
          <span className="text-xl font-black text-white font-mono">{totalCardsCount}</span>
        </div>
        <div className="bg-zinc-950 border border-white/5 rounded p-3.5">
          <span className="text-[10px] font-mono text-green-400 uppercase block font-black tracking-widest">Active Squad</span>
          <span className="text-xl font-black text-green-400 font-mono">{activeCardsCount}</span>
        </div>
        <div className="bg-zinc-950 border border-white/5 rounded p-3.5">
          <span className="text-[10px] font-mono text-red-500 uppercase block font-black tracking-widest font-extrabold">Omitted</span>
          <span className="text-xl font-black text-red-500 font-mono">{omittedCardsCount}</span>
        </div>
        <div className="bg-zinc-950 border border-white/5 rounded p-3.5 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-mono text-yellow-500 uppercase block font-black tracking-widest">Legends</span>
            <span className="text-xl font-black text-yellow-500 font-mono">{legendsCount}</span>
          </div>
          <button
            onClick={onAddDummyCard}
            className="px-3 py-1.5 text-[9px] uppercase font-black tracking-widest rounded bg-yellow-500 text-black hover:bg-yellow-400 border border-transparent transition-all cursor-pointer"
          >
            + Card
          </button>
        </div>
      </div>

      {/* Roster Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {cards.map(card => {
          const isOmitted = card.omitted;
          const cardClub = AFL_CLUBS.find(c => c.id === card.clubId) || userClub;

          // Tier Colors
          const theme = {
            border: 'border-white/5 bg-[#121214]',
            pill: 'bg-zinc-850 text-zinc-300 border border-white/5',
            glow: '',
            text: 'text-zinc-300'
          };

          if (card.tier === 'Legend') {
            theme.border = 'border-amber-500/80 bg-gradient-to-br from-[#1c1a10] to-[#2b2713]';
            theme.pill = 'bg-amber-400/10 text-amber-300 border border-amber-500/20';
            theme.glow = 'shadow-md shadow-amber-500/5';
            theme.text = 'text-amber-300';
          } else if (card.tier === 'Gold') {
            theme.border = 'border-yellow-600/70 bg-gradient-to-br from-[#1a1912] to-[#252210]';
            theme.pill = 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20';
            theme.glow = 'shadow-md shadow-yellow-600/5';
            theme.text = 'text-yellow-400';
          } else if (card.tier === 'Silver') {
            theme.border = 'border-zinc-700 bg-[#16171d]';
            theme.pill = 'bg-zinc-800 text-zinc-300 border border-white/5';
            theme.text = 'text-zinc-300';
          } else if (card.tier === 'Bronze') {
            theme.border = 'border-amber-900/60 bg-[#171412]';
            theme.pill = 'bg-amber-950/20 text-amber-500 border border-amber-800/20';
            theme.text = 'text-amber-500';
          }

          return (
            <div
              key={card.id}
              className={`relative rounded border p-4 flex flex-col justify-between transition-all group overflow-hidden ${theme.border} ${theme.glow} ${
                isOmitted ? 'opacity-40 grayscale-[80%] border-red-950 bg-zinc-950' : 'hover:scale-[1.02] hover:border-zinc-500'
              }`}
            >
              {/* Special Retro kit stripe indicators */}
              {card.variant !== 'Standard' && !isOmitted && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white font-mono font-black text-[7px] py-0.5 px-2 rounded-bl shadow tracking-wider uppercase flex items-center gap-1">
                  <Sparkles className="h-2 w-2 animate-pulse" />
                  {card.variant}
                </div>
              )}

              <div>
                {/* Tier tag */}
                <div className="flex justify-between items-start mb-2.5">
                  <span className={`text-[8px] uppercase tracking-widest font-black px-2 py-0.5 rounded ${theme.pill}`}>
                    {card.tier}
                  </span>
                  
                  {/* Status Indicator */}
                  {isOmitted ? (
                    <span className="text-[8px] bg-red-950/60 border border-red-500/20 text-red-400 font-black px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                      <AlertCircle className="h-3 w-3 text-red-500 animate-pulse" />
                      OMITTED
                    </span>
                  ) : (
                    <span className="text-[8px] bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 font-black px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      READY
                    </span>
                  )}
                </div>

                {/* Player Detail */}
                <h3 className="text-sm font-black text-white group-hover:text-yellow-400 transition-colors uppercase italic tracking-tight">
                  {card.name}
                </h3>
                
                {/* Mini stripe style under player */}
                <span className="text-[9.5px] uppercase font-bold block mt-1" style={{ color: cardClub.colors.primary === '#000000' && card.tier !== 'Legend' ? '#ffffff' : cardClub.colors.primary }}>
                  {cardClub.name} {cardClub.mascot}
                </span>

                {/* Stat Matrix layout */}
                <div className="mt-4 space-y-1.5 border-t border-white/5 pt-3">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-zinc-500">POWER:</span>
                    <span className="font-bold text-white">{card.power}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-zinc-500">SKILL:</span>
                    <span className="font-bold text-white">{card.skill}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-zinc-500">FINESSE:</span>
                    <span className="font-bold text-white">{card.finesse}</span>
                  </div>
                </div>
              </div>

              {/* Recovery Loop activation button */}
              {isOmitted ? (
                <div className="mt-4 pt-3 border-t border-white/5">
                  {wakeUpSessions > 0 ? (
                    <button
                      onClick={() => onReviveCard(card.id)}
                      className="w-full bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase py-2 rounded transition-transform cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                    >
                      <Heart className="h-3.5 w-3.5 fill-white" />
                      WAKE UP SESSION
                    </button>
                  ) : (
                    <div className="text-[9.5px] font-mono text-center text-red-500 bg-red-950/20 p-2.5 rounded border border-red-500/10 leading-dense uppercase">
                      ⚠️ EMPTY CAPSULES
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 pt-3 border-t border-white/5 flex justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">
                  <span>LVL {card.level}</span>
                  <span>XP {card.xp}/100</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
