import React, { useMemo } from "react";
import { UserProfile, TrainingPlan } from "../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts";
import { Flame, TrendingUp, Info, Award, Zap } from "lucide-react";

interface WeeklyCalorieChartProps {
  profile: UserProfile;
  plan: TrainingPlan | null;
}

interface CalorieDataPoint {
  day: string;
  type: string;
  plannedCalories: number;
  completedCalories: number;
  calories: number; // For safety/backwards compatibility
  duration: number;
  plannedDuration: number;
  completedDuration: number;
  completed: boolean;
  intensityText: string;
}

// Physiology calculation for cycling energy expenditure
export function calculateWorkoutCalories(
  durationMinutes: number,
  rpe: number,
  hasPowerMeter: boolean | null,
  ftp: number | null
): number {
  if (durationMinutes <= 0) return 0;

  if (hasPowerMeter && ftp && ftp > 0) {
    // Estimate average power percentage of FTP based on effort (rpe: 1-10)
    let ftpFactor = 0.55;
    if (rpe <= 2) ftpFactor = 0.55;       // Recovery/Giro fácil
    else if (rpe <= 4) ftpFactor = 0.68;  // Endurance / Ritmo Leve
    else if (rpe <= 6) ftpFactor = 0.80;  // Tempo / Ritmo Firme
    else if (rpe <= 8) ftpFactor = 0.95;  // Limiar / Ritmo Forte
    else ftpFactor = 1.10;                 // VO2Max / Máximo

    const avgPower = ftp * ftpFactor;
    const durationHours = durationMinutes / 60;
    // Human efficiency factor in cycling is ~24%, which means:
    // kcal ≈ avgPower (Watts) * durationHours (Hrs) * 3.6
    return Math.round(avgPower * durationHours * 3.6);
  } else {
    // Standard metabolic equivalent (MET) or MET-approximate energy cost per minute by effort level
    let kcalPerMinute = 6.0;
    if (rpe <= 2) kcalPerMinute = 5.5;      // Giro muito leve
    else if (rpe <= 4) kcalPerMinute = 8.0;     // Ritmo leve plano
    else if (rpe <= 6) kcalPerMinute = 11.0;    // Ritmo moderado
    else if (rpe <= 8) kcalPerMinute = 14.0;    // Ritmo forte
    else kcalPerMinute = 17.5;                  // Ritmo máximo

    return Math.round(durationMinutes * kcalPerMinute);
  }
}

export default function WeeklyCalorieChart({ profile, plan }: WeeklyCalorieChartProps) {
  
  const chartData = useMemo<CalorieDataPoint[]>(() => {
    if (!plan || !plan.workouts) return [];
    
    return plan.workouts.map(workout => {
      const plannedDuration = workout.duration;
      const plannedRpe = workout.rpe || 5;
      const plannedCalories = calculateWorkoutCalories(
        plannedDuration,
        plannedRpe,
        profile.hasPowerMeter,
        profile.ftp
      );

      const completedCalories = workout.completed
        ? calculateWorkoutCalories(
            workout.actualDuration || workout.duration,
            workout.actualRpe || workout.rpe || 5,
            profile.hasPowerMeter,
            profile.ftp
          )
        : 0;

      const duration = workout.completed && workout.actualDuration !== undefined 
        ? workout.actualDuration 
        : workout.duration;

      const rpe = workout.completed && workout.actualRpe !== undefined 
        ? workout.actualRpe 
        : (workout.rpe || 5);

      const calories = workout.completed ? completedCalories : plannedCalories;

      let intensityText = "Moderado";
      if (rpe <= 2) intensityText = "Muito Leve";
      else if (rpe <= 4) intensityText = "Leve";
      else if (rpe <= 6) intensityText = "Moderado";
      else if (rpe <= 8) intensityText = "Forte";
      else intensityText = "Máximo";

      return {
        day: workout.day,
        type: workout.type,
        plannedCalories,
        completedCalories,
        calories,
        duration,
        plannedDuration,
        completedDuration: workout.completed ? (workout.actualDuration || workout.duration) : 0,
        completed: !!workout.completed,
        intensityText
      };
    });
  }, [profile, plan]);

  // Aggregate stats
  const totalPlannedCalories = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.plannedCalories, 0);
  }, [chartData]);

  const totalCompletedCalories = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.completedCalories, 0);
  }, [chartData]);

  const totalCalories = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.calories, 0);
  }, [chartData]);

  const activeWorkouts = useMemo(() => {
    return chartData.filter(item => item.duration > 0);
  }, [chartData]);

  const completedWorkouts = useMemo(() => {
    return chartData.filter(item => item.completed && item.completedCalories > 0);
  }, [chartData]);

  const maxCalorieWorkout = useMemo(() => {
    const list = completedWorkouts.length > 0 ? completedWorkouts : activeWorkouts;
    if (list.length === 0) return null;
    const key = completedWorkouts.length > 0 ? "completedCalories" : "plannedCalories";
    return [...list].sort((a, b) => b[key] - a[key])[0];
  }, [activeWorkouts, completedWorkouts]);

  const averageCalories = useMemo(() => {
    const list = completedWorkouts.length > 0 ? completedWorkouts : activeWorkouts;
    if (list.length === 0) return 0;
    const total = completedWorkouts.length > 0 ? totalCompletedCalories : totalPlannedCalories;
    return Math.round(total / list.length);
  }, [totalCompletedCalories, totalPlannedCalories, activeWorkouts, completedWorkouts]);

  // Custom tooltips with Tailwind
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: CalorieDataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 p-4 text-xs space-y-2.5 font-sans w-58">
          <p className="font-heading font-black text-amber-400 uppercase tracking-widest text-[10px] border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span>{data.day}</span>
            <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase ${
              data.completed 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-slate-500/10 text-slate-400 border-slate-500/20"
            }`}>
              {data.completed ? "Concluído" : "Pendente"}
            </span>
          </p>
          <div className="space-y-1.5 font-medium text-slate-350">
            <p className="font-heading font-extrabold text-white text-xs mb-1 truncate">{data.type}</p>
            <div className="flex flex-col gap-1 border-t border-slate-850/50 pt-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Meta Planejada:</span>
                <span className="font-mono text-slate-200 font-semibold">{data.plannedCalories} kcal <span className="text-[9px] text-slate-500">({data.plannedDuration}m)</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Giro Executado:</span>
                {data.completed ? (
                  <span className="font-mono text-emerald-400 font-bold">{data.completedCalories} kcal <span className="text-[9px] text-emerald-500/80">({data.completedDuration}m)</span></span>
                ) : (
                  <span className="text-slate-500 italic">--</span>
                )}
              </div>
            </div>
          </div>
          {data.calories > 0 && profile.hasPowerMeter && (
            <p className="text-[9px] text-slate-500 italic pt-1.5 border-t border-slate-850 leading-relaxed font-sans">
              Zonas: {data.intensityText}. Potência FTP ativa ({profile.ftp}W).
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (!plan || !plan.workouts || plan.workouts.length === 0) {
    return null;
  }

  return (
    <div id="weekly-calorie-card" className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 animate-fadeInUp">
      
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <h3 className="font-heading font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500/10" />
            <span>Gasto Calórico Estimado</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-sans">
            Estimativa planejada de desgaste calórico em kcal para cada dia da semana atual.
          </p>
        </div>
        
        {totalCalories > 0 && (
          <div className="bg-amber-50 border border-amber-100/60 rounded-2xl px-4 py-2 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-600 fill-amber-600/10 animate-pulse" />
            <div>
              <span className="text-[9px] text-slate-400 block font-sans font-bold leading-none uppercase tracking-wider">Realizado / Meta Semanal</span>
              <span className="text-sm font-mono font-black text-amber-600">{totalCompletedCalories.toLocaleString()}<span className="text-xs text-slate-400 font-normal"> / {totalPlannedCalories.toLocaleString()} kcal</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Bar Chart Canvas */}
      <div className="w-full h-64 sm:h-72 my-1" id="calorie-bar-chart-container">
        {totalCalories > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart 
              data={chartData} 
              margin={{ top: 15, right: 10, left: -25, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="day" 
                stroke="#94a3b8" 
                fontSize={10} 
                fontWeight={600} 
                tickLine={false} 
                axisLine={false}
                dy={8}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={10} 
                fontWeight={600} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `${val}`}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: '#f8fafc', opacity: 0.6 }} 
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '10px', fontWeight: 600, fontFamily: 'sans-serif' }}
              />
              <Bar 
                name="Meta Planejada"
                dataKey="plannedCalories" 
                fill="#cbd5e1"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
              <Bar 
                name="Realizado"
                dataKey="completedCalories" 
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => {
                  let barColor = "#e2e8f0"; // fallback
                  if (entry.completed) {
                    if (entry.completedCalories > 700) {
                      barColor = "#e11d48"; // heavy
                    } else if (entry.completedCalories > 450) {
                      barColor = "#ea580c"; // medium
                    } else if (entry.completedCalories < 250) {
                      barColor = "#10b981"; // recovery
                    } else {
                      barColor = "#f59e0b"; // regular
                    }
                  } else {
                    // if not completed, we don't display anything (color it basic or transparent)
                    barColor = "transparent";
                  }
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={barColor} 
                      className="transition-all duration-300 hover:brightness-105 cursor-pointer"
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-xs text-slate-400 font-sans gap-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Flame className="w-8 h-8 text-slate-300" />
            <span>Sem gasto calórico planejado para esta semana.</span>
          </div>
        )}
      </div>

      {/* Calorie Stats Boxes / Footer Legend */}
      {totalCalories > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs font-sans">
          
          <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-100/80 flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0 border border-amber-100/50">
              <Flame className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold leading-none mb-1">Média por Treino</span>
              <span className="text-sm font-mono font-black text-slate-800">{averageCalories} kcal</span>
            </div>
          </div>

          <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-100/80 flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0 border border-rose-100/50">
              <Award className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold leading-none mb-1">Maior Gasto Diário</span>
              {maxCalorieWorkout ? (
                <div className="flex flex-col">
                  <span className="text-sm font-mono font-black text-slate-800 leading-none">{maxCalorieWorkout.calories} kcal</span>
                  <span className="text-[10px] text-slate-500 font-sans mt-1">({maxCalorieWorkout.day})</span>
                </div>
              ) : (
                <span className="text-sm font-black text-slate-800">-</span>
              )}
            </div>
          </div>

          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100/80 flex items-start gap-2.5 sm:col-span-1">
            <Info className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans font-medium">
              Gasto calórico estimado a partir da intensidade e tempo. Atletas com medidor de potência têm estimativas de alta precisão baseadas no trabalho mecânico (Joules).
            </p>
          </div>

        </div>
      )}

    </div>
  );
}
