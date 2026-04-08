import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link } from "react-router-dom";
import { Bell, MessageCircle, ListTodo, Package, Check, Trash2 } from "lucide-react";
import { auth, db } from "@/integrations/firebase/client";
import {
  collection, onSnapshot, updateDoc, deleteDoc, doc,
  query, orderBy, writeBatch, limit,
} from "firebase/firestore";

interface Notification {
  id: string;
  type: "chat" | "task" | "product" | "team";
  title: string;
  description: string;
  createdAt: any;
  read: boolean;
}

const typeIcon: Record<string, any> = { chat: MessageCircle, task: ListTodo, product: Package, team: Bell };
const typeDotColor: Record<string, string> = {
  chat: "bg-blue-400",
  task: "bg-primary",
  product: "bg-purple-400",
  team: "bg-green-400",
};

function timeAgo(ts: any): string {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return Math.floor(diff / 60) + "min";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";
  return Math.floor(diff / 86400) + "d";
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NotificationsDrawer({ open, onClose }: Props) {
  const uid = auth.currentUser?.uid ?? "";
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!uid || !open) return;
    const q = query(
      collection(db, "users", uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
    });
    return unsub;
  }, [uid, open]);

  const markRead = async (id: string) => {
    if (!uid) return;
    await updateDoc(doc(db, "users", uid, "notifications", id), { read: true });
  };

  const markAllRead = async () => {
    if (!uid) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, "users", uid, "notifications", n.id), { read: true });
    });
    await batch.commit();
  };

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "notifications", id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-96 bg-surface-low border-0 flex flex-col">
        <SheetHeader className="mb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-foreground">Notificações</SheetTitle>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">{unreadCount} não lida{unreadCount > 1 ? "s" : ""}</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-mid hover:bg-surface-high text-xs text-muted-foreground transition-colors"
              >
                <Check className="w-3 h-3" />
                Ler tudo
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-foreground mb-1">Tudo em dia!</p>
              <p className="text-xs">Nenhuma notificação por enquanto.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = typeIcon[n.type] ?? Bell;
              const dot = typeDotColor[n.type] ?? "bg-primary";
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`flex items-start gap-3 p-3 rounded-2xl transition-all group cursor-pointer
                    ${n.read ? "bg-background hover:bg-surface-mid opacity-70" : "bg-surface-mid hover:bg-surface-high"}`}
                >
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-xl bg-surface-high flex items-center justify-center">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    {!n.read && (
                      <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${dot}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs font-semibold truncate ${n.read ? "text-muted-foreground" : "text-foreground"}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{n.description}</p>
                  </div>

                  <button
                    onClick={(e) => deleteNotif(e, n.id)}
                    title="Apagar"
                    className="flex-shrink-0 w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 bg-surface-high hover:bg-red-500/20 flex items-center justify-center transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {notifications.length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-mid flex-shrink-0">
            <Link
              to="/notifications"
              onClick={onClose}
              className="block text-center text-sm text-primary hover:text-primary/80 font-medium"
            >
              Ver todas as notificações →
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
