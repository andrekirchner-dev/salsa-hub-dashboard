import { useState } from "react";
import { Plus, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Channel {
  id: number;
  name: string;
  lastMessage: string;
  unread: number;
  avatar?: string;
}

interface Message {
  id: number;
  text: string;
  author: string;
  timestamp: string;
  isOwn: boolean;
}

const mockChannels: Channel[] = [
  { id: 1, name: "Geral", lastMessage: "Alguem consegue revisar?", unread: 2 },
  { id: 2, name: "Design", lastMessage: "Novos wireframes prontos", unread: 0 },
  { id: 3, name: "Andre Pereira", lastMessage: "Otimo trabalho na campanha!", unread: 1 },
  { id: 4, name: "Marketing", lastMessage: "Dados de engajamento aqui", unread: 0 },
  { id: 5, name: "Desenvolvimento", lastMessage: "Build em producao", unread: 3 },
];

const mockMessages: Message[] = [
  { id: 1, text: "Oi pessoal! Como estao os projetos?", author: "Andre Pereira", timestamp: "10:30", isOwn: true },
  { id: 2, text: "Tudo bem! Estou finalizando o design das telas", author: "Mariana Silva", timestamp: "10:32", isOwn: false },
  { id: 3, text: "Otimo! Quando fica pronto?", author: "Andre Pereira", timestamp: "10:33", isOwn: true },
  { id: 4, text: "Ate o final do dia consigo entregar", author: "Mariana Silva", timestamp: "10:35", isOwn: false },
  { id: 5, text: "Perfeito! Obrigado", author: "Andre Pereira", timestamp: "10:36", isOwn: true },
];

const mockContacts = [
  { id: 1, name: "Mariana Silva", email: "mariana@salsahub.com" },
  { id: 2, name: "Carlos Mendes", email: "carlos@salsahub.com" },
  { id: 3, name: "Ana Costa", email: "ana@salsahub.com" },
];

export default function Chat() {
  const [selectedChannel, setSelectedChannel] = useState<number>(1);
  const [message, setMessage] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = mockContacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      setMessage("");
    }
  };

  const handleSelectContact = (contact: typeof mockContacts[0]) => {
    setNewChatOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Channel List */}
      <div className="hidden md:flex md:w-64 flex-col bg-surface-low border-r border-surface-mid">
        <div className="p-4 border-b border-surface-mid">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar canais..."
              className="pl-10 bg-surface-mid border-0 rounded-xl text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mockChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel.id)}
              className={"w-full text-left px-4 py-3 border-b border-surface-mid hover:bg-surface-mid transition-colors " + (selectedChannel === channel.id ? "bg-surface-mid" : "")}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground text-sm truncate">{channel.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{channel.lastMessage}</p>
                </div>
                {channel.unread > 0 && (
                  <span className="ml-2 flex-shrink-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-background bg-primary rounded-full">
                    {channel.unread}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 md:px-6 bg-surface-low border-b border-surface-mid">
          <div>
            <h2 className="font-semibold text-foreground">
              {mockChannels.find((c) => c.id === selectedChannel)?.name}
            </h2>
          </div>
          <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
            <DialogTrigger asChild>
              <button className="p-2 rounded-2xl bg-surface-mid hover:bg-surface-high transition-colors">
                <Plus className="w-5 h-5 text-primary" />
              </button>
            </DialogTrigger>
            <DialogContent className="bg-surface-low border-surface-mid">
              <DialogHeader>
                <DialogTitle className="text-foreground">Nova Conversa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Buscar pessoas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-surface-mid border-0 rounded-xl text-sm"
                />
                <div className="space-y-2">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className="w-full text-left p-3 rounded-xl hover:bg-surface-mid transition-colors"
                    >
                      <h4 className="font-medium text-foreground text-sm">{contact.name}</h4>
                      <p className="text-xs text-muted-foreground">{contact.email}</p>
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {mockMessages.map((msg) => (
            <div key={msg.id} className={"flex " + (msg.isOwn ? "justify-end" : "justify-start")}>
              <div className={"max-w-xs md:max-w-md px-4 py-3 rounded-2xl " + (msg.isOwn ? "bg-primary text-background" : "bg-surface-mid text-foreground")}>
                {!msg.isOwn && <p className="text-xs font-medium opacity-75 mb-1">{msg.author}</p>}
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 md:p-6 border-t border-surface-mid bg-surface-low">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="bg-surface-mid border-0 rounded-2xl text-sm"
            />
            <Button type="submit" size="icon" className="rounded-2xl bg-primary hover:bg-primary/80 text-background flex-shrink-0">
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
