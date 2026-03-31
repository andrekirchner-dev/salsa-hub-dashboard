import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Edit2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CLEVEL = ["CEO", "CFO", "CMO", "COO"];
const MANAGEMENT = ["Gerente", "Coordenador"];
const TEAM_ROLES = ["Analista", "Técnico", "Assistente"];
const ALL_ROLES = [...CLEVEL, ...MANAGEMENT, ...TEAM_ROLES];

const CURRENT_ROLE = "CEO";
const canManageTeam = (role: string) => CLEVEL.includes(role) || MANAGEMENT.includes(role);
const canFullControl = (role: string) => CLEVEL.includes(role);
const isReadOnly = (role: string) => TEAM_ROLES.includes(role);

const getRoleColor = (role: string) => {
  if (CLEVEL.includes(role)) return "bg-primary/20 text-primary";
  if (MANAGEMENT.includes(role)) return "bg-purple-500/20 text-purple-400";
  return "bg-blue-500/20 text-blue-400";
};

interface TeamMember { id: number; name: string; email: string; role: string; }
interface Project { id: number; name: string; status: string; progress: number; }
interface TaskItem { id: number; title: string; column: "todo" | "doing" | "done"; assignee: string; dueDate: string; }

const mockTeams = [
  { id: 1, name: "Salsa Digital", company: "Salsa Digital", memberCount: 6, privacy: "Privado", avatar: "SD" },
  { id: 2, name: "Agência Parceira X", company: "Agência X", memberCount: 4, privacy: "Compartilhado", avatar: "AP" },
];

const mockMembers: TeamMember[] = [
  { id: 1, name: "André Pereira", email: "andre@salsahub.com", role: "CEO" },
  { id: 2, name: "Mariana Silva", email: "mariana@salsahub.com", role: "CMO" },
  { id: 3, name: "Carlos Mendes", email: "carlos@salsahub.com", role: "Gerente" },
  { id: 4, name: "Ana Costa", email: "ana@salsahub.com", role: "Analista" },
];

const mockProjects: Project[] = [
  { id: 1, name: "App Delivery", status: "Em Desenvolvimento", progress: 75 },
  { id: 2, name: "Salsa Store", status: "Lançado", progress: 100 },
  { id: 3, name: "Landing Page", status: "Em Desenvolvimento", progress: 60 },
];

const mockTasks: TaskItem[] = [
  { id: 1, title: "Revisar design das telas", column: "todo", assignee: "Mariana", dueDate: "Mar 30" },
  { id: 2, title: "Implementar API de pagamento", column: "doing", assignee: "Carlos", dueDate: "Mar 31" },
  { id: 3, title: "Teste de usabilidade", column: "todo", assignee: "Ana", dueDate: "Apr 2" },
  { id: 4, title: "Deployar versão beta", column: "done", assignee: "Carlos", dueDate: "Mar 28" },
];

const tabItems = [
  { value: "members", label: "Membros", emoji: "👥" },
  { value: "projects", label: "Projetos", emoji: "📦" },
  { value: "tasks", label: "Tarefas", emoji: "✅" },
  { value: "privacy", label: "Privacidade", emoji: "🔒" },
  { value: "settings", label: "Config.", emoji: "⚙️" },
];
export default function Team() {
  const navigate = useNavigate();
  const [selectedTeam, setSelectedTeam] = useState(1);
  const [tasks] = useState<TaskItem[]>(mockTasks);
  const currentTeam = mockTeams.find(t => t.id === selectedTeam)!;
  const todoTasks = tasks.filter(t => t.column === "todo");
  const doingTasks = tasks.filter(t => t.column === "doing");
  const doneTasks = tasks.filter(t => t.column === "done");

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-mid transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground font-sans flex-1">Equipe</h1>
          {canFullControl(CURRENT_ROLE) && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="rounded-2xl bg-primary hover:bg-primary/80 text-background text-sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Nova Equipe
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface-low border-surface-mid">
                <DialogHeader><DialogTitle>Criar Nova Equipe</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Nome da equipe" className="bg-surface-mid border-0 rounded-xl text-sm" />
                  <Input placeholder="Empresa" className="bg-surface-mid border-0 rounded-xl text-sm" />
                  <Button className="w-full rounded-xl bg-primary hover:bg-primary/80">Criar Equipe</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4 p-3 bg-primary/5 rounded-2xl border border-primary/20">
          <Info className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Você está como <Badge className={"text-xs inline-flex " + getRoleColor(CURRENT_ROLE)}>{CURRENT_ROLE}</Badge> —
            {canFullControl(CURRENT_ROLE) ? " acesso completo: criar/modificar equipes e atribuir qualquer cargo." :
              canManageTeam(CURRENT_ROLE) ? " pode adicionar/remover membros e atribuir tarefas." :
                " apenas visualizar, adicionar arquivos e acompanhar produtos."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {mockTeams.map(team => (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team.id)}
              className={"p-5 rounded-3xl border-2 transition-all text-left " + (selectedTeam === team.id ? "border-primary bg-surface-mid" : "border-surface-mid bg-surface-low hover:border-surface-high")}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">{team.avatar}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{team.name}</p>
                  <p className="text-xs text-muted-foreground">{team.company}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{team.memberCount} membros</span>
                <Badge className={"text-xs " + (team.privacy === "Privado" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400")}>{team.privacy}</Badge>
              </div>
            </button>
          ))}
        </div>

        <div className="bg-surface-low rounded-3xl border border-surface-mid overflow-hidden">
          <div className="p-5 border-b border-surface-mid flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">{currentTeam.avatar}</div>
            <div>
              <h2 className="font-bold text-foreground">{currentTeam.name}</h2>
              <p className="text-xs text-muted-foreground">{currentTeam.company}</p>
            </div>
          </div>
          <div className="p-4 md:p-6">
            <Tabs defaultValue="members" className="w-full">
              <TabsList asChild>
                <div className="grid grid-cols-5 gap-2 mb-5">
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
                {canManageTeam(CURRENT_ROLE) && (
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
                          <Input placeholder="Email do membro" className="bg-surface-mid border-0 rounded-xl text-sm" />
                          <select className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                            {(canFullControl(CURRENT_ROLE) ? ALL_ROLES : TEAM_ROLES).map(r => <option key={r}>{r}</option>)}
                          </select>
                          <Button className="w-full rounded-xl bg-primary hover:bg-primary/80">Adicionar</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                {mockMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-mid hover:bg-surface-high transition-colors">
                    <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-xs flex-shrink-0">
                      {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <Badge className={"text-xs flex-shrink-0 " + getRoleColor(member.role)}>{member.role}</Badge>
                    {canManageTeam(CURRENT_ROLE) && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-red-400"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="bg-surface-mid rounded-2xl p-3 mt-2">
                  <p className="text-xs font-semibold text-foreground mb-2">Permissões por cargo</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">CEO / CFO / CMO / COO</span><span className="text-primary">Controle total</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Gerentes / Coordenadores</span><span className="text-purple-400">Membros + Tarefas</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Analistas / Técnicos / Assistentes</span><span className="text-blue-400">Visualizar + Arquivos</span></div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="projects" className="space-y-3">
                {canManageTeam(CURRENT_ROLE) && (
                  <div className="flex justify-end">
                    <Button size="sm" className="rounded-2xl bg-primary hover:bg-primary/80">
                      <Plus className="w-4 h-4 mr-1" />Vincular Produto
                    </Button>
                  </div>
                )}
                {mockProjects.map(p => (
                  <div key={p.id} className="bg-surface-mid rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.status}</p>
                      </div>
                      <span className="text-sm font-bold text-primary">{p.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: p.progress + "%" }} />
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4">
                {canManageTeam(CURRENT_ROLE) && (
                  <div className="flex justify-end">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="rounded-2xl bg-primary hover:bg-primary/80">
                          <Plus className="w-4 h-4 mr-1" />Nova Tarefa
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-surface-low border-surface-mid">
                        <DialogHeader><DialogTitle>Adicionar Tarefa</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <Input placeholder="Título da tarefa" className="bg-surface-mid border-0 rounded-xl text-sm" />
                          <select className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                            <option>Atribuir a...</option>
                            {mockMembers.map(m => <option key={m.id}>{m.name}</option>)}
                          </select>
                          <Input type="date" className="bg-surface-mid border-0 rounded-xl text-sm" />
                          <Button className="w-full rounded-xl bg-primary hover:bg-primary/80">Adicionar</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "A Fazer", tasks: todoTasks, color: "text-muted-foreground" },
                    { label: "Em Andamento", tasks: doingTasks, color: "text-primary", active: true },
                    { label: "Concluído", tasks: doneTasks, color: "text-green-400" },
                  ].map(col => (
                    <div key={col.label} className="bg-surface-mid rounded-2xl p-3">
                      <p className={"text-xs font-semibold mb-2 " + col.color}>{col.label}</p>
                      <div className="space-y-2">
                        {col.tasks.map(task => (
                          <div key={task.id} className={"p-2.5 bg-background rounded-xl " + (col.active ? "border-l-2 border-primary" : "")}>
                            <p className={"text-xs text-foreground mb-1 " + (col.label === "Concluído" ? "line-through opacity-60" : "")}>{task.title}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                              <span className="text-[10px] text-muted-foreground">{task.dueDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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
                  <div className="border-t border-background pt-3">
                    <p className="text-sm font-medium text-foreground mb-2">Compartilhamento entre empresas</p>
                    <p className="text-xs text-muted-foreground mb-3">Empresas parceiras podem ver informações, equipes e membros conforme configurado pelo CEO/C-Level.</p>
                    {canFullControl(CURRENT_ROLE) && (
                      <Button variant="outline" size="sm" className="rounded-xl text-primary border-primary/50">
                        <Plus className="w-3 h-3 mr-2" />Adicionar Empresa Parceira
                      </Button>
                    )}
                  </div>
                  <div className="border-t border-background pt-3">
                    <p className="text-sm font-medium text-foreground mb-2">Projetos Compartilhados</p>
                    {mockProjects.map(p => (
                      <label key={p.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4" disabled={!canFullControl(CURRENT_ROLE)} />
                        <span className="text-sm text-foreground">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                {canFullControl(CURRENT_ROLE) ? (
                  <>
                    <div className="bg-surface-mid rounded-2xl p-4 space-y-4">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1.5">Nome da Equipe</label>
                        <Input defaultValue={currentTeam.name} className="bg-background border-0 rounded-xl text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1.5">Empresa</label>
                        <Input defaultValue={currentTeam.company} className="bg-background border-0 rounded-xl text-sm" />
                      </div>
                      <Button className="w-full rounded-xl bg-primary hover:bg-primary/80">Salvar</Button>
                    </div>
                    <div className="bg-surface-mid rounded-2xl p-4 border border-red-500/20">
                      <p className="text-sm font-semibold text-red-400 mb-3">Zona de Perigo</p>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full rounded-xl text-red-400 border-red-500/30">Arquivar Equipe</Button>
                        <Button variant="outline" className="w-full rounded-xl text-red-400 border-red-500/30">Excluir Equipe</Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p className="text-sm">Apenas CEO, CFO, CMO ou COO podem alterar configurações da equipe.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
