import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Bike, Zap, Activity, Sparkles, CheckCircle2 } from "lucide-react";

interface InstalledAppSplashProps {
  onComplete: () => void;
}

export default function InstalledAppSplash({ onComplete }: InstalledAppSplashProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Iniciando ambiente instalado...");

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onComplete();
          }, 350);
          return 100;
        }

        const next = prev + 5;
        if (next === 25) setStatusText("Carregando inteligência de treinos...");
        if (next === 55) setStatusText("Sincronizando zonas & FTP...");
        if (next === 85) setStatusText("Sua plataforma de alta performance está pronta!");
        return next;
      });
    }, 45);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: "blur(4px)" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 text-white select-none overflow-hidden"
    >
      {/* Background glowing light aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-lime-500/12 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Speed lines background decorative grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#a3e635_1px,transparent_1px)] [background-size:16px_16px]"
      />

      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-sm w-full">
        {/* Animated Bike Icon Badge */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 220, damping: 16 }}
          className="relative mb-6"
        >
          {/* Pulsing Outer Rings */}
          <span className="absolute -inset-4 rounded-3xl bg-lime-400/20 animate-ping opacity-75" />
          <span className="absolute -inset-2 rounded-3xl bg-lime-500/30 blur-sm" />
          
          <div className="relative p-5 bg-slate-900 border-2 border-lime-400 rounded-2xl shadow-[0_0_40px_rgba(163,230,53,0.35)] text-lime-400 flex items-center justify-center">
            <Bike className="w-12 h-12 animate-pulse text-lime-400" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="w-5 h-5 text-cyan-400 fill-cyan-400/30" />
            </motion.div>
          </div>
        </motion.div>

        {/* Installed PWA Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-lime-400/10 border border-lime-400/35 text-lime-400 text-[10px] font-black uppercase tracking-widest mb-3 shadow-xs"
        >
          <Zap className="w-3.5 h-3.5 fill-lime-400" />
          <span>APLICATIVO INSTALADO • BIKER AI</span>
        </motion.div>

        {/* App Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-3xl sm:text-4xl font-black font-heading tracking-tight text-white mb-1"
        >
          BIKER <span className="text-lime-400">AI</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-xs text-slate-400 font-medium mb-8 flex items-center gap-1.5"
        >
          <Activity className="w-3.5 h-3.5 text-lime-400 animate-pulse" />
          <span>Smart Assessment & Treino Personalizado</span>
        </motion.p>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full bg-slate-900 border border-slate-800 rounded-full h-3 p-0.5 overflow-hidden shadow-inner mb-3 relative"
        >
          <div
            className="h-full bg-gradient-to-r from-lime-500 via-emerald-400 to-cyan-400 rounded-full transition-all duration-75 ease-out shadow-[0_0_15px_rgba(163,230,53,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </motion.div>

        {/* Status indicator */}
        <div className="flex items-center justify-between w-full text-[11px] font-mono text-slate-400 px-1 mb-6">
          <span className="truncate pr-2">{statusText}</span>
          <span className="text-lime-400 font-bold shrink-0">{progress}%</span>
        </div>

        {/* Quick entry button if user wants to skip wait */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: progress > 30 ? 1 : 0 }}
          onClick={onComplete}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-lime-400 font-bold uppercase tracking-wider transition-colors cursor-pointer bg-slate-900/80 hover:bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
          <span>Entrar no App</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
