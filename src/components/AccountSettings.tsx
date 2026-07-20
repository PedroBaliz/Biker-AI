import React, { useState } from "react";
import { UserAccount, UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Save, 
  Undo, 
  Key, 
  AlertTriangle, 
  CheckCircle, 
  Shield, 
  Activity, 
  Zap, 
  Heart, 
  Sliders, 
  Calendar, 
  Flame, 
  Sparkles,
  ClipboardList,
  CreditCard
} from "lucide-react";

interface AccountSettingsProps {
  currentUser: UserAccount;
  onUpdateAccount: (updatedUser: UserAccount, newPassword?: string) => boolean;
  onClose: () => void;
}

export default function AccountSettings({ currentUser, onUpdateAccount, onClose }: AccountSettingsProps) {
  // Tabs: 'account', 'athlete', or 'subscription'
  const [activeTab, setActiveTab] = useState<"account" | "athlete" | "subscription">("athlete");

  // Account inputs
  const [name, setName] = useState(currentUser.profile.name);
  const [email, setEmail] = useState(currentUser.email);
  const [currentPasswordConfirm, setCurrentPasswordConfirm] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Athlete Profile inputs
  const [level, setLevel] = useState<UserProfile["level"]>(currentUser.profile.level || "");
  const [goal, setGoal] = useState<UserProfile["goal"]>(currentUser.profile.goal || "");
  const [daysPerWeek, setDaysPerWeek] = useState<number | "">(currentUser.profile.daysPerWeek || "");
  const [durationPerSession, setDurationPerSession] = useState<number | "">(currentUser.profile.durationPerSession || "");
  const [eventDate, setEventDate] = useState(currentUser.profile.eventDate || "");
  const [hasPowerMeter, setHasPowerMeter] = useState<boolean>(currentUser.profile.hasPowerMeter ?? false);
  const [ftp, setFtp] = useState<number | "">(currentUser.profile.ftp || "");
  const [hasHeartRate, setHasHeartRate] = useState<boolean>(currentUser.profile.hasHeartRate ?? false);
  const [maxHeartRate, setMaxHeartRate] = useState<number | "">(currentUser.profile.maxHeartRate || "");
  const [limitations, setLimitations] = useState(currentUser.profile.limitations || "");
  const [recentActivity, setRecentActivity] = useState(currentUser.profile.recentActivity || "");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validateEmail = (input: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("O nome do atleta não pode ficar vazio.");
      return;
    }

    if (!email.trim() || !validateEmail(email)) {
      setError("Por favor, preencha um e-mail de acesso válido.");
      return;
    }

    const emailChanged = email.trim().toLowerCase() !== currentUser.email.toLowerCase();
    const nameChanged = name.trim() !== currentUser.profile.name;
    const passwordChanged = !!newPassword.trim();
    
    // Safety check with current password when changing security details
    if (emailChanged || nameChanged || passwordChanged) {
      if (!currentPasswordConfirm) {
        setError("Para salvar alterações críticas na conta (Nome, E-mail ou Senha), informe a sua senha atual de validação.");
        return;
      }

      // Validate current password
      const savedUsers = localStorage.getItem("coach_users");
      let usersMap: Record<string, any> = {};
      if (savedUsers) {
        try {
          usersMap = JSON.parse(savedUsers);
        } catch (err) {
          usersMap = {};
        }
      }

      const currentEmailKey = currentUser.email.toLowerCase();
      const oldUserEntry = usersMap[currentEmailKey];
      
      if (!oldUserEntry) {
        setError("Instância de usuário corrompida. Por favor, reinicie a sessão.");
        return;
      }

      if (oldUserEntry.password !== currentPasswordConfirm) {
        setError("A senha atual de confirmação está incorreta. Não foi possível autorizar a atualização.");
        return;
      }

      const newEmailKey = email.trim().toLowerCase();
      if (newEmailKey !== currentEmailKey && usersMap[newEmailKey]) {
        setError("Este novo endereço de e-mail já está sendo utilizado por outro atleta.");
        return;
      }
    }

    if (newPassword.trim() && newPassword.length < 6) {
      setError("A nova senha precisa conter no mínimo 6 caracteres por segurança.");
      return;
    }

    // Days per week limit
    if (daysPerWeek !== "" && (daysPerWeek < 1 || daysPerWeek > 7)) {
      setError("A quantidade de dias deve ser entre 1 e 7.");
      return;
    }

    // Build the updated user account and save
    const updatedUser: UserAccount = {
      ...currentUser,
      email: email.trim(),
      profile: {
        ...currentUser.profile,
        name: name.trim(),
        level,
        goal,
        daysPerWeek: daysPerWeek !== "" ? Number(daysPerWeek) : null,
        durationPerSession: durationPerSession !== "" ? Number(durationPerSession) : null,
        eventDate,
        hasPowerMeter,
        ftp: hasPowerMeter && ftp !== "" ? Number(ftp) : null,
        hasHeartRate,
        maxHeartRate: hasHeartRate && maxHeartRate !== "" ? Number(maxHeartRate) : null,
        limitations,
        recentActivity
      }
    };

    const savedUsers = localStorage.getItem("coach_users");
    let usersMap: Record<string, any> = {};
    if (savedUsers) {
      try { usersMap = JSON.parse(savedUsers); } catch (e) {}
    }
    const currentEmailKey = currentUser.email.toLowerCase();
    const finalPassword = newPassword.trim() ? newPassword : (usersMap[currentEmailKey]?.password || "123456");

    const ok = onUpdateAccount(updatedUser, finalPassword);
    if (ok) {
      setSuccess("Configurações atualizadas com sucesso no seu perfil!");
      setCurrentPasswordConfirm("");
      setNewPassword("");
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setError("Erro interno ao atualizar os seus registros de treino.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-3xl mx-auto w-full bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-2xl text-lime-400">
            <Sliders className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-base text-slate-850">Ajustes do Atleta</h3>
            <p className="text-xs text-slate-450 font-sans">Aperfeiçoe suas métricas de treino, dados de login e fisiologia</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 self-start sm:self-auto rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 text-xs font-bold transition-all cursor-pointer"
        >
          <Undo className="w-3.5 h-3.5" />
          <span>Voltar ao Painel</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => { setError(""); setSuccess(""); setActiveTab("athlete"); }}
          className={`flex-1 py-3 text-xs font-black text-center rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "athlete" 
              ? "bg-white text-slate-900 shadow-xs border border-slate-100" 
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span className="hidden sm:inline">Fisiologia & Treino</span>
          <span className="inline sm:hidden">Treino</span>
        </button>
        <button
          type="button"
          onClick={() => { setError(""); setSuccess(""); setActiveTab("account"); }}
          className={`flex-1 py-3 text-xs font-black text-center rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "account" 
              ? "bg-white text-slate-900 shadow-xs border border-slate-100" 
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span className="hidden sm:inline">Acesso & Conta</span>
          <span className="inline sm:hidden">Acesso</span>
        </button>
        <button
          type="button"
          onClick={() => { setError(""); setSuccess(""); setActiveTab("subscription"); }}
          className={`flex-1 py-3 text-xs font-black text-center rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "subscription" 
              ? "bg-white text-slate-900 shadow-xs border border-slate-100" 
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span className="hidden sm:inline">Minha Assinatura</span>
          <span className="inline sm:hidden">Plano</span>
        </button>
      </div>

      {/* Messages */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex gap-2.5 items-start"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex gap-2.5 items-start animate-bounce"
          >
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* ATHLETE TAB */}
        {activeTab === "athlete" && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Level Input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Nível do Ciclista</label>
                <div className="relative">
                  <Sliders className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <select
                    value={level}
                    onChange={(e: any) => setLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 focus:border-slate-350 focus:bg-white rounded-xl pl-10 pr-4 py-3.5 text-xs outline-hidden focus:ring-1 focus:ring-slate-350 transition-all font-sans text-slate-800"
                  >
                    <option value="">Selecione seu nível...</option>
                    <option value="iniciante">Iniciante (Pouco volume / Iniciando agora)</option>
                    <option value="intermediário">Intermediário (Giro estruturado semanal)</option>
                    <option value="avançado">Avançado (Ciclista de alto volume / Competições)</option>
                  </select>
                </div>
              </div>

              {/* Goal Input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Objetivo de Treino</label>
                <div className="relative">
                  <Flame className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <select
                    value={goal}
                    onChange={(e: any) => setGoal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 focus:border-slate-350 focus:bg-white rounded-xl pl-10 pr-4 py-3.5 text-xs outline-hidden focus:ring-1 focus:ring-slate-350 transition-all font-sans text-slate-800"
                  >
                    <option value="">Selecione seu objetivo...</option>
                    <option value="perder peso">Perder peso / Gasto calórico estruturado</option>
                    <option value="melhorar condicionamento">Melhorar Condicionamento Aeróbico (FTP)</option>
                    <option value="completar um evento">Completar um Evento / Prova Alvo</option>
                    <option value="competir">Performar em Competições / Pódio</option>
                  </select>
                </div>
              </div>

              {/* Days Per Week */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Dias de Treino Disponíveis</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    min="1"
                    max="7"
                    placeholder="Quantidade de dias por semana (Ex: 4)"
                    value={daysPerWeek}
                    onChange={(e) => setDaysPerWeek(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-50 border border-slate-150 focus:border-slate-350 focus:bg-white rounded-xl pl-10 pr-4 py-3.5 text-xs outline-hidden focus:ring-1 focus:ring-slate-350 transition-all font-sans text-slate-800"
                  />
                </div>
              </div>

              {/* Average Duration */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Duração Média da Sessão (Minutos)</label>
                <div className="relative">
                  <Activity className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    min="15"
                    max="300"
                    placeholder="Minutos por sessão (Ex: 90 minutos)"
                    value={durationPerSession}
                    onChange={(e) => setDurationPerSession(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-50 border border-slate-150 focus:border-slate-350 focus:bg-white rounded-xl pl-10 pr-4 py-3.5 text-xs outline-hidden focus:ring-1 focus:ring-slate-350 transition-all font-sans text-slate-800"
                  />
                </div>
              </div>

              {/* Event date / description */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Nome/Data da Prova Alvo</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ex: Gran Fondo em Setembro (Opcional)"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 focus:border-slate-350 focus:bg-white rounded-xl pl-10 pr-4 py-3.5 text-xs outline-hidden focus:ring-1 focus:ring-slate-350 transition-all font-sans text-slate-800"
                  />
                </div>
              </div>

              {/* Power meter / FTP */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Medidor de Potência (Watts)</label>
                <div className="flex gap-2">
                  <select
                    value={hasPowerMeter ? "yes" : "no"}
                    onChange={(e) => {
                      const yes = e.target.value === "yes";
                      setHasPowerMeter(yes);
                      if (!yes) setFtp("");
                    }}
                    className="bg-slate-50 border border-slate-150 rounded-xl px-3 text-xs font-bold text-slate-700 transition-all shrink-0 select-none outline-hidden"
                  >
                    <option value="no">Não possuo</option>
                    <option value="yes">Possuo</option>
                  </select>
                  <div className="relative flex-1">
                    <Zap className={`absolute left-3 top-3.5 w-4 h-4 ${hasPowerMeter ? "text-amber-500" : "text-slate-300"}`} />
                    <input
                      type="number"
                      disabled={!hasPowerMeter}
                      placeholder="Valor do FTP (Watts)"
                      value={ftp}
                      onChange={(e) => setFtp(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-slate-50 border border-slate-150 focus:border-slate-350 focus:bg-white rounded-xl pl-9 pr-4 py-3.5 text-xs outline-hidden focus:ring-1 focus:ring-slate-350 transition-all disabled:opacity-50 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Heart rate monitor / Max HR */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Frequência Cardíaca Máxima (FCmáx)</label>
                <div className="flex gap-2">
                  <select
                    value={hasHeartRate ? "yes" : "no"}
                    onChange={(e) => {
                      const yes = e.target.value === "yes";
                      setHasHeartRate(yes);
                      if (!yes) setMaxHeartRate("");
                    }}
                    className="bg-slate-50 border border-slate-150 rounded-xl px-3 text-xs font-bold text-slate-700 transition-all shrink-0 select-none outline-hidden"
                  >
                    <option value="no">Não possuo</option>
                    <option value="yes">Possuo</option>
                  </select>
                  <div className="relative flex-1">
                    <Heart className={`absolute left-3 top-3.5 w-4 h-4 ${hasHeartRate ? "text-rose-500" : "text-slate-300"}`} />
                    <input
                      type="number"
                      disabled={!hasHeartRate}
                      placeholder="FCmáx em bpm (Ex: 185)"
                      value={maxHeartRate}
                      onChange={(e) => setMaxHeartRate(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-slate-50 border border-slate-150 focus:border-slate-350 focus:bg-white rounded-xl pl-9 pr-4 py-3.5 text-xs outline-hidden focus:ring-1 focus:ring-slate-350 transition-all disabled:opacity-50 text-slate-800"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              
              {/* Limitations / Injuries */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Lesões, Dores ou Limitações Físicas</label>
                <div className="relative">
                  <AlertTriangle className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <textarea
                    rows={2}
                    placeholder="Comente se tem dores nos joelhos, hérnia, lombar, etc. (Opcional)"
                    value={limitations}
                    onChange={(e) => setLimitations(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 focus:border-slate-355 focus:bg-white rounded-xl pl-10 pr-4 py-3 text-xs outline-hidden focus:ring-1 focus:ring-slate-350 transition-all font-sans text-slate-800 resize-none"
                  />
                </div>
              </div>

              {/* Recent Activity history */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Resumo da sua rotina atual de giros</label>
                <div className="relative">
                  <ClipboardList className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <textarea
                    rows={2}
                    placeholder="Quanto costuma pedalar por semana hoje em dia? (Opcional)"
                    value={recentActivity}
                    onChange={(e) => setRecentActivity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 focus:border-slate-355 focus:bg-white rounded-xl pl-10 pr-4 py-3 text-xs outline-hidden focus:ring-1 focus:ring-slate-350 transition-all font-sans text-slate-800 resize-none"
                  />
                </div>
              </div>

            </div>

            <div className="bg-sky-50/70 border border-sky-100 p-3.5 rounded-2xl flex items-start gap-2 text-sky-850">
              <Sparkles className="w-4 h-4 text-sky-500 shrink-0 mt-0.5 animate-spin-reverse" />
              <p className="text-[11px] leading-relaxed">
                <strong>Dica do Coach:</strong> Ajuste o seu FTP ou sua Frequência Cardíaca Máxima sempre que fizer novos testes de limiar. A inteligência artificial usará esses novos dados no próximo treino gerado para recalcular as faixas das zonas de esforço !
              </p>
            </div>
          </motion.div>
        )}

        {/* ACCESS & ACCOUNT TAB */}
        {activeTab === "account" && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400">Nome do Atleta</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 focus:border-slate-300 focus:bg-white rounded-xl pl-10 pr-4 py-3 text-xs outline-hidden focus:ring-1 focus:ring-slate-350 transition-all font-sans text-slate-800"
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400">E-mail de Login</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 focus:border-slate-300 focus:bg-white rounded-xl pl-10 pr-4 py-3 text-xs outline-hidden focus:ring-1 focus:ring-slate-350 transition-all font-mono text-slate-800"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-sans block leading-normal leading-relaxed">
                Atenção: Ao alterar o seu e-mail, seu ID de login sofrerá alteração e os dados serão migrados automaticamente.
              </span>
            </div>

            {/* Security Section (Required current password) */}
            <div className="border-t border-slate-100 my-4 pt-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Key className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading">Segurança e Senha</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400">
                    Nova Senha <span className="text-[10px] text-slate-400 lowercase font-normal">(opcional)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Mínimo 6 dígitos"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 focus:border-slate-300 focus:bg-white rounded-xl pl-10 pr-10 py-3 text-xs outline-hidden focus:ring-1 focus:ring-slate-355 transition-all font-mono text-slate-800"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-slate-450 hover:text-slate-650 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Current Password */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-455 flex items-center gap-1">
                    Senha Atual <span className="text-rose-500 font-extrabold">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Confirme senha atual para validar"
                      value={currentPasswordConfirm}
                      onChange={(e) => setCurrentPasswordConfirm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 focus:border-slate-300 focus:bg-white rounded-xl pl-10 pr-10 py-3 text-xs outline-hidden focus:ring-1 focus:ring-slate-355 transition-all font-mono text-slate-800"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-3 text-slate-450 hover:text-slate-650 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUBSCRIPTION TAB */}
        {activeTab === "subscription" && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-lime-400 uppercase font-bold tracking-wider font-mono">Assinatura Ativa</span>
                <h4 className="text-lg font-black font-heading leading-tight">
                  Plano {currentUser.profile.subscriptionPlan || "Plano Pro"}
                </h4>
                <p className="text-xs text-slate-400 font-sans">
                  {currentUser.profile.subscriptionExpiresAt ? (
                    <>Válido até: <strong>{new Date(currentUser.profile.subscriptionExpiresAt + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></>
                  ) : (
                    "Acesso vitalício ou por tempo indeterminado"
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <div className="w-2 h-2 rounded-full bg-lime-400 animate-ping"></div>
                <span className="text-xs font-bold text-lime-400 font-mono uppercase tracking-wide">Status: Ativo</span>
              </div>
            </div>

            {/* Benefits detail */}
            <div className="space-y-2.5">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading">Sua conta inclui:</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5">
                  <div className="p-1 px-2 bg-lime-100 text-lime-800 rounded-lg text-[10px] font-black">AI</div>
                  <div>
                    <strong className="text-xs text-slate-800 block">Treinador Virtual Ilimitado</strong>
                    <span className="text-[10.5px] text-slate-405 block font-sans">Interações e dicas fisiológicas 24/7 com ajustes dinâmicos</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5">
                  <div className="p-1 px-2 bg-sky-100 text-sky-850 rounded-lg text-[10px] font-black">PDF</div>
                  <div>
                    <strong className="text-xs text-slate-800 block">Planilhas Estruturadas</strong>
                    <span className="text-[10.5px] text-slate-405 block font-sans">Exportação perfeita de treinos organizados por FTP e batimentos</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5">
                  <div className="p-1 px-2 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-black">GRF</div>
                  <div>
                    <strong className="text-xs text-slate-800 block">Gráficos de Desempenho</strong>
                    <span className="text-[10.5px] text-slate-405 block font-sans">Métricas evolutivas de volume de giros e queima calórica</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5">
                  <div className="p-1 px-2 bg-emerald-100 text-emerald-850 rounded-lg text-[10px] font-black">STB</div>
                  <div>
                    <strong className="text-xs text-slate-800 block">Sincronização offline</strong>
                    <span className="text-[10.5px] text-slate-405 block font-sans">Seus treinos salvos em segurança no browser e servidor</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Support footer info */}
            <div className="bg-amber-50 border border-amber-150 p-3 rounded-2xl text-amber-900 text-xs">
              Para alterações de faturamento, faturas fiscais, cancelamento ou alteração voluntária de plano, mande uma mensagem de suporte direta ao seu Coach Pedro no WhatsApp cadastrado.
            </div>
          </motion.div>
        )}

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-100 flex gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl py-3.5 text-xs font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="flex-1 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-lime-400 rounded-xl py-3.5 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99]"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
