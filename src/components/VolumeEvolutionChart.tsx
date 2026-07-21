import React, { useState, useEffect } from "react";
import { UserProfile, TrainingPlan, isRestDay } from "../types";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend,
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
  minutes: number;             // Completed minutes
  hours: number;               // Completed hours
  plannedMinutes: number;      // Planned minutes
  plannedHours: number;        // Planned hours
  hoursFormatted: string;      // Completed hours formatted
  plannedHoursFormatted: string; // Planned hours formatted
  sessions: number;            // Total planned sessions
  completedSessions: number;   // Total completed sessions
  isReal: boolean;
}

export default function VolumeEvolutionChart({ profile, plan }: VolumeEvolutionChartProps) {
  const [viewType, setViewType] = useState<"time" | "sessions">("time");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [hasCompletedWorkouts, setHasCompletedWorkouts] = useState(false);

  useEffect(() => {
    // 1. Calculate active week's details
    const activeWeekNum = plan?.weekNumber || 1;
    const activeSessionsCount = plan?.workouts?.filter(w => !isRestDay(w)).length || profile.daysPerWeek || 4;
    const activeDurationPlannedMins = plan?.workouts?.reduce((sum, w) => sum + w.duration, 0) || 
      (profile.daysPerWeek || 4) * (profile.durationPerSession || 60);
    const activeDurationCompletedMins = plan?.workouts?.reduce((sum, w) => sum + (w.completed ? (w.actualDuration || w.duration) : 0), 0) || 0;
    const activeCompletedSessions = plan?.workouts?.filter(w => w.completed && !isRestDay(w)).length || 0;

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

    // Determine if there is any actual completed workout in active plan or stored history
    const hasAnyCompleted = activeCompletedSessions > 0 || realHistory.some(p => p.workouts?.some(w => w.completed));
    setHasCompletedWorkouts(hasAnyCompleted);

    // Convert real history to chart data points
    const realPoints: ChartDataPoint[] = realHistory.map((p) => {
      const wNum = p.weekNumber || 1;
      const plannedMins = p.workouts?.reduce((sum, w) => sum + w.duration, 0) || 0;
      
      // If there are no completed workouts, strictly zero everything
      const completedMins = hasAnyCompleted 
        ? (p.workouts?.reduce((sum, w) => sum + (w.completed ? (w.actualDuration || w.duration) : 0), 0) || 0)
        : 0;
      
      const compHoursVal = Number((completedMins / 60).toFixed(1));
      const compHoursInt = Math.floor(completedMins / 60);
      const compMinsRem = completedMins % 60;

      const planHoursVal = Number((plannedMins / 60).toFixed(1));
      const planHoursInt = Math.floor(plannedMins / 60);
      const planMinsRem = plannedMins % 60;

      return {
        name: `Semana ${wNum}`,
        minutes: completedMins,
        hours: compHoursVal,
        plannedMinutes: plannedMins,
        plannedHours: planHoursVal,
        hoursFormatted: `${compHoursInt}h${compMinsRem > 0 ? ` ${compMinsRem}m` : ""}`,
        plannedHoursFormatted: `${planHoursInt}h${planMinsRem > 0 ? ` ${planMinsRem}m` : ""}`,
        sessions: p.workouts?.filter(w => !isRestDay(w)).length || 0,
        completedSessions: hasAnyCompleted 
          ? (p.workouts?.filter(w => w.completed && !isRestDay(w)).length || 0)
          : 0,
        isReal: true,
      };
    });

    // 3. Create simulated historical points to populate a beautiful visual trend
    const finalPoints: ChartDataPoint[] = [];

    if (realPoints.length > 0) {
      // Append real points
      finalPoints.push(...realPoints);
      
      // Make sure active week isn't duplicated (if it's already in the saved history)
      const isAlreadyInHistory = realPoints.some(pt => pt.name.includes(`Semana ${activeWeekNum}`));
      if (!isAlreadyInHistory) {
        const completedMins = hasAnyCompleted ? activeDurationCompletedMins : 0;
        const compHoursVal = Number((completedMins / 60).toFixed(1));
        const compHoursInt = Math.floor(completedMins / 60);
        const compMinsRem = completedMins % 60;

        const planHoursVal = Number((activeDurationPlannedMins / 60).toFixed(1));
        const planHoursInt = Math.floor(activeDurationPlannedMins / 60);
        const planMinsRem = activeDurationPlannedMins % 60;

        finalPoints.push({
          name: `Semana ${activeWeekNum} (Atual)`,
          minutes: completedMins,
          hours: compHoursVal,
          plannedMinutes: activeDurationPlannedMins,
          plannedHours: planHoursVal,
          hoursFormatted: `${compHoursInt}h${compMinsRem > 0 ? ` ${compMinsRem}m` : ""}`,
          plannedHoursFormatted: `${planHoursInt}h${planMinsRem > 0 ? ` ${planMinsRem}m` : ""}`,
          sessions: activeSessionsCount,
          completedSessions: hasAnyCompleted ? activeCompletedSessions : 0,
          isReal: true
        });
      }
    } else {
      // No real history yet. Build a beautiful progressive curve leading to current week.
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
        const plannedMinutes = Math.round(baseDuration * factor);
        
        let completedMinutes = 0;
        let completedSessions = 0;

        if (hasAnyCompleted) {
          // If they have completed some workouts elsewhere, we can keep the decorative simulated past curves
          completedMinutes = Math.round(plannedMinutes * 0.95);
          completedSessions = Math.max(1, baseSessions + sessionsAdjuster[i]);
          if (i === 3) {
            completedMinutes = activeDurationCompletedMins;
            completedSessions = activeCompletedSessions;
          }
        } else {
          // STRICTLY ZEROED OUT since the athlete hasn't completed any pedals yet
          completedMinutes = 0;
          completedSessions = 0;
        }

        const compHoursVal = Number((completedMinutes / 60).toFixed(1));
        const compHoursInt = Math.floor(completedMinutes / 60);
        const compMinsRem = completedMinutes % 60;

        const planHoursVal = Number((plannedMinutes / 60).toFixed(1));
        const planHoursInt = Math.floor(plannedMinutes / 60);
        const planMinsRem = plannedMinutes % 60;

        finalPoints.push({
          name: weekLabels[i],
          minutes: completedMinutes,
          hours: compHoursVal,
          plannedMinutes,
          plannedHours: planHoursVal,
          hoursFormatted: `${compHoursInt}h${compMinsRem > 0 ? ` ${compMinsRem}m` : ""}`,
          plannedHoursFormatted: `${planHoursInt}h${planMinsRem > 0 ? ` ${planMinsRem}m` : ""}`,
          sessions: Math.max(1, baseSessions + sessionsAdjuster[i]),
          completedSessions,
          isReal: i === 3
        });
      }
    }

    setChartData(finalPoints);
  }, [profile, plan]);

  // Total accumulation stats for general knowledge
  const totalAccumulatedHours = chartData.reduce((acc, d) => acc + d.minutes, 0) / 60;
  const totalAccumulatedWorkouts = chartData.reduce((acc, d) => acc + d.completedSessions, 0);

  // Custom tooltips to make them speak human language
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ChartDataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 p-4 text-xs space-y-2.5 font-sans w-58">
          <p className="font-heading font-black text-lime-450 uppercase tracking-widest text-[10px] border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span>{data.name}</span>
            <span className="text-[9px] text-slate-450 font-mono">
              {data.isReal ? "Real" : "Simulado"}
            </span>
          </p>
          <div className="space-y-1.5 font-medium text-slate-350">
            <div className="flex flex-col gap-1 text-[11px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tempo de Treino:</span>
              <div className="flex justify-between">
                <span className="text-slate-450">Meta Planejada:</span>
                <span className="font-mono text-slate-200">{data.plannedHoursFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400">Pedal Executado:</span>
                <span className="font-mono text-emerald-400 font-bold">{data.hoursFormatted}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 border-t border-slate-850 pt-1.5 text-[11px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sessões:</span>
              <div className="flex justify-between">
                <span className="text-slate-450">Planejadas:</span>
                <span className="font-mono text-slate-200">{data.sessions} treinos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400">Concluídas:</span>
                <span className="font-mono text-emerald-400 font-bold">{data.completedSessions} treinos</span>
              </div>
            </div>
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
          <ResponsiveContainer width="100%" height={240}>
            {viewType === "time" ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0}/>
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
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: '10px', fontWeight: 600, fontFamily: 'sans-serif' }}
                />
                <Area 
                  name="Meta Planejada"
                  type="monotone" 
                  dataKey="plannedHours" 
                  stroke="#cbd5e1" 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                  fillOpacity={1} 
                  fill="url(#colorPlanned)" 
                  activeDot={{ r: 4 }}
                />
                <Area 
                  name="Realizado"
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
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} barGap={3}>
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
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: '10px', fontWeight: 600, fontFamily: 'sans-serif' }}
                />
                <Bar 
                  name="Sessões Planejadas"
                  dataKey="sessions" 
                  fill="#cbd5e1" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={15}
                />
                <Bar 
                  name="Sessões Concluídas"
                  dataKey="completedSessions" 
                  fill="#0ea5e9" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={15}
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

      {/* Como Concluir uma Atividade (Only shown if no completed workouts exist) */}
      {!hasCompletedWorkouts && (
        <div id="no-completed-workouts-instruction" className="p-4 rounded-2xl bg-amber-50 border border-amber-200/65 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-heading font-black text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              Como Concluir uma Atividade e Ativar Seu Gráfico
            </h4>
            <p className="text-[11px] font-sans text-slate-650 leading-relaxed font-medium">
              Você ainda não marcou nenhum treino como feito. Para iniciar todo o cálculo do seu gráfico de evolução real, vá até a seção de treinos diários acima, escolha um treino programado e clique no botão <span className="font-bold text-slate-905 underline">"Marcar como Concluído"</span>. Insira os dados reais de tempo pedalado e cansaço sugerido (RPE) para que o sistema comece a preencher e processar seu progresso semanal aqui!
            </p>
          </div>
        </div>
      )}

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
