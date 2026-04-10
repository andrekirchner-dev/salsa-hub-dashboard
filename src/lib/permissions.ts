/**
 * permissions.ts — fonte única de verdade para hierarquia de cargos e permissões.
 *
 * Em vez de arrays duplicados em cada página, todas as decisões de acesso passam
 * por este módulo. Se precisar ajustar a hierarquia, edite apenas aqui.
 *
 * Roadmap: substituir os objetos estáticos por uma leitura de /appConfig/roles
 * no Firestore para que admins possam alterar permissões sem redeploy.
 */

// ── Hierarquia de cargos ──────────────────────────────────────────────────────

export const ROLE_HIERARCHY = {
  /** C-Level: controle total da empresa */
  CLEVEL: ["CEO", "CFO", "CMO", "COO"],
  /** Gerência: pode gerenciar equipes e tarefas */
  MANAGEMENT: ["Gerente", "Coordenador"],
  /** Operacional: acesso básico */
  OPERATIONAL: ["Designer", "Analista", "Técnico", "Assistente", "Desenvolvedor", "Estagiário"],
} as const;

/** Todos os cargos disponíveis, em ordem de hierarquia */
export const ALL_ROLES: string[] = [
  ...ROLE_HIERARCHY.CLEVEL,
  ...ROLE_HIERARCHY.MANAGEMENT,
  ...ROLE_HIERARCHY.OPERATIONAL,
];

/** Cargos que podem ser atribuídos a membros de equipe (excl. C-Level) */
export const TEAM_MEMBER_ROLES: string[] = [
  ...ROLE_HIERARCHY.MANAGEMENT,
  ...ROLE_HIERARCHY.OPERATIONAL,
];

// ── Funções de verificação de permissão ──────────────────────────────────────

/** Cargo é C-Level (CEO, CFO, CMO, COO) */
export const isCLevel = (role: string): boolean =>
  ROLE_HIERARCHY.CLEVEL.includes(role as any);

/** Cargo é gerência (Gerente, Coordenador) */
export const isManagement = (role: string): boolean =>
  ROLE_HIERARCHY.MANAGEMENT.includes(role as any);

/** Pode criar reuniões e eventos no calendário */
export const canCreateMeeting = (role: string): boolean =>
  isCLevel(role) || isManagement(role);

/** Pode gerenciar membros de equipe (convidar, remover, trocar cargo) */
export const canManageTeam = (role: string): boolean =>
  isCLevel(role) || isManagement(role);

/** Controle total da equipe: criar equipes, gerar códigos de acesso */
export const canFullControl = (role: string): boolean =>
  isCLevel(role);

/** Pode atribuir tarefas a outros usuários */
export const canAssignTasks = (role: string): boolean =>
  isCLevel(role) || isManagement(role);

/** Pode gerar códigos de vínculo de produto */
export const canGenerateLinkCodes = (role: string): boolean =>
  isCLevel(role);

/** Pode gerar códigos de cargo (roleCodes) */
export const canGenerateRoleCodes = (role: string): boolean =>
  isCLevel(role) || isManagement(role);

// ── Utilitário de badge de cargo ──────────────────────────────────────────────

export const getRoleBadgeColor = (role: string): string => {
  if (isCLevel(role)) return "bg-primary/20 text-primary";
  if (isManagement(role)) return "bg-purple-500/20 text-purple-400";
  if (["Designer", "Desenvolvedor"].includes(role)) return "bg-blue-500/20 text-blue-400";
  return "bg-gray-500/20 text-gray-400";
};
