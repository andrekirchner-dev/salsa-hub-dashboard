import { useState } from "react";
import { ArrowLeft, Bell, MessageCircle, ListTodo, Package, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: "chat" | "task" | "product";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  { id: "1", type: "task", title: "Nova tarefa atribuida", description: "Tarefa Deploy para producao em App Salsa Delivery", time: "5 min", read: false },
  { id: "2", type: "chat", title: "Nova mensagem", description: "Carlos Lima mencionou voce no canal app-delivery", time: "1h", read: false },
  { id: "3", type: "product", title: "Produto atualizado", description: "Loja Salsa Store atingiu 90% de progresso", time: "2h", read: true },
  { id: "4", type: "chat", title: "Mensagem direta", description: "Ana Silva enviou uma mensagem", time: "3h", read: true },
  { id: "5", type: "task", title: "Tarefa concluida", description: "Pedro marcou Design do onboarding como concluida", time: "5h", read: true },
  { id: "6", type: "product", title: "Novo produto criado", description: "SaaS Analytics foi adicionado ao workspace", time: "1d", read: true },
];

const typeIcon = { chat: MessageCircle, task: ListTodo, product: Package };
const typeDotColor = { chat: "bg-blue-400", task: "bg-primary", product: "bg-purple-400" };

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-surface-mid transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground font-sans">Notificacoes</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">{unreadCount} nao lidas</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-mid hover:bg-surface-high transition-colors text-xs text-muted-foreground"
            >
              <Check className="w-3 h-3" />
              Marcar todas
            </button>
          )}
        </div>

        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = typeIcon[notif.type];
            const dot = typeDotColor[notif.type];
            return (
              <button
                key={notif.id}
                onClick={() => markRead(notif.id)}
                className={`w-full flex items-start gap-3 p-4 rounded-2xl transition-all text-left ${
                  notif.read ? "bg-surface-low hover:bg-surface-mid" : "bg-surface-mid hover:bg-surface-high"
                }`}
              >
                <div className="relative flex-shrink-0 mt-0.5">
                  <div className="w-9 h-9 rounded-2xl bg-surface-high flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  {!notif.read && (
                    <span className={"absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background " + dot} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={`text-sm font-medium ${notif.read ? "text-muted-foreground" : "text-foreground"}`}>
                      {notif.title}
                    </p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{notif.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{notif.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {notifications.every(n => n.read) && (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Tudo em dia!</p>
          </div>
        )}
      </div>
    </div>
  );
}
