import { useState } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface TeamData {
  id: number;
  name: string;
  company: string;
  memberCount: number;
  privacy: "Privado" | "Compartilhado";
  avatar: string;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: "Gerente" | "Membro" | "Visualizador";
  joinedDate: string;
}

interface Project {
  id: number;
  name: string;
  status: string;
  progress: number;
}

interface TaskItem {
  id: number;
  title: string;
  column: "todo" | "doing" | "done";
  assignee: string;
  dueDate: string;
}

const mockTeams: TeamData[] = [
  { id: 1, name: "Salsa Digital", company: "Salsa Digital", memberCount: 6, privacy: "Privado", avatar: "SD" },
  { id: 2, name: "Agência Parceira X", company: "Agência X", memberCount: 4, privacy: "Compartilhado", avatar: "AP" },
];

const mockMembers: TeamMember[] = [
  { id: 1, name: "André Pereira", email: "andre@salsahub.com", role: "Gerente", joinedDate: "Jan 2024" },
  { id: 2, name: "Mariana Silva", email: "mariana@salsahub.com", role: "Membro", joinedDate: "Feb 2024" },
  { id: 3, name: "Carlos Mendes", email: "carlos@salsahub.com", role: "Membro", joinedDate: "Feb 2024" },
  { id: 4, name: "Ana Costa", email: "ana@salsahub.com", role: "Visualizador", joinedDate: "Mar 2024" },
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

const getRoleColor = (role: string) => {
  switch (role) {
    case "Gerente": return "bg-purple-500/20 text-purple-400";
    case "Membro": return "bg-blue-500/20 text-blue-400";
    case "Visualizador": return "bg-gray-500/20 text-gray-400";
    default: return "bg-gray-500/20 text-gray-400";
  }
};

export default function Team() {
  const [selectedTeam, setSelectedTeam] = useState<number>(1);
  const [tasks] = useState<TaskItem[]>(mockTasks);

  const currentTeam = mockTeams.find((t) => t.id === selectedTeam);
  const todoTasks = tasks.filter((t) => t.column === "todo");
  const doingTasks = tasks.filter((t) => t.column === "doing");
  const doneTasks = tasks.filter((t) => t.column === "done");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground font-sans">Equipe</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
                <Plus className="w-4 h-4 mr-2" />
                Criar Equipe
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-surface-low border-surface-mid">
              <DialogHeader><DialogTitle>Criar Nova Equipe</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Nome da Equipe</label>
                  <Input placeholder="ex: Marketing Digital" className="bg-surface-mid border-0 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Empresa</label>
                  <Input placeholder="ex: Salsa Digital" className="bg-surface-mid border-0 rounded-xl text-sm" />
                </div>
                <Button className="w-full rounded-xl bg-primary hover:bg-primary/80">Criar Equipe</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 font-sans">Minhas Equipes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team.id)}
                className={"p-6 rounded-3xl border-2 transition-all text-left " + (selectedTeam === team.id ? "border-primary bg-surface-mid" : "border-surface-mid bg-surface-low hover:border-surface-high")}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold">{team.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{team.name}</h3>
                    <p className="text-xs text-muted-foreground">{team.company}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{team.memberCount} membros</span>
                  <Badge variant="secondary" className={"text-xs " + (team.privacy === "Privado" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400")}>{team.privacy}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        {currentTeam && (
          <div className="bg-surface-low rounded-3xl border border-surface-mid overflow-hidden">
            <div className="p-6 md:p-8 border-b border-surface-mid">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl">{currentTeam.avatar}</div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{currentTeam.name}</h2>
                  <p className="text-muted-foreground">{currentTeam.company}</p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <Tabs defaultValue="members" className="w-full">
                <TabsList className="mb-6 flex gap-2 border-b border-surface-mid overflow-x-auto pb-0">
                  <TabsTrigger value="members" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Membros</TabsTrigger>
                  <TabsTrigger value="projects" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Projetos</TabsTrigger>
                  <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Tarefas</TabsTrigger>
                  <TabsTrigger value="privacy" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Privacidade</TabsTrigger>
                  <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Configurações</TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Membros da Equipe</h3>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="icon" className="rounded-2xl bg-primary hover:bg-primary/80"><Plus className="w-4 h-4" /></Button>
                      </DialogTrigger>
                      <DialogContent className="bg-surface-low border-surface-mid">
                        <DialogHeader><DialogTitle>Adicionar Membro</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <Input placeholder="Email do membro" className="bg-surface-mid border-0 rounded-xl text-sm" />
                          <select className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                            <option>Membro</option>
                            <option>Gerente</option>
                            <option>Visualizador</option>
                          </select>
                          <Button className="w-full rounded-xl bg-primary hover:bg-primary/80">Adicionar</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="space-y-3">
                    {mockMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 rounded-2xl bg-surface-mid hover:bg-surface-high transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-xs">{member.name.split(" ").map((n) => n[0]).join("")}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                          <Badge variant="secondary" className={"text-xs flex-shrink-0 " + getRoleColor(member.role)}>{member.role}</Badge>
                        </div>
                        <div className="flex gap-2 ml-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Edit2 className="w-4 h-4 text-muted-foreground" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-surface-mid rounded-2xl">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Matriz de Permissões</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Gerentes podem:</span><span className="text-primary">Editar tudo</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Membros podem:</span><span className="text-primary">Editar projetos e tarefas</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Visualizadores podem:</span><span className="text-primary">Apenas visualizar</span></div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="projects" className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Projetos Vinculados</h3>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="icon" className="rounded-2xl bg-primary hover:bg-primary/80"><Plus className="w-4 h-4" /></Button>
                      </DialogTrigger>
                      <DialogContent className="bg-surface-low border-surface-mid">
                        <DialogHeader><DialogTitle>Vincular Produto</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <select className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                            <option>Selecione um produto...</option>
                            <option>App Delivery</option>
                            <option>Salsa Store</option>
                          </select>
                          <Button className="w-full rounded-xl bg-primary hover:bg-primary/80">Vincular</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="space-y-3">
                    {mockProjects.map((project) => (
                      <div key={project.id} className="p-4 rounded-2xl bg-surface-mid hover:bg-surface-high transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-foreground">{project.name}</h4>
                            <p className="text-xs text-muted-foreground">{project.status}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs bg-surface-high text-muted-foreground">{project.progress}%</Badge>
                        </div>
                        <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: project.progress + "%" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="tasks" className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Kanban</h3>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="icon" className="rounded-2xl bg-primary hover:bg-primary/80"><Plus className="w-4 h-4" /></Button>
                      </DialogTrigger>
                      <DialogContent className="bg-surface-low border-surface-mid">
                        <DialogHeader><DialogTitle>Adicionar Tarefa</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <Input placeholder="Título da tarefa" className="bg-surface-mid border-0 rounded-xl text-sm" />
                          <select className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                            <option>Atribuir a...</option>
                            {mockMembers.map((m) => (<option key={m.id}>{m.name}</option>))}
                          </select>
                          <Input type="date" className="bg-surface-mid border-0 rounded-xl text-sm" />
                          <Button className="w-full rounded-xl bg-primary hover:bg-primary/80">Adicionar</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-surface-mid rounded-2xl p-4">
                      <h4 className="font-semibold text-foreground mb-3 text-sm">A Fazer</h4>
                      <div className="space-y-2">
                        {todoTasks.map((task) => (
                          <div key={task.id} className="p-3 bg-background rounded-xl hover:bg-surface-high transition-colors">
                            <p className="text-sm text-foreground mb-2">{task.title}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{task.assignee}</span>
                              <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-surface-mid rounded-2xl p-4">
                      <h4 className="font-semibold text-foreground mb-3 text-sm">Em Andamento</h4>
                      <div className="space-y-2">
                        {doingTasks.map((task) => (
                          <div key={task.id} className="p-3 bg-background rounded-xl border-l-2 border-primary hover:bg-surface-high transition-colors">
                            <p className="text-sm text-foreground mb-2">{task.title}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{task.assignee}</span>
                              <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-surface-mid rounded-2xl p-4">
                      <h4 className="font-semibold text-foreground mb-3 text-sm">Concluído</h4>
                      <div className="space-y-2">
                        {doneTasks.map((task) => (
                          <div key={task.id} className="p-3 bg-background rounded-xl opacity-60 hover:bg-surface-high transition-colors">
                            <p className="text-sm text-foreground mb-2 line-through">{task.title}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{task.assignee}</span>
                              <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="privacy" className="space-y-4">
                  <div className="p-4 bg-surface-mid rounded-2xl">
                    <h4 className="font-semibold text-foreground mb-4">Configurações de Privacidade</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Equipe Privada</p>
                          <p className="text-xs text-muted-foreground">Apenas membros podem acessar</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-4 h-4" />
                      </div>
                      <div className="border-t border-background pt-4">
                        <p className="text-sm font-medium text-foreground mb-3">Equipes com Acesso</p>
                        <Button variant="outline" size="sm" className="rounded-xl text-primary border-primary/50">
                          <Plus className="w-3 h-3 mr-2" />
                          Adicionar Equipe
                        </Button>
                      </div>
                      <div className="border-t border-background pt-4">
                        <p className="text-sm font-medium text-foreground mb-3">Projetos Compartilhados</p>
                        <div className="space-y-2">
                          {mockProjects.map((project) => (
                            <label key={project.id} className="flex items-center gap-3 text-sm cursor-pointer">
                              <input type="checkbox" className="w-4 h-4" />
                              <span className="text-foreground">{project.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div className="p-4 bg-surface-mid rounded-2xl space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-2">Nome da Equipe</label>
                      <Input value={currentTeam.name} className="bg-background border-0 rounded-xl text-sm" readOnly />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground block mb-2">Empresa</label>
                      <Input value={currentTeam.company} className="bg-background border-0 rounded-xl text-sm" readOnly />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground block mb-2">Cor do Avatar</label>
                      <input type="color" defaultValue="#91f78e" className="w-12 h-12 rounded-xl cursor-pointer" />
                    </div>
                    <div className="border-t border-background pt-4">
                      <Button variant="outline" className="w-full rounded-xl text-foreground border-surface-high hover:bg-surface-high">Transferir Gerência</Button>
                    </div>
                  </div>
                  <div className="p-4 bg-surface-mid rounded-2xl border border-red-500/20">
                    <h4 className="text-sm font-semibold text-red-400 mb-3">Zona de Perigo</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full rounded-xl text-red-400 border-red-500/30 hover:bg-red-500/10">Arquivar Equipe</Button>
                      <Button variant="outline" className="w-full rounded-xl text-red-400 border-red-500/30 hover:bg-red-500/10">Excluir Equipe</Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
