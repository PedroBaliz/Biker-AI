import React, { useState } from "react";
import { Workout } from "../types";
import { Clock, Bike, Flame, Compass, MessageSquareCode, Edit2, Check, Circle, Save, X, Trash2 } from "lucide-react";

interface WorkoutCardProps {
  workout: Workout;
  onUpdate: (updatedWorkout: Workout) => void;
  onDelete?: () => void;
  key?: string;
}

export default function WorkoutCard({ workout, onUpdate, onDelete }: WorkoutCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Temporary local state for editing
  const [editType, setEditType] = useState(workout.type);
  const [editTargetZone, setEditTargetZone] = useState(workout.targetZone);
  const [editDuration, setEditDuration] = useState(workout.duration);
  const [editRpe, setEditRpe] = useState(workout.rpe || 5);
  const [editGoal, setEditGoal] = useState(workout.goal);
  const [editStructure, setEditStructure] = useState(workout.structure);
  const [editTip, setEditTip] = useState(workout.tip || "");

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
    // Reset local state to original values
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
    onUpdate({
      ...workout,
      completed: !workout.completed,
    });
  };

  if (isEditing) {
    return (
      <div 
        id={`workout-edit-${workout.day}`}
        className="bg-slate-50 rounded-2xl p-5 shadow-sm border-2 border-lime-500/50 flex flex-col justify-between gap-4 transition-all duration-200 animate-fadeIn"
      >
        <div className="space-y-3.5">
          {/* Header Edit */}
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase font-sans">Editar: {workout.day}</span>
            <span className="text-[10px] text-lime-650 font-bold font-heading uppercase">Modo de Edição</span>
          </div>

          {/* Type / Target Zone Row */}
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
                className="w-full bg-white border border-slate-200 focus:border-lime-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-850 outline-hidden font-mono"
              />
            </div>
          </div>

          {/* Duration & Effort Row */}
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
                className="w-full bg-white border border-slate-200 focus:border-lime-500 rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-hidden"
              >
                <option value={1}>Muito Leve 👍 (Giro Fácil)</option>
                <option value={2}>Muito Leve 👍 (Recuperação)</option>
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

          {/* Goal Description */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Foco ou Objetivo do Treino</label>
            <textarea 
              rows={2}
              value={editGoal} 
              onChange={(e) => setEditGoal(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-lime-500 rounded-lg p-2.5 text-xs text-slate-700 outline-hidden resize-none font-sans"
            />
          </div>

          {/* Structure */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Estrutura de Intervalos</label>
            <textarea 
              rows={3}
              value={editStructure} 
              onChange={(e) => setEditStructure(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-lime-500 rounded-lg p-2.5 text-xs text-slate-700 outline-hidden font-mono resize-none leading-relaxed"
            />
          </div>

          {/* Coach's Tip */}
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

        {/* Form Actions */}
        <div className="flex gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-lime-500 hover:bg-lime-450 text-slate-950 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar</span>
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancelar</span>
          </button>
        </div>
      </div>
    );
  }

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

      <div id="card-top-header" className={workout.completed ? "opacity-80" : ""}>
        {/* Day & Label Badge */}
        <div className="flex justify-between items-start gap-2 mb-4 pr-8">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block leading-none mb-1.5">{workout.day}</span>
            <h4 className={`font-heading font-black text-slate-800 text-base leading-snug ${workout.completed ? 'line-through text-slate-400' : ''}`}>
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
              <span className="text-xs font-mono font-extrabold text-slate-800 mt-1">{workout.duration} min</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
              <Flame className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans leading-none">INTENSIDADE</span>
              <span className="text-xs font-heading font-black text-slate-800 mt-1 uppercase tracking-wide">
                {getSimpleEffortText(workout.rpe || 5)}
              </span>
            </div>
          </div>
        </div>

        {/* Goal */}
        <div id="workout-goal-section" className="mb-4">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest font-heading">Foco do Treino</span>
          </div>
          <p className="text-xs font-sans text-slate-600 leading-relaxed font-normal">{workout.goal}</p>
        </div>

        {/* Structure */}
        <div id="workout-structure-section" className="mb-5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
            <Bike className="w-3.5 h-3.5" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest font-heading">Estrutura de Ritmo</span>
          </div>
          <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 shadow-2xs">
            <p className="text-xs font-mono text-slate-705 leading-relaxed break-words font-medium">{workout.structure}</p>
          </div>
        </div>

        {/* Dica do Treino */}
        {workout.tip && (
          <div id="workout-tip-bubble" className="mt-4 mb-5 p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100/60 flex items-start gap-2.5">
            <MessageSquareCode className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] font-sans font-medium text-slate-650 leading-relaxed italic">{workout.tip}</p>
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
          onClick={() => setIsEditing(true)}
          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer flex items-center justify-center active:scale-95"
          title="Editar este treino"
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
