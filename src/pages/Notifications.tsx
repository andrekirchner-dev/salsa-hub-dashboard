import { useState, useEffect } from "react";
import { ArrowLeft, Bell, MessageCircle, ListTodo, Package, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/integrations/firebase/client";
import {
  collection, onSnapshot, updateDoc, doc, query, orderBy, writeBatch,
} from "firebase/firestore";

interface Notification {
  id: string;
  type: "chat" | "task" | "product";
  title: string;
  description: string;
  createdAt: any;
  read: boolean;
}

const typeIcon = { chat: MessageCircle, task: ListTodo, product: Package };
const typeDotColor = { chat: "bg-blue-400", task: "bg-primary", product: "bg-purple-400" };

function timeAgo(ts: any): string {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return Math.floor(diff / 60) + "min";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";
  return Math.floor(diff / 86400) + "d";
}

export default function Notifications() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid ?? "";
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "notifications"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const markRead = async (id: string) => {
    await updateDoc(doc(db, "users", uid, "notifications", id), { read: true });
  };

  const markAllRead = async () => {
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, "users", uid, "notifications", n.id), { read: true });
    });
    await batch.commit();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-mid transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground font-sans">Notificações</h1>
            {unreadCount > 0 && <p className="text-sm text-muted-foreground">{unreadCount} não lidas</p>}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-mid hover:bg-surface-high transition-colors text-xs text-muted-foreground">
              <Check className="w-3 h-3" />
              Marcar todas
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Carregando notificações...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground mb-1">Tudo em dia!</p>
            <p className="text-xs">Nenhuma notificação por enquanto.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const Icon = typeIcon[notif.type] ?? Bell;
              const dot = typeDotColor[notif.type] ?? "bg-primary";
              return (
                <button
                  key={notif.id}
                  onClick={() => markRead(notif.id)}
                  className={`w-full flex items-start gap-3 p-4 rounded-2xl transition-all text-left ${notif.read ? "bg-surface-low hover:bg-surface-mid" : "bg-surface-mid hover:bg-surface-high"}`}
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
                      <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(notif.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{notif.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
