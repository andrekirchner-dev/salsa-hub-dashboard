import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Circle, Clock, AlertTriangle,
  Loader2, MessageSquare, Send, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  doc, getDoc, collection, query, where, orderBy,
  getDocs, addDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/integrations/firebase/client";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assigneeName?: string;
  createdAt: string;
  dueDate?: string;
  productName?: string;
  productId: string;
}

interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  PENDENTE:     { label: "Pendente",     icon: Circle,        color: "text-blue-400"   },
  ATIVA:        { label: "Ativa",        icon: Clock,         color: "text-primary"    },
  EM_ANDAMENTO: { label: "Em Andamento", icon: Clock,         color: "text-yellow-400" },
  BLOQUEADA:    { label: "Bloqueada",    icon: AlertTriangle, color: "text-red-400"    },
  COMPLETA:     { label: "Completa",     icon: CheckCircle2,  color: "text-green-400"  },
};

const ALL_STATUSES = ["PENDENTE", "ATIVA", "EM_ANDAMENTO", "BLOQUEADA", "COMPLETA"];

export default function TaskPage() {
  const navigate = useNavigate();
  const { id: productId, taskId } = useParams<{ id: string; taskId: string }>();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingComment, setSendingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);

    const user = getAuth().currentUser;
    if (user) {
      setCurrentUserId(user.uid);
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      setCurrentUserName(profileSnap.data()?.name || "");
    }

    const taskSnap = await getDoc(doc(db, "tasks", taskId));
    if (taskSnap.exists()) {
      const data = taskSnap.data();

      let assigneeName: string | undefined;
      if (data.assignedTo) {
        const assigneeSnap = await getDoc(doc(db, "profiles", data.assignedTo));
        assigneeName = assigneeSnap.data()?.name;
      }

      let productName: string | undefined;
      if (data.productId) {
        const productSnap = await getDoc(doc(db, "products", data.productId));
        productName = productSnap.data()?.name;
      }

      setTask({
        id: taskSnap.id,
        title: data.title,
        description: data.description,
        status: data.status || "PENDENTE",
        priority: data.priority,
        assigneeName,
        createdAt: data.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "",
        dueDate: data.dueDate ? new Date(data.dueDate).toLocaleDateString("pt-BR") : undefined,
        productName,
        productId: data.productId,
      });
    }

    const commentsSnap = await getDocs(
      query(collection(db, "taskComments"), where("taskId", "==", taskId), orderBy("createdAt"))
    );

    const commentsData: Comment[] = [];
    for (const d of commentsSnap.docs) {
      const cData = d.data();
      let authorName = "—";
      let authorAvatar: string | undefined;
      if (cData.userId) {
        const authorSnap = await getDoc(doc(db, "profiles", cData.userId));
        authorName = authorSnap.data()?.name || "—";
        authorAvatar = authorSnap.data()?.avatarUrl;
      }
      commentsData.push({
        id: d.id,
        content: cData.content,
        authorName,
        authorAvatar,
        createdAt: cData.createdAt?.toDate?.()?.toLocaleDateString("pt-BR", {
          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
        }) || "",
      });
    }
    setComments(commentsData);
    setLoading(false);
  }, [taskId]);

  useEffect(() => { loadTask(); }, [loadTask]);

  const updateStatus = async (newStatus: string) => {
    if (!taskId || !task) return;
    setUpdatingStatus(true);
    await updateDoc(doc(db, "tasks", taskId), { status: newStatus, updatedAt: serverTimestamp() });
    await addDoc(collection(db, "productActivity"), {
      productId: task.productId,
      action: `Status da tarefa "${task.title}" alterado para ${newStatus}`,
      userId: currentUserId,
      createdAt: serverTimestamp(),
    });
    setTask((prev) => prev ? { ...prev, status: newStatus } : null);
    setUpdatingStatus(false);
  };

  const sendComment = async () => {
    if (!newComment.trim() || !taskId) return;
    setSendingComment(true);
    await addDoc(collection(db, "taskComments"), {
      taskId,
      content: newComment.trim(),
      userId: currentUserId,
      createdAt: serverTimestamp(),
    });
    setNewComment("");
    setSendingComment(false);
    loadTask();
  };

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

  const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDENTE;
  const StatusIcon = statusConf.icon;

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/products/${productId}`)}
          className="w-9 h-9 rounded-2xl bg-surface-low border border-surface-mid flex items-center justify-center hover:bg-surface-mid transition-colors flex-shrink-0">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          {task.productName && <p className="text-xs text-muted-foreground truncate">{task.productName}</p>}
          <h1 className="text-lg font-bold text-foreground leading-tight">{task.title}</h1>
        </div>
      </div>

      <div className="bg-surface-low border border-surface-mid rounded-3xl p-5 mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${statusConf.color}`} />
            <span className={`text-sm font-semibold ${statusConf.color}`}>{statusConf.label}</span>
          </div>
          {task.status !== "COMPLETA" && (
            <Button onClick={() => updateStatus("COMPLETA")} disabled={updatingStatus} size="sm"
              className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-2xl hover:bg-green-500/30">
              {updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Concluir</>}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {task.assigneeName && <div className="bg-surface-mid rounded-2xl p-3"><p className="text-muted-foreground mb-1">Responsável</p><p className="text-foreground font-medium">{task.assigneeName}</p></div>}
          {task.dueDate && <div className="bg-surface-mid rounded-2xl p-3"><p className="text-muted-foreground mb-1">Prazo</p><p className="text-foreground font-medium">{task.dueDate}</p></div>}
          <div className="bg-surface-mid rounded-2xl p-3"><p className="text-muted-foreground mb-1">Criada em</p><p className="text-foreground font-medium">{task.createdAt}</p></div>
          {task.priority && <div className="bg-surface-mid rounded-2xl p-3"><p className="text-muted-foreground mb-1">Prioridade</p><p className="text-foreground font-medium">{task.priority}</p></div>}
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Alterar status</p>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map((s) => {
              const conf = STATUS_CONFIG[s];
              const Icon = conf.icon;
              return (
                <button key={s} onClick={() => updateStatus(s)} disabled={updatingStatus || task.status === s}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${task.status === s ? "bg-surface-high border-primary/50 text-primary" : "bg-surface-mid border-surface-high text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="w-3 h-3" />{conf.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {task.description && (
        <div className="bg-surface-low border border-surface-mid rounded-3xl p-5 mb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Descrição</p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      <div className="bg-surface-low border border-surface-mid rounded-3xl overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-surface-mid flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">
            Comentários{comments.length > 0 && ` (${comments.length})`}
          </span>
        </div>

        {comments.length > 0 && (
          <div className="px-5 py-3 space-y-4 max-h-80 overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                  {c.authorAvatar
                    ? <img src={c.authorAvatar} alt={c.authorName} className="w-8 h-8 rounded-full object-cover" />
                    : c.authorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-foreground">{c.authorName}</span>
                    <span className="text-[10px] text-muted-foreground">{c.createdAt}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-5 py-4 border-t border-surface-mid">
          <div className="flex gap-2 items-end">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
              {currentUserName.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
            </div>
            <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)}
              placeholder="Adicionar comentário..."
              className="flex-1 bg-surface-mid border-surface-high rounded-2xl text-sm min-h-[40px] max-h-32 resize-none"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }} />
            <button onClick={sendComment} disabled={sendingComment || !newComment.trim()}
              className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0">
              {sendingComment ? <Loader2 className="w-4 h-4 animate-spin text-background" /> : <Send className="w-4 h-4 text-background" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
