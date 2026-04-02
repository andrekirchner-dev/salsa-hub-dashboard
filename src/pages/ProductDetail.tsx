import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ChevronDown, ChevronUp, Upload, Plus, Trash2,
  FileText, Image, File, CheckSquare, FolderOpen,
  Palette, Users, Activity, Settings, Copy, Check,
  ExternalLink, Loader2, QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, orderBy, where, limit, serverTimestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/integrations/firebase/client";

interface Task {
  id: string; title: string; description?: string;
  status: "COMPLETA" | "ATIVA" | "BLOQUEADA" | "MILESTONE" | "PENDENTE";
  assignedTo?: string; assigneeName?: string;
}
interface FileItem { id: string; name: string; size: string; type: string; url?: string; uploadedAt: string; }
interface ActivityItem { id: string; action: string; userName: string; createdAt: string; }
interface TeamMember { id: string; name: string; role: string; avatarUrl?: string; }
interface Product { id: string; name: string; description: string; status: string; productCode: string; teamId?: string; }

const STATUS_STYLE: Record<string, { label: string; badge: string; border: string }> = {
  COMPLETA: { label: "Completa", badge: "bg-green-500/20 text-green-400 border-green-500/30", border: "border-l-4 border-green-500" },
  ATIVA: { label: "Ativa", badge: "bg-primary/20 text-primary border-primary/30", border: "border-l-4 border-primary" },
  PENDENTE: { label: "Pendente", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30", border: "border-l-4 border-blue-500" },
  BLOQUEADA: { label: "Bloqueada", badge: "bg-red-500/20 text-red-400 border-red-500/30", border: "border-l-4 border-red-500" },
  MILESTONE: { label: "Milestone", badge: "bg-purple-500/20 text-purple-400 border-purple-500/30", border: "border-l-4 border-purple-500" },
};
const FILE_ICONS: Record<string, React.ElementType> = { image: Image, pdf: FileText, doc: FileText, default: File };

interface SectionProps { id: string; icon: React.ElementType; title: string; badge?: number; open: boolean; onToggle: (id: string) => void; children: React.ReactNode; }

function DrawerSection({ id, icon: Icon, title, badge, open, onToggle, children }: SectionProps) {
  return (
    <div className="bg-surface-low rounded-3xl border border-surface-mid overflow-hidden mb-3">
      <button onClick={() => onToggle(id)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-mid transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-2xl bg-surface-high flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-primary" /></div>
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
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<string[]>(["tasks"]);
  const [codeCopied, setCodeCopied] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const toggleSection = (sid: string) =>
    setOpenSections((prev) => prev.includes(sid) ? prev.filter((s) => s !== sid) : [...prev, sid]);
  const isOpen = (sid: string) => openSections.includes(sid);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const user = getAuth().currentUser;
    if (user) {
      setCurrentUserId(user.uid);
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      setCurrentUserRole(profileSnap.data()?.role || "");
    }
    const productSnap = await getDoc(doc(db, "products", id));
    if (!productSnap.exists()) { setLoading(false); return; }
    const pData = productSnap.data();
    const productData: Product = {
      id: productSnap.id, name: pData.name, description: pData.description || "",
      status: pData.status || "ativo", productCode: pData.productCode || "", teamId: pData.teamId,
    };
    setProduct(productData); setEditName(productData.name); setEditDesc(productData.description);

    const tasksSnap = await getDocs(query(collection(db, "tasks"), where("productId", "==", id), orderBy("createdAt")));
    const tasksData: Task[] = [];
    for (const d of tasksSnap.docs) {
      const t = d.data();
      let assigneeName: string | undefined;
      if (t.assignedTo) { const aSnap = await getDoc(doc(db, "profiles", t.assignedTo)); assigneeName = aSnap.data()?.name; }
      tasksData.push({ id: d.id, title: t.title, description: t.description, status: t.status || "PENDENTE", assignedTo: t.assignedTo, assigneeName });
    }
    setTasks(tasksData);

    const filesSnap = await getDocs(query(collection(db, "productFiles"), where("productId", "==", id), orderBy("uploadedAt", "desc")));
    setFiles(filesSnap.docs.map((d) => {
      const f = d.data();
      return { id: d.id, name: f.name, size: f.size || "—", type: f.type || "default", url: f.url,
        uploadedAt: f.uploadedAt?.toDate ? f.uploadedAt.toDate().toLocaleDateString("pt-BR") : "—" };
    }));

    const activitySnap = await getDocs(query(collection(db, "productActivity"), where("productId", "==", id), orderBy("createdAt", "desc"), limit(20)));
    const activityData: ActivityItem[] = [];
    for (const d of activitySnap.docs) {
      const a = d.data();
      let userName = "—";
      if (a.userId) { const uSnap = await getDoc(doc(db, "profiles", a.userId)); userName = uSnap.data()?.name || "—"; }
      activityData.push({ id: d.id, action: a.action, userName,
        createdAt: a.createdAt?.toDate ? a.createdAt.toDate().toLocaleDateString("pt-BR") : "—" });
    }
    setActivity(activityData);

    if (productData.teamId) {
      const membersSnap = await getDocs(collection(db, "teams", productData.teamId, "members"));
      const membersData: TeamMember[] = [];
      for (const d of membersSnap.docs) {
        const mData = d.data(); const userId = mData.userId || d.id;
        const profileSnap = await getDoc(doc(db, "profiles", userId)); const pf = profileSnap.data();
        membersData.push({ id: userId, name: pf?.name || "—", role: mData.role || pf?.role || "—", avatarUrl: pf?.avatarUrl });
      }
      setTeamMembers(membersData);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadProduct(); }, [loadProduct]);

  const copyCode = () => {
    if (product?.productCode) {
      navigator.clipboard.writeText(product.productCode).then(() => { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); });
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !id || !currentUserId) return;
    setAddingTask(true);
    await addDoc(collection(db, "tasks"), { productId: id, title: newTaskTitle.trim(), status: "PENDENTE", createdBy: currentUserId, createdAt: serverTimestamp() });
    await addDoc(collection(db, "productActivity"), { productId: id, action: `Tarefa criada: ${newTaskTitle.trim()}`, userId: currentUserId, createdAt: serverTimestamp() });
    setNewTaskTitle(""); setAddingTask(false); loadProduct();
  };

  const handleSaveEdit = async () => {
    if (!id || !editName.trim()) return;
    setSavingEdit(true);
    await updateDoc(doc(db, "products", id), { name: editName.trim(), description: editDesc.trim(), updatedAt: serverTimestamp() });
    if (currentUserId) await addDoc(collection(db, "productActivity"), { productId: id, action: "Produto atualizado", userId: currentUserId, createdAt: serverTimestamp() });
    setSavingEdit(false); loadProduct();
  };

  const activeTasks = tasks.filter((t) => t.status === "ATIVA").length;
  const pendingTasks = tasks.filter((t) => t.status === "PENDENTE").length;
  const canEdit = ["CEO", "CFO", "CMO", "COO", "Diretor", "Gerente", "Coordenador"].includes(currentUserRole);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!product) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center"><p className="text-muted-foreground mb-4">Produto não encontrado.</p>
        <Button onClick={() => navigate("/products")} variant="outline" className="rounded-2xl">Voltar para Produtos</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/products")} className="w-9 h-9 rounded-2xl bg-surface-low border border-surface-mid flex items-center justify-center hover:bg-surface-mid transition-colors flex-shrink-0">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{product.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className={`text-xs rounded-full border capitalize ${product.status === "ativo" ? "border-green-500/30 text-green-400 bg-green-500/10" : product.status === "pausado" ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10" : "border-surface-high text-muted-foreground"}`}>{product.status}</Badge>
          </div>
        </div>
      </div>

      {product.description && (
        <div className="bg-surface-low border border-surface-mid rounded-3xl p-5 mb-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
        </div>
      )}

      <DrawerSection id="tasks" icon={CheckSquare} title="Tarefas" badge={activeTasks + pendingTasks} open={isOpen("tasks")} onToggle={toggleSection}>
        <div className="space-y-2 mb-3">
          {tasks.length === 0 ? <p className="text-sm text-muted-foreground text-center py-2">Nenhuma tarefa cadastrada.</p> : tasks.map((task) => {
            const s = STATUS_STYLE[task.status] || STATUS_STYLE.PENDENTE;
            return (
              <div key={task.id} className={`flex items-center justify-between p-3 bg-surface-mid rounded-2xl ${s.border}`}>
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm text-foreground truncate">{task.title}</p>
                  {task.assigneeName && <p className="text-xs text-muted-foreground mt-0.5">{task.assigneeName}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`text-[10px] px-2 py-0.5 border ${s.badge}`}>{s.label}</Badge>
                  <button onClick={() => navigate(`/products/${id}/tasks/${task.id}`)}
                    className="w-7 h-7 rounded-xl bg-surface-high hover:bg-primary/20 flex items-center justify-center transition-colors">
                    <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {canEdit && (
          <div className="flex gap-2 mt-3">
            <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              placeholder="Nova tarefa..." className="bg-surface-mid border-surface-high rounded-2xl h-10 text-sm flex-1" />
            <Button onClick={handleAddTask} disabled={addingTask || !newTaskTitle.trim()} size="sm" className="bg-primary text-background rounded-2xl h-10 px-3">
              {addingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </DrawerSection>

      <DrawerSection id="files" icon={FolderOpen} title="Arquivos" badge={files.length} open={isOpen("files")} onToggle={toggleSection}>
        {files.length === 0 ? <p className="text-sm text-muted-foreground text-center py-2">Nenhum arquivo enviado.</p> : (
          <div className="space-y-2 mb-3">
            {files.map((f) => {
              const FileIcon = FILE_ICONS[f.type] || FILE_ICONS.default;
              return (
                <div key={f.id} className="flex items-center gap-3 p-3 bg-surface-mid rounded-2xl">
                  <FileIcon className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0"><p className="text-sm text-foreground truncate">{f.name}</p><p className="text-xs text-muted-foreground">{f.size} · {f.uploadedAt}</p></div>
                  {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-xl bg-surface-high hover:bg-primary/20 flex items-center justify-center transition-colors"><ExternalLink className="w-3.5 h-3.5 text-primary" /></a>}
                  {canEdit && <button className="w-7 h-7 rounded-xl hover:bg-red-500/10 flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
                </div>
              );
            })}
          </div>
        )}
        {canEdit && (
          <div className="border-2 border-dashed border-surface-high rounded-2xl p-5 text-center hover:border-primary/50 cursor-pointer transition-colors mt-2">
            <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" /><p className="text-xs text-muted-foreground">Arraste ou clique para enviar</p>
          </div>
        )}
      </DrawerSection>

      <DrawerSection id="documents" icon={FileText} title="Documentos" open={isOpen("documents")} onToggle={toggleSection}>
        <div className="space-y-3">
          <div><Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Briefing do Produto</Label>
            <Textarea placeholder="Descreva o briefing do produto..." className="bg-surface-mid border-surface-high rounded-2xl min-h-[100px] text-sm" readOnly={!canEdit} /></div>
          <div><Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Objetivos</Label>
            <Textarea placeholder="Liste os objetivos principais..." className="bg-surface-mid border-surface-high rounded-2xl min-h-[80px] text-sm" readOnly={!canEdit} /></div>
          {canEdit && <Button size="sm" className="bg-primary text-background rounded-2xl w-full gap-2"><Plus className="w-3.5 h-3.5" /> Salvar Documento</Button>}
        </div>
      </DrawerSection>

      <DrawerSection id="branding" icon={Palette} title="Identidade Visual" open={isOpen("branding")} onToggle={toggleSection}>
        <div className="space-y-4">
          <div><p className="text-xs text-muted-foreground mb-2 font-medium">Logo</p>
            <div className="border-2 border-dashed border-surface-high rounded-2xl p-6 text-center hover:border-primary/50 cursor-pointer transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" /><p className="text-xs text-muted-foreground">Arraste sua logo aqui</p>
            </div>
          </div>
          <div><p className="text-xs text-muted-foreground mb-3 font-medium">Paleta de Cores</p>
            <div className="grid grid-cols-3 gap-3">
              {[["Primária", "#91f78e"], ["Secundária", "#2563eb"], ["Accent", "#f59e0b"]].map(([label, color]) => (
                <div key={label}><p className="text-[10px] text-muted-foreground mb-1">{label}</p>
                  <div className="flex items-center gap-2 p-2 bg-surface-mid rounded-2xl">
                    <div className="w-6 h-6 rounded-lg flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-mono text-foreground">{color}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DrawerSection>

      <DrawerSection id="team" icon={Users} title="Equipe do Produto" badge={teamMembers.length} open={isOpen("team")} onToggle={toggleSection}>
        {teamMembers.length === 0 ? <p className="text-sm text-muted-foreground text-center py-2">Nenhum membro vinculado.</p> : (
          <div className="space-y-2">
            {teamMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-surface-mid rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                  {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} className="w-8 h-8 rounded-full object-cover" /> : m.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{m.name}</p><p className="text-xs text-muted-foreground">{m.role}</p></div>
              </div>
            ))}
          </div>
        )}
      </DrawerSection>

      <DrawerSection id="activity" icon={Activity} title="Atividade Recente" badge={activity.length} open={isOpen("activity")} onToggle={toggleSection}>
        {activity.length === 0 ? <p className="text-sm text-muted-foreground text-center py-2">Nenhuma atividade registrada.</p> : (
          <div className="space-y-3">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-surface-mid last:border-0">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-sm text-foreground">{item.action}</p><p className="text-xs text-muted-foreground mt-0.5">{item.userName} · {item.createdAt}</p></div>
              </div>
            ))}
          </div>
        )}
      </DrawerSection>

      {canEdit && (
        <DrawerSection id="settings" icon={Settings} title="Configurações do Produto" open={isOpen("settings")} onToggle={toggleSection}>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Nome do produto</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-surface-mid border-surface-high rounded-2xl" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Descrição</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="bg-surface-mid border-surface-high rounded-2xl" /></div>
            <div className="border-t border-surface-mid pt-4 space-y-3">
              <div className="flex items-center gap-2 mb-1"><QrCode className="w-4 h-4 text-primary" /><p className="text-sm font-semibold text-foreground">Código do Produto</p></div>
              <p className="text-xs text-muted-foreground">Compartilhe este código para que outras equipes possam solicitar acesso a este produto.</p>
              <div className="flex items-center gap-2 p-3 bg-surface-mid rounded-2xl">
                <span className="flex-1 font-mono text-sm text-primary tracking-widest">{product.productCode || "—"}</span>
                <button onClick={copyCode} className="w-8 h-8 rounded-xl bg-surface-high hover:bg-primary/20 flex items-center justify-center transition-colors flex-shrink-0">
                  {codeCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-primary" />}
                </button>
              </div>
              <div className="bg-surface-mid rounded-2xl p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground text-xs">Como funciona:</p>
                <p>1. Copie o código acima e envie para a equipe desejada.</p>
                <p>2. A equipe acessa "Novo Produto" e escolhe "Entrar com código".</p>
                <p>3. Após inserir o código, eles terão acesso de visualização ao produto.</p>
              </div>
            </div>
            <Button onClick={handleSaveEdit} disabled={savingEdit || !editName.trim()} className="flex-1 w-full bg-primary text-background rounded-2xl font-semibold">
              {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Alterações"}
            </Button>
          </div>
        </DrawerSection>
      )}
    </div>
  );
}
