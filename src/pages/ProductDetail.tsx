import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Package, FileText, Users, ListTodo, ExternalLink, Upload, Plus, GripVertical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const mockProduct = {
  name: "App Salsa Delivery",
  type: "App / SaaS",
  status: "Em desenvolvimento",
  progress: 72,
  description: "Aplicativo de delivery para a rede Salsa. Inclui módulos de pedidos, pagamentos e rastreamento.",
};

const mockDocs = [
  { name: "Briefing.pdf", size: "2.4 MB", date: "2024-01-15" },
  { name: "Wireframes.fig", size: "12 MB", date: "2024-01-20" },
  { name: "Contrato.docx", size: "340 KB", date: "2024-02-01" },
];

const mockTeam = [
  { name: "Ana Silva", role: "Designer", avatar: "A" },
  { name: "Carlos Lima", role: "Desenvolvedor", avatar: "C" },
  { name: "Pedro Santos", role: "PM", avatar: "P" },
];

interface Task {
  id: string;
  title: string;
  column: "todo" | "progress" | "done";
}

const initialTasks: Task[] = [
  { id: "1", title: "Design do onboarding", column: "done" },
  { id: "2", title: "Integração de pagamento", column: "progress" },
  { id: "3", title: "Testes de API", column: "progress" },
  { id: "4", title: "Deploy para produção", column: "todo" },
  { id: "5", title: "Documentação", column: "todo" },
];

const mockApps = [
  { name: "Figma", url: "https://figma.com" },
  { name: "GitHub", url: "https://github.com" },
  { name: "Stripe", url: "https://stripe.com" },
];

export default function ProductDetail() {
  const { id } = useParams();
  const [tasks, setTasks] = useState(initialTasks);
  const [newTask, setNewTask] = useState("");
  const [newApp, setNewApp] = useState({ name: "", url: "" });
  const [apps, setApps] = useState(mockApps);

  const addTask = () => {
    if (!newTask) return;
    setTasks([...tasks, { id: String(Date.now()), title: newTask, column: "todo" }]);
    setNewTask("");
  };

  const moveTask = (taskId: string, newCol: Task["column"]) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, column: newCol } : t));
  };

  const addApp = () => {
    if (!newApp.name || !newApp.url) return;
    setApps([...apps, newApp]);
    setNewApp({ name: "", url: "" });
  };

  const columns: { key: Task["column"]; label: string; color: string }[] = [
    { key: "todo", label: "A Fazer", color: "text-muted-foreground" },
    { key: "progress", label: "Em Progresso", color: "text-warning" },
    { key: "done", label: "Concluído", color: "text-primary" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      {/* Header */}
      <div className="bg-surface-low rounded-3xl p-6 md:p-8 flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-surface-mid flex items-center justify-center shrink-0">
          <Package className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{mockProduct.name}</h1>
            <span className="text-xs px-3 py-1 rounded-full bg-warning/10 text-warning">{mockProduct.status}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{mockProduct.type}</p>
          <div className="flex items-center gap-3 mt-4 w-full max-w-xs">
            <Progress value={mockProduct.progress} className="h-2 bg-surface-mid" />
            <span className="text-sm font-medium">{mockProduct.progress}%</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-surface-low rounded-full p-1 h-auto flex-wrap">
          <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Visão Geral</TabsTrigger>
          <TabsTrigger value="docs" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Documentos</TabsTrigger>
          <TabsTrigger value="team" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Equipe</TabsTrigger>
          <TabsTrigger value="kanban" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Planejamento</TabsTrigger>
          <TabsTrigger value="apps" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Apps</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="bg-surface-low rounded-3xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">Descrição</h2>
            <p className="text-muted-foreground">{mockProduct.description}</p>
          </div>
        </TabsContent>

        <TabsContent value="docs">
          <div className="bg-surface-low rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Documentos</h2>
              <Button size="sm" className="rounded-full gap-2">
                <Upload className="w-4 h-4" /> Upload
              </Button>
            </div>
            <div className="space-y-2">
              {mockDocs.map(d => (
                <div key={d.name} className="flex items-center gap-3 bg-surface-mid rounded-xl p-4">
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.size} · {d.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="bg-surface-low rounded-3xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">Equipe do Produto</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {mockTeam.map(m => (
                <div key={m.name} className="flex items-center gap-3 bg-surface-mid rounded-xl p-4">
                  <span className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                    {m.avatar}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="kanban">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Nova tarefa..."
                className="bg-surface-low border-0 rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
              <Button onClick={addTask} className="rounded-full shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {columns.map(col => (
                <div key={col.key} className="bg-surface-low rounded-3xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`kinetic-pulse ${col.key === "done" ? "" : col.key === "progress" ? "!bg-warning" : "!bg-muted-foreground"}`} />
                    <h3 className={`font-semibold text-sm ${col.color}`}>{col.label}</h3>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {tasks.filter(t => t.column === col.key).length}
                    </span>
                  </div>
                  {tasks.filter(t => t.column === col.key).map(task => (
                    <div key={task.id} className="bg-surface-mid rounded-xl p-3 flex items-center gap-2 group">
                      <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="text-sm flex-1">{task.title}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {columns.filter(c => c.key !== col.key).map(c => (
                          <button
                            key={c.key}
                            onClick={() => moveTask(task.id, c.key)}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-surface-high text-muted-foreground hover:text-foreground"
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="apps">
          <div className="bg-surface-low rounded-3xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">Apps Vinculados</h2>
            <div className="space-y-2">
              {apps.map(a => (
                <a
                  key={a.name}
                  href={a.url}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-3 bg-surface-mid rounded-xl p-4 hover:bg-surface-high transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">{a.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto truncate max-w-[200px]">{a.url}</span>
                </a>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Input
                value={newApp.name}
                onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                placeholder="Nome do app"
                className="bg-surface-mid border-0 rounded-xl"
              />
              <Input
                value={newApp.url}
                onChange={(e) => setNewApp({ ...newApp, url: e.target.value })}
                placeholder="URL"
                className="bg-surface-mid border-0 rounded-xl"
              />
              <Button onClick={addApp} size="sm" className="rounded-full shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
