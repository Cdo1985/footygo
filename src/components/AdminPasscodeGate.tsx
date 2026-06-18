import React, { useState } from 'react';
import { ShieldAlert, KeyRound, CornerDownLeft, Delete } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPasscodeGateProps {
  onUnlock: () => void;
}

export default function AdminPasscodeGate({ onUnlock }: AdminPasscodeGateProps) {
  const [code, setCode] = useState<string>('');
  const [errorText, setErrorText] = useState<string>('');
  const [shake, setShake] = useState<boolean>(false);

  const handleKeyPress = (num: string) => {
    setErrorText('');
    if (code.length < 6) {
      setCode(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setErrorText('');
    setCode(prev => prev.slice(0, -1));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code === '1268') {
      onUnlock();
    } else {
      setShake(true);
      setErrorText('SECURE ACCESS DENIED: INVALID PASSCODE PARAMETERS.');
      setCode('');
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 bg-zinc-950 border-2 border-red-900/40 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col items-center">
      
      {/* Background neon hazard grid accent */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#ef4444_1px,transparent_1px),linear-gradient(to_bottom,#ef4444_1px,transparent_1px)] bg-[size:20px_20px]" />

      <div className="h-12 w-12 bg-red-950/80 border border-red-500/20 rounded-full flex items-center justify-center mb-4">
        <ShieldAlert className="h-6 w-6 text-red-500 animate-pulse" />
      </div>

      <h2 className="text-sm font-black text-white uppercase tracking-widest text-center">
        ADMIN GATEWAY ENCRYPTED
      </h2>
      <p className="text-[10px] text-zinc-500 font-mono text-center mt-1 uppercase max-w-xs">
        STADIUM WALKTHROUGH CONTROLS RESTRICTED TO CLUB TRUSTEES
      </p>

      {/* Code display boxes */}
      <div className="my-6">
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((idx) => (
            <div 
              key={idx}
              className={`h-11 w-11 rounded-lg border-2 flex items-center justify-center font-mono text-lg font-black transition-all ${
                shake ? 'border-red-500 text-red-500 animate-shake' : 
                code.length > idx ? 'border-red-500/85 text-red-500 bg-red-950/20' : 'border-zinc-800 text-zinc-700 bg-zinc-900'
              }`}
            >
              {code.length > idx ? '●' : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Custom Terminal Keypad */}
      <div className="w-full grid grid-cols-3 gap-2.5 max-w-[280px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            onClick={() => handleKeyPress(num)}
            className="py-3 bg-zinc-900/60 border border-zinc-800/40 hover:bg-zinc-800 hover:border-zinc-700 rounded-xl font-mono text-base font-bold text-stone-300 transition-colors cursor-pointer"
          >
            {num}
          </button>
        ))}

        {/* Action Row */}
        <button
          onClick={handleBackspace}
          className="py-3 bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-800/80 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white transition-colors cursor-pointer"
          title="Backspace"
        >
          <Delete className="h-4 w-4" />
        </button>

        <button
          onClick={() => handleKeyPress('0')}
          className="py-3 bg-zinc-900/60 border border-zinc-800/40 hover:bg-zinc-800 hover:border-zinc-700 rounded-xl font-mono text-base font-bold text-stone-300 transition-colors cursor-pointer"
        >
          0
        </button>

        <button
          onClick={() => handleSubmit()}
          className="py-3 bg-red-650 hover:bg-red-550 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer"
          title="Submit PIN"
        >
          <KeyRound className="h-4 w-4" />
        </button>
      </div>

      {/* Error text */}
      <AnimatePresence>
        {errorText && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-2 bg-red-950/30 border border-red-500/20 rounded-md text-[9.5px] text-red-400 font-mono text-center"
          >
            {errorText}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
