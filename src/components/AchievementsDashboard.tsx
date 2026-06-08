import React, { useMemo } from "react";
import { UserProfile, TrainingPlan, Workout } from "../types";
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
  Pie,
  Legend
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
  ChevronRight,
  Sparkles,
  Heart
} from "lucide-react";
import { calculateWorkoutCalories } from "./WeeklyCalorieChart";

interface AchievementsDashboardProps {
  profile: UserProfile;
  plan: TrainingPlan | null;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  category: "volume" | "intensity" | "consistency" | "profile";
  icon: React.ReactNode;
}

export default function AchievementsDashboard({ profile, plan }: AchievementsDashboardProps) {
  
  // 1. Gather all plan history from localStorage
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
    // Include current plan if it's not already in the history list (to avoid duplicates, check weekNumber)
    if (plan && !list.some(p => p.weekNumber === plan.weekNumber)) {
      return [...list, plan];
    }
    // If current plan is in the list, make sure we use the latest updated live version in state
    if (plan) {
      return list.map(item => item.weekNumber === plan.weekNumber ? plan : item);
    }
    return list;
  }, [plan]);

  // 2. Extract and compile all workouts that were marked completed
  const allCompletedWorkouts = useMemo<({ workout: Workout; weekNumber: number })[]>(() => {
    const list: ({ workout: Workout; weekNumber: number })[] = [];
    historyList.forEach(p => {
      const weekNum = p.weekNumber || 1;
      if (p.workouts) {
        p.workouts.forEach(w => {
          if (w.completed) {
            list.push({ workout: w, weekNumber: weekNum });
          }
        });
      }
    });
    return list;
  }, [historyList]);

  // 3. Compute Metrics
  const totalCompletedCount = allCompletedWorkouts.length;
  
  const totalDurationMinutes = useMemo(() => {
    return allCompletedWorkouts.reduce((sum, item) => sum + (item.workout.actualDuration || item.workout.duration), 0);
  }, [allCompletedWorkouts]);

  const totalDurationHoursStr = useMemo(() => {
    const hrs = totalDurationMinutes / 60;
    return hrs >= 10 ? hrs.toFixed(1) : hrs.toFixed(2);
  }, [totalDurationMinutes]);

  const totalCaloriesBurned = useMemo(() => {
    return allCompletedWorkouts.reduce((sum, item) => {
      const kcal = calculateWorkoutCalories(
        item.workout.actualDuration || item.workout.duration,
        item.workout.actualRpe || item.workout.rpe || 5,
        profile.hasPowerMeter,
        profile.ftp
      );
      return sum + kcal;
    }, 0);
  }, [allCompletedWorkouts, profile]);

  const maxRpeCompleted = useMemo(() => {
    if (allCompletedWorkouts.length === 0) return 0;
    return Math.max(...allCompletedWorkouts.map(item => item.workout.actualRpe || item.workout.rpe || 0));
  }, [allCompletedWorkouts]);

  // 4. Calculate Zones breakdown
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
        // Fallback by RPE
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

  // Pie chart colors
  const ZONE_COLORS = ["#10b981", "#14b8a6", "#f59e0b", "#ea580c", "#ef4444"];

  // 5. Volume evolution week-by-week (completed vs planned)
  const weeklyTrendData = useMemo(() => {
    const weeksMap: Record<number, { week: string; plannedMinutes: number; completedMinutes: number; count: number }> = {};
    
    // Process all historical structures
    historyList.forEach(p => {
      const weekNum = p.weekNumber || 1;
      if (!weeksMap[weekNum]) {
        weeksMap[weekNum] = {
          week: `Semana ${weekNum}`,
          plannedMinutes: 0,
          completedMinutes: 0,
          count: 0
        };
      }
      if (p.workouts) {
        p.workouts.forEach(w => {
          weeksMap[weekNum].plannedMinutes += w.duration;
          if (w.completed) {
            weeksMap[weekNum].completedMinutes += (w.actualDuration || w.duration);
            weeksMap[weekNum].count += 1;
          }
        });
      }
    });

    return Object.values(weeksMap).sort((a, b) => a.week.localeCompare(b.week));
  }, [historyList]);

  // 6. Define Achievements
  const achievementsList = useMemo<Achievement[]>(() => {
    // Check various unlock states
    const hasAtLeastOne = totalCompletedCount >= 1;
    const hasFiveCompleted = totalCompletedCount >= 5;
    
    // Check if high intensity completed (RPE >= 7)
    const hasHighIntensity = allCompletedWorkouts.some(item => (item.workout.actualRpe || item.workout.rpe || 0) >= 7);
    
    // Check if long endurance ride (duration >= 90 mins)
    const hasLongRide = allCompletedWorkouts.some(item => (item.workout.actualDuration || item.workout.duration) >= 90);
    
    // Check for "Perfect Week" (completed all workouts in a week, min 3 workouts schedule)
    let hasPerfectWeek = false;
    historyList.forEach(p => {
      const totalW = p.workouts ? p.workouts.length : 0;
      const completedW = p.workouts ? p.workouts.filter(w => w.completed).length : 0;
      if (totalW >= 3 && completedW === totalW) {
        hasPerfectWeek = true;
      }
    });

    // Consistency check: completed at least 3 workouts in a single week
    let hasConsistency = false;
    historyList.forEach(p => {
      const completedCount = p.workouts ? p.workouts.filter(w => w.completed).length : 0;
      if (completedCount >= 3) {
        hasConsistency = true;
      }
    });

    // Check for distinct zones completed (at least 3 target zones)
    const distinctZones = new Set<string>();
    allCompletedWorkouts.forEach(item => {
      const zonePart = (item.workout.targetZone || "").toUpperCase().slice(0, 2);
      if (zonePart) distinctZones.add(zonePart);
    });
    const hasZoneExplorer = distinctZones.size >= 3;

    // Check general profile-based achievements
    const hasFtpFilled = !!(profile.hasPowerMeter && profile.ftp && profile.ftp > 0);
    const hasHighWeek = (plan?.weekNumber || 1) >= 2;
    const hasBurnedKCalValue = totalCaloriesBurned >= 1000;

    return [
      {
        id: "first_ride",
        title: "Primeiro Giro",
        description: "Marque seu primeiro treino completado na planilha.",
        unlocked: hasAtLeastOne,
        category: "volume",
        icon: <Zap className="w-5 h-5 text-lime-500 fill-lime-500/10" />
      },
      {
        id: "consistency_badge",
        title: "Consistência é Rei",
        description: "Complete pelo menos 3 treinos de bicicleta em uma única semana.",
        unlocked: hasConsistency,
        category: "consistency",
        icon: <CheckCircle2 className="w-5 h-5 text-teal-500 fill-teal-500/10" />
      },
      {
        id: "mountain_king",
        title: "Rei da Montanha",
        description: "Siga o plano e complete um treino intervalado forte ou máximo (Esforço >= 7).",
        unlocked: hasHighIntensity,
        category: "intensity",
        icon: <Crown className="w-5 h-5 text-amber-500 fill-amber-500/10" />
      },
      {
        id: "brutal_endurance",
        title: "Resistência de Aço",
        description: "Complete um treino longo e contínuo com duração de 90 minutos ou mais.",
        unlocked: hasLongRide,
        category: "volume",
        icon: <Activity className="w-5 h-5 text-orange-500" />
      },
      {
        id: "perfect_week",
        title: "Semana Lendária",
        description: "Esforce-se e complete 100% dos treinos propostos na mesma semana.",
        unlocked: hasPerfectWeek,
        category: "consistency",
        icon: <Award className="w-5 h-5 text-rose-500 fill-rose-500/10" />
      },
      {
        id: "zone_master",
        title: "Explorador de Zonas",
        description: "Treine em 3 ou mais zonas fisiológicas para adaptações musculares completas.",
        unlocked: hasZoneExplorer,
        category: "intensity",
        icon: <Star className="w-5 h-5 text-purple-500 fill-purple-500/10" />
      },
      {
        id: "watts_power",
        title: "Foco nos Watts",
        description: "Configure seus dados de potência real (FTP) no cadastro do seu perfil.",
        unlocked: hasFtpFilled,
        category: "profile",
        icon: <Flame className="w-5 h-5 text-sky-500 fill-sky-500/10" />
      },
      {
        id: "evolution_weekly",
        title: "Ciclista em Evolução",
        description: "Evolua sua planilha semanal pelo menos uma vez junto ao Treinador AI.",
        unlocked: hasHighWeek,
        category: "profile",
        icon: <TrendingUp className="w-5 h-5 text-indigo-500" />
      },
      {
        id: "kcal_burning_1000",
        title: "Usina de Watts",
        description: "Queime mais de 1.000 kcal estimadas acumulando giradas completadas.",
        unlocked: hasBurnedKCalValue,
        category: "volume",
        icon: <Heart className="w-5 h-5 text-pink-500 fill-pink-500/10" />
      }
    ];
  }, [totalCompletedCount, allCompletedWorkouts, historyList, profile, totalCaloriesBurned, plan?.weekNumber]);

  const unlockedCount = useMemo(() => {
    return achievementsList.filter(a => a.unlocked).length;
  }, [achievementsList]);

  const progressPercentage = useMemo(() => {
    if (achievementsList.length === 0) return 0;
    return Math.round((unlockedCount / achievementsList.length) * 100);
  }, [unlockedCount, achievementsList]);

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* 1. Quick Stats Header Panels (Grid representation of complete metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div id="stat-completed-total" className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center gap-4 hover:shadow-sm transition-shadow">
          <div className="p-3 bg-lime-50 rounded-2xl text-lime-650 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Treinos Feitos</span>
            <span className="text-xl sm:text-2xl font-mono font-black text-slate-800">{totalCompletedCount}</span>
            <span className="text-[10px] text-slate-400 block font-sans">sabor de evolução</span>
          </div>
        </div>

        <div id="stat-total-hours" className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center gap-4 hover:shadow-sm transition-shadow">
          <div className="p-3 bg-sky-50 rounded-2xl text-sky-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tempo sobre a Bike</span>
            <span className="text-xl sm:text-2xl font-mono font-black text-slate-800">{totalDurationHoursStr}h</span>
            <span className="text-[10px] text-slate-400 block font-sans">acumulado de fôlego</span>
          </div>
        </div>

        <div id="stat-total-calories" className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center gap-4 hover:shadow-sm transition-shadow">
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Energia Queimada</span>
            <span className="text-xl sm:text-2xl font-mono font-black text-slate-800">{totalCaloriesBurned.toLocaleString()} kcal</span>
            <span className="text-[10px] text-slate-400 block font-sans">estimativa fisiológica</span>
          </div>
        </div>

        <div id="stat-achievements-unlocked" className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center gap-4 hover:shadow-sm transition-shadow">
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 shrink-0">
            <Trophy className="w-6 h-6 fill-amber-500/10" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Conquistas</span>
            <span className="text-xl sm:text-2xl font-mono font-black text-slate-800">{unlockedCount} / {achievementsList.length}</span>
            <span className="text-[10px] text-slate-400 block font-sans">{progressPercentage}% desbloqueado</span>
          </div>
        </div>

      </div>

      {/* 2. Evolution Charts / Progress Visualizers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Trend (Bar & line representing minutes planned vs loaded) */}
        <div id="trend-metric-card" className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs lg:col-span-2 space-y-4">
          <div className="space-y-1">
            <h3 className="font-heading font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-lime-650" />
              <span>Consistência de Carga Semana a Semana</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Comparação acumulativa de minutos planejados pelo Treinador AI contra minutos efetivamente pedalados por semana.
            </p>
          </div>

          <div className="w-full h-60" id="weekly-completion-trend-chart">
            {weeklyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={weeklyTrendData} 
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="week" stroke="#94a3b8" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} suffix=" min" />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-950 p-3 rounded-xl shadow-xl text-white font-sans text-xs space-y-1 border border-slate-800">
                            <p className="font-heading font-black text-lime-400 text-[10px] uppercase">{payload[0].payload.week}</p>
                            <p className="text-slate-300">Tempo Planejado: <strong className="font-mono text-white">{payload[0].value} min</strong></p>
                            <p className="text-slate-300">Pedal Concluído: <strong className="font-mono text-lime-400">{payload[1].value} min</strong></p>
                            <p className="text-[10px] pt-1 border-t border-slate-850 text-slate-450 italic">Frequência: {payload[0].payload.count} treinos feitos</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="plannedMinutes" name="Planejado" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="completedMinutes" name="Pedal Realizado" fill="#84cc16" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-xs text-slate-400 gap-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <TrendingUp className="w-8 h-8 text-slate-300" />
                <span>Nenhum dado cumulativo registrado. Complete treinos para iniciar o gráfico de evolução!</span>
              </div>
            )}
          </div>
        </div>

        {/* Zones Distribution Breakdown (Pie Chart) */}
        <div id="zones-distribution-card" className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="font-heading font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              <span>Zonas de Intensidade</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Variabilidade do esforço estimulando fôlego, queima celular e força.
            </p>
          </div>

          <div className="w-full h-44 flex items-center justify-center relative" id="intensity-pie-chart">
            {zoneDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={zoneDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
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
                          <div className="bg-slate-900 border border-slate-850 text-white rounded-xl py-1.5 px-3 text-[11px] font-mono shadow-md">
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
              <div className="text-xs text-slate-400 italic text-center text-balance px-4 py-8 bg-slate-50/50 rounded-2xl w-full h-full flex items-center justify-center border border-dashed border-slate-200">
                Gire e marque treinos concluídos para entender sua intensidade.
              </div>
            )}
            
            {zoneDistributionData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                <span className="text-lg font-mono font-black text-slate-800">{totalCompletedCount}</span>
                <span className="text-[9px] text-slate-450 uppercase font-sans font-bold tracking-wider leading-none">Pedais</span>
              </div>
            )}
          </div>

          {/* Color-coded Legend */}
          {zoneDistributionData.length > 0 && (
            <div className="grid grid-cols-2 gap-2 text-[10px] font-sans font-medium text-slate-500 pt-2 border-t border-slate-50">
              {zoneDistributionData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: ZONE_COLORS[idx % ZONE_COLORS.length] }}></span>
                  <span className="truncate">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 3. Grid of Achievements - Gamified badges with unlock systems */}
      <div id="achievements-card-system" className="space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-150 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-heading font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500 fill-amber-500/10" />
              <span>Troféus & Medalhas da Jornada</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Pilhas de treinos e consistência desbloqueiam bônus de motivação. Desafie-se!
            </p>
          </div>
          <span className="bg-slate-100/80 border border-slate-200/50 text-slate-650 font-mono text-[10px] font-extrabold px-2.5 py-1 rounded-xl">
            {unlockedCount} / {achievementsList.length} ATIVOS
          </span>
        </div>

        {/* Visual progress bar across achievements */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 font-sans px-1">
            <span>Progressão Geral do Ciclista</span>
            <span className="text-lime-650 font-mono">{progressPercentage}%</span>
          </div>
          <div className="bg-slate-100 h-2.5 w-full rounded-full overflow-hidden border border-slate-200/20 shadow-inner">
            <div 
              className="bg-gradient-to-r from-lime-500 to-emerald-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {achievementsList.map((ach) => (
            <div 
              key={ach.id} 
              id={`achievement-${ach.id}`}
              className={`rounded-2xl p-4 border transition-all duration-300 relative overflow-hidden flex items-start gap-4 ${
                ach.unlocked 
                  ? "bg-gradient-to-br from-white to-slate-50/50 border-emerald-100 hover:border-emerald-200 shadow-xs hover:shadow-sm" 
                  : "bg-slate-100/50 text-slate-400/80 border-slate-200/60 shadow-inner"
              }`}
            >
              
              {/* Highlight corner glow for unlocked achievement */}
              {ach.unlocked && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-lime-400/5 rounded-full blur-xl -mr-4 -mt-4"></div>
              )}

              {/* Icon badge container */}
              <div className={`p-3 rounded-2xl shrink-0 transition-transform duration-300 ${
                ach.unlocked 
                  ? "bg-white border border-slate-100 shadow-2xs group-hover:scale-105" 
                  : "bg-slate-200/40 border border-slate-200 text-slate-400"
              }`}>
                {ach.unlocked ? (
                  ach.icon
                ) : (
                  <Lock className="w-5 h-5 text-slate-400" />
                )}
              </div>

              {/* Texts */}
              <div className="space-y-1 my-0.5">
                <span className="font-heading font-black text-xs block leading-tight flex items-center gap-1.5">
                  <span className={ach.unlocked ? "text-slate-800" : "text-slate-500 font-medium font-sans"}>{ach.title}</span>
                  {ach.unlocked && (
                    <span className="flex w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                  )}
                </span>
                <p className="text-[10px] text-slate-450 leading-relaxed font-sans font-medium">
                  {ach.description}
                </p>
                {ach.unlocked && (
                  <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100/50 rounded-md font-mono font-bold px-1.5 py-0.5 mt-1.5 inline-block uppercase tracking-wider">
                    Conquistado
                  </span>
                )}
              </div>

            </div>
          ))}
        </div>

      </div>

      {/* 4. Complete workout ledger (Treinos Feitos com status e detalhes) */}
      <div id="workout-historical-ledger" className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-heading font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-lime-650 animate-pulse" />
              <span>Histórico de Treinos Completados</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Livro de registros das suas sessões na estrada, rolo ou pista concluídas.
            </p>
          </div>
          <span className="bg-slate-900 text-lime-400 font-mono text-[10px] font-black px-2.5 py-1 rounded-xl">
            {totalCompletedCount} PEDALADAS SELECIONADAS
          </span>
        </div>

        {allCompletedWorkouts.length > 0 ? (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
            {allCompletedWorkouts.map((item, index) => {
              const workout = item.workout;
              const duration = workout.actualDuration || workout.duration;
              const rpe = workout.actualRpe !== undefined ? workout.actualRpe : (workout.rpe || 5);
              const completedCalories = calculateWorkoutCalories(
                duration,
                rpe,
                profile.hasPowerMeter,
                profile.ftp
              );

              return (
                <div 
                  key={`completed-workout-${workout.day}-${index}`} 
                  className="py-4 flex flex-col justify-between gap-3.5 first:pt-1 last:pb-1 hover:bg-slate-50/50 rounded-xl px-2 transition-colors border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shrink-0 self-center">
                        <Zap className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-heading font-black text-xs text-slate-800">{workout.type}</h4>
                          <span className="bg-slate-100 border border-slate-200/50 text-slate-600 px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold">
                            Semana {item.weekNumber}
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-sans text-[9px] font-bold">
                            {workout.day}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-405 mt-1 font-sans">
                          Prescrito: {workout.duration}min @ Zona {workout.targetZone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                      <div className="text-left sm:text-right font-mono">
                        <span className="text-[10px] text-slate-400 block font-sans">DURAÇÃO REAL</span>
                        <strong className="text-xs text-slate-700">{duration} min</strong>
                      </div>
                      
                      <div className="text-left sm:text-right font-mono">
                        <span className="text-[10px] text-slate-400 block font-sans">ESFORÇO SENTIDO</span>
                        <strong className="text-xs text-slate-700">{rpe}/10</strong>
                      </div>

                      {workout.actualHr && (
                        <div className="text-left sm:text-right font-mono">
                          <span className="text-[10px] text-rose-400 block font-sans">FC MÉDIA</span>
                          <strong className="text-xs text-rose-600">{workout.actualHr} bpm</strong>
                        </div>
                      )}

                      {workout.actualPower && (
                        <div className="text-left sm:text-right font-mono">
                          <span className="text-[10px] text-lime-600 block font-sans font-bold">POTÊNCIA</span>
                          <strong className="text-xs text-lime-600">{workout.actualPower} W</strong>
                        </div>
                      )}

                      {completedCalories > 0 && (
                        <div className="text-right font-mono bg-amber-500/5 rounded-xl px-2.5 py-1 border border-amber-500/10">
                          <span className="text-[9px] text-slate-400 block font-sans font-bold leading-none uppercase">Gasto</span>
                          <strong className="text-xs text-amber-600">{completedCalories} kcal</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Render Personal Notes or Athlete observations */}
                  {workout.athleteNotes && (
                    <div className="ml-11 text-xs text-slate-600 bg-slate-50 border border-slate-200/50 p-2.5 rounded-xl leading-relaxed italic">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase not-italic tracking-wider mb-0.5">Minhas Sensações</span>
                      "{workout.athleteNotes}"
                    </div>
                  )}

                  {/* Render Coach AI Evaluation specific to this workout */}
                  {workout.aiFeedback && (
                    <div className="ml-11 text-xs text-sky-700 bg-sky-50 border border-sky-100 p-3 rounded-xl leading-relaxed">
                      <span className="text-[9px] font-heading font-black text-sky-800 block uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse"></span>
                        Avaliação e Análise do Treinador AI
                      </span>
                      <p className="whitespace-pre-wrap">{workout.aiFeedback}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
            <Trophy className="w-9 h-9 text-slate-300" />
            <p className="text-xs font-sans text-slate-450 font-medium">Você ainda não marcou nenhum treino como concluído.</p>
            <p className="text-[10.5px] font-sans text-slate-400 leading-normal max-w-xs text-center">
              Abra a aba <strong>"Minha Planilha"</strong> e marque a caixinha de conclusão (check) de um treino para registrar no seu histórico!
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
