import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Calendar, Package, Users, ChevronDown, ChevronUp, ListTodo, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, db } from "@/integrations/firebase/client";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, where, getDocs, serverTimestamp,
} from "firebase/firestore";

interface Task {
  id: string;
  label: string;
  priority: "Alta" | "Media" | "Baixa";
  done: boolean;
}

interface StatCard {
  label: string;
  value: string;
  icon: any;
  color: string;
  bg: string;
  route: string;
}

const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia,";
  if (h < 18) return "Boa tarde,";
  return "Boa noite,";
}

export default function Index() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid ?? "";
  const userName = auth.currentUser?.displayName?.split(" ")[0] ?? "Olá";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPriority, setNewPriority] = useState<"Alta" | "Media" | "Baixa">("Media");
  const [stats, setStats] = useState({ campaigns: 0, meetings: 0, products: 0, leads: 0 });
  const [recentProducts, setRecentProducts] = useState<{ id: string; name: string; type: string; progress: number }[]>([]);

  const now = new Date();

  // Real-time tasks
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "tasks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });
    return unsub;
  }, [uid]);

  // Load stats
  useEffect(() => {
    if (!uid) return;
    async function loadStats() {
      const [prodSnap, campaignSnap, meetingSnap] = await Promise.all([
        getDocs(collection(db, "users", uid, "products")),
        getDocs(query(collection(db, "users", uid, "campaigns"), where("status", "==", "Ativa"))),
        getDocs(collection(db, "users", uid, "meetings")),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      const todayMeetings = meetingSnap.docs.filter(d => (d.data().date ?? "").startsWith(today)).length;
      const totalLeads = campaignSnap.docs.reduce((acc, d) => acc + (d.data().leads ?? 0), 0);

      setStats({
        products: prodSnap.size,
        campaigns: campaignSnap.size,
        meetings: todayMeetings,
        leads: totalLeads,
      });

      setRecentProducts(
        prodSnap.docs.slice(0, 4).map(d => ({
          id: d.id,
          name: d.data().name ?? "",
          type: d.data().type ?? "",
          progress: d.data().progress ?? 0,
        }))
      );
    }
    loadStats();
  }, [uid]);

  const pendingCount = tasks.filter(t => !t.done).length;

  const toggleTask = async (task: Task) => {
    await updateDoc(doc(db, "users", uid, "tasks", task.id), { done: !task.done });
  };

  const deleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, "users", uid, "tasks", taskId));
  };

  const addTask = async () => {
    if (!newLabel.trim()) return;
    await addDoc(collection(db, "users", uid, "tasks"), {
      label: newLabel.trim(),
      priority: newPriority,
      done: false,
      createdAt: serverTimestamp(),
    });
    setNewLabel("");
    setAddOpen(false);
  };

  const statCards: StatCard[] = [
    { label: "Campanhas Ativas", value: String(stats.campaigns), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", route: "/marketing" },
    { label: "Reuniões Hoje", value: String(stats.meetings), icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/10", route: "/calendar" },
    { label: "Produtos Ativos", value: String(stats.products), icon: Package, color: "text-purple-400", bg: "bg-purple-500/10", route: "/products" },
    { label: "Leads (campanhas)", value: String(stats.leads), icon: Users, color: "text-yellow-400", bg: "bg-yellow-500/10", route: "/marketing" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{greeting()}</p>
          <h1 className="text-2xl font-bold text-foreground font-sans">{userName}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{dayNames[now.getDay()]}</p>
          <p className="text-xs text-muted-foreground">{now.getDate()} de {monthNames[now.getMonth()]}</p>
        </div>
      </div>

      {/* Tasks Drawer */}
      <div className="bg-surface-low rounded-3xl border border-surface-mid overflow-hidden">
        <button
          onClick={() => setTasksOpen(!tasksOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-mid transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-primary/15 flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Suas Tarefas</span>
            {!tasksOpen && pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-background text-xs font-bold">{pendingCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {tasksOpen && <span className="text-xs text-muted-foreground">{pendingCount} pendentes</span>}
            {tasksOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>
        {tasksOpen && (
          <div className="px-4 pb-4 border-t border-surface-mid pt-3 space-y-2">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa ainda. Crie a primeira!</p>
            ) : (
              tasks.map(task => (
                <div key={task.id} className={"flex items-center gap-3 p-3 rounded-2xl group " + (task.done ? "opacity-50" : "hover:bg-surface-mid")}>
                  <Checkbox
                    checked={task.done}
                    onCheckedChange={() => toggleTask(task)}
                    className="rounded-lg border-surface-high data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className={"text-sm flex-1 text-foreground " + (task.done ? "line-through" : "")}>{task.label}</span>
                  <Badge className={"text-xs flex-shrink-0 " + (task.priority === "Alta" ? "bg-red-500/20 text-red-400" : task.priority === "Baixa" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400")}>{task.priority}</Badge>
                  <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
            {addOpen ? (
              <div className="flex gap-2 items-center pt-1">
                <Input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTask()}
                  placeholder="Nova tarefa..."
                  className="bg-surface-mid border-0 rounded-xl text-sm flex-1"
                  autoFocus
                />
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as any)}
                  className="bg-surface-mid border-0 rounded-xl p-2 text-foreground text-xs"
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
                <Button size="sm" onClick={addTask} className="rounded-xl bg-primary hover:bg-primary/80 text-background text-xs">Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddOpen(false)} className="rounded-xl text-xs">Cancelar</Button>
              </div>
            ) : (
              <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors pt-1 pl-1">
                <Plus className="w-3.5 h-3.5" />
                Adicionar tarefa
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <button key={card.label} onClick={() => navigate(card.route)} className="bg-surface-low rounded-3xl p-4 border border-surface-mid hover:bg-surface-mid active:scale-95 transition-all text-left">
              <div className={"w-9 h-9 rounded-2xl " + card.bg + " flex items-center justify-center mb-3"}>
                <Icon className={"w-5 h-5 " + card.color} />
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </button>
          );
        })}
      </div>

      {/* Recent Products */}
      <div className="bg-surface-low rounded-3xl p-4 border border-surface-mid">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Produtos Recentes</h2>
          <button onClick={() => navigate("/products")} className="text-xs text-primary hover:underline">Ver todos</button>
        </div>
        {recentProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum produto ainda.</p>
            <button onClick={() => navigate("/products")} className="text-xs text-primary mt-1 hover:underline">Criar produto</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentProducts.map(p => (
              <button key={p.id} onClick={() => navigate(`/products/${p.id}`)} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-mid active:scale-95 transition-all text-left">
                <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.type}</p>
                  <div className="w-full h-1 bg-surface-mid rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: p.progress + "%" }} />
                  </div>
                </div>
                <span className="text-xs font-medium text-primary flex-shrink-0">{p.progress}%</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
