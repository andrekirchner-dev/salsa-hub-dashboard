import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, Calendar, Package, Users,
  ChevronDown, ChevronUp, ListTodo, BookOpen, Loader2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  collection, query, where, orderBy, limit,
  getDocs, getCountFromServer, doc, updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/integrations/firebase/client";

interface Task {
  id: string;
  label: string;
  priority: "Alta" | "Media" | "Baixa";
  done: boolean;
}

interface StatCard {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  route: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  Alta:  "bg-red-500/20 text-red-400 border-red-500/30",
  Media: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Baixa: "bg-green-500/20 text-green-400 border-green-500/30",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDate() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

export default function Index() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [bibliotecaOpen, setBibliotecaOpen] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [userName, setUserName] = useState("");

  const loadData = useCallback(async () => {
    const user = getAuth().currentUser;
    if (!user) return;

    const profileSnap = await getDocs(
      query(collection(db, "profiles"), where("__name__", "==", user.uid))
    );
    if (!profileSnap.empty) {
      const name: string = profileSnap.docs[0].data().name || "";
      setUserName(name.split(" ")[0]);
    }

    setLoadingTasks(true);
    const tasksSnap = await getDocs(
      query(
        collection(db, "tasks"),
        where("assignedTo", "==", user.uid),
        where("status", "!=", "COMPLETA"),
        orderBy("status"),
        orderBy("createdAt", "desc"),
        limit(20)
      )
    );
    setTasks(
      tasksSnap.docs.map((d) => ({
        id: d.id,
        label: d.data().title,
        priority: d.data().priority || "Media",
        done: d.data().status === "COMPLETA",
      }))
    );
    setLoadingTasks(false);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [campaigns, meetings, products, members] = await Promise.all([
      getCountFromServer(query(collection(db, "marketingCampaigns"), where("status", "==", "ativa"))),
      getCountFromServer(query(collection(db, "calendarEvents"), where("startTime", ">=", today), where("startTime", "<", tomorrow))),
      getCountFromServer(query(collection(db, "products"), where("status", "==", "ativo"))),
      getCountFromServer(collection(db, "profiles")),
    ]);

    setStats([
      { label: "Campanhas Ativas",  value: String(campaigns.data().count),  icon: TrendingUp, color: "text-primary",     bg: "bg-primary/10",    route: "/marketing" },
      { label: "Reuniões Hoje",     value: String(meetings.data().count),   icon: Calendar,   color: "text-blue-400",   bg: "bg-blue-500/10",   route: "/calendar"  },
      { label: "Produtos Ativos",   value: String(products.data().count),   icon: Package,    color: "text-purple-400", bg: "bg-purple-500/10", route: "/products"  },
      { label: "Membros da Equipe", value: String(members.data().count),    icon: Users,      color: "text-orange-400", bg: "bg-orange-500/10", route: "/team"      },
    ]);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: newDone } : t)));
    await updateDoc(doc(db, "tasks", id), { status: newDone ? "COMPLETA" : "ATIVA" });
  };

  const pendingCount = tasks.filter((t) => !t.done).length;
  const dateParts = formatDate().split(",");

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{getGreeting()},</p>
          <h1 className="text-2xl font-bold text-foreground">{userName || "..."}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground capitalize">{dateParts[0]?.trim()}</p>
          <p className="text-xs text-muted-foreground capitalize">{dateParts[1]?.trim()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-low border border-surface-mid rounded-3xl p-4 h-20 animate-pulse" />
            ))
          : stats.map((card) => (
              <button key={card.label} onClick={() => navigate(card.route)}
                className="bg-surface-low border border-surface-mid rounded-3xl p-4 text-left hover:bg-surface-mid active:scale-95 transition-all">
                <div className={`w-8 h-8 rounded-2xl ${card.bg} flex items-center justify-center mb-2`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <p className="text-xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">{card.label}</p>
              </button>
            ))}
      </div>

      <div className="bg-surface-low rounded-3xl border border-surface-mid overflow-hidden">
        <button onClick={() => setTasksOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-mid transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-2xl bg-surface-high flex items-center justify-center flex-shrink-0">
              <ListTodo className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Suas Tarefas</span>
            {pendingCount > 0 && !tasksOpen && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                {pendingCount}
              </span>
            )}
          </div>
          {tasksOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {tasksOpen && (
          <div className="px-5 pb-5 border-t border-surface-mid pt-4 space-y-2">
            {loadingTasks ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa pendente.</p>
            ) : (
              tasks.map((task) => (
                <div key={task.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${task.done ? "opacity-50" : "hover:bg-surface-mid"}`}>
                  <Checkbox checked={task.done} onCheckedChange={() => toggleTask(task.id)}
                    className="border-surface-high data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0" />
                  <span className={`text-sm flex-1 text-left ${task.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.label}
                  </span>
                  <Badge variant="outline" className={`text-xs rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="bg-surface-low rounded-3xl border border-surface-mid overflow-hidden">
        <button onClick={() => setBibliotecaOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-mid transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-2xl bg-surface-high flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Biblioteca</span>
          </div>
          {bibliotecaOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {bibliotecaOpen && (
          <div className="px-5 pb-5 border-t border-surface-mid pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Ferramentas e recursos validados pela equipe SalsaHub.
            </p>
            <button onClick={() => navigate("/library")}
              className="w-full flex items-center justify-center gap-2 bg-primary text-background font-semibold py-3 rounded-2xl hover:bg-primary/90 active:scale-95 transition-all">
              <BookOpen className="w-4 h-4" />
              Abrir Biblioteca
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
