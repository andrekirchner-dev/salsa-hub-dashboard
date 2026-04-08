import { useState, useEffect } from "react";
import { ArrowLeft, CalendarDays, Clock, Users, Video, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { auth, db } from "@/integrations/firebase/client";
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, doc, getDoc } from "firebase/firestore";

const CAN_CREATE_MEETING = ["CEO", "CFO", "CMO", "COO", "Gerente", "Coordenador"];
const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

interface Meeting {
  id: string;
  title: string;
  time: string;
  duration: string;
  participants: string[];
  type: "video" | "presencial";
  product?: string;
  date: string;
}

export default function Calendar() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid ?? "";

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    time: "",
    duration: "30 min",
    type: "video" as "video" | "presencial",
    product: "",
    participantsRaw: "",
  });

  const today = new Date().toISOString().slice(0, 10);
  const currentDay = new Date().getDay();

  useEffect(() => {
    if (!uid) return;
    // Load user role
    getDoc(doc(db, "profiles", uid)).then(snap => {
      if (snap.exists()) setUserRole(snap.data()?.role ?? "");
    });

    const q = query(collection(db, "users", uid, "meetings"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Meeting)));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const todayMeetings = meetings.filter(m => m.date === today);
  const canCreate = CAN_CREATE_MEETING.includes(userRole);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.time) return;
    setSaving(true);
    await addDoc(collection(db, "users", uid, "meetings"), {
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      duration: form.duration,
      type: form.type,
      product: form.product.trim() || null,
      participants: form.participantsRaw.split(",").map(s => s.trim()).filter(Boolean),
      createdAt: serverTimestamp(),
    });
    setForm({ title: "", date: today, time: "", duration: "30 min", type: "video", product: "", participantsRaw: "" });
    setSaving(false);
    setCreateOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-mid transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground font-sans flex-1">Calendário</h1>
          {canCreate && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
                  <Plus className="w-4 h-4 mr-2" />Criar Reunião
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface-low border-surface-mid max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Nova Reunião</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Título" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Data</label>
                      <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Horário</label>
                      <Input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
                    </div>
                  </div>
                  <select value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                    <option>15 min</option><option>30 min</option><option>1h</option><option>2h</option>
                  </select>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))} className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                    <option value="video">Vídeo</option>
                    <option value="presencial">Presencial</option>
                  </select>
                  <Input placeholder="Produto (opcional)" value={form.product} onChange={e => setForm(p => ({ ...p, product: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Participantes (separados por vírgula)</label>
                    <Input placeholder="João, Maria, Carlos" value={form.participantsRaw} onChange={e => setForm(p => ({ ...p, participantsRaw: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
                  </div>
                  <Button className="w-full rounded-xl bg-primary hover:bg-primary/80" onClick={handleCreate} disabled={saving || !form.title.trim() || !form.time}>
                    {saving ? "Criando..." : "Criar Reunião"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Week strip */}
        <div className="bg-surface-low rounded-3xl p-4 border border-surface-mid mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {weekDays.map((day, i) => {
              const isToday = i === (currentDay === 0 ? 6 : currentDay - 1);
              return (
                <div key={day} className={"flex flex-col items-center p-3 rounded-2xl min-w-[52px] " + (isToday ? "bg-primary text-background" : "hover:bg-surface-mid")}>
                  <span className={"text-xs font-medium " + (isToday ? "text-background" : "text-muted-foreground")}>{day}</span>
                  <span className={"text-lg font-bold mt-1 " + (isToday ? "text-background" : "text-foreground")}>
                    {new Date(Date.now() - (currentDay === 0 ? 6 : currentDay - 1) * 86400000 + i * 86400000).getDate()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Reuniões de Hoje</h2>
          <span className="text-xs text-muted-foreground">{todayMeetings.length} reuniões</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-surface-low rounded-2xl p-4 border border-surface-mid flex gap-3">
                <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0 bg-surface-high" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2 bg-surface-high" />
                  <Skeleton className="h-3 w-1/3 bg-surface-high" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full bg-surface-high" />
              </div>
            ))}
          </div>
        ) : todayMeetings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma reunião hoje</p>
            {canCreate && (
              <Button onClick={() => setCreateOpen(true)} className="mt-3 rounded-2xl bg-primary hover:bg-primary/80 text-background">
                <Plus className="w-4 h-4 mr-2" />Criar Reunião
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {todayMeetings.map((m) => (
              <div key={m.id} className="bg-surface-low rounded-3xl p-4 border border-surface-mid hover:bg-surface-mid transition-colors">
                <div className="flex items-start gap-4">
                  <div className="text-center min-w-[48px]">
                    <p className="text-lg font-bold text-primary">{m.time}</p>
                    <p className="text-xs text-muted-foreground">{m.duration}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground text-sm truncate">{m.title}</h3>
                      <Badge className={"text-xs " + (m.type === "video" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400")}>
                        {m.type === "video" ? "Vídeo" : "Presencial"}
                      </Badge>
                    </div>
                    {m.product && <p className="text-xs text-muted-foreground mb-2">{m.product}</p>}
                    {(m.participants?.length ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{m.participants.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
