import React, { useState, useRef, useEffect } from 'react';
import { PlayerCard } from '../types';
import { Wind, ShieldAlert, Award, Zap, Crosshair, ArrowUp, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FlickToKickProps {
  cards: PlayerCard[];
  onTrainCard: (cardId: string, statsEarned: { power: number; skill: number; finesse: number; xp: number }) => void;
  onEarnWakeUpSession: () => void;
}

export default function FlickToKick({ cards, onTrainCard, onEarnWakeUpSession }: FlickToKickProps) {
  // Available, non-omitted cards
  const trainableCards = cards.filter(c => !c.omitted);
  const [selectedCard, setSelectedCard] = useState<PlayerCard | null>(
    trainableCards.length > 0 ? trainableCards[0] : null
  );

  // Sync selection if list changes
  useEffect(() => {
    if (trainableCards.length > 0) {
      if (!selectedCard || !trainableCards.some(c => c.id === selectedCard.id)) {
        setSelectedCard(trainableCards[0]);
      } else {
        // Update stats
        const latest = trainableCards.find(c => c.id === selectedCard.id);
        if (latest) setSelectedCard(latest);
      }
    } else {
      setSelectedCard(null);
    }
  }, [cards]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Kick State
  const [angleDeg, setAngleDeg] = useState<number>(0); // Goal angle (-45 deg to 45 deg pocket)
  const [distanceYads, setDistanceYads] = useState<number>(35); // 15 to 60 yards distance
  const [windSpeed, setWindSpeed] = useState<number>(0); // Wind strength (-15 to +15 m/s)
  const [windDirection, setWindDirection] = useState<'left' | 'right' | 'head'>('left');
  const [kickResult, setKickResult] = useState<'NONE' | 'GOAL' | 'BEHIND' | 'POST' | 'OUT_OF_BOUNDS' | 'SHORT'>('NONE');
  const [kicking, setKicking] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [xpAwarded, setXpAwarded] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);

  // Trait allocations
  const [allocatedPower, setAllocatedPower] = useState<number>(0);
  const [allocatedSkill, setAllocatedSkill] = useState<number>(0);
  const [allocatedFinesse, setAllocatedFinesse] = useState<number>(0);

  // Swipe capture properties
  const isDragging = useRef<boolean>(false);
  const strokePath = useRef<{ x: number; y: number; t: number }[]>([]);
  const [ballPos, setBallPos] = useState({ x: 175, y: 350 }); // relative to canvas sizes

  const [kickType, setKickType] = useState<'PUNT' | 'SNAP'>('SNAP');

  // To sync the animation draw loop with triggerKick
  const flightSettings = useRef<{
    vx: number;
    vy: number;
    vz: number;
    curve: number;
    active: boolean;
    startX: number;
    startY: number;
  }>({
    vx: 0,
    vy: 0,
    vz: 0,
    curve: 0,
    active: false,
    startX: 175,
    startY: 350
  });

  // Setup random wind and position on component load or next kick
  const setupRandomScenario = () => {
    // Sharp pocket angle setup for snap shot
    let angle = Math.floor(Math.random() * 50) - 25; // default -25 to 25
    if (kickType === 'SNAP') {
      const isLeft = Math.random() > 0.5;
      angle = isLeft ? -Math.floor(Math.random() * 12 + 30) : Math.floor(Math.random() * 12 + 30); // sharp 30° to 42° pocket angle!
    }
    const dist = Math.floor(Math.random() * 25) + 20; // 20 to 45 meters/yards
    const wind = Math.floor(Math.random() * 16) - 8; // -8 to +8 mild crosswind
    setAngleDeg(angle);
    setDistanceYads(dist);
    setWindSpeed(wind);
    setWindDirection(wind === 0 ? 'head' : wind > 0 ? 'right' : 'left');
    setKickResult('NONE');
    setKicking(false);
    setFeedbackText('');
  };

  useEffect(() => {
    setupRandomScenario();
  }, []);

  // Set up Trait Upgrade references when card selection changes
  useEffect(() => {
    setAllocatedPower(0);
    setAllocatedSkill(0);
    setAllocatedFinesse(0);
  }, [selectedCard]);

  // Main Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let ballX = ballPos.x;
    let ballY = ballPos.y;
    let ballScale = 1.0;
    let ballVelocityX = 0;
    let ballVelocityY = 0;
    let ballZ = 0; // vertical height curve in pixels
    let ballZVelocity = 0;
    let activeCurveRate = 0;
    const gravity = 0.21;
    let frame = 0;

    // Ball simulation history for trails
    const history: { x: number; y: number; z: number }[] = [];

    // Dimensions
    const width = 350;
    const height = 400;

    const draw = () => {
      // Sync flight settings when launching
      if (flightSettings.current.active) {
        ballX = flightSettings.current.startX;
        ballY = flightSettings.current.startY;
        ballZ = 0;
        ballVelocityX = flightSettings.current.vx;
        ballVelocityY = flightSettings.current.vy;
        ballZVelocity = flightSettings.current.vz;
        activeCurveRate = flightSettings.current.curve;
        flightSettings.current.active = false;
        history.length = 0; // reset trails
      }

      // Step physics frame if currently flying
      if (kicking && selectedCard) {
        // Wind resistance formula: power limits wind's drift
        const windEffectModifier = Math.max(0.1, 1 - (selectedCard.power / 115));
        const normalizedWind = windSpeed * windEffectModifier * 0.08;
        ballVelocityX += normalizedWind;

        // Curve lateral force
        ballVelocityX += activeCurveRate * 0.7;

        ballX += ballVelocityX;
        ballY += ballVelocityY;
        ballZVelocity -= gravity;
        ballZ += ballZVelocity;

        if (ballZ < 0) {
          ballZ = 0;
          ballZVelocity = 0;
        }

        const distanceFraction = Math.max(0.05, 1.0 - (400 - ballY) / 360);
        ballScale = Math.max(0.2, 1.0 * distanceFraction);

        // Reach goal line check
        if (ballY <= (height * 0.25)) {
          evaluateGoal(ballX, ballZ);
          setKicking(false);
          return;
        }

        // Out of bounds check
        if (ballX < -65 || ballX > 410 || ballY < -30) {
          setKicking(false);
          setKickResult('OUT_OF_BOUNDS');
          setFeedbackText('OUT OF BOUNDS ON THE FULL!');
          setStreak(0);
          setBallPos({ x: 175, y: 350 });
          return;
        }
      }

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Field / Background Grass
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#002500'); // distant grass
      gradient.addColorStop(0.3, '#053d05');
      gradient.addColorStop(0.8, '#0b5a0b');
      gradient.addColorStop(1, '#117111'); // foreground grass
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw standard field markings (50m arc and boundary lines in perspective)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.4);
      ctx.quadraticCurveTo(width / 2, height * 0.35, width, height * 0.4);
      ctx.stroke();

      // Draw goals line
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(35, height * 0.25);
      ctx.lineTo(width - 35, height * 0.25);
      ctx.stroke();

      // 2. Draw Goalposts in perspective
      // Back ground/Stadium goal layout:
      // Width of center goals = 45px
      // Width of behind goals = 25px each
      const centerX = width / 2;
      const centerY = height * 0.25;

      const goalWidth = 14; 
      const behindWidth = 16; 

      const posts = {
        leftBehind: centerX - goalWidth - behindWidth,
        leftGoal: centerX - goalWidth,
        rightGoal: centerX + goalWidth,
        rightBehind: centerX + goalWidth + behindWidth,
      };

      // Goal post heights
      const goalHeight = 85;
      const behindHeight = 55;

      // Draw Behind Posts (White/Silver)
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2.5;

      // Left behind post
      ctx.beginPath();
      ctx.moveTo(posts.leftBehind, centerY);
      ctx.lineTo(posts.leftBehind, centerY - behindHeight);
      ctx.stroke();

      // Right behind post
      ctx.beginPath();
      ctx.moveTo(posts.rightBehind, centerY);
      ctx.lineTo(posts.rightBehind, centerY - behindHeight);
      ctx.stroke();

      // Draw Main Goal Posts (Gold / High Contrast White)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;

      // Left main goal post
      ctx.beginPath();
      ctx.moveTo(posts.leftGoal, centerY);
      ctx.lineTo(posts.leftGoal, centerY - goalHeight);
      ctx.stroke();

      // Right main goal post
      ctx.beginPath();
      ctx.moveTo(posts.rightGoal, centerY);
      ctx.lineTo(posts.rightGoal, centerY - goalHeight);
      ctx.stroke();

      // Draw soft net backing meshes or lines between goal posts for feedback
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(posts.leftGoal, centerY - goalHeight, posts.rightGoal - posts.leftGoal, goalHeight);

      // Draw Pocket Markers
      ctx.fillStyle = '#facc15';
      ctx.font = '10px monospace';
      ctx.fillText('GOAL', centerX - 12, centerY + 20);
      ctx.fillText('BEHIND', posts.leftBehind - 15, centerY + 20);
      ctx.fillText('BEHIND', posts.rightGoal + 5, centerY + 20);

      // 3. Draw wind direction warning indicator if not kicking
      if (!kicking) {
        ctx.save();
        ctx.translate(width - 50, 40);
        // Draw wind dial
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        if (windSpeed !== 0) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          // wind vector
          const windAngle = windSpeed > 0 ? 0 : Math.PI;
          ctx.lineTo(Math.cos(windAngle) * 15 * (Math.abs(windSpeed) / 13), 0);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 3;
          ctx.stroke();
          
          // Arrow head
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          const arrowX = Math.cos(windAngle) * 15 * (Math.abs(windSpeed) / 13);
          ctx.arc(arrowX, 0, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 4. Draw guidelines / swipe tracking predictor if skill is high and not kicked yet
      if (!kicking && selectedCard && strokePath.current.length === 0) {
        // Skill shows predictive trajectory dot line based on skill
        const skillLevel = selectedCard.skill;
        const dotsCount = Math.floor(skillLevel / 12) + 2; // more dots for high skill
        
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(ballX, ballY);
        // Draw straight/angled predictor based on goal angle
        // Angle drift is simulated
        const targetX = centerX - (angleDeg * 2.2);
        const controlX = (ballX + targetX) / 2;
        ctx.quadraticCurveTo(controlX, centerY + 100, targetX, centerY);
        ctx.stroke();
        ctx.setLineDash([]); // Reset
      }

      // 5. Draw active swipe line when user dragging finger
      if (isDragging.current && strokePath.current.length > 1) {
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(strokePath.current[0].x, strokePath.current[0].y);
        for (let i = 1; i < strokePath.current.length; i++) {
          ctx.lineTo(strokePath.current[i].x, strokePath.current[i].y);
        }
        ctx.stroke();

        // draw cursor particle
        const head = strokePath.current[strokePath.current.length - 1];
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(head.x, head.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Draw Kicked Ball and trajectory trail
      if (kicking) {
        // Draw tail trail
        history.push({ x: ballX, y: ballY, z: ballZ });
        if (history.length > 8) history.shift();

        ctx.fillStyle = 'rgba(250, 204, 21, 0.15)';
        history.forEach((pt, i) => {
          const ptScale = ballScale * (0.4 + (i / history.length) * 0.6);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y - pt.z, 14 * ptScale, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw dynamic shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 15 * ballScale, 0, Math.PI * 2);
        ctx.fill();

        // Draw Sherrin Football (leather color)
        ctx.save();
        ctx.translate(ballX, ballY - ballZ);
        ctx.rotate(frame * 0.2); // spin

        // Outer Oval
        const drawScale = 14 * ballScale;
        ctx.fillStyle = '#b43a24'; // beautiful authentic red leather 
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.ellipse(0, 0, drawScale, drawScale * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Laces
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-drawScale * 0.4, 0);
        ctx.lineTo(drawScale * 0.4, 0);
        ctx.stroke();

        ctx.restore();
      } else {
        // Draw Stationary Ball at the bottom center or wherever user drags it
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(ballPos.x, ballPos.y + 10, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(ballPos.x, ballPos.y);
        
        ctx.fillStyle = '#b43a24'; // Red Sherrin
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 12, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Laces
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-6, -35 * 0.05);
        ctx.lineTo(6, 35 * 0.05);
        ctx.stroke();

        ctx.restore();
      }

      frame++;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [kicking, windSpeed, angleDeg, selectedCard, ballPos]);

  // Handle Drag Start
  const handleStart = (clientX: number, clientY: number) => {
    if (kicking || !selectedCard) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Check if clicked close to the ball
    const distToBall = Math.hypot(x - ballPos.x, y - ballPos.y);
    if (distToBall < 40) {
      isDragging.current = true;
      strokePath.current = [{ x, y, t: Date.now() }];
    }
  };

  // Handle Drag Move
  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging.current || kicking) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // track path
    strokePath.current.push({ x, y, t: Date.now() });
    if (strokePath.current.length > 25) strokePath.current.shift();

    setBallPos({ x, y });
  };

  // Handle Drag End / Flick release
  const handleEnd = () => {
    if (!isDragging.current || kicking || !selectedCard) return;
    isDragging.current = false;

    const path = strokePath.current;
    if (path.length < 2) {
      // reset ball pos
      setBallPos({ x: 175, y: 350 });
      return;
    }

    // Determine gesture velocity & curve
    const startPoint = path[0];
    const endPoint = path[path.length - 1];
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const dt = endPoint.t - startPoint.t || 1;

    // Kicking forward velocity
    const speed = -dy / dt; // pixels per ms
    const angleOffset = dx; // swipe angle

    if (speed < 0.25 || dy > -20) {
      // Too weak or backwards swipe, reset
      setBallPos({ x: 175, y: 350 });
      strokePath.current = [];
      return;
    }

    triggerKick(speed, angleOffset, path);
  };

  // Physics animation handler for the kicked ball path
  const triggerKick = (swipeVelocity: number, rawAngleOffset: number, path: { x: number; y: number }[]) => {
    if (!selectedCard) return;

    // Calculate curve rate based on Power and Finesse
    const snapDirection = angleDeg > 0 ? -1 : 1;
    const powerStat = selectedCard.power;
    // An intense, satisfying snap kick curl based on physical power output
    const snapCurveStrength = (powerStat / 25) * (Math.abs(swipeVelocity) * 0.40);
    const snapCurve = kickType === 'SNAP' ? snapDirection * snapCurveStrength : 0;

    let manualCurveRate = 0;
    if (path.length > 4) {
      const midIdx = Math.floor(path.length / 2);
      const start = path[0];
      const mid = path[midIdx];
      const end = path[path.length - 1];
      const lineX = end.x - start.x;
      const lineY = end.y - start.y;
      const curveX = mid.x - start.x;
      const curveY = mid.y - start.y;
      const crossProduct = lineX * curveY - lineY * curveX;
      
      const maxFinesseScale = selectedCard.finesse / 100;
      manualCurveRate = (crossProduct / 600) * maxFinesseScale;
    }

    const curveRate = snapCurve + manualCurveRate;

    const powerSpeedMultiplier = 1.0 + (powerStat / 180);
    const ballVelocityY = -swipeVelocity * 10 * powerSpeedMultiplier;
    const ballVelocityX = (rawAngleOffset / 14) * (1.0 + selectedCard.skill / 250);
    const ballZVelocity = Math.abs(ballVelocityY) * 0.45;

    // Save so drawing thread triggers it
    flightSettings.current = {
      vx: ballVelocityX,
      vy: ballVelocityY,
      vz: ballZVelocity,
      curve: curveRate,
      active: true,
      startX: ballPos.x,
      startY: ballPos.y
    };

    setKicking(true);
  };

  // Evaluate landing target on posts layout
  const evaluateGoal = (ballFinalX: number, ballFinalHeightZ: number) => {
    const width = 350;
    const centerX = width / 2;
    const goalWidth = 14; 
    const behindWidth = 16; 

    const posts = {
      leftBehind: centerX - goalWidth - behindWidth,
      leftGoal: centerX - goalWidth,
      rightGoal: centerX + goalWidth,
      rightBehind: centerX + goalWidth + behindWidth,
    };

    // Calculate result
    let result: 'NONE' | 'GOAL' | 'BEHIND' | 'POST' | 'OUT_OF_BOUNDS' | 'SHORT' = 'NONE';
    let feedback = '';
    let xp = 0;

    // Did the kick fall short of the goal post top height?
    // In our model, posts are active if ball height is realistic
    const goalPostMaxZ = 85;

    // Check hit post
    if (Math.abs(ballFinalX - posts.leftGoal) < 2 || Math.abs(ballFinalX - posts.rightGoal) < 2) {
      if (ballFinalHeightZ < goalPostMaxZ) {
        result = 'POST';
        feedback = 'CLANG! Hits the post!';
        xp = 5;
      } else {
        result = 'GOAL';
        feedback = 'Over the post! Dynamic goal!';
        xp = 30;
      }
    } else if (Math.abs(ballFinalX - posts.leftBehind) < 2 || Math.abs(ballFinalX - posts.rightBehind) < 2) {
      result = 'POST';
      feedback = 'CLANG! Hits the behind post!';
      xp = 3;
    }
    // Main Goals middle
    else if (ballFinalX > posts.leftGoal && ballFinalX < posts.rightGoal) {
      result = 'GOAL';
      feedback = 'IT SPLITS THE MIDDLE! SIX POINTS!';
      xp = 35; // Standard XP reward plus bonuses
    }
    // Behind pocket left
    else if (ballFinalX > posts.leftBehind && ballFinalX < posts.leftGoal) {
      result = 'BEHIND';
      feedback = 'One point! Left pocket behind.';
      xp = 12;
    }
    // Behind pocket right
    else if (ballFinalX > posts.rightGoal && ballFinalX < posts.rightBehind) {
      result = 'BEHIND';
      feedback = 'One point! Swung through for a behind.';
      xp = 12;
    }
    // Missed outside
    else {
      result = 'OUT_OF_BOUNDS';
      feedback = 'Out on the full! No score.';
      xp = 0;
    }

    // Apply Streak premium multipliers
    if (result === 'GOAL') {
      const newStreak = streak + 1;
      setStreak(newStreak);

      // Trigger standard double haptic vibe pattern mapping for a successful goal
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([150, 100, 150]);
      }

      if (newStreak >= 3) {
        xp = Math.floor(xp * 1.5);
        feedback += ` Streak x${newStreak}! XP Boost!`;
        
        // Dynamic drop chance: check streak milestones to earn premiumitems
        if (newStreak % 3 === 0) {
          onEarnWakeUpSession();
        }
      }
    } else {
      setStreak(0);
    }

    // Allocate training XP to card
    if (selectedCard && xp > 0) {
      onTrainCard(selectedCard.id, {
        power: allocatedPower,
        skill: allocatedSkill,
        finesse: allocatedFinesse,
        xp: xp,
      });
    }

    setKickResult(result);
    setFeedbackText(feedback);
    setXpAwarded(xp);

    // Reset ball back
    setBallPos({ x: 175, y: 350 });
    strokePath.current = [];
  };

  // Trait points helper upgrade triggers
  const handleTraitAdjust = (trait: 'power' | 'skill' | 'finesse', amount: number) => {
    if (!selectedCard) return;

    // Trait points cost 100 general XP to manual allocate
    // Check if card has enough XP to perform custom static card level increases!
    // Since card's statistics are permanent, user uses XP manually to upgrade.
    const availablePointsToAllocate = Math.floor(selectedCard.xp / 100);

    const currentAllocatedTotal = allocatedPower + allocatedSkill + allocatedFinesse;
    const currentTraitValue = selectedCard[trait] + (trait === 'power' ? allocatedPower : trait === 'skill' ? allocatedSkill : allocatedFinesse);

    if (amount > 0) {
      // Upgrade cap strictly at 100 scale
      if (currentTraitValue >= 100) return;
      if (currentAllocatedTotal >= availablePointsToAllocate) {
        // Not enough XP to upgrade
        alert('Not enough card XP! Earn 100 XP from goals to purchase a Trait Point.');
        return;
      }
      if (trait === 'power') setAllocatedPower(prev => prev + 1);
      if (trait === 'skill') setAllocatedSkill(prev => prev + 1);
      if (trait === 'finesse') setAllocatedFinesse(prev => prev + 1);
    } else {
      if (trait === 'power' && allocatedPower > 0) setAllocatedPower(prev => prev - 1);
      if (trait === 'skill' && allocatedSkill > 0) setAllocatedSkill(prev => prev - 1);
      if (trait === 'finesse' && allocatedFinesse > 0) setAllocatedFinesse(prev => prev - 1);
    }
  };

  // Permanently write allocated traits to card
  const commitUpgrades = () => {
    if (!selectedCard) return;
    const totalCost = (allocatedPower + allocatedSkill + allocatedFinesse) * 100;
    if (totalCost === 0) return;

    onTrainCard(selectedCard.id, {
      power: allocatedPower,
      skill: allocatedSkill,
      finesse: allocatedFinesse,
      xp: -totalCost, // deduct spent XP
    });

    setAllocatedPower(0);
    setAllocatedSkill(0);
    setAllocatedFinesse(0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-zinc-900 p-6 rounded-xl border border-white/10 text-stone-200">
      
      {/* LEFT COLUMN: Player selection & Dynamic Traits Matrix */}
      <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Locker Room Training
          </h2>
          <p className="text-xs text-zinc-400 mt-1.5 font-mono">
            Away training loop. Kick goals during the week to generate XP to prepare cards for Match Day battles.
          </p>

          {/* Card Selector */}
          <div className="mt-4">
            <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 tracking-wider font-mono">Select Kicker Profile</label>
            {trainableCards.length === 0 ? (
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded text-xs text-red-500 font-mono text-center">
                ⚠️ All squad members are Omitted. Revive key players in Locker Room first.
              </div>
            ) : (
              <select
                className="w-full bg-zinc-950 border border-white/5 rounded p-2.5 text-xs font-mono text-stone-200 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                value={selectedCard?.id || ''}
                onChange={(e) => {
                  const card = trainableCards.find(c => c.id === e.target.value);
                  if (card) setSelectedCard(card);
                }}
              >
                {trainableCards.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-950">
                    {c.name.toUpperCase()} (Lvl {c.level} - {c.tier.toUpperCase()}) — {c.xp} XP
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Kick Style Toggler */}
          <div className="mt-4 bg-zinc-950 p-2.5 rounded-lg border border-white/5">
            <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1.5 tracking-widest font-mono">
              ⚡ KICK STYLE MODE
            </label>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  setKickType('SNAP');
                  // Trigger scenario update immediately to change the angle to sharp pocket!
                  setTimeout(() => {
                    setupRandomScenario();
                  }, 20);
                }}
                className={`flex-1 py-2 rounded text-[10px] font-black tracking-wider uppercase font-mono transition-all cursor-pointer ${
                  kickType === 'SNAP'
                    ? 'bg-yellow-500 text-black shadow-[0_0_8px_rgba(234,179,8,0.4)]'
                    : 'text-zinc-500 hover:text-white bg-zinc-900 border border-white/5'
                }`}
              >
                📐 Snap Shot
              </button>
              <button
                onClick={() => {
                  setKickType('PUNT');
                  setTimeout(() => {
                    setupRandomScenario();
                  }, 20);
                }}
                className={`flex-1 py-2 rounded text-[10px] font-black tracking-wider uppercase font-mono transition-all cursor-pointer ${
                  kickType === 'PUNT'
                    ? 'bg-yellow-500 text-black shadow-[0_0_8px_rgba(234,179,8,0.4)]'
                    : 'text-zinc-500 hover:text-white bg-zinc-900 border border-white/5'
                }`}
              >
                🏉 Punt Shot
              </button>
            </div>
            {kickType === 'SNAP' ? (
              <p className="text-[9.5px] text-yellow-500/70 font-mono mt-1 px-1">
                Pocket Angle Active! Power index determines snap curve trajectory.
              </p>
            ) : (
              <p className="text-[9.5px] text-zinc-500 font-mono mt-1 px-1">
                Traditional drop punt kick. Straight projection with air turbulence.
              </p>
            )}
          </div>
        </div>

        {/* Selected Card Badge Visual */}
        {selectedCard && (
          <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 flex flex-col space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-[9px] uppercase tracking-widest font-mono font-black px-2 py-0.5 rounded ${
                  selectedCard.tier === 'Legend' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  selectedCard.tier === 'Gold' ? 'bg-yellow-600/25 text-yellow-300 border border-yellow-500/20' :
                  selectedCard.tier === 'Silver' ? 'bg-zinc-500/25 text-zinc-300 border border-zinc-500/20' :
                  'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                }`}>
                  {selectedCard.tier} {selectedCard.variant !== 'Standard' && `• ${selectedCard.variant}`}
                </span>
                <h3 className="text-base font-black italic uppercase text-white mt-2">{selectedCard.name}</h3>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wide">Rank Level: {selectedCard.level}</p>
              </div>
              <div className="bg-zinc-900 border border-white/5 p-2 px-3 rounded text-center">
                <span className="text-[9px] text-zinc-500 font-mono block uppercase">CARD XP</span>
                <span className="text-base font-black font-mono text-yellow-500">{selectedCard.xp}</span>
              </div>
            </div>

            {/* Trait Matrix Custom Upgrade Controls */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                <span>TRAIT PROFILES (10-100)</span>
                <span className="text-yellow-500 font-mono">
                  Points: {Math.max(0, Math.floor(selectedCard.xp / 100) - (allocatedPower + allocatedSkill + allocatedFinesse))}
                </span>
              </h4>

              {/* Power Trait */}
              <div className="bg-zinc-900 p-2.5 rounded border border-white/5 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-stone-200">POWER</span>
                    <span className="text-xs text-yellow-500 font-mono">
                      ({selectedCard.power + allocatedPower})
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Controls range & wind drag suppression</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleTraitAdjust('power', -1)}
                    className="h-6 w-6 bg-zinc-950 border border-white/5 hover:bg-zinc-800 rounded flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold font-mono text-yellow-500 w-4 text-center">{allocatedPower}</span>
                  <button 
                    onClick={() => handleTraitAdjust('power', 1)}
                    className="h-6 w-6 bg-zinc-950 border border-white/5 hover:bg-zinc-800 rounded flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Skill Trait */}
              <div className="bg-zinc-900 p-2.5 rounded border border-white/5 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-stone-200">SKILL</span>
                    <span className="text-xs text-yellow-500 font-mono">
                      ({selectedCard.skill + allocatedSkill})
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Aids predictor curve metrics</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleTraitAdjust('skill', -1)}
                    className="h-6 w-6 bg-zinc-950 border border-white/5 hover:bg-zinc-800 rounded flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold font-mono text-yellow-500 w-4 text-center">{allocatedSkill}</span>
                  <button 
                    onClick={() => handleTraitAdjust('skill', 1)}
                    className="h-6 w-6 bg-zinc-950 border border-white/5 hover:bg-zinc-800 rounded flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Finesse Trait */}
              <div className="bg-zinc-900 p-2.5 rounded border border-white/5 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-stone-200">FINESSE</span>
                    <span className="text-xs text-yellow-500 font-mono">
                      ({selectedCard.finesse + allocatedFinesse})
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Bends ball on curved flick strokes</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleTraitAdjust('finesse', -1)}
                    className="h-6 w-6 bg-zinc-950 border border-white/5 hover:bg-zinc-800 rounded flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold font-mono text-yellow-500 w-4 text-center">{allocatedFinesse}</span>
                  <button 
                    onClick={() => handleTraitAdjust('finesse', 1)}
                    className="h-6 w-6 bg-zinc-950 border border-white/5 hover:bg-zinc-800 rounded flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Commit points */}
            {(allocatedPower > 0 || allocatedSkill > 0 || allocatedFinesse > 0) && (
              <button
                onClick={commitUpgrades}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black uppercase tracking-wider py-2.5 rounded transition-transform cursor-pointer"
              >
                APPLY SPENT SPECIALS (-{(allocatedPower + allocatedSkill + allocatedFinesse) * 100} XP)
              </button>
            )}
          </div>
        )}
      </div>

      {/* CENTER COLUMN: Live Goal Canvas */}
      <div className="lg:col-span-5 flex flex-col items-center justify-center py-2">
        <div className="relative w-full max-w-[350px] bg-zinc-950 rounded-xl border-4 border-zinc-850 overflow-hidden shadow-2xl">
          
          <canvas
            ref={canvasRef}
            width={350}
            height={400}
            className="block cursor-crosshair w-full"
            onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              handleStart(touch.clientX, touch.clientY);
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              handleMove(touch.clientX, touch.clientY);
            }}
            onTouchEnd={handleEnd}
            id="flick_to_kick_canvas"
          />

          {/* Wind overlay pill */}
          <div className="absolute top-3 left-3 bg-zinc-950/85 backdrop-blur-md px-3 py-1.5 rounded border border-white/5 text-[10px] font-bold text-stone-250 flex items-center gap-1.5 shadow-xl">
            <Wind className={`h-3 w-3 ${windSpeed !== 0 ? 'text-yellow-500 animate-pulse' : 'text-stone-400'}`} />
            <span className="font-mono">WIND: {windSpeed === 0 ? 'CALM' : `${Math.abs(windSpeed)}M/S ${windSpeed > 0 ? 'E' : 'W'}`}</span>
          </div>

          {/* Pocket Distance pill */}
          <div className="absolute top-3 right-3 bg-zinc-950/85 backdrop-blur-md px-3 py-1.5 rounded border border-white/5 text-[10px] font-bold text-stone-250 flex items-center gap-1.5 shadow-xl">
            <Crosshair className="h-3 w-3 text-red-500" />
            <span className="font-mono">POCKET: {distanceYads}M • {angleDeg}°</span>
          </div>

          {/* Swipe indicator label if static */}
          {!kicking && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none animate-bounce">
              <span className="bg-black/85 backdrop-blur-sm border border-white/10 px-4 py-2 rounded text-[10px] font-black text-yellow-500 shadow-xl tracking-widest uppercase flex items-center gap-1.5">
                <ArrowUp className="h-3.5 w-3.5 text-yellow-500" />
                FLICK UP TO KICK
              </span>
            </div>
          )}

          {/* Animated score goal state overlays */}
          <AnimatePresence>
            {kickResult !== 'NONE' && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.0, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4 backdrop-blur-sm"
              >
                <div className={`p-5 rounded border-2 flex flex-col items-center max-w-[280px] shadow-2xl ${
                  kickResult === 'GOAL' ? 'bg-zinc-950/90 border-green-500' :
                  kickResult === 'BEHIND' ? 'bg-zinc-950/90 border-yellow-500' :
                  'bg-zinc-950/90 border-red-500'
                }`}>
                  <h3 className={`text-3xl font-black tracking-widest uppercase italic ${
                    kickResult === 'GOAL' ? 'text-green-400' :
                    kickResult === 'BEHIND' ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>
                    {kickResult}
                  </h3>
                  
                  <p className="text-xs text-stone-300 font-mono px-2 py-3 text-center leading-relaxed">
                    "{feedbackText}"
                  </p>

                  <div className="mt-2 text-center bg-zinc-900 border border-white/5 px-4 py-2 rounded w-full">
                    <span className="text-[9px] text-zinc-500 block font-mono uppercase tracking-wider">GAINED ADVANCE XP</span>
                    <span className="text-xl font-mono font-black text-yellow-500">+{xpAwarded}</span>
                  </div>

                  <button
                    onClick={setupRandomScenario}
                    className="mt-4 px-6 py-2.5 bg-yellow-500 text-black hover:bg-yellow-400 text-xs font-black rounded uppercase tracking-wider transition-transform flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    NEXT SHOT
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT COLUMN: Instructions, physics breakdown & training streak */}
      <div className="lg:col-span-3 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 space-y-3 shadow-xl">
            <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Crosshair className="h-4 w-4" />
              PHYSIQUE-DRIVEN TIPS
            </h4>
            <div className="text-xs text-zinc-400 space-y-3 leading-relaxed font-mono">
              <p>
                <strong className="text-white">Flick Direction:</strong> Curve your swipe arc left or right to execute a snap. High <strong className="text-yellow-500">Finesse</strong> magnifies curvature on the pocket.
              </p>
              <p>
                <strong className="text-white">Wind Factor:</strong> Check the stadium wind dial! High <strong className="text-yellow-500">Power</strong> ratings suppress crosswinds.
              </p>
              <p>
                <strong className="text-white">Guidance:</strong> Dot prediction trails are calculated dynamically using the kicker's <strong className="text-yellow-500">Skill</strong> metric.
              </p>
            </div>
          </div>

          <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 flex justify-between items-center text-center">
            <div className="flex-1 border-r border-white/5">
              <span className="text-[10px] text-zinc-500 block uppercase font-mono tracking-wider">STREAK</span>
              <span className="text-2xl font-mono font-black text-green-400">{streak}</span>
            </div>
            <div className="flex-1">
              <span className="text-[10px] text-zinc-500 block uppercase font-mono tracking-wider">MULTIPLIER</span>
              <span className="text-xs font-mono font-semibold text-stone-250 block mt-1">
                {streak >= 3 ? '1.5x XP Boost' : 'Gain 3 for Boost'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={setupRandomScenario}
          className="w-full bg-zinc-950 border border-white/5 hover:bg-zinc-900 py-3 rounded text-xs font-black uppercase text-stone-200 mt-4 transition-colors flex items-center justify-center gap-2 cursor-pointer tracking-wider"
        >
          <RefreshCw className="h-4 w-4 text-yellow-500" />
          RESET SCENARIO
        </button>
      </div>

    </div>
  );
}
