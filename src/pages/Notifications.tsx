import { useState, useEffect } from "react";
import { ArrowLeft, Bell, MessageCircle, ListTodo, Package, Check, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/integrations/firebase/client";
import {
  collection, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy, writeBatch,
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
  const [deletingAll, setDeletingAll] = useState(false);

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

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteDoc(doc(db, "users", uid, "notifications", id));
  };

  const deleteAllRead = async () => {
    setDeletingAll(true);
    const batch = writeBatch(db);
    notifications.filter(n => n.read).forEach(n => {
      batch.delete(doc(db, "users", uid, "notifications", n.id));
    });
    await batch.commit();
    setDeletingAll(false);
  };

  const deleteAll = async () => {
    setDeletingAll(true);
    const batch = writeBatch(db);
    notifications.forEach(n => {
      batch.delete(doc(db, "users", uid, "notifications", n.id));
    });
    await batch.commit();
    setDeletingAll(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-mid transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground font-sans">Notificações</h1>
            {unreadCount > 0 && <p className="text-sm text-muted-foreground">{unreadCount} não lidas</p>}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-mid hover:bg-surface-high transition-colors text-xs text-muted-foreground"
              >
                <Check className="w-3 h-3" />
                Marcar todas
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={deleteAll}
                disabled={deletingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                Limpar
              </button>
            )}
          </div>
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
            {/* Unread section */}
            {unreadCount > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">Não lidas</p>
                {notifications.filter(n => !n.read).map((notif) => {
                  const Icon = typeIcon[notif.type] ?? Bell;
                  const dot = typeDotColor[notif.type] ?? "bg-primary";
                  return (
                    <div
                      key={notif.id}
                      className="flex items-start gap-3 p-4 rounded-2xl bg-surface-mid hover:bg-surface-high transition-all group"
                    >
                      <button
                        className="relative flex-shrink-0 mt-0.5"
                        onClick={() => markRead(notif.id)}
                        title="Marcar como lida"
                      >
                        <div className="w-9 h-9 rounded-2xl bg-surface-high flex items-center justify-center hover:bg-primary/20 transition-colors">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className={"absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background " + dot} />
                      </button>
                      <div className="flex-1 min-w-0" onClick={() => markRead(notif.id)} role="button">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-sm font-medium text-foreground">{notif.title}</p>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(notif.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{notif.description}</p>
                      </div>
                      {/* Action buttons */}
                      <div className="flex flex-col gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => markRead(notif.id)}
                          title="Marcar como lida"
                          className="w-7 h-7 rounded-lg bg-surface-high hover:bg-primary/20 flex items-center justify-center transition-colors"
                        >
                          <Check className="w-3.5 h-3.5 text-primary" />
                        </button>
                        <button
                          onClick={(e) => deleteNotification(e, notif.id)}
                          title="Apagar"
                          className="w-7 h-7 rounded-lg bg-surface-high hover:bg-red-500/20 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Read section */}
            {readCount > 0 && (
              <>
                <div className="flex items-center justify-between pt-2 px-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lidas</p>
                  <button
                    onClick={deleteAllRead}
                    disabled={deletingAll}
                    className="text-xs text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    Apagar lidas
                  </button>
                </div>
                {notifications.filter(n => n.read).map((notif) => {
                  const Icon = typeIcon[notif.type] ?? Bell;
                  return (
                    <div
                      key={notif.id}
                      className="flex items-start gap-3 p-4 rounded-2xl bg-surface-low hover:bg-surface-mid transition-all group"
                    >
                      <div className="relative flex-shrink-0 mt-0.5">
                        <div className="w-9 h-9 rounded-2xl bg-surface-high flex items-center justify-center opacity-60">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-sm font-medium text-muted-foreground">{notif.title}</p>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(notif.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed opacity-70">{notif.description}</p>
                      </div>
                      <button
                        onClick={(e) => deleteNotification(e, notif.id)}
                        title="Apagar"
                        className="flex-shrink-0 w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 bg-surface-high hover:bg-red-500/20 flex items-center justify-center transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
