import React, { useState, useRef, useEffect } from 'react';
import { PlayerCard, AFL_CLUBS } from '../types';
import { Trophy, RefreshCw, Zap, ArrowRight, Award, Compass, Sparkles, HelpCircle, ArrowUp, ArrowLeft, Heart, Home, Camera, Download, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SpeckyTrainingProps {
  cards: PlayerCard[];
  onTrainCard: (cardId: string, statsEarned: { power: number; skill: number; finesse: number; xp: number }) => void;
  onEarnWakeUpSession: () => void;
}

export default function SpeckyTraining({ cards, onTrainCard, onEarnWakeUpSession }: SpeckyTrainingProps) {
  // Filter available cards
  const trainableCards = cards.filter(c => !c.omitted);
  const [selectedCard, setSelectedCard] = useState<PlayerCard | null>(
    trainableCards.length > 0 ? trainableCards[0] : null
  );

  // Sync selection if list updates
  useEffect(() => {
    if (trainableCards.length > 0) {
      if (!selectedCard || !trainableCards.some(c => c.id === selectedCard.id)) {
        setSelectedCard(trainableCards[0]);
      } else {
        const latest = trainableCards.find(c => c.id === selectedCard.id);
        if (latest) setSelectedCard(latest);
      }
    } else {
      setSelectedCard(null);
    }
  }, [cards]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Specky Game Parameters
  const [gameState, setGameState] = useState<'READY' | 'KICKED' | 'SPRINGED' | 'MARKED' | 'DROPPED'>('READY');
  const [xpAwarded, setXpAwarded] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('PRESS RUN LEFT TO START THE DRILL!');
  const [trialsCount, setTrialsCount] = useState<number>(0);
  const [successfulSpeckies, setSuccessfulSpeckies] = useState<number>(0);

  // Snapshot generation attributes
  const [speckySnapshot, setSpeckySnapshot] = useState<string | null>(null);
  const [snapshotAltitude, setSnapshotAltitude] = useState<number>(0);
  const [snapshotVariance, setSnapshotVariance] = useState<number>(0);
  const [snapshotIsSpringed, setSnapshotIsSpringed] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Airborne state indicator
  const [isAirborneState, setIsAirborneState] = useState<boolean>(false);
  const isAirborneRef = useRef<boolean>(false);

  // Descending height target marker
  const descendingMarkerY = useRef<number>(20);
  const descendingMarkerTargetY = useRef<number>(140);

  // Dynamic jump prompts state
  const [jumpPrompt, setJumpPrompt] = useState<'JUMP' | 'SPRING' | 'FLY' | 'GROUNDED'>('JUMP');
  const jumpPromptRef = useRef<'JUMP' | 'SPRING' | 'FLY' | 'GROUNDED'>('JUMP');

  // Player upgrade state tracker
  const [allocatedPower, setAllocatedPower] = useState<number>(0);
  const [allocatedSkill, setAllocatedSkill] = useState<number>(0);
  const [allocatedFinesse, setAllocatedFinesse] = useState<number>(0);

  // AI Autopilot state
  const [aiAutopilotActive, setAiAutopilotActive] = useState<boolean>(false);
  const aiReadyToAttack = useRef<boolean>(false);

  // Simulation physics parameters
  const playerX = useRef<number>(520);
  const playerY = useRef<number>(280); // Ground position
  const playerVx = useRef<number>(0);
  const playerVy = useRef<number>(0);
  const playerAngle = useRef<number>(0); // For flips upon springing
  
  const ballX = useRef<number>(-30);
  const ballY = useRef<number>(120);
  const ballVx = useRef<number>(0);
  const ballVy = useRef<number>(0);
  const ballActive = useRef<boolean>(false);
  const ballLaunchHeightType = useRef<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');

  // Dynamic Computer Opponent Physics Refs
  const opponentX = useRef<number>(390);
  const opponentY = useRef<number>(280);
  const opponentVy = useRef<number>(0);
  const opponentVx = useRef<number>(0);
  const opponentState = useRef<'STAND' | 'RUNNING' | 'JUMPING' | 'SPOILED' | 'FLATTENED'>('STAND');
  const opponentDelayTimer = useRef<number>(0);

  // Dynamic 3rd Player (Contesting Hostile Marker) Physics Refs
  const thirdPlayerX = useRef<number>(220);
  const thirdPlayerY = useRef<number>(280);
  const thirdPlayerVy = useRef<number>(0);
  const thirdPlayerVx = useRef<number>(0);
  const thirdPlayerState = useRef<'STAND' | 'RUNNING' | 'JUMPING' | 'MARKED' | 'FLATTENED'>('STAND');
  const thirdPlayerDelayTimer = useRef<number>(0);

  // Key tracking state for desktop testing
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Triggering windows
  const isCatching = useRef<boolean>(false);
  const catchWindowFrames = useRef<number>(0);
  const particles = useRef<{ x: number; y: number; vx: number; vy: number; color: string; life: number }[]>([]);

  // Selected card club details for dynamic colors
  const cardClub = selectedCard 
    ? AFL_CLUBS.find(c => c.id === selectedCard.clubId) || AFL_CLUBS[0]
    : AFL_CLUBS[0];

  // Manual button drag tracking for on-screen controls
  const [isPressingLeft, setIsPressingLeft] = useState<boolean>(false);
  const [isPressingRight, setIsPressingRight] = useState<boolean>(false);

  // Initialize random scenario launch
  const resetDrill = () => {
    playerX.current = 450; // start a bit further right to give room to chase and runup
    playerY.current = 280;
    playerVx.current = 0;
    playerVy.current = 0;
    playerAngle.current = 0;
    setSpeckySnapshot(null);
    setIsCopied(false);
    aiReadyToAttack.current = false;

    // Reset computer opponent standing conditions & reactions
    opponentX.current = 350 + Math.random() * 50; // Random starting point between 350-400
    opponentY.current = 280;
    opponentVy.current = 0;
    opponentVx.current = 0;
    opponentState.current = 'STAND';
    opponentDelayTimer.current = 30 + Math.floor(Math.random() * 40); // 0.5 to 1.2s delay before running to spoil

    // Reset third player (Rival Marker) standing conditions & reactions
    thirdPlayerX.current = 180 + Math.random() * 80; // Starts a bit to the left to chase the football
    thirdPlayerY.current = 280;
    thirdPlayerVy.current = 0;
    thirdPlayerVx.current = 0;
    thirdPlayerState.current = 'STAND';
    thirdPlayerDelayTimer.current = 15 + Math.floor(Math.random() * 30); // Closer response than defender to contest the mark!

    // Ball launch configurations
    const launchOptions: ('HIGH' | 'MEDIUM' | 'LOW')[] = ['HIGH', 'MEDIUM', 'LOW'];
    const selectedType = launchOptions[Math.floor(Math.random() * launchOptions.length)];
    ballLaunchHeightType.current = selectedType;

    ballX.current = -30;
    ballActive.current = true;
    isCatching.current = false;
    catchWindowFrames.current = 0;
    particles.current = [];

    // Reset airborne state indicator
    setIsAirborneState(false);
    isAirborneRef.current = false;
    descendingMarkerY.current = -20;

    // Trajectory maths depending on type
    if (selectedType === 'HIGH') {
      descendingMarkerTargetY.current = 90 + Math.random() * 25;
      ballY.current = 140;
      ballVx.current = 4.3 + Math.random() * 0.8;
      ballVy.current = -5.8;
      setFeedback('WARNING: High looming ball! Time your approach to lift off the opponent\'s back!');
    } else if (selectedType === 'MEDIUM') {
      descendingMarkerTargetY.current = 135 + Math.random() * 25;
      ballY.current = 110;
      ballVx.current = 4.6 + Math.random() * 0.7;
      ballVy.current = -4.0;
      setFeedback('Mid-height lob! Auto-jump or spring off the opponent before they spoil!');
    } else {
      descendingMarkerTargetY.current = 175 + Math.random() * 25;
      ballY.current = 80;
      ballVx.current = 5.2 + Math.random() * 0.5;
      ballVy.current = -2.5;
      setFeedback('Direct fast drive! Sprint and jump fast to outreach the defender!');
    }

    setJumpPrompt('JUMP');
    jumpPromptRef.current = 'JUMP';

    setGameState('KICKED');
  };

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      
      if (e.key === ' ' || e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') {
        triggerJump();
      }
      if (e.key.toLowerCase() === 'c' || e.key === 'Enter') {
        triggerCatch();
      }
      if (e.key.toLowerCase() === 'r') {
        resetDrill();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, selectedCard]);

  const triggerJump = () => {
    if (gameState === 'MARKED' || gameState === 'DROPPED') return;

    // Check if player is on the ground for initial jump
    if (playerY.current >= 280) {
      playerVy.current = -7.4; 
      addParticles(playerX.current, playerY.current, '#ffffff', 8);
    } 
    // If already in the air and overlaps with opponent or third player, trigger springboard!
    else if (gameState !== 'SPRINGED' && playerY.current < 265 && playerY.current > 180) {
      let springTarget: 'OPPONENT' | 'RIVAL' | null = null;
      if (Math.abs(playerX.current - opponentX.current) < 40 && opponentState.current !== 'FLATTENED') {
        springTarget = 'OPPONENT';
      } else if (Math.abs(playerX.current - thirdPlayerX.current) < 40 && thirdPlayerState.current !== 'FLATTENED') {
        springTarget = 'RIVAL';
      }

      if (springTarget) {
        playerVy.current = -11.5; // Spectacular high-altitude vault!
        
        const targetX = springTarget === 'OPPONENT' ? opponentX.current : thirdPlayerX.current;
        if (playerX.current > targetX) {
          playerVx.current = Math.min(-1.5, playerVx.current - 1.2); // propel leftwards
        } else {
          playerVx.current = Math.max(1.5, playerVx.current + 1.2); // propel rightwards
        }

        setGameState('SPRINGED');
        if (springTarget === 'OPPONENT') {
          opponentState.current = 'FLATTENED';
        } else {
          thirdPlayerState.current = 'FLATTENED';
        }

        setFeedback('🔥 SPECTACULAR SPRING! LIFT OFF THE PACK\'S SHOULDERS!');
        addParticles(targetX, 235, '#eab308', 30);
      }
    }
  };

  const triggerCatch = () => {
    if (gameState === 'MARKED' || gameState === 'DROPPED') return;
    if (isCatching.current) return;

    isCatching.current = true;
    catchWindowFrames.current = 120; // 120 frames action window (2 seconds) to keep hands up and grab the footy
    addParticles(playerX.current, playerY.current - 45, '#38bdf8', 6);
  };

  const addParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        color,
        life: 20 + Math.random() * 20
      });
    }
  };

  // Main Canvas Rendering & Physics Update Loops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = 600;
    const height = 320;
    const groundLevelY = 280;

    const frameTick = () => {
      // --- UPDATE POSITIONS & PHYSIC VECTORS ---
      
      // Horizontal Run inputs (Keyboard or gamepad)
      let moveDir = 0;
      if (keysPressed.current['arrowright'] || keysPressed.current['d'] || isPressingRight) {
        moveDir = 1;
      } else if (keysPressed.current['arrowleft'] || keysPressed.current['a'] || isPressingLeft) {
        moveDir = -1;
      }

      // Pro-Active AI Autopilot Move Interception
      if (aiAutopilotActive && (gameState === 'KICKED' || gameState === 'SPRINGED')) {
        if (playerY.current >= groundLevelY) {
          if (playerX.current < 510 && !aiReadyToAttack.current) {
            moveDir = 1; // back off to build critical runup velocity momentum
          } else {
            aiReadyToAttack.current = true;
            moveDir = -1; // sprint towards oncoming launch pad!
          }
        } else {
          // If airborne, keep running left to align with balls approaching from left
          moveDir = -1;
        }
      }

      if (gameState !== 'MARKED' && gameState !== 'DROPPED') {
        const acceleration = 0.35;
        const friction = 0.88;
        
        // Horizontal force limits
        if (moveDir !== 0) {
          playerVx.current += moveDir * acceleration;
          const maxSpeed = 5.2;
          if (playerVx.current > maxSpeed) playerVx.current = maxSpeed;
          if (playerVx.current < -maxSpeed) playerVx.current = -maxSpeed;
        } else {
          playerVx.current *= friction;
        }

        playerX.current += playerVx.current;

        // --- AUTOMATIC KINETIC JUMP TRIGGER ACTUATORS ---
        // ONLY trigger automatically if AI Autopilot is active!
        if (aiAutopilotActive && gameState === 'KICKED') {
          // 1. Trigger initial autonomous jump from ground when within take-off bounds relative to dynamic opponent
          if (playerY.current >= 280) {
            if (playerX.current > opponentX.current) {
              // Running left towards opponent: trigger jump when close enough to get takeoff momentum
              if (playerX.current <= opponentX.current + 85 && playerX.current >= opponentX.current + 45) {
                triggerJump();
              }
            } else {
              // Running right towards opponent: trigger jump
              if (playerX.current >= opponentX.current - 85 && playerX.current <= opponentX.current - 45) {
                triggerJump();
              }
            }
          }
          // 2. Trigger spectacular springboard spring-off automatically when entering collision field of opponent or third player
          else if (gameState !== 'SPRINGED' && playerY.current < groundLevelY && playerY.current >= 180) {
            if (Math.abs(playerX.current - opponentX.current) < 40 || Math.abs(playerX.current - thirdPlayerX.current) < 40) {
              triggerJump();
            }
          }
        }

        // Gravity affects player height
        playerY.current += playerVy.current;
        if (playerY.current < groundLevelY) {
          playerVy.current += 0.33; // gravity pull
        } else {
          playerY.current = groundLevelY;
          playerVy.current = 0;
        }

        // Update Airborne State Reactive trigger
        const currentlyAirborne = playerY.current < groundLevelY;
        if (isAirborneRef.current !== currentlyAirborne) {
          isAirborneRef.current = currentlyAirborne;
          setIsAirborneState(currentlyAirborne);
        }

        // Calculate dynamic JMP button prompt using dynamic opponent or rival position
        let currentPrompt: 'JUMP' | 'SPRING' | 'FLY' | 'GROUNDED' = 'JUMP';
        if (!currentlyAirborne) {
          currentPrompt = 'JUMP';
        } else if (gameState !== 'SPRINGED' && playerY.current < 265 && playerY.current > 180 && (
          (Math.abs(playerX.current - opponentX.current) < 40 && opponentState.current !== 'FLATTENED') ||
          (Math.abs(playerX.current - thirdPlayerX.current) < 40 && thirdPlayerState.current !== 'FLATTENED')
        )) {
          currentPrompt = 'SPRING';
        } else if (gameState === 'SPRINGED') {
          currentPrompt = 'FLY';
        } else {
          currentPrompt = 'GROUNDED';
        }

        if (jumpPromptRef.current !== currentPrompt) {
          jumpPromptRef.current = currentPrompt;
          setJumpPrompt(currentPrompt);
        }

        // Keep player in bounds of canvas
        if (playerX.current < 25) playerX.current = 25;
        if (playerX.current > width - 25) playerX.current = width - 25;

        // Rotational animation on double jump vault flips
        if (gameState === 'SPRINGED') {
          playerAngle.current += 0.18; // flip rotation
        } else {
          playerAngle.current = playerAngle.current * 0.85; // return right-side up
        }
      }

      // --- ACTIVE COMPUTER OPPONENT INTELLIGENCE & PHYSICS STEPS ---
      if (gameState === 'KICKED' || gameState === 'SPRINGED') {
        if (opponentDelayTimer.current > 0) {
          opponentDelayTimer.current--;
        } else if (opponentState.current !== 'FLATTENED' && opponentState.current !== 'SPOILED') {
          // Running towards descending target location to perform defensive spoil intercept
          const hoverInterceptX = ballX.current + 18; // lead target interceptor offset
          const deltaX = hoverInterceptX - opponentX.current;
          const opponentRunSpeed = 2.4 + (selectedCard ? Math.min(2.0, selectedCard.level / 12) : 0); // speed scales slightly with player level
          
          if (opponentY.current >= 280) { // Grounded opponent
            opponentState.current = 'RUNNING';
            if (Math.abs(deltaX) > 12) {
              opponentVx.current = Math.sign(deltaX) * opponentRunSpeed;
            } else {
              opponentVx.current = 0;
              // Trigger defensive jumps precisely within the flight target window to punch the ball away
              if (ballVy.current > 0 && ballY.current > 120 && ballY.current < 210) {
                opponentVy.current = -7.1; // jump high!
                opponentState.current = 'JUMPING';
                addParticles(opponentX.current, opponentY.current, '#64748b', 8);
              }
            }
          } else {
            // Airborne opponent - decelerate horizontally
            opponentVx.current *= 0.95;
            opponentState.current = 'JUMPING';
          }
        }
      }

      // Execute opponent coordinate shifts
      if (opponentState.current !== 'FLATTENED') {
        opponentX.current += opponentVx.current;
        opponentY.current += opponentVy.current;
        if (opponentY.current < 280) {
          opponentVy.current += 0.31; // standard defender gravity
        } else {
          opponentY.current = 280;
          opponentVy.current = 0;
          opponentVx.current = 0;
          if (opponentState.current === 'JUMPING') {
            opponentState.current = 'STAND';
          }
        }
      } else {
        // Flat on floor - recovers from vault springboard
        opponentVx.current = 0;
        opponentVy.current = 0;
        opponentY.current = 280;
      }

      // Restrict computer bounds to playing arena boundary limits
      if (opponentX.current < 110) opponentX.current = 110;
      if (opponentX.current > width - 20) opponentX.current = width - 20;

      // --- ACTIVE THIRD PLAYER RIVAL INTERCEPTION & PHYSICS STEPS ---
      if (gameState === 'KICKED' || gameState === 'SPRINGED') {
        if (thirdPlayerDelayTimer.current > 0) {
          thirdPlayerDelayTimer.current--;
        } else if (thirdPlayerState.current !== 'FLATTENED' && thirdPlayerState.current !== 'MARKED') {
          // Running towards descending target location to perform standard catch intercept
          const hoverInterceptX = ballX.current; // Directly tracking ball's x coordinate
          const deltaX = hoverInterceptX - thirdPlayerX.current;
          const rivalRunSpeed = 2.5 + (selectedCard ? Math.min(1.5, selectedCard.level / 15) : 0);
          
          if (thirdPlayerY.current >= 280) { // Grounded rival
            thirdPlayerState.current = 'RUNNING';
            if (Math.abs(deltaX) > 10) {
              thirdPlayerVx.current = Math.sign(deltaX) * rivalRunSpeed;
            } else {
              thirdPlayerVx.current = 0;
              // Trigger a leap to grab the ball! Leap height of rival!
              if (ballVy.current > 0 && ballY.current > 110 && ballY.current < 200) {
                thirdPlayerVy.current = -7.6; // jump high for a mark!
                thirdPlayerState.current = 'JUMPING';
                addParticles(thirdPlayerX.current, thirdPlayerY.current, '#f97316', 8);
              }
            }
          } else {
            // Airborne rival
            thirdPlayerVx.current *= 0.96;
            thirdPlayerState.current = 'JUMPING';
          }
        }
      }

      // Execute third player coordinate shifts
      if (thirdPlayerState.current !== 'FLATTENED') {
        thirdPlayerX.current += thirdPlayerVx.current;
        thirdPlayerY.current += thirdPlayerVy.current;
        if (thirdPlayerY.current < 280) {
          thirdPlayerVy.current += 0.32; // standard rival gravity
        } else {
          thirdPlayerY.current = 280;
          thirdPlayerVy.current = 0;
          thirdPlayerVx.current = 0;
          if (thirdPlayerState.current === 'JUMPING') {
            thirdPlayerState.current = 'STAND';
          }
        }
      } else {
        thirdPlayerVx.current = 0;
        thirdPlayerVy.current = 0;
        thirdPlayerY.current = 280;
      }

      // Restrict third player bounds
      if (thirdPlayerX.current < 50) thirdPlayerX.current = 50;
      if (thirdPlayerX.current > width - 50) thirdPlayerX.current = width - 50;

      // --- THIRD PLAYER RIVAL MARKING CHECK ---
      if (ballActive.current && gameState !== 'MARKED' && gameState !== 'DROPPED' && thirdPlayerState.current !== 'FLATTENED') {
        // High reach contact check for the rival marker
        const thirdPlayerReachY = thirdPlayerY.current - 53;
        const rivalToBallDist = Math.hypot(thirdPlayerX.current - ballX.current, thirdPlayerReachY - ballY.current);
        const catchOverlapDistance = 32;

        if (rivalToBallDist < catchOverlapDistance && playerY.current >= 275) { // If player is too late or grounded, rival steals the mark!
          ballActive.current = false;
          setTrialsCount(prev => prev + 1);
          thirdPlayerState.current = 'MARKED';
          setGameState('DROPPED');
          
          setFeedback('❌ STOLEN! Marked by the rival stickman! Spring off the pack to outstretch them next time!');
          addParticles(ballX.current, ballY.current, '#f97316', 35); // orange-red warning sparks

          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate([150, 80]); // dual vibration pattern
          }
          
          setTimeout(() => {
            resetDrill();
          }, 2400);
        }
      }

      // --- SPOILER ACCIDENT VERIFICATION CHECK ---
      if (ballActive.current && gameState !== 'MARKED' && gameState !== 'DROPPED' && opponentState.current !== 'FLATTENED') {
        // High reach contact check
        const opponentReachY = opponentY.current - 53;
        const opponentToBallDist = Math.hypot(opponentX.current - ballX.current, opponentReachY - ballY.current);
        const spoilLimit = 28;

        if (opponentToBallDist < spoilLimit && playerY.current >= 278) { // If player is grounded or jumps late, opponent spoils!
          // Punch ball away
          ballActive.current = false;
          setTrialsCount(prev => prev + 1);
          opponentState.current = 'SPOILED';
          setGameState('DROPPED');
          
          setFeedback('❌ SPOILED BY DEFENDER! Defensive punch! Time your approach and takeoff precisely to lift off their shoulders!');
          addParticles(ballX.current, ballY.current, '#ef4444', 35); // orange-red warning sparks

          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate([150, 80]); // double drop vibration pattern
          }
          
          // Replay triggers shortly
          setTimeout(() => {
            resetDrill();
          }, 2400);
        }
      }

      // Ball Trajectory update
      if (ballActive.current && gameState !== 'MARKED') {
        ballVy.current += 0.11; // Ball gravity (slower for nice arcade arc)
        ballX.current += ballVx.current;
        ballY.current += ballVy.current;

        // Check if ball dropped to the ground
        if (ballY.current >= groundLevelY + 12 || ballX.current > width + 30) {
          ballActive.current = false;
          setTrialsCount(prev => prev + 1);
          resetDrill();
        }
      }

      // Descending Marker Lerp Animation
      if (gameState === 'KICKED' || gameState === 'SPRINGED') {
        // Physics-based lerp animation
        descendingMarkerY.current += (descendingMarkerTargetY.current - descendingMarkerY.current) * 0.045;
      }

      // Universal Automatic Catch Trigger Actuator
      if (ballActive.current && (gameState === 'KICKED' || gameState === 'SPRINGED') && !isCatching.current) {
        const handOffsetX = Math.sin(playerAngle.current) * 15;
        const handOffsetY = - 40 - Math.cos(playerAngle.current) * 15;
        const handsX = playerX.current + handOffsetX;
        const handsY = playerY.current + handOffsetY;
        const distanceToBall = Math.hypot(handsX - ballX.current, handsY - ballY.current);
        const playerCenterY = playerY.current - 45;
        const heightDifference = Math.abs(playerCenterY - descendingMarkerY.current);
        
        // Exact precise catch overlap and timing window - automatically trigger catch sequence
        if (distanceToBall <= 36 && heightDifference <= 40) {
          triggerCatch();
        }
      }

      // Handle catch window timing bounds
      if (isCatching.current) {
        catchWindowFrames.current--;
        if (catchWindowFrames.current <= 0) {
          isCatching.current = false;
        }

        // EVALUATE CATCH INTERSECTION COORDINATES
        // Player's hands typically extend above their torso
        const handOffsetX = Math.sin(playerAngle.current) * 15;
        const handOffsetY = - 40 - Math.cos(playerAngle.current) * 15;
        const handsX = playerX.current + handOffsetX;
        const handsY = playerY.current + handOffsetY;

        const distanceToBall = Math.hypot(handsX - ballX.current, handsY - ballY.current);
        const catchOverlapDistance = 35; // generous hit-sphere for spectacular feel

        // Height alignment timing evaluation
        const playerCenterY = playerY.current - 45;
        const heightDifference = Math.abs(playerCenterY - descendingMarkerY.current);
        const timingThreshold = 40; // timing height alignment pixel threshold

        if (distanceToBall < catchOverlapDistance && ballActive.current && gameState !== 'MARKED') {
          // Verify both distance and timing alignment on the descending height marker
          if (heightDifference <= timingThreshold) {
            setGameState('MARKED');
            ballActive.current = false;

            // Trigger premium crisp haptic vibe pattern for a spectacular mark!
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
              navigator.vibrate([100, 50, 150]);
            }
            
            const altitudeCalculated = Math.round(320 - playerCenterY);
            const varianceCalculated = Math.round(heightDifference);
            const isSpringed = gameState === 'SPRINGED';

            setSnapshotAltitude(altitudeCalculated);
            setSnapshotVariance(varianceCalculated);
            setSnapshotIsSpringed(isSpringed);

            setTimeout(() => {
              if (canvasRef.current) {
                try {
                  const url = canvasRef.current.toDataURL('image/png');
                  setSpeckySnapshot(url);
                } catch (e) {
                  console.error("Failed to capture canvas snapshot:", e);
                }
              }
            }, 120);
            
            let xpGained = 25;
            // Spring off NPC yields Double XP spectacular Mark bonus!
            if (gameState === 'SPRINGED') {
              xpGained = 60;
              setFeedback(`🏆 PERFECT PACK MARK CONQUERED! Align variance: ${Math.round(heightDifference)}px. 60 XP committed!`);
            } else {
              setFeedback(`⭐ SOLID CHEST MARK! Height match within target bounds (+${Math.round(heightDifference)}px).`);
            }

            setXpAwarded(xpGained);
            setSuccessfulSpeckies(prev => prev + 1);
            setTrialsCount(prev => prev + 1);
            onEarnWakeUpSession();
            addParticles(handsX, handsY, '#facc15', 30); // explode gold sparks!
          } else {
            // Bad timing height! Ball is dropped! Auto-replay instantly!
            ballActive.current = false;
            setTrialsCount(prev => prev + 1);
            addParticles(handsX, handsY, '#ef4444', 15);
            resetDrill();
          }
        }
      }

      // Update particle physics
      particles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // light gravity falling
        p.life--;
      });
      particles.current = particles.current.filter(p => p.life > 0);


      // --- RENDER EVERYTHING TO THE CANVAS ---
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Green grass field with light stripes
      const grassGrad = ctx.createLinearGradient(0, 0, 0, height);
      grassGrad.addColorStop(0, '#0c2212');
      grassGrad.addColorStop(0.3, '#103018');
      grassGrad.addColorStop(0.8, '#143c1e');
      grassGrad.addColorStop(1, '#1b4d24');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, 0, width, height);

      // Turf stripes (light green overlay lines)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let x = 0; x < width; x += 60) {
        if ((x / 60) % 2 === 0) {
          ctx.fillRect(x, 0, 30, height);
        }
      }

      // Floor ground line
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, groundLevelY);
      ctx.lineTo(width, groundLevelY);
      ctx.stroke();

      // Horizontal lines or track bars
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1.5;
      for (let x = 50; x < width; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, groundLevelY);
        ctx.stroke();
      }

      // 2. Draw Distance numbers exactly like the user's sketch diagram (50M, 60M)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
      ctx.font = 'black 105px monospace';
      ctx.fillText('50 M', 70, 220);
      ctx.fillText('60 M', 330, 220);

      // Draw beautiful stadium floodlight glow cones
      const leftLightGrad = ctx.createRadialGradient(0, 0, 10, 80, 80, 240);
      leftLightGrad.addColorStop(0, 'rgba(253, 224, 71, 0.2)');
      leftLightGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = leftLightGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(240, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      const rightLightGrad = ctx.createRadialGradient(width, 0, 10, width - 80, 80, 240);
      rightLightGrad.addColorStop(0, 'rgba(253, 224, 71, 0.2)');
      rightLightGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = rightLightGrad;
      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(width - 240, height);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Floodlight clusters
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-10, -10, 60, 35);
      ctx.fillRect(width - 50, -10, 60, 35);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(10, 10, 6, 0, Math.PI * 2);
      ctx.arc(30, 10, 6, 0, Math.PI * 2);
      ctx.arc(width - 30, 10, 6, 0, Math.PI * 2);
      ctx.arc(width - 10, 10, 6, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw particles
      particles.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1.0, p.life / 15);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 + Math.random() * 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // 4. Draw Active Computer Opponent Stickman
      ctx.save();
      ctx.translate(opponentX.current, opponentY.current);

      // Contrast color for opposition rival defender (Azure Blue / Charcoal Gray)
      ctx.strokeStyle = '#1d4ed8'; // Royal blue elite outline
      ctx.fillStyle = '#3b82f6'; // Bright azure fill
      ctx.lineWidth = 3.5;

      const opState = opponentState.current;

      if (opState === 'FLATTENED') {
        // FLAT/PANCAKED POSTURE (squashed low, recovering from successful springboard vault)
        // Squashed Head
        ctx.beginPath();
        ctx.arc(0, -18, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Crouched flat body
        ctx.strokeStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.quadraticCurveTo(-15, -10, -25, 0);
        ctx.moveTo(0, -12);
        ctx.quadraticCurveTo(15, -10, 25, 0);
        ctx.stroke();

        // Tiny stars circle to symbolize "seeing stars"
        const starsAngle = (Date.now() / 150) % (Math.PI * 2);
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(Math.cos(starsAngle) * 12, -28 + Math.sin(starsAngle) * 3, 2, 0, Math.PI * 2);
        ctx.arc(Math.cos(starsAngle + Math.PI) * 12, -28 + Math.sin(starsAngle + Math.PI) * 3, 2, 0, Math.PI * 2);
        ctx.fill();

      } else if (opState === 'JUMPING') {
        // airborne / jumping - arms extended high to spoil
        // Head
        ctx.beginPath();
        ctx.arc(0, -50, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spine (Extended fully straight)
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.lineTo(0, -15);
        ctx.stroke();

        // Legs hanging down
        ctx.strokeStyle = '#2563eb';
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(-8, 5);
        ctx.lineTo(-12, 10);
        ctx.moveTo(0, -15);
        ctx.lineTo(8, 4);
        ctx.lineTo(11, 10);
        ctx.stroke();

        // Spoiling Arms extended straight up high!
        ctx.strokeStyle = '#1d4ed8';
        ctx.beginPath();
        ctx.moveTo(-4, -38);
        ctx.lineTo(-10, -68); // Punching high left
        ctx.moveTo(4, -38);
        ctx.lineTo(10, -68); // Punching high right
        ctx.stroke();

        // Fists
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(-10, -68, 3.5, 0, Math.PI * 2);
        ctx.arc(10, -68, 3.5, 0, Math.PI * 2);
        ctx.fill();

      } else if (opState === 'RUNNING') {
        // Running stance
        const opponentRunPhase = (Date.now() / 120) % (Math.PI * 2);
        const opponentRunDir = Math.sign(opponentVx.current) || -1;

        // Head (leaning frontwards towards heading)
        ctx.beginPath();
        ctx.arc(opponentRunDir * 3, -48, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spine
        ctx.beginPath();
        ctx.moveTo(opponentRunDir * 2, -41);
        ctx.lineTo(0, -15);
        ctx.stroke();

        // Alternate running legs
        ctx.strokeStyle = '#2563eb';
        const leftLegSwing = Math.sin(opponentRunPhase) * 16;
        const rightLegSwing = -Math.sin(opponentRunPhase) * 16;

        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(leftLegSwing, -3);
        ctx.lineTo(opponentRunDir * 6 + leftLegSwing, 0); // contact feet
        ctx.moveTo(0, -15);
        ctx.lineTo(rightLegSwing, -3);
        ctx.lineTo(opponentRunDir * 6 + rightLegSwing, 0);
        ctx.stroke();

        // Arms swinging dynamic
        ctx.strokeStyle = '#1d4ed8';
        ctx.beginPath();
        ctx.moveTo(-3, -34);
        ctx.lineTo(opponentRunDir * 8, -25);
        ctx.moveTo(3, -34);
        ctx.lineTo(opponentRunDir * -8, -25);
        ctx.stroke();

      } else {
        // STAND / DEFAULT SHOWDOWN BRACING LAYER
        // Head
        ctx.beginPath();
        ctx.arc(0, -48, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spine
        ctx.beginPath();
        ctx.moveTo(0, -41);
        ctx.lineTo(0, -15);
        ctx.stroke();

        // Firm standing legs
        ctx.strokeStyle = '#2563eb';
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(-12, 0);
        ctx.moveTo(0, -15);
        ctx.lineTo(12, 0);
        ctx.stroke();

        // Braced arms on hips
        ctx.strokeStyle = '#1d4ed8';
        ctx.beginPath();
        ctx.moveTo(-4, -34);
        ctx.lineTo(-12, -24);
        ctx.lineTo(-4, -18);
        ctx.moveTo(4, -34);
        ctx.lineTo(12, -24);
        ctx.lineTo(4, -18);
        ctx.stroke();
      }

      ctx.restore();

      // 4.5 Draw Real Dynamic 3rd Player (Orange Rival Marker trying to mark the ball)
      ctx.save();
      ctx.translate(thirdPlayerX.current, thirdPlayerY.current);

      ctx.strokeStyle = '#ea580c'; // Neon Orange outline
      ctx.fillStyle = '#fdba74'; // Peach / Apricot fill
      ctx.lineWidth = 3.5;

      const rState = thirdPlayerState.current;

      if (rState === 'FLATTENED') {
        // Squashed Head
        ctx.beginPath();
        ctx.arc(0, -18, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Crouched flat body
        ctx.strokeStyle = '#fdba74';
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.quadraticCurveTo(-15, -10, -25, 0);
        ctx.moveTo(0, -12);
        ctx.quadraticCurveTo(15, -10, 25, 0);
        ctx.stroke();

        // Tiny stars circle to symbolize "seeing stars"
        const starsAngle = (Date.now() / 150) % (Math.PI * 2);
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(Math.cos(starsAngle) * 12, -28 + Math.sin(starsAngle) * 3, 2, 0, Math.PI * 2);
        ctx.arc(Math.cos(starsAngle + Math.PI) * 12, -28 + Math.sin(starsAngle + Math.PI) * 3, 2, 0, Math.PI * 2);
        ctx.fill();

      } else if (rState === 'JUMPING' || rState === 'MARKED') {
        // Head
        ctx.beginPath();
        ctx.arc(0, -50, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spine
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.lineTo(0, -15);
        ctx.stroke();

        // Legs hanging down
        ctx.strokeStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(-8, 5);
        ctx.lineTo(-12, 11);
        ctx.moveTo(0, -15);
        ctx.lineTo(8, 4);
        ctx.lineTo(11, 11);
        ctx.stroke();

        // Arms reaching up to grab state
        ctx.strokeStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-4, -38);
        ctx.lineTo(-14, -62);
        ctx.moveTo(4, -38);
        ctx.lineTo(14, -62);
        ctx.stroke();

        // If the third player secured the ball, draw the ball in their high-extended hands!
        if (rState === 'MARKED') {
          ctx.fillStyle = '#c2410c'; // Saturated red-brown footy
          ctx.strokeStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(0, -68, 12, 7.5, -Math.PI / 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

      } else if (rState === 'RUNNING') {
        const rivalRunPhase = (Date.now() / 125) % (Math.PI * 2);
        const rivalRunDir = Math.sign(thirdPlayerVx.current) || -1;

        // Head
        ctx.beginPath();
        ctx.arc(rivalRunDir * 3, -48, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spine
        ctx.beginPath();
        ctx.moveTo(rivalRunDir * 2, -41);
        ctx.lineTo(0, -15);
        ctx.stroke();

        // Alternate running legs
        ctx.strokeStyle = '#f97316';
        const leftLegSwing = Math.sin(rivalRunPhase) * 16;
        const rightLegSwing = -Math.sin(rivalRunPhase) * 16;

        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(leftLegSwing, -3);
        ctx.lineTo(rivalRunDir * 6 + leftLegSwing, 0);
        ctx.moveTo(0, -15);
        ctx.lineTo(rightLegSwing, -3);
        ctx.lineTo(rivalRunDir * 6 + rightLegSwing, 0);
        ctx.stroke();

        // Arms swinging
        ctx.strokeStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-3, -34);
        ctx.lineTo(rivalRunDir * 8, -25);
        ctx.moveTo(3, -34);
        ctx.lineTo(rivalRunDir * -8, -25);
        ctx.stroke();

      } else {
        // STAND
        // Head
        ctx.beginPath();
        ctx.arc(0, -48, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spine
        ctx.beginPath();
        ctx.moveTo(0, -41);
        ctx.lineTo(0, -15);
        ctx.stroke();

        // Standing legs
        ctx.strokeStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(-12, 0);
        ctx.moveTo(0, -15);
        ctx.lineTo(12, 0);
        ctx.stroke();

        // Arms
        ctx.strokeStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-4, -34);
        ctx.lineTo(-12, -24);
        ctx.lineTo(-4, -18);
        ctx.moveTo(4, -34);
        ctx.lineTo(12, -24);
        ctx.lineTo(4, -18);
        ctx.stroke();
      }

      ctx.restore();

      // 5. Draw Pink Player Stickman (Pink outlines, purple feet mimicking user layout exactly!)
      ctx.save();
      ctx.translate(playerX.current, playerY.current);
      ctx.rotate(playerAngle.current);

      ctx.strokeStyle = '#ec4899'; // Hot Pink outline
      ctx.fillStyle = '#f472b6'; // Lighter pink filling
      ctx.lineWidth = 4;

      // Head
      ctx.beginPath();
      ctx.arc(0, -45, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Torso leaning dynamics
      ctx.beginPath();
      ctx.moveTo(0, -37);
      ctx.lineTo(moveDir * 3, -15);
      ctx.stroke();

      // Back backpack details inside the mockup
      ctx.fillStyle = '#000000';
      ctx.fillRect(-6, -34, 5, 12);

      // Running Legs (Purple)
      ctx.strokeStyle = '#a855f7'; // Purple limbs
      ctx.lineWidth = 3.5;

      const runPhase = (Date.now() / 110) % (Math.PI * 2);
      const isAirborne = playerY.current < groundLevelY;

      let legL1 = 0, legL2 = 0;
      let legR1 = 0, legR2 = 0;

      if (isAirborne) {
        // Vaulting / fly positioning
        legL1 = 15; legL2 = -5;
        legR1 = -18; legR2 = -15;
      } else if (moveDir !== 0) {
        // Running cycle
        legL1 = Math.sin(runPhase) * 16;
        legL2 = Math.cos(runPhase) * 12 + 10;
        legR1 = -Math.sin(runPhase) * 16;
        legR2 = -Math.cos(runPhase) * 12 + 10;
      } else {
        // Stationary stance
        legL1 = -8; legL2 = 12;
        legR1 = 8; legR2 = 12;
      }

      // Left leg
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(legL1, -5);
      ctx.lineTo(legL1 + legL2 * 0.4, 0);
      ctx.stroke();

      // Black boots at the end of purple bounds
      ctx.fillStyle = '#000000';
      ctx.fillRect(legL1 + legL2 * 0.4 - 3, -1, 7, 3);

      // Right leg
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(legR1, -5);
      ctx.lineTo(legR1 + legR2 * 0.4, 0);
      ctx.stroke();

      ctx.fillRect(legR1 + legR2 * 0.4 - 3, -1, 7, 3);

      // Arms (reaching up above torso to prepare for spectacular mark)
      ctx.strokeStyle = '#ec4899'; // Hot pink arms
      ctx.lineWidth = 3.5;

      if (isCatching.current) {
        // High reaching claws
        ctx.beginPath();
        ctx.moveTo(-3, -32);
        ctx.lineTo(-15, -60);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(3, -32);
        ctx.lineTo(15, -60);
        ctx.stroke();

        // White glowing catch hit box circle mockup
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -58, 22, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Running arms swing
        const armLeftAngle = Math.sin(runPhase) * 12;
        ctx.beginPath();
        ctx.moveTo(-3, -32);
        ctx.lineTo(-12 + armLeftAngle, -18);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(3, -32);
        ctx.lineTo(12 - armLeftAngle, -18);
        ctx.stroke();
      }

      ctx.restore();

      // Draw Descending Timing Height Marker
      if (gameState === 'KICKED' || gameState === 'SPRINGED') {
        ctx.save();
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.75)'; // Golden neon yellow
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2.5;

        // Draw horizontal line
        ctx.beginPath();
        ctx.moveTo(30, descendingMarkerY.current);
        ctx.lineTo(width - 30, descendingMarkerY.current);
        ctx.stroke();

        // Draw side arrows or bounding boxes for "Target Catch altitude"
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('◀─── DESCENT MARK ALTITUDE ───▶', width / 2 - 90, descendingMarkerY.current - 6);

        // Highlight player overlap! If player overlaps, make the marker turn neon green
        const playerCenterY = playerY.current - 45;
        const isCurrentlyAligned = Math.abs(playerCenterY - descendingMarkerY.current) <= 40;
        if (isCurrentlyAligned) {
          ctx.strokeStyle = '#22c55e'; // Green when perfectly aligned
          ctx.fillStyle = '#22c55e';
          ctx.font = 'black 9px monospace';
          ctx.fillText('✨ PERFECT HEIGHT MATCH! PRESS CATCH! ✨', width / 2 - 105, descendingMarkerY.current + 16);
          
          // Draw bright pulsing circles on the ends
          ctx.beginPath();
          ctx.arc(30, descendingMarkerY.current, 6, 0, Math.PI * 2);
          ctx.arc(width - 30, descendingMarkerY.current, 6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Draw standard circular anchors
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(30, descendingMarkerY.current, 4, 0, Math.PI * 2);
          ctx.arc(width - 30, descendingMarkerY.current, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // 6. Draw flying golden Sherrin Footy
      if (ballActive.current) {
        ctx.save();
        ctx.translate(ballX.current, ballY.current);
        const spin = (Date.now() / 60) % (Math.PI * 2);
        ctx.rotate(spin);

        // Render golden ball shape
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Render visual trail markings
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.stroke();

        ctx.restore();

        // Parabolic preview dotted trail lines
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.255)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(ballX.current, ballY.current, 13, 0, Math.PI * 2);
        ctx.stroke();
      } else if (gameState === 'MARKED') {
        // Stick the ball to player's hands on top
        ctx.save();
        const handOffsetX = Math.sin(playerAngle.current) * 15;
        const handOffsetY = - 56 - Math.cos(playerAngle.current) * 15;
        ctx.translate(playerX.current + handOffsetX, playerY.current + handOffsetY);
        
        ctx.fillStyle = '#b43a24'; // Leather red once secured
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 7.5, -Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 7. Draw AI PILOT ACTIVE watermark status label
      if (aiAutopilotActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.fillRect(8, 8, 126, 22);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.55)';
        ctx.lineWidth = 1;
        ctx.strokeRect(8, 8, 126, 22);

        ctx.fillStyle = '#06b6d4';
        ctx.font = 'bold 9px monospace';
        const blink = (Date.now() / 280) % 2 > 1 ? '●' : ' ';
        ctx.fillText(`${blink} AI ASSIST ENGAGED`, 15, 22);
        ctx.restore();
      }

      animId = requestAnimationFrame(frameTick);
    };

    frameTick();

    return () => cancelAnimationFrame(animId);
  }, [gameState, isPressingLeft, isPressingRight, aiAutopilotActive]);


  const commitUpgrades = () => {
    if (!selectedCard) return;
    onTrainCard(selectedCard.id, {
      power: allocatedPower,
      skill: allocatedSkill,
      finesse: allocatedFinesse,
      xp: -(allocatedPower + allocatedSkill + allocatedFinesse) * 100
    });
    setAllocatedPower(0);
    setAllocatedSkill(0);
    setAllocatedFinesse(0);
  };

  const handleClaimReward = () => {
    if (!selectedCard) return;
    
    // Add gained training XP to selected card
    onTrainCard(selectedCard.id, {
      power: 0,
      skill: 0,
      finesse: 0,
      xp: xpAwarded
    });

    setGameState('READY');
    setXpAwarded(0);
  };

  const handleCopyStats = () => {
    const statsText = `🏆 TRIPLE-A SPECKY MARK DETECTED! 🏆\n` +
      `👤 Player: ${selectedCard ? selectedCard.name : 'AFL Star'}\n` +
      `🏉 Club: ${cardClub ? cardClub.name : 'Star League'}\n` +
      `📈 Altitude: ${snapshotAltitude}px (Virtual)\n` +
      `🎯 Alignment Accuracy: ${100 - Math.min(100, Math.round(snapshotVariance * 2.5))}%\n` +
      `🚀 Vault Springboard: ${snapshotIsSpringed ? 'OFF-NPC (Spectacular x2.0)' : 'SOLID RUNNER'}\n` +
      `🎉 Total XP Earned: +${xpAwarded} XP\n` +
      `Play the AFL Specky Coach simulation now!`;
    
    navigator.clipboard.writeText(statsText)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy text: ", err);
      });
  };

  const handleDownloadSnapshot = () => {
    if (!speckySnapshot) return;
    const link = document.createElement('a');
    link.download = `AFL-Specky-Mark-${selectedCard ? selectedCard.name.replace(/\s+/g, '-') : 'Mark'}-${Date.now()}.png`;
    link.href = speckySnapshot;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
      
      {/* LEFT COLUMN: Roster card focus selector and upgrade values */}
      <div className="lg:col-span-4 space-y-4">
        
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" />
              SELECT SQUAD KICKER TO TRAIN
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">Pick any active card to allocate physical training rewards below.</span>
          </div>

          {trainableCards.length === 0 ? (
            <div className="bg-zinc-950 p-4 text-center rounded border border-red-500/10 text-red-400 text-xs uppercase font-mono">
              ⚠️ All squad members are Omitted! Revive them in the Locker using wake-ups first.
            </div>
          ) : (
            <select
              value={selectedCard?.id || ''}
              onChange={(e) => {
                const found = trainableCards.find(c => c.id === e.target.value);
                if (found) setSelectedCard(found);
              }}
              className="w-full bg-zinc-950 border border-white/10 rounded px-3 py-2 text-xs font-mono text-white tracking-wider uppercase focus:outline-none focus:border-yellow-500"
            >
              {trainableCards.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (LVL {c.level} • {c.tier})
                </option>
              ))}
            </select>
          )}

          {selectedCard && (
            <div className="bg-zinc-950 border border-white/5 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-stone-200">{selectedCard.name}</span>
                <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase font-black">
                  {selectedCard.tier}
                </span>
              </div>

              {/* Stats display */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-500">XP LIMITS:</span>
                  <span className="text-white font-bold">{selectedCard.xp} / 100</span>
                </div>
                
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-500">POWER (+{allocatedPower}):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{selectedCard.power + allocatedPower}</span>
                    <button
                      disabled={selectedCard.power + allocatedPower >= 100 || selectedCard.xp < (allocatedPower + allocatedSkill + allocatedFinesse + 1) * 100}
                      onClick={() => setAllocatedPower(prev => prev + 1)}
                      className="px-1.5 bg-yellow-500 text-black font-black text-xs rounded hover:bg-yellow-400 disabled:opacity-20 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-500">SKILL (+{allocatedSkill}):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{selectedCard.skill + allocatedSkill}</span>
                    <button
                      disabled={selectedCard.skill + allocatedSkill >= 100 || selectedCard.xp < (allocatedPower + allocatedSkill + allocatedFinesse + 1) * 100}
                      onClick={() => setAllocatedSkill(prev => prev + 1)}
                      className="px-1.5 bg-yellow-500 text-black font-black text-xs rounded hover:bg-yellow-400 disabled:opacity-20 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-500">FINESSE (+{allocatedFinesse}):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{selectedCard.finesse + allocatedFinesse}</span>
                    <button
                      disabled={selectedCard.finesse + allocatedFinesse >= 100 || selectedCard.xp < (allocatedPower + allocatedSkill + allocatedFinesse + 1) * 100}
                      onClick={() => setAllocatedFinesse(prev => prev + 1)}
                      className="px-1.5 bg-yellow-500 text-black font-black text-xs rounded hover:bg-yellow-400 disabled:opacity-20 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Commit changes */}
              {(allocatedPower > 0 || allocatedSkill > 0 || allocatedFinesse > 0) && (
                <button
                  onClick={commitUpgrades}
                  className="w-full mt-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black uppercase tracking-wider py-2 rounded transition-transform cursor-pointer"
                >
                  APPLY SPENT SPECIALS (-{(allocatedPower + allocatedSkill + allocatedFinesse) * 100} XP)
                </button>
              )}
            </div>
          )}
        </div>

        {/* TRIAL METRICS BOARD */}
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex justify-between items-center text-center">
          <div className="flex-1 border-r border-white/5">
            <span className="text-[10px] text-zinc-500 block uppercase font-mono tracking-wider">DRILL TRIALS</span>
            <span className="text-xl font-mono font-black text-stone-200">{trialsCount}</span>
          </div>
          <div className="flex-1">
            <span className="text-[10px] text-zinc-500 block uppercase font-mono tracking-wider">SPECKIES SECURED</span>
            <span className="text-xl font-mono font-black text-yellow-500">{successfulSpeckies}</span>
          </div>
        </div>
      </div>

      {/* CENTER COLUMN: Interactive Game Stage */}
      <div className="lg:col-span-8 flex flex-col items-center justify-between space-y-4">
        
        {/* Drill feedback status banner */}
        <div className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 flex justify-between items-center shadow-lg px-4 gap-4">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-yellow-500 animate-spin" />
            <div>
              <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block font-bold">SPECKY ONBOARDING INSTRUCTIONS</span>
              <p className="text-xs text-white uppercase font-black tracking-wide font-mono leading-tight">
                {feedback}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* AI AUTOPILOT PORTAL TRIGGER */}
            <button
              onClick={() => {
                const updated = !aiAutopilotActive;
                setAiAutopilotActive(updated);
                setFeedback(updated ? "AI ASSIST INSTANTLY ENGAGED! JUST STAND BACK AND WATCH A MASTERPIECE." : "AI PILOT OFF. YOU HAVE THE REINS CONTROLLER IN CONTROL!");
              }}
              className={`font-mono font-black text-[9px] tracking-wider uppercase px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                aiAutopilotActive 
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.55)]' 
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700'
              }`}
            >
              <Sparkles className={`h-3 w-3 ${aiAutopilotActive ? 'animate-pulse text-zinc-950' : 'text-cyan-400'}`} />
              {aiAutopilotActive ? 'AI ON' : 'AI ASSIST'}
            </button>

            {gameState === 'READY' && (
              <button
                onClick={resetDrill}
                className="bg-yellow-500 text-black hover:bg-yellow-400 font-black text-[10px] tracking-wider uppercase px-4 py-2 rounded shadow-lg flex items-center gap-1.5 transition-transform shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                LAUNCH BALL
              </button>
            )}
          </div>
        </div>

        {/* Live Physics HUD Meter */}
        <div className="w-full bg-zinc-900/80 backdrop-blur-sm border border-white/5 rounded-xl p-3 px-5 flex justify-between items-center font-mono text-[10px] uppercase tracking-wider leading-none shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">PACK STATE:</span>
            {isAirborneState ? (
              <span className="text-sky-400 font-black animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                ✈️ AIRBORNE
              </span>
            ) : (
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                🏃 GROUNDED
              </span>
            )}
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">ALTITUDE:</span>
              <span className={`font-mono font-black text-xs ${isAirborneState ? 'text-sky-300 animate-pulse' : 'text-zinc-300'}`}>
                {(Math.max(0, (280 - playerY.current) * 0.15)).toFixed(1)}m
              </span>
            </div>

            <div className="flex items-center gap-1.5 border-l border-white/10 pl-5">
              <span className="text-zinc-500">DESCENT ALTITUDE GOAL:</span>
              <span className="text-yellow-400 font-black text-xs">
                {gameState === 'READY' ? '---' : `${(Math.max(0, (280 - descendingMarkerY.current) * 0.15)).toFixed(1)}m`}
              </span>
            </div>
          </div>
        </div>

        {/* Live Canvas Stage Component Container */}
        <div className="relative w-full aspect-[600/320] bg-zinc-950 rounded-xl border-4 border-zinc-850 overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.65)]">
          <canvas
            ref={canvasRef}
            width={600}
            height={320}
            className="block w-full h-full"
            id="specky_drill_canvas"
          />

          {/* User Image Mockup Joystick / HUD controls layered transparently over bottom */}
          <div className="absolute inset-x-4 bottom-4 pointer-events-none flex justify-between items-end">
            
            {/* Left side: circular joystick wheel "run" exactly matching client mockup design */}
            <div className="relative w-28 h-28 rounded-full bg-zinc-900/60 backdrop-blur-sm border border-white/20 p-1 flex items-center justify-center shadow-2xl pointer-events-auto">
              {/* Inner Run center wheel button */}
              <div 
                className="w-12 h-12 rounded-full bg-orange-500 border border-white flex items-center justify-center font-black text-[10.5px] text-white uppercase shadow-lg select-none cursor-pointer"
                id="joystick_run_element"
              >
                run
              </div>

              {/* D-Pad Arrows pointing outwards (simulated in UI) */}
              <button 
                onMouseDown={() => setIsPressingLeft(true)}
                onMouseUp={() => setIsPressingLeft(false)}
                onMouseLeave={() => setIsPressingLeft(false)}
                onTouchStart={() => setIsPressingLeft(true)}
                onTouchEnd={() => setIsPressingLeft(false)}
                className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-xs font-bold font-mono transition-colors border select-none cursor-pointer ${
                  isPressingLeft ? 'bg-orange-500 text-white border-white' : 'bg-transparent text-zinc-400 border-white/10 hover:bg-white/5'
                }`}
              >
                ◀
              </button>

              <button 
                onMouseDown={() => setIsPressingRight(true)}
                onMouseUp={() => setIsPressingRight(false)}
                onMouseLeave={() => setIsPressingRight(false)}
                onTouchStart={() => setIsPressingRight(true)}
                onTouchEnd={() => setIsPressingRight(false)}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-xs font-bold font-mono transition-colors border select-none cursor-pointer ${
                  isPressingRight ? 'bg-orange-500 text-white border-white' : 'bg-transparent text-zinc-400 border-white/10 hover:bg-white/5'
                }`}
              >
                ▶
              </button>

              {/* Angled indicator visual arrows from the sketch diagram */}
              <div className="absolute top-1 right-3 text-[10px] text-zinc-600 font-mono pointer-events-none">↗</div>
              <div className="absolute top-1 left-3 text-[10px] text-zinc-600 font-mono pointer-events-none">↖</div>
              <div className="absolute bottom-1 left-3 text-[10px] text-zinc-600 font-mono pointer-events-none">↙</div>
              <div className="absolute bottom-1 right-3 text-[10px] text-zinc-600 font-mono pointer-events-none">⬊</div>
            </div>

            {/* Right side: JMP and Catch round buttons exactly matching developer sketch */}
            <div className="flex gap-4 items-center pointer-events-auto">
              
              {/* JMP Button: Black round filled with white border - Styled dynamically based on game situations */}
              {jumpPrompt === 'SPRING' ? (
                <button
                  onClick={triggerJump}
                  className="w-[74px] h-[74px] rounded-full bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 border-2 border-yellow-300 shadow-[0_0_20px_rgba(245,158,11,0.85)] flex flex-col items-center justify-center font-mono font-black text-[12px] text-white hover:scale-110 active:scale-95 transition-all cursor-pointer animate-pulse select-none shrink-0"
                  id="dpad_jump_button"
                >
                  <span className="text-[8px] font-mono tracking-widest text-yellow-200 block">⚡ READY</span>
                  SPRING!
                </button>
              ) : jumpPrompt === 'FLY' ? (
                <button
                  onClick={triggerJump}
                  className="w-16 h-16 rounded-full bg-sky-700/80 border-2 border-sky-400 shadow-xl flex flex-col items-center justify-center font-mono font-bold text-[9px] text-white/95 hover:scale-105 active:scale-95 transition-transform cursor-pointer select-none shrink-0"
                  id="dpad_jump_button"
                >
                  <span>✈️ FLY</span>
                  <span className="text-[7px] opacity-70">FLIPPED</span>
                </button>
              ) : jumpPrompt === 'GROUNDED' ? (
                <button
                  onClick={triggerJump}
                  className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-650 shadow-md flex flex-col items-center justify-center font-mono font-bold text-[9px] text-zinc-300 hover:scale-105 active:scale-95 transition-transform cursor-pointer select-none shrink-0"
                  id="dpad_jump_button"
                >
                  FALL
                </button>
              ) : (
                <button
                  onClick={triggerJump}
                  className="w-16 h-16 rounded-full bg-black/90 border-2 border-white shadow-2xl flex flex-col items-center justify-center font-mono font-black text-xs text-stone-100 hover:scale-105 active:scale-95 transition-transform cursor-pointer select-none shrink-0"
                  id="dpad_jump_button"
                >
                  JMP
                </button>
              )}

              {/* Catch Button: Highlighted with amber border / auto catch indicator */}
              <button
                onClick={triggerCatch}
                className="w-16 h-16 rounded-full bg-yellow-400 border-2 border-zinc-950 shadow-2xl flex flex-col items-center justify-center font-mono font-black text-xs text-black hover:scale-105 active:scale-95 transition-transform cursor-pointer select-none shrink-0"
                id="dpad_catch_button"
              >
                <span className="text-[7px] text-zinc-900 leading-none tracking-widest font-bold">AUTO</span>
                CATCH
              </button>
            </div>
            
          </div>

          {/* Desktop Keyboard controls tooltip helper panel */}
          <div className="absolute top-3 right-3 bg-black/75 px-3 py-1.5 rounded text-[8px] font-mono text-zinc-400 border border-white/5 select-none pointer-events-none leading-relaxed text-right">
            KEYBOARD SHORTCUTS:<br />
            [A / D] or [◀/▶] - RUN <br />
            [W / SPACE / ▲] - JUMP & SPRING <br />
            <span className="text-yellow-400 font-bold">★ AUTO-CATCH ACTIVE ★</span>
          </div>

          {/* Result state full overlays */}
          <AnimatePresence>
            {(gameState === 'MARKED' || gameState === 'DROPPED') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 z-40"
              >
                <motion.div
                  initial={{ scale: 0.85, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  className={`p-6 rounded-xl border-2 max-w-[640px] w-full shadow-2xl flex flex-col md:flex-row items-stretch gap-6 bg-zinc-950 text-left ${
                    gameState === 'MARKED' ? 'border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.2)]' : 'border-red-500'
                  }`}
                >
                  {/* Left Column: Image Snapshot Certificate */}
                  {gameState === 'MARKED' && (
                    <div className="flex-1 flex flex-col justify-between space-y-3 bg-zinc-900/60 p-4 rounded-lg border border-white/5 relative overflow-hidden">
                      <div className="absolute top-2 left-2 bg-yellow-500 text-black text-[8px] font-mono font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-lg flex items-center gap-1">
                        <Camera className="h-2 w-2" /> Live Snap
                      </div>
                      
                      <div className="relative aspect-[4/3] w-full bg-zinc-950 rounded overflow-hidden border border-white/10 flex items-center justify-center">
                        {speckySnapshot ? (
                          <img 
                            src={speckySnapshot} 
                            alt="AFL Specky Peak Performance" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center space-y-2 text-zinc-500 font-mono text-[10px] animate-pulse">
                            <Camera className="h-6 w-6 text-zinc-650" />
                            <span>DEVELOPING INSTANT SNAP...</span>
                          </div>
                        )}
                      </div>

                      {/* Photo attributes */}
                      <div className="space-y-1 text-[10px] font-mono text-zinc-400">
                        <div className="flex justify-between border-b border-white/5 py-1">
                          <span className="text-zinc-500 uppercase">ALTITUDE:</span>
                          <span className="text-yellow-400 font-bold">{snapshotAltitude}px (EPIC LEAP)</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1">
                          <span className="text-zinc-500 uppercase">ACCURACY VARIANCE:</span>
                          <span className={`${snapshotVariance <= 12 ? 'text-emerald-400' : 'text-zinc-200'} font-bold`}>
                            ±{snapshotVariance}px
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1">
                          <span className="text-zinc-500 uppercase">VAULT BOOST:</span>
                          <span className="text-zinc-200 font-bold">{snapshotIsSpringed ? '⚡ YES (2.0x MULTIPLIER)' : '❌ NO'}</span>
                        </div>
                      </div>

                      {/* Share control actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleDownloadSnapshot}
                          disabled={!speckySnapshot}
                          className="flex-1 bg-zinc-850 hover:bg-zinc-850 border border-zinc-700/50 disabled:opacity-50 text-white font-mono font-bold text-[9px] py-2 px-1 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Save captured png to local storage"
                        >
                          <Download className="h-3 w-3" />
                          SAVE SNAP
                        </button>
                        <button
                          onClick={handleCopyStats}
                          className="flex-1 bg-zinc-850 hover:bg-zinc-850 border border-zinc-700/50 text-white font-mono font-bold text-[9px] py-2 px-1 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Copy details to clipboard"
                        >
                          <Share2 className="h-3 w-3 text-cyan-400" />
                          {isCopied ? 'COPIED!' : 'SHARE'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Right Column: Game feedback & Rewards */}
                  <div className="flex-1 flex flex-col justify-between space-y-4 text-center md:text-left">
                    <div className="space-y-2">
                      <div className="flex justify-center md:justify-start">
                        <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500">
                          {gameState === 'MARKED' ? (
                            <Trophy className="h-9 w-9 text-yellow-500 animate-bounce" />
                          ) : (
                            <RefreshCw className="h-9 w-9 text-red-500" />
                          )}
                        </div>
                      </div>

                      <h3 className={`text-lg font-mono font-black italic tracking-widest uppercase text-center md:text-left ${
                        gameState === 'MARKED' ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {gameState === 'MARKED' ? 'SPECKY MARKED!' : 'DROPPED MARK!'}
                      </h3>

                      <p className="text-[11px] text-zinc-300 font-mono leading-relaxed text-center md:text-left bg-zinc-900/40 p-2.5 rounded border border-white/5">
                        {feedback}
                      </p>
                    </div>

                    {gameState === 'MARKED' && (
                      <div className="bg-zinc-900 border border-white/5 px-4 py-2.5 rounded-lg text-center md:text-left flex items-center justify-between w-full">
                        <div>
                          <span className="text-[8px] text-zinc-500 block uppercase font-mono tracking-widest">DRILLED ACQUIRED XP</span>
                          <span className="text-lg font-mono font-black text-yellow-500">+{xpAwarded}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] text-zinc-500 block uppercase font-mono tracking-widest">ACCREDITED CLUB</span>
                          <span className="text-[10px] font-mono font-bold text-white uppercase">{cardClub?.name || 'AFL COACH'}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 w-full pt-2">
                      {gameState === 'MARKED' ? (
                        <div className="flex flex-col gap-2 w-full">
                          <button
                            onClick={handleClaimReward}
                            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[11px] uppercase tracking-wider py-3.5 rounded transition-transform cursor-pointer text-center font-mono"
                            id="claim_xp_reward_button"
                          >
                            CLAIM REWARD & CONTINUOUS FIRE
                          </button>
                          <button
                            onClick={resetDrill}
                            className="w-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 font-black text-[9px] uppercase tracking-wider py-2 rounded transition-transform cursor-pointer text-center font-mono flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="h-3 w-3 text-yellow-500" />
                            REPLAY DRILL IMMEDIATELY
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={resetDrill}
                          className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded transition-transform cursor-pointer flex justify-center items-center gap-2"
                          id="replay_drill_button"
                        >
                          <RefreshCw className="h-4 w-4" />
                          REPLAY DRILL
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Outer instructions for better UX */}
        <div className="w-full bg-zinc-900 border border-white/5 p-4 rounded-xl flex items-center gap-3">
          <HelpCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          <p className="text-[11px] text-zinc-400 font-mono leading-relaxed uppercase">
            👉 Build up <strong className="text-white">RUNNING SPEED</strong> towards the opponent player. Press <strong className="text-yellow-500">JMP</strong> while overlapping to spring up high and vault him! Time the perfect <strong className="text-yellow-500">CATCH</strong> at the peak trajectory height to secure the XP multiplier. If dropped, immediately replay to conquer.
          </p>
        </div>

      </div>

    </div>
  );
}
