import { useState, useEffect } from "react";
import {
  Plus, Search, Trash2, Check, Loader2, ChevronDown, ChevronUp,
  ListTodo, Circle, Clock, AlertTriangle, CheckCircle2, Trophy,
  UserPlus, Users, X, Flag, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth, db } from "@/integrations/firebase/client";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, getDocs, where, getDoc,
} from "firebase/firestore";

// ── Constants ─────────────────────────────────────────────────────────────────

const CLEVEL = ["CEO", "CFO", "CMO", "COO"];
const MANAGEMENT = ["Gerente", "Coordenador"];
const canAssign = (role: string) => CLEVEL.includes(role) || MANAGEMENT.includes(role);

const STATUS_CONFIG = {
  PENDENTE:  { label: "Pendente",    icon: Circle,        color: "text-blue-400",  badge: "bg-blue-500/20 text-blue-400",   border: "border-l-blue-500"    },
  ATIVA:     { label: "Ativa",       icon: Clock,         color: "text-primary",   badge: "bg-primary/20 text-primary",     border: "border-l-primary"     },
  BLOQUEADA: { label: "Bloqueada",   icon: AlertTriangle, color: "text-red-400",   badge: "bg-red-500/20 text-red-400",     border: "border-l-red-500"     },
  COMPLETA:  { label: "Completa",    icon: CheckCircle2,  color: "text-green-400", badge: "bg-green-500/20 text-green-400", border: "border-l-green-500"   },
  MILESTONE: { label: "Milestone",   icon: Trophy,        color: "text-amber-400", badge: "bg-amber-500/20 text-amber-400", border: "border-l-amber-500"   },
};

const PRIORITY_CONFIG = {
  Alta:  { color: "text-red-400",    badge: "bg-red-500/20 text-red-400"      },
  Media: { color: "text-yellow-400", badge: "bg-yellow-500/20 text-yellow-400" },
  Baixa: { color: "text-green-400",  badge: "bg-green-500/20 text-green-400"  },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>;

// ── Interfaces ────────────────────────────────────────────────────────────────

interface PersonalTask {
  id: string;
  label: string;
  description?: string;
  priority: "Alta" | "Media" | "Baixa";
  status: keyof typeof STATUS_CONFIG;
  done: boolean;
  dueDate?: string;
  createdAt: any;
}

interface Subtask { id: string; title: string; done: boolean; }

interface AssignedTask {
  id: string;
  title: string;
  description?: string;
  priority: "Alta" | "Media" | "Baixa";
  status: keyof typeof STATUS_CONFIG;
  dueDate?: string;
  assignedToUid?: string;
  assignedToName?: string;
  assignedToTeamId?: string;
  assignedToTeamName?: string;
  createdByUid: string;
  createdByName: string;
  createdAt: any;
}

interface RegisteredUser { uid: string; name: string; email: string; role: string; }
interface TeamItem { id: string; name: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: any): string {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ── Subtask mini-component ────────────────────────────────────────────────────

function SubtaskList({ taskId, uid }: { taskId: string; uid: string }) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSub, setNewSub] = useState("");
  const path = collection(db, "users", uid, "tasks", taskId, "subtasks");

  useEffect(() => {
    const q = query(path, orderBy("createdAt", "asc"));
    return onSnapshot(q, snap => setSubtasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subtask))));
  }, [taskId]);

  const add = async () => {
    if (!newSub.trim()) return;
    await addDoc(path, { title: newSub.trim(), done: false, createdAt: serverTimestamp() });
    setNewSub("");
  };

  const toggle = (sub: Subtask) => updateDoc(doc(path, sub.id), { done: !sub.done });
  const remove = (id: string) => deleteDoc(doc(path, id));
  const done = subtasks.filter(s => s.done).length;

  return (
    <div className="mt-3 space-y-1.5">
      {subtasks.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1 bg-surface-high rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: Math.round((done / subtasks.length) * 100) + "%" }} />
          </div>
          <span className="text-[10px] text-muted-foreground">{done}/{subtasks.length}</span>
        </div>
      )}
      {subtasks.map(sub => (
        <div key={sub.id} className="flex items-center gap-2 group">
          <button onClick={() => toggle(sub)}
            className={"w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors " +
              (sub.done ? "bg-primary border-primary" : "border-surface-high hover:border-primary")}>
            {sub.done && <Check className="w-2.5 h-2.5 text-background" />}
          </button>
          <span className={"text-xs flex-1 " + (sub.done ? "line-through text-muted-foreground" : "text-foreground")}>{sub.title}</span>
          <button onClick={() => remove(sub.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <Input value={newSub} onChange={e => setNewSub(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          placeholder="+ Subtarefa..." className="bg-transparent border-0 border-b border-surface-high rounded-none text-xs px-0 h-7 focus-visible:ring-0" />
        {newSub.trim() && (
          <button onClick={add} className="text-primary text-xs">Adicionar</button>
        )}
      </div>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────

function PersonalTaskCard({
  task, uid, onDelete, onStatusChange,
}: {
  task: PersonalTask; uid: string;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: keyof typeof STATUS_CONFIG) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const conf = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.PENDENTE;
  const pConf = PRIORITY_CONFIG[task.priority];

  return (
    <div className={"bg-surface-low rounded-3xl border border-surface-mid overflow-hidden border-l-4 " + conf.border}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Done toggle */}
          <button onClick={() => onStatusChange(task.id, task.done ? "ATIVA" : "COMPLETA")}
            className={"w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors " +
              (task.done ? "bg-green-500 border-green-500" : "border-surface-high hover:border-primary")}>
            {task.done && <Check className="w-3 h-3 text-background" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={"text-sm font-medium flex-1 " + (task.done ? "line-through text-muted-foreground" : "text-foreground")}>
                {task.label}
              </p>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-lg hover:bg-surface-mid transition-colors">
                  {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <button onClick={() => onDelete(task.id)} className="p-1 rounded-lg hover:bg-surface-mid transition-colors text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge className={"text-[10px] px-1.5 py-0 " + conf.badge}>{conf.label}</Badge>
              <Badge className={"text-[10px] px-1.5 py-0 " + pConf.badge}>{task.priority}</Badge>
              {task.dueDate && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />{task.dueDate}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(task.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Expanded: description + status change + subtasks */}
        {expanded && (
          <div className="mt-3 pl-8 space-y-3">
            {task.description && (
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{task.description}</p>
            )}

            {/* Status chips */}
            <div className="flex flex-wrap gap-1.5">
              {ALL_STATUSES.map(s => {
                const c = STATUS_CONFIG[s];
                const Icon = c.icon;
                return (
                  <button key={s} onClick={() => onStatusChange(task.id, s)}
                    className={"flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors border " +
                      (task.status === s ? "border-primary bg-primary/10 text-primary" : "border-surface-high bg-surface-mid text-muted-foreground hover:text-foreground")}>
                    <Icon className="w-2.5 h-2.5" />{c.label}
                  </button>
                );
              })}
            </div>

            {/* Subtasks */}
            <SubtaskList taskId={task.id} uid={uid} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TasksManagementPage() {
  const uid = auth.currentUser?.uid ?? "";
  const userName = auth.currentUser?.displayName ?? "Usuário";
  const userEmail = auth.currentUser?.email ?? "";

  const [userRole, setUserRole] = useState("");
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [myAssignedTasks, setMyAssignedTasks] = useState<AssignedTask[]>([]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"todos" | keyof typeof STATUS_CONFIG>("todos");
  const [filterPriority, setFilterPriority] = useState<"todos" | "Alta" | "Media" | "Baixa">("todos");

  // New personal task form
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<"Alta" | "Media" | "Baixa">("Media");
  const [newDueDate, setNewDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Assign task form (CLEVEL/MANAGEMENT only)
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDescription, setAssignDescription] = useState("");
  const [assignPriority, setAssignPriority] = useState<"Alta" | "Media" | "Baixa">("Media");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignMode, setAssignMode] = useState<"person" | "team">("person");
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [myTeams, setMyTeams] = useState<TeamItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<RegisteredUser | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamItem | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingAssignData, setLoadingAssignData] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // ── Load user role ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "profiles", uid)).then(snap => setUserRole(snap.data()?.role ?? ""));
  }, [uid]);

  // ── Load personal tasks ───────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "tasks"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => {
      setLoadingTasks(false);
      setPersonalTasks(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          label: data.label ?? data.title ?? "",
          description: data.description,
          priority: data.priority ?? "Media",
          status: data.status ?? (data.done ? "COMPLETA" : "PENDENTE"),
          done: data.done ?? false,
          dueDate: data.dueDate,
          createdAt: data.createdAt,
        } as PersonalTask;
      }));
    });
  }, [uid]);

  // ── Load tasks I assigned to others ───────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "tasks"), where("createdByUid", "==", uid), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => {
      setAssignedTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignedTask)));
    });
  }, [uid]);

  // ── Load tasks assigned to me ─────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "tasks"), where("assignedToUid", "==", uid), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => {
      setMyAssignedTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignedTask)));
    });
  }, [uid]);

  // ── Load assign dialog data ───────────────────────────────────────────────
  useEffect(() => {
    if (!assignOpen || !uid) return;
    setLoadingAssignData(true);
    Promise.all([
      getDocs(collection(db, "profiles")),
      getDocs(query(collection(db, "users", uid, "teams"), orderBy("createdAt", "asc"))),
    ]).then(([profSnap, teamsSnap]) => {
      setRegisteredUsers(profSnap.docs.filter(d => d.id !== uid).map(d => ({ uid: d.id, ...d.data() } as RegisteredUser)));
      setMyTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TeamItem)));
      setLoadingAssignData(false);
    }).catch(() => setLoadingAssignData(false));
  }, [assignOpen, uid]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreatePersonal = async () => {
    if (!newTitle.trim() || !uid) return;
    setSaving(true);
    await addDoc(collection(db, "users", uid, "tasks"), {
      label: newTitle.trim(),
      description: newDescription.trim(),
      priority: newPriority,
      status: "PENDENTE",
      done: false,
      dueDate: newDueDate || null,
      createdAt: serverTimestamp(),
    });
    setNewTitle(""); setNewDescription(""); setNewPriority("Media"); setNewDueDate("");
    setSaving(false);
    setCreateOpen(false);
  };

  const handleDeletePersonal = async (taskId: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "tasks", taskId));
  };

  const handleStatusChangePersonal = async (taskId: string, status: keyof typeof STATUS_CONFIG) => {
    if (!uid) return;
    await updateDoc(doc(db, "users", uid, "tasks", taskId), {
      status,
      done: status === "COMPLETA",
      updatedAt: serverTimestamp(),
    });
  };

  const handleAssignTask = async () => {
    if (!assignTitle.trim() || !uid) return;
    if (assignMode === "person" && !selectedUser) return;
    if (assignMode === "team" && !selectedTeam) return;
    setAssigning(true);

    const taskData: any = {
      title: assignTitle.trim(),
      description: assignDescription.trim(),
      priority: assignPriority,
      status: "PENDENTE",
      dueDate: assignDueDate || null,
      createdByUid: uid,
      createdByName: userName,
      createdAt: serverTimestamp(),
    };

    if (assignMode === "person" && selectedUser) {
      taskData.assignedToUid = selectedUser.uid;
      taskData.assignedToName = selectedUser.name;
    } else if (assignMode === "team" && selectedTeam) {
      taskData.assignedToTeamId = selectedTeam.id;
      taskData.assignedToTeamName = selectedTeam.name;
    }

    await addDoc(collection(db, "tasks"), taskData);

    // Notification for individual assignment
    if (assignMode === "person" && selectedUser) {
      await addDoc(collection(db, "users", selectedUser.uid, "notifications"), {
        type: "task",
        title: "Nova tarefa atribuída!",
        description: `${userName} atribuiu a tarefa "${assignTitle.trim()}" para você.`,
        read: false,
        createdAt: serverTimestamp(),
      });
    }

    setAssignTitle(""); setAssignDescription(""); setAssignPriority("Media");
    setAssignDueDate(""); setSelectedUser(null); setSelectedTeam(null);
    setAssigning(false);
    setAssignOpen(false);
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredPersonal = personalTasks.filter(t => {
    const matchSearch = t.label.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || t.status === filterStatus;
    const matchPriority = filterPriority === "todos" || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const filteredUsers = registeredUsers.filter(u =>
    u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const pendingCount = personalTasks.filter(t => !t.done).length;
  const myReceivedCount = myAssignedTasks.filter(t => t.status !== "COMPLETA").length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-sans">Tarefas</h1>
            <p className="text-sm text-muted-foreground">
              {pendingCount > 0 ? `${pendingCount} pendentes` : "Tudo em dia!"}
            </p>
          </div>
          <div className="flex gap-2">
            {canAssign(userRole) && (
              <Button onClick={() => setAssignOpen(true)}
                variant="outline"
                className="rounded-2xl border-surface-mid text-sm">
                <UserPlus className="w-4 h-4 mr-1.5" />Atribuir
              </Button>
            )}
            <Button onClick={() => setCreateOpen(true)}
              className="rounded-2xl bg-primary hover:bg-primary/80 text-background text-sm">
              <Plus className="w-4 h-4 mr-1.5" />Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="minhas" className="w-full">
          <div className="grid grid-cols-3 gap-2 mb-5">
            <TabsList asChild>
              <div className="contents">
                {[
                  { value: "minhas", label: "Minhas", count: pendingCount },
                  { value: "recebidas", label: "Recebidas", count: myReceivedCount },
                  { value: "atribuidas", label: "Atribuídas", count: assignedTasks.length },
                ].map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value}
                    className="bg-surface-low border border-surface-mid rounded-2xl py-2.5 data-[state=active]:bg-primary data-[state=active]:text-background data-[state=active]:border-primary flex items-center gap-2 justify-center text-sm">
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary data-[state=active]:bg-background/20 data-[state=active]:text-background text-[10px] font-bold flex items-center justify-center">
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </div>
            </TabsList>
          </div>

          {/* ── Minhas Tarefas ─────────────────────────────────────────── */}
          <TabsContent value="minhas" className="space-y-3">
            {/* Search + filters */}
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar tarefa..." value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-10 bg-surface-low border border-surface-mid rounded-2xl text-sm" />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setFilterStatus("todos")}
                className={"px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors " + (filterStatus === "todos" ? "bg-primary text-background" : "bg-surface-mid text-muted-foreground")}>
                Todos
              </button>
              {ALL_STATUSES.map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={"px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors " + (filterStatus === s ? "bg-primary text-background" : "bg-surface-mid text-muted-foreground")}>
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
              <div className="w-px bg-surface-mid flex-shrink-0" />
              {(["Alta", "Media", "Baixa"] as const).map(p => (
                <button key={p} onClick={() => setFilterPriority(filterPriority === p ? "todos" : p)}
                  className={"px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors " + (filterPriority === p ? "bg-primary text-background" : "bg-surface-mid text-muted-foreground")}>
                  <Flag className="w-2.5 h-2.5 inline mr-1" />{p}
                </button>
              ))}
            </div>

            {loadingTasks ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-surface-low rounded-2xl p-4 border border-surface-mid space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-5 h-5 rounded bg-surface-high flex-shrink-0" />
                      <Skeleton className="h-4 w-2/5 bg-surface-high" />
                      <Skeleton className="h-5 w-14 rounded-full bg-surface-high ml-auto" />
                    </div>
                    <Skeleton className="h-3 w-3/4 bg-surface-high ml-8" />
                  </div>
                ))}
              </div>
            ) : filteredPersonal.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium text-foreground mb-1">
                  {search || filterStatus !== "todos" ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa ainda"}
                </p>
                <p className="text-xs mb-4">Crie sua primeira tarefa para começar.</p>
                <Button onClick={() => setCreateOpen(true)} className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
                  <Plus className="w-4 h-4 mr-2" />Nova Tarefa
                </Button>
              </div>
            ) : (
              filteredPersonal.map(task => (
                <PersonalTaskCard
                  key={task.id}
                  task={task}
                  uid={uid}
                  onDelete={handleDeletePersonal}
                  onStatusChange={handleStatusChangePersonal}
                />
              ))
            )}
          </TabsContent>

          {/* ── Recebidas (assigned to me) ─────────────────────────────── */}
          <TabsContent value="recebidas" className="space-y-3">
            {myAssignedTasks.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium text-foreground mb-1">Nenhuma tarefa atribuída a você</p>
                <p className="text-xs">Tarefas delegadas por líderes aparecerão aqui.</p>
              </div>
            ) : (
              myAssignedTasks.map(task => {
                const conf = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.PENDENTE;
                const pConf = PRIORITY_CONFIG[task.priority];
                return (
                  <div key={task.id} className={"bg-surface-low rounded-3xl border border-surface-mid p-4 border-l-4 " + conf.border}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge className={"text-[10px] px-1.5 py-0 " + conf.badge}>{conf.label}</Badge>
                          <Badge className={"text-[10px] px-1.5 py-0 " + pConf.badge}>{task.priority}</Badge>
                          {task.dueDate && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />{task.dueDate}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Atribuída por <span className="font-medium">{task.createdByName}</span> · {timeAgo(task.createdAt)}
                        </p>
                      </div>
                    </div>
                    {/* Status change */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {ALL_STATUSES.map(s => {
                        const c = STATUS_CONFIG[s];
                        const Icon = c.icon;
                        return (
                          <button key={s}
                            onClick={async () => { await updateDoc(doc(db, "tasks", task.id), { status: s, updatedAt: serverTimestamp() }); }}
                            className={"flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border " +
                              (task.status === s ? "border-primary bg-primary/10 text-primary" : "border-surface-high bg-surface-mid text-muted-foreground hover:text-foreground")}>
                            <Icon className="w-2.5 h-2.5" />{c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* ── Atribuídas por mim ─────────────────────────────────────── */}
          <TabsContent value="atribuidas" className="space-y-3">
            {!canAssign(userRole) ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Apenas gerentes e líderes podem atribuir tarefas.</p>
              </div>
            ) : assignedTasks.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium text-foreground mb-1">Nenhuma tarefa atribuída</p>
                <p className="text-xs mb-4">Atribua tarefas para membros da sua equipe.</p>
                <Button onClick={() => setAssignOpen(true)} variant="outline" className="rounded-2xl border-surface-mid">
                  <UserPlus className="w-4 h-4 mr-2" />Atribuir Tarefa
                </Button>
              </div>
            ) : (
              assignedTasks.map(task => {
                const conf = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.PENDENTE;
                const pConf = PRIORITY_CONFIG[task.priority];
                return (
                  <div key={task.id} className={"bg-surface-low rounded-3xl border border-surface-mid p-4 border-l-4 " + conf.border}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge className={"text-[10px] px-1.5 py-0 " + conf.badge}>{conf.label}</Badge>
                          <Badge className={"text-[10px] px-1.5 py-0 " + pConf.badge}>{task.priority}</Badge>
                          {task.dueDate && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />{task.dueDate}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                            {(task.assignedToName ?? task.assignedToTeamName ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {task.assignedToName
                              ? <><span className="font-medium">{task.assignedToName}</span></>
                              : <><Users className="w-2.5 h-2.5 inline mr-0.5" /><span className="font-medium">{task.assignedToTeamName}</span></>
                            }
                            {" · "}{timeAgo(task.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Create Personal Task Dialog ────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) { setNewTitle(""); setNewDescription(""); setNewPriority("Media"); setNewDueDate(""); } }}>
        <DialogContent className="bg-surface-low border-surface-mid max-w-md">
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título da tarefa *" value={newTitle} onChange={e => setNewTitle(e.target.value)}
              className="bg-surface-mid border-0 rounded-xl text-sm" autoFocus />
            <Textarea placeholder="Descrição (opcional)..." value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              className="bg-surface-mid border-0 rounded-xl text-sm min-h-24 resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Prioridade</label>
                <select value={newPriority} onChange={e => setNewPriority(e.target.value as any)}
                  className="w-full bg-surface-mid border-0 rounded-xl p-2.5 text-foreground text-sm">
                  <option value="Alta">🔴 Alta</option>
                  <option value="Media">🟡 Média</option>
                  <option value="Baixa">🟢 Baixa</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Prazo</label>
                <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                  className="bg-surface-mid border-0 rounded-xl text-sm" />
              </div>
            </div>
            <Button className="w-full rounded-xl bg-primary hover:bg-primary/80" onClick={handleCreatePersonal}
              disabled={!newTitle.trim() || saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : "Criar Tarefa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Assign Task Dialog ─────────────────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={(v) => { setAssignOpen(v); if (!v) { setSelectedUser(null); setSelectedTeam(null); setUserSearchQuery(""); } }}>
        <DialogContent className="bg-surface-low border-surface-mid max-w-md">
          <DialogHeader><DialogTitle>Atribuir Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título da tarefa *" value={assignTitle} onChange={e => setAssignTitle(e.target.value)}
              className="bg-surface-mid border-0 rounded-xl text-sm" autoFocus />
            <Textarea placeholder="Descrição (opcional)..." value={assignDescription}
              onChange={e => setAssignDescription(e.target.value)}
              className="bg-surface-mid border-0 rounded-xl text-sm min-h-20 resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Prioridade</label>
                <select value={assignPriority} onChange={e => setAssignPriority(e.target.value as any)}
                  className="w-full bg-surface-mid border-0 rounded-xl p-2.5 text-foreground text-sm">
                  <option value="Alta">🔴 Alta</option>
                  <option value="Media">🟡 Média</option>
                  <option value="Baixa">🟢 Baixa</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Prazo</label>
                <Input type="date" value={assignDueDate} onChange={e => setAssignDueDate(e.target.value)}
                  className="bg-surface-mid border-0 rounded-xl text-sm" />
              </div>
            </div>

            {/* Assign mode */}
            <div className="flex gap-2">
              <button onClick={() => { setAssignMode("person"); setSelectedTeam(null); }}
                className={"flex-1 py-2 rounded-xl text-sm font-medium transition-colors " +
                  (assignMode === "person" ? "bg-primary text-background" : "bg-surface-mid text-muted-foreground")}>
                <UserPlus className="w-4 h-4 inline mr-1.5" />Pessoa
              </button>
              <button onClick={() => { setAssignMode("team"); setSelectedUser(null); }}
                className={"flex-1 py-2 rounded-xl text-sm font-medium transition-colors " +
                  (assignMode === "team" ? "bg-primary text-background" : "bg-surface-mid text-muted-foreground")}>
                <Users className="w-4 h-4 inline mr-1.5" />Equipe
              </button>
            </div>

            {loadingAssignData ? (
              <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Carregando...</span>
              </div>
            ) : assignMode === "person" ? (
              <>
                {selectedUser ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/10 border border-primary/30">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{selectedUser.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedUser.role}</p>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Buscar pessoa..." value={userSearchQuery}
                        onChange={e => setUserSearchQuery(e.target.value)}
                        className="pl-10 bg-surface-mid border-0 rounded-xl text-sm" />
                    </div>
                    <div className="max-h-44 overflow-y-auto space-y-1">
                      {filteredUsers.map(u => (
                        <button key={u.uid} onClick={() => setSelectedUser(u)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-mid text-left transition-colors">
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.role}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              /* Team selection */
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {myTeams.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma equipe criada ainda.</p>
                ) : myTeams.map(team => (
                  <button key={team.id} onClick={() => setSelectedTeam(selectedTeam?.id === team.id ? null : team)}
                    className={"w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left border " +
                      (selectedTeam?.id === team.id ? "border-primary bg-primary/10" : "border-surface-mid bg-surface-mid hover:bg-surface-high")}>
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {team.name.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-medium text-foreground flex-1">{team.name}</p>
                    {selectedTeam?.id === team.id && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            <Button className="w-full rounded-xl bg-primary hover:bg-primary/80" onClick={handleAssignTask}
              disabled={!assignTitle.trim() || assigning || (assignMode === "person" && !selectedUser) || (assignMode === "team" && !selectedTeam)}>
              {assigning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Atribuindo...</> : "Atribuir Tarefa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
