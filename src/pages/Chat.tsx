import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Plus, Search, Send, Paperclip, MessageCircle,
  FileText, Loader2, Download, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { auth, db, storage } from "@/integrations/firebase/client";
import {
  collection, onSnapshot, addDoc, serverTimestamp, query,
  orderBy, doc, setDoc, getDocs, where, deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: string;
  username?: string;
}

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  updatedAt: any;
  unread: number;
  avatar: string;
  type: "direto" | "geral" | "equipe";
  participantUids: string[];
  participantNames?: Record<string, string>;
}

interface Message {
  id: string;
  text: string;
  authorName: string;
  authorUid: string;
  createdAt: any;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: "image" | "file";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeLabel(ts: any): string {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  if (diff < 86400000) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diff < 172800000) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function isImageFile(fileName: string, mimeType?: string): boolean {
  const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
  if (mimeType && imageTypes.includes(mimeType)) return true;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
}

function getConvDisplayName(conv: Conversation, myUid: string): string {
  if (conv.type === "direto" && conv.participantNames) {
    const other = Object.entries(conv.participantNames).find(([uid]) => uid !== myUid);
    return other ? other[1] : conv.name;
  }
  return conv.name;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Chat() {
  const currentUser = auth.currentUser!;
  const uid = currentUser.uid;
  const userName = currentUser.displayName ?? "Eu";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<"todos" | "direto" | "geral" | "equipe">("todos");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Nova Conversa modal
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creatingConv, setCreatingConv] = useState(false);

  // Load conversations
  // Uses where() so the query satisfies the Firestore rule
  // (uid in participantUids) — without it the entire query is denied.
  // Client-side sort avoids needing a composite index.
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "conversations"),
      where("participantUids", "array-contains", uid),
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Conversation))
        .sort((a, b) => {
          const ta = a.updatedAt?.toDate?.()?.getTime() ?? 0;
          const tb = b.updatedAt?.toDate?.()?.getTime() ?? 0;
          return tb - ta;
        });
      setConversations(all);
    });
    return unsub;
  }, [uid]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConv) { setMessages([]); return; }
    const q = query(
      collection(db, "conversations", activeConv.id, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [activeConv?.id]);

  // Load users when Nova Conversa opens
  useEffect(() => {
    if (!newConvOpen) return;
    setLoadingUsers(true);
    getDocs(collection(db, "profiles")).then((snap) => {
      setAllUsers(
        snap.docs
          .filter(d => d.id !== uid)
          .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
      );
      setLoadingUsers(false);
    }).catch(() => setLoadingUsers(false));
  }, [newConvOpen, uid]);

  // Send text message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeConv) return;
    const text = message.trim();
    setMessage("");
    await addDoc(collection(db, "conversations", activeConv.id, "messages"), {
      text, authorName: userName, authorUid: uid, createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, "conversations", activeConv.id), {
      lastMessage: text, updatedAt: serverTimestamp(),
    }, { merge: true });
    notifyParticipants(activeConv, text);
  };

  // Upload file to Firebase Storage
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeConv) return;
    const file = files[0];
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageRef = ref(storage, `chat/${activeConv.id}/${Date.now()}_${sanitizedName}`);

    setUploadFileName(file.name);
    setUploadProgress(0);

    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
    task.on(
      "state_changed",
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => { setUploadProgress(null); setUploadFileName(""); },
      async () => {
        const fileUrl = await getDownloadURL(task.snapshot.ref);
        const fileIsImage = isImageFile(file.name, file.type);
        await addDoc(collection(db, "conversations", activeConv.id, "messages"), {
          text: "", authorName: userName, authorUid: uid, createdAt: serverTimestamp(),
          fileUrl, fileName: file.name, fileSize: file.size,
          fileType: fileIsImage ? "image" : "file",
        });
        const lastMsg = fileIsImage ? "📷 Imagem" : `📎 ${file.name}`;
        await setDoc(doc(db, "conversations", activeConv.id), {
          lastMessage: lastMsg, updatedAt: serverTimestamp(),
        }, { merge: true });
        notifyParticipants(activeConv, lastMsg);
        setUploadProgress(null);
        setUploadFileName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    );
  };

  // Notify all other participants of a new message
  const notifyParticipants = (conv: Conversation, preview: string) => {
    const displayName = getConvDisplayName(conv, uid);
    conv.participantUids
      .filter(u => u !== uid)
      .forEach(targetUid => {
        addDoc(collection(db, "users", targetUid, "notifications"), {
          type: "chat",
          title: userName,
          description: `${displayName}: ${preview.slice(0, 80)}`,
          createdAt: serverTimestamp(),
          read: false,
          conversationId: conv.id,
        }).catch(() => {});
      });
  };

  // Delete a conversation
  const handleDeleteConversation = async (convId: string) => {
    setConfirmDeleteId(null);
    await deleteDoc(doc(db, "conversations", convId));
    if (activeConv?.id === convId) setActiveConv(null);
  };

  // Start or open 1:1 conversation
  const handleStartConversation = async (targetUser: UserProfile) => {
    setCreatingConv(true);
    // Check for existing 1:1 conversation
    const snap = await getDocs(query(
      collection(db, "conversations"),
      where("participantUids", "array-contains", uid),
    ));
    const existing = snap.docs.find(d => {
      const parts = (d.data().participantUids ?? []) as string[];
      return parts.length === 2 && parts.includes(targetUser.uid);
    });

    if (existing) {
      setActiveConv({ id: existing.id, ...existing.data() } as Conversation);
    } else {
      const docRef = await addDoc(collection(db, "conversations"), {
        type: "direto",
        participantUids: [uid, targetUser.uid],
        participantNames: { [uid]: userName, [targetUser.uid]: targetUser.name },
        name: targetUser.name,
        avatar: targetUser.name.charAt(0).toUpperCase(),
        lastMessage: "",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        unread: 0,
      });
      setActiveConv({
        id: docRef.id, type: "direto",
        participantUids: [uid, targetUser.uid],
        participantNames: { [uid]: userName, [targetUser.uid]: targetUser.name },
        name: targetUser.name,
        avatar: targetUser.name.charAt(0).toUpperCase(),
        lastMessage: "", updatedAt: null, unread: 0,
      });
    }
    setNewConvOpen(false);
    setUserSearch("");
    setCreatingConv(false);
  };

  const filteredConvs = conversations.filter(c => {
    const name = getConvDisplayName(c, uid).toLowerCase();
    const participantStr = Object.values(c.participantNames ?? {}).join(" ").toLowerCase();
    const s = search.toLowerCase();
    const matchSearch = !s || name.includes(s) || participantStr.includes(s);
    const matchFilter = filter === "todos" || c.type === filter;
    return matchSearch && matchFilter;
  });

  // @username search: require @ prefix, strip it and match against name/username
  const atSearch = userSearch.startsWith("@") ? userSearch.slice(1).toLowerCase() : "";
  const filteredUsers = atSearch.length > 0
    ? allUsers.filter(u => {
        const handle = (u.username ?? u.name ?? "").toLowerCase();
        const displayName = (u.name ?? "").toLowerCase();
        return handle.includes(atSearch) || displayName.includes(atSearch);
      })
    : [];

  // ── Active conversation view ───────────────────────────────────────────────
  if (activeConv) {
    const displayName = getConvDisplayName(activeConv, uid);

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="h-14 flex items-center gap-3 px-4 bg-surface-low border-b border-surface-mid flex-shrink-0">
          <button onClick={() => setActiveConv(null)} className="p-2 rounded-xl hover:bg-surface-mid transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">{displayName}</p>
            {activeConv.type === "direto" && (
              <p className="text-[10px] text-muted-foreground">Conversa direta</p>
            )}
          </div>
        </div>

        {/* Messages */}
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
                <div className={"max-w-[78%] rounded-2xl overflow-hidden " + (isOwn ? "bg-primary text-background" : "bg-surface-mid text-foreground")}>

                  {/* Image */}
                  {msg.fileType === "image" && msg.fileUrl && (
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                      <img src={msg.fileUrl} alt={msg.fileName ?? "imagem"} className="max-w-full max-h-64 object-cover" />
                    </a>
                  )}

                  {/* File attachment */}
                  {msg.fileType === "file" && msg.fileUrl && (
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                      className={"flex items-center gap-3 px-4 py-3 hover:opacity-80 transition-opacity " + (isOwn ? "text-background" : "text-foreground")}>
                      <FileText className="w-8 h-8 flex-shrink-0 opacity-80" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{msg.fileName}</p>
                        {msg.fileSize && <p className="text-xs opacity-60">{formatFileSize(msg.fileSize)}</p>}
                      </div>
                      <Download className="w-4 h-4 flex-shrink-0 opacity-70" />
                    </a>
                  )}

                  {/* Text + timestamp */}
                  <div className="px-4 py-3">
                    {!isOwn && <p className="text-xs font-medium opacity-75 mb-1">{msg.authorName}</p>}
                    {msg.text && <p className="text-sm">{msg.text}</p>}
                    <p className="text-xs opacity-60 mt-1 text-right">{timeLabel(msg.createdAt)}</p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Upload progress */}
        {uploadProgress !== null && (
          <div className="px-4 py-2 bg-surface-low border-t border-surface-mid flex-shrink-0">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground truncate mb-1">{uploadFileName}</p>
                <div className="w-full h-1.5 bg-surface-mid rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-200" style={{ width: uploadProgress + "%" }} />
                </div>
              </div>
              <span className="text-xs text-primary font-medium flex-shrink-0">{uploadProgress}%</span>
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 border-t border-surface-mid bg-surface-low flex-shrink-0"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <div className="flex gap-2 items-center">
            <label className="p-2 rounded-xl hover:bg-surface-mid transition-colors cursor-pointer flex-shrink-0">
              <Paperclip className="w-5 h-5 text-muted-foreground" />
              <input ref={fileInputRef} type="file" className="sr-only"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                onChange={(e) => handleFileUpload(e.target.files)}
                disabled={uploadProgress !== null} />
            </label>
            <Input value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..." className="bg-surface-mid border-0 rounded-2xl text-sm flex-1"
              disabled={uploadProgress !== null} />
            <Button type="submit" size="icon" disabled={!message.trim() || uploadProgress !== null}
              className="rounded-2xl bg-primary hover:bg-primary/80 text-background flex-shrink-0 disabled:opacity-50">
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── Conversation list ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-foreground font-sans">Chat</h1>
          <Button onClick={() => setNewConvOpen(true)} className="rounded-2xl bg-primary hover:bg-primary/80 text-background text-sm">
            <Plus className="w-4 h-4 mr-1.5" />Nova Conversa
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar conversas..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-surface-low border border-surface-mid rounded-2xl text-sm" />
        </div>

        <div className="flex gap-2 mb-5 overflow-x-auto">
          {(["todos", "direto", "geral", "equipe"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={"px-4 py-1.5 rounded-2xl text-sm font-medium transition-colors whitespace-nowrap " +
                (filter === f ? "bg-primary text-background" : "bg-surface-mid text-muted-foreground hover:text-foreground")}>
              {f === "todos" ? "Todos" : f === "direto" ? "Direto" : f === "geral" ? "Geral" : "Equipe"}
            </button>
          ))}
        </div>

        {filteredConvs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma conversa ainda</p>
            <p className="text-xs mb-4">Inicie uma conversa com alguém da sua equipe.</p>
            <Button onClick={() => setNewConvOpen(true)} className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
              <Plus className="w-4 h-4 mr-2" />Nova Conversa
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConvs.map(conv => {
              const displayName = getConvDisplayName(conv, uid);
              return (
                <div key={conv.id}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-mid active:scale-[0.98] transition-all group cursor-pointer"
                  onClick={() => setActiveConv(conv)}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    {conv.type === "direto" && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-semibold text-foreground text-sm truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">{timeLabel(conv.updatedAt)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-background text-[10px] font-bold flex items-center justify-center">
                      {conv.unread}
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(conv.id); }}
                    title="Apagar conversa"
                    className="flex-shrink-0 w-7 h-7 rounded-xl opacity-0 group-hover:opacity-100 bg-surface-high hover:bg-red-500/20 flex items-center justify-center transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}>
        <DialogContent className="bg-surface-low border-surface-mid max-w-xs">
          <DialogHeader>
            <DialogTitle>Apagar conversa?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">Esta ação não pode ser desfeita. A conversa será removida para todos os participantes.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-xl">Cancelar</Button>
            <Button onClick={() => confirmDeleteId && handleDeleteConversation(confirmDeleteId)}
              className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white">Apagar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nova Conversa Modal */}
      <Dialog open={newConvOpen} onOpenChange={(v) => { setNewConvOpen(v); if (!v) setUserSearch(""); }}>
        <DialogContent className="bg-surface-low border-surface-mid max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="@username para buscar..." value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="pl-10 bg-surface-mid border-0 rounded-xl text-sm" autoFocus />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Buscando usuários...</span>
              </div>
            ) : !userSearch.startsWith("@") ? (
              <div className="text-center py-8 text-muted-foreground px-2">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium text-foreground mb-1">Buscar por @username</p>
                <p className="text-xs">Digite <code className="bg-surface-mid px-1 py-0.5 rounded text-primary font-mono">@nome</code> para encontrar um usuário</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Nenhum usuário encontrado para <span className="text-primary font-mono">{userSearch}</span></p>
              </div>
            ) : (
              filteredUsers.map(user => (
                <button key={user.uid} onClick={() => !creatingConv && handleStartConversation(user)}
                  disabled={creatingConv}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-mid active:scale-[0.98] transition-all text-left disabled:opacity-60">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="text-primary font-mono">@{(user.username ?? user.name ?? "").toLowerCase().replace(/\s+/g, "")}</span>
                      {user.role ? ` · ${user.role}` : ""}
                    </p>
                  </div>
                  {creatingConv && <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
