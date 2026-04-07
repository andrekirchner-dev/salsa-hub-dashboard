import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Circle, Clock, AlertTriangle,
  Loader2, MessageSquare, Send, Plus, Trash2, Check, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { auth, db } from "@/integrations/firebase/client";
import {
  doc, getDoc, collection, query, orderBy,
  onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  description: string;
  status: "ATIVA" | "BLOQUEADA" | "COMPLETA" | "MILESTONE" | "PENDENTE";
  createdAt: any;
}

interface Subtask {
  id: string;
  title: string;
  done: boolean;
  createdAt: any;
}

interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorUid: string;
  createdAt: any;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ATIVA:     { label: "Ativa",      icon: Clock,         color: "text-primary",    badge: "bg-primary/20 text-primary"      },
  PENDENTE:  { label: "Pendente",   icon: Circle,        color: "text-blue-400",   badge: "bg-blue-500/20 text-blue-400"    },
  BLOQUEADA: { label: "Bloqueada",  icon: AlertTriangle, color: "text-red-400",    badge: "bg-red-500/20 text-red-400"      },
  COMPLETA:  { label: "Completa",   icon: CheckCircle2,  color: "text-green-400",  badge: "bg-green-500/20 text-green-400"  },
  MILESTONE: { label: "Milestone",  icon: Trophy,        color: "text-amber-400",  badge: "bg-amber-500/20 text-amber-400"  },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>;

function timeAgo(ts: any): string {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TaskPage() {
  const navigate = useNavigate();
  const { id: productId, taskId } = useParams<{ id: string; taskId: string }>();
  const uid = auth.currentUser?.uid ?? "";
  const userName = auth.currentUser?.displayName ?? "Usuário";

  const [task, setTask] = useState<Task | null>(null);
  const [productName, setProductName] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [description, setDescription] = useState("");
  const [descSaving, setDescSaving] = useState(false);

  // Subtask input
  const [newSubtask, setNewSubtask] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);

  // Comment input
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // ── Paths ─────────────────────────────────────────────────────────────────
  const taskPath = uid && productId && taskId
    ? doc(db, "users", uid, "products", productId, "tasks", taskId)
    : null;
  const subtasksPath = uid && productId && taskId
    ? collection(db, "users", uid, "products", productId, "tasks", taskId, "subtasks")
    : null;
  const commentsPath = uid && productId && taskId
    ? collection(db, "users", uid, "products", productId, "tasks", taskId, "comments")
    : null;

  // ── Load task + product name ──────────────────────────────────────────────
  useEffect(() => {
    if (!taskPath || !productId) return;
    setLoading(true);
    getDoc(taskPath).then((snap) => {
      if (snap.exists()) {
        const d = snap.data() as Omit<Task, "id">;
        setTask({ id: snap.id, ...d });
        setDescription(d.description ?? "");
      }
      setLoading(false);
    });
    // Load product name
    getDoc(doc(db, "users", uid, "products", productId)).then((snap) => {
      setProductName(snap.data()?.name ?? "");
    });
  }, [taskId, productId, uid]);

  // ── Load subtasks ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!subtasksPath) return;
    const q = query(subtasksPath, orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setSubtasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subtask)));
    });
  }, [taskId, productId, uid]);

  // ── Load comments ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!commentsPath) return;
    const q = query(commentsPath, orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    });
  }, [taskId, productId, uid]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveDescription = async () => {
    if (!taskPath || !task) return;
    setDescSaving(true);
    await updateDoc(taskPath, { description, updatedAt: serverTimestamp() });
    setTask(prev => prev ? { ...prev, description } : null);
    setDescSaving(false);
  };

  const handleStatusChange = async (status: Task["status"]) => {
    if (!taskPath || !task || updatingStatus) return;
    setUpdatingStatus(true);
    await updateDoc(taskPath, { status, updatedAt: serverTimestamp() });
    setTask(prev => prev ? { ...prev, status } : null);
    // Log activity
    if (productId && uid) {
      await addDoc(collection(db, "users", uid, "products", productId, "activity"), {
        action: `Status da tarefa "${task.title}" → ${STATUS_CONFIG[status].label}`,
        user: userName,
        createdAt: serverTimestamp(),
      });
    }
    setUpdatingStatus(false);
  };

  const handleAddSubtask = async () => {
    if (!subtasksPath || !newSubtask.trim()) return;
    setAddingSubtask(true);
    await addDoc(subtasksPath, {
      title: newSubtask.trim(),
      done: false,
      createdAt: serverTimestamp(),
    });
    setNewSubtask("");
    setAddingSubtask(false);
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    if (!subtasksPath) return;
    await updateDoc(doc(subtasksPath, subtask.id), { done: !subtask.done });
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!subtasksPath) return;
    await deleteDoc(doc(subtasksPath, subtaskId));
  };

  const handleSendComment = async () => {
    if (!commentsPath || !newComment.trim()) return;
    setSendingComment(true);
    await addDoc(commentsPath, {
      content: newComment.trim(),
      authorName: userName,
      authorUid: uid,
      createdAt: serverTimestamp(),
    });
    setNewComment("");
    setSendingComment(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const subtasksDone = subtasks.filter(s => s.done).length;
  const subtasksTotal = subtasks.length;
  const subtaskPct = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Tarefa não encontrada.</p>
          <Button onClick={() => navigate(`/products/${productId}`)} variant="outline" className="rounded-2xl">Voltar</Button>
        </div>
      </div>
    );
  }

  const statusConf = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.ATIVA;
  const StatusIcon = statusConf.icon;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(`/products/${productId}`)}
            className="w-9 h-9 rounded-2xl bg-surface-low border border-surface-mid flex items-center justify-center hover:bg-surface-mid transition-colors flex-shrink-0 mt-0.5"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            {productName && (
              <p className="text-xs text-muted-foreground truncate mb-0.5">{productName}</p>
            )}
            <h1 className="text-xl font-bold text-foreground leading-tight">{task.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={"text-[10px] px-2 py-0.5 " + statusConf.badge}>
                {statusConf.label}
              </Badge>
              {subtasksTotal > 0 && (
                <span className="text-xs text-muted-foreground">{subtasksDone}/{subtasksTotal} subtarefas</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Status change ─────────────────────────────────────────────── */}
        <div className="bg-surface-low border border-surface-mid rounded-3xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">Status</p>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map((s) => {
              const conf = STATUS_CONFIG[s];
              const Icon = conf.icon;
              const isActive = task.status === s;
              return (
                <button
                  key={s}
                  onClick={() => !isActive && handleStatusChange(s)}
                  disabled={updatingStatus}
                  className={
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border " +
                    (isActive
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-surface-high bg-surface-mid text-muted-foreground hover:text-foreground hover:border-surface-high")
                  }
                >
                  <Icon className="w-3 h-3" />
                  {conf.label}
                  {isActive && updatingStatus && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Info Box (editable description) ──────────────────────────── */}
        <div className="bg-surface-low border border-surface-mid rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Informações / Descrição</p>
            {descSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleSaveDescription}
            placeholder="Descreva a tarefa, adicione contexto, links, critérios de aceite..."
            className="bg-surface-mid border-0 rounded-2xl text-sm min-h-32 resize-none leading-relaxed"
          />
          <p className="text-[10px] text-muted-foreground mt-2">Salvo automaticamente ao sair do campo.</p>
        </div>

        {/* ── Subtasks ─────────────────────────────────────────────────── */}
        <div className="bg-surface-low border border-surface-mid rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Subtarefas {subtasksTotal > 0 && `(${subtasksDone}/${subtasksTotal})`}
            </p>
            {subtasksTotal > 0 && (
              <span className="text-xs font-medium text-primary">{subtaskPct}%</span>
            )}
          </div>

          {/* Progress bar */}
          {subtasksTotal > 0 && (
            <div className="w-full h-1.5 bg-surface-mid rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: subtaskPct + "%" }}
              />
            </div>
          )}

          {/* Subtask list */}
          <div className="space-y-2 mb-3">
            {subtasks.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">Nenhuma subtarefa. Adicione abaixo.</p>
            )}
            {subtasks.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-mid transition-colors group"
              >
                <button
                  onClick={() => handleToggleSubtask(sub)}
                  className={
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors " +
                    (sub.done
                      ? "bg-primary border-primary"
                      : "border-surface-high hover:border-primary")
                  }
                >
                  {sub.done && <Check className="w-3 h-3 text-background" />}
                </button>
                <span className={
                  "text-sm flex-1 " +
                  (sub.done ? "line-through text-muted-foreground" : "text-foreground")
                }>
                  {sub.title}
                </span>
                <button
                  onClick={() => handleDeleteSubtask(sub.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add subtask */}
          <div className="flex gap-2">
            <Input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
              placeholder="Nova subtarefa..."
              className="bg-surface-mid border-0 rounded-xl text-sm flex-1"
            />
            <Button
              size="sm"
              onClick={handleAddSubtask}
              disabled={!newSubtask.trim() || addingSubtask}
              className="rounded-xl bg-primary hover:bg-primary/80 text-background flex-shrink-0"
            >
              {addingSubtask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* ── Comments ─────────────────────────────────────────────────── */}
        <div className="bg-surface-low border border-surface-mid rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-mid flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground text-sm">
              Comentários{comments.length > 0 && ` (${comments.length})`}
            </span>
          </div>

          {comments.length > 0 && (
            <div className="px-5 py-3 space-y-4 max-h-72 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                    {c.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">{c.authorName}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-5 py-4 border-t border-surface-mid">
            <div className="flex gap-2 items-end">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicionar comentário..."
                className="flex-1 bg-surface-mid border-surface-high rounded-2xl text-sm min-h-[40px] max-h-32 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); }
                }}
              />
              <button
                onClick={handleSendComment}
                disabled={sendingComment || !newComment.trim()}
                className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {sendingComment
                  ? <Loader2 className="w-4 h-4 animate-spin text-background" />
                  : <Send className="w-4 h-4 text-background" />}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
