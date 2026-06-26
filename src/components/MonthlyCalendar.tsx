import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, TrainingPlan, Workout, isRestDay } from "../types";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Coffee, 
  AlertCircle, 
  HelpCircle,
  TrendingUp,
  Award,
  Info,
  CalendarDays,
  Sparkles,
  UserCheck
} from "lucide-react";

interface MonthlyCalendarProps {
  profile: UserProfile;
  plan: TrainingPlan | null;
  onUpdateWorkoutState?: (updatedPlan?: TrainingPlan) => void;
}

export default function MonthlyCalendar({ profile, plan, onUpdateWorkoutState }: MonthlyCalendarProps) {
  // Use current local date: June 20, 2026 based on metadata
  const baseDate = useMemo(() => new Date(2026, 5, 20), []);
  const [currentYear, setCurrentYear] = useState(baseDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(baseDate.getMonth()); // 0-indexed (5 = June)

  // Selected day state for detail modal / panel
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>("2026-06-20");

  // State to custom override statuses for interactive demonstration or tracking outside the standard week
  const [customStatuses, setCustomStatuses] = useState<Record<string, "realizado" | "perdido" | "descanso" | "planejado">>({});

  // Name of months in Portuguese
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const weekdayInitials = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  // Helper: map JS day (0 = Sunday, 1 = Monday...) to Portuguese naming
  const getWeekdayName = (dayIndex: number): string => {
    const names = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return names[dayIndex];
  };

  // Fetch standard workouts for active plan
  const workoutsList = useMemo(() => plan?.workouts || [], [plan]);

  // Seed a clean starting history for June 2026 without any prefilled completed/missed mock workouts!
  useEffect(() => {
    const initialStatuses: Record<string, "realizado" | "perdido" | "descanso" | "planejado"> = {};
    
    // We will loop through days of June 2026
    for (let d = 1; d <= 30; d++) {
      const dateStr = `2026-06-${d.toString().padStart(2, "0")}`;
      const dateObj = new Date(2026, 5, d);
      const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 1 is Monday...
      const weekdayPT = getWeekdayName(dayOfWeek);

      // Find if we have a scheduled workout template for this weekday
      const matchingTemplate = workoutsList.find(w => {
        const wDay = w.day.toLowerCase();
        const targetDay = weekdayPT.toLowerCase();
        return wDay.includes(targetDay) || targetDay.includes(wDay);
      });

      if (matchingTemplate) {
        if (isRestDay(matchingTemplate)) {
          initialStatuses[dateStr] = "descanso";
        } else {
          // It's a training day, but since the athlete hasn't completed any yet, it is "planejado" (or "realizado" only if completed in standard template)
          initialStatuses[dateStr] = matchingTemplate.completed ? "realizado" : "planejado";
        }
      } else {
        // No explicit workout in template, default to rest/descanso
        initialStatuses[dateStr] = "descanso";
      }
    }
    setCustomStatuses(initialStatuses);
  }, [workoutsList]);

  // Synchronize calendar on current week's completion changes in standard workouts list
  useEffect(() => {
    // For June 2026, match the current workouts' completion states onto the calendar!
    if (workoutsList.length > 0) {
      setCustomStatuses(prev => {
        const next = { ...prev };
        let changed = false;

        // Current week of June 15 to June 21, 2026
        for (let d = 15; d <= 21; d++) {
          const dateStr = `2026-06-${d.toString().padStart(2, "0")}`;
          const dateObj = new Date(2026, 5, d);
          const dayOfWeek = dateObj.getDay();
          const weekdayPT = getWeekdayName(dayOfWeek);

          const matchingTemplate = workoutsList.find(w => {
            const wDay = w.day.toLowerCase();
            const targetDay = weekdayPT.toLowerCase();
            return wDay.includes(targetDay) || targetDay.includes(wDay);
          });

          if (matchingTemplate) {
            const desiredStatus = isRestDay(matchingTemplate) 
              ? "descanso" 
              : (matchingTemplate.completed ? "realizado" : "planejado");
            
            if (prev[dateStr] !== desiredStatus) {
              next[dateStr] = desiredStatus;
              changed = true;
            }
          }
        }

        if (changed) {
          return next;
        }
        return prev;
      });
    }
  }, [workoutsList]);

  // Calculate calendar days list for currentYear & currentMonth
  const calendarDays = useMemo(() => {
    // 1st day of current display month
    const firstDayDate = new Date(currentYear, currentMonth, 1);
    // Number of days in current month
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Day of week of the first day (0 = Sunday, 1 = Monday..., 6 = Saturday)
    const jsDayOfWeek = firstDayDate.getDay();
    // Shift so that Monday is 0, Sunday is 6
    const startOffset = (jsDayOfWeek + 6) % 7;

    const days: Array<{
      dayNum: number;
      dateStr: string;
      isToday: boolean;
      isPlaceholder: boolean;
      weekdayName: string;
    }> = [];

    // Prior month placeholders for layout offset alignment
    for (let i = 0; i < startOffset; i++) {
      days.push({
        dayNum: 0,
        dateStr: "",
        isToday: false,
        isPlaceholder: true,
        weekdayName: ""
      });
    }

    // Days of current month
    const todayObject = baseDate;
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateString = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
      const isToday = 
        todayObject.getFullYear() === currentYear && 
        todayObject.getMonth() === currentMonth && 
        todayObject.getDate() === d;

      const dateObj = new Date(currentYear, currentMonth, d);
      const weekdayName = getWeekdayName(dateObj.getDay());

      days.push({
        dayNum: d,
        dateStr: dateString,
        isToday,
        isPlaceholder: false,
        weekdayName
      });
    }

    return days;
  }, [currentYear, currentMonth, baseDate]);

  // Handle navigating through months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Change a day's status interactive helper
  const handleToggleStatus = (dateStr: string, nextStatus: "realizado" | "perdido" | "descanso" | "planejado") => {
    const updated = {
      ...customStatuses,
      [dateStr]: nextStatus
    };
    setCustomStatuses(updated);

    // If the changed day is in the current active training week (Monday June 15 - Sunday June 21, 2026)
    // we also update the main planilla workout completed state so that the two systems are fully in sync!
    const dateObj = new Date(dateStr);
    const dayOfValue = dateObj.getDate();
    const isJune = dateObj.getMonth() === 5 && dateObj.getFullYear() === 2026;
    
    if (isJune && dayOfValue >= 15 && dayOfValue <= 21 && plan && plan.workouts) {
      const weekdayPT = getWeekdayName(dateObj.getDay());
      const workoutIndex = plan.workouts.findIndex(w => {
        const wDay = w.day.toLowerCase();
        const targetDay = weekdayPT.toLowerCase();
        return wDay.includes(targetDay) || targetDay.includes(wDay);
      });

      if (workoutIndex !== -1) {
        const currentWorkout = plan.workouts[workoutIndex];
        const updatedWorkout = {
          ...currentWorkout,
          completed: nextStatus === "realizado",
          completedDate: nextStatus === "realizado" ? dateStr : undefined
        };

        const updatedWorkouts = [...plan.workouts];
        updatedWorkouts[workoutIndex] = updatedWorkout;
        const updatedPlan = {
          ...plan,
          workouts: updatedWorkouts
        };

        if (onUpdateWorkoutState) {
          onUpdateWorkoutState(updatedPlan);
        }
      }
    }
  };

  // Calculate statistics for the displayed month
  const monthStats = useMemo(() => {
    let realizadosCount = 0;
    let perdidosCount = 0;
    let descansoCount = 0;
    let planejadoCount = 0;

    // Loop through current year & month custom statuses keys
    const prefix = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-`;
    Object.entries(customStatuses).forEach(([k, val]) => {
      if (k.startsWith(prefix)) {
        if (val === "realizado") realizadosCount++;
        else if (val === "perdido") perdidosCount++;
        else if (val === "descanso") descansoCount++;
        else if (val === "planejado") planejadoCount++;
      }
    });

    const totalTreinosValidos = realizadosCount + perdidosCount + planejadoCount;
    const taxaAproveitamento = totalTreinosValidos > 0 
      ? Math.round((realizadosCount / (realizadosCount + perdidosCount)) * 100) 
      : 100;

    return {
      realizados: realizadosCount,
      perdidos: perdidosCount,
      descansos: descansoCount,
      planejados: planejadoCount,
      aproveitamento: isNaN(taxaAproveitamento) ? 100 : taxaAproveitamento
    };
  }, [customStatuses, currentYear, currentMonth]);

  // Find workout templates and description for selected day details panel
  const selectedDayInfo = useMemo(() => {
    if (!selectedDayStr) return null;
    
    const status = customStatuses[selectedDayStr] || "descanso";
    const dateObj = new Date(selectedDayStr + "T12:00:00"); // avoid timezone issues
    const weekdayPT = getWeekdayName(dateObj.getDay());

    // Check if there is a workout on this specific weekday in the current template
    const templateW = workoutsList.find(w => {
      const wDay = w.day.toLowerCase();
      const targetDay = weekdayPT.toLowerCase();
      return wDay.includes(targetDay) || targetDay.includes(wDay);
    });

    return {
      dateStr: selectedDayStr,
      dayNum: dateObj.getDate(),
      weekday: weekdayPT,
      status,
      workout: templateW
    };
  }, [selectedDayStr, customStatuses, workoutsList]);

  // Helper renderer for day icon
  const renderDayBadge = (status: "realizado" | "perdido" | "descanso" | "planejado" | "vazio") => {
    switch (status) {
      case "realizado":
        return (
          <div className="w-5 h-5 flex items-center justify-center bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 rounded-full shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        );
      case "perdido":
        return (
          <div className="w-5 h-5 flex items-center justify-center bg-rose-500/15 border border-rose-500/40 text-rose-500 rounded-full shrink-0">
            <XCircle className="w-3.5 h-3.5" />
          </div>
        );
      case "descanso":
        return (
          <div className="w-5 h-5 flex items-center justify-center bg-slate-100 border border-slate-200 text-slate-500 rounded-full shrink-0">
            <Coffee className="w-3 h-3" />
          </div>
        );
      case "planejado":
        return (
          <div className="w-5 h-5 flex items-center justify-center bg-sky-500/15 border border-sky-400/30 text-sky-600 rounded-full shrink-0">
            <CalendarIcon className="w-3 h-3" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      id="monthly-calendar-card"
      className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs"
    >
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 ">
            <div className="bg-lime-500/15 p-2 rounded-xl text-lime-700">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-slate-800 text-lg">
                Consistência Mensal Simplificada
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                Seu histórico interativo rápido. Toque em qualquer dia para ver detalhes ou alterar o andamento.
              </p>
            </div>
          </div>
        </div>

        {/* Legend block */}
        <div className="flex flex-wrap gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-150/40 text-[10.5px] font-medium text-slate-600 font-sans">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Realizado</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Perdido</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-350"></span>
            <span>Descanso / Off</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span>Agendado</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Side: Interactive Calendar Grid */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-heading font-black text-slate-800 min-w-[120px] text-center uppercase tracking-wider">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar Grid Container */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs bg-slate-50/20">
            {/* Header: Weekdays */}
            <div className="grid grid-cols-7 bg-slate-50 text-center border-b border-slate-100 text-[11px] font-mono font-bold text-slate-400 py-3">
              {weekdayInitials.map((initial, i) => (
                <div key={i}>{initial}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 p-2 bg-white">
              {calendarDays.map((day, idx) => {
                if (day.isPlaceholder) {
                  return <div key={`ph-${idx}`} className="aspect-square bg-slate-50/10 rounded-xl"></div>;
                }

                const status = customStatuses[day.dateStr] || "descanso";
                const isSelected = selectedDayStr === day.dateStr;

                // Color schemes based on day status
                let borderStyle = "border-slate-100 hover:border-slate-350";
                let bgStyle = "bg-white text-slate-700";
                
                if (status === "realizado") {
                  bgStyle = "bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-850 hover:border-emerald-500/40";
                  borderStyle = "border-emerald-500/20";
                } else if (status === "perdido") {
                  bgStyle = "bg-rose-500/10 hover:bg-rose-500/15 text-rose-850 hover:border-rose-500/40";
                  borderStyle = "border-rose-500/20";
                } else if (status === "descanso") {
                  bgStyle = "bg-slate-50 hover:bg-slate-100/80 text-slate-500";
                  borderStyle = "border-slate-200/40";
                } else if (status === "planejado") {
                  bgStyle = "bg-sky-500/5 hover:bg-sky-500/10 text-sky-850 hover:border-sky-500/30";
                  borderStyle = "border-sky-500/10";
                }

                if (day.isToday) {
                  borderStyle = "border-lime-500 ring-2 ring-lime-500/40";
                }

                if (isSelected) {
                  borderStyle = "border-slate-800 ring-2 ring-slate-800/20";
                }

                return (
                  <button
                    key={`day-${day.dayNum}`}
                    onClick={() => setSelectedDayStr(day.dateStr)}
                    className={`aspect-square sm:p-2 p-1.5 border ${borderStyle} ${bgStyle} rounded-xl flex flex-col justify-between items-center transition-all cursor-pointer text-center relative font-sans`}
                  >
                    <span className="text-[11px] sm:text-xs font-black block leading-none">{day.dayNum}</span>
                    <div className="mt-0.5 sm:mt-1 shrink-0">
                      {renderDayBadge(status)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Legend, Stats and interactivity */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-5">
          {/* Calendar Stats Summary */}
          <div className="bg-slate-50 border border-slate-100/70 p-4 rounded-2xl text-left space-y-4">
            <span className="text-[10px] font-bold font-heading text-slate-400 uppercase tracking-widest block font-mono">Resumo no Mês Atual</span>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[9px] font-mono text-slate-400 block font-sans">COMPILADOS ✓</span>
                <span className="text-base font-black text-emerald-600 block">{monthStats.realizados} dias</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[9px] font-mono text-slate-400 block font-sans">PERDIDOS ✗</span>
                <span className="text-base font-black text-rose-500 block">{monthStats.perdidos} dias</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono text-slate-400 block font-sans">APROVEITAMENTO DOS COMPROMISSOS</span>
                <span className="text-sm font-black text-slate-800">Taxa de Foco: <span className="text-lime-650">{monthStats.aproveitamento}%</span></span>
              </div>
              <div className="w-10 h-10 shrink-0 font-heading font-black text-xs text-lime-700 bg-lime-100 border border-lime-300/30 flex items-center justify-center rounded-full">
                {monthStats.aproveitamento}%
              </div>
            </div>
          </div>

          {/* Day Interactive Details Block */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex-1 flex flex-col justify-between gap-4 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 bg-lime-500/5 rounded-full pointer-events-none blur-3xl"></div>
            
            <AnimatePresence mode="wait">
              {selectedDayInfo ? (
                <motion.div
                  key={selectedDayInfo.dateStr}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 flex-1 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[10px] font-mono tracking-widest text-[#FFDD00] uppercase font-bold">
                        {selectedDayInfo.weekday}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {selectedDayInfo.dayNum} de {monthNames[currentMonth]}
                      </span>
                    </div>

                    <div className="space-y-1 mt-1">
                      {selectedDayInfo.workout ? (
                        <>
                          <h4 className="text-sm font-heading font-bold text-white leading-normal">
                            🚴 {isRestDay(selectedDayInfo.workout) ? "Descanso Programado" : selectedDayInfo.workout.type} (Prescrito: {selectedDayInfo.workout.duration}min)
                          </h4>
                          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                            {isRestDay(selectedDayInfo.workout) 
                              ? "Hoje é dia de deixar as pernas para cima! Não há treinos pesados na sua planilha." 
                              : `Objetivo: ${selectedDayInfo.workout.goal}`
                            }
                          </p>
                          {!isRestDay(selectedDayInfo.workout) && (
                            <div className="text-[10px] font-mono text-lime-400 bg-lime-500/10 border border-lime-500/20 px-2 py-0.5 rounded-lg inline-block my-1">
                              Zonas: {selectedDayInfo.workout.targetZone || "Z2-Z3"}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <h4 className="text-sm font-heading font-bold text-white">
                            🛌 Sem atividade planejada
                          </h4>
                          <p className="text-[11px] text-slate-400 font-sans">
                            Sem prescrição ativa no banco de treinos semanais. Pode ser usado para pedal livre ou descanso total.
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Interactivity controls to toggle statuses */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider block">
                      Marcar Andamento do Dia:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <button
                        onClick={() => handleToggleStatus(selectedDayInfo.dateStr, "realizado")}
                        className={`py-2 px-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          selectedDayInfo.status === "realizado"
                            ? "bg-emerald-500 border-emerald-400 text-slate-950 font-black shadow-md shadow-emerald-500/10"
                            : "bg-slate-950 border-slate-800 text-emerald-400 hover:bg-slate-850"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Feito ✓</span>
                      </button>

                      <button
                        onClick={() => handleToggleStatus(selectedDayInfo.dateStr, "perdido")}
                        className={`py-2 px-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          selectedDayInfo.status === "perdido"
                            ? "bg-rose-500 border-rose-400 text-slate-950 font-black shadow-md shadow-rose-500/10"
                            : "bg-slate-950 border-slate-800 text-rose-400 hover:bg-slate-850"
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Perdi ✗</span>
                      </button>

                      <button
                        onClick={() => handleToggleStatus(selectedDayInfo.dateStr, "descanso")}
                        className={`py-2 px-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer col-span-2 ${
                          selectedDayInfo.status === "descanso"
                            ? "bg-slate-100 border-slate-350 text-slate-900 font-black"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850"
                        }`}
                      >
                        <Coffee className="w-3.5 h-3.5 shrink-0" />
                        <span>Folga / Descanso 🛌</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col justify-center items-center text-center space-y-2 py-6 text-slate-400 font-sans">
                  <Info className="w-8 h-8 opacity-40" />
                  <p className="text-xs">Selecione uma data ao lado para ver ou editar detalhes.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
