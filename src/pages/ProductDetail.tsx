import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ChevronDown, ChevronUp, Upload, Plus, Trash2, Download,
  FileText, Image, File, CheckSquare, FolderOpen, BookOpen,
  Palette, Search, Users, Activity, Settings, AlertTriangle, X,
  Globe, TrendingUp, BarChart2, Megaphone, Target, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { auth, db, storage } from "@/integrations/firebase/client";
import {
  doc, getDoc, collection, onSnapshot, addDoc, deleteDoc,
  updateDoc, query, orderBy, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

interface TaskCard { id: string; title: string; status: "COMPLETA" | "ATIVA" | "BLOQUEADA" | "MILESTONE"; }
interface TeamMember { id: string; name: string; role: string; }
interface ActivityItem { id: string; action: string; user: string; createdAt: any; }

interface Product {
  name: string;
  type: string;
  status: string;
  progress: number;
  description?: string;
  launchDate?: string;
  budget?: string;
  logoUrl?: string;
  colors?: { primary: string; secondary: string; accent: string };
  mercado?: string;
  tendenciaComportamento?: string;
  tendenciaConteudo?: string;
  concorrentes?: string;
  tendenciaMarketing?: string;
  demografico?: string;
  preco?: number;
}

const getTaskStyle = (status: TaskCard["status"]) => {
  switch (status) {
    case "COMPLETA":  return { border: "border-l-4 border-green-500", badge: "bg-green-500/20 text-green-400", label: "COMPLETA" };
    case "ATIVA":     return { border: "border-l-4 border-primary",   badge: "bg-primary/20 text-primary",     label: "ATIVA" };
    case "BLOQUEADA": return { border: "border-l-4 border-gray-600",  badge: "bg-gray-500/20 text-gray-400",   label: "BLOQUEADA" };
    case "MILESTONE": return { border: "border-l-4 border-amber-500", badge: "bg-amber-500/20 text-amber-400", label: "MILESTONE" };
  }
};

interface SectionProps {
  id: string; icon: React.ElementType; title: string; badge?: string | number;
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
          {badge !== undefined && !open && (
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
  const { id: productId } = useParams<{ id: string }>();
  const uid = auth.currentUser?.uid ?? "";
  const userName = auth.currentUser?.displayName ?? "Usuário";

  const [product, setProduct] = useState<Product | null>(null);
  const [description, setDescription] = useState("");
  const [tasks, setTasks] = useState<TaskCard[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [openSections, setOpenSections] = useState<string[]>(["tasks"]);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<TaskCard["status"]>("ATIVA");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");

  // Color palette state
  const [colorPalette, setColorPalette] = useState([
    { label: "Primária",   key: "primary",   color: "#91f78e" },
    { label: "Secundária", key: "secondary", color: "#2563eb" },
    { label: "Accent",     key: "accent",    color: "#f59e0b" },
  ]);
  const colorRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Logo state
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);

  // Market intelligence fields
  const [mercado, setMercado] = useState("");
  const [tendenciaComportamento, setTendenciaComportamento] = useState("");
  const [tendenciaConteudo, setTendenciaConteudo] = useState("");
  const [concorrentes, setConcorrentes] = useState("");
  const [tendenciaMarketing, setTendenciaMarketing] = useState("");
  const [demografico, setDemografico] = useState("");
  const [preco, setPreco] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveField = (field: string, value: string | number) => {
    if (!uid || !productId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateDoc(doc(db, "users", uid, "products", productId), { [field]: value });
    }, 800);
  };

  const toggleSection = (id: string) =>
    setOpenSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  const isOpen = (id: string) => openSections.includes(id);

  // Load product
  useEffect(() => {
    if (!uid || !productId) return;
    getDoc(doc(db, "users", uid, "products", productId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data() as Product;
        setProduct(d);
        setDescription(d.description ?? "");
        if (d.logoUrl) setLogoPreview(d.logoUrl);
        setMercado(d.mercado ?? "");
        setTendenciaComportamento(d.tendenciaComportamento ?? "");
        setTendenciaConteudo(d.tendenciaConteudo ?? "");
        setConcorrentes(d.concorrentes ?? "");
        setTendenciaMarketing(d.tendenciaMarketing ?? "");
        setDemografico(d.demografico ?? "");
        setPreco(d.preco ?? 0);
        if (d.colors) {
          setColorPalette(prev => prev.map(c => ({
            ...c,
            color: (d.colors as any)?.[c.key] ?? c.color,
          })));
        }
      }
    });
  }, [uid, productId]);

  // Load tasks
  useEffect(() => {
    if (!uid || !productId) return;
    const q = query(collection(db, "users", uid, "products", productId, "tasks"), orderBy("createdAt", "asc"));
    return onSnapshot(q, snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskCard))));
  }, [uid, productId]);

  // Load team
  useEffect(() => {
    if (!uid || !productId) return;
    const q = query(collection(db, "users", uid, "products", productId, "team"), orderBy("name", "asc"));
    return onSnapshot(q, snap => setTeamMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamMember))));
  }, [uid, productId]);

  // Load activity
  useEffect(() => {
    if (!uid || !productId) return;
    const q = query(collection(db, "users", uid, "products", productId, "activity"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => setActivity(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityItem))));
  }, [uid, productId]);

  const logActivity = async (action: string) => {
    if (!uid || !productId) return;
    await addDoc(collection(db, "users", uid, "products", productId, "activity"), {
      action, user: userName, createdAt: serverTimestamp(),
    });
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !uid || !productId) return;
    await addDoc(collection(db, "users", uid, "products", productId, "tasks"), {
      title: newTaskTitle.trim(), status: newTaskStatus, createdAt: serverTimestamp(),
    });
    await logActivity(`Tarefa adicionada: ${newTaskTitle.trim()}`);
    setNewTaskTitle("");
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!uid || !productId) return;
    await deleteDoc(doc(db, "users", uid, "products", productId, "tasks", taskId));
    await logActivity(`Tarefa removida: ${title}`);
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !uid || !productId) return;
    await addDoc(collection(db, "users", uid, "products", productId, "team"), {
      name: newMemberName.trim(), role: newMemberRole.trim(), createdAt: serverTimestamp(),
    });
    await logActivity(`Membro adicionado: ${newMemberName.trim()}`);
    setNewMemberName(""); setNewMemberRole("");
  };

  const handleSaveDescription = async () => {
    if (!uid || !productId) return;
    await updateDoc(doc(db, "users", uid, "products", productId), { description });
    await logActivity("Descrição atualizada");
  };

  // Archive / Delete product
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleArchive = async () => {
    if (!uid || !productId) return;
    await updateDoc(doc(db, "users", uid, "products", productId), { archived: true });
    await logActivity("Projeto arquivado");
    navigate(-1);
  };

  const handleDeleteProduct = async () => {
    if (!uid || !productId) return;
    await deleteDoc(doc(db, "users", uid, "products", productId));
    navigate("/products", { replace: true });
  };

  // Clear all activity
  const handleClearActivity = async () => {
    if (!uid || !productId || activity.length === 0) return;
    const batch = writeBatch(db);
    activity.forEach(item => {
      batch.delete(doc(db, "users", uid, "products", productId, "activity", item.id));
    });
    await batch.commit();
  };

  // Save colors to Firestore
  const handleColorChange = async (idx: number, newColor: string) => {
    const updated = colorPalette.map((c, i) => i === idx ? { ...c, color: newColor } : c);
    setColorPalette(updated);
    if (!uid || !productId) return;
    const colors = Object.fromEntries(updated.map(c => [c.key, c.color]));
    await updateDoc(doc(db, "users", uid, "products", productId), { colors });
  };

  // Logo upload (Firebase Storage)
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid || !productId) return;
    setLogoUploading(true);
    setLogoProgress(0);
    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageRef = ref(storage, `logos/${uid}/${productId}/${Date.now()}_${sanitized}`);
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
    task.on(
      "state_changed",
      snap => setLogoProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => setLogoUploading(false),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setLogoPreview(url);
        setLogoUploading(false);
        await updateDoc(doc(db, "users", uid, "products", productId), { logoUrl: url });
        await logActivity("Logo atualizada");
      }
    );
  };

  const handleLogoDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogoPreview(null);
    if (!uid || !productId) return;
    await updateDoc(doc(db, "users", uid, "products", productId), { logoUrl: "" });
  };

  const activeTasks = tasks.filter(t => t.status === "ATIVA").length;
  const pendingTasks = tasks.filter(t => t.status === "BLOQUEADA").length;

  function timeAgo(ts: any): string {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return "agora";
    if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    return `há ${Math.floor(diff / 86400)}d`;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando produto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/products")} className="p-2 rounded-xl hover:bg-surface-mid transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground font-sans truncate">{product.name}</h1>
            <p className="text-xs text-muted-foreground">{product.type} · {product.status}</p>
          </div>
        </div>

        {/* Progress banner */}
        <div className="bg-surface-low rounded-3xl p-5 border border-surface-mid mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2 flex-wrap">
              {product.type && <Badge className="bg-blue-500/20 text-blue-400 text-xs">{product.type}</Badge>}
              {product.status && <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">{product.status}</Badge>}
            </div>
            <span className="text-sm font-bold text-primary">{product.progress ?? 0}%</span>
          </div>
          <Progress value={product.progress ?? 0} className="h-2 bg-surface-mid" />
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Progresso</p>
              <p className="font-bold text-primary">{product.progress ?? 0}%</p>
            </div>
            <div className="text-center border-x border-surface-mid">
              <p className="text-xs text-muted-foreground">Lançamento</p>
              <p className="font-bold text-foreground text-sm">{product.launchDate ?? "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Orçamento</p>
              <p className="font-bold text-primary">{product.budget ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-surface-low rounded-3xl p-5 border border-surface-mid mb-6">
          <h3 className="font-semibold text-foreground mb-3">Descrição</h3>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={handleSaveDescription}
            placeholder="Descreva o produto..."
            className="bg-surface-mid border-0 rounded-2xl min-h-20 text-sm"
          />
        </div>

        {/* TAREFAS */}
        <DrawerSection id="tasks" icon={CheckSquare} title="Tarefas" badge={activeTasks + pendingTasks} open={isOpen("tasks")} onToggle={toggleSection}>
          <div className="flex gap-2 mb-3">
            <Input placeholder="Nova tarefa..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddTask()} className="bg-surface-mid border-0 rounded-xl text-sm flex-1" />
            <select value={newTaskStatus} onChange={e => setNewTaskStatus(e.target.value as any)} className="bg-surface-mid border-0 rounded-xl p-2 text-foreground text-xs">
              <option value="ATIVA">Ativa</option>
              <option value="BLOQUEADA">Bloqueada</option>
              <option value="COMPLETA">Completa</option>
              <option value="MILESTONE">Milestone</option>
            </select>
            <Button size="sm" onClick={handleAddTask} disabled={!newTaskTitle.trim()} className="rounded-xl bg-primary hover:bg-primary/80 text-background">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa ainda.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => {
                const s = getTaskStyle(task.status);
                return (
                  <div
                    key={task.id}
                    className={"flex items-center justify-between p-3 bg-surface-mid rounded-2xl group cursor-pointer hover:bg-surface-high transition-colors " + s.border}
                    onClick={() => navigate(`/products/${productId}/tasks/${task.id}`)}
                  >
                    <p className="text-sm text-foreground flex-1 pr-3">{task.title}</p>
                    <Badge className={"text-[10px] px-2 py-0.5 flex-shrink-0 " + s.badge}>{s.label}</Badge>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id, task.title); }}
                      className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </DrawerSection>

        {/* ARQUIVOS */}
        <DrawerSection id="files" icon={FolderOpen} title="Arquivos" open={isOpen("files")} onToggle={toggleSection}>
          <div className="bg-surface-mid rounded-2xl p-8 border-2 border-dashed border-surface-high text-center hover:border-primary/50 transition-colors cursor-pointer">
            <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-foreground">Arraste arquivos ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-1">Máximo 100 MB por arquivo</p>
          </div>
        </DrawerSection>

        {/* IDENTIDADE VISUAL */}
        <DrawerSection id="identity" icon={Palette} title="Identidade Visual" open={isOpen("identity")} onToggle={toggleSection}>
          <div className="space-y-5">
            {/* Logo */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Logo</p>
              <div
                className="border-2 border-dashed border-surface-high rounded-2xl p-6 text-center hover:border-primary/50 cursor-pointer transition-colors relative"
                onClick={() => logoInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-primary/70"); }}
                onDragLeave={e => e.currentTarget.classList.remove("border-primary/70")}
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-primary/70");
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    if (logoInputRef.current) {
                      logoInputRef.current.files = dt.files;
                      logoInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                  }
                }}
              >
                {logoUploading ? (
                  <div className="py-2">
                    <div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">{logoProgress}%</p>
                  </div>
                ) : logoPreview ? (
                  <div className="relative inline-block">
                    <img src={logoPreview} alt="Logo" className="w-20 h-20 mx-auto object-contain rounded-xl mb-2" />
                    <button
                      onClick={handleLogoDelete}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:bg-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <p className="text-xs text-muted-foreground">Clique para trocar</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-foreground font-medium">Clique ou arraste sua logo aqui</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">PNG, SVG, JPG até 5MB</p>
                  </>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>
            </div>

            {/* Color Palette */}
            <div>
              <p className="text-xs text-muted-foreground mb-3 font-medium">Paleta de Cores</p>
              <div className="grid grid-cols-3 gap-4">
                {colorPalette.map((item, i) => (
                  <div key={item.key} className="flex flex-col items-center gap-2">
                    <p className="text-[10px] text-muted-foreground self-start">{item.label}</p>
                    {/* Full-fill color circle */}
                    <label
                      className="w-12 h-12 rounded-full cursor-pointer relative overflow-hidden border-2 border-surface-high hover:border-primary/60 transition-colors shadow-sm"
                      style={{ backgroundColor: item.color }}
                      title={`Escolher cor ${item.label}`}
                    >
                      <input
                        ref={el => { colorRefs.current[i] = el; }}
                        type="color"
                        value={item.color}
                        onChange={e => handleColorChange(i, e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </label>
                    <span className="text-[10px] text-muted-foreground font-mono">{item.color}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DrawerSection>

        {/* EQUIPE */}
        <DrawerSection id="team" icon={Users} title="Equipe do Produto" badge={teamMembers.length} open={isOpen("team")} onToggle={toggleSection}>
          <div className="flex justify-end mb-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-2xl bg-primary hover:bg-primary/80 text-sm">
                  <Plus className="w-4 h-4 mr-1" />Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface-low border-surface-mid">
                <DialogHeader><DialogTitle>Adicionar Membro</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Nome do membro *" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} className="bg-surface-mid border-0 rounded-xl" />
                  <Input placeholder="Cargo (ex: Designer)" value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)} className="bg-surface-mid border-0 rounded-xl" />
                  <Button className="w-full rounded-xl bg-primary hover:bg-primary/80" onClick={handleAddMember} disabled={!newMemberName.trim()}>Adicionar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {teamMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro atribuído.</p>
          ) : (
            <div className="space-y-2">
              {teamMembers.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-mid hover:bg-surface-high transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-xs flex-shrink-0">
                    {member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DrawerSection>

        {/* ATIVIDADE */}
        <DrawerSection id="activity" icon={Activity} title="Atividade Recente" badge={activity.length} open={isOpen("activity")} onToggle={toggleSection}>
          {activity.length > 0 && (
            <div className="flex justify-end mb-3">
              <button
                onClick={handleClearActivity}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar atividades
              </button>
            </div>
          )}
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade registrada ainda.</p>
          ) : (
            <div className="space-y-3">
              {activity.map(item => (
                <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-surface-mid last:border-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.user} · {timeAgo(item.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DrawerSection>

        {/* CONFIGURAÇÕES */}
        <DrawerSection id="settings" icon={Settings} title="Configurações do Projeto" open={isOpen("settings")} onToggle={toggleSection}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Nome do Projeto</label>
              <Input defaultValue={product.name} className="bg-surface-mid border-0 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Data de Lançamento</label>
              <Input defaultValue={product.launchDate ?? ""} type="date" className="bg-surface-mid border-0 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Status</label>
              <select defaultValue={product.status} className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                <option>Em desenvolvimento</option>
                <option>Lançado</option>
                <option>Pausado</option>
              </select>
            </div>
            <Button className="w-full rounded-xl bg-primary hover:bg-primary/80 text-sm">Salvar Alterações</Button>
          </div>
          <div className="mt-4 p-4 rounded-2xl border border-red-500/20 space-y-2">
            <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />Zona de Perigo
            </p>
            <Button
              variant="outline"
              onClick={handleArchive}
              className="w-full rounded-xl text-amber-400 border-amber-500/30 hover:bg-amber-500/10 text-sm"
            >
              Arquivar Projeto
            </Button>
            {!confirmDelete ? (
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(true)}
                className="w-full rounded-xl text-red-400 border-red-500/30 hover:bg-red-500/10 text-sm"
              >
                Apagar Projeto
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-red-400 text-center font-medium">Tem certeza? Esta ação é irreversível.</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-xl text-muted-foreground border-surface-high text-sm"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleDeleteProduct}
                    className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm"
                  >
                    Sim, apagar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DrawerSection>

        {/* ── Inteligência de Mercado ───────────────────────────────── */}
        <DrawerSection id="mercado" icon={Globe} title="Definição de Mercado" open={isOpen("mercado")} onToggle={toggleSection}>
          <textarea
            value={mercado}
            onChange={e => { setMercado(e.target.value); saveField("mercado", e.target.value); }}
            placeholder="Descreva o mercado-alvo, tamanho, oportunidades e posicionamento..."
            className="w-full h-32 bg-surface-mid rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none border-0 outline-none focus:ring-1 focus:ring-primary/40"
          />
        </DrawerSection>

        <DrawerSection id="tendenciaComportamento" icon={TrendingUp} title="Tendências de Comportamento" open={isOpen("tendenciaComportamento")} onToggle={toggleSection}>
          <textarea
            value={tendenciaComportamento}
            onChange={e => { setTendenciaComportamento(e.target.value); saveField("tendenciaComportamento", e.target.value); }}
            placeholder="Mudanças no comportamento do consumidor, hábitos emergentes..."
            className="w-full h-32 bg-surface-mid rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none border-0 outline-none focus:ring-1 focus:ring-primary/40"
          />
        </DrawerSection>

        <DrawerSection id="tendenciaConteudo" icon={FileText} title="Tendências de Conteúdo" open={isOpen("tendenciaConteudo")} onToggle={toggleSection}>
          <textarea
            value={tendenciaConteudo}
            onChange={e => { setTendenciaConteudo(e.target.value); saveField("tendenciaConteudo", e.target.value); }}
            placeholder="Formatos em alta, temas relevantes, linguagem do setor..."
            className="w-full h-32 bg-surface-mid rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none border-0 outline-none focus:ring-1 focus:ring-primary/40"
          />
        </DrawerSection>

        <DrawerSection id="concorrentes" icon={BarChart2} title="Análise de Concorrentes" open={isOpen("concorrentes")} onToggle={toggleSection}>
          <textarea
            value={concorrentes}
            onChange={e => { setConcorrentes(e.target.value); saveField("concorrentes", e.target.value); }}
            placeholder="Principais concorrentes, diferenciais, pontos fracos e fortes..."
            className="w-full h-32 bg-surface-mid rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none border-0 outline-none focus:ring-1 focus:ring-primary/40"
          />
        </DrawerSection>

        <DrawerSection id="tendenciaMarketing" icon={Megaphone} title="Tendências de Marketing" open={isOpen("tendenciaMarketing")} onToggle={toggleSection}>
          <textarea
            value={tendenciaMarketing}
            onChange={e => { setTendenciaMarketing(e.target.value); saveField("tendenciaMarketing", e.target.value); }}
            placeholder="Canais em crescimento, estratégias eficazes, benchmarks do setor..."
            className="w-full h-32 bg-surface-mid rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none border-0 outline-none focus:ring-1 focus:ring-primary/40"
          />
        </DrawerSection>

        <DrawerSection id="demografico" icon={Target} title="Definição Demográfica" open={isOpen("demografico")} onToggle={toggleSection}>
          <textarea
            value={demografico}
            onChange={e => { setDemografico(e.target.value); saveField("demografico", e.target.value); }}
            placeholder="Idade, gênero, renda, localização, escolaridade, estilo de vida..."
            className="w-full h-32 bg-surface-mid rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none border-0 outline-none focus:ring-1 focus:ring-primary/40"
          />
        </DrawerSection>

        <DrawerSection id="preco" icon={DollarSign} title="Precificação" open={isOpen("preco")} onToggle={toggleSection}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">R$ 0</span>
              <span className="text-lg font-bold text-primary">
                {preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-muted-foreground">R$ 20.000</span>
            </div>
            <div className="relative px-1">
              <input
                type="range"
                min={0}
                max={20000}
                step={50}
                value={preco}
                onChange={e => { const v = Number(e.target.value); setPreco(v); saveField("preco", v); }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(preco / 20000) * 100}%, hsl(var(--surface-high)) ${(preco / 20000) * 100}%, hsl(var(--surface-high)) 100%)`
                }}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[99, 297, 497, 997, 1997, 4997, 9997].map(v => (
                <button
                  key={v}
                  onClick={() => { setPreco(v); saveField("preco", v); }}
                  className={"px-2.5 py-1 rounded-lg text-xs font-medium transition-colors " + (preco === v ? "bg-primary text-background" : "bg-surface-mid text-muted-foreground hover:bg-surface-high")}
                >
                  {v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })}
                </button>
              ))}
            </div>
          </div>
        </DrawerSection>

      </div>
    </div>
  );
}
