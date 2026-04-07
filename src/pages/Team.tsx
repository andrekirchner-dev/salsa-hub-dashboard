import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Edit2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth, db } from "@/integrations/firebase/client";
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, query,
  orderBy, serverTimestamp, getDoc,
} from "firebase/firestore";

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

interface TeamMember { id: string; name: string; email: string; role: string; }
interface TeamItem { id: string; name: string; company: string; }

const tabItems = [
  { value: "members", label: "Membros", emoji: "👥" },
  { value: "privacy", label: "Privacidade", emoji: "🔒" },
  { value: "settings", label: "Config.", emoji: "⚙️" },
];

export default function Team() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid ?? "";

  const [userRole, setUserRole] = useState<string>("");
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamCompany, setNewTeamCompany] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Analista");

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  // Load user role
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "profiles", uid)).then(snap => {
      setUserRole(snap.data()?.role ?? "");
    });
  }, [uid]);

  // Load teams
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

  // Load members of selected team
  useEffect(() => {
    if (!uid || !selectedTeamId) { setMembers([]); return; }
    setMemberLoading(true);
    const q = query(collection(db, "users", uid, "teams", selectedTeamId, "members"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamMember)));
      setMemberLoading(false);
    });
    return unsub;
  }, [uid, selectedTeamId]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    const ref = await addDoc(collection(db, "users", uid, "teams"), {
      name: newTeamName.trim(),
      company: newTeamCompany.trim(),
      createdAt: serverTimestamp(),
    });
    setSelectedTeamId(ref.id);
    setNewTeamName(""); setNewTeamCompany("");
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !selectedTeamId) return;
    await addDoc(collection(db, "users", uid, "teams", selectedTeamId, "members"), {
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      role: newMemberRole,
      createdAt: serverTimestamp(),
    });
    setNewMemberName(""); setNewMemberEmail(""); setNewMemberRole("Analista");
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!selectedTeamId) return;
    await deleteDoc(doc(db, "users", uid, "teams", selectedTeamId, "members", memberId));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-mid transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground font-sans flex-1">Equipe</h1>
          {canFullControl(userRole) && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="rounded-2xl bg-primary hover:bg-primary/80 text-background text-sm">
                  <Plus className="w-4 h-4 mr-1" />Nova Equipe
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface-low border-surface-mid">
                <DialogHeader><DialogTitle>Criar Nova Equipe</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Nome da equipe *" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="bg-surface-mid border-0 rounded-xl text-sm" />
                  <Input placeholder="Empresa" value={newTeamCompany} onChange={e => setNewTeamCompany(e.target.value)} className="bg-surface-mid border-0 rounded-xl text-sm" />
                  <Button className="w-full rounded-xl bg-primary hover:bg-primary/80" onClick={handleCreateTeam} disabled={!newTeamName.trim()}>
                    Criar Equipe
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {userRole && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-primary/5 rounded-2xl border border-primary/20">
            <Info className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Você está como <Badge className={"text-xs inline-flex " + getRoleColor(userRole)}>{userRole}</Badge> —
              {canFullControl(userRole) ? " acesso completo." : canManageTeam(userRole) ? " pode gerenciar membros e tarefas." : " apenas visualizar."}
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Carregando equipes...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Plus className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma equipe ainda</p>
            {canFullControl(userRole) ? (
              <p className="text-xs mb-4">Crie sua primeira equipe para organizar os membros.</p>
            ) : (
              <p className="text-xs">Aguarde ser adicionado a uma equipe.</p>
            )}
          </div>
        ) : (
          <>
            {/* Team selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={"p-5 rounded-3xl border-2 transition-all text-left " + (selectedTeamId === team.id ? "border-primary bg-surface-mid" : "border-surface-mid bg-surface-low hover:border-surface-high")}
                >
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
                    <TabsList asChild>
                      <div className="grid grid-cols-3 gap-2 mb-5">
                        {tabItems.map(tab => (
                          <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="flex flex-col items-center gap-0.5 py-2.5 bg-surface-mid border border-surface-mid rounded-2xl text-[11px] font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-background data-[state=active]:border-primary transition-all"
                          >
                            <span className="text-sm">{tab.emoji}</span>
                            <span>{tab.label}</span>
                          </TabsTrigger>
                        ))}
                      </div>
                    </TabsList>

                    <TabsContent value="members" className="space-y-3">
                      {canManageTeam(userRole) && (
                        <div className="flex justify-end">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" className="rounded-2xl bg-primary hover:bg-primary/80">
                                <Plus className="w-4 h-4 mr-1" />Adicionar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-surface-low border-surface-mid">
                              <DialogHeader><DialogTitle>Adicionar Membro</DialogTitle></DialogHeader>
                              <div className="space-y-4">
                                <Input placeholder="Nome do membro *" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} className="bg-surface-mid border-0 rounded-xl text-sm" />
                                <Input placeholder="Email" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} className="bg-surface-mid border-0 rounded-xl text-sm" />
                                <select
                                  value={newMemberRole}
                                  onChange={e => setNewMemberRole(e.target.value)}
                                  className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm"
                                >
                                  {(canFullControl(userRole) ? ALL_ROLES : TEAM_ROLES).map(r => <option key={r}>{r}</option>)}
                                </select>
                                <Button className="w-full rounded-xl bg-primary hover:bg-primary/80" onClick={handleAddMember} disabled={!newMemberName.trim()}>
                                  Adicionar
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}

                      {memberLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin mx-auto" />
                        </div>
                      ) : members.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Nenhum membro ainda. Adicione o primeiro!</p>
                      ) : (
                        members.map(member => (
                          <div key={member.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-mid hover:bg-surface-high transition-colors">
                            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-xs flex-shrink-0">
                              {member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                              {member.email && <p className="text-xs text-muted-foreground truncate">{member.email}</p>}
                            </div>
                            <Badge className={"text-xs flex-shrink-0 " + getRoleColor(member.role)}>{member.role}</Badge>
                            {canManageTeam(userRole) && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-red-400 flex-shrink-0" onClick={() => handleDeleteMember(member.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        ))
                      )}

                      <div className="bg-surface-mid rounded-2xl p-3 mt-2">
                        <p className="text-xs font-semibold text-foreground mb-2">Permissões por cargo</p>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between"><span className="text-muted-foreground">CEO / CFO / CMO / COO</span><span className="text-primary">Controle total</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Gerentes / Coordenadores</span><span className="text-purple-400">Membros + Tarefas</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Analistas / Técnicos / Assistentes</span><span className="text-blue-400">Visualizar + Arquivos</span></div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="privacy" className="space-y-4">
                      <div className="bg-surface-mid rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">Equipe Privada</p>
                            <p className="text-xs text-muted-foreground">Apenas membros podem acessar</p>
                          </div>
                          <input type="checkbox" defaultChecked className="w-4 h-4" />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4">
                      {canFullControl(userRole) ? (
                        <div className="bg-surface-mid rounded-2xl p-4 space-y-4">
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1.5">Nome da Equipe</label>
                            <Input defaultValue={selectedTeam.name} className="bg-background border-0 rounded-xl text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1.5">Empresa</label>
                            <Input defaultValue={selectedTeam.company} className="bg-background border-0 rounded-xl text-sm" />
                          </div>
                          <Button className="w-full rounded-xl bg-primary hover:bg-primary/80">Salvar</Button>
                        </div>
                      ) : (
                        <div className="text-center py-10 text-muted-foreground">
                          <p className="text-sm">Apenas CEO, CFO, CMO ou COO podem alterar configurações.</p>
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
    </div>
  );
}
