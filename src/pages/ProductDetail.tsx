import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronDown, ChevronUp, Upload, Plus, Trash2, Download,
  FileText, Image, File, CheckSquare, FolderOpen, BookOpen,
  Palette, Search, Users, Activity, Settings, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ActivityItem { id: number; action: string; user: string; timestamp: string; }
interface TeamMember { id: number; name: string; role: string; avatar: string; }
interface TaskCard { id: number; title: string; status: "COMPLETA" | "ATIVA" | "BLOQUEADA" | "MILESTONE"; }
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
  { id: 1, title: "Definição de Mercado", status: "COMPLETA" },
  { id: 2, title: "Tendências de Comportamento", status: "COMPLETA" },
  { id: 3, title: "Tendências de Conteúdo", status: "COMPLETA" },
  { id: 4, title: "Análise de Concorrente", status: "COMPLETA" },
  { id: 5, title: "Tendências de Marketing", status: "COMPLETA" },
  { id: 6, title: "Mecanismo e Tese de Marketing", status: "COMPLETA" },
  { id: 7, title: "Definição Demográfica", status: "COMPLETA" },
  { id: 8, title: "Precificação", status: "COMPLETA" },
  { id: 9, title: "Oferta No Brainer", status: "COMPLETA" },
  { id: 10, title: "Estrutura de Caixa Automático", status: "ATIVA" },
  { id: 11, title: "Criando seus Anúncios", status: "BLOQUEADA" },
  { id: 12, title: "Ativando seus Ads", status: "BLOQUEADA" },
  { id: 13, title: "Otimizações e Ajustes", status: "BLOQUEADA" },
  { id: 14, title: "Validação de Oferta", status: "BLOQUEADA" },
  { id: 15, title: "Operação 100k", status: "MILESTONE" },
];

const mockFiles: FileItem[] = [
  { id: 1, name: "Briefing_v2.pdf", size: "2.4 MB", date: "Mar 28", type: "Briefing", icon: "pdf" },
  { id: 2, name: "Design_System.ai", size: "15.2 MB", date: "Mar 25", type: "Design", icon: "img" },
  { id: 3, name: "Contrato_Cliente.docx", size: "1.1 MB", date: "Mar 20", type: "Contrato", icon: "doc" },
];

const getTaskStyle = (status: TaskCard["status"]) => {
  switch (status) {
    case "COMPLETA": return { border: "border-l-4 border-green-500", badge: "bg-green-500/20 text-green-400", label: "COMPLETA" };
    case "ATIVA":    return { border: "border-l-4 border-primary",    badge: "bg-primary/20 text-primary",      label: "ATIVA" };
    case "BLOQUEADA":return { border: "border-l-4 border-gray-600",   badge: "bg-gray-500/20 text-gray-400",    label: "BLOQUEADA" };
    case "MILESTONE":return { border: "border-l-4 border-amber-500",  badge: "bg-amber-500/20 text-amber-400",  label: "MILESTONE" };
  }
};
// ─── Drawer Section Component ───────────────────────────────────────────────
interface SectionProps {
  id: string;
  icon: React.ElementType;
  title: string;
  badge?: string | number;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

function DrawerSection({ id, icon: Icon, title, badge, open, onToggle, children }: SectionProps) {
  return (
    <div className="bg-surface-low rounded-3xl border border-surface-mid overflow-hidden mb-3">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-mid transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-2xl bg-surface-high flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground">{title}</span>
          {badge !== undefined && !open && (
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-surface-mid pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ProductDetail() {
  const navigate = useNavigate();
  const [description, setDescription] = useState(
    "Plataforma de delivery que conecta restaurantes e clientes com rastreamento em tempo real."
  );
  const [openSections, setOpenSections] = useState<string[]>(["tasks"]);

  const toggleSection = (id: string) =>
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );

  const isOpen = (id: string) => openSections.includes(id);

  const activeTasks = mockTasks.filter(t => t.status === "ATIVA").length;
  const pendingTasks = mockTasks.filter(t => t.status === "BLOQUEADA").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/products")}
            className="p-2 rounded-xl hover:bg-surface-mid transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground font-sans truncate">App Delivery</h1>
            <p className="text-xs text-muted-foreground">Mobile App • Em Desenvolvimento</p>
          </div>
        </div>

        {/* Progress banner */}
        <div className="bg-surface-low rounded-3xl p-5 border border-surface-mid mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-blue-500/20 text-blue-400 text-xs">Mobile App</Badge>
              <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Em Desenvolvimento</Badge>
            </div>
            <span className="text-sm font-bold text-primary">75%</span>
          </div>
          <div className="w-full h-2 bg-surface-mid rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: "75%" }} />
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

        {/* Description — always visible */}
        <div className="bg-surface-low rounded-3xl p-5 border border-surface-mid mb-6">
          <h3 className="font-semibold text-foreground mb-3">Descrição</h3>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="bg-surface-mid border-0 rounded-2xl min-h-20 text-sm"
          />
        </div>

        {/* ── Drawer Sections ── */}

        {/* TAREFAS */}
        <DrawerSection
          id="tasks"
          icon={CheckSquare}
          title="Tarefas"
          badge={activeTasks + pendingTasks}
          open={isOpen("tasks")}
          onToggle={toggleSection}
        >
          <div className="space-y-2">
            {mockTasks.map(task => {
              const s = getTaskStyle(task.status);
              return (
                <div
                  key={task.id}
                  className={"flex items-center justify-between p-3 bg-surface-mid rounded-2xl " + s.border}
                >
                  <p className="text-sm text-foreground flex-1 pr-3">{task.title}</p>
                  <Badge className={"text-[10px] px-2 py-0.5 flex-shrink-0 " + s.badge}>{s.label}</Badge>
                </div>
              );
            })}
          </div>
        </DrawerSection>

        {/* ARQUIVOS */}
        <DrawerSection
          id="files"
          icon={FolderOpen}
          title="Arquivos"
          badge={mockFiles.length}
          open={isOpen("files")}
          onToggle={toggleSection}
        >
          <div className="bg-surface-mid rounded-2xl p-8 border-2 border-dashed border-surface-high text-center mb-3 hover:border-primary/50 transition-colors cursor-pointer">
            <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-foreground">Arraste arquivos ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-1">Máximo 100 MB por arquivo</p>
          </div>
          <div className="space-y-2">
            {mockFiles.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-surface-mid rounded-2xl hover:bg-surface-high transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-surface-high flex items-center justify-center flex-shrink-0">
                  {file.icon === "pdf" ? <FileText className="w-4 h-4 text-red-400" /> :
                   file.icon === "img" ? <Image className="w-4 h-4 text-blue-400" /> :
                   <File className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{file.size} · {file.type} · {file.date}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DrawerSection>

        {/* DOCUMENTOS */}
        <DrawerSection
          id="docs"
          icon={BookOpen}
          title="Documentos"
          open={isOpen("docs")}
          onToggle={toggleSection}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">Contratos, NDA, propostas e documentos estratégicos.</p>
            <label className="cursor-pointer flex items-center gap-1.5 text-xs text-primary hover:underline">
              <Plus className="w-3.5 h-3.5" />
              Anexar
              <input type="file" className="sr-only" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
            </label>
          </div>
          <div className="bg-surface-mid rounded-2xl p-8 border-2 border-dashed border-surface-high text-center hover:border-primary/50 transition-colors cursor-pointer">
            <FileText className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-foreground">Arraste documentos aqui</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, PowerPoint</p>
          </div>
        </DrawerSection>

        {/* IDENTIDADE VISUAL */}
        <DrawerSection
          id="identity"
          icon={Palette}
          title="Identidade Visual"
          open={isOpen("identity")}
          onToggle={toggleSection}
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Logo</p>
              <div className="border-2 border-dashed border-surface-high rounded-2xl p-6 text-center hover:border-primary/50 cursor-pointer">
                <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Arraste sua logo aqui</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-3 font-medium">Paleta de Cores</p>
              <div className="grid grid-cols-3 gap-3">
                {[["Primária", "#91f78e"], ["Secundária", "#2563eb"], ["Accent", "#f59e0b"]].map(([label, color]) => (
                  <div key={label}>
                    <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
                    <div className="flex gap-2 items-center">
                      <input type="color" defaultValue={color} className="w-8 h-8 rounded-lg cursor-pointer border-0" />
                      <span className="text-xs text-muted-foreground">{color}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Tipografia</p>
              <div className="grid grid-cols-2 gap-3">
                {["Títulos", "Corpo"].map(t => (
                  <div key={t}>
                    <p className="text-[10px] text-muted-foreground mb-1">{t}</p>
                    <Input value="Manrope" className="bg-surface-mid border-0 rounded-xl text-sm" readOnly />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DrawerSection>

        {/* PESQUISA */}
        <DrawerSection
          id="research"
          icon={Search}
          title="Pesquisa de Mercado"
          open={isOpen("research")}
          onToggle={toggleSection}
        >
          <div className="flex flex-wrap gap-2 mb-3">
            {["Mercado", "Concorrentes", "Público-Alvo", "Tendências"].map(c => (
              <Badge key={c} variant="secondary" className="bg-surface-mid text-muted-foreground text-xs">{c}</Badge>
            ))}
          </div>
          <Textarea
            placeholder="Adicione suas notas de pesquisa aqui..."
            className="bg-surface-mid border-0 rounded-2xl min-h-28 text-sm mb-3"
          />
          <Button className="rounded-xl bg-primary hover:bg-primary/80 text-background text-sm">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Pesquisa
          </Button>
        </DrawerSection>

        {/* EQUIPE */}
        <DrawerSection
          id="team"
          icon={Users}
          title="Equipe do Produto"
          badge={mockTeam.length}
          open={isOpen("team")}
          onToggle={toggleSection}
        >
          <div className="flex justify-end mb-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-2xl bg-primary hover:bg-primary/80 text-sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
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
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-surface-mid hover:bg-surface-high transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-xs flex-shrink-0">
                  {member.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-red-400 flex-shrink-0">
                  Remover
                </Button>
              </div>
            ))}
          </div>
        </DrawerSection>

        {/* ATIVIDADE */}
        <DrawerSection
          id="activity"
          icon={Activity}
          title="Atividade Recente"
          badge={mockActivity.length}
          open={isOpen("activity")}
          onToggle={toggleSection}
        >
          <div className="space-y-3">
            {mockActivity.map(item => (
              <div
                key={item.id}
                className="flex items-start gap-3 pb-3 border-b border-surface-mid last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{item.action}</p>
                  <p className="text-xs text-muted-foreground">{item.user} · {item.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </DrawerSection>

        {/* CONFIGURAÇÕES */}
        <DrawerSection
          id="settings"
          icon={Settings}
          title="Configurações do Projeto"
          open={isOpen("settings")}
          onToggle={toggleSection}
        >
          <div className="space-y-4">
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
            <Button className="w-full rounded-xl bg-primary hover:bg-primary/80 text-sm">Salvar Alterações</Button>
          </div>
          <div className="mt-4 p-4 rounded-2xl border border-red-500/20 space-y-2">
            <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Zona de Perigo
            </p>
            <Button variant="outline" className="w-full rounded-xl text-red-400 border-red-500/30 text-sm">
              Arquivar Projeto
            </Button>
            <Button variant="outline" className="w-full rounded-xl text-red-400 border-red-500/30 text-sm">
              Deletar Projeto
            </Button>
          </div>
        </DrawerSection>

      </div>
    </div>
  );
}
