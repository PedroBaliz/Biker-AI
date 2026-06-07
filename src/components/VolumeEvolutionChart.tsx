import React, { useState, useEffect } from "react";
import { UserProfile, TrainingPlan } from "../types";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar
} from "recharts";
import { TrendingUp, Clock, Dumbbell, Calendar, Info } from "lucide-react";

interface VolumeEvolutionChartProps {
  profile: UserProfile;
  plan: TrainingPlan | null;
}

interface ChartDataPoint {
  name: string;
  minutes: number;
  hours: number;
  hoursFormatted: string;
  sessions: number;
  completedSessions: number;
  isReal: boolean;
}

export default function VolumeEvolutionChart({ profile, plan }: VolumeEvolutionChartProps) {
  const [viewType, setViewType] = useState<"time" | "sessions">("time");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    // 1. Calculate active week's details
    const activeWeekNum = plan?.weekNumber || 1;
    const activeSessionsCount = plan?.workouts?.length || profile.daysPerWeek || 4;
    const activeDurationMins = plan?.workouts?.reduce((sum, w) => sum + w.duration, 0) || 
      (profile.daysPerWeek || 4) * (profile.durationPerSession || 60);
    const activeCompletedSessions = plan?.workouts?.filter(w => w.completed).length || 0;

    // 2. Fetch real history from localStorage
    let realHistory: TrainingPlan[] = [];
    const savedHistoryStr = localStorage.getItem("athlete_plan_history");
    if (savedHistoryStr) {
      try {
        realHistory = JSON.parse(savedHistoryStr);
      } catch (e) {
        console.error("Failed to parse athlete history", e);
      }
    }

    // Sort real history by weekNumber
    realHistory.sort((a, b) => (a.weekNumber || 1) - (b.weekNumber || 1));

    // Convert real history to chart data points
    const realPoints: ChartDataPoint[] = realHistory.map((p) => {
      const wNum = p.weekNumber || 1;
      const totalMins = p.workouts?.reduce((sum, w) => sum + w.duration, 0) || 0;
      const hoursVal = Number((totalMins / 60).toFixed(1));
      const hoursInt = Math.floor(totalMins / 60);
      const minsRem = totalMins % 60;
      return {
        name: `Semanas Anteriores (S.${wNum})`,
        minutes: totalMins,
        hours: hoursVal,
        hoursFormatted: `${hoursInt}h${minsRem > 0 ? ` ${minsRem}m` : ""}`,
        sessions: p.workouts?.length || 0,
        completedSessions: p.workouts?.filter(w => w.completed).length || 0,
        isReal: true,
      };
    });

    // 3. Create simulated historical points to populate a beautiful visual trend
    // We construct 4 data points in total. If we have real history, we blend it.
    // If not, we simulate realistic periodization weeks leading to the active week.
    const finalPoints: ChartDataPoint[] = [];

    if (realPoints.length > 0) {
      // Append real points
      finalPoints.push(...realPoints);
      
      // Make sure active week isn't duplicated (if it's already in the saved history)
      const isAlreadyInHistory = realPoints.some(pt => pt.name.includes(`S.${activeWeekNum}`));
      if (!isAlreadyInHistory) {
        const hoursVal = Number((activeDurationMins / 60).toFixed(1));
        const hoursInt = Math.floor(activeDurationMins / 60);
        const minsRem = activeDurationMins % 60;
        finalPoints.push({
          name: `Semana ${activeWeekNum} (Atual)`,
          minutes: activeDurationMins,
          hours: hoursVal,
          hoursFormatted: `${hoursInt}h${minsRem > 0 ? ` ${minsRem}m` : ""}`,
          sessions: activeSessionsCount,
          completedSessions: activeCompletedSessions,
          isReal: true
        });
      }
    } else {
      // No real history yet. Build a beautiful progressive curve leading to current week.
      // Represent standard microcycle periodization: Week -3 (Adaptation), Week -2 (Load), Week -1 (Peak), Active (Stabilization/Current)
      const weekLabels = [
        `Semana ${activeWeekNum > 3 ? activeWeekNum - 3 : 1} (Início)`,
        `Semana ${activeWeekNum > 2 ? activeWeekNum - 2 : 2} (Acúmulo)`,
        `Semana ${activeWeekNum > 1 ? activeWeekNum - 1 : 3} (Choque)`,
        `Semana ${activeWeekNum} (Foco Atual)`
      ];

      // Safe minimum checks
      const baseSessions = profile.daysPerWeek || 4;
      const baseDuration = (profile.daysPerWeek || 4) * (profile.durationPerSession || 60);

      // Periodization factors: 75%, 90%, 110%, 100% of the active/onboard targets
      const factors = [0.75, 0.90, 1.10, 1.0];
      const sessionsAdjuster = [-1, 0, 1, 0];

      for (let i = 0; i < 4; i++) {
        const factor = factors[i];
        const minutes = Math.round(baseDuration * factor);
        const hoursVal = Number((minutes / 60).toFixed(1));
        const hoursInt = Math.floor(minutes / 60);
        const minsRem = minutes % 60;

        const sessions = Math.max(1, baseSessions + sessionsAdjuster[i]);
        const completedSessions = i === 3 ? activeCompletedSessions : sessions; // assume past weeks were completed!

        finalPoints.push({
          name: weekLabels[i],
          minutes,
          hours: hoursVal,
          hoursFormatted: `${hoursInt}h${minsRem > 0 ? ` ${minsRem}m` : ""}`,
          sessions,
          completedSessions,
          isReal: i === 3 // Only the 4th is currently the active real state
        });
      }
    }

    setChartData(finalPoints);
  }, [profile, plan]);

  // Total accumulation stats for general knowledge
  const totalAccumulatedHours = chartData.reduce((acc, d) => acc + d.minutes, 0) / 60;
  const totalAccumulatedWorkouts = chartData.reduce((acc, d) => acc + d.sessions, 0);

  // Custom tooltips to make them speak human language
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ChartDataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white rounded-xl shadow-lg border border-slate-850 p-3 text-xs space-y-1.5 font-sans">
          <p className="font-heading font-black text-lime-400 uppercase tracking-wider text-[10px]">{data.name}</p>
          <div className="space-y-1 font-medium">
            <p className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Volume: <strong className="text-white">{data.hoursFormatted}</strong> ({data.minutes} min)</span>
            </p>
            <p className="flex items-center gap-1.5 text-slate-300">
              <Dumbbell className="w-3.5 h-3.5 text-sky-400" />
              <span>Sessões: <strong className="text-white">{data.sessions} treinos</strong></span>
            </p>
            <p className="text-[10px] text-slate-400 italic">
              {data.isReal ? "✓ Dados reais da conta" : "⚡ Simulação de base anterior"}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="volume-evolution-card" className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
      
      {/* Header with Title and Toggles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <h3 className="font-heading font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-lime-600" />
            <span>Evolução do Volume Semanal</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-sans">
            Compare o tempo total acumulado em cima da bicicleta ou a frequência de estimulações.
          </p>
        </div>

        {/* Toggle Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setViewType("time")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold leading-none font-heading transition-all cursor-pointer ${
              viewType === "time"
                ? "bg-slate-900 text-lime-400 shadow-sm"
                : "text-slate-650 hover:bg-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Tempo Total</span>
          </button>
          <button
            type="button"
            onClick={() => setViewType("sessions")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold leading-none font-heading transition-all cursor-pointer ${
              viewType === "sessions"
                ? "bg-slate-900 text-lime-400 shadow-sm"
                : "text-slate-650 hover:bg-slate-200"
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Sessões</span>
          </button>
        </div>
      </div>

      {/* Main Chart Rendering Field */}
      <div className="w-full h-64 sm:h-72 my-1" id="evolution-chart-container">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {viewType === "time" ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight={500} 
                  tickLine={false} 
                  axisLine={false}
                  dy={8}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight={500} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `${val}h`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                <Area 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorTime)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#10b981" }}
                />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight={500} 
                  tickLine={false} 
                  axisLine={false}
                  dy={8}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight={500} 
                  tickLine={false} 
                  axisLine={false} 
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.5 }} />
                <Bar 
                  dataKey="sessions" 
                  fill="#0ea5e9" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-slate-400 font-sans">
            Aguardando carregamento de dados da planilha...
          </div>
        )}
      </div>

      {/* Interactive Legend / Footer explanation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-50 text-xs font-sans">
        <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold leading-none">Tempo Acumulado</span>
            <span className="text-sm font-black text-slate-800">~{totalAccumulatedHours.toFixed(1)} horas</span>
          </div>
        </div>

        <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-sky-100 text-sky-700 rounded-lg shrink-0">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold leading-none">Estímulos Totais</span>
            <span className="text-sm font-black text-slate-800">{totalAccumulatedWorkouts} treinos</span>
          </div>
        </div>

        <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 flex items-center gap-2.5 sm:col-span-1">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[10.5px] text-slate-500 leading-tight">
            Para evoluir seu limiar e força aeróbica com segurança, nós variamos sistematicamente seu volume sem pular degraus de supercompensação.
          </p>
        </div>
      </div>

    </div>
  );
}
