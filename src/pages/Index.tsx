import { Package, Megaphone, CalendarDays, TrendingUp, Bell, ArrowUpRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

const stats = [
  { label: "Campanhas Ativas", value: "12", icon: Megaphone, color: "text-primary" },
  { label: "Reuniões Hoje", value: "3", icon: CalendarDays, color: "text-warning" },
  { label: "Produtos Ativos", value: "8", icon: Package, color: "text-info" },
  { label: "Leads Esta Semana", value: "47", icon: TrendingUp, color: "text-primary" },
];

const recentProducts = [
  { name: "App Salsa Delivery", type: "App / SaaS", progress: 72, status: "Em desenvolvimento" },
  { name: "Curso Marketing Digital", type: "Infoproduto", progress: 45, status: "Em desenvolvimento" },
  { name: "Loja Salsa Store", type: "E-commerce", progress: 90, status: "Lançado" },
  { name: "Landing Salsa Pro", type: "Landing Page", progress: 100, status: "Lançado" },
];

export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-low p-8 md:p-10">
        <img
          src="/parsley.png"
          alt=""
          className="absolute right-4 bottom-4 w-32 h-32 opacity-5 pointer-events-none"
        />
        <p className="text-muted-foreground text-sm font-medium mb-1">Bem-vindo de volta</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          Olá, <span className="text-primary">Equipe</span> 👋
        </h1>
        <p className="text-muted-foreground">
          Você tem <span className="text-foreground font-semibold">5 tarefas</span> pendentes e{" "}
          <span className="text-foreground font-semibold">2 notificações</span> novas.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface-low rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent products */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Produtos em Andamento</h2>
          <Link to="/products" className="text-sm text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="grid gap-3">
          {recentProducts.map((p) => (
            <div key={p.name} className="bg-surface-low rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-mid flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.type}</p>
              </div>
              <div className="hidden sm:flex items-center gap-3 w-40">
                <Progress value={p.progress} className="h-2 bg-surface-mid" />
                <span className="text-xs text-muted-foreground w-8">{p.progress}%</span>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full ${
                p.status === "Lançado" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
              }`}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications preview */}
      <div className="bg-surface-low rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Notificações Recentes</h2>
          <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">2</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="kinetic-pulse mt-2" />
            <div>
              <p className="text-sm">Nova tarefa atribuída em <strong>App Salsa Delivery</strong></p>
              <p className="text-xs text-muted-foreground">Há 5 minutos</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="kinetic-pulse mt-2" />
            <div>
              <p className="text-sm">Campanha <strong>"Black Friday"</strong> atingiu 1000 leads</p>
              <p className="text-xs text-muted-foreground">Há 1 hora</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
