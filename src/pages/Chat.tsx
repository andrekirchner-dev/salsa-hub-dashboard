import { useState } from "react";
import { Send, Hash, User, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Channel {
  id: string;
  name: string;
  type: "product" | "team" | "direct";
  unread: number;
  lastMessage: string;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

const channels: Channel[] = [
  { id: "1", name: "App Salsa Delivery", type: "product", unread: 3, lastMessage: "Carlos: Deploy feito!" },
  { id: "2", name: "Equipe Design", type: "team", unread: 0, lastMessage: "Ana: Wireframes prontos" },
  { id: "3", name: "Marketing", type: "team", unread: 1, lastMessage: "João: Nova campanha?" },
  { id: "4", name: "Ana Silva", type: "direct", unread: 0, lastMessage: "Viu os mockups?" },
  { id: "5", name: "Pedro Santos", type: "direct", unread: 2, lastMessage: "Reunião às 15h" },
  { id: "6", name: "Loja Salsa Store", type: "product", unread: 0, lastMessage: "Maria: Métricas atualizadas" },
];

const mockMessages: Message[] = [
  { id: "1", sender: "Carlos Lima", text: "Deploy da versão 2.1 feito com sucesso! 🚀", time: "10:30", isMe: false },
  { id: "2", sender: "Você", text: "Ótimo! Vamos testar agora.", time: "10:32", isMe: true },
  { id: "3", sender: "Ana Silva", text: "Estou vendo uns bugs no onboarding flow", time: "10:35", isMe: false },
  { id: "4", sender: "Você", text: "Pode detalhar? Vou abrir uma task.", time: "10:36", isMe: true },
  { id: "5", sender: "Carlos Lima", text: "Vou verificar os logs de erro.", time: "10:38", isMe: false },
  { id: "6", sender: "Ana Silva", text: "Tela de login não redireciona no iOS Safari", time: "10:40", isMe: false },
];

export default function Chat() {
  const [activeChannel, setActiveChannel] = useState(channels[0]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(mockMessages);
  const [searchChannel, setSearchChannel] = useState("");
  const [showChannels, setShowChannels] = useState(true);

  const sendMessage = () => {
    if (!message.trim()) return;
    setMessages([...messages, {
      id: String(Date.now()),
      sender: "Você",
      text: message,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      isMe: true,
    }]);
    setMessage("");
  };

  const filteredChannels = channels.filter(c =>
    c.name.toLowerCase().includes(searchChannel.toLowerCase())
  );

  const channelIcon = (type: Channel["type"]) => {
    if (type === "direct") return <User className="w-4 h-4" />;
    return <Hash className="w-4 h-4" />;
  };

  return (
    <div className="max-w-6xl mx-auto py-4 h-[calc(100vh-8rem)]">
      <div className="flex h-full gap-4">
        {/* Channel list */}
        <div className={`${showChannels ? "flex" : "hidden"} md:flex flex-col w-full md:w-72 shrink-0 bg-surface-low rounded-3xl overflow-hidden`}>
          <div className="p-4">
            <h2 className="font-semibold mb-3">Conversas</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchChannel}
                onChange={(e) => setSearchChannel(e.target.value)}
                placeholder="Buscar..."
                className="pl-9 bg-surface-mid border-0 rounded-xl h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto px-2 pb-2 space-y-0.5">
            {filteredChannels.map(c => (
              <button
                key={c.id}
                onClick={() => { setActiveChannel(c); setShowChannels(false); }}
                className={`w-full text-left px-3 py-3 rounded-xl flex items-center gap-3 transition-colors ${
                  activeChannel.id === c.id ? "bg-primary/10 text-primary" : "hover:bg-surface-mid text-muted-foreground"
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-surface-high flex items-center justify-center shrink-0">
                  {channelIcon(c.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{c.name}</span>
                    {c.unread > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className={`${!showChannels ? "flex" : "hidden"} md:flex flex-col flex-1 bg-surface-low rounded-3xl overflow-hidden`}>
          <div className="px-5 py-4 flex items-center gap-3">
            <button onClick={() => setShowChannels(true)} className="md:hidden text-muted-foreground">
              ←
            </button>
            <span className="w-8 h-8 rounded-full bg-surface-high flex items-center justify-center">
              {channelIcon(activeChannel.type)}
            </span>
            <div>
              <h3 className="font-semibold text-sm">{activeChannel.name}</h3>
              <p className="text-xs text-muted-foreground">{activeChannel.type === "direct" ? "Online" : "Canal"}</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-5 py-2 space-y-4">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  m.isMe ? "bg-primary text-primary-foreground" : "bg-surface-mid"
                }`}>
                  {!m.isMe && <p className="text-xs font-semibold text-primary mb-1">{m.sender}</p>}
                  <p className="text-sm">{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Digite sua mensagem..."
                className="bg-surface-mid border-0 rounded-xl"
              />
              <Button onClick={sendMessage} size="icon" className="rounded-full shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
