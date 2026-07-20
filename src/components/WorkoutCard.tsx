import React, { useState } from "react";
import { Workout, UserProfile, isRestDay } from "../types";
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
  Smile,
  ShieldAlert,
  ExternalLink,
  Loader2,
  Lock,
  XCircle,
  Info
} from "lucide-react";
import SmartHydrationTip from "./SmartHydrationTip";

interface WorkoutCardProps {
  workout: Workout;
  onUpdate: (updatedWorkout: Workout) => void;
  onDelete?: () => void;
  profile?: UserProfile;
  key?: string;
  allWorkouts?: Workout[];
  isSimpleMode?: boolean;
}

// Translation helper for simplified display mode (sensation-based, no technical jargon)
function getSimplifiedText(text: string | undefined): string {
  if (!text) return "";
  
  let result = text;
  
  // Replace Z1..Z7 with simplified descriptions
  result = result.replace(/Z1\s*\(Recuperação\)|Z1/gi, "Muito Leve (Giro Regenerativo)");
  result = result.replace(/Z2\s*\(Endurance\)|Z2\s*\(Resistência\)|Z2/gi, "Leve (Giro confortável / Ritmo de conversa)");
  result = result.replace(/Z3\s*\(Tempo\/Ritmo\)|Z3\s*\(Tempo\)|Z3/gi, "Moderado (Esforço firme / Fôlego presente)");
  result = result.replace(/Z4\s*\(Limiar de Lactato\)|Z4\s*\(Limiar\)|Z4/gi, "Forte (Seu limite / Falar poucas palavras)");
  result = result.replace(/Z5\s*\(VO2 M[aá]ximo\)|Z5\s*\(VO2\s*Max\)|Z5/gi, "Muito Forte (Fôlego extremo / VO2 Max)");
  result = result.replace(/Z6\s*\(Capacidade\s+Anaer[oó]bica\)|Z6/gi, "Explosivo (Força máxima / Arrancada)");
  result = result.replace(/Z7\s*\(Pot[eê]ncia\s+Neuromuscular\)|Z7/gi, "Explosão Máxima");
  
  // Replace other technical jargon
  result = result.replace(/FTP/gi, "seu esforço limite atual (FTP)");
  result = result.replace(/Fartlek/gi, "ritmos variados (jogo de velocidade)");
  result = result.replace(/Sweet Spot/gi, "ritmo firme eficiente");
  result = result.replace(/limiar de lactato/gi, "limiar de esforço pesado");
  result = result.replace(/overtraining/gi, "excesso de treino (esgotamento)");
  result = result.replace(/microciclo de progressão/gi, "ciclo de evolução de cargas");
  result = result.replace(/supercompensação/gi, "recuperação super-compensada");
  result = result.replace(/mitocôndrias/gi, "geradores de fôlego do corpo");
  result = result.replace(/mitocondriais/gi, "geradores de fôlego corporal");
  result = result.replace(/glicogênio muscular/gi, "reservas de energia muscular");
  result = result.replace(/glicogênio/gi, "reservas de energia");
  result = result.replace(/capilarização muscular/gi, "oxigenação dos músculos");
  
  return result;
}

function getZoneExplanation(zone: string): string {
  const z = zone.toUpperCase();
  if (z.includes("Z1") || z.includes("RECUPERAÇÃO") || z.includes("REGENERATIVO")) {
    return "Zona 1 (Giro Regenerativo): Intensidade super leve para soltar as pernas e recuperar os músculos de treinos anteriores. Sem cansaço ou fôlego curto.";
  }
  if (z.includes("Z2") || z.includes("ENDURANCE") || z.includes("RESISTÊNCIA")) {
    return "Zona 2 (Ritmo de Viagem): Intensidade confortável que você consegue manter por horas. Ideal para construir resistência aeróbica básica e queimar gordura.";
  }
  if (z.includes("Z3") || z.includes("TEMPO") || z.includes("RITMO")) {
    return "Zona 3 (Ritmo Firme): Intensidade moderadamente forte. Respiração fica profunda e constante. Exige foco para manter, mas ainda é possível falar.";
  }
  if (z.includes("Z4") || z.includes("LIMIAR") || z.includes("FTP") || z.includes("LACTATO")) {
    return "Zona 4 (Limiar / Força): Intensidade forte e cansativa. Pernas começam a arder devido ao esforço e só dá para falar frases muito curtas.";
  }
  if (z.includes("Z5") || z.includes("VO2") || z.includes("MÁXIMO")) {
    return "Zona 5 (VO2 Máximo): Intensidade extrema e exaustiva. Fôlego no limite e respiração ofegante total. Sustentável por poucos minutos.";
  }
  return "Zona de Intensidade Coordenada: Esforço técnico calculado especificamente para otimizar seus marcadores físicos.";
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

export default function WorkoutCard({ workout, onUpdate, onDelete, profile, allWorkouts, isSimpleMode = true }: WorkoutCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showLimitError, setShowLimitError] = useState(false);
  const [showZoneExplanation, setShowZoneExplanation] = useState(false);

  const displayType = isSimpleMode ? getSimplifiedText(workout.type) : workout.type;
  const displayTargetZone = isSimpleMode ? getSimplifiedText(workout.targetZone) : workout.targetZone;
  const displayGoal = isSimpleMode ? getSimplifiedText(workout.goal) : workout.goal;
  const displayStructure = isSimpleMode ? getSimplifiedText(workout.structure) : workout.structure;
  const displayTip = isSimpleMode ? getSimplifiedText(workout.tip) : workout.tip;
  
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
  const [actualAvgSpeed, setActualAvgSpeed] = useState<string>(workout.actualAvgSpeed ? String(workout.actualAvgSpeed) : "");
  const [actualDistance, setActualDistance] = useState<string>(workout.actualDistance ? String(workout.actualDistance) : "");
  const [actualElevation, setActualElevation] = useState<string>(workout.actualElevation ? String(workout.actualElevation) : "");
  const [actualCalories, setActualCalories] = useState<string>(workout.actualCalories ? String(workout.actualCalories) : "");
  const [actualStravaLink, setActualStravaLink] = useState<string>(workout.actualStravaLink || "");
  const [athleteNotes, setAthleteNotes] = useState<string>(workout.athleteNotes || "");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isParsingStrava, setIsParsingStrava] = useState(false);

  // Check if this card represents a workout block in a past day of the week that wasn't completed
  const getDayNumber = (dayName: string): number => {
    if (!dayName) return 0;
    const norm = dayName.toLowerCase();
    if (norm.includes("segunda")) return 1;
    if (norm.includes("terça") || norm.includes("terca")) return 2;
    if (norm.includes("quarta")) return 3;
    if (norm.includes("quinta")) return 4;
    if (norm.includes("sexta")) return 5;
    if (norm.includes("sáb") || norm.includes("sab")) return 6;
    if (norm.includes("domingo")) return 7;
    return 0;
  };

  const currentDayNum = new Date().getDay();
  // Map Sunday from 0 to 7 so the week flows from Monday (1) to Sunday (7)
  const currentDayInWeek = currentDayNum === 0 ? 7 : currentDayNum;
  const wDayNum = getDayNumber(workout.day);
  const isPastAndUncompleted = !workout.completed && wDayNum > 0 && wDayNum < currentDayInWeek;

  const handleAutoLoadStrava = async () => {
    if (!actualStravaLink.trim()) return;
    setIsParsingStrava(true);
    try {
      const response = await fetch("/api/parse-strava", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stravaLink: actualStravaLink.trim(),
          workout: {
            duration: editDuration || workout.duration,
            targetZone: editTargetZone || workout.targetZone,
            type: editType || workout.type,
            rpe: editRpe || workout.rpe || 5,
            goal: editGoal || workout.goal
          },
          profile
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          if (data.actualDuration !== undefined) setActualDuration(data.actualDuration);
          if (data.actualRpe !== undefined) setActualRpe(data.actualRpe);
          if (data.actualHr !== undefined) setActualHr(String(data.actualHr));
          if (data.actualPower !== undefined) setActualPower(String(data.actualPower));
          if (data.actualAvgSpeed !== undefined) setActualAvgSpeed(String(data.actualAvgSpeed));
          if (data.actualDistance !== undefined) setActualDistance(String(data.actualDistance));
          if (data.actualElevation !== undefined) setActualElevation(String(data.actualElevation));
          if (data.actualCalories !== undefined) setActualCalories(String(data.actualCalories));
          if (data.athleteNotes !== undefined) setAthleteNotes(data.athleteNotes);
        }
      }
    } catch (err) {
      console.error("Error auto-loading Strava:", err);
    } finally {
      setIsParsingStrava(false);
    }
  };

  // Determine severity border & shadow based on effort level
  const getRpeStyles = (rpe: number) => {
    if (rpe <= 2) return { text: "text-emerald-600 bg-emerald-50 border-emerald-200", bar: "bg-emerald-500", glow: "border-l-4 border-l-emerald-500" };
    if (rpe <= 4) return { text: "text-sky-600 bg-sky-50 border-sky-200", bar: "bg-sky-400", glow: "border-l-4 border-l-sky-500" };
    if (rpe <= 6) return { text: "text-amber-600 bg-amber-50 border-amber-200", bar: "bg-amber-500", glow: "border-l-4 border-l-amber-500" };
    if (rpe <= 8) return { text: "text-orange-600 bg-orange-50 border-orange-200", bar: "bg-orange-500", glow: "border-l-4 border-l-orange-500" };
    return { text: "text-rose-600 bg-rose-50 border-rose-200", bar: "bg-rose-500", glow: "border-l-4 border-l-rose-500" };
  };

  const getSimpleEffortText = (rpe: number) => {
    if (rpe <= 2) return "Muito Leve";
    if (rpe <= 4) return "Leve";
    if (rpe <= 6) return "Moderado";
    if (rpe <= 8) return "Forte";
    return "Máximo";
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
    if (isPastAndUncompleted) {
      return;
    }
    if (workout.completed) {
      // Toggle back to not completed, keeping logs in state in case they want to re-complete
      onUpdate({
        ...workout,
        completed: false,
        completedDate: undefined
      });
    } else {
      // Rule: Only 1 completed workout is allowed per calendar day.
      const todayStr = new Date().toISOString().slice(0, 10);
      const hasCompletedToday = allWorkouts?.some(
        (w) => w.completed && w.completedDate === todayStr && w.day !== workout.day
      );

      if (hasCompletedToday) {
        setShowLimitError(true);
        return;
      }

      // Open the completion dialog
      setActualDuration(workout.actualDuration || workout.duration);
      setActualRpe(workout.actualRpe || workout.rpe || 5);
      setActualHr(workout.actualHr ? String(workout.actualHr) : "");
      setActualPower(workout.actualPower ? String(workout.actualPower) : "");
      setActualAvgSpeed(workout.actualAvgSpeed ? String(workout.actualAvgSpeed) : "");
      setActualDistance(workout.actualDistance ? String(workout.actualDistance) : "");
      setActualElevation(workout.actualElevation ? String(workout.actualElevation) : "");
      setActualCalories(workout.actualCalories ? String(workout.actualCalories) : "");
      setActualStravaLink(workout.actualStravaLink || "");
      setAthleteNotes(workout.athleteNotes || "");
      setIsCompleting(true);
    }
  };

  const handleSimpleSave = () => {
    onUpdate({
      ...workout,
      completed: true,
      completedDate: new Date().toISOString().slice(0, 10),
      actualDuration: Number(actualDuration) || workout.duration,
      actualRpe: Number(actualRpe) || workout.rpe || 5,
      actualHr: actualHr ? Number(actualHr) : undefined,
      actualPower: actualPower ? Number(actualPower) : undefined,
      actualAvgSpeed: actualAvgSpeed ? Number(actualAvgSpeed) : undefined,
      actualDistance: actualDistance ? Number(actualDistance) : undefined,
      actualElevation: actualElevation ? Number(actualElevation) : undefined,
      actualCalories: actualCalories ? Number(actualCalories) : undefined,
      actualStravaLink: actualStravaLink.trim() || undefined,
      athleteNotes: athleteNotes.trim() || undefined,
    });
    setIsCompleting(false);
  };

  const handleEvaluateAndSave = async () => {
    setIsEvaluating(true);
    const updatedWorkout: Workout = {
      ...workout,
      completed: true,
      completedDate: new Date().toISOString().slice(0, 10),
      actualDuration: Number(actualDuration) || workout.duration,
      actualRpe: Number(actualRpe) || workout.rpe || 5,
      actualHr: actualHr ? Number(actualHr) : undefined,
      actualPower: actualPower ? Number(actualPower) : undefined,
      actualAvgSpeed: actualAvgSpeed ? Number(actualAvgSpeed) : undefined,
      actualDistance: actualDistance ? Number(actualDistance) : undefined,
      actualElevation: actualElevation ? Number(actualElevation) : undefined,
      actualCalories: actualCalories ? Number(actualCalories) : undefined,
      actualStravaLink: actualStravaLink.trim() || undefined,
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
        completedDate: new Date().toISOString().slice(0, 10),
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
        className="bg-slate-50 rounded-2xl p-5 shadow-sm border-2 border-lime-500/55 flex flex-col justify-between gap-4 transition-all duration-200 w-full"
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
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Esforço Sugerido (PSE ou Sensação de Esforço de 1 a 10)</label>
              <select 
                value={editRpe} 
                onChange={(e) => setEditRpe(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 focus:border-lime-500 rounded-lg p-2 text-xs text-slate-800 outline-hidden"
              >
                <option value={1}>Muito Leve (Giro Fácil)</option>
                <option value={2}>Muito Leve (Regenerativo)</option>
                <option value={3}>Leve (Resistência)</option>
                <option value={4}>Leve (Ritmo Confortável)</option>
                <option value={5}>Moderado (Ritmo Firme)</option>
                <option value={6}>Moderado (Firme/Z3)</option>
                <option value={7}>Forte (Intenso/Z4)</option>
                <option value={8}>Forte (Intervalado Ativo)</option>
                <option value={9}>Máximo (Esforço Total)</option>
                <option value={10}>Máximo (VO2 Max/Tiro)</option>
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

  // 1.5. Limit reach warning view mode
  if (showLimitError) {
    return (
      <div 
        id={`workout-limit-error-${workout.day}`}
        className="bg-rose-50/40 rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border-2 border-rose-300 flex flex-col justify-between gap-5 transition-all duration-300 animate-fadeIn w-full"
      >
        <div className="space-y-3.5">
          <div className="flex justify-between items-center pb-2.5 border-b border-rose-100">
            <div className="flex items-center gap-1.5 text-rose-800 font-heading font-black text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4.5 h-4.5 text-rose-500 shrink-0" />
              <span>Regra de Limite Diário</span>
            </div>
          </div>

          <div className="bg-white border border-rose-100 p-4 rounded-2xl space-y-3.5">
            <p className="text-xs text-rose-950 font-sans leading-relaxed font-semibold">
              Você já concluiu um treino hoje! Pela regra do método, <strong className="text-rose-600 font-extrabold uppercase">só é permitido concluir 1 treino por dia</strong> para preservar sua saúde.
            </p>
            <div className="space-y-3 text-[11px] text-slate-600 leading-relaxed font-sans border-t border-rose-100/50 pt-3">
              <div>
                <strong className="text-slate-800 uppercase tracking-wide text-[9px] text-rose-700 block mb-0.5">1. Evita o Overtraining (Excesso de Treino):</strong>
                Pedalar cansado ou treinar duas vezes no mesmo dia desgasta demais as articulações, baixa sua imunidade e gera fadiga crônica.
              </div>
              <div>
                <strong className="text-slate-800 uppercase tracking-wide text-[9px] text-rose-700 block mb-0.5">2. Supercompensação (Ganho Real de Força):</strong>
                O seu corpo só ganha resistência e potência muscular durante o **descanso/repouso de 24 horas**. Pedalar sem parar na verdade te deixa mais fraco e esgotado.
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowLimitError(false)}
          className="w-full bg-rose-500 hover:bg-rose-600 text-white py-2.5 px-3 rounded-xl text-[10px] font-extrabold uppercase font-heading tracking-wider transition-all shadow-2xs active:scale-95 cursor-pointer text-center"
        >
          Entendi, vou descansar hoje!
        </button>
      </div>
    );
  }

  // 2. Athlete Logging completion form
  if (isCompleting) {
    return (
      <div 
        id={`workout-complete-wizard-${workout.day}`}
        className="bg-sky-50/50 rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-2 border-sky-400/60 flex flex-col justify-between gap-4 transition-all duration-300 animate-fadeIn w-full"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2.5 border-b border-sky-100">
            <div className="flex items-center gap-1.5 text-sky-800">
              <Sparkles className="w-4 h-4 text-sky-500 animate-pulse" />
              <span className="text-xs font-heading font-black uppercase tracking-wider">{workout.completed ? "Editar Log do Pedal" : "Finalizar Sessão"}: {workout.day}</span>
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
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">PSE (Nota da sua Sensação de Esforço / Cansaço de 1 a 10)</label>
              <select 
                value={actualRpe} 
                onChange={(e) => setActualRpe(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 focus:border-sky-550 rounded-xl px-1.5 py-1.5 text-xs text-slate-805 outline-hidden font-medium"
              >
                <option value={1}>1/10 (Super Leve)</option>
                <option value={2}>2/10 (Giro Regenerativo)</option>
                <option value={3}>3/10 (Zona de Resistência)</option>
                <option value={4}>4/10 (Ritmo Confortável)</option>
                <option value={5}>5/10 (Esforço Moderado)</option>
                <option value={6}>6/10 (Firme / Ritmo)</option>
                <option value={7}>7/10 (Limiar de Lactato)</option>
                <option value={8}>8/10 (Intervalos Fortes)</option>
                <option value={9}>9/10 (Estresse VO2max)</option>
                <option value={10}>10/10 (Esforço Máximo/Tiro)</option>
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

          {/* Strava / Ciclocomputador Telemetry */}
          <div className="bg-slate-50 border border-slate-200/50 p-3.5 rounded-2xl space-y-3">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                Métricas do Pedal (Strava / GPS)
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">
                  Distância (km)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Ex: 42.5"
                  value={actualDistance} 
                  onChange={(e) => setActualDistance(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-hidden font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">
                  Velocidade Média (km/h)
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  placeholder="Ex: 28.5"
                  value={actualAvgSpeed} 
                  onChange={(e) => setActualAvgSpeed(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-hidden font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">
                  Elevação / Altimetria (m)
                </label>
                <input 
                  type="number" 
                  placeholder="Ex: 450"
                  value={actualElevation} 
                  onChange={(e) => setActualElevation(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-hidden font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">
                  Calorias (kcal)
                </label>
                <input 
                  type="number" 
                  placeholder="Ex: 750"
                  value={actualCalories} 
                  onChange={(e) => setActualCalories(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-hidden font-mono"
                />
              </div>
            </div>

            <div className="space-y-1 pt-0.5">
              <div className="flex justify-between items-center">
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">
                  Link do Pedal no Strava (Opcional)
                </label>
                {actualStravaLink.trim() && (
                  <button
                    type="button"
                    onClick={handleAutoLoadStrava}
                    disabled={isParsingStrava}
                    className="text-[9.5px] text-sky-600 hover:text-sky-700 font-extrabold uppercase tracking-wide flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isParsingStrava ? (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        <span>Sincronizando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-2.5 h-2.5 text-sky-500" />
                        <span>Sincronizar Dados</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <input 
                type="url" 
                placeholder="https://strava.com/activities/..."
                value={actualStravaLink} 
                onChange={(e) => setActualStravaLink(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-hidden placeholder:text-slate-400 font-sans"
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
                <span>{workout.completed ? "Atualizar e Reavaliar com Coach AI" : "Salvar e Avaliar com Coach AI"}</span>
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
              {workout.completed ? "Apenas Salvar Alterações" : "Concluir sem Feedback IA"}
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
      className={`bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] border transition-all duration-300 flex flex-col justify-between relative overflow-hidden select-none hover:-translate-y-1.5 hover:shadow-[0_12px_24px_rgba(15,23,42,0.07)] hover:border-slate-200 w-full ${
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
              {displayType}
            </h4>
          </div>
          <button 
            type="button"
            onClick={() => setShowZoneExplanation(!showZoneExplanation)}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded-full border shrink-0 transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${rpeStyles.text}`}
            title="Clique para ver o que significa esta zona de esforço"
          >
            <span>{displayTargetZone}</span>
            <Info className="w-3 h-3 text-current shrink-0" />
          </button>
        </div>

        {/* Dynamic Zone Explanation Dropdown */}
        {showZoneExplanation && (
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-[11px] font-sans text-slate-650 leading-relaxed my-3.5 animate-fadeIn">
            <p className="font-semibold text-slate-805 flex items-center gap-1.5 mb-1 text-[10.5px]">
              <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              Sua sensação física nesta zona:
            </p>
            {getZoneExplanation(workout.targetZone)}
          </div>
        )}

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
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans leading-none">ESFORÇO (PSE)</span>
              <span className="text-xs font-heading font-black text-slate-850 mt-1 uppercase tracking-wide">
                {workout.completed && workout.actualRpe ? (
                  <>
                    <span className="text-slate-400 line-through text-[10px] mr-1">RPE{workout.rpe}</span>
                    <span className="text-emerald-600">{getSimpleEffortText(workout.actualRpe)}</span>
                  </>
                ) : (
                  `${getSimpleEffortText(workout.rpe || 5)} (Nota ${workout.rpe || 5}/10)`
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Real Performance Metrics if completed */}
        {workout.completed && (
          workout.actualHr || 
          workout.actualPower || 
          workout.actualDistance !== undefined || 
          workout.actualAvgSpeed !== undefined || 
          workout.actualElevation !== undefined || 
          workout.actualCalories !== undefined ||
          workout.actualStravaLink
        ) && (
          <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-3.5 mb-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Métricas de Realização (GPS / Strava)</span>
              <button 
                type="button"
                onClick={() => {
                  setActualDuration(workout.actualDuration || workout.duration);
                  setActualRpe(workout.actualRpe || workout.rpe || 5);
                  setActualHr(workout.actualHr ? String(workout.actualHr) : "");
                  setActualPower(workout.actualPower ? String(workout.actualPower) : "");
                  setActualAvgSpeed(workout.actualAvgSpeed ? String(workout.actualAvgSpeed) : "");
                  setActualDistance(workout.actualDistance ? String(workout.actualDistance) : "");
                  setActualElevation(workout.actualElevation ? String(workout.actualElevation) : "");
                  setActualCalories(workout.actualCalories ? String(workout.actualCalories) : "");
                  setActualStravaLink(workout.actualStravaLink || "");
                  setAthleteNotes(workout.athleteNotes || "");
                  setIsCompleting(true);
                }}
                className="text-[10px] text-sky-650 hover:text-sky-700 font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                title="Editar métricas do Strava / Pedal"
              >
                <Edit2 className="w-3 h-3" />
                <span>Editar</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs font-sans">
              {workout.actualDistance !== undefined && workout.actualDistance !== null && workout.actualDistance !== 0 && (
                <div className="flex items-center gap-2">
                  <div className="bg-slate-100 p-1.5 rounded-lg text-slate-500">
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-medium block leading-none uppercase">Distância</span>
                    <span className="font-mono font-bold text-slate-805">{workout.actualDistance} km</span>
                  </div>
                </div>
              )}
              {workout.actualAvgSpeed !== undefined && workout.actualAvgSpeed !== null && workout.actualAvgSpeed !== 0 && (
                <div className="flex items-center gap-2">
                  <div className="bg-slate-100 p-1.5 rounded-lg text-slate-500">
                    <Bike className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-medium block leading-none uppercase">Vel. Média</span>
                    <span className="font-mono font-bold text-slate-805">{workout.actualAvgSpeed} km/h</span>
                  </div>
                </div>
              )}
              {workout.actualElevation !== undefined && workout.actualElevation !== null && workout.actualElevation !== 0 && (
                <div className="flex items-center gap-2">
                  <div className="bg-slate-100 p-1.5 rounded-lg text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-medium block leading-none uppercase">Evolução Altif.</span>
                    <span className="font-mono font-bold text-slate-805">{workout.actualElevation} m</span>
                  </div>
                </div>
              )}
              {workout.actualCalories !== undefined && workout.actualCalories !== null && workout.actualCalories !== 0 && (
                <div className="flex items-center gap-2">
                  <div className="bg-slate-100 p-1.5 rounded-lg text-rose-500/80">
                    <Flame className="w-3.5 h-3.5 fill-rose-500/10" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-medium block leading-none uppercase">Energia</span>
                    <span className="font-mono font-bold text-slate-805">{workout.actualCalories} kcal</span>
                  </div>
                </div>
              )}
              {workout.actualHr && (
                <div className="flex items-center gap-2">
                  <div className="bg-slate-100 p-1.5 rounded-lg text-rose-500">
                    <Heart className="w-3.5 h-3.5 fill-rose-500/10" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-medium block leading-none uppercase">Frequência Card.</span>
                    <span className="font-mono font-bold text-slate-850">{workout.actualHr} bpm</span>
                  </div>
                </div>
              )}
              {workout.actualPower && (
                <div className="flex items-center gap-2">
                  <div className="bg-slate-100 p-1.5 rounded-lg text-amber-500">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-medium block leading-none uppercase">Potência Média</span>
                    <span className="font-mono font-bold text-slate-850">{workout.actualPower} W</span>
                  </div>
                </div>
              )}
            </div>

            {workout.actualStravaLink && (
              <a 
                href={workout.actualStravaLink.startsWith("http") ? workout.actualStravaLink : `https://${workout.actualStravaLink}`}
                target="_blank"
                referrerPolicy="no-referrer"
                rel="noopener noreferrer"
                className="mt-2 text-[10px] py-1.5 px-3 bg-[#FC6100]/10 hover:bg-[#FC6100]/15 text-[#FC6100] font-heading font-extrabold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all w-full border border-[#FC6100]/15 text-center cursor-pointer hover:shadow-3xs focus:outline-hidden"
              >
                <img 
                  src="https://cdn-icons-png.flaticon.com/512/5968/5968817.png" 
                  alt="Strava" 
                  className="w-3.5 h-3.5 object-contain"
                  referrerPolicy="no-referrer"
                />
                <span>Ver Atividade no Strava</span>
                <ExternalLink className="w-3 h-3 text-[#FC6100]" />
              </a>
            )}
          </div>
        )}

        {/* Goal */}
        <div id="workout-goal-section" className="mb-4">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest font-heading">Foco do Treino</span>
          </div>
          <p className="text-xs font-sans text-slate-655 leading-relaxed font-normal">{displayGoal}</p>
        </div>

        {/* Structure */}
        <div id="workout-structure-section" className="mb-5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
            <Bike className="w-3.5 h-3.5" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest font-heading">Estrutura de Ritmo</span>
          </div>
          <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 shadow-2xs">
            <p className="text-xs font-mono text-slate-700 leading-relaxed break-words font-medium">{displayStructure}</p>
          </div>
        </div>

        {/* Dica do Treino */}
        {displayTip && (
          <div id="workout-tip-bubble" className="mt-4 mb-5 p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100/60 flex items-start gap-2.5">
            <MessageSquareCode className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] font-sans font-medium text-slate-650 leading-relaxed italic">{displayTip}</p>
          </div>
        )}

        {/* Smart Hydration Suggestion Component */}
        <div id={`hydration-advice-wrapper-${workout.day}`} className="mb-5">
          <SmartHydrationTip workout={workout} />
        </div>

        {/* Saúde em Primeiro Lugar Banner */}
        <div id={`health-safety-wrapper-${workout.day}`} className="mb-5 p-3.5 rounded-2xl bg-rose-500/[0.03] border border-rose-500/10 flex items-start gap-3 shadow-2xs">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500/10 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-[8.5px] font-extrabold text-rose-500 uppercase tracking-widest font-heading block">Saúde em Primeiro Lugar</span>
            <p className="text-[10.5px] font-sans text-slate-600 leading-normal font-medium">
              Lembre-se sempre: <span className="text-rose-600 font-extrabold">a sua saúde é o mais importante!</span> Caso sinta dores fora do comum, tonturas ou cansaço excessivo, interrompa o esforço imediatamente para se preservar.
            </p>
          </div>
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
        {!isRestDay(workout) ? (
          isPastAndUncompleted ? (
            <div className="flex-1 bg-slate-100/70 border border-slate-200 rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 text-slate-450 font-heading font-extrabold text-[10px] uppercase tracking-wider select-none text-center" title="Treino expirado de dia anterior">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Sem conclusão (Prazo expirado)</span>
            </div>
          ) : (
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
                  <span>Concluído</span>
                </>
              ) : (
                <>
                  <Circle className="w-3.5 h-3.5" />
                  <span>Concluir</span>
                </>
              )}
            </button>
          )
        ) : (
          <div className="flex-1 bg-amber-50/50 border border-amber-100 rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 text-amber-700 font-heading font-extrabold text-[10px] uppercase tracking-wider">
            <Smile className="w-4 h-4 text-amber-500 fill-amber-500/10 shrink-0" />
            <span>Dia de Folga</span>
          </div>
        )}

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
              setActualAvgSpeed(workout.actualAvgSpeed ? String(workout.actualAvgSpeed) : "");
              setActualDistance(workout.actualDistance ? String(workout.actualDistance) : "");
              setActualElevation(workout.actualElevation ? String(workout.actualElevation) : "");
              setActualCalories(workout.actualCalories ? String(workout.actualCalories) : "");
              setActualStravaLink(workout.actualStravaLink || "");
              setAthleteNotes(workout.athleteNotes || "");
              setIsCompleting(true);
            } else {
              if (isPastAndUncompleted) return;
              setIsEditing(true);
            }
          }}
          disabled={isPastAndUncompleted}
          className={`p-2.5 border rounded-xl transition-colors flex items-center justify-center active:scale-95 ${
            isPastAndUncompleted
              ? "bg-slate-50 text-slate-350 border-slate-150 cursor-not-allowed opacity-40"
              : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 cursor-pointer"
          }`}
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
