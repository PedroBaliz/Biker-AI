import React, { useState, useEffect } from "react";
import { UserProfile, ZoneInfo } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Search, 
  Filter, 
  RotateCcw, 
  ShieldAlert, 
  CheckCircle, 
  Hourglass, 
  Calendar, 
  Zap, 
  Heart, 
  Tag, 
  Save, 
  Sliders, 
  RefreshCw, 
  FileText, 
  ArrowLeft, 
  MessageSquare,
  DollarSign,
  TrendingUp,
  Brain,
  Sparkles,
  ClipboardList,
  Database,
  Trash2,
  UploadCloud
} from "lucide-react";

interface AdminUser {
  email: string;
  profile: UserProfile;
  chatHistoryCount: number;
  hasPlan: boolean;
  planSummary: string;
}

interface AdminSubscribersPanelProps {
  currentUserEmail: string;
  onClose: () => void;
  onRefreshCurrentProfile: (updatedProfile: UserProfile) => void;
}

export default function AdminSubscribersPanel({ currentUserEmail, onClose, onRefreshCurrentProfile }: AdminSubscribersPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Selection
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Backups tab and management state
  const [rightTab, setRightTab] = useState<"athlete" | "backups">("athlete");
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [mainDbInfo, setMainDbInfo] = useState<any>(null);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // Fetch automatic backups from server
  const fetchBackups = async () => {
    setBackupsLoading(true);
    try {
      const response = await fetch("/api/admin/backups");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBackupsList(data.backups || []);
          setMainDbInfo(data.mainDatabase || null);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar backups:", err);
    } finally {
      setBackupsLoading(false);
    }
  };

  // Trigger manual creation of a backup
  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    setSuccess("");
    setError("");
    try {
      const response = await fetch("/api/admin/backups/create", { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess("Backup manual instantâneo criado com sucesso!");
          fetchBackups();
          setTimeout(() => setSuccess(""), 5000);
        } else {
          setError(data.error || "Falha ao criar o backup manual.");
        }
      }
    } catch (err: any) {
      setError("Erro ao se conectar com o servidor para gerar backup.");
    } finally {
      setCreatingBackup(false);
    }
  };

  // Restore database of a specific backup
  const handleRestoreBackup = async (filename: string) => {
    const confirmRestore = window.confirm(
      `Deseja realmente restaurar o banco de dados para a versão de ${filename}?\n\nIsso substituirá todos os dados atuais de atletas, planilhas e chat! Para sua segurança, criaremos um backup automático do estado atual antes do restauro.`
    );
    if (!confirmRestore) return;

    setRestoringBackup(filename);
    setSuccess("");
    setError("");
    try {
      const response = await fetch("/api/admin/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess("Banco de dados restaurado com sucesso! Atualizando atletas...");
          loadSubscribers(); // Recarrega a tabela de atletas com o novo estado restaurado
          fetchBackups();
          setTimeout(() => setSuccess(""), 5000);
        } else {
          setError(data.error || "Falha ao restaurar banco a partir deste backup.");
        }
      }
    } catch (err) {
      setError("Erro de conexão ao restaurar backup.");
    } finally {
      setRestoringBackup(null);
    }
  };

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  // Edit fields for selected athlete
  const [editStatus, setEditStatus] = useState<'active' | 'expired' | 'pending_payment'>('active');
  const [editPlan, setEditPlan] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editRole, setEditRole] = useState<'athlete' | 'coach'>('athlete');
  const [editFtp, setEditFtp] = useState<number | "">("");
  const [editMaxHr, setEditMaxHr] = useState<number | "">("");

  // Load subscribers list
  const loadSubscribers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.users) {
          setUsers(data.users);
          
          // Sync selected user details if currently selected
          if (selectedUser) {
            const updatedSelected = data.users.find((u: AdminUser) => u.email === selectedUser.email);
            if (updatedSelected) {
              setSelectedUser(updatedSelected);
            }
          }
        } else {
          setError("Falha ao recuperar a lista de assinantes.");
        }
      } else {
        setError(`Erro do servidor ao sincronizar: Código ${response.status}`);
      }
    } catch (err) {
      console.error(err);
      setError("Erro de rede ao conectar com o banco de assinantes. Verifique a internet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscribers();
  }, []);

  // Set edit form values when selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      setEditStatus(selectedUser.profile.subscriptionStatus || 'active');
      setEditPlan(selectedUser.profile.subscriptionPlan || 'Bronze (Mensal)');
      setEditExpiresAt(selectedUser.profile.subscriptionExpiresAt || '2026-12-31');
      setEditRole(selectedUser.profile.role || 'athlete');
      setEditFtp(selectedUser.profile.ftp ?? "");
      setEditMaxHr(selectedUser.profile.maxHeartRate ?? "");
    }
  }, [selectedUser]);

  // Handle subscriber save
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/update-user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedUser.email,
          subscriptionStatus: editStatus,
          subscriptionPlan: editPlan,
          subscriptionExpiresAt: editExpiresAt,
          role: editRole,
          ftp: editFtp !== "" ? Number(editFtp) : null,
          maxHeartRate: editMaxHr !== "" ? Number(editMaxHr) : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess(`Dados e plano de assinatura do atleta atualizados com sucesso!`);
          
          // If editing himself, refresh the main view's profile state
          if (selectedUser.email.toLowerCase() === currentUserEmail.toLowerCase()) {
            onRefreshCurrentProfile(data.user.profile);
          }

          // Reload subscribers list from server
          await loadSubscribers();
        } else {
          setError("O servidor rejeitou as atualizações.");
        }
      } else {
        setError("Erro do servidor ao salvar alterações.");
      }
    } catch (err) {
      setError("Erro de rede ao salvar atualizações de assinatura.");
    }
  };

  // Quick action: Toggle expired / active for testing
  const handleQuickToggleStatus = async (user: AdminUser, newStat: 'active' | 'expired') => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/update-user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          subscriptionStatus: newStat
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess(`Status de ${user.profile.name} alterado rápido para ${newStat === 'active' ? '🚨 Ativo' : '🔒 Expirado'}`);
          if (user.email.toLowerCase() === currentUserEmail.toLowerCase()) {
            onRefreshCurrentProfile(data.user.profile);
          }
          await loadSubscribers();
        }
      }
    } catch (err) {
      setError("Falha ao salvar alteração rápida de status.");
    }
  };

  // Metrics calculations
  const totalUsers = users.length;
  const activeCount = users.filter(u => u.profile.subscriptionStatus === 'active').length;
  const pendingCount = users.filter(u => u.profile.subscriptionStatus === 'pending_payment').length;
  const expiredCount = users.filter(u => u.profile.subscriptionStatus === 'expired').length;
  const avgFtp = (users.filter(u => u.profile.ftp).reduce((sum, u) => sum + (u.profile.ftp || 0), 0) / (users.filter(u => u.profile.ftp).length || 1)).toFixed(0);

  // Estimativa de faturamento de MVP (Bronze R$ 29,90/mês, Prata R$ 24,90/mês equ., Ouro R$ 16,58/mês equ.)
  const estimatedRevenue = users.reduce((sum, u) => {
    if (u.profile.subscriptionStatus !== 'active') return sum;
    const plan = (u.profile.subscriptionPlan || "").toLowerCase();
    if (plan.includes("ouro") || plan.includes("anual")) return sum + 16.58; // mensalizado
    if (plan.includes("prata") || plan.includes("trimestral")) return sum + 24.9;
    return sum + 29.9; // Bronze
  }, 0).toFixed(2);

  // Filter users list
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.profile.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || (user.profile.subscriptionStatus || "active") === statusFilter;
    const matchesPlan = planFilter === "all" || (user.profile.subscriptionPlan || "Bronze (Mensal)") === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-7xl mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 py-4"
    >
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-lime-400 rounded-2xl text-slate-950 shadow-md">
            <Users className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-black text-lg tracking-tight">Painel Administrativo Biker AI</h2>
              <span className="bg-lime-400/20 text-lime-400 text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-lime-400/30">Coach & Assinantes</span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">Gerenciador de faturamento, controle de acessos, status de mensalidade e fisiologia esportiva</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadSubscribers}
            className="flex items-center justify-center p-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-750"
            title="Recarregar banco"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-lime-400" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-lime-400 text-slate-950 hover:bg-lime-350 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao App</span>
          </button>
        </div>
      </div>

      {/* METRICS DASHBOARD ROW - BENTO GRID STYLE */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Registros */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-650 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Atletas Cadastrados</span>
            <span className="text-xl font-bold font-heading text-slate-800">{totalUsers}</span>
          </div>
        </div>

        {/* Ativos */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500 text-white rounded-xl shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Assinantes Ativos</span>
            <span className="text-xl font-bold font-heading text-emerald-800">{activeCount}</span>
          </div>
        </div>

        {/* Pendentes */}
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0">
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pendentes/Atraso</span>
            <span className="text-xl font-bold font-heading text-amber-800">{pendingCount}</span>
          </div>
        </div>

        {/* Expirados */}
        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-rose-500 text-white rounded-xl shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-rose-600 uppercase tracking-wider">Inativos/Bloqueados</span>
            <span className="text-xl font-bold font-heading text-rose-800">{expiredCount}</span>
          </div>
        </div>

        {/* Estimativa Faturamento */}
        <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-4 shadow-xs col-span-2 lg:col-span-1 flex items-center gap-3">
          <div className="p-2.5 bg-sky-500 text-white rounded-xl shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-sky-600 uppercase tracking-wider">Receita Mensal Est.</span>
            <span className="text-xl font-bold font-heading text-sky-850">R$ {estimatedRevenue}/mês</span>
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex gap-2.5 items-start shadow-sm"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs rounded-xl flex gap-2.5 items-start shadow-sm animate-bounce"
          >
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: LIST AND FILTER (8/12 width) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-150 focus:border-slate-350 focus:bg-white rounded-xl pl-10 pr-4 py-3 text-xs outline-hidden focus:ring-1 focus:ring-slate-350 transition-all font-sans text-slate-800"
              />
            </div>
            {/* Filter Status */}
            <div className="relative w-full sm:w-40 shrink-0">
              <Filter className="absolute left-3 top-3.5 w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-150 focus:border-slate-350 focus:bg-white rounded-xl pl-9 pr-3 py-3 text-xs outline-hidden transition-all text-slate-700 font-bold"
              >
                <option value="all">Filtro: Todos</option>
                <option value="active">✓ Ativos</option>
                <option value="pending_payment">⏳ Atrasados</option>
                <option value="expired">🔒 Expirados</option>
              </select>
            </div>
          </div>

          {/* TABLE OF USERS */}
          <div className="overflow-hidden border border-slate-100 rounded-2xl">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-lime-500" />
                <p className="text-xs text-slate-400 font-sans">Carregando banco de usuários...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">Nenhum atleta corresponde aos filtros.</p>
                <p className="text-xs text-slate-450 font-sans">Remova parte dos termos de pesquisa ou troque o filtro ativo.</p>
                {searchTerm || statusFilter !== "all" ? (
                  <button
                    onClick={() => { setSearchTerm(""); setStatusFilter("all"); setPlanFilter("all"); }}
                    className="mt-2 text-xs text-lime-600 hover:text-lime-700 font-bold underline cursor-pointer"
                  >
                    Excluir Filtros ativação
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {filteredUsers.map((user) => {
                  const subStatus = user.profile.subscriptionStatus || 'active';
                  const isCurSelected = selectedUser?.email === user.email;
                  return (
                    <div 
                      key={user.email}
                      className={`p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                        isCurSelected 
                          ? "bg-slate-50 border-l-4 border-slate-900" 
                          : "hover:bg-slate-50/50"
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-extrabold text-sm text-slate-800">{user.profile.name}</h4>
                          {user.profile.role === "coach" && (
                            <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border border-amber-250">
                              Coach
                            </span>
                          )}
                          {user.email.toLowerCase() === currentUserEmail.toLowerCase() && (
                            <span className="bg-sky-100 text-sky-800 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border border-sky-250">
                              Você
                            </span>
                          )}
                        </div>
                        <span className="block text-[11px] font-mono text-slate-400 break-all">{user.email}</span>
                        <div className="flex gap-2.5 items-center flex-wrap pt-0.5">
                          <span className="text-[10px] text-slate-500 font-sans flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {user.profile.subscriptionPlan || "Bronze (Mensal)"}
                          </span>
                          <span className="text-slate-200">|</span>
                          <span className="text-[10px] text-slate-500 font-sans flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-500" />
                            {user.profile.ftp ? `${user.profile.ftp}W` : "Sem FTP"}
                          </span>
                          <span className="text-slate-200">|</span>
                          <span className="text-[10px] text-slate-500 font-sans flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-sky-500" />
                            {user.chatHistoryCount} interações
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {/* Static Badge Status */}
                        {subStatus === 'active' && (
                          <span className="bg-emerald-100 border border-emerald-250 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                            <span>Ativo</span>
                          </span>
                        )}
                        {subStatus === 'pending_payment' && (
                          <span className="bg-amber-100 border border-amber-250 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <span>Pendente</span>
                          </span>
                        )}
                        {subStatus === 'expired' && (
                          <span className="bg-rose-100 border border-rose-250 text-rose-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                            <span>Expirado</span>
                          </span>
                        )}

                        {/* Direct testing Switch status triggers */}
                        <div className="flex flex-col gap-1">
                          {subStatus === 'active' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickToggleStatus(user, 'expired');
                              }}
                              className="text-[9px] font-black text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded px-1.5 py-0.5 cursor-pointer transition-all"
                              title="Clique para suspender o acesso imediatamente para testar tela de bloqueio"
                            >
                              Bloquear
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickToggleStatus(user, 'active');
                              }}
                              className="text-[9px] font-black text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded px-1.5 py-0.5 cursor-pointer transition-all"
                              title="Clique para liberar acesso imediato"
                            >
                              Ativar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTION DETAILS FORM (5/12 width) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Sub-tab selection system */}
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-2 flex items-center justify-between shadow-md">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-450 pl-2.5">Painel Geral:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setRightTab("athlete")}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  rightTab === "athlete"
                    ? "bg-lime-400 text-slate-950 shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                Ajustes
              </button>
              <button
                type="button"
                onClick={() => {
                  setRightTab("backups");
                  fetchBackups();
                }}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  rightTab === "backups"
                    ? "bg-amber-450 text-slate-950 shadow-xs"
                    : "text-amber-400 hover:text-amber-300 hover:bg-slate-800"
                }`}
              >
                <Database className="w-3 h-3" />
                <span>Backups</span>
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {selectedUser && rightTab === "athlete" ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5"
              >
                {/* Header detail */}
                <div className="pb-3 border-b border-slate-100 flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-heading font-extrabold text-slate-800 text-sm leading-tight">Configurações para:</h3>
                    <p className="font-heading font-black text-slate-900 text-base mt-1">{selectedUser.profile.name}</p>
                    <span className="text-[10.5px] font-mono text-slate-400 block break-all leading-none mt-0.5">{selectedUser.email}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 font-extrabold cursor-pointer border border-slate-150 px-2.5 py-1 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Fechar
                  </button>
                </div>

                <form onSubmit={handleSaveUser} className="space-y-4">
                  {/* 1. Subscription Status */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Estado de Cobrança / Assinatura</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditStatus('active')}
                        className={`py-2 px-1 text-center font-bold text-xs rounded-xl cursor-pointer border transition-all ${
                          editStatus === 'active'
                            ? "bg-emerald-500 border-emerald-400 text-white shadow-xs"
                            : "bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        Ativo
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStatus('pending_payment')}
                        className={`py-2 px-1 text-center font-bold text-xs rounded-xl cursor-pointer border transition-all ${
                          editStatus === 'pending_payment'
                            ? "bg-amber-500 border-amber-400 text-white shadow-xs"
                            : "bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        Pendente
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStatus('expired')}
                        className={`py-2 px-1 text-center font-bold text-xs rounded-xl cursor-pointer border transition-all ${
                          editStatus === 'expired'
                            ? "bg-rose-500 border-rose-450 text-white shadow-xs"
                            : "bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        Expirado
                      </button>
                    </div>
                  </div>

                  {/* 2. Choose Plan & Role */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Plano Ativo</label>
                      <select
                        value={editPlan}
                        onChange={(e) => setEditPlan(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-150 focus:border-slate-300 rounded-xl px-2.5 py-2.5 text-xs outline-hidden text-slate-700 font-bold"
                      >
                        <option value="Bronze (Mensal)">Bronze (Mensal)</option>
                        <option value="Prata (Trimestral)">Prata (Trimestral)</option>
                        <option value="Ouro (Anual)">Ouro (Anual)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Função / Função</label>
                      <select
                        value={editRole}
                        onChange={(e: any) => setEditRole(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-150 focus:border-slate-300 rounded-xl px-2.5 py-2.5 text-xs outline-hidden text-slate-700 font-bold"
                      >
                        <option value="athlete">Atleta Tradicional</option>
                        <option value="coach">Treinador Principal (Admin)</option>
                      </select>
                    </div>
                  </div>

                  {/* 3. Event Expires */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">Próximo Vencimento da Mensalidade</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-450" />
                      <input
                        type="date"
                        value={editExpiresAt}
                        onChange={(e) => setEditExpiresAt(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-150 focus:border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-hidden text-slate-700"
                      />
                    </div>
                  </div>

                  {/* 4. Overrides biometrics (FTP and Max HR override) */}
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">FTP (Watts)</label>
                      <div className="relative">
                        <Zap className="absolute left-2.5 top-3 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="number"
                          placeholder="Ex: 220"
                          value={editFtp}
                          onChange={(e) => setEditFtp(e.target.value ? Number(e.target.value) : "")}
                          className="w-full bg-slate-50 border border-slate-150 focus:border-slate-300 rounded-xl pl-8 pr-2.5 py-2.5 text-xs outline-hidden text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450">FCmáx (bpm)</label>
                      <div className="relative">
                        <Heart className="absolute left-2.5 top-3 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="number"
                          placeholder="Ex: 185"
                          value={editMaxHr}
                          onChange={(e) => setEditMaxHr(e.target.value ? Number(e.target.value) : "")}
                          className="w-full bg-slate-50 border border-slate-150 focus:border-slate-300 rounded-xl pl-8 pr-2.5 py-2.5 text-xs outline-hidden text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-lime-400 rounded-xl py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-md"
                    >
                      <Save className="w-4 h-4" />
                      <span>Salvar Ajustes do Aluno</span>
                    </button>
                  </div>
                </form>

                {/* Athlete physiological data sheet */}
                <div className="border-t border-slate-100 pt-3.5 space-y-2.5 bg-slate-50/50 -mx-6 -mb-6 p-6 rounded-b-3xl">
                  <div className="flex items-center gap-1.5 mb-1 text-slate-700">
                    <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                    <h4 className="text-[10px] uppercase font-extrabold tracking-wider font-heading text-slate-650">Ficha Técnica Fisiológica</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sans text-xs">
                    <div>
                      <span className="text-slate-450 block text-[9.5px] uppercase font-bold leading-normal">Objetivo principal</span>
                      <span className="text-slate-800 font-semibold">{selectedUser.profile.goal || "Não configurado"}</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9.5px] uppercase font-bold leading-normal">Nível de giro</span>
                      <span className="text-slate-800 font-semibold capitalize">{selectedUser.profile.level || "Iniciante"}</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9.5px] uppercase font-bold leading-normal">Frequência Semanal</span>
                      <span className="text-slate-800 font-semibold">
                        {selectedUser.profile.daysPerWeek ? `${selectedUser.profile.daysPerWeek} dias/semana` : "Não definido"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-450 block text-[9.5px] uppercase font-bold leading-normal">Duração Média</span>
                      <span className="text-slate-800 font-semibold">
                        {selectedUser.profile.durationPerSession ? `${selectedUser.profile.durationPerSession} min/giro` : "Não definido"}
                      </span>
                    </div>
                  </div>
                  {/* Limitations or physical observations */}
                  <div className="pt-2">
                    <span className="text-slate-450 block text-[9.5px] uppercase font-bold leading-normal flex items-center gap-1">
                      <span>Prontuário de dores & limitações</span>
                    </span>
                    <p className="text-[11px]  leading-relaxed text-slate-600 bg-white border border-slate-150 rounded-xl p-2.5 mt-1 font-sans italic">
                      {selectedUser.profile.limitations || "Aluno livre de dores agudas ou limitações físicas limitantes listadas."}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : rightTab === "athlete" ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400 space-y-3 py-16">
                <Brain className="w-10 h-10 text-slate-350 mx-auto animate-pulse" />
                <h4 className="font-heading font-extrabold text-sm text-slate-700">Selecione um Atleta</h4>
                <p className="text-xs text-slate-450 leading-relaxed max-w-xs mx-auto font-sans">
                  Clique sobre qualquer inscrito da lista à esquerda para revisar sua ficha fisiológica completa, gerenciar sua mensalidade ou alternar seu perfil de faturamento.
                </p>
              </div>
            ) : (
              /* THE MASTER BACKUPS PANEL UI CONTAINER */
              <motion.div 
                key="backups-management"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5"
              >
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="font-heading font-extrabold text-slate-800 text-sm leading-tight flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span>Gerenciador de Backups Físicos</span>
                  </h3>
                  <p className="text-[10.5px] text-slate-450 mt-1 leading-normal">
                    O CycleCoach AI realiza cópias rotativas no servidor local a cada modificação do banco para proteção integral contra perda acidental.
                  </p>
                </div>

                {/* Server DB Info Box */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2.5 text-xs text-slate-650">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-500">Banco de Dados Ativo:</span>
                    <span className="font-mono text-[10px] text-slate-805 font-bold bg-white px-2 py-0.5 rounded border border-slate-150">users_db.json</span>
                  </div>
                  {mainDbInfo && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-500">Tamanho em Disco:</span>
                        <span className="font-mono text-slate-800">{(mainDbInfo.sizeBytes / 1024).toFixed(2)} KB</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-500">Última Modificação:</span>
                        <span className="font-sans text-[11px] text-slate-800 font-bold">
                          {new Date(mainDbInfo.lastModified).toLocaleDateString("pt-BR")} às {new Date(mainDbInfo.lastModified).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={creatingBackup}
                      onClick={handleCreateBackup}
                      className="w-full bg-slate-900 border border-slate-850 hover:bg-slate-800 disabled:opacity-50 text-amber-400 font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                    >
                      {creatingBackup ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          <span>Armazenando estado...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Gerar Backup Manual Instantâneo</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* History of rotating automated backups */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9.5px] uppercase font-black tracking-wider text-slate-450">Cópias Automáticas Rotativas ({backupsList.length})</span>
                    <button
                      type="button"
                      onClick={fetchBackups}
                      className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xs flex items-center gap-0.5 font-bold"
                      title="Recarregar histórico"
                    >
                      <RefreshCw className={`w-3 h-3 ${backupsLoading ? "animate-spin" : ""}`} />
                      <span>Sincronizar</span>
                    </button>
                  </div>

                  {backupsLoading && backupsList.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-350" />
                      <span>Sincronizando logs de proteção...</span>
                    </div>
                  ) : backupsList.length === 0 ? (
                    <div className="p-6 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                      <span>Nenhum backup rotativo encontrado no servidor.</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {backupsList.map((bk) => (
                        <div
                          key={bk.filename}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-150 hover:bg-slate-50/50 transition-colors gap-3 bg-slate-50/30"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[10.5px] font-mono font-bold text-slate-700 block truncate" title={bk.filename}>
                              {bk.filename}
                            </span>
                            <span className="text-[9.5px] text-slate-400 font-sans block">
                              {new Date(bk.createdAt).toLocaleDateString("pt-BR")} - {new Date(bk.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })} ({(bk.sizeBytes / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={!!restoringBackup}
                            onClick={() => handleRestoreBackup(bk.filename)}
                            className={`px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer border shrink-0 ${
                              restoringBackup === bk.filename
                                ? "bg-slate-200 border-slate-300 text-slate-500 animate-pulse"
                                : "bg-slate-900 border-slate-850 hover:bg-slate-850 text-white hover:text-amber-400 shadow-xs"
                            }`}
                          >
                            {restoringBackup === bk.filename ? "Restaurando" : "Restaurar"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Safety Advice info footer */}
                <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-3 text-[10px] leading-relaxed text-slate-650 space-y-1">
                  <p className="font-extrabold text-amber-800 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 animate-bounce" />
                    <span>Estabilidade de Alta Performance</span>
                  </p>
                  <p>Qualquer ação do treinador (salvar atleta, alterar status) ou ativações de alunos disparam backups silenciosos imediatos de segurança.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
