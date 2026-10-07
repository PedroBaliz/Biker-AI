import React, { useState } from "react";
import { Workout, WorkoutCompletionLog } from "../types";
import { 
  CheckCircle2, 
  X, 
  Clock, 
  Bike, 
  Zap, 
  AlertCircle,
  HelpCircle,
  Flame,
  ThumbsUp,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WorkoutCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: Workout;
  workoutIndex: number;
  weekNumber: number;
  onSaveLog: (log: WorkoutCompletionLog, updatedWorkout: Workout) => void;
}

export const WorkoutCompletionModal: React.FC<WorkoutCompletionModalProps> = ({
  isOpen,
  onClose,
  workout,
  workoutIndex,
  weekNumber,
  onSaveLog
}) => {
  // Step 1: Completou o treino?
  const [completedStatus, setCompletedStatus] = useState<"sim" | "parcialmente" | "nao">(
    workout.completionStatus || (workout.completed ? "sim" : "nao")
  );

  // Step 2: Dificuldade
  const [difficulty, setDifficulty] = useState<"facil" | "adequada" | "dificil" | "muito_dificil">(
    workout.difficulty || "adequada"
  );

  // Default initial distance calculation if not yet set
  const initialDuration = workout.actualDuration || workout.duration || workout.durationMinutes || 60;
  const initialDistance = workout.actualDistance !== undefined 
    ? String(workout.actualDistance) 
    : String(Math.round((initialDuration / 60) * 25));

  // Step 3: Distância realizada
  const [distanceKm, setDistanceKm] = useState<string>(initialDistance);

  // Step 4: Tempo realizado
  const [durationMin, setDurationMin] = useState<number>(initialDuration);

  // Step 5: Observações opcionais
  const [notes, setNotes] = useState<string>(workout.athleteNotes || "");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedDistance = parseFloat(distanceKm) || 0;
    const parsedDuration = Number(durationMin) || workout.duration || 60;

    const log: WorkoutCompletionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workoutIndex,
      workoutDay: workout.day,
      workoutType: workout.type,
      weekNumber,
      completedAt: new Date().toISOString(),
      completed: completedStatus,
      difficulty,
      actualDistanceKm: parsedDistance,
      actualDurationMin: parsedDuration,
      notes: notes.trim() || undefined,
      targetDurationMin: workout.duration || workout.durationMinutes || 60,
      targetZone: workout.targetZone,
      targetRpe: workout.rpe
    };

    // Map difficulty to approximate RPE for backward compatibility
    let mappedRpe = workout.rpe || 5;
    if (difficulty === "facil") mappedRpe = 3;
    else if (difficulty === "adequada") mappedRpe = 5;
    else if (difficulty === "dificil") mappedRpe = 7;
    else if (difficulty === "muito_dificil") mappedRpe = 9;

    const updatedWorkout: Workout = {
      ...workout,
      completed: completedStatus !== "nao",
      completedDate: new Date().toISOString().slice(0, 10),
      actualDuration: parsedDuration,
      actualDistance: parsedDistance,
      actualRpe: mappedRpe,
      athleteNotes: notes.trim() || undefined,
      completionStatus: completedStatus,
      difficulty: difficulty
    };

    onSaveLog(log, updatedWorkout);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative my-8"
        id="workout-completion-modal"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1 mb-5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-lime-100 text-lime-800 font-bold text-[10px] rounded-full uppercase tracking-wider">
              {workout.day}
            </span>
            <span className="text-xs text-slate-400 font-mono">Semana {weekNumber}</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight font-heading flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-lime-500 shrink-0" />
            <span>Concluir Treino</span>
          </h3>
          <p className="text-xs text-slate-500 font-sans">
            Registre suas sensações para acompanhar sua evolução e alimentar o histórico do atleta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Question 1: Você completou o treino? */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 font-heading">
              1. Você completou o treino?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "sim", label: "Sim", desc: "100% feito", color: "peer-checked:bg-emerald-50 peer-checked:border-emerald-500 peer-checked:text-emerald-900" },
                  { value: "parcialmente", label: "Parcialmente", desc: "Parte da meta", color: "peer-checked:bg-amber-50 peer-checked:border-amber-500 peer-checked:text-amber-900" },
                  { value: "nao", label: "Não", desc: "Não realizei", color: "peer-checked:bg-rose-50 peer-checked:border-rose-500 peer-checked:text-rose-900" }
                ] satisfies readonly { value: "sim" | "parcialmente" | "nao"; label: string; desc: string; color: string }[]
              ).map((item) => (
                <label
                  key={item.value}
                  className="cursor-pointer relative block"
                >
                  <input
                    type="radio"
                    name="completion_status"
                    value={item.value}
                    checked={completedStatus === item.value}
                    onChange={() => setCompletedStatus(item.value)}
                    className="sr-only peer"
                  />
                  <div className={`p-3 rounded-2xl border-2 border-slate-200 hover:border-slate-300 text-center transition-all ${item.color}`}>
                    <div className="text-xs font-black text-slate-800">{item.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Question 2: Como foi a dificuldade? */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 font-heading">
              2. Como foi a dificuldade?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { value: "facil", label: "Fácil", badge: "Leve" },
                  { value: "adequada", label: "Adequada", badge: "No ponto" },
                  { value: "dificil", label: "Difícil", badge: "Puxado" },
                  { value: "muito_dificil", label: "Muito difícil", badge: "Extremo" }
                ] satisfies readonly { value: "facil" | "adequada" | "dificil" | "muito_dificil"; label: string; badge: string }[]
              ).map((item) => (
                <label
                  key={item.value}
                  className="cursor-pointer relative block"
                >
                  <input
                    type="radio"
                    name="difficulty"
                    value={item.value}
                    checked={difficulty === item.value}
                    onChange={() => setDifficulty(item.value)}
                    className="sr-only peer"
                  />
                  <div className="p-3 rounded-2xl border-2 border-slate-200 hover:border-slate-300 text-center transition-all peer-checked:bg-lime-50 peer-checked:border-lime-500 peer-checked:text-slate-950">
                    <div className="text-xs font-black text-slate-800">{item.label}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5 font-bold uppercase">{item.badge}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Question 3 & 4: Distância realizada & Tempo realizado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 3. Distância */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 font-heading flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-slate-500" />
                <span>3. Distância realizada (km)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="Ex: 32.5"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-lime-500 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-hidden font-bold"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">km</span>
              </div>
            </div>

            {/* 4. Tempo */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 font-heading flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>4. Tempo realizado (min)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                  placeholder="Ex: 60"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-lime-500 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-hidden font-bold"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">min</span>
              </div>
            </div>
          </div>

          {/* Question 5: Observações opcionais */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 font-heading flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>5. Observações opcionais</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Vento forte no retorno, hidratação ok, frequência cardíaca estável."
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-lime-500 rounded-xl p-3 text-xs text-slate-800 outline-hidden font-sans resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-350 text-slate-950 font-black text-xs font-heading uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>Salvar Evolução</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default WorkoutCompletionModal;
