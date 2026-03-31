import { useState } from "react";
import { ArrowLeft, Plus, Search, Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Conversation { id: number; name: string; lastMessage: string; time: string; unread: number; avatar: string; type: "geral" | "equipe"; online?: boolean; }
interface Message { id: number; text: string; author: string; timestamp: string; isOwn: boolean; }

const conversations: Conversation[] = [
  { id: 1, name: "Geral", lastMessage: "Alguem consegue revisar o briefing?", time: "10:36", unread: 2, avatar: "GE", type: "geral" },
  { id: 2, name: "Design", lastMessage: "Novos wireframes prontos!", time: "10:20", unread: 0, avatar: "DE", type: "equipe" },
  { id: 3, name: "Andre Pereira", lastMessage: "Otimo trabalho na campanha!", time: "09:45", unread: 1, avatar: "AP", type: "equipe", online: true },
  { id: 4, name: "Marketing", lastMessage: "Dados de engajamento aqui", time: "Ontem", unread: 0, avatar: "MK", type: "geral" },
  { id: 5, name: "Desenvolvimento", lastMessage: "Build em producao!", time: "Ontem", unread: 3, avatar: "DV", type: "equipe" },
  { id: 6, name: "Mariana Silva", lastMessage: "Vou entregar hoje", time: "Seg", unread: 0, avatar: "MS", type: "equipe", online: true },
];

const mockMessages: Message[] = [
  { id: 1, text: "Oi pessoal! Como estao os projetos?", author: "Andre", timestamp: "10:30", isOwn: true },
  { id: 2, text: "Tudo bem! Estou finalizando o design das telas", author: "Mariana", timestamp: "10:32", isOwn: false },
  { id: 3, text: "Otimo! Quando fica pronto?", author: "Andre", timestamp: "10:33", isOwn: true },
  { id: 4, text: "Ate o final do dia consigo entregar", author: "Mariana", timestamp: "10:35", isOwn: false },
  { id: 5, text: "Perfeito!", author: "Andre", timestamp: "10:36", isOwn: true },
];

const mockContacts = [
  { id: 1, name: "Mariana Silva", email: "mariana@salsahub.com" },
  { id: 2, name: "Carlos Mendes", email: "carlos@salsahub.com" },
  { id: 3, name: "Ana Costa", email: "ana@salsahub.com" },
];

export default function Chat() {
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<"todos" | "geral" | "equipe">("todos");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchContact, setSearchContact] = useState("");

  const filtered = conversations.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "todos" || c.type === filter;
    return matchesSearch && matchesFilter;
  });

  const filteredContacts = mockContacts.filter(c => c.name.toLowerCase().includes(searchContact.toLowerCase()));

  const handleSend = (e: React.FormEvent) => { e.preventDefault(); if (message.trim()) setMessage(""); };

  if (activeConv) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="h-14 flex items-center gap-3 px-4 bg-surface-low border-b border-surface-mid flex-shrink-0">
          <button onClick={() => setActiveConv(null)} className="p-2 rounded-xl hover:bg-surface-mid transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">{activeConv.avatar}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">{activeConv.name}</p>
            {activeConv.online && <p className="text-xs text-primary">Online</p>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {mockMessages.map(msg => (
            <div key={msg.id} className={"flex " + (msg.isOwn ? "justify-end" : "justify-start")}>
              <div className={"max-w-[75%] px-4 py-3 rounded-2xl " + (msg.isOwn ? "bg-primary text-background" : "bg-surface-mid text-foreground")}>
                {!msg.isOwn && <p className="text-xs font-medium opacity-75 mb-1">{msg.author}</p>}
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs opacity-60 mt-1 text-right">{msg.timestamp}</p>
              </div>
            </div>
          ))}
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
          <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
            <DialogTrigger asChild>
              <button className="p-2 rounded-2xl bg-surface-mid hover:bg-surface-high transition-colors">
                <Plus className="w-5 h-5 text-primary" />
              </button>
            </DialogTrigger>
            <DialogContent className="bg-surface-low border-surface-mid">
              <DialogHeader><DialogTitle>Nova Conversa</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Buscar pessoas..." value={searchContact} onChange={e => setSearchContact(e.target.value)} className="bg-surface-mid border-0 rounded-xl text-sm" />
                <div className="space-y-2">
                  {filteredContacts.map(c => (
                    <button key={c.id} onClick={() => { setNewChatOpen(false); setSearchContact(""); }} className="w-full text-left p-3 rounded-xl hover:bg-surface-mid transition-colors">
                      <p className="font-medium text-foreground text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
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

        <div className="space-y-2">
          {filtered.map(conv => (
            <button key={conv.id} onClick={() => setActiveConv(conv)} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-mid active:scale-[0.98] transition-all text-left">
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">{conv.avatar}</div>
                {conv.online && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-primary border-2 border-background" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="font-semibold text-foreground text-sm truncate">{conv.name}</p>
                  <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">{conv.time}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
              </div>
              {conv.unread > 0 && (
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-background text-[10px] font-bold flex items-center justify-center">{conv.unread}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
