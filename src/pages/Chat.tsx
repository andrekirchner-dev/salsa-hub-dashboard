import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, Search, Send, Paperclip, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, db } from "@/integrations/firebase/client";
import {
  collection, onSnapshot, addDoc, serverTimestamp, query,
  orderBy, doc, setDoc, getDoc,
} from "firebase/firestore";

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  updatedAt: any;
  unread: number;
  avatar: string;
  type: "geral" | "equipe";
  participantUids: string[];
}

interface Message {
  id: string;
  text: string;
  authorName: string;
  authorUid: string;
  createdAt: any;
}

function timeLabel(ts: any): string {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  if (diff < 86400000) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diff < 172800000) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function Chat() {
  const currentUser = auth.currentUser!;
  const uid = currentUser.uid;
  const userName = currentUser.displayName ?? "Eu";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<"todos" | "geral" | "equipe">("todos");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    const q = query(
      collection(db, "conversations"),
      orderBy("updatedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Conversation))
        .filter(c => c.participantUids?.includes(uid));
      setConversations(all);
    });
    return unsub;
  }, [uid]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConv) { setMessages([]); return; }
    const q = query(collection(db, "conversations", activeConv.id, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [activeConv?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeConv) return;
    const text = message.trim();
    setMessage("");
    await addDoc(collection(db, "conversations", activeConv.id, "messages"), {
      text,
      authorName: userName,
      authorUid: uid,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, "conversations", activeConv.id), {
      lastMessage: text,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  };

  const filtered = conversations.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "todos" || c.type === filter;
    return matchesSearch && matchesFilter;
  });

  if (activeConv) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="h-14 flex items-center gap-3 px-4 bg-surface-low border-b border-surface-mid flex-shrink-0">
          <button onClick={() => setActiveConv(null)} className="p-2 rounded-xl hover:bg-surface-mid transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
            {activeConv.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">{activeConv.name}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Seja o primeiro a enviar uma mensagem!</p>
            </div>
          )}
          {messages.map(msg => {
            const isOwn = msg.authorUid === uid;
            return (
              <div key={msg.id} className={"flex " + (isOwn ? "justify-end" : "justify-start")}>
                <div className={"max-w-[75%] px-4 py-3 rounded-2xl " + (isOwn ? "bg-primary text-background" : "bg-surface-mid text-foreground")}>
                  {!isOwn && <p className="text-xs font-medium opacity-75 mb-1">{msg.authorName}</p>}
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs opacity-60 mt-1 text-right">{timeLabel(msg.createdAt)}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} className="p-4 border-t border-surface-mid bg-surface-low flex-shrink-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <div className="flex gap-2 items-center">
            <label className="p-2 rounded-xl hover:bg-surface-mid transition-colors cursor-pointer flex-shrink-0">
              <Paperclip className="w-5 h-5 text-muted-foreground" />
              <input type="file" className="sr-only" multiple accept="image/*,application/pdf,.doc,.docx" />
            </label>
            <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="Digite sua mensagem..." className="bg-surface-mid border-0 rounded-2xl text-sm flex-1" />
            <Button type="submit" size="icon" disabled={!message.trim()} className="rounded-2xl bg-primary hover:bg-primary/80 text-background flex-shrink-0 disabled:opacity-50">
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-foreground font-sans">Chat</h1>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar conversas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-surface-low border border-surface-mid rounded-2xl text-sm" />
        </div>

        <div className="flex gap-2 mb-5">
          {(["todos", "geral", "equipe"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={"px-4 py-1.5 rounded-2xl text-sm font-medium transition-colors " + (filter === f ? "bg-primary text-background" : "bg-surface-mid text-muted-foreground hover:text-foreground")}>
              {f === "todos" ? "Todos" : f === "geral" ? "Geral" : "Equipe"}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma conversa ainda</p>
            <p className="text-xs">As conversas criadas pela sua equipe aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(conv => (
              <button key={conv.id} onClick={() => setActiveConv(conv)} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-mid active:scale-[0.98] transition-all text-left">
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">{conv.avatar}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold text-foreground text-sm truncate">{conv.name}</p>
                    <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">{timeLabel(conv.updatedAt)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-background text-[10px] font-bold flex items-center justify-center">{conv.unread}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
