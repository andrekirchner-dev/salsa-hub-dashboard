import { useState } from "react";
import { Bell, MessageCircle, ListTodo, Package, Check } from "lucide-react";

interface Notification {
  id: string;
  type: "chat" | "task" | "product";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  { id: "1", type: "task", title: "Nova tarefa atribuída", description: 'Tarefa "Deploy para produção" em App Salsa Delivery', time: "5 min", read: false },
  { id: "2", type: "chat", title: "Nova mensagem", description: "Carlos Lima mencionou você no canal #app-delivery", time: "1h", read: false },
  { id: "3", type: "product", title: "Produto atualizado", description: "Loja Salsa Store atingiu 90% de progresso", time: "2h", read: true },
  { id: "4", type: "chat", title: "Mensagem direta", description: "Ana Silva enviou uma mensagem", time: "3h", read: true },
  { id: "5", type: "task", title: "Tarefa concluída", description: 'Pedro marcou "Design do onboarding" como concluída', time: "5h", read: true },
  { id: "6", type: "product", title: "Campanha atingiu meta", description: '"Black Friday" atingiu 1000 leads', time: "1d", read: true },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered = filter === "unread" ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const iconMap = { chat: MessageCircle, task: ListTodo, product: Package };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Notificações</h1>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-primary hover:underline">
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {(["all", "unread"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-surface-low text-muted-foreground"
            }`}
          >
            {f === "all" ? "Todas" : "Novas"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(n => {
          const Icon = iconMap[n.type];
          return (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`flex items-start gap-4 bg-surface-low rounded-2xl p-5 cursor-pointer transition-colors hover:bg-surface-mid ${
                !n.read ? "ghost-border" : ""
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                !n.read ? "bg-primary/10" : "bg-surface-mid"
              }`}>
                <Icon className={`w-5 h-5 ${!n.read ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.read ? "font-semibold" : ""}`}>{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{n.time}</span>
                {!n.read && <span className="kinetic-pulse" />}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Nenhuma notificação nova</p>
          </div>
        )}
      </div>
    </div>
  );
}
