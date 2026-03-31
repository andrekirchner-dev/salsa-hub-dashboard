import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Calendar, Package, Users, ChevronDown, ChevronUp, ListTodo } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const tasks = [
  { id: 1, label: "Revisar briefing do App Delivery", priority: "Alta" },
  { id: 2, label: "Enviar proposta para cliente", priority: "Alta" },
  { id: 3, label: "Atualizar landing page", priority: "Media" },
  { id: 4, label: "Reuniao de alinhamento com equipe", priority: "Media" },
];

const statCards = [
  { label: "Campanhas Ativas", value: "3", icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", route: "/marketing" },
  { label: "Reunioes Hoje", value: "4", icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/10", route: "/calendar" },
  { label: "Produtos Ativos", value: "7", icon: Package, color: "text-purple-400", bg: "bg-purple-500/10", route: "/products" },
  { label: "Leads Esta Semana", value: "128", icon: Users, color: "text-yellow-400", bg: "bg-yellow-500/10", route: "/marketing" },
];

export default function Index() {
  const navigate = useNavigate();
  const [tasksDone, setTasksDone] = useState<number[]>([3]);
  const [tasksOpen, setTasksOpen] = useState(false);

  const pendingCount = tasks.filter(t => !tasksDone.includes(t.id)).length;

  const toggleTask = (id: number) => {
    setTasksDone(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Bom dia,</p>
          <h1 className="text-2xl font-bold text-foreground font-sans">Andre</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Terca-feira</p>
          <p className="text-xs text-muted-foreground">31 de Marco</p>
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
            {tasks.map(task => (
              <div key={task.id} className={"flex items-center gap-3 p-3 rounded-2xl " + (tasksDone.includes(task.id) ? "opacity-50" : "hover:bg-surface-mid")}>
                <Checkbox
                  checked={tasksDone.includes(task.id)}
                  onCheckedChange={() => toggleTask(task.id)}
                  className="rounded-lg border-surface-high data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className={"text-sm flex-1 text-foreground " + (tasksDone.includes(task.id) ? "line-through" : "")}>{task.label}</span>
                <Badge className={"text-xs flex-shrink-0 " + (task.priority === "Alta" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400")}>{task.priority}</Badge>
              </div>
            ))}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: "App Delivery", type: "Mobile App", progress: 75 },
            { name: "Salsa Store", type: "E-commerce", progress: 100 },
            { name: "Landing Page Pro", type: "Web", progress: 60 },
            { name: "Curso Marketing", type: "Infoproduto", progress: 40 },
          ].map(p => (
            <button key={p.name} onClick={() => navigate("/products")} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-mid active:scale-95 transition-all text-left">
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
      </div>
    </div>
  );
}
