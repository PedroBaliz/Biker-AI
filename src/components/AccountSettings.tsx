import React, { useState } from "react";
import { UserAccount } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { User, Mail, Lock, Eye, EyeOff, Save, Undo, Key, AlertTriangle, CheckCircle, Shield } from "lucide-react";

interface AccountSettingsProps {
  currentUser: UserAccount;
  onUpdateAccount: (updatedUser: UserAccount, newPassword?: string) => boolean;
  onClose: () => void;
}

export default function AccountSettings({ currentUser, onUpdateAccount, onClose }: AccountSettingsProps) {
  const [name, setName] = useState(currentUser.profile.name);
  const [email, setEmail] = useState(currentUser.email);
  const [currentPasswordConfirm, setCurrentPasswordConfirm] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
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

    // Required to confirm changes: must input current password to modify email/password
    if (!currentPasswordConfirm) {
      setError("Para salvar alterações na sua conta, informe a sua senha atual de validação.");
      return;
    }

    // Fetch master list of users to verify password and email uniqueness
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

    // Prepare updated data structures
    const updatedUser: UserAccount = {
      ...currentUser,
      email: email.trim(),
      profile: {
        ...currentUser.profile,
        name: name.trim()
      }
    };

    const finalPassword = newPassword.trim() ? newPassword : currentPasswordConfirm;
    if (newPassword.trim() && newPassword.length < 6) {
      setError("A nova senha precisa conter no mínimo 6 caracteres por segurança.");
      return;
    }

    // Execute save through parent coordinate handler
    const ok = onUpdateAccount(updatedUser, finalPassword);
    if (ok) {
      setSuccess("Informações de acesso salvas com sucesso no banco de dados local!");
      setCurrentPasswordConfirm("");
      setNewPassword("");
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setError("Erro interno ao migrar os registros de login.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-xl mx-auto w-full bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-2xl text-lime-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-base text-slate-800">Minhas Configurações de Login</h3>
            <p className="text-xs text-slate-400 font-sans">Edite seu e-mail, senha e nome de atleta</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 text-xs font-semibold transition-all cursor-pointer"
        >
          <Undo className="w-3.5 h-3.5" />
          <span>Voltar</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
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
            className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex gap-2.5 items-start animate-bounce"
          >
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSave} className="space-y-4">
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

        <div className="border-t border-slate-100 my-4 pt-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
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
                  className="w-full bg-slate-50 border border-slate-150 focus:border-slate-300 focus:bg-white rounded-xl pl-10 pr-10 py-3 text-xs outline-hidden focus:ring-1 focus:ring-slate-350 transition-all font-mono text-slate-800"
                />
                <button 
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-slate-450 hover:text-slate-650"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Current Password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-450 flex items-center gap-1">
                Senha Atual <span className="text-rose-500 font-extrabold">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input 
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Confirme senha atual"
                  value={currentPasswordConfirm}
                  onChange={(e) => setCurrentPasswordConfirm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 focus:border-slate-300 focus:bg-white rounded-xl pl-10 pr-10 py-3 text-xs outline-hidden focus:ring-1 focus:ring-slate-350 transition-all font-mono text-slate-800"
                />
                <button 
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3 text-slate-450 hover:text-slate-650"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="flex-1 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-lime-400 rounded-xl py-3 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
