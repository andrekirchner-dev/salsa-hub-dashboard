import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package, Calendar, Megaphone } from "lucide-react";

const mockTasks = [
  { id: 1, title: "Revisar campanha App Delivery", deadline: "hoje", completed: false },
  { id: 2, title: "Atualizar briefing Salsa Store", deadline: "concluída", completed: true },
  { id: 3, title: "Reunião com equipe design", deadline: "14h", completed: false },
  { id: 4, title: "Aprovar landing page", deadline: "amanhã", completed: false },
];

const mockProducts = [
  { id: 1, name: "App Salsa Delivery", type: "App / SaaS", progress: 72, status: "ativo" },
  { id: 2, name: "Curso Marketing Digital", type: "Infoproduto", progress: 45, status: "ativo" },
  { id: 3, name: "Loja Salsa Store", type: "E-commerce", progress: 90, status: "ativo" },
  { id: 4, name: "Landing Salsa Pro", type: "Landing Page", progress: 100, status: "lançado" },
];

const statCards = [
  { title: "Campanhas Ativas", value: "12", icon: Megaphone, color: "text-blue-400", url: "/marketing" },
  { title: "Reuniões Hoje", value: "3", icon: Calendar, color: "text-primary", url: "/calendar" },
  { title: "Produtos Ativos", value: "8", icon: Package, color: "text-yellow-400", url: "/products" },
  { title: "Leads Esta Semana", value: "47", icon: TrendingUp, color: "text-purple-400", url: "/marketing" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground font-sans">Olá, André 👋</h1>
          <p className="text-muted-foreground">Bem-vindo de volta ao SalsaHub</p>
        </div>

        <div className="bg-surface-low rounded-3xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 font-sans">Suas Tarefas</h2>
          <div className="space-y-2">
            {mockTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-surface-mid transition-colors">
                <Checkbox checked={task.completed} className="h-5 w-5 rounded border-primary" />
                <p className={`text-sm font-medium flex-1 ${task.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</p>
                <Badge variant="secondary" className="text-xs bg-surface-high text-muted-foreground flex-shrink-0">{task.deadline}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} onClick={() => navigate(card.url)} className="cursor-pointer bg-surface-low rounded-3xl p-5 hover:bg-surface-mid transition-all group">
                <div className="p-2.5 rounded-2xl bg-surface-mid group-hover:bg-surface-high w-fit mb-4 transition-colors">
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <p className="text-xs text-muted-foreground mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-primary">{card.value}</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground font-sans">Produtos em Andamento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockProducts.map((p) => (
              <div key={p.id} className="bg-surface-low rounded-3xl p-5 hover:bg-surface-mid transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.type}</p>
                  </div>
                  <Badge className={`text-xs ${p.status === "ativo" ? "bg-green-500/20 text-green-400" : "bg-primary/20 text-primary"}`}>{p.status}</Badge>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Progresso</span>
                  <span className="text-xs font-medium text-primary">{p.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-high rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
