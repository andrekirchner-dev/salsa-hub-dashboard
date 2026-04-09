import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
  doc, getDoc, getDocs, collection, onSnapshot, addDoc, deleteDoc,
  updateDoc, query, orderBy, serverTimestamp, writeBatch, setDoc,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

interface TaskCard { id: string; title: string; status: "COMPLETA" | "ATIVA" | "BLOQUEADA" | "MILESTONE"; assignedToNames?: string[]; responsibleName?: string; }
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
  responsibleUid?: string;
  responsibleName?: string;
  managerUid?: string;
  managerName?: string;
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

interface RegisteredUser { uid: string; name: string; email: string; role: string; }

export default function ProductDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: productId } = useParams<{ id: string }>();
  const uid = auth.currentUser?.uid ?? "";
  const userName = auth.currentUser?.displayName ?? "Usuário";
  // ownerUid: own product vs product shared by partner
  const ownerUid: string = (location.state as any)?.ownerUid ?? uid;

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
  const [memberSearch, setMemberSearch] = useState("");
  const [allUsers, setAllUsers] = useState<RegisteredUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberDialogTab, setMemberDialogTab] = useState<"member" | "team" | "responsible">("member");

  // Teams for "add team" tab
  interface TeamRef { id: string; name: string; ownerUid: string; }
  const [allTeams, setAllTeams] = useState<TeamRef[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);

  // Responsible / manager
  const [responsibleUid, setResponsibleUid] = useState<string>("");
  const [managerUid, setManagerUid] = useState<string>("");
  const [savingRoles, setSavingRoles] = useState(false);

  // Task dialog state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskAssignees, setTaskAssignees] = useState<RegisteredUser[]>([]);
  const [taskAssigneeSearch, setTaskAssigneeSearch] = useState("");
  const [taskResponsible, setTaskResponsible] = useState("");

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
    if (!ownerUid || !productId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateDoc(doc(db, "users", ownerUid, "products", productId), { [field]: value });
    }, 800);
  };

  const toggleSection = (id: string) =>
    setOpenSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  const isOpen = (id: string) => openSections.includes(id);

  // Load registered users when member or task dialog opens
  useEffect(() => {
    if (!memberDialogOpen && !taskDialogOpen) return;
    setLoadingUsers(true);
    getDocs(collection(db, "profiles")).then(snap => {
      const existing = new Set(teamMembers.map(m => m.id));
      setAllUsers(snap.docs.filter(d => d.id !== uid && !existing.has(d.id)).map(d => ({ uid: d.id, ...d.data() } as RegisteredUser)));
      setLoadingUsers(false);
    }).catch(() => setLoadingUsers(false));
    // Load owner's teams for the "team" tab
    getDocs(collection(db, "users", ownerUid, "teams")).then(snap => {
      setAllTeams(snap.docs.map(d => ({ id: d.id, name: d.data().name ?? d.id, ownerUid })));
    }).catch(() => {});
  }, [memberDialogOpen, taskDialogOpen, uid, ownerUid, teamMembers]);

  // Load product
  useEffect(() => {
    if (!ownerUid || !productId) return;
    getDoc(doc(db, "users", ownerUid, "products", productId)).then(snap => {
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
        setResponsibleUid(d.responsibleUid ?? "");
        setManagerUid(d.managerUid ?? "");
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
    if (!ownerUid || !productId) return;
    const q = query(collection(db, "users", ownerUid, "products", productId, "tasks"), orderBy("createdAt", "asc"));
    return onSnapshot(q, snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskCard))));
  }, [ownerUid, productId]);

  // Load team
  useEffect(() => {
    if (!ownerUid || !productId) return;
    const q = query(collection(db, "users", ownerUid, "products", productId, "team"), orderBy("name", "asc"));
    return onSnapshot(q, snap => setTeamMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamMember))));
  }, [ownerUid, productId]);

  // Load activity
  useEffect(() => {
    if (!ownerUid || !productId) return;
    const q = query(collection(db, "users", ownerUid, "products", productId, "activity"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => setActivity(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityItem))));
  }, [ownerUid, productId]);

  const logActivity = async (action: string) => {
    if (!ownerUid || !productId) return;
    await addDoc(collection(db, "users", ownerUid, "products", productId, "activity"), {
      action, user: userName, createdAt: serverTimestamp(),
    });
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !ownerUid || !productId) return;
    const responsibleUser = taskAssignees.find(u => u.uid === taskResponsible)
      ?? teamMembers.find(m => m.id === taskResponsible);
    const taskData = {
      title: newTaskTitle.trim(),
      status: newTaskStatus,
      createdAt: serverTimestamp(),
      createdByUid: uid,
      assignedToUids: taskAssignees.map(u => u.uid),
      assignedToNames: taskAssignees.map(u => u.name),
      responsibleUid: taskResponsible || null,
      responsibleName: (responsibleUser as any)?.name ?? "",
      productId,
      productOwnerUid: ownerUid,
      productName: product?.name ?? "",
    };
    // Write to product-level tasks (shown in ProductDetail)
    const taskRef = await addDoc(collection(db, "users", ownerUid, "products", productId, "tasks"), taskData);
    // Write to global tasks collection so assignees can see it in their task feed
    await setDoc(doc(db, "tasks", taskRef.id), taskData);
    // Notify each assignee
    for (const assignee of taskAssignees) {
      await addDoc(collection(db, "users", assignee.uid, "notifications"), {
        type: "task",
        title: "Nova Tarefa Atribuída",
        description: `Você foi atribuído à tarefa "${newTaskTitle.trim()}" no produto "${product?.name}".`,
        read: false,
        createdAt: serverTimestamp(),
      });
    }
    await logActivity(`Tarefa adicionada: ${newTaskTitle.trim()}`);
    setNewTaskTitle("");
    setTaskAssignees([]);
    setTaskResponsible("");
    setTaskAssigneeSearch("");
    setTaskDialogOpen(false);
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!ownerUid || !productId) return;
    await deleteDoc(doc(db, "users", ownerUid, "products", productId, "tasks", taskId));
    await logActivity(`Tarefa removida: ${title}`);
  };

  const handleAddMember = async (user: RegisteredUser) => {
    if (!ownerUid || !productId || !product) return;
    // Add to product team subcollection (keyed by uid for dedup)
    await setDoc(doc(db, "users", ownerUid, "products", productId, "team", user.uid), {
      name: user.name, role: user.role, createdAt: serverTimestamp(),
    });
    // Write a sharedProducts entry so product appears in member's Products list
    await setDoc(doc(db, "users", user.uid, "sharedProducts", productId), {
      id: productId,
      name: product.name,
      type: product.type,
      status: product.status,
      progress: product.progress ?? 0,
      ownerUid,
      isShared: true,
      addedAt: serverTimestamp(),
    });
    // Notify the added member
    await addDoc(collection(db, "users", user.uid, "notifications"), {
      type: "product",
      title: "Acesso ao produto",
      description: `Você foi adicionado ao produto "${product.name}".`,
      read: false,
      createdAt: serverTimestamp(),
    });
    await logActivity(`Membro adicionado: ${user.name}`);
    setMemberSearch("");
    setMemberDialogOpen(false);
  };

  // Add an entire team's members to the product
  const handleAddTeam = async (team: { id: string; name: string; ownerUid: string }) => {
    if (!ownerUid || !productId || !product || addingTeam) return;
    setAddingTeam(true);
    const memberSnap = await getDocs(collection(db, "users", team.ownerUid, "teams", team.id, "members"));
    for (const d of memberSnap.docs) {
      const m = d.data();
      const memberUid = m.uid ?? d.id;
      await setDoc(doc(db, "users", ownerUid, "products", productId, "team", memberUid), {
        name: m.name, role: m.role, createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "users", memberUid, "sharedProducts", productId), {
        id: productId, name: product.name, type: product.type,
        status: product.status, progress: product.progress ?? 0,
        ownerUid, isShared: true, addedAt: serverTimestamp(),
      });
      await addDoc(collection(db, "users", memberUid, "notifications"), {
        type: "product",
        title: "Acesso ao produto",
        description: `Sua equipe "${team.name}" foi adicionada ao produto "${product.name}".`,
        read: false, createdAt: serverTimestamp(),
      });
    }
    await logActivity(`Equipe "${team.name}" adicionada ao produto`);
    setAddingTeam(false);
    setMemberDialogOpen(false);
  };

  // Save responsible / manager
  const handleSaveResponsible = async () => {
    if (!ownerUid || !productId) return;
    setSavingRoles(true);
    const responsibleUser = allUsers.find(u => u.uid === responsibleUid) ?? teamMembers.find(m => m.id === responsibleUid);
    const managerUser = allUsers.find(u => u.uid === managerUid) ?? teamMembers.find(m => m.id === managerUid);
    await updateDoc(doc(db, "users", ownerUid, "products", productId), {
      responsibleUid,
      responsibleName: (responsibleUser as any)?.name ?? "",
      managerUid,
      managerName: (managerUser as any)?.name ?? "",
    });
    await logActivity("Responsável/Gerente do projeto atualizados");
    setSavingRoles(false);
    setMemberDialogOpen(false);
  };

  const handleSaveDescription = async () => {
    if (!ownerUid || !productId) return;
    await updateDoc(doc(db, "users", ownerUid, "products", productId), { description });
    await logActivity("Descrição atualizada");
  };

  // Archive / Delete product
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleArchive = async () => {
    if (!ownerUid || !productId) return;
    await updateDoc(doc(db, "users", ownerUid, "products", productId), { archived: true });
    await logActivity("Projeto arquivado");
    navigate(-1);
  };

  const handleDeleteProduct = async () => {
    if (!ownerUid || !productId) return;
    await deleteDoc(doc(db, "users", ownerUid, "products", productId));
    navigate("/products", { replace: true });
  };

  // Clear all activity
  const handleClearActivity = async () => {
    if (!ownerUid || !productId || activity.length === 0) return;
    const batch = writeBatch(db);
    activity.forEach(item => {
      batch.delete(doc(db, "users", ownerUid, "products", productId, "activity", item.id));
    });
    await batch.commit();
  };

  // Save colors to Firestore
  const handleColorChange = async (idx: number, newColor: string) => {
    const updated = colorPalette.map((c, i) => i === idx ? { ...c, color: newColor } : c);
    setColorPalette(updated);
    if (!ownerUid || !productId) return;
    const colors = Object.fromEntries(updated.map(c => [c.key, c.color]));
    await updateDoc(doc(db, "users", ownerUid, "products", productId), { colors });
  };

  // Logo upload (Firebase Storage)
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ownerUid || !productId) return;
    setLogoUploading(true);
    setLogoProgress(0);
    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageRef = ref(storage, `logos/${ownerUid}/${productId}/${Date.now()}_${sanitized}`);
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
    task.on(
      "state_changed",
      snap => setLogoProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => setLogoUploading(false),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setLogoPreview(url);
        setLogoUploading(false);
        await updateDoc(doc(db, "users", ownerUid, "products", productId), { logoUrl: url });
        await logActivity("Logo atualizada");
      }
    );
  };

  const handleLogoDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogoPreview(null);
    if (!ownerUid || !productId) return;
    await updateDoc(doc(db, "users", ownerUid, "products", productId), { logoUrl: "" });
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

        {/* Task creation dialog */}
        <Dialog open={taskDialogOpen} onOpenChange={v => { setTaskDialogOpen(v); if (!v) { setNewTaskTitle(""); setNewTaskStatus("ATIVA"); setTaskAssignees([]); setTaskAssigneeSearch(""); setTaskResponsible(""); } }}>
          <DialogContent className="bg-surface-low border-surface-mid max-w-md">
            <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Título da tarefa *"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                className="bg-surface-mid border-0 rounded-xl text-sm"
              />
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Status</label>
                <select value={newTaskStatus} onChange={e => setNewTaskStatus(e.target.value as any)} className="w-full bg-surface-mid border-0 rounded-xl p-2.5 text-foreground text-sm">
                  <option value="ATIVA">Ativa</option>
                  <option value="BLOQUEADA">Bloqueada</option>
                  <option value="COMPLETA">Completa</option>
                  <option value="MILESTONE">Milestone</option>
                </select>
              </div>

              {/* Assignees picker */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Atribuir a</label>
                {taskAssignees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {taskAssignees.map(u => (
                      <span key={u.uid} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                        {u.name}
                        <button onClick={() => setTaskAssignees(prev => prev.filter(a => a.uid !== u.uid))}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar membro ou usuário..."
                    value={taskAssigneeSearch}
                    onChange={e => setTaskAssigneeSearch(e.target.value)}
                    className="pl-8 bg-surface-mid border-0 rounded-xl text-sm"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl bg-surface-mid p-1">
                  {loadingUsers ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Carregando...</p>
                  ) : (() => {
                    const combined: RegisteredUser[] = [
                      ...teamMembers.map(m => ({ uid: m.id, name: m.name, role: m.role, email: "" })),
                      ...allUsers,
                    ].filter((u, i, arr) => arr.findIndex(a => a.uid === u.uid) === i);
                    const visible = combined.filter(u =>
                      !taskAssigneeSearch.trim() ||
                      u.name.toLowerCase().includes(taskAssigneeSearch.toLowerCase())
                    );
                    if (visible.length === 0) return <p className="text-xs text-muted-foreground text-center py-3">Nenhum usuário encontrado.</p>;
                    return visible.map(u => {
                      const isSelected = !!taskAssignees.find(a => a.uid === u.uid);
                      return (
                        <button key={u.uid}
                          onClick={() => setTaskAssignees(prev => isSelected ? prev.filter(a => a.uid !== u.uid) : [...prev, u])}
                          className={"w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors " + (isSelected ? "bg-primary/20" : "hover:bg-surface-high")}>
                          <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{u.role}</p>
                          </div>
                          {isSelected && <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0"><span className="text-background text-[10px]">✓</span></div>}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Responsible (only if assignees selected) */}
              {taskAssignees.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Responsável pela tarefa</label>
                  <select value={taskResponsible} onChange={e => setTaskResponsible(e.target.value)} className="w-full bg-surface-mid border-0 rounded-xl p-2.5 text-foreground text-sm">
                    <option value="">Nenhum</option>
                    {taskAssignees.map(u => <option key={u.uid} value={u.uid}>{u.name} — {u.role}</option>)}
                  </select>
                </div>
              )}

              <Button
                className="w-full rounded-xl bg-primary hover:bg-primary/80"
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
              >
                Criar Tarefa
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* TAREFAS */}
        <DrawerSection id="tasks" icon={CheckSquare} title="Tarefas" badge={activeTasks + pendingTasks} open={isOpen("tasks")} onToggle={toggleSection}>
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setTaskDialogOpen(true)} className="rounded-2xl bg-primary hover:bg-primary/80 text-sm">
              <Plus className="w-4 h-4 mr-1" />Nova Tarefa
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
                    className={"flex items-start justify-between p-3 bg-surface-mid rounded-2xl group cursor-pointer hover:bg-surface-high transition-colors " + s.border}
                    onClick={() => navigate(`/products/${productId}/tasks/${task.id}`)}
                  >
                    <div className="flex-1 pr-3 min-w-0">
                      <p className="text-sm text-foreground">{task.title}</p>
                      {task.assignedToNames && task.assignedToNames.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          👤 {task.assignedToNames.join(", ")}
                          {task.responsibleName ? ` · Resp: ${task.responsibleName}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge className={"text-[10px] px-2 py-0.5 " + s.badge}>{s.label}</Badge>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id, task.title); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                type="range" min={0} max={20000} step={50} value={preco}
                onChange={e => { const v = Number(e.target.value); setPreco(v); saveField("preco", v); }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(preco / 20000) * 100}%, hsl(var(--surface-high)) ${(preco / 20000) * 100}%, hsl(var(--surface-high)) 100%)` }}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[99, 297, 497, 997, 1997, 4997, 9997].map(v => (
                <button key={v} onClick={() => { setPreco(v); saveField("preco", v); }}
                  className={"px-2.5 py-1 rounded-lg text-xs font-medium transition-colors " + (preco === v ? "bg-primary text-background" : "bg-surface-mid text-muted-foreground hover:bg-surface-high")}>
                  {v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })}
                </button>
              ))}
            </div>
          </div>
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
            <Dialog open={memberDialogOpen} onOpenChange={v => { setMemberDialogOpen(v); if (!v) { setMemberSearch(""); setTeamSearch(""); setMemberDialogTab("member"); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-2xl bg-primary hover:bg-primary/80 text-sm">
                  <Plus className="w-4 h-4 mr-1" />Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface-low border-surface-mid max-w-md">
                <DialogHeader><DialogTitle>Equipe do Produto</DialogTitle></DialogHeader>

                {/* Tab switcher */}
                <div className="flex gap-1.5 mb-3 bg-surface-mid rounded-xl p-1">
                  {(["member", "team", "responsible"] as const).map(tab => (
                    <button key={tab} onClick={() => setMemberDialogTab(tab)}
                      className={"flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors " +
                        (memberDialogTab === tab ? "bg-primary text-background" : "text-muted-foreground hover:text-foreground")}>
                      {tab === "member" ? "Membro" : tab === "team" ? "Equipe" : "Responsável"}
                    </button>
                  ))}
                </div>

                {memberDialogTab === "member" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Buscar por nome ou e-mail..." value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        className="pl-9 bg-surface-mid border-0 rounded-xl text-sm" />
                    </div>
                    {loadingUsers ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {allUsers
                          .filter(u => !memberSearch.trim() || u.name.toLowerCase().includes(memberSearch.toLowerCase()) || u.email.toLowerCase().includes(memberSearch.toLowerCase()))
                          .map(u => (
                            <button key={u.uid} onClick={() => handleAddMember(u)}
                              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-mid transition-colors text-left">
                              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-xs flex-shrink-0">
                                {u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{u.role || u.email}</p>
                              </div>
                            </button>
                          ))}
                        {allUsers.filter(u => !memberSearch.trim() || u.name.toLowerCase().includes(memberSearch.toLowerCase()) || u.email.toLowerCase().includes(memberSearch.toLowerCase())).length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">Nenhum usuário encontrado.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {memberDialogTab === "team" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Buscar equipe..." value={teamSearch}
                        onChange={e => setTeamSearch(e.target.value)}
                        className="pl-9 bg-surface-mid border-0 rounded-xl text-sm" />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {allTeams.filter(t => !teamSearch.trim() || t.name.toLowerCase().includes(teamSearch.toLowerCase())).map(t => (
                        <button key={t.id} onClick={() => handleAddTeam(t)} disabled={addingTeam}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-mid transition-colors text-left disabled:opacity-50">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                            {t.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                            <p className="text-xs text-muted-foreground">Adicionar todos os membros</p>
                          </div>
                          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      ))}
                      {allTeams.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma equipe encontrada.</p>}
                    </div>
                  </div>
                )}

                {memberDialogTab === "responsible" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Membro Responsável pelo Projeto</label>
                      <select value={responsibleUid} onChange={e => setResponsibleUid(e.target.value)}
                        className="w-full bg-surface-mid border-0 rounded-xl p-2.5 text-foreground text-sm">
                        <option value="">Nenhum selecionado</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
                        {allUsers.map(u => <option key={u.uid} value={u.uid}>{u.name} — {u.role}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Gerente do Projeto</label>
                      <select value={managerUid} onChange={e => setManagerUid(e.target.value)}
                        className="w-full bg-surface-mid border-0 rounded-xl p-2.5 text-foreground text-sm">
                        <option value="">Nenhum selecionado</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
                        {allUsers.map(u => <option key={u.uid} value={u.uid}>{u.name} — {u.role}</option>)}
                      </select>
                    </div>
                    <Button onClick={handleSaveResponsible} disabled={savingRoles} className="w-full rounded-xl bg-primary hover:bg-primary/80">
                      {savingRoles ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Responsible / Manager display */}
          {(product.responsibleName || product.managerName) && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {product.responsibleName && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  👤 Responsável: {product.responsibleName}
                </span>
              )}
              {product.managerName && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 font-medium">
                  🗂 Gerente: {product.managerName}
                </span>
              )}
            </div>
          )}
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
              <Input defaultValue={product.name} key={product.name} onBlur={async e => {
                const v = e.target.value.trim();
                if (v && v !== product.name) {
                  await updateDoc(doc(db, "users", ownerUid, "products", productId!), { name: v });
                  setProduct(p => p ? { ...p, name: v } : p);
                  await logActivity("Nome atualizado");
                }
              }} className="bg-surface-mid border-0 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Data de Lançamento</label>
              <Input defaultValue={product.launchDate ?? ""} key={product.launchDate} type="date" onBlur={async e => {
                const v = e.target.value;
                await updateDoc(doc(db, "users", ownerUid, "products", productId!), { launchDate: v });
                setProduct(p => p ? { ...p, launchDate: v } : p);
              }} className="bg-surface-mid border-0 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Progresso (%)</label>
              <Input type="number" min={0} max={100} defaultValue={product.progress ?? 0} key={product.progress} onBlur={async e => {
                const v = Math.min(100, Math.max(0, Number(e.target.value)));
                await updateDoc(doc(db, "users", ownerUid, "products", productId!), { progress: v });
                setProduct(p => p ? { ...p, progress: v } : p);
              }} className="bg-surface-mid border-0 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Status</label>
              <select defaultValue={product.status} key={product.status} onChange={async e => {
                const v = e.target.value;
                await updateDoc(doc(db, "users", ownerUid, "products", productId!), { status: v });
                setProduct(p => p ? { ...p, status: v } : p);
                await logActivity(`Status alterado para: ${v}`);
              }} className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                <option>Em desenvolvimento</option>
                <option>Lançado</option>
                <option>Pausado</option>
              </select>
            </div>
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

      </div>
    </div>
  );
}
