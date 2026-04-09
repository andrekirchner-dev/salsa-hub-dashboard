import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Info, Search, Mail, UserPlus, Loader2, Check, Key, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth, db } from "@/integrations/firebase/client";
import {
  collection, onSnapshot, addDoc, deleteDoc, setDoc, updateDoc,
  doc, query, orderBy, serverTimestamp, getDoc, getDocs,
} from "firebase/firestore";

function generateRoleCode(role: string): string {
  const prefix = role.slice(0, 3).toUpperCase();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${suffix}`;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CLEVEL = ["CEO", "CFO", "CMO", "COO"];
const MANAGEMENT = ["Gerente", "Coordenador"];
const TEAM_ROLES = ["Analista", "Técnico", "Assistente"];
const ALL_ROLES = [...CLEVEL, ...MANAGEMENT, ...TEAM_ROLES];

const canManageTeam = (role: string) => CLEVEL.includes(role) || MANAGEMENT.includes(role);
const canFullControl = (role: string) => CLEVEL.includes(role);

const getRoleColor = (role: string) => {
  if (CLEVEL.includes(role)) return "bg-primary/20 text-primary";
  if (MANAGEMENT.includes(role)) return "bg-purple-500/20 text-purple-400";
  return "bg-blue-500/20 text-blue-400";
};

// ── Interfaces ────────────────────────────────────────────────────────────────

interface TeamMember { id: string; name: string; email: string; role: string; uid?: string; }
interface TeamItem { id: string; name: string; company: string; ownerUid?: string; isSharedTeam?: boolean; teamFunction?: string; }
interface RegisteredUser { uid: string; name: string; email: string; role: string; }
interface PendingInvite { id: string; inviteeEmail: string; inviteeName: string; role: string; status: string; roleCode?: string; createdAt: any; }

const tabItems = [
  { value: "members", label: "Membros", emoji: "👥" },
  { value: "invites", label: "Convites", emoji: "✉️" },
  { value: "settings", label: "Config.", emoji: "⚙️" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Team() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid ?? "";
  const userEmail = auth.currentUser?.email ?? "";
  const userName = auth.currentUser?.displayName ?? "";

  const [userRole, setUserRole] = useState<string>("");
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);

  // Create team form
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamCompany, setNewTeamCompany] = useState("");
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteTab, setInviteTab] = useState<"registered" | "email">("registered");
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("Analista");
  const [inviting, setInviting] = useState(false);
  const [invitedUids, setInvitedUids] = useState<Set<string>>(new Set());

  // Settings editing
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamFunction, setEditTeamFunction] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Email invite generated code result
  const [emailInviteCode, setEmailInviteCode] = useState<string | null>(null);
  const [emailInviteCopied, setEmailInviteCopied] = useState(false);

  // CEO RoleCode generator
  const [codeGenOpen, setCodeGenOpen] = useState(false);
  const [codeGenRole, setCodeGenRole] = useState("Analista");
  const [codeGenMaxUses, setCodeGenMaxUses] = useState(1);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeSaving, setCodeSaving] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  // ── Load user role ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "profiles", uid)).then(snap => {
      setUserRole(snap.data()?.role ?? "");
    });
  }, [uid]);

  // ── Load teams ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "teams"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const t = snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamItem));
      setTeams(t);
      if (!selectedTeamId && t.length > 0) setSelectedTeamId(t[0].id);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  // ── Load members of selected team ─────────────────────────────────────────
  useEffect(() => {
    if (!uid || !selectedTeamId) { setMembers([]); return; }
    setMemberLoading(true);
    // For shared teams, load members from the original owner's path
    const team = teams.find(t => t.id === selectedTeamId);
    const ownerUid = team?.ownerUid ?? uid;
    const q = query(
      collection(db, "users", ownerUid, "teams", selectedTeamId, "members"),
      orderBy("name", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamMember)));
      setMemberLoading(false);
    });
    return unsub;
  }, [uid, selectedTeamId, teams]);

  // ── Load pending invites for selected team ────────────────────────────────
  useEffect(() => {
    if (!uid || !selectedTeamId) { setPendingInvites([]); return; }
    const q = query(
      collection(db, "invites"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setPendingInvites(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as PendingInvite & { inviterUid: string; teamId: string }))
          .filter((inv: any) => inv.inviterUid === uid && inv.teamId === selectedTeamId)
      );
    });
    return unsub;
  }, [uid, selectedTeamId]);

  // ── Load registered users when invite modal opens ─────────────────────────
  useEffect(() => {
    if (!inviteOpen) return;
    setLoadingUsers(true);
    getDocs(collection(db, "profiles")).then((snap) => {
      const memberUids = new Set(members.map(m => m.uid).filter(Boolean));
      setRegisteredUsers(
        snap.docs
          .filter(d => d.id !== uid && !memberUids.has(d.id))
          .map(d => ({ uid: d.id, ...d.data() } as RegisteredUser))
      );
      setLoadingUsers(false);
    }).catch(() => setLoadingUsers(false));
  }, [inviteOpen, uid, members]);

  // ── Sync edit fields when selected team changes ───────────────────────────
  useEffect(() => {
    if (selectedTeam) {
      setEditTeamName(selectedTeam.name ?? "");
      setEditTeamFunction((selectedTeam as any).teamFunction ?? "");
    }
  }, [selectedTeamId, teams]);

  // ── Save team settings ────────────────────────────────────────────────────
  const handleSaveTeamSettings = async () => {
    if (!selectedTeamId || !editTeamName.trim()) return;
    setEditSaving(true);
    await updateDoc(doc(db, "users", uid, "teams", selectedTeamId), {
      name: editTeamName.trim(),
      teamFunction: editTeamFunction.trim(),
    });
    setEditSaving(false);
  };

  // ── Create team ───────────────────────────────────────────────────────────
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    const ref = await addDoc(collection(db, "users", uid, "teams"), {
      name: newTeamName.trim(),
      company: newTeamCompany.trim(),
      createdAt: serverTimestamp(),
    });
    setSelectedTeamId(ref.id);
    setNewTeamName(""); setNewTeamCompany("");
    setCreateTeamOpen(false);
  };

  // ── Delete member ─────────────────────────────────────────────────────────
  const handleDeleteMember = async (memberId: string) => {
    if (!selectedTeamId) return;
    await deleteDoc(doc(db, "users", uid, "teams", selectedTeamId, "members", memberId));
  };

  // ── Invite registered user directly ──────────────────────────────────────
  const handleInviteRegistered = async (targetUser: RegisteredUser, role: string) => {
    if (!selectedTeamId || !selectedTeam || inviting) return;
    setInviting(true);

    // Add to team members (keyed by uid for dedup)
    await setDoc(doc(db, "users", uid, "teams", selectedTeamId, "members", targetUser.uid), {
      name: targetUser.name,
      email: targetUser.email,
      role,
      uid: targetUser.uid,
      createdAt: serverTimestamp(),
    });

    // Write team reference to the member's own teams collection → they see it on their Team page
    await setDoc(doc(db, "users", targetUser.uid, "teams", selectedTeamId), {
      name: selectedTeam.name,
      company: selectedTeam.company ?? "",
      teamFunction: (selectedTeam as any).teamFunction ?? "",
      ownerUid: uid,
      isSharedTeam: true,
      role,
      createdAt: serverTimestamp(),
    });

    // Send notification to the invited user
    await addDoc(collection(db, "users", targetUser.uid, "notifications"), {
      type: "team",
      title: "Você foi adicionado a uma equipe!",
      description: `${userName} adicionou você à equipe "${selectedTeam.name}" como ${role}.`,
      read: false,
      createdAt: serverTimestamp(),
    });

    // Create invite record for tracking
    await addDoc(collection(db, "invites"), {
      inviterUid: uid,
      inviterName: userName,
      inviteeEmail: targetUser.email,
      inviteeName: targetUser.name,
      inviteeUid: targetUser.uid,
      role,
      teamId: selectedTeamId,
      teamName: selectedTeam.name,
      status: "accepted",
      createdAt: serverTimestamp(),
    });

    setInvitedUids(prev => new Set([...prev, targetUser.uid]));
    setInviting(false);
  };

  // ── Invite by email (unregistered) ───────────────────────────────────────
  const handleInviteByEmail = async () => {
    if (!selectedTeamId || !selectedTeam || !inviteEmail.trim() || inviting) return;
    setInviting(true);

    // Auto-generate a roleCode for this invite
    const code = generateRoleCode(inviteRole);
    await addDoc(collection(db, "roleCodes"), {
      code,
      role: inviteRole,
      maxUses: 1,
      usedCount: 0,
      active: true,
      createdAt: serverTimestamp(),
      createdBy: uid,
      note: `Convite para ${inviteEmail.trim()}`,
    });

    await addDoc(collection(db, "invites"), {
      inviterUid: uid,
      inviterName: userName,
      inviteeEmail: inviteEmail.trim().toLowerCase(),
      inviteeName: inviteName.trim() || inviteEmail.trim(),
      inviteeUid: null,
      role: inviteRole,
      roleCode: code,
      teamId: selectedTeamId,
      teamName: selectedTeam.name,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    // Open mailto: so the inviter can send the email directly
    const appUrl = window.location.origin;
    const subject = encodeURIComponent(`Convite para o ${selectedTeam.name} no SalsaHub`);
    const body = encodeURIComponent(
      `Olá${inviteName.trim() ? `, ${inviteName.trim()}` : ""}!\n\n` +
      `${userName} convidou você para fazer parte da equipe "${selectedTeam.name}" no SalsaHub como ${inviteRole}.\n\n` +
      `Acesse o app: ${appUrl}\n\n` +
      `Ao criar sua conta, use o código de acesso abaixo:\n\n` +
      `🔑 Código: ${code}\n\n` +
      `Este código é válido para 1 uso.\n\nBem-vindo(a)!`
    );
    window.open(`mailto:${inviteEmail.trim()}?subject=${subject}&body=${body}`, "_blank");

    setEmailInviteCode(code);
    setInviting(false);
  };

  const handleCopyEmailCode = () => {
    if (!emailInviteCode) return;
    navigator.clipboard.writeText(emailInviteCode).catch(() => {});
    setEmailInviteCopied(true);
    setTimeout(() => setEmailInviteCopied(false), 2000);
  };

  // Only show users when search has text
  const filteredUsers = inviteSearch.trim()
    ? registeredUsers.filter(u =>
        u.name?.toLowerCase().includes(inviteSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(inviteSearch.toLowerCase())
      )
    : [];

  const handleGenerateCode = async () => {
    if (codeSaving) return;
    setCodeSaving(true);
    const code = generateRoleCode(codeGenRole);
    await addDoc(collection(db, "roleCodes"), {
      code,
      role: codeGenRole,
      maxUses: codeGenMaxUses,
      usedCount: 0,
      active: true,
      createdAt: serverTimestamp(),
      createdBy: uid,
    });
    setGeneratedCode(code);
    setCodeSaving(false);
  };

  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode).catch(() => {});
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-mid transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground font-sans flex-1">Equipe</h1>
          {canFullControl(userRole) && (
            <Button onClick={() => setCreateTeamOpen(true)}
              className="rounded-2xl bg-primary hover:bg-primary/80 text-background text-sm">
              <Plus className="w-4 h-4 mr-1" />Nova Equipe
            </Button>
          )}
        </div>

        {/* User role indicator */}
        {userRole && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-primary/5 rounded-2xl border border-primary/20">
            <Info className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground">
              Você está como <Badge className={"text-xs inline-flex " + getRoleColor(userRole)}>{userRole}</Badge>
              {canFullControl(userRole) ? " — acesso completo." : canManageTeam(userRole) ? " — pode gerenciar membros e tarefas." : " — apenas visualizar."}
            </span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-surface-low rounded-2xl p-4 border border-surface-mid flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-2xl flex-shrink-0 bg-surface-high" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3 bg-surface-high" />
                  <Skeleton className="h-3 w-1/4 bg-surface-high" />
                </div>
                <Skeleton className="h-8 w-8 rounded-xl bg-surface-high" />
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Plus className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma equipe ainda</p>
            {canFullControl(userRole) ? (
              <>
                <p className="text-xs mb-4">Crie sua primeira equipe para organizar os membros.</p>
                <Button onClick={() => setCreateTeamOpen(true)} className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
                  <Plus className="w-4 h-4 mr-2" />Criar Equipe
                </Button>
              </>
            ) : (
              <p className="text-xs">Aguarde ser adicionado a uma equipe.</p>
            )}
          </div>
        ) : (
          <>
            {/* Team selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {teams.map(team => (
                <button key={team.id} onClick={() => setSelectedTeamId(team.id)}
                  className={"p-5 rounded-3xl border-2 transition-all text-left " +
                    (selectedTeamId === team.id ? "border-primary bg-surface-mid" : "border-surface-mid bg-surface-low hover:border-surface-high")}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                      {team.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{team.name}</p>
                      {team.company && <p className="text-xs text-muted-foreground">{team.company}</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Team detail */}
            {selectedTeam && (
              <div className="bg-surface-low rounded-3xl border border-surface-mid overflow-hidden">
                <div className="p-5 border-b border-surface-mid flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                    {selectedTeam.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">{selectedTeam.name}</h2>
                    {selectedTeam.company && <p className="text-xs text-muted-foreground">{selectedTeam.company}</p>}
                  </div>
                </div>

                <div className="p-4 md:p-6">
                  <Tabs defaultValue="members" className="w-full">
                    <TabsList className="grid grid-cols-3 gap-2 mb-5 bg-transparent h-auto p-0 rounded-none w-full">
                      {tabItems.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value}
                          className="flex flex-col items-center gap-0.5 py-2.5 bg-surface-mid border border-surface-mid rounded-2xl text-[11px] font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-background data-[state=active]:border-primary transition-all">
                          <span className="text-sm">{tab.emoji}</span>
                          <span>{tab.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {/* ── Members tab ───────────────────────────────────────── */}
                    <TabsContent value="members" className="space-y-3">
                      {canManageTeam(userRole) && (
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => setInviteOpen(true)}
                            className="rounded-2xl bg-primary hover:bg-primary/80">
                            <UserPlus className="w-4 h-4 mr-1" />Convidar
                          </Button>
                        </div>
                      )}

                      {memberLoading ? (
                        <div className="space-y-2 py-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-2">
                              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0 bg-surface-high" />
                              <div className="flex-1 space-y-1">
                                <Skeleton className="h-3 w-1/3 bg-surface-high" />
                                <Skeleton className="h-3 w-1/2 bg-surface-high" />
                              </div>
                              <Skeleton className="h-5 w-16 rounded-full bg-surface-high" />
                            </div>
                          ))}
                        </div>
                      ) : members.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Nenhum membro ainda.{canManageTeam(userRole) ? " Use o botão Convidar para adicionar!" : ""}
                        </p>
                      ) : (
                        members.map(member => (
                          <div key={member.id}
                            className="flex items-center gap-3 p-3 rounded-2xl bg-surface-mid hover:bg-surface-high transition-colors">
                            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-xs flex-shrink-0">
                              {member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                              {member.email && <p className="text-xs text-muted-foreground truncate">{member.email}</p>}
                            </div>
                            <Badge className={"text-xs flex-shrink-0 " + getRoleColor(member.role)}>{member.role}</Badge>
                            {canManageTeam(userRole) && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-red-400 flex-shrink-0"
                                onClick={() => handleDeleteMember(member.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        ))
                      )}

                      {/* Permissions legend */}
                      <div className="bg-surface-mid rounded-2xl p-3 mt-2">
                        <p className="text-xs font-semibold text-foreground mb-2">Permissões por cargo</p>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between"><span className="text-muted-foreground">CEO / CFO / CMO / COO</span><span className="text-primary">Controle total</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Gerentes / Coordenadores</span><span className="text-purple-400">Membros + Tarefas</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Analistas / Técnicos / Assistentes</span><span className="text-blue-400">Visualizar + Arquivos</span></div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* ── Invites tab ───────────────────────────────────────── */}
                    <TabsContent value="invites" className="space-y-3">
                      {pendingInvites.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                          <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm font-medium text-foreground mb-1">Nenhum convite enviado</p>
                          <p className="text-xs">Os convites enviados para esta equipe aparecerão aqui.</p>
                        </div>
                      ) : (
                        pendingInvites.map(invite => (
                          <div key={invite.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-mid">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                              <Mail className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{invite.inviteeName}</p>
                              <p className="text-xs text-muted-foreground truncate">{invite.inviteeEmail} · {invite.role}</p>
                            </div>
                            <Badge className={
                              "text-xs flex-shrink-0 " +
                              (invite.status === "accepted" ? "bg-green-500/20 text-green-400" :
                               invite.status === "rejected" ? "bg-red-500/20 text-red-400" :
                               "bg-yellow-500/20 text-yellow-400")
                            }>
                              {invite.status === "accepted" ? "Aceito" : invite.status === "rejected" ? "Recusado" : "Pendente"}
                            </Badge>
                          </div>
                        ))
                      )}
                    </TabsContent>

                    {/* ── Settings tab ──────────────────────────────────────── */}
                    <TabsContent value="settings" className="space-y-4">
                      {canManageTeam(userRole) ? (
                        <div className="bg-surface-mid rounded-2xl p-4 space-y-4">
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1.5">Nome da Equipe</label>
                            <Input
                              value={editTeamName}
                              onChange={e => setEditTeamName(e.target.value)}
                              className="bg-background border-0 rounded-xl text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1.5">Função da Equipe</label>
                            <Input
                              value={editTeamFunction}
                              onChange={e => setEditTeamFunction(e.target.value)}
                              placeholder="Ex: Produto, Marketing, Tecnologia..."
                              className="bg-background border-0 rounded-xl text-sm"
                            />
                          </div>
                          <Button
                            onClick={handleSaveTeamSettings}
                            disabled={editSaving || !editTeamName.trim()}
                            className="w-full rounded-xl bg-primary hover:bg-primary/80"
                          >
                            {editSaving ? "Salvando..." : "Salvar Alterações"}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-10 text-muted-foreground">
                          <p className="text-sm">Apenas gestores podem alterar configurações da equipe.</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Create Team Dialog ──────────────────────────────────────────────── */}
      <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <DialogContent className="bg-surface-low border-surface-mid">
          <DialogHeader><DialogTitle>Criar Nova Equipe</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nome da equipe *" value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              className="bg-surface-mid border-0 rounded-xl text-sm" />
            <Input placeholder="Empresa" value={newTeamCompany}
              onChange={e => setNewTeamCompany(e.target.value)}
              className="bg-surface-mid border-0 rounded-xl text-sm" />
            <Button className="w-full rounded-xl bg-primary hover:bg-primary/80"
              onClick={handleCreateTeam} disabled={!newTeamName.trim()}>
              Criar Equipe
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Invite Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={inviteOpen} onOpenChange={(v) => { setInviteOpen(v); if (!v) { setInviteSearch(""); setInviteEmail(""); setInviteName(""); setInvitedUids(new Set()); setEmailInviteCode(null); setEmailInviteCopied(false); setCodeGenOpen(false); setGeneratedCode(null); } }}>
        <DialogContent className="bg-surface-low border-surface-mid max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar para {selectedTeam?.name}</DialogTitle>
          </DialogHeader>

          {/* Tabs: Registered vs Email */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setInviteTab("registered")}
              className={"flex-1 py-2 rounded-xl text-sm font-medium transition-colors " +
                (inviteTab === "registered" ? "bg-primary text-background" : "bg-surface-mid text-muted-foreground hover:text-foreground")}>
              Usuários Registrados
            </button>
            <button onClick={() => setInviteTab("email")}
              className={"flex-1 py-2 rounded-xl text-sm font-medium transition-colors " +
                (inviteTab === "email" ? "bg-primary text-background" : "bg-surface-mid text-muted-foreground hover:text-foreground")}>
              Convidar por Email
            </button>
          </div>

          {inviteTab === "registered" ? (
            <>
              {/* Role selector for registered users */}
              <div className="mb-3">
                <label className="text-xs text-muted-foreground block mb-1.5">Cargo a atribuir</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-surface-mid border-0 rounded-xl p-2.5 text-foreground text-sm">
                  {(canFullControl(userRole) ? ALL_ROLES : TEAM_ROLES).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* User search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou email..." value={inviteSearch}
                  onChange={e => setInviteSearch(e.target.value)}
                  className="pl-10 bg-surface-mid border-0 rounded-xl text-sm" />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Buscando usuários...</span>
                  </div>
                ) : !inviteSearch.trim() ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Digite um nome ou email para buscar.</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Nenhum usuário encontrado.</p>
                    <button onClick={() => setInviteTab("email")} className="text-xs text-primary mt-2 hover:underline">
                      Convidar por email →
                    </button>
                  </div>
                ) : (
                  filteredUsers.map(user => {
                    const alreadyAdded = invitedUids.has(user.uid);
                    return (
                      <div key={user.uid}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-surface-mid">
                        <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.role} · {user.email}</p>
                        </div>
                        <Button size="sm"
                          disabled={alreadyAdded || inviting}
                          onClick={() => handleInviteRegistered(user, inviteRole)}
                          className={"rounded-xl text-xs flex-shrink-0 " +
                            (alreadyAdded ? "bg-green-500/20 text-green-400 hover:bg-green-500/20" : "bg-primary hover:bg-primary/80 text-background")}>
                          {alreadyAdded ? <><Check className="w-3 h-3 mr-1" />Adicionado</> : "Adicionar"}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* Email invite form */
            <div className="space-y-3">
              {emailInviteCode ? (
                /* Success state: show generated code + open email */
                <div className="space-y-3">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-center space-y-2">
                    <p className="text-sm font-semibold text-green-400">Convite gerado!</p>
                    <p className="text-xs text-muted-foreground">Código de acesso para <strong>{inviteRole}</strong>:</p>
                    <div className="bg-surface-mid rounded-xl p-3">
                      <code className="text-base font-mono font-bold text-primary tracking-widest">{emailInviteCode}</code>
                    </div>
                    <p className="text-xs text-muted-foreground">Um rascunho de email foi aberto no seu cliente de email com o código e o link do app.</p>
                  </div>
                  <Button onClick={handleCopyEmailCode}
                    className={"w-full rounded-xl " + (emailInviteCopied ? "bg-green-500 hover:bg-green-500 text-white" : "bg-surface-high text-foreground hover:bg-surface-mid")}>
                    {emailInviteCopied ? <><Check className="w-4 h-4 mr-2" />Copiado!</> : <><Copy className="w-4 h-4 mr-2" />Copiar Código</>}
                  </Button>
                  <Button variant="outline" onClick={() => { setEmailInviteCode(null); setInviteEmail(""); setInviteName(""); setEmailInviteCopied(false); }}
                    className="w-full rounded-xl border-surface-high text-muted-foreground">
                    Novo Convite
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Email do convidado *</label>
                    <Input type="email" placeholder="email@empresa.com" value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      className="bg-surface-mid border-0 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Nome (opcional)</label>
                    <Input placeholder="Nome do convidado" value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                      className="bg-surface-mid border-0 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Cargo a atribuir</label>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                      className="w-full bg-surface-mid border-0 rounded-xl p-2.5 text-foreground text-sm">
                      {(canFullControl(userRole) ? ALL_ROLES : TEAM_ROLES).map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* CEO-only: standalone roleCode generator */}
                  {userRole === "CEO" && (
                    <div className="border border-surface-high rounded-xl overflow-hidden">
                      <button
                        onClick={() => { setCodeGenOpen(p => !p); setGeneratedCode(null); }}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-primary hover:bg-surface-mid transition-colors"
                      >
                        <span className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5" />Gerar Código Avulso</span>
                        {codeGenOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      {codeGenOpen && (
                        <div className="px-3 pb-3 pt-2 space-y-3 border-t border-surface-high bg-surface-mid/50">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-muted-foreground block mb-1">Cargo</label>
                              <select value={codeGenRole} onChange={e => { setCodeGenRole(e.target.value); setGeneratedCode(null); }}
                                className="w-full bg-surface-mid border-0 rounded-lg p-1.5 text-foreground text-xs">
                                {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground block mb-1">Usos máx.</label>
                              <Input type="number" min={1} max={100} value={codeGenMaxUses}
                                onChange={e => setCodeGenMaxUses(Number(e.target.value))}
                                className="bg-surface-mid border-0 rounded-lg text-xs h-8 px-2" />
                            </div>
                          </div>
                          {generatedCode ? (
                            <div className="space-y-2">
                              <div className="bg-surface-mid rounded-lg p-2.5 text-center">
                                <code className="text-sm font-mono font-bold text-primary tracking-widest">{generatedCode}</code>
                              </div>
                              <Button size="sm" onClick={handleCopyCode}
                                className={"w-full rounded-lg text-xs " + (codeCopied ? "bg-green-500 hover:bg-green-500 text-white" : "bg-surface-high hover:bg-surface-high text-foreground")}>
                                {codeCopied ? <><Check className="w-3 h-3 mr-1" />Copiado!</> : <><Copy className="w-3 h-3 mr-1" />Copiar Código</>}
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" onClick={handleGenerateCode} disabled={codeSaving}
                              className="w-full rounded-lg text-xs bg-primary hover:bg-primary/80 text-background">
                              {codeSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Gerar Código"}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground bg-surface-mid rounded-xl p-3">
                    📧 Um código de acesso único será gerado e um email pré-preenchido será aberto para você enviar.
                  </p>
                  <Button className="w-full rounded-xl bg-primary hover:bg-primary/80"
                    onClick={handleInviteByEmail}
                    disabled={!inviteEmail.trim() || inviting}>
                    {inviting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando convite...</>
                    ) : (
                      <><Mail className="w-4 h-4 mr-2" />Gerar e Enviar Convite</>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
