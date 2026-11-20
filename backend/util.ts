// Funções puras compartilhadas: normalização de e-mail, busca no banco, resposta de erro e token da requisição.

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  // Limite de tamanho (RFC 5321) antes de qualquer validação e sem regex com
  // quantificadores ambíguos, para evitar ReDoS.
  if (!normalized || normalized.length > 254 || /\s/.test(normalized)) return null;
  const at = normalized.indexOf("@");
  if (at <= 0 || at !== normalized.lastIndexOf("@")) return null;
  const domain = normalized.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  if (dot <= 0 || dot === domain.length - 1) return null;
  return normalized;
}

export function findUserInDb(db: Record<string, any>, email: string): { key: string; user: any } | null {
  if (!email || !db || typeof email !== "string") return null;
  const emailKey = normalizeEmail(email) || email.trim().toLowerCase();
  const cleanKey = emailKey.replace(/[^a-z0-9]/g, "_");
  // Nomes que dão acesso ao protótipo nunca são chave de usuário: quem chama altera o registro
  // devolvido (user.profile = ...), e isso não pode alcançar Object.prototype.
  if (emailKey === "__proto__" || emailKey === "constructor" || emailKey === "prototype") return null;
  if (cleanKey === "__proto__" || cleanKey === "constructor" || cleanKey === "prototype") return null;
  // Só chaves próprias do objeto.
  const own = (k: string) => Object.prototype.hasOwnProperty.call(db, k) && db[k];

  if (own(emailKey)) return { key: emailKey, user: db[emailKey] };
  if (own(cleanKey)) return { key: cleanKey, user: db[cleanKey] };

  const targetKey = Object.keys(db).find((k) => {
    const kLower = k.trim().toLowerCase();
    const kClean = kLower.replace(/[^a-z0-9]/g, "_");
    const userEmail = db[k]?.email?.trim()?.toLowerCase();
    return kLower === emailKey || kClean === cleanKey || userEmail === emailKey;
  });

  if (!targetKey || targetKey === "__proto__" || targetKey === "constructor" || targetKey === "prototype") return null;
  if (db[targetKey]) {
    return { key: targetKey, user: db[targetKey] };
  }
  return null;
}

/**
 * Resposta padrão para erro inesperado: a mensagem interna vai só para o log do servidor,
 * nunca para o cliente (pode conter detalhes de infraestrutura).
 */
export function sendServerError(res: any, error: unknown) {
  console.error("[API] Erro interno: %s", (error as any)?.message || error);
  return res.status(500).json({ error: "Erro interno no servidor. Tente novamente em instantes." });
}

export function getAuthToken(req: any): string | undefined {
  const authHeader = req?.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split("Bearer ")[1];
  }
  return undefined;
}
