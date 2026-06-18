import React, { useState, useEffect, useRef } from 'react';
import { PlayerCard, ConquestNode, AFLClub, AFL_CLUBS, MCG_COORDINATES, MCG_GATES } from './types';
import { generateWildPlayer, generateMCGGateDefenders } from './utils';
import FlickToKick from './components/FlickToKick';
import BattleFlickToKick from './components/BattleFlickToKick';
import MapArena from './components/MapArena';
import SquadLocker from './components/SquadLocker';
import LivePitch from './components/LivePitch';
import SpeckyTraining from './components/SpeckyTraining';
import AdminPasscodeGate from './components/AdminPasscodeGate';
import { 
  Trophy, ShieldAlert, Zap, Compass, Footprints, Layers, RefreshCw, Sparkles, HelpCircle, AlertCircle, Info, Landmark, Play, CheckCircle2, ChevronRight, X,
  Camera, Download, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // --- Persistent & Local Storage State ---
  const [userClubId, setUserClubId] = useState<string | null>(() => {
    return localStorage.getItem('footygo_faction_lock');
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('footygo_username') || 'LockerRoomChamp';
  });

  // Main navigation tab
  const [activeTab, setActiveTab] = useState<'RADAR' | 'TRAINING' | 'LOCKER' | 'ADMIN'>('RADAR');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [trainingMode, setTrainingMode] = useState<'KICK' | 'SPECKY'>('SPECKY'); // Default to Specky to showcase the awesome new mode!

  // Player properties
  const [wakeUpSessions, setWakeUpSessions] = useState<number>(15); // capped at 50 max
  const [userPosition, setUserPosition] = useState({
    latitude: MCG_COORDINATES.latitude + 0.001, // spawn slightly north of MCG
    longitude: MCG_COORDINATES.longitude + 0.001
  });

  // Dynamic Gates list (seeding MCG portals)
  const [nodes, setNodes] = useState<ConquestNode[]>(() => {
    // Seed mcg gate nodes with defense rosters of 10 players
    return MCG_GATES.map(gate => ({
      ...gate,
      defenders: generateMCGGateDefenders(gate.gateNumber)
    }));
  });

  // User collection roster
  const [cards, setCards] = useState<PlayerCard[]>([]);

  // Active social events trigger flag (3x-5x spawn density and legendary kits)
  const [socialEventActive, setSocialEventActive] = useState<boolean>(false);

  // Active Gauntlet Battle status overlays
  const [activeBattleNode, setActiveBattleNode] = useState<ConquestNode | null>(null);
  const [battleCurrentSlot, setBattleCurrentSlot] = useState<number>(1); // Slot 1 to 10 Sequential Gauntlet
  const [battleSecondsLeft, setBattleSecondsLeft] = useState<number>(300); // 5-minute lockout timer
  const [battleKickerCard, setBattleKickerCard] = useState<PlayerCard | null>(null);
  
  // Best of Three Scoreboard tracking variables for current gate guard slot
  const [battleGateGoals, setBattleGateGoals] = useState<number>(0);
  const [battleGateMisses, setBattleGateMisses] = useState<number>(0);
  
  // Slider Battle mini-game targets
  const [sliderPos, setSliderPos] = useState<number>(0);
  const [sliderDirection, setSliderDirection] = useState<'right' | 'left'>('right');
  const [battleState, setBattleState] = useState<'IDLE' | 'KICKING' | 'GOAL' | 'BEHIND' | 'MISS' | 'FAIL' | 'VICTORY'>('IDLE');
  const [battleFailureCause, setBattleFailureCause] = useState<'MISSED_KICK' | 'TIMEOUT' | null>(null);
  const [battleWind, setBattleWind] = useState<number>(0);

  // Conquest Snapshot generation attributes
  const conquestCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [conquestSnapshot, setConquestSnapshot] = useState<string | null>(null);
  const [conquestCopied, setConquestCopied] = useState<boolean>(false);

  // Sync lockout timer ticks
  useEffect(() => {
    if (!activeBattleNode) return;
    const interval = setInterval(() => {
      setBattleSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleGauntletFailure('TIMEOUT');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeBattleNode]);

  // Handle active canvas slider oscillation ticks during gauntlet kicks
  useEffect(() => {
    if (battleState !== 'IDLE') return;
    const interval = setInterval(() => {
      setSliderPos(prev => {
        let next = prev;
        if (sliderDirection === 'right') {
          next += 4.5;
          if (next >= 100) {
            next = 100;
            setSliderDirection('left');
          }
        } else {
          next -= 4.5;
          if (next <= 0) {
            next = 0;
            setSliderDirection('right');
          }
        }
        return next;
      });
    }, 24);
    return () => clearInterval(interval);
  }, [battleState, sliderDirection]);

  // Bootstrap initial user collection
  useEffect(() => {
    const existing = localStorage.getItem('footygo_cards');
    if (existing) {
      setCards(JSON.parse(existing));
    } else {
      // Default initial squad of 14 players
      const starterCards: PlayerCard[] = [];
      
      // Add standard players representing their choice as available
      const activeClubSelection = userClubId || 'collingwood';
      
      // 10 Available starting players
      for (let i = 0; i < 10; i++) {
        const card = generateWildPlayer();
        card.clubId = activeClubSelection;
        card.omitted = false;
        starterCards.push(card);
      }

      // 4 Initial Omitted cards to show recovery loops cleanly
      for (let i = 0; i < 4; i++) {
        const card = generateWildPlayer();
        card.omitted = true;
        starterCards.push(card);
      }

      setCards(starterCards);
      localStorage.setItem('footygo_cards', JSON.stringify(starterCards));
    }
  }, [userClubId]);

  // Helper selectors
  const userClub = AFL_CLUBS.find(c => c.id === userClubId) || null;

  // Onboarding Faction pledge save
  const handlePledgeFaction = (clubId: string) => {
    localStorage.setItem('footygo_faction_lock', clubId);
    setUserClubId(clubId);
  };

  // Trait Training Upgrades Commit from Flick Component
  const handleTrainCard = (cardId: string, updates: { power: number; skill: number; finesse: number; xp: number }) => {
    setCards(prev => {
      const updated = prev.map(c => {
        if (c.id === cardId) {
          const powerIncrease = updates.power;
          const skillIncrease = updates.skill;
          const finesseIncrease = updates.finesse;

          return {
            ...c,
            power: Math.min(100, c.power + powerIncrease),
            skill: Math.min(100, c.skill + skillIncrease),
            finesse: Math.min(100, c.finesse + finesseIncrease),
            xp: Math.max(0, c.xp + updates.xp)
          };
        }
        return c;
      });
      localStorage.setItem('footygo_cards', JSON.stringify(updated));
      return updated;
    });
  };

  // Revive knocked out card spending Wake Up Session
  const handleReviveCard = (cardId: string) => {
    if (wakeUpSessions <= 0) return;
    setWakeUpSessions(prev => Math.max(0, prev - 1));
    setCards(prev => {
      const updated = prev.map(c => {
        if (c.id === cardId) {
          return { ...c, omitted: false };
        }
        return c;
      });
      localStorage.setItem('footygo_cards', JSON.stringify(updated));
      return updated;
    });
  };

  const handleCreateWildCard = () => {
    const card = generateWildPlayer();
    setCards(prev => {
      const updated = [...prev, card];
      localStorage.setItem('footygo_cards', JSON.stringify(updated));
      return updated;
    });
    alert(`💡 Procured new wild card: ${card.name} (${card.tier}) added to roster.`);
  };

  // Initiate Conquest gauntlet
  const handleInitiateBattle = (node: ConquestNode) => {
    // Roster rules: must have at least 1 usable non-omitted card
    const availablePool = cards.filter(c => !c.omitted);
    if (availablePool.length === 0) {
      alert('🔒 ACCESS BLOCKED! All of your roster cards are currently Omitted (grayed out). Use Wake Up items in the Squad Locker before challenging gates.');
      return;
    }

    setConquestSnapshot(null);
    setConquestCopied(false);

    // Set first available card as default combat kicker
    setBattleKickerCard(availablePool[0]);
    setActiveBattleNode(node);
    setBattleCurrentSlot(1);
    setBattleGateGoals(0);
    setBattleGateMisses(0);
    setBattleSecondsLeft(300); // 5-minute Failure Lockout timer
    setBattleState('IDLE');
    setBattleWind(Math.floor(Math.random() * 21) - 10);
  };

  // Gauntlet Kick shooter trigger
  const handleGauntletKickInput = () => {
    if (battleState !== 'IDLE' || !battleKickerCard) return;
    setBattleState('KICKING');

    // Sweet Spot targets on slider:
    // Skill bonus: slows target & widens perfect center zone
    const skillBonus = Math.floor(battleKickerCard.skill / 6); // 1 to 16 pixels
    const goalZoneMin = 50 - skillBonus;
    const goalZoneMax = 50 + skillBonus;
    const behindZoneMin = 40 - skillBonus;
    const behindZoneMax = 60 + skillBonus;

    setTimeout(() => {
      // Wind acts like offset drift depending on Power suppression
      const powerReduction = battleKickerCard.power / 10; // offset reduction
      const dragOffset = Math.max(0, battleWind - powerReduction);
      const landedPos = sliderPos + (battleWind > 0 ? dragOffset : -dragOffset);

      if (landedPos >= goalZoneMin && landedPos <= goalZoneMax) {
        setBattleState('GOAL');
        setTimeout(() => {
          advanceGauntletSlot();
        }, 1200);
      } else if (landedPos >= behindZoneMin && landedPos <= behindZoneMax) {
        setBattleState('BEHIND');
      } else {
        setBattleState('MISS');
        setTimeout(() => {
          handleGauntletFailure('MISSED_KICK');
        }, 1200);
      }
    }, 800);
  };

  const advanceGauntletSlot = () => {
    setBattleGateGoals(0);
    setBattleGateMisses(0);
    if (battleCurrentSlot >= 10) {
      // Complete 10-man gauntlet clear victory!
      setBattleState('VICTORY');
    } else {
      setBattleCurrentSlot(prev => prev + 1);
      setBattleState('IDLE');
      setBattleWind(Math.floor(Math.random() * 21) - 10);
    }
  };

  // Handle conquest fails (one miss, and user locked out)
  const handleGauntletFailure = (cause: 'MISSED_KICK' | 'TIMEOUT') => {
    setBattleState('FAIL');
    setBattleFailureCause(cause);
    
    // Penalize: Knockout/Omit your combat kicker card
    if (battleKickerCard) {
      setCards(prev => {
        const updated = prev.map(c => {
          if (c.id === battleKickerCard.id) {
            return { ...c, omitted: true };
          }
          return c;
        });
        localStorage.setItem('footygo_cards', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Claim territory and flip stadium colors
  const handleCommitConquestWin = () => {
    if (!activeBattleNode || !userClubId) return;

    // Mutate conquest node values
    setNodes(prev => {
      return prev.map(n => {
        if (n.id === activeBattleNode.id) {
          // Send former defender cards to their owners as Omitted (simulated background)
          return {
            ...n,
            ownerClubId: userClubId,
            conqueringUsername: username,
            lastConqueredAt: new Date().toISOString()
          };
        }
        return n;
      });
    });

    setActiveBattleNode(null);
    setConquestSnapshot(null);
    setConquestCopied(false);
    alert(`🎉 INCREDIBLE OUTCOME! Gateway Node flipped! MCG Arena Gate is now lit in deep ${userClub?.name} factions colors! Dominance aggregates updated.`);
  };

  // Capture Conquest Victory Digital Snapshot onto high-res Canvas
  useEffect(() => {
    if (battleState === 'VICTORY' && activeBattleNode && userClub && battleKickerCard) {
      const timer = setTimeout(() => {
        const canvas = conquestCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Clean canvas
        ctx.clearRect(0, 0, width, height);

        // Retrieve faction theme properties
        const primColor = userClub.colors.primary || '#18181b';
        const secColor = userClub.colors.secondary || '#eab308';
        const textColor = userClub.colors.text || '#ffffff';

        // Background Radial Gradient for high-end look
        const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 60, width / 2, height / 2, width);
        bgGrad.addColorStop(0, primColor);
        bgGrad.addColorStop(0.7, primColor);
        bgGrad.addColorStop(1, '#09090b'); // Vignette darkness boundary
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Technical overlay grids
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, height);
          ctx.stroke();
        }
        for (let i = 0; i < height; i += 40) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(width, i);
          ctx.stroke();
        }

        // Draw elegant thick faction boundary border
        ctx.strokeStyle = secColor;
        ctx.lineWidth = 8;
        ctx.strokeRect(16, 16, width - 32, height - 32);

        // Draw secondary inner hairline border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(22, 22, width - 44, height - 44);

        // Draw aesthetic corner technical crosses
        ctx.fillStyle = secColor;
        const bracket = 25;
        // TL
        ctx.fillRect(10, 10, bracket, 4); ctx.fillRect(10, 10, 4, bracket);
        // TR
        ctx.fillRect(width - 10 - bracket, 10, bracket, 4); ctx.fillRect(width - 14, 10, 4, bracket);
        // BL
        ctx.fillRect(10, height - 14, bracket, 4); ctx.fillRect(10, height - 10 - bracket, 4, bracket);
        // BR
        ctx.fillRect(width - 10 - bracket, height - 14, bracket, 4); ctx.fillRect(width - 14, height - 10 - bracket, 4, bracket);

        // Draw a giant dynamic circular Shield badge rightward
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(width - 130, height / 2 + 10, 85, 0, Math.PI * 2);
        ctx.stroke();

        // Overlay with neon scanlines in shield area
        ctx.fillStyle = secColor + '10'; // 10% opacity hex
        ctx.beginPath();
        ctx.arc(width - 130, height / 2 + 10, 82, 0, Math.PI * 2);
        ctx.fill();

        // Draw grand Trophy vectors in center of circle
        ctx.save();
        ctx.translate(width - 130, height / 2 - 20);
        ctx.fillStyle = secColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        // Trophy base pedestal
        ctx.beginPath();
        ctx.moveTo(-30, 45);
        ctx.lineTo(30, 45);
        ctx.lineTo(20, 32);
        ctx.lineTo(-20, 32);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Stem
        ctx.fillRect(-6, 15, 12, 17);
        ctx.strokeRect(-6, 15, 12, 17);

        // Main cup rounded bottom
        ctx.beginPath();
        ctx.arc(0, -5, 24, 0, Math.PI, false);
        ctx.lineTo(0, 19);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Main rim top
        ctx.fillRect(-24, -18, 48, 13);
        ctx.strokeRect(-24, -18, 48, 13);

        // Handles
        ctx.beginPath();
        ctx.arc(-26, -2, 10, -Math.PI/2, Math.PI/2, true);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = secColor;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(26, -2, 10, -Math.PI/2, Math.PI/2, false);
        ctx.stroke();
        ctx.restore();

        // RENDER DETAILS TEXT BLOCKS
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';

        // 1. Watermark validation tag
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillText('FOOTYGO OFFICIAL CONQUEST RECORD', 45, 55);

        // 2. Main Large Title with beautiful gradient fill
        ctx.font = '900 italic 34px sans-serif';
        const titleGrad = ctx.createLinearGradient(45, 0, 310, 0);
        titleGrad.addColorStop(0, '#ffffff');
        titleGrad.addColorStop(1, secColor);
        ctx.fillStyle = titleGrad;
        ctx.fillText('STADIUM CONQUEST', 45, 92);

        // Horizontal accent line
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fillRect(45, 105, width - 290, 2);

        // 3. SECURED GATE AND MASCOT
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 italic 21px sans-serif';
        ctx.fillText(activeBattleNode.name.toUpperCase(), 45, 138);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.font = '500 11px monospace';
        ctx.fillText(`GATE ${activeBattleNode.gateNumber} • COORDINATES: ${activeBattleNode.latitude.toFixed(5)}°S, ${activeBattleNode.longitude.toFixed(5)}°E`, 45, 158);

        // 4. Mascot Faction claim
        ctx.font = '900 italic 26px sans-serif';
        ctx.fillStyle = secColor;
        ctx.fillText(`${userClub.name.toUpperCase()} ${userClub.mascot.toUpperCase()}`, 45, 205);
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 11px monospace';
        ctx.fillText('STADIUM SECTOR FLIPPED UNDER FACTION PROTOCOLS', 45, 226);

        // 5. Hero commander box stats
        ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
        ctx.fillRect(45, 250, width - 290, 115);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
        ctx.strokeRect(45, 250, width - 290, 115);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`CONQUEROR:   ${username.toUpperCase()}`, 60, 280);

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`BATTLE MVP:  ${battleKickerCard.name.toUpperCase()}`, 60, 305);
        ctx.fillText(`CLASS TIER:  ${battleKickerCard.tier.toUpperCase()} • LEVEL ${battleKickerCard.level}`, 60, 325);
        ctx.fillText(`STATS PUNT:  PWR:${battleKickerCard.power} | SKL:${battleKickerCard.skill} | FIN:${battleKickerCard.finesse}`, 60, 345);

        // Bottom footer
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '800 10px monospace';
        ctx.fillText(`SECURE SIGNATURE VERIFIED: ${new Date().toISOString()}`, 45, 400);
        ctx.fillText(`AFL STADIUM SYSTEM v2.6 • SECURED CREDENTIAL STATUS`, 45, 415);

        try {
          const url = canvas.toDataURL('image/png');
          setConquestSnapshot(url);
        } catch (e) {
          console.error('Conquest canvas conversion failed:', e);
        }
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [battleState, activeBattleNode, userClub, battleKickerCard, username]);

  const handleDownloadConquestSnapshot = () => {
    if (!conquestSnapshot) return;
    const link = document.createElement('a');
    link.download = `AFL-Conquest-${activeBattleNode ? activeBattleNode.name.replace(/\s+/g, '-') : 'Secured'}-${Date.now()}.png`;
    link.href = conquestSnapshot;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyConquestStats = () => {
    if (!activeBattleNode || !userClub || !battleKickerCard) return;
    const statsText = `🏰 MCG TERRITORY SECURED! 🏰\n` +
      `🏟️ Location: ${activeBattleNode.name}\n` +
      `🛡️ Securing Club: ${userClub.name} ${userClub.mascot}\n` +
      `👤 Commander: ${username}\n` +
      `🏉 MVP Hero: ${battleKickerCard.name} (${battleKickerCard.tier})\n` +
      `📊 Match Stats: Power ${battleKickerCard.power} | Skill ${battleKickerCard.skill}\n` +
      `⚔️ Gauntlet: 10/10 Defenders Defeated in succession!\n` +
      `Come challenge my territory in the FootyGo Arena!`;

    navigator.clipboard.writeText(statsText)
      .then(() => {
        setConquestCopied(true);
        setTimeout(() => setConquestCopied(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy conquest stats: ", err);
      });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans transition-colors antialiased">
      
      {/* 1. ONBOARDING SIGN-UP OR BLOCK IF CLUB IS UNCHOSEN */}
      {userClubId === null ? (
        <div className="flex-1 flex items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#09090b_100%)]">
          <div className="bg-zinc-900 border-2 border-white/10 rounded-2xl w-full max-w-xl p-8 space-y-6 shadow-2xl text-center">
            
            <div className="space-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-blue-800 rounded-full mx-auto flex items-center justify-center border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none mt-4 text-white">FootyGo</h1>
              <p className="text-[10px] text-yellow-500 font-bold tracking-widest uppercase">Select your permanent Faction</p>
            </div>

            <div className="p-4 bg-zinc-950/75 rounded-xl border border-white/5 text-xs text-zinc-300 space-y-1.5 text-left leading-relaxed">
              <div className="font-bold text-red-500 uppercase flex items-center gap-1 mb-1">
                <ShieldAlert className="h-4 w-4" /> 
                Faction lock covenant
              </div>
              <p>Choosing an AFL club binds your account <strong>permanently</strong> to prevent bandwagon leaderboard jumping. Core spawn engine neutralities remain mathematically unbiased to foster collections trading.</p>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-400 block tracking-wider uppercase font-mono">Select your faction:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AFL_CLUBS.map(club => (
                  <button
                    key={club.id}
                    onClick={() => handlePledgeFaction(club.id)}
                    className="p-3 bg-zinc-950 border border-white/10 rounded font-black uppercase text-center hover:bg-zinc-800 hover:border-yellow-500 active:scale-95 transition-all text-white text-xs"
                    style={{ borderLeft: `6px solid ${club.colors.primary}`, borderRight: `6px solid ${club.colors.primary}` }}
                  >
                    {club.name}
                    <span className="block text-[8px] opacity-75 font-normal tracking-wide lowercase">{club.mascot}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-white/30 font-mono pt-4 border-t border-white/5">
               FOOTYGO AR PLATFORM INC. • 2026 OFFICIAL VERSION
            </div>
          </div>
        </div>
      ) : (
        
        // 2. MAIN LOGGED-IN ECOSYSTEM APP LAYOUT
        <>
          {/* Global Stadium Dominance Ticker (Live Dominance Ticker styled exactly from Design HTML) */}
          <div className="bg-red-700 h-10 flex items-center px-6 border-b border-white/10 shrink-0 select-none overflow-hidden">
            <div className="flex items-center space-x-8 animate-pulse">
              <span className="text-[10px] font-black tracking-widest uppercase text-white/70">Live Dominance Ticker</span>
              
              {AFL_CLUBS.slice(0, 5).map((c, idx) => {
                const oCount = nodes.filter(n => n.ownerClubId === c.id).length;
                const percent = Math.round((oCount / nodes.length) * 100);
                return (
                  <React.Fragment key={c.id}>
                    {idx > 0 && <span className="text-white/50">•</span>}
                    <span className="text-xs font-bold text-white">{c.name.toUpperCase()}: {percent}%</span>
                  </React.Fragment>
                );
              })}
              
              <span className="text-xs font-medium text-white/50">•</span>
              <span className="text-xs font-bold text-yellow-300">GATE 3: ACTIVE CONFLICT ZONE</span>
            </div>
          </div>

          {/* Top Navigation / Profile Bar (styled from Design HTML) */}
          <nav className="h-20 flex items-center justify-between px-6 sm:px-8 bg-zinc-900 shrink-0 border-b border-white/5">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-blue-800 rounded-full flex items-center justify-center border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                <span className="font-black text-xl italic text-white">
                  {(userClub?.name || 'F').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none text-white">FootyGo</h1>
                <p className="text-[10px] text-yellow-500 font-bold tracking-widest uppercase">
                  {userClub?.name || 'Brisbane'} Faction • Locked
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Wake Up Sessions</div>
                <div className="text-xl font-mono font-bold text-green-400">
                  {wakeUpSessions}<span className="text-white/20">/50</span>
                </div>
              </div>
              <div className="h-10 w-[1px] bg-white/10 hidden sm:block"></div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSocialEventActive(prev => !prev)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${
                    socialEventActive ? 'bg-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-zinc-800 border-white/10'
                  }`}
                  title="Toggle Grassroots Hub Spark"
                >
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                </button>
                <button
                  onClick={() => setActiveTab('LOCKER')}
                  className="px-6 h-10 bg-white text-black font-black uppercase text-xs flex items-center rounded-sm tracking-widest hover:bg-yellow-400 transition-colors"
                >
                  Inventory
                </button>
              </div>
            </div>
          </nav>

          {/* Global Nav tabs styled from Design HTML */}
          <div className="h-16 bg-zinc-900 border-b border-white/10 shrink-0 flex select-none">
             <div 
               onClick={() => setActiveTab('RADAR')}
               className={`flex-1 relative flex flex-col items-center justify-center border-r border-white/5 font-black text-[10px] tracking-widest uppercase cursor-pointer hover:text-white transition-colors ${
                 activeTab === 'RADAR' ? 'text-white' : 'text-stone-400'
               }`}
               id="tab-selector-radar"
             >
               <span className="relative z-10">Stadium Map</span>
               {activeTab === 'RADAR' && (
                 <motion.div 
                   layoutId="activeTabIndicator"
                   className="absolute bottom-0 left-0 right-0 h-1 z-20"
                   style={{ backgroundColor: userClub ? userClub.colors.primary : '#eab308' }}
                   transition={{ type: "spring", stiffness: 380, damping: 32 }}
                 />
               )}
               {activeTab === 'RADAR' && (
                 <motion.div 
                   layoutId="activeTabBackground"
                   className="absolute inset-0 bg-zinc-950/40 z-0"
                   transition={{ type: "spring", stiffness: 300, damping: 28 }}
                 />
               )}
             </div>
             <div 
               onClick={() => setActiveTab('TRAINING')}
               className={`flex-1 relative flex flex-col items-center justify-center border-r border-white/5 font-black text-[10px] tracking-widest uppercase cursor-pointer hover:text-white transition-colors ${
                 activeTab === 'TRAINING' ? 'text-white' : 'text-stone-400'
               }`}
               id="tab-selector-training"
             >
               <span className="relative z-10">Training Zone</span>
               {activeTab === 'TRAINING' && (
                 <motion.div 
                   layoutId="activeTabIndicator"
                   className="absolute bottom-0 left-0 right-0 h-1 z-20"
                   style={{ backgroundColor: userClub ? userClub.colors.primary : '#eab308' }}
                   transition={{ type: "spring", stiffness: 380, damping: 32 }}
                 />
               )}
               {activeTab === 'TRAINING' && (
                 <motion.div 
                   layoutId="activeTabBackground"
                   className="absolute inset-0 bg-zinc-950/40 z-0"
                   transition={{ type: "spring", stiffness: 300, damping: 28 }}
                 />
               )}
             </div>
             <div 
               onClick={() => setActiveTab('LOCKER')}
               className={`flex-1 relative flex flex-col items-center justify-center border-r border-white/5 font-black text-[10px] tracking-widest uppercase cursor-pointer hover:text-white transition-colors ${
                 activeTab === 'LOCKER' ? 'text-white' : 'text-stone-400'
               }`}
               id="tab-selector-locker"
             >
               <span className="relative z-10">Squad Locker</span>
               {activeTab === 'LOCKER' && (
                 <motion.div 
                   layoutId="activeTabIndicator"
                   className="absolute bottom-0 left-0 right-0 h-1 z-20"
                   style={{ backgroundColor: userClub ? userClub.colors.primary : '#eab308' }}
                   transition={{ type: "spring", stiffness: 380, damping: 32 }}
                 />
               )}
               {activeTab === 'LOCKER' && (
                 <motion.div 
                   layoutId="activeTabBackground"
                   className="absolute inset-0 bg-zinc-950/40 z-0"
                   transition={{ type: "spring", stiffness: 300, damping: 28 }}
                 />
               )}
             </div>
             <div 
               onClick={() => setActiveTab('ADMIN')}
               className={`flex-1 relative flex flex-col items-center justify-center font-black text-[10px] tracking-widest uppercase cursor-pointer transition-colors ${
                 activeTab === 'ADMIN' ? 'text-white' : 'text-stone-400 bg-zinc-900 border-r border-white/5'
               }`}
               id="tab-selector-admin"
             >
               <span className="relative z-10">Admin Page</span>
               {activeTab === 'ADMIN' && (
                 <motion.div 
                   layoutId="activeTabIndicator"
                   className="absolute bottom-0 left-0 right-0 h-1 z-20 bg-red-500"
                   transition={{ type: "spring", stiffness: 380, damping: 32 }}
                 />
               )}
               {activeTab === 'ADMIN' && (
                 <motion.div 
                   layoutId="activeTabBackground"
                   className="absolute inset-0 bg-red-950/20 z-0"
                   transition={{ type: "spring", stiffness: 300, damping: 28 }}
                 />
               )}
             </div>
          </div>

          {/* Main layout frame */}
          <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 overflow-x-hidden">
            
            {/* Live Warning indicator info if event is active */}
            {socialEventActive && (
              <div className="mb-4 bg-gradient-to-r from-amber-950/65 to-yellow-950/45 border-l-4 border-amber-500 p-3 rounded-r-xl flex items-center justify-between text-xs text-amber-300 shadow-lg border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400 animate-spin" />
                  <span>
                    <strong>AUTHORIZED GRASSROOTS SOCIAL EVENT ACTIVE:</strong> Catch-density spiked by 5x! Spawns now yield special variant retro kits or rare legends with equivalent competitive stats parameters.
                  </span>
                </div>
                <button 
                  onClick={() => setSocialEventActive(false)}
                  className="p-1 hover:bg-white/10 rounded cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* TAB RENDER HANDLERS */}
            <AnimatePresence mode="wait">
              {activeTab === 'RADAR' && (
                <motion.div
                  key="radar"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <MapArena
                    userClub={userClub!}
                    userPosition={userPosition}
                    onMoveTo={(lat, lon) => setUserPosition({ latitude: lat, longitude: lon })}
                    nodes={nodes}
                    onAttackNode={handleInitiateBattle}
                    inventory={{ wakeUpSessions }}
                    onAddWakeUpSession={(count) => setWakeUpSessions(prev => Math.min(50, prev + count))}
                    cards={cards}
                    onCaptureWildPlayer={(player, hasItem) => {
                      setCards(prev => {
                        const updated = [...prev, player];
                        localStorage.setItem('footygo_cards', JSON.stringify(updated));
                        return updated;
                      });
                    }}
                    socialEventActive={socialEventActive}
                  />
                </motion.div>
              )}

              {activeTab === 'TRAINING' && (
                <motion.div
                  key="training"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="space-y-6"
                >
                  {/* High Quality Segmented Training Selector */}
                  <div className="bg-zinc-900 p-1.5 rounded-xl border border-white/5 flex max-w-lg mx-auto shadow-inner">
                    <button
                      onClick={() => setTrainingMode('SPECKY')}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                        trainingMode === 'SPECKY'
                          ? 'bg-yellow-500 text-black shadow-lg font-black translate-y-[1px]'
                          : 'text-stone-400 hover:text-white hover:bg-white/5'
                      }`}
                      id="training_specky_tab_trigger"
                    >
                      🚀 Specky Vault Training (Catch & Fly)
                    </button>
                    <button
                      onClick={() => setTrainingMode('KICK')}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                        trainingMode === 'KICK'
                          ? 'bg-yellow-500 text-black shadow-lg font-black translate-y-[1px]'
                          : 'text-stone-400 hover:text-white hover:bg-white/5'
                      }`}
                      id="training_kick_tab_trigger"
                    >
                      🏈 Punt Kick Shot Choice
                    </button>
                  </div>

                  {trainingMode === 'SPECKY' ? (
                    <SpeckyTraining
                      cards={cards}
                      onTrainCard={handleTrainCard}
                      onEarnWakeUpSession={() => setWakeUpSessions(prev => Math.min(50, prev + 1))}
                    />
                  ) : (
                    <FlickToKick
                      cards={cards}
                      onTrainCard={handleTrainCard}
                      onEarnWakeUpSession={() => setWakeUpSessions(prev => Math.min(50, prev + 1))}
                    />
                  )}
                </motion.div>
              )}

              {activeTab === 'LOCKER' && (
                <motion.div
                  key="locker"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <SquadLocker
                    cards={cards}
                    userClub={userClub!}
                    wakeUpSessions={wakeUpSessions}
                    onReviveCard={handleReviveCard}
                    onAddDummyCard={handleCreateWildCard}
                  />
                </motion.div>
              )}

              {activeTab === 'ADMIN' && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  {!isAdminUnlocked ? (
                    <AdminPasscodeGate onUnlock={() => setIsAdminUnlocked(true)} />
                  ) : (
                    <div className="space-y-4">
                      {/* Show the LivePitch component, acting as the Admin page content */}
                      <div className="mb-4 bg-zinc-950 border border-green-500/30 p-4 rounded-xl flex items-center justify-between text-xs font-mono text-green-400">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                          <span>ADMIN PORTAL SESSION SECURED • PASSCODE COMPLIANT (1268)</span>
                        </div>
                        <button
                          onClick={() => setIsAdminUnlocked(false)}
                          className="px-3 py-1 bg-red-950/40 border border-red-800/30 hover:bg-red-900/30 text-red-400 rounded text-[9px] uppercase tracking-wider cursor-pointer"
                        >
                          Revoke Access
                        </button>
                      </div>

                      <LivePitch
                        userClub={userClub}
                        onSelectClub={handlePledgeFaction}
                        cards={cards}
                        onAddWakeUpSession={(count) => setWakeUpSessions(prev => Math.min(50, prev + count))}
                        onTriggerConquestWin={() => {
                          // Instantly seize Gate 3
                          setNodes(prev => {
                            return prev.map(n => {
                              if (n.id === 'gate-3') {
                                return {
                                  ...n,
                                  ownerClubId: userClubId,
                                  conqueringUsername: username,
                                  lastConqueredAt: new Date().toISOString()
                                };
                              }
                              return n;
                            });
                          });
                        }}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </main>

          {/* 3. POPUP GAUNTLET CONQUEST BATTLE MODAL */}
          <AnimatePresence>
            {activeBattleNode && battleKickerCard && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
              >
                <div className="bg-zinc-900 border-2 border-white/10 w-full max-w-lg rounded-xl overflow-hidden shadow-[0_0_45px_rgba(234,179,8,0.25)] flex flex-col">
                  
                  {/* Header */}
                  <div className="bg-zinc-950 p-6 border-b border-white/10 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-mono text-yellow-500 block uppercase tracking-widest font-black">Gate Gauntlet Fight</span>
                      <h3 className="text-xl font-black italic uppercase leading-none text-white mt-1">{activeBattleNode.name}</h3>
                    </div>

                    <div className="bg-red-950/40 border border-red-500/30 px-3 py-1.5 rounded text-xs text-red-500 font-mono flex items-center gap-1.5 animate-pulse">
                      <ClockIndicator seconds={battleSecondsLeft} />
                    </div>
                  </div>

                  {/* Body columns */}
                  <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[460px]">
                    
                    {battleState !== 'VICTORY' && battleState !== 'FAIL' ? (
                      <>
                        {/* The 10 defenses line list indicator */}
                        <div className="bg-zinc-950 p-4 rounded-xl border border-white/5">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-black">Sequential Gate Defense Queue</span>
                            <span className="text-xs font-black text-yellow-500 italic">Slot {battleCurrentSlot} of 10 Cleared</span>
                          </div>
                          <div className="flex gap-1">
                            {Array.from({ length: 10 }).map((_, i) => {
                              const slotNum = i + 1;
                              const active = slotNum === battleCurrentSlot;
                              const cleared = slotNum < battleCurrentSlot;

                              return (
                                <div
                                  key={slotNum}
                                  className={`flex-1 h-6 rounded flex items-center justify-center text-[10px] font-black transition-all ${
                                    cleared ? 'bg-green-500 text-black font-bold' :
                                    active ? 'bg-[#ef4444] text-white border border-red-400 scale-110 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                                    'bg-zinc-850 text-zinc-600'
                                  }`}
                                >
                                  {slotNum}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Active Dual Matching with premium styled cards */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Attacker panel */}
                          <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 text-center space-y-2">
                            <span className="text-[8px] font-mono tracking-widest text-emerald-400 block uppercase font-bold">Your Faction Kicker</span>
                            <div className="h-12 w-12 mx-auto rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center font-black text-sm text-green-400">
                              {battleKickerCard.name.charAt(0).toUpperCase()}
                            </div>
                            <h4 className="text-sm font-black italic text-white truncate">{battleKickerCard.name}</h4>
                            <span className="text-[10px] text-zinc-400 font-mono text-center block">Skill Power: {battleKickerCard.skill}</span>
                          </div>

                          {/* Defender panel */}
                          <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 text-center space-y-2">
                            <span className="text-[8px] font-mono tracking-widest text-red-500 block uppercase font-bold font-black">Gate Guard #{battleCurrentSlot}</span>
                            <div className="h-12 w-12 mx-auto rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center font-black text-sm text-red-500">
                              G
                            </div>
                            <h4 className="text-sm font-black italic text-zinc-300 truncate">
                              {activeBattleNode.defenders[battleCurrentSlot - 1]?.name || 'Guardian'}
                            </h4>
                            <span className="text-[10px] text-red-400 font-mono uppercase font-black block">Level {battleCurrentSlot} AI</span>
                          </div>
                        </div>

                        {/* BEST-OF-THREE SHOWDOWN SCORECARD OVERLAY */}
                        <div className="bg-zinc-950 p-4 rounded-xl border border-yellow-500/30 space-y-3">
                          <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <span className="text-[10px] font-mono text-zinc-100 uppercase tracking-widest font-black flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span>
                              Gate Guard Showdown (Best of Three)
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono font-bold">
                              Need 2 Goals to Advance
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-zinc-300 font-mono">
                              Match score: <strong className="text-green-400 font-black">{battleGateGoals} Goals</strong> • <strong className="text-red-400 font-black">{battleGateMisses} Miss/Behinds</strong>
                            </div>
                            <div className="flex gap-2">
                              {/* Show status circles for current showdown */}
                              {Array.from({ length: 3 }).map((_, i) => {
                                const scoredIdx = i < battleGateGoals;
                                const missedIdx = i < battleGateMisses;
                                
                                return (
                                  <div
                                    key={i}
                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-xs transition-all ${
                                      scoredIdx ? 'bg-green-500/20 border-green-500 text-green-400 scale-105 shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
                                      i < (battleGateGoals + battleGateMisses) ? 'bg-red-500/20 border-red-500 text-red-400' :
                                      'border-zinc-700 bg-zinc-900 text-zinc-500'
                                    }`}
                                  >
                                    {scoredIdx ? '⚽' : i < (battleGateGoals + battleGateMisses) ? '❌' : `•`}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Wind cross factor dialogue */}
                        <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 flex justify-between items-center text-xs">
                          <div className="text-zinc-300 font-mono">
                            <strong className="text-yellow-500">Crosswind:</strong> {battleWind === 0 ? 'Calm Vector' : `${Math.abs(battleWind)}KT Heading ${battleWind > 0 ? 'EAST' : 'WEST'}`}
                          </div>
                          <span className="text-[10px] text-green-400 font-mono">Finesse Counters Drift</span>
                        </div>

                        {/* INTERACTIVE COMPETE FLICK-TO-KICK CANVAS */}
                        <BattleFlickToKick
                          attackerCard={battleKickerCard}
                          defenderName={activeBattleNode.defenders[battleCurrentSlot - 1]?.name || 'Guardian'}
                          currentSlot={battleCurrentSlot}
                          windSpeed={battleWind}
                          onGoal={() => {
                            setBattleState('GOAL');
                            const nextGoals = battleGateGoals + 1;
                            setBattleGateGoals(nextGoals);
                            if (nextGoals >= 2) {
                              setTimeout(() => {
                                advanceGauntletSlot();
                              }, 1300);
                            } else {
                              setTimeout(() => {
                                setBattleState('IDLE');
                                setBattleWind(Math.floor(Math.random() * 21) - 10);
                              }, 1400);
                            }
                          }}
                          onBehind={() => {
                            setBattleState('BEHIND');
                            const nextMisses = battleGateMisses + 1;
                            setBattleGateMisses(nextMisses);
                            if (nextMisses >= 2) {
                              setTimeout(() => {
                                handleGauntletFailure('MISSED_KICK');
                              }, 1300);
                            } else {
                              setTimeout(() => {
                                setBattleState('IDLE');
                                setBattleWind(Math.floor(Math.random() * 21) - 10);
                              }, 1400);
                            }
                          }}
                          onMiss={() => {
                            setBattleState('MISS');
                            const nextMisses = battleGateMisses + 1;
                            setBattleGateMisses(nextMisses);
                            if (nextMisses >= 2) {
                              setTimeout(() => {
                                handleGauntletFailure('MISSED_KICK');
                              }, 1300);
                            } else {
                              setTimeout(() => {
                                setBattleState('IDLE');
                                setBattleWind(Math.floor(Math.random() * 21) - 10);
                              }, 1400);
                            }
                          }}
                        />
                      </>
                    ) : battleState === 'VICTORY' ? (
                      <div className="bg-zinc-950 border-2 border-green-500/30 rounded-xl p-5 space-y-4 text-center animate-fade-in text-white">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-6 w-6 text-yellow-500 animate-bounce" />
                            <span className="text-sm font-black italic uppercase tracking-wider text-yellow-500">CONQUEST MATCH WON!</span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">STADIUM PASS REGISTERED</span>
                        </div>

                        {/* Declaration of Who Won */}
                        <div className="p-3 bg-green-550/10 border border-green-500/20 rounded-lg text-left">
                          <span className="text-[9px] font-mono tracking-widest text-green-400 block uppercase font-bold">MATCH HERO HIGHLIGHT</span>
                          <p className="text-xs text-stone-200 mt-1 font-sans">
                            🏆 <span className="font-extrabold text-[#2dfb84]">YOU WIN THE BATTLE!</span>
                          </p>
                          <p className="text-[10px] text-zinc-350 font-mono mt-1 leading-relaxed">
                            Your champion kicker <strong className="text-white">{battleKickerCard.name}</strong> out-positioned all defenders to successfully defeat <strong className="text-red-400">{activeBattleNode.defenders[9]?.name || 'Defender 10'}</strong> on the final slot and secured control of <strong className="text-white">{activeBattleNode.name}</strong>!
                          </p>
                        </div>

                        {/* Hidden canvas to build image */}
                        <canvas
                          ref={conquestCanvasRef}
                          width={600}
                          height={450}
                          className="hidden"
                        />

                        {/* Digital Snapshot Certificate Frame */}
                        <div className="relative border border-white/10 rounded-lg overflow-hidden bg-zinc-900 shadow-xl aspect-[4/3] flex items-center justify-center">
                          {conquestSnapshot ? (
                            <img
                              src={conquestSnapshot}
                              alt="AFL Arena Conquest Certification"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center space-y-2 text-zinc-500 font-mono text-xs animate-pulse">
                              <Camera className="h-8 w-8 text-zinc-700" />
                              <span>GENERATING FACTION PASSPORT...</span>
                            </div>
                          )}
                        </div>

                        {/* Share & Save triggers */}
                        <div className="grid grid-cols-2 gap-3 pb-2">
                          <button
                            onClick={handleDownloadConquestSnapshot}
                            disabled={!conquestSnapshot}
                            className="bg-zinc-900 border border-white/10 hover:bg-zinc-850 disabled:opacity-50 text-white font-mono font-bold text-[10px] uppercase tracking-wider py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            id="download_conquest_snapshot_button"
                          >
                            <Download className="h-3.5 w-3.5 text-yellow-500" />
                            SAVE DIGITAL PASS
                          </button>
                          <button
                            onClick={handleCopyConquestStats}
                            className="bg-zinc-900 border border-white/10 hover:bg-zinc-850 text-white font-mono font-bold text-[10px] uppercase tracking-wider py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            id="share_conquest_stats_button"
                          >
                            <Share2 className="h-3.5 w-3.5 text-cyan-400" />
                            {conquestCopied ? 'COPIED!' : 'SHARE STATS'}
                          </button>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded text-left text-[11px] leading-relaxed text-yellow-400 font-mono mb-2">
                          🌟 <strong>Faction Claim Active:</strong> Securing this MCG virtual portal overrides rival configurations instantly. Share your achievement to assert your club's territory!
                        </div>

                        <button
                          onClick={handleCommitConquestWin}
                          className="w-full bg-green-500 hover:bg-green-400 text-black font-black text-xs py-4 rounded uppercase tracking-widest transition-all cursor-pointer font-sans"
                          id="conquest_victory_commit_button"
                        >
                          Commit Conquest Victory & Flip Color
                        </button>
                      </div>
                    ) : (
                      <div className="bg-zinc-950 border-2 border-red-900/40 rounded-xl p-5 space-y-4 text-center animate-fade-in text-white bg-gradient-to-b from-red-950/20 to-zinc-950">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-red-500 animate-pulse" />
                            <span className="text-xs font-black italic uppercase tracking-wider text-red-500">KICKING BATTLE DEFEAT</span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">GATE SECURITY INTACT</span>
                        </div>

                        {/* Statement of Who Won */}
                        <div className="py-4 px-3 bg-red-500/15 border border-red-500/30 rounded-lg text-left">
                          <span className="text-[9px] font-mono tracking-widest text-red-400 block uppercase font-bold">MATCH RESULTS OVERVIEW</span>
                          <p className="text-xs text-stone-200 mt-1 font-sans">
                            🛡️ <span className="font-extrabold text-red-500">DEFENDER WINS THE MATCH!</span>
                          </p>
                          <p className="text-[10.5px] text-zinc-350 font-mono mt-2 leading-relaxed">
                            Gate Guard <strong className="text-white">{activeBattleNode.defenders[battleCurrentSlot - 1]?.name || 'Guardian'}</strong> has successfully defended <strong className="text-yellow-500">Slot {battleCurrentSlot}</strong> of <strong className="text-white">{activeBattleNode.name}</strong>, defeating your kicker champion <strong className="text-red-400">{battleKickerCard.name}</strong>!
                          </p>
                          <p className="text-[9.5px] text-zinc-400 font-mono mt-2 italic leading-normal">
                            Reason: {battleFailureCause === 'TIMEOUT' ? 'LOCKOUT TIMEOUT REACHED (Expired approch duration)' : 'MISSED SHOT ON TARGET AREA'}
                          </p>
                        </div>

                        <div className="p-3 bg-zinc-900 rounded-lg border border-white/5 space-y-1.5 text-left text-[10px] font-mono text-zinc-400">
                          <h4 className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">ROSTER CASUALTIES REPORT</h4>
                          <p>
                            ❌ <span className="text-red-400 font-bold">{battleKickerCard.name}</span> is now <span className="text-red-500 font-black italic px-1 bg-red-950/40 border border-red-800/20">OMITTED</span> due to the strain of the failed challenge. Seek training to revitalize your squad.
                          </p>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/10 p-3 rounded text-left text-[10px] leading-relaxed text-red-350 font-mono">
                          💡 <strong>Pro Strategy Hint:</strong> Power indices determine curve rates on snap actions. Practice drop punts and snap kicks on the Specky training pitch to upgrade your swipe precision!
                        </div>

                        <button
                          onClick={() => {
                            setActiveBattleNode(null);
                          }}
                          className="w-full bg-red-650 hover:bg-red-550 text-white font-black text-xs py-3 rounded uppercase tracking-widest transition-all cursor-pointer font-mono border border-red-550/20"
                          id="conquest_fail_dismiss_button"
                        >
                          Acknowledge Defeat & Close
                        </button>
                      </div>
                    )}

                  </div>

                  {/* Footer abort button */}
                  <div className="bg-zinc-950 p-4 border-t border-white/5 flex justify-end">
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to exit? You lose lockout status progress!')) {
                          setActiveBattleNode(null);
                        }
                      }}
                      className="px-5 py-2.5 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white rounded text-xs font-black uppercase tracking-widest transition-colors"
                    >
                      ABORT RUN
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="bg-slate-950 border-t border-neutral-900 py-4 text-center text-[10px] text-stone-500 font-mono">
            FOOTYGO AR ECOSYSTEM ENGINE • 100% SECURE AND VERIFIED CONFLICT SHIELD CONSTRAINTS
          </footer>
        </>
      )}

    </div>
  );
}

// Clock duration seconds formatted
function ClockIndicator({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <span>
      Lockout Timer: {m}:{s < 10 ? '0' : ''}{s}
    </span>
  );
}
