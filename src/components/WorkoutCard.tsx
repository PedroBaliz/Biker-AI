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

  // Determine severity border & shadow based on RPE
  const getRpeStyles = (rpe: number) => {
    if (rpe <= 2) return { text: "text-emerald-600 bg-emerald-50 border-emerald-200", bar: "bg-emerald-500", glow: "border-l-4 border-l-emerald-500" };
    if (rpe <= 4) return { text: "text-sky-600 bg-sky-50 border-sky-200", bar: "bg-sky-400", glow: "border-l-4 border-l-sky-500" };
    if (rpe <= 6) return { text: "text-amber-600 bg-amber-50 border-amber-200", bar: "bg-amber-500", glow: "border-l-4 border-l-amber-500" };
    if (rpe <= 8) return { text: "text-orange-600 bg-orange-50 border-orange-200", bar: "bg-orange-500", glow: "border-l-4 border-l-orange-500" };
    return { text: "text-rose-600 bg-rose-50 border-rose-200", bar: "bg-rose-500", glow: "border-l-4 border-l-rose-500" };
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

          {/* Duration & RPE Row */}
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
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Esforço (1 a 10)</label>
              <select 
                value={editRpe} 
                onChange={(e) => setEditRpe(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 focus:border-lime-500 rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-hidden"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                  <option key={val} value={val}>{val}/10 {val <= 2 ? '👍 Leve' : val <= 4 ? '🚴 Moderado' : val <= 6 ? '🔥 Firme' : val <= 8 ? '⚡ Forte' : '🚨 Extremo'}</option>
                ))}
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
      className={`bg-white rounded-2xl p-5 shadow-xs border transition-all duration-300 flex flex-col justify-between relative overflow-hidden select-none hover:shadow-md ${
        workout.completed 
          ? "border-emerald-500 shadow-emerald-500/5 bg-emerald-50/10 border-l-[6px] border-l-emerald-500" 
          : `border-slate-100 ${rpeStyles.glow}`
      }`}
    >
      {/* Visual indicator stamp if completed */}
      {workout.completed && (
        <div className="absolute -top-1 -right-1 w-14 h-14 bg-emerald-500 text-white rounded-bl-3xl flex items-center justify-center pl-3 pb-3 shadow-xs">
          <Check className="w-5 h-5 shrink-0 stroke-[3]" />
        </div>
      )}

      <div id="card-top-header" className={workout.completed ? "opacity-75" : ""}>
        {/* Day & Label Badge */}
        <div className="flex justify-between items-start gap-2 mb-3 pr-8">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-sans">{workout.day}</span>
            <h4 className={`font-heading font-extrabold text-slate-800 text-base leading-tight mt-0.5 ${workout.completed ? 'line-through text-slate-500' : ''}`}>
              {workout.type}
            </h4>
          </div>
          <span className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-full border shrink-0 ${rpeStyles.text}`}>
            {workout.targetZone}
          </span>
        </div>

        {/* Duration & PSE Row */}
        <div className="grid grid-cols-2 gap-2 border-y border-slate-50 py-3 my-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-sans leading-none">DURAÇÃO</span>
              <span className="text-xs font-mono font-bold text-slate-700 mt-1">{workout.duration} min</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-slate-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-sans leading-none">ESFORÇO ALVO</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-mono font-bold text-slate-700">{workout.rpe}/10</span>
                <div id="rpe-progress-bar-container" className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${rpeStyles.bar}`} style={{ width: `${workout.rpe * 10}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Goal */}
        <div id="workout-goal-section" className="mb-3.5">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-heading">Foco do Treino</span>
          </div>
          <p className="text-xs font-sans text-slate-600 leading-relaxed">{workout.goal}</p>
        </div>

        {/* Structure */}
        <div id="workout-structure-section" className="mb-4">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Bike className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-heading">Estrutura do Treino</span>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <p className="text-xs font-mono text-slate-700 leading-relaxed break-words">{workout.structure}</p>
          </div>
        </div>

        {/* Dica do Treino */}
        {workout.tip && (
          <div id="workout-tip-bubble" className="mt-3.5 mb-4 pt-3 border-t border-slate-50 flex items-start gap-2 text-[11px] text-slate-500 italic bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/50">
            <MessageSquareCode className="w-3.5 h-3.5 text-amber-550 shrink-0 mt-0.5" />
            <p className="leading-normal font-sans text-slate-650">{workout.tip}</p>
          </div>
        )}
      </div>

      {/* Interactive Controls Bar */}
      <div className="mt-auto pt-3 border-t border-slate-100 flex gap-2 w-full pt-4">
        {/* Trigger Complete Toggle */}
        <button
          type="button"
          onClick={toggleCompleted}
          className={`flex-1 py-2 px-2.5 rounded-lg text-[11px] font-extrabold uppercase font-heading tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            workout.completed
              ? "bg-emerald-500 text-white shadow-xs hover:bg-emerald-650"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {workout.completed ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
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
          className="p-2 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
          title="Editar este treino"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        {/* Trigger Delete if supplied */}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center flex-shrink-0"
            title="Excluir este treino"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
