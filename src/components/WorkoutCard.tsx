import React, { useState } from "react";
import { Workout, UserProfile } from "../types";
import { 
  Clock, 
  Bike, 
  Flame, 
  Compass, 
  MessageSquareCode, 
  Edit2, 
  Check, 
  Circle, 
  Save, 
  X, 
  Trash2, 
  Sparkles, 
  Heart, 
  Zap, 
  BookOpen, 
  Smile 
} from "lucide-react";
import SmartHydrationTip from "./SmartHydrationTip";

interface WorkoutCardProps {
  workout: Workout;
  onUpdate: (updatedWorkout: Workout) => void;
  onDelete?: () => void;
  profile?: UserProfile;
  key?: string;
}

// Custom simple markdown helper to render coaching feedback elegantly
function renderSimpleMarkdown(text: string) {
  if (!text) return null;
  const paragraphs = text.split(/\n\s*\n/);
  return (
    <div className="space-y-2.5 leading-relaxed text-slate-700 text-[11.5px] font-sans">
      {paragraphs.map((para, i) => {
        let content = para.trim();
        if (!content) return null;

        // Render bullet lists
        if (content.startsWith("- ") || content.startsWith("* ")) {
          const listItems = content.split(/\n[-*]\s+/);
          return (
            <ul key={i} className="list-disc pl-4 space-y-1 my-1.5 text-slate-700">
              {listItems.map((item, j) => {
                const cleanedItem = j === 0 ? item.replace(/^[-*]\s+/, "") : item;
                return (
                  <li key={j} className="leading-relaxed">
                    {parseBold(cleanedItem)}
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={i} className="leading-relaxed">
            {parseBold(content)}
          </p>
        );
      })}
    </div>
  );
}

function parseBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function WorkoutCard({ workout, onUpdate, onDelete, profile }: WorkoutCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Temporary local state for editing prescription (Coach / Admin)
  const [editType, setEditType] = useState(workout.type);
  const [editTargetZone, setEditTargetZone] = useState(workout.targetZone);
  const [editDuration, setEditDuration] = useState(workout.duration);
  const [editRpe, setEditRpe] = useState(workout.rpe || 5);
  const [editGoal, setEditGoal] = useState(workout.goal);
  const [editStructure, setEditStructure] = useState(workout.structure);
  const [editTip, setEditTip] = useState(workout.tip || "");

  // Temporary local state for completion metrics (Athlete Log)
  const [actualDuration, setActualDuration] = useState<number>(workout.actualDuration || workout.duration);
  const [actualRpe, setActualRpe] = useState<number>(workout.actualRpe || workout.rpe || 5);
  const [actualHr, setActualHr] = useState<string>(workout.actualHr ? String(workout.actualHr) : "");
  const [actualPower, setActualPower] = useState<string>(workout.actualPower ? String(workout.actualPower) : "");
  const [athleteNotes, setAthleteNotes] = useState<string>(workout.athleteNotes || "");
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Determine severity border & shadow based on effort level
  const getRpeStyles = (rpe: number) => {
    if (rpe <= 2) return { text: "text-emerald-600 bg-emerald-50 border-emerald-200", bar: "bg-emerald-500", glow: "border-l-4 border-l-emerald-500" };
    if (rpe <= 4) return { text: "text-sky-600 bg-sky-50 border-sky-200", bar: "bg-sky-400", glow: "border-l-4 border-l-sky-500" };
    if (rpe <= 6) return { text: "text-amber-600 bg-amber-50 border-amber-200", bar: "bg-amber-500", glow: "border-l-4 border-l-amber-500" };
    if (rpe <= 8) return { text: "text-orange-600 bg-orange-50 border-orange-200", bar: "bg-orange-500", glow: "border-l-4 border-l-orange-500" };
    return { text: "text-rose-600 bg-rose-50 border-rose-200", bar: "bg-rose-500", glow: "border-l-4 border-l-rose-500" };
  };

  const getSimpleEffortText = (rpe: number) => {
    if (rpe <= 2) return "Muito Leve 👍";
    if (rpe <= 4) return "Leve 🚴";
    if (rpe <= 6) return "Moderado 🔥";
    if (rpe <= 8) return "Forte ⚡";
    return "Máximo 🚨";
  };

  const rpeStyles = getRpeStyles(workout.rpe || 5);

  const handleSave = () => {
    onUpdate({
      ...workout,
      type: editType,
      targetZone: editTargetZone,
      duration: Number(editDuration) || 0,
      rpe: editRpe,
      goal: editGoal,
      structure: editStructure,
      tip: editTip,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditType(workout.type);
    setEditTargetZone(workout.targetZone);
    setEditDuration(workout.duration);
    setEditRpe(workout.rpe || 5);
    setEditGoal(workout.goal);
    setEditStructure(workout.structure);
    setEditTip(workout.tip || "");
    setIsEditing(false);
  };

  const toggleCompleted = () => {
    if (workout.completed) {
      // Toggle back to not completed, keeping logs in state in case they want to re-complete
      onUpdate({
        ...workout,
        completed: false
      });
    } else {
      // Open the completion dialog
      setActualDuration(workout.actualDuration || workout.duration);
      setActualRpe(workout.actualRpe || workout.rpe || 5);
      setActualHr(workout.actualHr ? String(workout.actualHr) : "");
      setActualPower(workout.actualPower ? String(workout.actualPower) : "");
      setAthleteNotes(workout.athleteNotes || "");
      setIsCompleting(true);
    }
  };

  const handleSimpleSave = () => {
    onUpdate({
      ...workout,
      completed: true,
      actualDuration: Number(actualDuration) || workout.duration,
      actualRpe: Number(actualRpe) || workout.rpe || 5,
      actualHr: actualHr ? Number(actualHr) : undefined,
      actualPower: actualPower ? Number(actualPower) : undefined,
      athleteNotes: athleteNotes.trim() || undefined,
    });
    setIsCompleting(false);
  };

  const handleEvaluateAndSave = async () => {
    setIsEvaluating(true);
    const updatedWorkout: Workout = {
      ...workout,
      completed: true,
      actualDuration: Number(actualDuration) || workout.duration,
      actualRpe: Number(actualRpe) || workout.rpe || 5,
      actualHr: actualHr ? Number(actualHr) : undefined,
      actualPower: actualPower ? Number(actualPower) : undefined,
      athleteNotes: athleteNotes.trim() || undefined,
    };

    try {
      const response = await fetch("/api/evaluate-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: profile || {},
          workout: updatedWorkout
        })
      });

      if (!response.ok) {
        throw new Error("Resposta inválida da API do treinador.");
      }

      const data = await response.json();
      onUpdate({
        ...updatedWorkout,
        aiFeedback: data.aiFeedback || "Ótimo treino! continue focado no plano estruturado."
      });
      setIsCompleting(false);
    } catch (error: any) {
      console.error("Erro na avaliação:", error);
      // Fallback: save workout as completed even if AI failed
      onUpdate(updatedWorkout);
      setIsCompleting(false);
    } finally {
      setIsEvaluating(false);
    }
  };

  // 1. Prescription Edit View Mode
  if (isEditing) {
    return (
      <div 
        id={`workout-edit-${workout.day}`}
        className="bg-slate-50 rounded-2xl p-5 shadow-sm border-2 border-lime-500/55 flex flex-col justify-between gap-4 transition-all duration-200"
      >
        <div className="space-y-3.5">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase font-sans">Editar: {workout.day}</span>
            <span className="text-[10px] text-lime-650 font-bold font-heading uppercase">Modo de Edição</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Nome do Treino</label>
              <input 
                type="text" 
                value={editType} 
                onChange={(e) => setEditType(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-lime-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-hidden font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Zona Alvo</label>
              <input 
                type="text" 
                value={editTargetZone} 
                onChange={(e) => setEditTargetZone(e.target.value)}
                placeholder="Ex: Z2 - Giro"
                className="w-full bg-white border border-slate-200 focus:border-lime-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Duração (minutos)</label>
              <input 
                type="number" 
                value={editDuration} 
                onChange={(e) => setEditDuration(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 focus:border-lime-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-hidden font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Esforço / Intensidade</label>
              <select 
                value={editRpe} 
                onChange={(e) => setEditRpe(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 focus:border-lime-500 rounded-lg p-2 text-xs text-slate-800 outline-hidden"
              >
                <option value={1}>Muito Leve 👍 (Giro Fácil)</option>
                <option value={2}>Muito Leve 👍 (Regenerativo)</option>
                <option value={3}>Leve 🚴 (Resistência)</option>
                <option value={4}>Leve 🚴 (Ritmo Confortável)</option>
                <option value={5}>Moderado 🔥 (Ritmo Firme)</option>
                <option value={6}>Moderado 🔥 (Firme/Z3)</option>
                <option value={7}>Forte ⚡ (Intenso/Z4)</option>
                <option value={8}>Forte ⚡ (Intervalado Ativo)</option>
                <option value={9}>Máximo 🚨 (Esforço Total)</option>
                <option value={10}>Máximo 🚨 (VO2 Max/Tiro)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Foco ou Objetivo do Treino</label>
            <textarea 
              rows={2}
              value={editGoal} 
              onChange={(e) => setEditGoal(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-lime-500 rounded-lg p-2.5 text-xs text-slate-705 outline-hidden resize-none font-sans"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Estrutura de Intervalos</label>
            <textarea 
              rows={3}
              value={editStructure} 
              onChange={(e) => setEditStructure(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-lime-500 rounded-lg p-2.5 text-xs text-slate-705 outline-hidden font-mono resize-none leading-relaxed"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Dica do Treinador</label>
            <input 
              type="text" 
              value={editTip} 
              onChange={(e) => setEditTip(e.target.value)}
              placeholder="Ex: Mantenha a cadência entre 90-95 rpm."
              className="w-full bg-white border border-slate-200 focus:border-lime-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-hidden font-sans italic"
            />
          </div>
        </div>

        <div className="flex gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-lime-500 hover:bg-lime-450 text-slate-950 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer font-heading"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar</span>
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 bg-slate-205 hover:bg-slate-300 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-sans"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancelar</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Athlete Logging completion form
  if (isCompleting) {
    return (
      <div 
        id={`workout-complete-wizard-${workout.day}`}
        className="bg-sky-50/50 rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-2 border-sky-400/60 flex flex-col justify-between gap-4 transition-all duration-300 animate-fadeIn"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2.5 border-b border-sky-100">
            <div className="flex items-center gap-1.5 text-sky-800">
              <Sparkles className="w-4 h-4 text-sky-500 animate-pulse" />
              <span className="text-xs font-heading font-black uppercase tracking-wider">Finalizar Sessão: {workout.day}</span>
            </div>
            <span className="text-[10px] bg-sky-100 text-sky-700 font-mono font-bold px-2 py-0.5 rounded-md">LOG DE TREINO</span>
          </div>

          <div className="bg-white/80 border border-sky-100 p-3 rounded-2xl">
            <span className="text-[9px] text-slate-400 block font-bold leading-none mb-1.5 uppercase">Prescrição do Dia:</span>
            <h5 className="font-heading font-black text-xs text-slate-800 leading-tight">{workout.type}</h5>
            <p className="text-[10.5px] text-slate-500 font-mono mt-1">Meta Original: {workout.duration} min @ Zona {workout.targetZone}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Duração Realizada (min)</label>
              <input 
                type="number" 
                value={actualDuration} 
                onChange={(e) => setActualDuration(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-hidden font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">PSE (Esforço Sentido 1-10)</label>
              <select 
                value={actualRpe} 
                onChange={(e) => setActualRpe(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 focus:border-sky-550 rounded-xl px-1.5 py-1.5 text-xs text-slate-805 outline-hidden font-medium"
              >
                <option value={1}>1/10 (Super Leve) 👍</option>
                <option value={2}>2/10 (Giro Regenerativo)</option>
                <option value={3}>3/10 (Zona de Resistência)</option>
                <option value={4}>4/10 (Ritmo Confortável)</option>
                <option value={5}>5/10 (Esforço Moderado)</option>
                <option value={6}>6/10 (Firme / Ritmo)</option>
                <option value={7}>7/10 (Limiar de Lactato)</option>
                <option value={8}>8/10 (Intervalos Fortes)</option>
                <option value={9}>9/10 (Estresse VO2max)</option>
                <option value={10}>10/10 (Esforço Máximo/Tiro) 🔥</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500/10" />
                <span>FC Média (bpm)</span>
              </label>
              <input 
                type="number" 
                placeholder={profile?.maxHeartRate ? `Máx ${profile.maxHeartRate} bpm` : "Ex: 145"}
                value={actualHr} 
                onChange={(e) => setActualHr(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-hidden font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-500" />
                <span>Potência Média (W)</span>
              </label>
              <input 
                type="number" 
                placeholder={profile?.ftp ? `FTP ${profile.ftp}W` : "Ex: 220"}
                value={actualPower} 
                onChange={(e) => setActualPower(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-slate-400" />
              <span>Notas de Sensações (IA vai avaliar isso)</span>
            </label>
            <textarea 
              rows={3}
              value={athleteNotes} 
              onChange={(e) => setAthleteNotes(e.target.value)}
              placeholder="Como se sentiu? Pernas pesadas, problema com vento, dor, excelente rendimento? Escreva aqui..."
              className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl p-2.5 text-xs text-slate-705 outline-hidden resize-none font-sans leading-relaxed"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-3 border-t border-sky-100">
          <button
            type="button"
            disabled={isEvaluating}
            onClick={handleEvaluateAndSave}
            className="w-full bg-slate-900 border border-slate-950 text-white hover:bg-slate-800 text-xs font-extrabold uppercase font-heading tracking-widest py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all animate-pulse duration-700 disabled:opacity-50 cursor-pointer"
          >
            {isEvaluating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Analisando Telemetria...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span>Salvar e Avaliar com Coach AI 🤖</span>
              </>
            )}
          </button>
          
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isEvaluating}
              onClick={handleSimpleSave}
              className="flex-1 bg-sky-105 hover:bg-sky-200 text-sky-800 border border-sky-100 py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer font-sans disabled:opacity-50"
            >
              Concluir sem Feedback IA
            </button>
            <button
              type="button"
              disabled={isEvaluating}
              onClick={() => setIsCompleting(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-550 py-2 px-3 rounded-xl text-xs font-medium transition-colors cursor-pointer font-sans disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Normal view mode
  return (
    <div 
      id={`workout-${workout.day}`} 
      className={`bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] border transition-all duration-300 flex flex-col justify-between relative overflow-hidden select-none hover:-translate-y-1.5 hover:shadow-[0_12px_24px_rgba(15,23,42,0.07)] hover:border-slate-200 ${
        workout.completed 
          ? "border-emerald-500 shadow-emerald-500/5 bg-emerald-50/15 border-l-[6px] border-l-emerald-500" 
          : `border-slate-100 ${rpeStyles.glow}`
      }`}
    >
      {/* Visual indicator stamp if completed */}
      {workout.completed && (
        <div className="absolute -top-1 -right-1 w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-bl-3xl flex items-center justify-center pl-4 pb-4 shadow-sm">
          <Check className="w-5 h-5 shrink-0 stroke-[3.5] animate-pulse" />
        </div>
      )}

      <div id="card-top-header" className={workout.completed ? "opacity-95" : ""}>
        {/* Day & Label Badge */}
        <div className="flex justify-between items-start gap-2 mb-4 pr-8">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block leading-none mb-1.5">
              {workout.day}
            </span>
            <h4 className={`font-heading font-black text-slate-800 text-lg sm:text-base leading-snug ${workout.completed ? 'text-slate-500 line-through' : ''}`}>
              {workout.type}
            </h4>
          </div>
          <span className={`px-3 py-1 text-[10px] font-mono font-bold rounded-full border shrink-0 transition-transform ${rpeStyles.text}`}>
            {workout.targetZone}
          </span>
        </div>

        {/* Duration & PSE Row */}
        <div className="grid grid-cols-2 gap-3 border-y border-slate-100/60 py-3.5 my-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans leading-none">DURAÇÃO</span>
              <span className="text-xs font-mono font-extrabold text-slate-850 mt-1">
                {workout.completed ? (
                  <>
                    <span className="text-slate-400 line-through text-[10px] mr-1">{workout.duration}m</span>
                    <span className="text-emerald-600">{workout.actualDuration || workout.duration} min</span>
                  </>
                ) : (
                  `${workout.duration} min`
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
              <Flame className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans leading-none">INTENSIDADE</span>
              <span className="text-xs font-heading font-black text-slate-850 mt-1 uppercase tracking-wide">
                {workout.completed && workout.actualRpe ? (
                  <>
                    <span className="text-slate-400 line-through text-[10px] mr-1">RPE{workout.rpe}</span>
                    <span className="text-emerald-600">{getSimpleEffortText(workout.actualRpe)}</span>
                  </>
                ) : (
                  getSimpleEffortText(workout.rpe || 5)
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Real Performance Metrics if completed */}
        {workout.completed && (workout.actualHr || workout.actualPower) && (
          <div className="bg-slate-50/70 border border-slate-100/80 rounded-2xl p-3 mb-4 grid grid-cols-2 gap-2 text-xs font-sans">
            {workout.actualHr && (
              <div className="flex items-center gap-2">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/10" />
                <div>
                  <span className="text-[9px] text-slate-400 font-medium block leading-none uppercase">Frequência</span>
                  <span className="font-mono font-bold text-slate-700">{workout.actualHr} bpm</span>
                </div>
              </div>
            )}
            {workout.actualPower && (
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <div>
                  <span className="text-[9px] text-slate-400 font-medium block leading-none uppercase">Potência Média</span>
                  <span className="font-mono font-bold text-slate-700">{workout.actualPower} W</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Goal */}
        <div id="workout-goal-section" className="mb-4">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest font-heading">Foco do Treino</span>
          </div>
          <p className="text-xs font-sans text-slate-655 leading-relaxed font-normal">{workout.goal}</p>
        </div>

        {/* Structure */}
        <div id="workout-structure-section" className="mb-5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
            <Bike className="w-3.5 h-3.5" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest font-heading">Estrutura de Ritmo</span>
          </div>
          <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 shadow-2xs">
            <p className="text-xs font-mono text-slate-700 leading-relaxed break-words font-medium">{workout.structure}</p>
          </div>
        </div>

        {/* Dica do Treino */}
        {workout.tip && (
          <div id="workout-tip-bubble" className="mt-4 mb-5 p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100/60 flex items-start gap-2.5">
            <MessageSquareCode className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] font-sans font-medium text-slate-650 leading-relaxed italic">{workout.tip}</p>
          </div>
        )}

        {/* Smart Hydration Suggestion Component */}
        <div id={`hydration-advice-wrapper-${workout.day}`} className="mb-5">
          <SmartHydrationTip workout={workout} />
        </div>

        {/* Notes observe if completed */}
        {workout.completed && workout.athleteNotes && (
          <div className="mb-5 p-3 rounded-2xl bg-slate-50 border border-slate-200/50 flex flex-col gap-1 text-[11px] font-sans leading-relaxed text-slate-650 italic">
            <span className="text-[9px] text-slate-400 block font-bold leading-none uppercase not-italic tracking-wider mb-0.5">Minhas Sensações Adicionais:</span>
            "{workout.athleteNotes}"
          </div>
        )}

        {/* Coach AI Voice Feedback Bubble */}
        {workout.completed && workout.aiFeedback && (
          <div className="mb-5 p-4 rounded-3xl bg-sky-50/50 border border-sky-100 flex flex-col gap-2 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sky-850">
                <Sparkles className="w-3.5 h-3.5 text-sky-500 fill-sky-500/10" />
                <span className="text-[9px] font-heading font-black uppercase tracking-wider">Análise Fisiológica AI Coach</span>
              </div>
              <span className="text-[9x] bg-sky-100 text-sky-800 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold">RECOMENDADO</span>
            </div>
            <div className="pl-1 border-l-2 border-sky-200/80">
              {renderSimpleMarkdown(workout.aiFeedback)}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Controls Bar */}
      <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2 w-full">
        {/* Trigger Complete Toggle */}
        <button
          type="button"
          onClick={toggleCompleted}
          className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-extrabold uppercase font-heading tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer ${
            workout.completed
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-slate-100 text-slate-750 hover:bg-slate-200"
          }`}
        >
          {workout.completed ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3.5]" />
              <span>Concluído 🏆</span>
            </>
          ) : (
            <>
              <Circle className="w-3.5 h-3.5" />
              <span>Concluir</span>
            </>
          )}
        </button>

        {/* Trigger Edit Mode */}
        <button
          type="button"
          onClick={() => {
            if (workout.completed) {
              // Open log edit dialog instead of plan structure edit
              setActualDuration(workout.actualDuration || workout.duration);
              setActualRpe(workout.actualRpe || workout.rpe || 5);
              setActualHr(workout.actualHr ? String(workout.actualHr) : "");
              setActualPower(workout.actualPower ? String(workout.actualPower) : "");
              setAthleteNotes(workout.athleteNotes || "");
              setIsCompleting(true);
            } else {
              setIsEditing(true);
            }
          }}
          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer flex items-center justify-center active:scale-95"
          title={workout.completed ? "Reavaliar / Atualizar Log" : "Editar prescrição"}
        >
          <Edit2 className="w-4 h-4" />
        </button>

        {/* Trigger Delete if supplied */}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-2.5 bg-rose-50/50 hover:bg-rose-100/70 border border-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer flex items-center justify-center flex-shrink-0 active:scale-95"
            title="Excluir este treino"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
