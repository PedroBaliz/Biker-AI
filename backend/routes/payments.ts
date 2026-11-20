// Mercado Pago: configuração pública, assinatura, checkout, Pix e webhook.
import type { Express } from "express";
import crypto from "crypto";
import { requireAdmin, requireAuth, verifyUserMatch } from "../auth";
import { SUBSCRIPTION_PRICE_BRL } from "../config";
import { getDatabaseForUpdate, saveDatabase } from "../db";
import { findUserInDb, normalizeEmail, sendServerError } from "../util";

export function getPublicApiUrl(req: any): string {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = (forwardedHost || req.get("host") || "localhost:3000").toString().split(",")[0].trim();
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = (forwardedProto || (req.secure ? "https" : "http")).toString().split(",")[0].trim();
  return `${protocol}://${host}`;
}

export function isValidMercadoPagoSignature(req: any): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const signature = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  const dataId = (req.query?.["data.id"] || req.body?.data?.id || req.body?.id || "").toString().toLowerCase();
  if (typeof signature !== "string" || typeof requestId !== "string" || !dataId) return false;

  const parts = signature.split(",").reduce((result: Record<string, string>, part: string) => {
    const [key, value] = part.split("=", 2);
    if (key && value) result[key.trim()] = value.trim();
    return result;
  }, {});
  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const received = Buffer.from(parts.v1, "hex");
  const calculated = Buffer.from(expected, "hex");
  return received.length === calculated.length && crypto.timingSafeEqual(received, calculated);
}

export async function fetchMercadoPagoResource(resource: string): Promise<any> {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  const response = await fetch(`https://api.mercadopago.com${resource}`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Mercado Pago retornou ${response.status}: ${data?.message || "erro desconhecido"}`);
  return data;
}

export async function activateUserFromMercadoPago(email: string, paymentId: string, plan = "Plano Pro") {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Mercado Pago não retornou um e-mail de pagador válido.");
  const db = await getDatabaseForUpdate(normalizedEmail);
  const userFound = findUserInDb(db, normalizedEmail);
  if (!userFound) {
    console.warn("[Mercado Pago] Pagamento %s recebido para usuário inexistente.", paymentId);
    return false;
  }
  const user = userFound.user;
  if (user.profile?.mercadoPagoPaymentId === paymentId && user.profile?.subscriptionStatus === "active") return true;
  user.profile = {
    ...user.profile,
    subscriptionStatus: "active",
    subscriptionPlan: plan,
    subscriptionExpiresAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
    mercadoPagoPaymentId: paymentId,
    mercadoPagoUpdatedAt: new Date().toISOString()
  };
  await saveDatabase(db, userFound.key);
  return true;
}

export async function updateUserSubscriptionByEmail(email: string, status: "active" | "expired" | "pending_payment", subscriptionId: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  const db = await getDatabaseForUpdate(normalizedEmail);
  const userFound = findUserInDb(db, normalizedEmail);
  if (!userFound) return false;
  userFound.user.profile = {
    ...userFound.user.profile,
    subscriptionStatus: status,
    mercadoPagoSubscriptionId: subscriptionId,
    mercadoPagoUpdatedAt: new Date().toISOString()
  };
  await saveDatabase(db, userFound.key);
  return true;
}

export function registerPaymentRoutes(app: Express) {
  // Mercado Pago Endpoints padronizados com R$ 16,90
  app.get("/api/mercadopago/config", (req, res) => {
    res.json({
      success: true,
      isReal: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
      publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || null,
      planId: process.env.MERCADO_PAGO_PREAPPROVAL_PLAN_ID || null,
      recurring: true
    });
  });

  app.post("/api/admin/mercadopago/create-plan", requireAuth, requireAdmin, async (req, res) => {
    try {
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!accessToken) return res.status(503).json({ error: "Mercado Pago não está configurado neste ambiente." });

      const responseMP = await fetch("https://api.mercadopago.com/preapproval_plan", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reason: "Plano Mensal Biker AI",
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: SUBSCRIPTION_PRICE_BRL,
            currency_id: "BRL"
          },
          back_url: `${getPublicApiUrl(req)}/?status=subscription`
        })
      });
      const data = await responseMP.json();
      if (!responseMP.ok) return res.status(502).json({ error: data?.message || "Falha ao criar plano." });
      res.json({
        success: true,
        planId: data.id,
        message: "Salve este ID em MERCADO_PAGO_PREAPPROVAL_PLAN_ID."
      });
    } catch (error: any) {
      sendServerError(res, error);
    }
  });

  app.post("/api/mercadopago/create-subscription", requireAuth, verifyUserMatch, async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email || (req as any).user?.email);
      const cardTokenId = typeof req.body?.cardTokenId === "string" ? req.body.cardTokenId.trim() : "";
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      const planId = process.env.MERCADO_PAGO_PREAPPROVAL_PLAN_ID;
      if (!email) return res.status(400).json({ error: "E-mail válido é obrigatório." });
      if (!cardTokenId) return res.status(400).json({ error: "Token do cartão é obrigatório." });
      if (!accessToken) return res.status(503).json({ error: "Mercado Pago não está configurado neste ambiente." });
      if (!planId) return res.status(503).json({ error: "Plano do Mercado Pago não está configurado neste ambiente." });

      const responseMP = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `subscription-${email}-${Date.now()}`
        },
        body: JSON.stringify({
          preapproval_plan_id: planId,
          reason: "Assinatura Mensal Biker AI",
          external_reference: email,
          payer_email: email,
          card_token_id: cardTokenId,
          back_url: `${getPublicApiUrl(req)}/?status=subscription`,
          notification_url: `${getPublicApiUrl(req)}/api/mercadopago/webhook`,
          status: "authorized"
        })
      });
      const data = await responseMP.json();
      if (!responseMP.ok) return res.status(502).json({ error: data?.message || "Falha ao criar assinatura no Mercado Pago." });
      res.json({ success: true, subscriptionId: data.id, status: data.status });
    } catch (error: any) {
      sendServerError(res, error);
    }
  });

  app.post("/api/mercadopago/create-preference", requireAuth, verifyUserMatch, async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email || (req as any).user?.email);
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

      if (!accessToken) {
        return res.status(503).json({ error: "Mercado Pago não está configurado neste ambiente." });
      }

      const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: [{
            id: "premium-monthly",
            title: "Assinatura Mensal Premium - Biker AI",
            quantity: 1,
            unit_price: SUBSCRIPTION_PRICE_BRL,
            currency_id: "BRL"
          }],
          payer: { email },
          external_reference: email,
          notification_url: `${getPublicApiUrl(req)}/api/mercadopago/webhook`,
          back_urls: { success: `${getPublicApiUrl(req)}/?status=success` }
        })
      });

      const mpData = await mpResponse.json();
      if (!mpResponse.ok) return res.status(502).json({ error: mpData?.message || "Falha ao criar preferência." });
      res.json({ success: true, init_point: mpData.init_point, preferenceId: mpData.id });
    } catch (error: any) {
      sendServerError(res, error);
    }
  });

  app.post("/api/mercadopago/create-pix", requireAuth, verifyUserMatch, async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email || (req as any).user?.email);
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

      if (!accessToken) {
        return res.status(503).json({ error: "Mercado Pago não está configurado neste ambiente." });
      }

      const responseMP = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `pix-${email}-${Date.now()}`
        },
        body: JSON.stringify({
          transaction_amount: SUBSCRIPTION_PRICE_BRL,
          description: "Assinatura Biker AI Premium",
          payment_method_id: "pix",
          payer: { email }
        })
      });

      const mpData = await responseMP.json();
      if (!responseMP.ok) return res.status(502).json({ error: mpData?.message || "Falha ao criar cobrança Pix." });
      res.json({
        success: true,
        qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64
      });
    } catch (error: any) {
      sendServerError(res, error);
    }
  });

  app.post("/api/mercadopago/webhook", async (req, res) => {
    if (!isValidMercadoPagoSignature(req)) {
      return res.status(401).json({ error: "Assinatura do webhook inválida." });
    }

    try {
      const type = (req.body?.type || req.body?.topic || "").toString();
      const resourceId = (req.body?.data?.id || req.query?.id || req.query?.["data.id"] || "").toString();
      if (!resourceId) return res.sendStatus(200);

      if (type === "payment" || type === "payment.updated") {
        const payment = await fetchMercadoPagoResource(`/v1/payments/${encodeURIComponent(resourceId)}`);
        if (payment.status === "approved") {
          await activateUserFromMercadoPago(payment.external_reference || payment.payer?.email, resourceId);
        }
        return res.sendStatus(200);
      }

      if (type === "subscription_preapproval" || type === "subscription_preapproval.updated" || type === "preapproval") {
        const subscription = await fetchMercadoPagoResource(`/preapproval/${encodeURIComponent(resourceId)}`);
        const subscriptionStatus = subscription.status === "authorized"
          ? "active"
          : subscription.status === "pending"
          ? "pending_payment"
          : "expired";
        await updateUserSubscriptionByEmail(
          subscription.external_reference || subscription.payer_email,
          subscriptionStatus,
          resourceId
        );
      }
      return res.sendStatus(200);
    } catch (error: any) {
      console.error("[Mercado Pago] Falha ao processar webhook:", error.message);
      return res.status(500).json({ error: "Falha temporária ao processar webhook." });
    }
  });
}
