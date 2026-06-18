import React, { useState, useRef, useEffect } from 'react';
import { PlayerCard } from '../types';
import { Wind, Crosshair, ArrowUp, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BattleFlickToKickProps {
  attackerCard: PlayerCard;
  defenderName: string;
  currentSlot: number;
  windSpeed: number; // -10 to +10 m/s
  onGoal: () => void;
  onBehind: () => void;
  onMiss: () => void;
}

export default function BattleFlickToKick({
  attackerCard,
  defenderName,
  currentSlot,
  windSpeed,
  onGoal,
  onBehind,
  onMiss,
}: BattleFlickToKickProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Challenge Scenario Properties
  const [angleDeg, setAngleDeg] = useState<number>(0); // Goal angle (-30 to 30)
  const [distanceYads, setDistanceYads] = useState<number>(30); // 20 to 55 meters
  const [kickResult, setKickResult] = useState<'NONE' | 'GOAL' | 'BEHIND' | 'POST' | 'OUT_OF_BOUNDS' | 'SHORT'>('NONE');
  const [kicking, setKicking] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');

  // Swipe capture properties
  const isDragging = useRef<boolean>(false);
  const strokePath = useRef<{ x: number; y: number; t: number }[]>([]);
  const [ballPos, setBallPos] = useState({ x: 170, y: 260 }); // scaled for a 340x300 canvas

  // To sync the animation draw loop with triggerKick in Conquest Battle
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
    startX: 170,
    startY: 260
  });

  // Generate random scenario offset parameters when defender slot changes
  useEffect(() => {
    // Each slot might have slightly different distance and angle
    const angle = Math.floor(Math.sin(currentSlot) * 24); // deterministic but looks random (-24 to 24)
    const dist = 25 + (currentSlot * 2.5); // further slots are harder
    setAngleDeg(angle);
    setDistanceYads(Math.round(dist));
    setKickResult('NONE');
    setKicking(false);
    setFeedbackText('');
    setBallPos({ x: 170, y: 260 });
  }, [currentSlot]);

  // Main Canvas Animation Loop
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

    // Canvas size parameters
    const width = 340;
    const height = 300;

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
      if (kicking) {
        // Wind resistance formula: power limits wind's drift
        const windEffectModifier = Math.max(0.1, 1 - (attackerCard.power / 115));
        const normalizedWind = windSpeed * windEffectModifier * 0.08;
        ballVelocityX += normalizedWind;

        // Curve lateral force (including automatic Power curving snap kicks)
        ballVelocityX += activeCurveRate * 0.65;

        ballX += ballVelocityX;
        ballY += ballVelocityY;
        ballZVelocity -= gravity;
        ballZ += ballZVelocity;

        if (ballZ < 0) {
          ballZ = 0;
          ballZVelocity = 0;
        }

        const distanceFraction = Math.max(0.05, 1.0 - (300 - ballY) / 240);
        ballScale = Math.max(0.2, 1.0 * distanceFraction);

        // Reach goal line check (centerY is 300 * 0.25 = 75)
        if (ballY <= 75) {
          evaluateGoalResult(ballX, ballZ);
          setKicking(false);
          return;
        }

        // Out of bounds check
        if (ballX < -50 || ballX > 390 || ballY < -20) {
          setKicking(false);
          setKickResult('OUT_OF_BOUNDS');
          setFeedbackText('OUT OF BOUNDS ON THE FULL!');
          return;
        }
      }

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Arena Grass Field
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#021e02'); // distant grass
      gradient.addColorStop(0.4, '#043404');
      gradient.addColorStop(0.8, '#084b08');
      gradient.addColorStop(1, '#0e5e0e'); // foreground grass
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw standard field markings (50m arc and boundary lines in perspective)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.35);
      ctx.quadraticCurveTo(width / 2, height * 0.3, width, height * 0.35);
      ctx.stroke();

      // Goal-line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(35, height * 0.25);
      ctx.lineTo(width - 35, height * 0.25);
      ctx.stroke();

      // 2. Draw Goalposts in perspective
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
      const goalHeight = 70;
      const behindHeight = 45;

      // Draw Behind Posts (Silver)
      ctx.strokeStyle = '#d4d4d8';
      ctx.lineWidth = 2;

      // Left behind
      ctx.beginPath();
      ctx.moveTo(posts.leftBehind, centerY);
      ctx.lineTo(posts.leftBehind, centerY - behindHeight);
      ctx.stroke();

      // Right behind
      ctx.beginPath();
      ctx.moveTo(posts.rightBehind, centerY);
      ctx.lineTo(posts.rightBehind, centerY - behindHeight);
      ctx.stroke();

      // Draw Main Goal Posts (Gold / White)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;

      // Left main
      ctx.beginPath();
      ctx.moveTo(posts.leftGoal, centerY);
      ctx.lineTo(posts.leftGoal, centerY - goalHeight);
      ctx.stroke();

      // Right main
      ctx.beginPath();
      ctx.moveTo(posts.rightGoal, centerY);
      ctx.lineTo(posts.rightGoal, centerY - goalHeight);
      ctx.stroke();

      // Goal net mesh fill background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(posts.leftGoal, centerY - goalHeight, posts.rightGoal - posts.leftGoal, goalHeight);

      // Simple Post Labels
      ctx.fillStyle = 'rgba(250, 204, 21, 0.8)';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('GOAL', centerX - 11, centerY + 16);

      // 3. Predictive dotted line based on Skill Level
      if (!kicking && strokePath.current.length === 0) {
        const skillLevel = attackerCard.skill;
        // High skill players query accurate line projections
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(ballX, ballY);
        const targetX = centerX - (angleDeg * 2.0);
        const controlX = (ballX + targetX) / 2;
        ctx.quadraticCurveTo(controlX, centerY + 80, targetX, centerY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Draw stroke line during swiping
      if (isDragging.current && strokePath.current.length > 1) {
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(strokePath.current[0].x, strokePath.current[0].y);
        for (let i = 1; i < strokePath.current.length; i++) {
          ctx.lineTo(strokePath.current[i].x, strokePath.current[i].y);
        }
        ctx.stroke();

        const head = strokePath.current[strokePath.current.length - 1];
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(head.x, head.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Draw active kicked ball state or stationary
      if (kicking) {
        // Render tail trail
        history.push({ x: ballX, y: ballY, z: ballZ });
        if (history.length > 8) history.shift();

        ctx.fillStyle = 'rgba(250, 204, 21, 0.12)';
        history.forEach((pt, i) => {
          const ptScale = ballScale * (0.4 + (i / history.length) * 0.6);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y - pt.z, 12 * ptScale, 0, Math.PI * 2);
          ctx.fill();
        });

        // Shadow on grass
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 13 * ballScale, 0, Math.PI * 2);
        ctx.fill();

        // Draw spinning Sherrin ball
        ctx.save();
        ctx.translate(ballX, ballY - ballZ);
        ctx.rotate(frame * 0.25);

        const drawScale = 12 * ballScale;
        ctx.fillStyle = '#b43a24'; // Leather red
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.ellipse(0, 0, drawScale, drawScale * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // White Laces
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-drawScale * 0.4, 0);
        ctx.lineTo(drawScale * 0.4, 0);
        ctx.stroke();

        ctx.restore();
      } else {
        // Stationary ball waiting at ballPos
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(ballPos.x, ballPos.y + 7, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(ballPos.x, ballPos.y);

        ctx.fillStyle = '#b43a24';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;

        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 10, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
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
  }, [kicking, windSpeed, angleDeg, attackerCard, ballPos]);

  // Handle Drag / Swipe mouse inputs
  const handleStart = (clientX: number, clientY: number) => {
    if (kicking) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 340;
    const y = ((clientY - rect.top) / rect.height) * 300;

    const distToBall = Math.hypot(x - ballPos.x, y - ballPos.y);
    if (distToBall < 35) {
      isDragging.current = true;
      strokePath.current = [{ x, y, t: Date.now() }];
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging.current || kicking) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 340;
    const y = ((clientY - rect.top) / rect.height) * 300;

    strokePath.current.push({ x, y, t: Date.now() });
    if (strokePath.current.length > 20) strokePath.current.shift();

    setBallPos({ x, y });
  };

  const handleEnd = () => {
    if (!isDragging.current || kicking) return;
    isDragging.current = false;

    const path = strokePath.current;
    if (path.length < 2) {
      setBallPos({ x: 170, y: 260 });
      return;
    }

    const startPoint = path[0];
    const endPoint = path[path.length - 1];
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const dt = endPoint.t - startPoint.t || 1;

    const speed = -dy / dt; // vertical speed factor
    const angleOffset = dx; 

    if (speed < 0.22 || dy > -15) {
      setBallPos({ x: 170, y: 260 });
      strokePath.current = [];
      return;
    }

    triggerKick(speed, angleOffset, path);
  };

  // Launch physics simulation
  const triggerKick = (swipeVelocity: number, rawAngleOffset: number, path: { x: number; y: number }[]) => {
    // Determine if we are kicking at a sharp angle offset (classic Snap Shot)
    const isSnap = Math.abs(angleDeg) > 10;
    const snapDirection = angleDeg > 0 ? -1 : 1;
    const powerStat = attackerCard.power;
    // Curvature is directly determined by card physical Power
    const snapCurveStrength = (powerStat / 25) * (Math.abs(swipeVelocity) * 0.35);
    const snapCurve = isSnap ? snapDirection * snapCurveStrength : 0;

    // Calculate curve from swipe movement mapping
    let curveRate = 0;
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

      const maxFinesseScale = attackerCard.finesse / 100; // 0.1 to 1.0 modifier
      curveRate = (crossProduct / 500) * maxFinesseScale;
    }

    const totalCurveRate = snapCurve + curveRate;

    const powerSpeedMultiplier = 1.0 + (powerStat / 170);
    const ballVelocityY = -swipeVelocity * 9 * powerSpeedMultiplier;
    const ballVelocityX = (rawAngleOffset / 12) * (1.0 + attackerCard.skill / 220);
    const ballZVelocity = Math.abs(ballVelocityY) * 0.45;

    // Sync with the main draw execution frame loop
    flightSettings.current = {
      vx: ballVelocityX,
      vy: ballVelocityY,
      vz: ballZVelocity,
      curve: totalCurveRate,
      active: true,
      startX: ballPos.x,
      startY: ballPos.y
    };

    setKicking(true);
  };

  const evaluateGoalResult = (ballFinalX: number, ballFinalHeightZ: number) => {
    const width = 340;
    const centerX = width / 2;
    const goalWidth = 14; 
    const behindWidth = 16; 

    const posts = {
      leftBehind: centerX - goalWidth - behindWidth,
      leftGoal: centerX - goalWidth,
      rightGoal: centerX + goalWidth,
      rightBehind: centerX + goalWidth + behindWidth,
    };

    let result: 'NONE' | 'GOAL' | 'BEHIND' | 'POST' | 'OUT_OF_BOUNDS' | 'SHORT' = 'NONE';
    let feedback = '';

    const maxGoalPostHeight = 70;

    // Goal Post bounds check
    if (Math.abs(ballFinalX - posts.leftGoal) < 2 || Math.abs(ballFinalX - posts.rightGoal) < 2) {
      if (ballFinalHeightZ < maxGoalPostHeight) {
        result = 'POST';
        feedback = 'CLANG! Splat on the main timber! Deflected behind.';
      } else {
        result = 'GOAL';
        feedback = 'Over the high post limit! Goal!';
      }
    } else if (Math.abs(ballFinalX - posts.leftBehind) < 2 || Math.abs(ballFinalX - posts.rightBehind) < 2) {
      result = 'POST';
      feedback = 'CLANG! Hit the behind post!';
    } else if (ballFinalX > posts.leftGoal && ballFinalX < posts.rightGoal) {
      result = 'GOAL';
      feedback = 'GOAL! IT SPLITS THE POSTS!';
    } else if (ballFinalX > posts.leftBehind && ballFinalX < posts.leftGoal) {
      result = 'BEHIND';
      feedback = 'One point! Sneaks in left behind.';
    } else if (ballFinalX > posts.rightGoal && ballFinalX < posts.rightBehind) {
      result = 'BEHIND';
      feedback = 'One point! Sneaks in right behind.';
    } else {
      result = 'OUT_OF_BOUNDS';
      feedback = 'Out on the full! Off-target spray.';
    }

    setKickResult(result);
    setFeedbackText(feedback);

    // Trigger haptic vibration for Battle Goal
    if (result === 'GOAL') {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([150, 100, 150]);
      }
    }
  };

  const handleCallbackTrigger = () => {
    if (kickResult === 'GOAL') {
      onGoal();
    } else if (kickResult === 'BEHIND' || kickResult === 'POST') {
      onBehind();
    } else {
      onMiss();
    }
    // reset status
    setKickResult('NONE');
    setKicking(false);
    setFeedbackText('');
    setBallPos({ x: 170, y: 260 });
  };

  return (
    <div className="bg-zinc-950 p-4 border border-white/5 rounded-xl shadow-inner flex flex-col items-center space-y-4">
      
      {/* Simulation Screen Info */}
      <div className="w-full flex justify-between items-center text-[10px] font-mono text-zinc-400 px-1 border-b border-white/5 pb-2">
        <div className="flex items-center gap-1">
          <Wind className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />
          <span>WIND: {windSpeed === 0 ? 'CALM' : `${Math.abs(windSpeed)}KT ${windSpeed > 0 ? 'EAST' : 'WEST'}`}</span>
        </div>
        <div className="flex items-center gap-1">
          <Crosshair className="h-3.5 w-3.5 text-red-500" />
          <span>PORTAL: {distanceYads}M • {angleDeg}° ANGLE</span>
        </div>
      </div>

      {/* Target Canvas Container */}
      <div className="relative w-full max-w-[340px] aspect-[340/300] bg-zinc-950 rounded-lg overflow-hidden border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.6)]">
        
        <canvas
          ref={canvasRef}
          width={340}
          height={300}
          className="block cursor-crosshair w-full h-full"
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
        />

        {/* Instructions pointer */}
        {!kicking && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none animate-bounce">
            <span className="bg-black/90 border border-white/10 px-3.5 py-1.5 rounded text-[9px] font-black text-yellow-500 tracking-widest uppercase flex items-center gap-1 shadow-2xl">
              <ArrowUp className="h-3 w-3" />
              FLICK UP TO SHOOT
            </span>
          </div>
        )}

        {/* Ball state review screen */}
        <AnimatePresence>
          {kickResult !== 'NONE' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-center"
            >
              <div className={`p-4 rounded border flex flex-col items-center max-w-[260px] shadow-2xl bg-zinc-900 ${
                kickResult === 'GOAL' ? 'border-green-500 shadow-green-500/10' :
                kickResult === 'BEHIND' || kickResult === 'POST' ? 'border-yellow-500 shadow-yellow-500/10' :
                'border-red-500 shadow-red-500/10'
              }`}>
                <h3 className={`text-2xl font-black tracking-widest italic uppercase ${
                  kickResult === 'GOAL' ? 'text-green-400' :
                  kickResult === 'BEHIND' || kickResult === 'POST' ? 'text-yellow-400' :
                  'text-red-500'
                }`}>
                  {kickResult === 'POST' ? 'POST HIT!' : kickResult}
                </h3>

                <p className="text-xs text-zinc-300 font-mono mt-2 leading-relaxed">
                  "{feedbackText}"
                </p>

                <button
                  onClick={handleCallbackTrigger}
                  className={`mt-4 px-5 py-2 text-[10px] font-black uppercase tracking-wider rounded transition-all cursor-pointer ${
                    kickResult === 'GOAL' ? 'bg-green-500 text-black hover:bg-green-400' :
                    kickResult === 'BEHIND' || kickResult === 'POST' ? 'bg-yellow-500 text-black hover:bg-yellow-400' :
                    'bg-red-600 text-white hover:bg-red-500'
                  }`}
                >
                  {kickResult === 'GOAL' ? 'CONTINUE RUN' :
                   kickResult === 'BEHIND' || kickResult === 'POST' ? 'RE-KICK TRIAL' :
                   'CONCLUDE SUBMISSION'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider text-center">
         Challenge defender: <strong className="text-white">{defenderName}</strong> by swiping up accurately
      </div>

    </div>
  );
}
