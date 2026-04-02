import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Users, FolderKanban,
  ListTodo, Lock, Settings, UserPlus, Loader2, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const CLEVEL = ["CEO", "CFO", "CMO", "COO", "Diretor"];
const MANAGEMENT = ["Gerente", "Coordenador"];
const ALL_ROLES = [...CLEVEL, ...MANAGEMENT, "Analista", "Técnico", "Assistente"];

const canManageTeam = (role: string) => CLEVEL.includes(role) || MANAGEMENT.includes(role);
const canFullControl = (role: string) => CLEVEL.includes(role);

interface TeamMember { id: string; name: string; role: string; email: string; avatar_url?: string; }
interface TeamProject { id: string; name: string; status: string; }
interface TeamTask { id: string; title: string; status: string; assignee_name?: string; }
interface Team { id: string; name: string; description?: string; avatar: string; }

interface SectionProps {
  id: string; icon: React.ElementType; title: string; badge?: number;
  open: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}

function DrawerSection({ id, icon: Icon, title, badge, open, onToggle, children }: SectionProps) {
  return (
    <div className="bg-surface-low rounded-3xl border border-surface-mid overflow-hidden mb-3">
      <button onClick={() => onToggle(id)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-mid transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-2xl bg-surface-high flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground">{title}</span>
          {badge !== undefined && !open && badge > 0 && (
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary/20 text-primary text-xs font-bold">{badge}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-surface-mid pt-4">{children}</div>}
    </div>
  );
}

export default function Team() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<string[]>(["members"]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Analista");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const toggleSection = (id: string) =>
    setOpenSections((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    setCurrentUserRole(profile?.role || "");
    const { data: teamData } = await supabase.from("teams").select("id, name, description").order("name");
    if (teamData) {
      const formatted = teamData.map((t) => ({ id: t.id, name: t.name, description: t.description, avatar: t.name.charAt(0).toUpperCase() }));
      setTeams(formatted);
      if (!selectedTeamId && formatted.length > 0) setSelectedTeamId(formatted[0].id);
    }
    setLoading(false);
  }, [selectedTeamId]);

  const loadTeamDetails = useCallback(async (teamId: string) => {
    const [membersRes, projectsRes, tasksRes] = await Promise.all([
      supabase.from("team_members").select("id, role, profiles(id, name, email, avatar_url, role)").eq("team_id", teamId),
      supabase.from("products").select("id, name, status").eq("team_id", teamId).order("name"),
      supabase.from("tasks").select("id, title, status, profiles(name)").eq("team_id", teamId).neq("status", "COMPLETA").order("created_at", { ascending: false }).limit(20),
    ]);
    if (membersRes.data) setMembers(membersRes.data.map((m: any) => ({ id: m.profiles?.id || m.id, name: m.profiles?.name || "—", email: m.profiles?.email || "—", role: m.role || m.profiles?.role || "—", avatar_url: m.profiles?.avatar_url })));
    if (projectsRes.data) setProjects(projectsRes.data.map((p) => ({ id: p.id, name: p.name, status: p.status })));
    if (tasksRes.data) setTasks(tasksRes.data.map((t: any) => ({ id: t.id, title: t.title, status: t.status, assignee_name: t.profiles?.name || "—" })));
  }, []);

  useEffect(() => { loadTeams(); }, [loadTeams]);
  useEffect(() => { if (selectedTeamId) loadTeamDetails(selectedTeamId); }, [selectedTeamId, loadTeamDetails]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setSavingTeam(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("teams").insert({ name: newTeamName.trim(), description: newTeamDesc.trim() || null, created_by: user?.id });
    setNewTeamName(""); setNewTeamDesc(""); setSavingTeam(false); setTeamDialogOpen(false); loadTeams();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeamId) return;
    await supabase.from("team_members").delete().eq("profile_id", memberId).eq("team_id", selectedTeamId);
    loadTeamDetails(selectedTeamId);
  };

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const todoTasks = tasks.filter((t) => t.status === "PENDENTE" || t.status === "ATIVA");
  const doingTasks = tasks.filter((t) => t.status === "EM_ANDAMENTO");

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Equipe</h1>
          <p className="text-xs text-muted-foreground">Gerencie times e membros</p>
        </div>
        {canFullControl(currentUserRole) && (
          <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-background rounded-2xl font-semibold gap-1"><Plus className="w-4 h-4" />Novo Time</Button>
            </DialogTrigger>
            <DialogContent className="bg-surface-low border-surface-mid rounded-3xl mx-4 max-w-sm">
              <DialogHeader><DialogTitle>Criar Novo Time</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nome do time</Label>
                  <Input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Ex: Time de Marketing" className="bg-surface-mid border-surface-high rounded-2xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Descrição (opcional)</Label>
                  <Input value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)} placeholder="Breve descrição do time" className="bg-surface-mid border-surface-high rounded-2xl" />
                </div>
                <Button onClick={handleCreateTeam} disabled={savingTeam || !newTeamName} className="w-full bg-primary text-background rounded-2xl font-semibold">
                  {savingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Time"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="bg-surface-low border border-surface-mid rounded-3xl p-8 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum time encontrado.</p>
          {canFullControl(currentUserRole) && <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Time" para começar.</p>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {teams.map((team) => (
              <button key={team.id} onClick={() => setSelectedTeamId(team.id)}
                className={`p-4 rounded-3xl border-2 transition-all text-left ${selectedTeamId === team.id ? "border-primary bg-surface-mid" : "border-surface-mid bg-surface-low hover:border-surface-high"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold flex-shrink-0">{team.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{team.name}</p>
                    {team.description && <p className="text-xs text-muted-foreground truncate">{team.description}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedTeam && (
            <div>
              <div className="bg-surface-low rounded-3xl border border-surface-mid p-4 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">{selectedTeam.avatar}</div>
                <div>
                  <h2 className="font-bold text-foreground">{selectedTeam.name}</h2>
                  {selectedTeam.description && <p className="text-xs text-muted-foreground">{selectedTeam.description}</p>}
                </div>
              </div>

              <DrawerSection id="members" icon={Users} title="Membros" badge={members.length} open={openSections.includes("members")} onToggle={toggleSection}>
                <div className="space-y-2 mb-3">
                  {members.length === 0 ? <p className="text-sm text-muted-foreground text-center py-2">Nenhum membro ainda.</p> : members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-mid">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                        {m.avatar_url ? <img src={m.avatar_url} alt={m.name} className="w-8 h-8 rounded-full object-cover" /> : m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      </div>
                      <Badge variant="outline" className="text-xs rounded-full border-surface-high text-muted-foreground flex-shrink-0">{m.role}</Badge>
                      {canManageTeam(currentUserRole) && (
                        <button onClick={() => handleRemoveMember(m.id)} className="w-7 h-7 rounded-xl hover:bg-red-500/10 flex items-center justify-center transition-colors flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {canManageTeam(currentUserRole) && (
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-2xl border-primary/50 text-primary w-full gap-2"><UserPlus className="w-4 h-4" />Convidar Membro</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-surface-low border-surface-mid rounded-3xl mx-4 max-w-sm">
                      <DialogHeader><DialogTitle>Convidar para o Time</DialogTitle></DialogHeader>
                      <div className="space-y-3 mt-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email do membro</Label>
                          <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@salsahub.com" type="email" className="bg-surface-mid border-surface-high rounded-2xl" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Cargo no time</Label>
                          <div className="flex flex-wrap gap-2">
                            {ALL_ROLES.map((r) => (
                              <button key={r} onClick={() => setInviteRole(r)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${inviteRole === r ? "bg-primary text-background" : "bg-surface-mid text-muted-foreground hover:bg-surface-high"}`}>{r}</button>
                            ))}
                          </div>
                        </div>
                        <Button className="w-full bg-primary text-background rounded-2xl font-semibold">Enviar Convite</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </DrawerSection>

              <DrawerSection id="projects" icon={FolderKanban} title="Projetos" badge={projects.length} open={openSections.includes("projects")} onToggle={toggleSection}>
                {projects.length === 0 ? <p className="text-sm text-muted-foreground text-center py-2">Nenhum projeto vinculado.</p> : (
                  <div className="space-y-2">
                    {projects.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-surface-mid">
                        <span className="text-sm text-foreground">{p.name}</span>
                        <Badge variant="outline" className={`text-xs rounded-full border ${p.status === "ativo" ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-surface-high text-muted-foreground"}`}>{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </DrawerSection>

              <DrawerSection id="tasks" icon={ListTodo} title="Tarefas" badge={todoTasks.length + doingTasks.length} open={openSections.includes("tasks")} onToggle={toggleSection}>
                {tasks.length === 0 ? <p className="text-sm text-muted-foreground text-center py-2">Nenhuma tarefa ativa.</p> : (
                  <div className="space-y-3">
                    {[{ label: "A Fazer", items: todoTasks }, { label: "Em Andamento", items: doingTasks }].map(({ label, items }) =>
                      items.length > 0 ? (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">{label}</p>
                          <div className="space-y-2">
                            {items.map((t) => (
                              <div key={t.id} className="p-3 rounded-2xl bg-surface-mid flex items-center justify-between gap-2">
                                <span className="text-sm text-foreground flex-1 truncate">{t.title}</span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">{t.assignee_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </DrawerSection>

              <DrawerSection id="privacy" icon={Lock} title="Privacidade" open={openSections.includes("privacy")} onToggle={toggleSection}>
                <div className="space-y-4 text-sm">
                  <div className="bg-surface-mid rounded-2xl p-3">
                    <p className="text-xs font-semibold text-foreground mb-2">Permissões por cargo</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">CEO / CFO / CMO / COO / Diretor</span><span className="text-primary font-medium">Controle total</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Gerentes / Coordenadores</span><span className="text-purple-400 font-medium">Membros + Tarefas</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Analistas / Técnicos / Assistentes</span><span className="text-blue-400 font-medium">Visualizar + Arquivos</span></div>
                    </div>
                  </div>
                  <div className="border-t border-surface-mid pt-3">
                    <p className="text-sm font-medium text-foreground mb-1">Compartilhamento entre empresas</p>
                    <p className="text-xs text-muted-foreground">Empresas parceiras podem ver informações conforme configurado pelo C-Level.</p>
                  </div>
                </div>
              </DrawerSection>

              {canManageTeam(currentUserRole) && (
                <DrawerSection id="settings" icon={Settings} title="Configurações" open={openSections.includes("settings")} onToggle={toggleSection}>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nome do time</Label>
                      <Input defaultValue={selectedTeam.name} className="bg-surface-mid border-surface-high rounded-2xl" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Descrição</Label>
                      <Input defaultValue={selectedTeam.description || ""} placeholder="Descrição do time" className="bg-surface-mid border-surface-high rounded-2xl" />
                    </div>
                    {canFullControl(currentUserRole) && (
                      <div className="pt-2 border-t border-surface-mid">
                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-surface-mid">
                          <Share2 className="w-4 h-4 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">Compartilhamento externo</p>
                            <p className="text-xs text-muted-foreground">Controle o acesso de empresas parceiras</p>
                          </div>
                          <Badge variant="outline" className="text-xs rounded-full border-surface-high text-muted-foreground">Desativado</Badge>
                        </div>
                        <button className="w-full py-2.5 text-sm text-red-400 border border-red-500/30 rounded-2xl hover:bg-red-500/10 transition-colors mt-3">Excluir Time</button>
                      </div>
                    )}
                  </div>
                </DrawerSection>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
