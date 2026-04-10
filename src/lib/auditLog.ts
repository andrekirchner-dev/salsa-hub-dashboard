/**
 * auditLog.ts — registro imutável de ações administrativas.
 *
 * Escreve em /auditLogs/{id} no Firestore. A coleção deve ter regra de apenas
 * escrita (create only) para usuários autenticados, e leitura somente para
 * app owners. Isso garante que nenhum log possa ser alterado ou deletado pelo
 * próprio usuário que o gerou.
 *
 * Campos gravados:
 *   - action:    identificador da ação (ex: "user.deactivate", "code.delete")
 *   - actorUid:  UID do usuário que executou a ação
 *   - actorEmail: email do usuário que executou
 *   - targetId:  ID do documento/usuário afetado (quando aplicável)
 *   - details:   objeto livre com contexto adicional
 *   - timestamp: serverTimestamp() do Firestore
 *   - userAgent: navigator.userAgent (rastreio de cliente)
 */

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";

export type AuditAction =
  | "user.deactivate"
  | "user.approve"
  | "user.reject"
  | "user.role_change"
  | "code.create"
  | "code.delete"
  | "code.toggle"
  | "code.use"
  | "company.create"
  | "company.update"
  | "invite.send"
  | "product.link"
  | "admin.unlock";

export async function writeAuditLog(
  action: AuditAction,
  targetId: string | null,
  details: Record<string, any> = {}
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return; // não grava sem usuário autenticado

  try {
    await addDoc(collection(db, "auditLogs"), {
      action,
      actorUid: user.uid,
      actorEmail: user.email ?? "",
      actorName: user.displayName ?? "",
      targetId: targetId ?? null,
      details,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // Falha silenciosa — o log nunca deve interromper a ação principal
    console.warn("[auditLog] Falha ao registrar:", action, err);
  }
}
