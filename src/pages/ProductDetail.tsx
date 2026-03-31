import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Plus, Trash2, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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

interface ActivityItem {
  id: number;
  action: string;
  user: string;
  timestamp: string;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar: string;
}

interface TaskCard {
  id: number;
  emoji: string;
  title: string;
  description: string;
  points: number;
  status: "COMPLETA" | "ATIVA" | "BLOQUEADA" | "MILESTONE";
}

interface FileItem {
  id: number;
  name: string;
  size: string;
  date: string;
  type: string;
}

const mockActivity: ActivityItem[] = [
  { id: 1, action: "Briefing atualizado", user: "André Pereira", timestamp: "há 2h" },
  { id: 2, action: "Arquivo adicionado: Logo_v3.ai", user: "Mariana Silva", timestamp: "há 4h" },
  { id: 3, action: "Status alterado para Em Desenvolvimento", user: "Carlos Mendes", timestamp: "ontem" },
  { id: 4, action: "Novo membro adicionado: Ana Costa", user: "André Pereira", timestamp: "2 dias atrás" },
  { id: 5, action: "Projeto criado", user: "André Pereira", timestamp: "1 semana atrás" },
];

const mockTeam: TeamMember[] = [
  { id: 1, name: "André Pereira", role: "Gerente de Produto", avatar: "AP" },
  { id: 2, name: "Mariana Silva", role: "Designer", avatar: "MS" },
  { id: 3, name: "Carlos Mendes", role: "Desenvolvedor", avatar: "CM" },
  { id: 4, name: "Ana Costa", role: "Marketing", avatar: "AC" },
];

const mockTasks: TaskCard[] = [
  { id: 1, emoji: "🔍", title: "Definição de Mercado", description: "", points: 100, status: "COMPLETA" },
  { id: 2, emoji: "📈", title: "Tendências de Comportamento", description: "", points: 150, status: "COMPLETA" },
  { id: 3, emoji: "📝", title: "Tendências de Conteúdo", description: "", points: 120, status: "COMPLETA" },
  { id: 4, emoji: "🔎", title: "Análise de Concorrente", description: "", points: 200, status: "COMPLETA" },
  { id: 5, emoji: "📊", title: "Tendências de Marketing", description: "", points: 180, status: "COMPLETA" },
  { id: 6, emoji: "🧪", title: "Mecanismo e Tese de Marketing", description: "", points: 150, status: "COMPLETA" },
  { id: 7, emoji: "👥", title: "Definição Demográfica", description: "", points: 120, status: "COMPLETA" },
  { id: 8, emoji: "💰", title: "Precificação", description: "", points: 140, status: "COMPLETA" },
  { id: 9, emoji: "🔥", title: "Oferta No Brainer", description: "", points: 180, status: "COMPLETA" },
  { id: 10, emoji: "⚡", title: "Estrutura de Caixa Automático", description: "", points: 200, status: "ATIVA" },
  { id: 11, emoji: "📢", title: "Criando seus Anúncios", description: "", points: 150, status: "BLOQUEADA" },
  { id: 12, emoji: "🚀", title: "Ativando seus Ads", description: "", points: 300, status: "BLOQUEADA" },
  { id: 13, emoji: "🔧", title: "Otimizações e Ajustes", description: "", points: 0, status: "BLOQUEADA" },
  { id: 14, emoji: "✅", title: "Validação de Oferta", description: "", points: 0, status: "BLOQUEADA" },
  { id: 15, emoji: "🏆", title: "Operação 100k", description: "", points: 0, status: "MILESTONE" },
];

const mockFiles: FileItem[] = [
  { id: 1, name: "Briefing_v2.pdf", size: "2.4 MB", date: "Mar 28", type: "Briefing" },
  { id: 2, name: "Design_System.ai", size: "15.2 MB", date: "Mar 25", type: "Design" },
  { id: 3, name: "Contrato_Cliente.docx", size: "1.1 MB", date: "Mar 20", type: "Contratos" },
];

export default function ProductDetail() {
  const navigate = useNavigate();
  const [description, setDescription] = useState("Plataforma de delivery que conecta restaurantes e clientes");

  const getTaskColor = (status: TaskCard["status"]) => {
    switch (status) {
      case "COMPLETA": return "border-green-500/30 border-2";
      case "ATIVA": return "border-red-500/30 border-2";
      case "BLOQUEADA": return "border-surface-mid border";
      case "MILESTONE": return "border-amber-500/30 border-2";
      default: return "border-surface-mid border";
    }
  };

  const getStatusBadge = (status: TaskCard["status"]) => {
    const badges = {
      COMPLETA: { label: "COMPLETA", color: "bg-green-500/20 text-green-400" },
      ATIVA: { label: "ATIVA", color: "bg-red-500/20 text-red-400" },
      BLOQUEADA: { label: "BLOQUEADA", color: "bg-gray-500/20 text-gray-400" },
      MILESTONE: { label: "MILESTONE", color: "bg-amber-500/20 text-amber-400" },
    };
    const badge = badges[status];
    return <Badge className={"text-xs " + badge.color}>{badge.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/products")} className="rounded-2xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground font-sans">App Delivery</h1>
            <p className="text-sm text-muted-foreground mt-1">Mobile App - Em Desenvolvimento</p>
          </div>
        </div>

        <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <Badge className="bg-blue-500/20 text-blue-400">Mobile App</Badge>
              <Badge className="bg-yellow-500/20 text-yellow-400">Em Desenvolvimento</Badge>
            </div>
            <span className="text-sm font-medium text-primary">75% Completo</span>
          </div>
          <div className="w-full h-2 bg-surface-mid rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: "75%" }} />
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6 flex gap-2 border-b border-surface-mid overflow-x-auto pb-0">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Visão Geral</TabsTrigger>
            <TabsTrigger value="files" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Arquivos</TabsTrigger>
            <TabsTrigger value="identity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Identidade Visual</TabsTrigger>
            <TabsTrigger value="research" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Pesquisa</TabsTrigger>
            <TabsTrigger value="team" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Equipe</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Tarefas</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid">
              <h3 className="text-lg font-semibold text-foreground mb-4">Descrição</h3>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-surface-mid border-0 rounded-2xl min-h-32 text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid">
                <p className="text-sm text-muted-foreground mb-2">Progresso</p>
                <p className="text-2xl font-bold text-primary">75%</p>
              </div>
              <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid">
                <p className="text-sm text-muted-foreground mb-2">Data de Lançamento</p>
                <p className="text-lg font-bold text-foreground">15 de Abril</p>
              </div>
              <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid">
                <p className="text-sm text-muted-foreground mb-2">Orçamento</p>
                <p className="text-lg font-bold text-primary">R$ 45.000</p>
              </div>
            </div>
            <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid">
              <h3 className="text-lg font-semibold text-foreground mb-4">Atividade Recente</h3>
              <div className="space-y-3">
                {mockActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-surface-mid last:border-0">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{item.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.user} - {item.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar arquivos..." className="bg-surface-mid border-0 rounded-xl text-sm flex-1" />
              </div>
            </div>
            <div className="bg-surface-low rounded-3xl p-12 border-2 border-dashed border-surface-mid text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-foreground mb-1">Arraste arquivos aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground">Máximo 100 MB por arquivo</p>
            </div>
            <div className="bg-surface-low rounded-3xl overflow-hidden border border-surface-mid">
              <div className="grid grid-cols-12 gap-4 p-4 bg-surface-mid font-semibold text-sm text-muted-foreground">
                <div className="col-span-5">Nome</div>
                <div className="col-span-2">Tamanho</div>
                <div className="col-span-2">Data</div>
                <div className="col-span-3">Ações</div>
              </div>
              {mockFiles.map((file) => (
                <div key={file.id} className="grid grid-cols-12 gap-4 p-4 border-t border-surface-mid items-center hover:bg-surface-mid/50">
                  <div className="col-span-5">
                    <p className="text-sm text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.type}</p>
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">{file.size}</div>
                  <div className="col-span-2 text-sm text-muted-foreground">{file.date}</div>
                  <div className="col-span-3 flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Download className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="identity" className="space-y-6">
            <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid">
              <h3 className="text-lg font-semibold text-foreground mb-4">Logo</h3>
              <div className="border-2 border-dashed border-surface-mid rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Arraste sua logo aqui</p>
              </div>
            </div>
            <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid">
              <h3 className="text-lg font-semibold text-foreground mb-4">Paleta de Cores</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Cor Primária</label>
                  <div className="flex gap-2">
                    <input type="color" defaultValue="#91f78e" className="w-12 h-12 rounded-xl cursor-pointer" />
                    <Input value="#91f78e" className="bg-surface-mid border-0 rounded-xl text-sm" readOnly />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Cor Secundária</label>
                  <div className="flex gap-2">
                    <input type="color" defaultValue="#2563eb" className="w-12 h-12 rounded-xl cursor-pointer" />
                    <Input value="#2563eb" className="bg-surface-mid border-0 rounded-xl text-sm" readOnly />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Cor Accent</label>
                  <div className="flex gap-2">
                    <input type="color" defaultValue="#f59e0b" className="w-12 h-12 rounded-xl cursor-pointer" />
                    <Input value="#f59e0b" className="bg-surface-mid border-0 rounded-xl text-sm" readOnly />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid">
              <h3 className="text-lg font-semibold text-foreground mb-4">Tipografia</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Fonte de Títulos</label>
                  <Input value="Manrope" className="bg-surface-mid border-0 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Fonte de Corpo</label>
                  <Input value="Manrope" className="bg-surface-mid border-0 rounded-xl text-sm" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="research" className="space-y-6">
            <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar pesquisa..." className="bg-surface-mid border-0 rounded-xl text-sm flex-1" />
              </div>
              <div className="space-y-3 mb-6">
                {["Mercado", "Concorrentes", "Público-Alvo", "Tendências"].map((category) => (
                  <Badge key={category} variant="secondary" className="bg-surface-mid text-muted-foreground mr-2">{category}</Badge>
                ))}
              </div>
              <Textarea placeholder="Adicione suas notas de pesquisa aqui..." className="bg-surface-mid border-0 rounded-2xl min-h-32 text-sm mb-4" />
              <Button className="rounded-xl bg-primary hover:bg-primary/80 text-background">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Pesquisa
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Membros da Equipe</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="icon" className="rounded-2xl bg-primary hover:bg-primary/80"><Plus className="w-4 h-4" /></Button>
                  </DialogTrigger>
                  <DialogContent className="bg-surface-low border-surface-mid">
                    <DialogHeader><DialogTitle>Adicionar Membro</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <Input placeholder="Email do membro" className="bg-surface-mid border-0 rounded-xl" />
                      <Button className="w-full rounded-xl bg-primary hover:bg-primary/80">Adicionar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-3">
                {mockTeam.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 rounded-2xl bg-surface-mid hover:bg-surface-high transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-xs">{member.avatar}</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-red-400 hover:text-red-300">Remover</Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Total: <span className="text-primary font-semibold">{mockTasks.reduce((sum, t) => sum + t.points, 0)} PTS</span></p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockTasks.map((task) => (
                <div key={task.id} className={"bg-surface-low rounded-2xl p-4 " + getTaskColor(task.status) + " hover:bg-surface-mid transition-colors"}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{task.emoji}</span>
                    {getStatusBadge(task.status)}
                  </div>
                  <h4 className="font-semibold text-foreground text-sm mb-1">{task.title}</h4>
                  {task.points > 0 && <p className="text-xs text-primary font-medium">+{task.points} PTS</p>}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid">
              <h3 className="text-lg font-semibold text-foreground mb-6">Configurações do Projeto</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Nome do Projeto</label>
                  <Input value="App Delivery" className="bg-surface-mid border-0 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Tipo de Projeto</label>
                  <select className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                    <option>Mobile App</option>
                    <option>Website</option>
                    <option>E-commerce</option>
                    <option>SaaS</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Status</label>
                  <select className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                    <option>Em Desenvolvimento</option>
                    <option>Lançado</option>
                    <option>Pausado</option>
                    <option>Arquivado</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-surface-low rounded-3xl p-6 border border-red-500/20">
              <h3 className="text-lg font-semibold text-red-400 mb-4">Zona de Perigo</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full rounded-xl text-red-400 border-red-500/30 hover:bg-red-500/10">Arquivar Projeto</Button>
                <Button variant="outline" className="w-full rounded-xl text-red-400 border-red-500/30 hover:bg-red-500/10">Deletar Projeto</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
