import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Plus, Trash2, Download, Search, FileText, Image, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ActivityItem { id: number; action: string; user: string; timestamp: string; }
interface TeamMember { id: number; name: string; role: string; avatar: string; }
interface TaskCard { id: number; emoji: string; title: string; points: number; status: "COMPLETA" | "ATIVA" | "BLOQUEADA" | "MILESTONE"; }
interface FileItem { id: number; name: string; size: string; date: string; type: string; icon: string; }

const mockActivity: ActivityItem[] = [
  { id: 1, action: "Briefing atualizado", user: "André Pereira", timestamp: "há 2h" },
  { id: 2, action: "Arquivo adicionado: Logo_v3.ai", user: "Mariana Silva", timestamp: "há 4h" },
  { id: 3, action: "Status alterado para Em Desenvolvimento", user: "Carlos Mendes", timestamp: "ontem" },
];

const mockTeam: TeamMember[] = [
  { id: 1, name: "André Pereira", role: "Gerente de Produto", avatar: "AP" },
  { id: 2, name: "Mariana Silva", role: "Designer", avatar: "MS" },
  { id: 3, name: "Carlos Mendes", role: "Desenvolvedor", avatar: "CM" },
  { id: 4, name: "Ana Costa", role: "Marketing", avatar: "AC" },
];

const mockTasks: TaskCard[] = [
  { id: 1, emoji: "🔍", title: "Definição de Mercado", points: 100, status: "COMPLETA" },
  { id: 2, emoji: "📈", title: "Tendências de Comportamento", points: 150, status: "COMPLETA" },
  { id: 3, emoji: "📝", title: "Tendências de Conteúdo", points: 120, status: "COMPLETA" },
  { id: 4, emoji: "🔎", title: "Análise de Concorrente", points: 200, status: "COMPLETA" },
  { id: 5, emoji: "📊", title: "Tendências de Marketing", points: 180, status: "COMPLETA" },
  { id: 6, emoji: "🧪", title: "Mecanismo e Tese de Marketing", points: 150, status: "COMPLETA" },
  { id: 7, emoji: "👥", title: "Definição Demográfica", points: 120, status: "COMPLETA" },
  { id: 8, emoji: "💰", title: "Precificação", points: 140, status: "COMPLETA" },
  { id: 9, emoji: "🔥", title: "Oferta No Brainer", points: 180, status: "COMPLETA" },
  { id: 10, emoji: "⚡", title: "Estrutura de Caixa Automático", points: 200, status: "ATIVA" },
  { id: 11, emoji: "📢", title: "Criando seus Anúncios", points: 150, status: "BLOQUEADA" },
  { id: 12, emoji: "🚀", title: "Ativando seus Ads", points: 300, status: "BLOQUEADA" },
  { id: 13, emoji: "🔧", title: "Otimizações e Ajustes", points: 0, status: "BLOQUEADA" },
  { id: 14, emoji: "✅", title: "Validação de Oferta", points: 0, status: "BLOQUEADA" },
  { id: 15, emoji: "🏆", title: "Operação 100k", points: 0, status: "MILESTONE" },
];

const mockFiles: FileItem[] = [
  { id: 1, name: "Briefing_v2.pdf", size: "2.4 MB", date: "Mar 28", type: "Briefing", icon: "pdf" },
  { id: 2, name: "Design_System.ai", size: "15.2 MB", date: "Mar 25", type: "Design", icon: "img" },
  { id: 3, name: "Contrato_Cliente.docx", size: "1.1 MB", date: "Mar 20", type: "Contrato", icon: "doc" },
];

const tabItems = [
  { value: "overview", label: "Visão Geral", emoji: "📋" },
  { value: "tasks", label: "Tarefas", emoji: "✅" },
  { value: "files", label: "Arquivos", emoji: "📁" },
  { value: "docs", label: "Documentos", emoji: "📄" },
  { value: "identity", label: "Identidade", emoji: "🎨" },
  { value: "research", label: "Pesquisa", emoji: "🔍" },
  { value: "team", label: "Equipe", emoji: "👥" },
  { value: "settings", label: "Config.", emoji: "⚙️" },
];

const getTaskStyle = (status: TaskCard["status"]) => {
  switch (status) {
    case "COMPLETA": return { border: "border-green-500/40 border-2", badge: "bg-green-500/20 text-green-400", label: "COMPLETA" };
    case "ATIVA": return { border: "border-primary/60 border-2", badge: "bg-primary/20 text-primary", label: "ATIVA" };
    case "BLOQUEADA": return { border: "border-surface-mid border", badge: "bg-gray-500/20 text-gray-400", label: "BLOQUEADA" };
    case "MILESTONE": return { border: "border-amber-500/40 border-2", badge: "bg-amber-500/20 text-amber-400", label: "MILESTONE" };
  }
};
export default function ProductDetail() {
  const navigate = useNavigate();
  const [description, setDescription] = useState("Plataforma de delivery que conecta restaurantes e clientes com rastreamento em tempo real.");
  const totalPts = mockTasks.reduce((s, t) => s + t.points, 0);
  const donePts = mockTasks.filter(t => t.status === "COMPLETA").reduce((s, t) => s + t.points, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/products")} className="p-2 rounded-xl hover:bg-surface-mid transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground font-sans truncate">App Delivery</h1>
            <p className="text-xs text-muted-foreground">Mobile App • Em Desenvolvimento</p>
          </div>
        </div>

        {/* Progress banner */}
        <div className="bg-surface-low rounded-3xl p-5 border border-surface-mid mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-blue-500/20 text-blue-400 text-xs">Mobile App</Badge>
              <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Em Desenvolvimento</Badge>
            </div>
            <span className="text-sm font-bold text-primary">75%</span>
          </div>
          <div className="w-full h-2 bg-surface-mid rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: "75%" }} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Progresso</p>
              <p className="font-bold text-primary">75%</p>
            </div>
            <div className="text-center border-x border-surface-mid">
              <p className="text-xs text-muted-foreground">Data prevista de Lançamento</p>
              <p className="font-bold text-foreground text-sm">15 Abr</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Orçamento</p>
              <p className="font-bold text-primary">R$ 45k</p>
            </div>
          </div>
        </div>

        {/* Tab grid */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList asChild>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {tabItems.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex flex-col items-center gap-1 py-3 px-2 bg-surface-low border border-surface-mid rounded-2xl text-xs font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-background data-[state=active]:border-primary transition-all"
                >
                  <span className="text-base leading-none">{tab.emoji}</span>
                  <span className="leading-none">{tab.label}</span>
                </TabsTrigger>
              ))}
            </div>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="bg-surface-low rounded-3xl p-5 border border-surface-mid">
              <h3 className="font-semibold text-foreground mb-3">Descrição</h3>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-surface-mid border-0 rounded-2xl min-h-24 text-sm" />
            </div>
            <div className="bg-surface-low rounded-3xl p-5 border border-surface-mid">
              <h3 className="font-semibold text-foreground mb-3">Atividade Recente</h3>
              <div className="space-y-3">
                {mockActivity.map(item => (
                  <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-surface-mid last:border-0">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{item.action}</p>
                      <p className="text-xs text-muted-foreground">{item.user} · {item.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Pontos: <span className="text-primary font-bold">{donePts}</span>
                <span className="text-muted-foreground">/{totalPts}</span>
              </p>
              <div className="w-24 h-1.5 bg-surface-mid rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(donePts / totalPts) * 100}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mockTasks.map(task => {
                const s = getTaskStyle(task.status);
                return (
                  <div key={task.id} className={"bg-surface-low rounded-2xl p-4 hover:bg-surface-mid transition-colors " + s.border}>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xl">{task.emoji}</span>
                      <Badge className={"text-[10px] px-1.5 py-0.5 " + s.badge}>{s.label}</Badge>
                    </div>
                    <p className="font-semibold text-foreground text-sm mb-1">{task.title}</p>
                    {task.points > 0 && <p className="text-xs text-primary font-medium">+{task.points} PTS</p>}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <div className="bg-surface-low rounded-3xl p-10 border-2 border-dashed border-surface-mid text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-foreground">Arraste arquivos aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">Máximo 100 MB por arquivo</p>
            </div>
            <div className="space-y-2">
              {mockFiles.map(file => (
                <div key={file.id} className="bg-surface-low rounded-2xl p-4 border border-surface-mid flex items-center gap-3 hover:bg-surface-mid transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-surface-high flex items-center justify-center flex-shrink-0">
                    {file.icon === "pdf" ? <FileText className="w-5 h-5 text-red-400" /> :
                      file.icon === "img" ? <Image className="w-5 h-5 text-blue-400" /> :
                        <File className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.size} · {file.type} · {file.date}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Download className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="docs" className="space-y-4">
            <div className="bg-surface-low rounded-3xl p-5 border border-surface-mid">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Documentos Importantes</h3>
                <label className="cursor-pointer flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Plus className="w-3.5 h-3.5" />
                  Anexar
                  <input type="file" className="sr-only" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
                </label>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Contratos, NDA, propostas e documentos estratégicos do produto.</p>
              <div className="bg-surface-low rounded-3xl p-10 border-2 border-dashed border-surface-mid text-center hover:border-primary/50 transition-colors cursor-pointer">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-foreground">Arraste documentos aqui</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, PowerPoint</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="identity" className="space-y-4">
            <div className="bg-surface-low rounded-3xl p-5 border border-surface-mid">
              <h3 className="font-semibold text-foreground mb-3">Logo</h3>
              <div className="border-2 border-dashed border-surface-mid rounded-2xl p-8 text-center hover:border-primary/50 cursor-pointer">
                <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Arraste sua logo aqui</p>
              </div>
            </div>
            <div className="bg-surface-low rounded-3xl p-5 border border-surface-mid">
              <h3 className="font-semibold text-foreground mb-3">Paleta de Cores</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[["Primária", "#91f78e"], ["Secundária", "#2563eb"], ["Accent", "#f59e0b"]].map(([label, color]) => (
                  <div key={label}>
                    <label className="text-xs text-muted-foreground block mb-2">{label}</label>
                    <div className="flex gap-2">
                      <input type="color" defaultValue={color} className="w-10 h-10 rounded-xl cursor-pointer border-0" />
                      <Input value={color} className="bg-surface-mid border-0 rounded-xl text-sm" readOnly />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface-low rounded-3xl p-5 border border-surface-mid">
              <h3 className="font-semibold text-foreground mb-3">Tipografia</h3>
              <div className="grid grid-cols-2 gap-4">
                {["Títulos", "Corpo"].map(t => (
                  <div key={t}>
                    <label className="text-xs text-muted-foreground block mb-2">{t}</label>
                    <Input value="Manrope" className="bg-surface-mid border-0 rounded-xl text-sm" />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="research" className="space-y-4">
            <div className="bg-surface-low rounded-3xl p-5 border border-surface-mid">
              <div className="flex flex-wrap gap-2 mb-4">
                {["Mercado", "Concorrentes", "Público-Alvo", "Tendências"].map(c => (
                  <Badge key={c} variant="secondary" className="bg-surface-mid text-muted-foreground">{c}</Badge>
                ))}
              </div>
              <Textarea placeholder="Adicione suas notas de pesquisa aqui..." className="bg-surface-mid border-0 rounded-2xl min-h-28 text-sm mb-3" />
              <Button className="rounded-xl bg-primary hover:bg-primary/80 text-background">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Pesquisa
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <div className="bg-surface-low rounded-3xl p-5 border border-surface-mid">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Membros</h3>
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
              <div className="space-y-2">
                {mockTeam.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-mid hover:bg-surface-high transition-colors">
                    <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-xs">{member.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-red-400">Remover</Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="bg-surface-low rounded-3xl p-5 border border-surface-mid space-y-4">
              <h3 className="font-semibold text-foreground">Configurações do Projeto</h3>
              {[["Nome do Projeto", "App Delivery"], ["Data prevista de Lançamento", "15/04/2026"]].map(([label, val]) => (
                <div key={label}>
                  <label className="text-xs text-muted-foreground block mb-1.5">{label}</label>
                  <Input defaultValue={val} className="bg-surface-mid border-0 rounded-xl text-sm" />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Status</label>
                <select className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                  <option>Em Desenvolvimento</option>
                  <option>Lançado</option>
                  <option>Pausado</option>
                  <option>Arquivado</option>
                </select>
              </div>
            </div>
            <div className="bg-surface-low rounded-3xl p-5 border border-red-500/20">
              <h3 className="text-sm font-semibold text-red-400 mb-3">Zona de Perigo</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full rounded-xl text-red-400 border-red-500/30">Arquivar Projeto</Button>
                <Button variant="outline" className="w-full rounded-xl text-red-400 border-red-500/30">Deletar Projeto</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
