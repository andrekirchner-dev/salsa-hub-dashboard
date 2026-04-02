import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ChevronDown, ChevronUp, Plus, ExternalLink,
  Copy, Check, Upload, FileText, Image, Users, Activity,
  Settings, ListTodo, Loader2, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  description?: string;
  status: string;
  product_code?: string;
  team_id?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority?: string;
  assignee_name?: string;
}

interface ProductFile {
  id: string;
  name: string;
  file_type: string;
  file_url: string;
  uploaded_at: string;
}

interface ActivityItem {
  id: string;
  action: string;
  user_name?: string;
  created_at: string;
}

interface SectionProps {
  id: string;
  icon: React.ElementType;
  title: string;
  badge?: number;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ATIVA: "bg-primary/20 text-primary border-primary/30",
  EM_ANDAMENTO: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  BLOQUEADA: "bg-red-500/20 text-red-400 border-red-500/30",
  COMPLETA: "bg-green-500/20 text-green-400 border-green-500/30",
};

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

export default function ProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<ProductFile[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<string[]>(["tasks"]);
  const [codeCopied, setCodeCopied] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");

  const toggleSection = (sid: string) =>
    setOpenSections((prev) => prev.includes(sid) ? prev.filter((s) => s !== sid) : [...prev, sid]);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setCurrentUserRole(profile?.role || "");
    }

    const [productRes, tasksRes, filesRes, activityRes] = await Promise.all([
      supabase.from("products").select("id, name, description, status, product_code, team_id").eq("id", id).single(),
      supabase.from("tasks").select("id, title, status, priority, profiles(name)").eq("product_id", id).neq("status", "COMPLETA").order("created_at", { ascending: false }).limit(30),
      supabase.from("product_files").select("id, name, file_type, file_url, created_at").eq("product_id", id).order("created_at", { ascending: false }),
      supabase.from("product_activity").select("id, action, created_at, profiles(name)").eq("product_id", id).order("created_at", { ascending: false }).limit(20),
    ]);

    if (productRes.data) setProduct(productRes.data);
    if (tasksRes.data) setTasks(tasksRes.data.map((t: any) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, assignee_name: t.profiles?.name })));
    if (filesRes.data) setFiles(filesRes.data.map((f: any) => ({ id: f.id, name: f.name, file_type: f.file_type, file_url: f.file_url, uploaded_at: new Date(f.created_at).toLocaleDateString("pt-BR") })));
    if (activityRes.data) setActivity(activityRes.data.map((a: any) => ({ id: a.id, action: a.action, user_name: a.profiles?.name, created_at: new Date(a.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) })));

    setLoading(false);
  }, [id]);

  useEffect(() => { loadProduct(); }, [loadProduct]);

  const copyProductCode = async () => {
    if (!product?.product_code) return;
    await navigator.clipboard.writeText(product.product_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const canManage = ["CEO", "CFO", "CMO", "COO", "Diretor", "Gerente", "Coordenador"].includes(currentUserRole);

  const activeTasks = tasks.filter((t) => t.status !== "COMPLETA");

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-center"><p className="text-muted-foreground mb-4">Produto não encontrado.</p><Button onClick={() => navigate("/products")} variant="outline" className="rounded-2xl">Voltar</Button></div></div>;

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/products")} className="w-9 h-9 rounded-2xl bg-surface-low border border-surface-mid flex items-center justify-center hover:bg-surface-mid transition-colors flex-shrink-0">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{product.name}</h1>
          {product.description && <p className="text-xs text-muted-foreground truncate">{product.description}</p>}
        </div>
        <Badge variant="outline" className={`text-xs rounded-full border ${product.status === "ativo" ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-surface-high text-muted-foreground"}`}>{product.status}</Badge>
      </div>

      {/* Tarefas */}
      <DrawerSection id="tasks" icon={ListTodo} title="Tarefas" badge={activeTasks.length} open={openSections.includes("tasks")} onToggle={toggleSection}>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhuma tarefa ativa.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-mid hover:bg-surface-high transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  {task.assignee_name && <p className="text-xs text-muted-foreground">{task.assignee_name}</p>}
                </div>
                {task.priority && <Badge variant="outline" className={`text-xs rounded-full border ${STATUS_COLORS[task.status] || ""}`}>{task.status}</Badge>}
                <button onClick={() => navigate(`/products/${id}/tasks/${task.id}`)} className="w-8 h-8 rounded-xl bg-surface-low hover:bg-primary/20 flex items-center justify-center transition-colors flex-shrink-0" title="Abrir tarefa">
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                </button>
              </div>
            ))}
          </div>
        )}
        {canManage && (
          <Button variant="outline" size="sm" className="mt-3 rounded-2xl border-primary/50 text-primary w-full gap-2">
            <Plus className="w-4 h-4" />Nova Tarefa
          </Button>
        )}
      </DrawerSection>

      {/* Arquivos */}
      <DrawerSection id="files" icon={Upload} title="Arquivos" badge={files.length} open={openSections.includes("files")} onToggle={toggleSection}>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhum arquivo enviado ainda.</p>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-mid">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.uploaded_at}</p>
                </div>
                <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-xl bg-surface-low hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                </a>
              </div>
            ))}
          </div>
        )}
        {canManage && (
          <Button variant="outline" size="sm" className="mt-3 rounded-2xl border-primary/50 text-primary w-full gap-2">
            <Upload className="w-4 h-4" />Enviar Arquivo
          </Button>
        )}
      </DrawerSection>

      {/* Documentos */}
      <DrawerSection id="docs" icon={FileText} title="Documentos" open={openSections.includes("docs")} onToggle={toggleSection}>
        <p className="text-sm text-muted-foreground text-center py-2">Nenhum documento adicionado.</p>
        {canManage && (
          <Button variant="outline" size="sm" className="mt-3 rounded-2xl border-primary/50 text-primary w-full gap-2">
            <Plus className="w-4 h-4" />Novo Documento
          </Button>
        )}
      </DrawerSection>

      {/* Identidade Visual */}
      <DrawerSection id="brand" icon={Image} title="Identidade Visual" open={openSections.includes("brand")} onToggle={toggleSection}>
        <p className="text-sm text-muted-foreground text-center py-2">Nenhum ativo de marca adicionado.</p>
        {canManage && (
          <Button variant="outline" size="sm" className="mt-3 rounded-2xl border-primary/50 text-primary w-full gap-2">
            <Upload className="w-4 h-4" />Enviar Ativo
          </Button>
        )}
      </DrawerSection>

      {/* Equipe */}
      <DrawerSection id="team" icon={Users} title="Equipe do Produto" open={openSections.includes("team")} onToggle={toggleSection}>
        <p className="text-sm text-muted-foreground text-center py-2">Nenhum membro atribuído diretamente.</p>
        {canManage && (
          <Button variant="outline" size="sm" className="mt-3 rounded-2xl border-primary/50 text-primary w-full gap-2">
            <Plus className="w-4 h-4" />Adicionar Membro
          </Button>
        )}
      </DrawerSection>

      {/* Atividade Recente */}
      <DrawerSection id="activity" icon={Activity} title="Atividade Recente" badge={activity.length} open={openSections.includes("activity")} onToggle={toggleSection}>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhuma atividade registrada.</p>
        ) : (
          <div className="space-y-3">
            {activity.map((a) => (
              <div key={a.id} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.user_name && `${a.user_name} · `}{a.created_at}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DrawerSection>

      {/* Configurações */}
      {canManage && (
        <DrawerSection id="settings" icon={Settings} title="Configurações" open={openSections.includes("settings")} onToggle={toggleSection}>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nome do produto</Label>
              <Input defaultValue={product.name} className="bg-surface-mid border-surface-high rounded-2xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Descrição</Label>
              <Input defaultValue={product.description || ""} placeholder="Descrição do produto" className="bg-surface-mid border-surface-high rounded-2xl" />
            </div>

            {/* Código do Produto */}
            <div className="border-t border-surface-mid pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Código do Produto</p>
              {product.product_code ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-surface-mid rounded-2xl p-3">
                    <code className="flex-1 text-sm font-mono tracking-widest text-primary">{product.product_code}</code>
                    <button onClick={copyProductCode} className="w-8 h-8 rounded-xl hover:bg-surface-high flex items-center justify-center transition-colors flex-shrink-0">
                      {codeCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Compartilhe este código com outras equipes. Elas podem entrar no produto via "Novo Produto" → "Entrar com código".
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Código não gerado.</p>
              )}
            </div>

            <div className="border-t border-surface-mid pt-3">
              <button className="w-full py-2.5 text-sm text-red-400 border border-red-500/30 rounded-2xl hover:bg-red-500/10 transition-colors">
                Arquivar Produto
              </button>
            </div>
          </div>
        </DrawerSection>
      )}
    </div>
  );
}
