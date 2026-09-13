import React, { useMemo } from "react";
import { motion } from "motion/react";
import { UserProfile, TrainingPlan, Workout, isRestDay, WorkoutCompletionLog } from "../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { 
  Trophy, 
  Flame, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Activity, 
  Award, 
  Zap, 
  Star, 
  Crown, 
  Calendar,
  Lock,
  Heart,
  Bike,
  FileText,
  AlertCircle,
  BarChart3,
  Sparkles
} from "lucide-react";
import { calculateWorkoutCalories } from "./WeeklyCalorieChart";

export interface AchievementsDashboardProps {
  profile: UserProfile;
  plan: TrainingPlan | null;
  workoutLogs?: WorkoutCompletionLog[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  category: "volume" | "intensity" | "consistency" | "profile";
  icon: React.ReactNode;
}

function AchievementsDashboardInner({ profile, plan, workoutLogs = [] }: AchievementsDashboardProps) {
  
  // 1. Gather all plan history from localStorage & current state
  const historyList = useMemo<TrainingPlan[]>(() => {
    const savedStr = localStorage.getItem("athlete_plan_history");
    let list: TrainingPlan[] = [];
    if (savedStr) {
      try {
        list = JSON.parse(savedStr);
      } catch (e) {
        console.error("Error reading athlete_plan_history", e);
      }
    }
    // Include current plan if it's not already in the history list (check weekNumber)
    if (plan && !list.some(p => p.weekNumber === plan.weekNumber)) {
      return [...list, plan];
    }
    // If current plan is in the list, use the latest updated version
    if (plan) {
      return list.map(item => item.weekNumber === plan.weekNumber ? plan : item);
    }
    return list;
  }, [plan]);

  // 2. Extract all workouts that were completed
  const allCompletedWorkouts = useMemo<({ workout: Workout; weekNumber: number })[]>(() => {
    const list: ({ workout: Workout; weekNumber: number })[] = [];
    historyList.forEach(p => {
      const weekNum = p.weekNumber || 1;
      if (p.workouts) {
        p.workouts.forEach(w => {
          if (w.completed || w.completionStatus === "sim" || w.completionStatus === "parcialmente") {
            list.push({ workout: w, weekNumber: weekNum });
          }
        });
      }
    });
    return list;
  }, [historyList]);

  // 3. Consolidated Completed Count (combining plan workouts & discrete workoutLogs)
  const totalCompletedCount = useMemo(() => {
    // If we have discrete workoutLogs, count those completed 'sim' or 'parcialmente'
    if (workoutLogs && workoutLogs.length > 0) {
      const validLogs = workoutLogs.filter(l => l.completed !== "nao");
      return Math.max(validLogs.length, allCompletedWorkouts.length);
    }
    return allCompletedWorkouts.length;
  }, [workoutLogs, allCompletedWorkouts]);

  // Detailed breakdown: Sim, Parcialmente, Não
  const completionBreakdown = useMemo(() => {
    let sim = 0;
    let parcialmente = 0;
    let nao = 0;

    if (workoutLogs && workoutLogs.length > 0) {
      workoutLogs.forEach(l => {
        if (l.completed === "sim") sim++;
        else if (l.completed === "parcialmente") parcialmente++;
        else if (l.completed === "nao") nao++;
      });
    } else {
      allCompletedWorkouts.forEach(item => {
        if (item.workout.completionStatus === "parcialmente") parcialmente++;
        else if (item.workout.completionStatus === "nao") nao++;
        else sim++;
      });
    }

    return { sim, parcialmente, nao };
  }, [workoutLogs, allCompletedWorkouts]);

  // 4. Weekly Completion Percentage (% de conclusão da semana atual)
  const weeklyCompletionStats = useMemo(() => {
    if (!plan || !plan.workouts) {
      return { totalScheduled: 0, completedCount: 0, percentage: 0 };
    }
    const scheduled = plan.workouts.filter(w => !isRestDay(w));
    const completed = scheduled.filter(w => w.completed || w.completionStatus === "sim" || w.completionStatus === "parcialmente");
    const percentage = scheduled.length > 0 ? Math.round((completed.length / scheduled.length) * 100) : 0;
    return {
      totalScheduled: scheduled.length,
      completedCount: completed.length,
      percentage
    };
  }, [plan]);

  // 5. Total Distance (Distância Total acumulada em km - apenas dados reais informados)
  const totalDistanceKm = useMemo(() => {
    let sum = 0;
    const seenWorkouts = new Set<string>();

    // Sum from workoutLogs first
    if (workoutLogs && workoutLogs.length > 0) {
      workoutLogs.forEach(l => {
        if (l.actualDistanceKm && l.actualDistanceKm > 0 && l.completed !== "nao") {
          sum += l.actualDistanceKm;
          seenWorkouts.add(`${l.weekNumber}-${l.workoutIndex}`);
        }
      });
    }

    // Then add any workout from history that wasn't already in workoutLogs
    historyList.forEach(p => {
      const weekNum = p.weekNumber || 1;
      if (p.workouts) {
        p.workouts.forEach((w, idx) => {
          const key = `${weekNum}-${idx}`;
          if (!seenWorkouts.has(key) && (w.completed || w.completionStatus === "sim" || w.completionStatus === "parcialmente")) {
            if (w.actualDistance && w.actualDistance > 0) {
              sum += w.actualDistance;
            }
          }
        });
      }
    });

    return sum;
  }, [workoutLogs, historyList]);

  // 6. Total Training Duration (Tempo Total Treinado em minutos e horas)
  const totalDurationMinutes = useMemo(() => {
    let sum = 0;
    const seenWorkouts = new Set<string>();

    if (workoutLogs && workoutLogs.length > 0) {
      workoutLogs.forEach(l => {
        if (l.actualDurationMin && l.actualDurationMin > 0 && l.completed !== "nao") {
          sum += l.actualDurationMin;
          seenWorkouts.add(`${l.weekNumber}-${l.workoutIndex}`);
        }
      });
    }

    historyList.forEach(p => {
      const weekNum = p.weekNumber || 1;
      if (p.workouts) {
        p.workouts.forEach((w, idx) => {
          const key = `${weekNum}-${idx}`;
          if (!seenWorkouts.has(key) && (w.completed || w.completionStatus === "sim" || w.completionStatus === "parcialmente")) {
            const dur = w.actualDuration || w.duration || 0;
            sum += dur;
          }
        });
      }
    });

    return sum;
  }, [workoutLogs, historyList]);

  const formattedTotalDuration = useMemo(() => {
    const hours = Math.floor(totalDurationMinutes / 60);
    const mins = totalDurationMinutes % 60;
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim();
  }, [totalDurationMinutes]);

  // 7. Consistency Metric (% de aderência geral dos treinos programados)
  const consistencyStats = useMemo(() => {
    let totalScheduled = 0;
    let totalCompleted = 0;

    historyList.forEach(p => {
      if (p.workouts) {
        p.workouts.forEach(w => {
          if (!isRestDay(w)) {
            totalScheduled += 1;
            if (w.completed || w.completionStatus === "sim" || w.completionStatus === "parcialmente") {
              totalCompleted += 1;
            }
          }
        });
      }
    });

    const percentage = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : (totalCompletedCount > 0 ? 100 : 0);
    
    let label = "Em Construção";
    let colorClass = "text-amber-600 bg-amber-50 border-amber-200";
    if (percentage >= 80) {
      label = "Alta Consistência";
      colorClass = "text-emerald-700 bg-emerald-50 border-emerald-200";
    } else if (percentage >= 50) {
      label = "Boa Consistência";
      colorClass = "text-sky-700 bg-sky-50 border-sky-200";
    }

    return {
      percentage,
      totalScheduled,
      totalCompleted,
      label,
      colorClass
    };
  }, [historyList, totalCompletedCount]);

  // 8. Week-by-Week Evolution Trend (Evolução das últimas semanas)
  const weeklyEvolutionData = useMemo(() => {
    const weeksMap: Record<number, { 
      week: string; 
      weekNumber: number;
      plannedMinutes: number; 
      completedMinutes: number; 
      plannedCount: number;
      completedCount: number;
      totalDistanceKm: number;
      completionRate: number;
    }> = {};
    
    historyList.forEach(p => {
      const weekNum = p.weekNumber || 1;
      if (!weeksMap[weekNum]) {
        weeksMap[weekNum] = {
          week: `Semana ${weekNum}`,
          weekNumber: weekNum,
          plannedMinutes: 0,
          completedMinutes: 0,
          plannedCount: 0,
          completedCount: 0,
          totalDistanceKm: 0,
          completionRate: 0
        };
      }

      if (p.workouts) {
        p.workouts.forEach(w => {
          if (!isRestDay(w)) {
            weeksMap[weekNum].plannedCount += 1;
            weeksMap[weekNum].plannedMinutes += (w.duration || 60);
          }

          if (w.completed || w.completionStatus === "sim" || w.completionStatus === "parcialmente") {
            weeksMap[weekNum].completedCount += 1;
            weeksMap[weekNum].completedMinutes += (w.actualDuration || w.duration || 60);
            if (w.actualDistance) {
              weeksMap[weekNum].totalDistanceKm += w.actualDistance;
            }
          }
        });
      }
    });

    // Also factor in workoutLogs for distance if present
    if (workoutLogs && workoutLogs.length > 0) {
      workoutLogs.forEach(l => {
        const weekNum = l.weekNumber || 1;
        if (weeksMap[weekNum] && l.actualDistanceKm && l.actualDistanceKm > 0) {
          // If distance wasn't already summed from workout, ensure it's recorded
          if (weeksMap[weekNum].totalDistanceKm === 0) {
            weeksMap[weekNum].totalDistanceKm += l.actualDistanceKm;
          }
        }
      });
    }

    // Calculate rates
    Object.values(weeksMap).forEach(w => {
      w.completionRate = w.plannedCount > 0 ? Math.round((w.completedCount / w.plannedCount) * 100) : 0;
    });

    return Object.values(weeksMap).sort((a, b) => a.weekNumber - b.weekNumber);
  }, [historyList, workoutLogs]);

  // 9. Detailed Workout Logs Feed (Histórico com respostas às 5 perguntas)
  const consolidatedHistoryFeed = useMemo(() => {
    // Build combined list of logs from workoutLogs and completed workouts
    const items: Array<{
      id: string;
      day: string;
      type: string;
      weekNumber: number;
      completedStatus: "sim" | "parcialmente" | "nao";
      difficulty: "facil" | "adequada" | "dificil" | "muito_dificil";
      distanceKm?: number;
      durationMin: number;
      notes?: string;
      targetDuration: number;
      targetZone?: string;
      completedDate?: string;
      aiFeedback?: string;
    }> = [];

    // Prioritize discrete workoutLogs
    const seenWorkoutKeys = new Set<string>();

    if (workoutLogs && workoutLogs.length > 0) {
      workoutLogs.forEach(log => {
        seenWorkoutKeys.add(`${log.weekNumber}-${log.workoutIndex}`);
        items.push({
          id: log.id,
          day: log.workoutDay || "Treino",
          type: log.workoutType || "Ciclismo",
          weekNumber: log.weekNumber || 1,
          completedStatus: log.completed,
          difficulty: log.difficulty,
          distanceKm: log.actualDistanceKm,
          durationMin: log.actualDurationMin,
          notes: log.notes,
          targetDuration: log.targetDurationMin,
          targetZone: log.targetZone,
          completedDate: log.completedAt ? log.completedAt.slice(0, 10) : undefined
        });
      });
    }

    // Also include any completed workouts from history not yet in workoutLogs
    historyList.forEach(p => {
      const weekNum = p.weekNumber || 1;
      if (p.workouts) {
        p.workouts.forEach((w, idx) => {
          const key = `${weekNum}-${idx}`;
          if (!seenWorkoutKeys.has(key) && (w.completed || w.completionStatus)) {
            items.push({
              id: `wk-${weekNum}-${idx}`,
              day: w.day || "Treino",
              type: w.type || "Pedal",
              weekNumber: weekNum,
              completedStatus: w.completionStatus || (w.completed ? "sim" : "nao"),
              difficulty: w.difficulty || "adequada",
              distanceKm: w.actualDistance,
              durationMin: w.actualDuration || w.duration || 60,
              notes: w.athleteNotes,
              targetDuration: w.duration || 60,
              targetZone: w.targetZone,
              completedDate: w.completedDate,
              aiFeedback: w.aiFeedback
            });
          }
        });
      }
    });

    // Reverse to show most recent first
    return items.reverse();
  }, [workoutLogs, historyList]);

  // 10. Intensity & Zones Breakdown
  const zoneDistributionData = useMemo(() => {
    const counts: Record<string, number> = {
      "Z1 (Recupe)": 0,
      "Z2 (Endur)": 0,
      "Z3 (Tempo)": 0,
      "Z4 (Limiar)": 0,
      "Z5+ (VO2/Tiro)": 0
    };

    allCompletedWorkouts.forEach(item => {
      const zoneStr = (item.workout.targetZone || "").toUpperCase();
      if (zoneStr.includes("Z1")) counts["Z1 (Recupe)"] += 1;
      else if (zoneStr.includes("Z2")) counts["Z2 (Endur)"] += 1;
      else if (zoneStr.includes("Z3")) counts["Z3 (Tempo)"] += 1;
      else if (zoneStr.includes("Z4")) counts["Z4 (Limiar)"] += 1;
      else if (zoneStr.includes("Z5") || zoneStr.includes("Z6") || zoneStr.includes("Z7") || zoneStr.includes("VO2")) {
        counts["Z5+ (VO2/Tiro)"] += 1;
      } else {
        const rpe = item.workout.actualRpe || item.workout.rpe || 5;
        if (rpe <= 2) counts["Z1 (Recupe)"] += 1;
        else if (rpe <= 4) counts["Z2 (Endur)"] += 1;
        else if (rpe <= 6) counts["Z3 (Tempo)"] += 1;
        else if (rpe <= 8) counts["Z4 (Limiar)"] += 1;
        else counts["Z5+ (VO2/Tiro)"] += 1;
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [allCompletedWorkouts]);

  const ZONE_COLORS = ["#10b981", "#14b8a6", "#f59e0b", "#ea580c", "#ef4444"];

  // 11. Achievements list
  const achievementsList = useMemo<Achievement[]>(() => {
    const hasAtLeastOne = totalCompletedCount >= 1;
    const hasConsistencyBadge = consistencyStats.percentage >= 75 && totalCompletedCount >= 3;
    const hasLongRide = consolidatedHistoryFeed.some(item => item.durationMin >= 90);
    const hasHighDistance = totalDistanceKm >= 100;
    const hasPerfectWeek = weeklyEvolutionData.some(w => w.plannedCount >= 3 && w.completionRate === 100);

    return [
      {
        id: "first_ride",
        title: "Primeiro Giro",
        description: "Completou e registrou seu primeiro treino oficial no Biker AI.",
        unlocked: hasAtLeastOne,
        category: "volume",
        icon: <Zap className="w-5 h-5 text-lime-500 fill-lime-500/10" />
      },
      {
        id: "consistency_badge",
        title: "Consistência de Aço",
        description: "Mantenha consistência superior a 75% com ao menos 3 treinos realizados.",
        unlocked: hasConsistencyBadge,
        category: "consistency",
        icon: <CheckCircle2 className="w-5 h-5 text-teal-500 fill-teal-500/10" />
      },
      {
        id: "century_km",
        title: "Centenário dos Pedais",
        description: "Supere a marca dos 100 km reais pedalados e registrados.",
        unlocked: hasHighDistance,
        category: "volume",
        icon: <Bike className="w-5 h-5 text-amber-500" />
      },
      {
        id: "brutal_endurance",
        title: "Resistência de Longa Duração",
        description: "Finalize uma sessão contínua com duração igual ou superior a 90 minutos.",
        unlocked: hasLongRide,
        category: "volume",
        icon: <Activity className="w-5 h-5 text-orange-500" />
      },
      {
        id: "perfect_week",
        title: "Semana Lendária (100%)",
        description: "Concluiu todos os treinos propostos na mesma semana de treinamento.",
        unlocked: hasPerfectWeek,
        category: "consistency",
        icon: <Award className="w-5 h-5 text-rose-500 fill-rose-500/10" />
      }
    ];
  }, [totalCompletedCount, consistencyStats, consolidatedHistoryFeed, totalDistanceKm, weeklyEvolutionData]);

  const unlockedCount = useMemo(() => achievementsList.filter(a => a.unlocked).length, [achievementsList]);

  // Helper labels
  const formatDifficultyBadge = (diff: string) => {
    switch (diff) {
      case "facil":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Fácil</span>;
      case "adequada":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">Adequada</span>;
      case "dificil":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Difícil</span>;
      case "muito_dificil":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Muito difícil</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">Adequada</span>;
    }
  };

  const formatCompletionBadge = (status: string) => {
    switch (status) {
      case "sim":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">Concluído (Sim)</span>;
      case "parcialmente":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">Parcial</span>;
      case "nao":
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">Não concluído</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">Concluído</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn" id="athlete-evolution-section">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 p-6 sm:p-7 rounded-3xl text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-bold font-mono">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Acompanhamento de Evolução</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-heading">
            Evolução do Atleta
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
            Acompanhe o volume real pedalado, percentual de conclusão dos treinos e consistência semana a semana. Dados utilizados pela IA para calibrar suas próximas planilhas.
          </p>
        </div>

        <div className="relative z-10 flex sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
          <div className="text-left sm:text-right font-mono">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Semana Atual</span>
            <span className="text-xl font-black text-lime-400">Semana {plan?.weekNumber || 1}</span>
          </div>
          <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${consistencyStats.colorClass}`}>
            {consistencyStats.label} ({consistencyStats.percentage}%)
          </span>
        </div>

        {/* Ambient Glow */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-lime-400/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      </div>

      {/* 1. Core KPIs Grid (Requested: Treinos concluídos, % semanal, Distância total, Tempo total, Consistência) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="evolution-kpi-cards">
        
        {/* KPI 1: Treinos Concluídos */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          id="kpi-treinos-concluidos"
          className="bg-white border border-slate-150 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-heading">Treinos Concluídos</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-slate-900">{totalCompletedCount}</div>
            <div className="text-[10px] text-slate-500 font-sans mt-0.5">
              {completionBreakdown.sim > 0 && <span>{completionBreakdown.sim} 100%</span>}
              {completionBreakdown.parcialmente > 0 && <span> • {completionBreakdown.parcialmente} parciais</span>}
              {totalCompletedCount === 0 && <span>Nenhum concluído ainda</span>}
            </div>
          </div>
          <div className="text-[9px] font-mono text-emerald-700 bg-emerald-50/70 px-2 py-0.5 rounded-md w-fit">
            Histórico ativo
          </div>
        </motion.div>

        {/* KPI 2: % Conclusão Semanal */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          id="kpi-conclusao-semanal"
          className="bg-white border border-slate-150 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-heading">Conclusão Semanal</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-slate-900">{weeklyCompletionStats.percentage}%</div>
            <div className="text-[10px] text-slate-500 font-sans mt-0.5">
              {weeklyCompletionStats.completedCount} de {weeklyCompletionStats.totalScheduled} treinos da semana
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-sky-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${weeklyCompletionStats.percentage}%` }}
            ></div>
          </div>
        </motion.div>

        {/* KPI 3: Distância Total */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          id="kpi-distancia-total"
          className="bg-white border border-slate-150 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-heading">Distância Total</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Bike className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-slate-900">
              {totalDistanceKm > 0 ? `${totalDistanceKm.toFixed(1)} km` : "0.0 km"}
            </div>
            <div className="text-[10px] text-slate-500 font-sans mt-0.5">
              Quilômetros reais realizados
            </div>
          </div>
          <div className="text-[9px] font-mono text-amber-700 bg-amber-50/70 px-2 py-0.5 rounded-md w-fit">
            Soma acumulada
          </div>
        </motion.div>

        {/* KPI 4: Tempo Total Treinado */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          id="kpi-tempo-total"
          className="bg-white border border-slate-150 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-heading">Tempo Treinado</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-slate-900">{formattedTotalDuration}</div>
            <div className="text-[10px] text-slate-500 font-sans mt-0.5">
              {totalDurationMinutes} min acumulados no selim
            </div>
          </div>
          <div className="text-[9px] font-mono text-indigo-700 bg-indigo-50/70 px-2 py-0.5 rounded-md w-fit">
            Tempo em atividade
          </div>
        </motion.div>

        {/* KPI 5: Consistência */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          id="kpi-consistencia"
          className="bg-white border border-slate-150 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-heading">Consistência</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-slate-900">{consistencyStats.percentage}%</div>
            <div className="text-[10px] text-slate-500 font-sans mt-0.5">
              Taxa de adesão ao plano
            </div>
          </div>
          <div className={`text-[9px] font-mono px-2 py-0.5 rounded-md w-fit border ${consistencyStats.colorClass}`}>
            {consistencyStats.label}
          </div>
        </motion.div>

      </div>

      {/* 2. Evolução das Últimas Semanas (Charts & Comparative Cards) */}
      <div className="space-y-4" id="evolucao-ultimas-semanas">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-150 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-heading font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-lime-600" />
              <span>Evolução das Últimas Semanas</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Comparativo semana a semana entre treinos planejados vs realizados, quilômetros e horas treinadas.
            </p>
          </div>
          <span className="bg-slate-100 text-slate-700 font-mono text-[10px] font-black px-2.5 py-1 rounded-xl w-fit">
            {weeklyEvolutionData.length} {weeklyEvolutionData.length === 1 ? "SEMANA REGISTRADA" : "SEMANAS REGISTRADAS"}
          </span>
        </div>

        {/* Chart + Summary Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Bar Chart: Planned vs Completed minutes */}
          <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 font-heading">
                Volume Semanal (Minutos de Treino)
              </span>
              <div className="flex items-center gap-3 text-[10px] font-sans">
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2.5 h-2.5 bg-slate-300 rounded-xs"></span> Planejado
                </span>
                <span className="flex items-center gap-1 text-lime-700 font-bold">
                  <span className="w-2.5 h-2.5 bg-lime-500 rounded-xs"></span> Realizado
                </span>
              </div>
            </div>

            <div className="w-full h-64">
              {weeklyEvolutionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyEvolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="week" stroke="#94a3b8" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} suffix=" min" />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-950 p-3 rounded-xl shadow-xl text-white font-sans text-xs space-y-1 border border-slate-800">
                              <p className="font-heading font-black text-lime-400 text-[11px] uppercase">{data.week}</p>
                              <p className="text-slate-300">Tempo Planejado: <strong className="font-mono text-white">{data.plannedMinutes} min</strong></p>
                              <p className="text-slate-300">Tempo Realizado: <strong className="font-mono text-lime-400">{data.completedMinutes} min</strong></p>
                              <p className="text-slate-300">Distância Real: <strong className="font-mono text-amber-300">{data.totalDistanceKm > 0 ? `${data.totalDistanceKm.toFixed(1)} km` : "N/A"}</strong></p>
                              <p className="text-[10px] pt-1 border-t border-slate-800 text-slate-400">
                                Treinos: {data.completedCount} de {data.plannedCount} ({data.completionRate}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="plannedMinutes" name="Planejado" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="completedMinutes" name="Realizado" fill="#84cc16" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-xs text-slate-400 gap-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <BarChart3 className="w-8 h-8 text-slate-300" />
                  <span>Conclua treinos para gerar o comparativo semanal.</span>
                </div>
              )}
            </div>
          </div>

          {/* Week cards summary list */}
          <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 font-heading mb-1">
                Resumo por Bloco Semanal
              </h4>
              <p className="text-[11px] text-slate-400 font-sans">
                Taxa de aderência e volume acumulado em cada semana do plano.
              </p>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-56 pr-1">
              {weeklyEvolutionData.map((w) => (
                <div key={w.week} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-heading font-black text-xs text-slate-850">{w.week}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${w.completionRate >= 80 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {w.completionRate}%
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {w.completedCount} de {w.plannedCount} treinos feitos
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <span className="font-black text-slate-800 block">
                      {Math.floor(w.completedMinutes / 60)}h {w.completedMinutes % 60}m
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {w.totalDistanceKm > 0 ? `${w.totalDistanceKm.toFixed(1)} km` : "km n/d"}
                    </span>
                  </div>
                </div>
              ))}
              {weeklyEvolutionData.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 font-sans">
                  Nenhuma semana registrada ainda.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 italic">
              A IA adapta o próximo macrociclo com base nestas estatísticas.
            </div>
          </div>

        </div>
      </div>

      {/* 3. Detailed Workout Completion History (Respostas às 5 perguntas do formulário) */}
      <div className="bg-white border border-slate-150 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4" id="historico-treinos-registrados">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-heading font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-lime-600" />
              <span>Histórico de Treinos Registrados</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Dados detalhados informados na conclusão de cada sessão (status, dificuldade sentida, distância, tempo e observações).
            </p>
          </div>
          <span className="bg-slate-900 text-lime-400 font-mono text-[10px] font-black px-2.5 py-1 rounded-xl w-fit">
            {consolidatedHistoryFeed.length} {consolidatedHistoryFeed.length === 1 ? "SESSÃO" : "SESSÕES"}
          </span>
        </div>

        {consolidatedHistoryFeed.length > 0 ? (
          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto pr-1">
            {consolidatedHistoryFeed.map((item, idx) => (
              <div 
                key={`${item.id}-${idx}`}
                className="py-4 first:pt-1 last:pb-1 space-y-2 hover:bg-slate-50/60 rounded-xl px-2 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-lime-50 rounded-xl text-lime-700 shrink-0 self-center">
                      <Bike className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-heading font-black text-xs text-slate-900">{item.type}</h4>
                        <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold">
                          Semana {item.weekNumber}
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-sans text-[9px] font-bold">
                          {item.day}
                        </span>
                        {item.completedDate && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.completedDate}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {formatCompletionBadge(item.completedStatus)}
                        {formatDifficultyBadge(item.difficulty)}
                      </div>
                    </div>
                  </div>

                  {/* Real Metrics pills */}
                  <div className="flex items-center gap-4 shrink-0 font-mono text-right justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-sans">Distância</span>
                      <strong className="text-xs text-slate-800">
                        {item.distanceKm !== undefined && item.distanceKm > 0 ? `${item.distanceKm} km` : "n/d"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-sans">Tempo Real</span>
                      <strong className="text-xs text-slate-800">{item.durationMin} min</strong>
                    </div>
                    {item.targetZone && (
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-sans">Zona Alvo</span>
                        <strong className="text-xs text-lime-700">{item.targetZone}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Athlete's Notes */}
                {item.notes && (
                  <div className="ml-10 text-xs text-slate-600 bg-slate-50 border border-slate-200/60 p-2.5 rounded-xl leading-relaxed italic flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0 not-italic" />
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase not-italic tracking-wider">
                        Observações do Atleta:
                      </span>
                      "{item.notes}"
                    </div>
                  </div>
                )}

                {/* AI Coach Feedback if available */}
                {item.aiFeedback && (
                  <div className="ml-10 text-xs text-sky-800 bg-sky-50 border border-sky-100 p-2.5 rounded-xl leading-relaxed">
                    <span className="text-[9px] font-heading font-black text-sky-900 block uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-sky-500" />
                      Feedback do Treinador AI:
                    </span>
                    <p className="whitespace-pre-wrap">{item.aiFeedback}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
            <Bike className="w-9 h-9 text-slate-300" />
            <p className="text-xs font-sans text-slate-600 font-bold">Nenhum treino concluído ainda.</p>
            <p className="text-[11px] font-sans text-slate-400 max-w-sm text-center">
              Acesse a aba <strong>"Planilha"</strong> e clique em <strong>"Concluir treino"</strong> para registrar suas sensações, distância e tempo!
            </p>
          </div>
        )}
      </div>

      {/* 4. Secondary: Zones Distribution & Achievements Gamification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Intensity Zones */}
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="space-y-0.5">
            <h4 className="font-heading font-black text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              <span>Distribuição de Esforço</span>
            </h4>
            <p className="text-[11px] text-slate-400 font-sans">
              Zonas fisiológicas estimuladas nos treinos concluídos.
            </p>
          </div>

          <div className="w-full h-40 flex items-center justify-center relative">
            {zoneDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={zoneDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {zoneDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ZONE_COLORS[index % ZONE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 border border-slate-800 text-white rounded-xl py-1.5 px-3 text-[11px] font-mono">
                            <strong>{payload[0].name}</strong>: {payload[0].value} treino(s)
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-[11px] text-slate-400 text-center px-4 py-8 bg-slate-50 rounded-2xl w-full h-full flex items-center justify-center border border-dashed border-slate-200">
                Complete treinos para mapear suas zonas.
              </div>
            )}
            
            {zoneDistributionData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                <span className="text-base font-mono font-black text-slate-800">{totalCompletedCount}</span>
                <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">Treinos</span>
              </div>
            )}
          </div>

          {zoneDistributionData.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-sans font-medium text-slate-500 pt-2 border-t border-slate-100">
              {zoneDistributionData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: ZONE_COLORS[idx % ZONE_COLORS.length] }}></span>
                  <span className="truncate">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Motivational Achievements */}
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="space-y-0.5">
              <h4 className="font-heading font-black text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Troféus & Medalhas de Consistência</span>
              </h4>
              <p className="text-[11px] text-slate-400 font-sans">
                Conquistas desbloqueadas à medida que você mantém o plano.
              </p>
            </div>
            <span className="bg-slate-100 text-slate-650 font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg">
              {unlockedCount} / {achievementsList.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievementsList.map((ach) => (
              <div
                key={ach.id}
                className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                  ach.unlocked 
                    ? "bg-slate-50/80 border-emerald-200 shadow-2xs" 
                    : "bg-slate-50/30 border-slate-200/50 text-slate-400 opacity-60"
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${ach.unlocked ? "bg-white shadow-xs" : "bg-slate-200/50"}`}>
                  {ach.unlocked ? ach.icon : <Lock className="w-4 h-4 text-slate-400" />}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-800 font-heading flex items-center gap-1.5">
                    <span>{ach.title}</span>
                    {ach.unlocked && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></span>}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    {ach.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

export const AchievementsDashboard = React.memo(AchievementsDashboardInner);
export default AchievementsDashboard;
