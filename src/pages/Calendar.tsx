import { useState, useEffect, useRef } from "react";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock, Users, Plus, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { auth, db } from "@/integrations/firebase/client";
import {
  collection, onSnapshot, addDoc, getDocs, updateDoc, serverTimestamp,
  query, orderBy, doc, getDoc, setDoc,
} from "firebase/firestore";

import { canCreateMeeting } from "@/lib/permissions";
const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Meeting {
  id: string;
  title: string;
  time: string;
  duration: string;
  participantUids: string[];
  participantNames: string[];
  creatorUid: string;
  type: "video" | "presencial";
  product?: string;
  date: string;
  reminderSent?: boolean;
  kind?: "meeting" | "event";
  description?: string;
  category?: string;
}

interface ProfileUser { uid: string; name: string; role: string; email: string; }

export default function Calendar() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid ?? "";
  const userName = auth.currentUser?.displayName ?? "Usuário";

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Calendar view
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Create form
  const [form, setForm] = useState({
    title: "",
    date: todayStr,
    time: "",
    duration: "30 min",
    type: "video" as "video" | "presencial",
    product: "",
  });
  const [participantSearch, setParticipantSearch] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<ProfileUser[]>([]);
  const [allProfileUsers, setAllProfileUsers] = useState<ProfileUser[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const reminderChecked = useRef(false);

  // Create event state
  const [eventOpen, setEventOpen] = useState(false);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    date: todayStr,
    description: "",
    category: "Outro",
  });
  const [eventParticipants, setEventParticipants] = useState<ProfileUser[]>([]);
  const [eventParticipantSearch, setEventParticipantSearch] = useState("");

  const EVENT_CATEGORIES = ["Lançamento", "Meetup", "Treinamento", "Demo", "Celebração", "Outro"];

  // Load user role + meetings
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "profiles", uid)).then(snap => {
      setUserRole(snap.exists() ? (snap.data()?.role ?? "") : "");
    });

    const q = query(collection(db, "users", uid, "meetings"), orderBy("date", "asc"));
    return onSnapshot(q, snap => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Meeting)));
      setLoading(false);
    });
  }, [uid]);

  // Load profiles when create meeting or create event dialog opens
  useEffect(() => {
    if (!createOpen && !eventOpen) return;
    setLoadingProfiles(true);
    getDocs(collection(db, "profiles")).then(snap => {
      setAllProfileUsers(snap.docs.filter(d => d.id !== uid).map(d => ({
        uid: d.id, ...d.data(),
      } as ProfileUser)));
      setLoadingProfiles(false);
    }).catch(() => setLoadingProfiles(false));
  }, [createOpen, eventOpen, uid]);

  // 30-min reminder check (runs once after meetings load)
  useEffect(() => {
    if (meetings.length === 0 || !uid || reminderChecked.current) return;
    reminderChecked.current = true;
    const nowTime = new Date();
    const todayISO = nowTime.toISOString().slice(0, 10);
    meetings.forEach(async m => {
      if (m.date !== todayISO || m.reminderSent || !m.time) return;
      const [h, min] = m.time.split(":").map(Number);
      const meetingTime = new Date();
      meetingTime.setHours(h, min, 0, 0);
      const diffMin = (meetingTime.getTime() - nowTime.getTime()) / 60000;
      if (diffMin > 0 && diffMin <= 30) {
        await addDoc(collection(db, "users", uid, "notifications"), {
          type: "team",
          title: "Lembrete de Reunião",
          description: `A reunião "${m.title}" começa em ${Math.round(diffMin)} minuto(s).`,
          read: false,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "users", uid, "meetings", m.id), { reminderSent: true });
      }
    });
  }, [meetings, uid]);

  // ── Calendar grid helpers ──────────────────────────────────────────
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Monday-first offset: Sunday(0)->6, Monday(1)->0, ..., Saturday(6)->5
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (day: number) =>
    day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();

  const dayStr = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const meetingsForDay = (day: number) => meetings.filter(m => m.date === dayStr(day));

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDay(1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDay(1);
  };

  // ── Create meeting ─────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.title.trim() || !form.time || !uid) return;
    setSaving(true);
    try {
      const allUids = [uid, ...selectedParticipants.map(p => p.uid)];
      const allNames = [userName, ...selectedParticipants.map(p => p.name)];
      const meetingData = {
        title: form.title.trim(),
        date: form.date,
        time: form.time,
        duration: form.duration,
        type: form.type,
        product: form.product.trim() || null,
        participantUids: allUids,
        participantNames: allNames,
        creatorUid: uid,
        createdAt: serverTimestamp(),
      };

      // Write to creator's collection and get the doc ID
      const creatorRef = await addDoc(collection(db, "users", uid, "meetings"), meetingData);

      // Write to each participant's meetings + notify them
      for (const p of selectedParticipants) {
        await setDoc(doc(db, "users", p.uid, "meetings", creatorRef.id), meetingData);
        await addDoc(collection(db, "users", p.uid, "notifications"), {
          type: "team",
          title: "Nova Reunião",
          description: `Você foi convidado para "${form.title.trim()}" em ${form.date} às ${form.time}.`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      setForm({ title: "", date: todayStr, time: "", duration: "30 min", type: "video", product: "" });
      setSelectedParticipants([]);
      setParticipantSearch("");
      setCreateOpen(false);
    } finally {
      setSaving(false);
    }
  };

  // ── Create event ───────────────────────────────────────────────────
  const handleCreateEvent = async () => {
    if (!eventForm.title.trim() || !uid) return;
    setEventSaving(true);
    try {
      const allUids = [uid, ...eventParticipants.map(p => p.uid)];
      const allNames = [userName, ...eventParticipants.map(p => p.name)];
      const eventData = {
        title: eventForm.title.trim(),
        date: eventForm.date,
        time: "",
        duration: "",
        description: eventForm.description.trim() || null,
        category: eventForm.category,
        type: "presencial" as const,
        product: null,
        participantUids: allUids,
        participantNames: allNames,
        creatorUid: uid,
        kind: "event" as const,
        createdAt: serverTimestamp(),
      };
      const creatorRef = await addDoc(collection(db, "users", uid, "meetings"), eventData);
      for (const p of eventParticipants) {
        await setDoc(doc(db, "users", p.uid, "meetings", creatorRef.id), eventData);
        await addDoc(collection(db, "users", p.uid, "notifications"), {
          type: "team",
          title: "Novo Evento",
          description: `Você foi convidado para o evento "${eventForm.title.trim()}" em ${eventForm.date}.`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
      setEventForm({ title: "", date: todayStr, description: "", category: "Outro" });
      setEventParticipants([]);
      setEventParticipantSearch("");
      setEventOpen(false);
    } finally {
      setEventSaving(false);
    }
  };

  const toggleEventParticipant = (user: ProfileUser) => {
    setEventParticipants(prev =>
      prev.find(p => p.uid === user.uid)
        ? prev.filter(p => p.uid !== user.uid)
        : [...prev, user]
    );
  };

  const toggleParticipant = (user: ProfileUser) => {
    setSelectedParticipants(prev =>
      prev.find(p => p.uid === user.uid)
        ? prev.filter(p => p.uid !== user.uid)
        : [...prev, user]
    );
  };

  const canCreate = userRole !== null && canCreateMeeting(userRole);
  const selectedDayMeetings = meetings.filter(m => m.date === dayStr(selectedDay)).sort((a, b) => a.time.localeCompare(b.time));
  const filteredProfiles = allProfileUsers.filter(u =>
    !participantSearch.trim() ||
    u.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(participantSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-mid transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground font-sans flex-1">Calendário</h1>
          {canCreate && (
            <div className="flex gap-2">
              <Button onClick={() => setEventOpen(true)} variant="outline" className="rounded-2xl border-surface-high text-foreground text-sm">
                <Plus className="w-4 h-4 mr-1.5" />Criar Evento
              </Button>
              <Button onClick={() => setCreateOpen(true)} className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
                <Plus className="w-4 h-4 mr-2" />Criar Reunião
              </Button>
            </div>
          )}
        </div>

        {/* Create meeting dialog (always rendered, not inside conditional) */}
        <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) { setSelectedParticipants([]); setParticipantSearch(""); } }}>
          <DialogContent className="bg-surface-low border-surface-mid max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova Reunião</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Título *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Data</label>
                  <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Horário *</label>
                  <Input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} className="bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                  <option>15 min</option><option>30 min</option><option>1h</option><option>2h</option>
                </select>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))} className="bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                  <option value="video">Vídeo</option>
                  <option value="presencial">Presencial</option>
                </select>
              </div>
              <Input placeholder="Produto (opcional)" value={form.product} onChange={e => setForm(p => ({ ...p, product: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />

              {/* Participant picker */}
              <div>
                <label className="text-xs text-muted-foreground block mb-2">Participantes</label>
                {selectedParticipants.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedParticipants.map(p => (
                      <span key={p.uid} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                        {p.name}
                        <button onClick={() => toggleParticipant(p)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou e-mail..."
                    value={participantSearch}
                    onChange={e => setParticipantSearch(e.target.value)}
                    className="pl-8 bg-surface-mid border-0 rounded-xl text-sm"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl bg-surface-mid p-1">
                  {loadingProfiles ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Carregando...</p>
                  ) : filteredProfiles.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Nenhum usuário encontrado.</p>
                  ) : filteredProfiles.map(u => {
                    const isSelected = !!selectedParticipants.find(p => p.uid === u.uid);
                    return (
                      <button key={u.uid} onClick={() => toggleParticipant(u)}
                        className={"w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors " + (isSelected ? "bg-primary/20" : "hover:bg-surface-high")}>
                        <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.role}</p>
                        </div>
                        {isSelected && <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0"><span className="text-background text-[10px]">✓</span></div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button className="w-full rounded-xl bg-primary hover:bg-primary/80" onClick={handleCreate} disabled={saving || !form.title.trim() || !form.time}>
                {saving ? "Criando..." : "Criar Reunião"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create event dialog */}
        <Dialog open={eventOpen} onOpenChange={open => { setEventOpen(open); if (!open) { setEventParticipants([]); setEventParticipantSearch(""); } }}>
          <DialogContent className="bg-surface-low border-surface-mid max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Nome do evento *" value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Data</label>
                  <Input type="date" value={eventForm.date} onChange={e => setEventForm(p => ({ ...p, date: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Categoria</label>
                  <select value={eventForm.category} onChange={e => setEventForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm h-10">
                    {EVENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Descrição (opcional)</label>
                <textarea
                  placeholder="Descreva o evento..."
                  value={eventForm.description}
                  onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full h-20 bg-surface-mid rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none border-0 outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              {/* Participant picker */}
              <div>
                <label className="text-xs text-muted-foreground block mb-2">Convidados</label>
                {eventParticipants.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {eventParticipants.map(p => (
                      <span key={p.uid} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
                        {p.name}
                        <button onClick={() => toggleEventParticipant(p)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou e-mail..."
                    value={eventParticipantSearch}
                    onChange={e => setEventParticipantSearch(e.target.value)}
                    className="pl-8 bg-surface-mid border-0 rounded-xl text-sm"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl bg-surface-mid p-1">
                  {loadingProfiles ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Carregando...</p>
                  ) : allProfileUsers.filter(u =>
                    !eventParticipantSearch.trim() ||
                    u.name.toLowerCase().includes(eventParticipantSearch.toLowerCase()) ||
                    u.email?.toLowerCase().includes(eventParticipantSearch.toLowerCase())
                  ).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Nenhum usuário encontrado.</p>
                  ) : allProfileUsers.filter(u =>
                    !eventParticipantSearch.trim() ||
                    u.name.toLowerCase().includes(eventParticipantSearch.toLowerCase()) ||
                    u.email?.toLowerCase().includes(eventParticipantSearch.toLowerCase())
                  ).map(u => {
                    const isSelected = !!eventParticipants.find(p => p.uid === u.uid);
                    return (
                      <button key={u.uid} onClick={() => toggleEventParticipant(u)}
                        className={"w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors " + (isSelected ? "bg-purple-500/20" : "hover:bg-surface-high")}>
                        <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.role}</p>
                        </div>
                        {isSelected && <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0"><span className="text-background text-[10px]">✓</span></div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button className="w-full rounded-xl bg-primary hover:bg-primary/80" onClick={handleCreateEvent} disabled={eventSaving || !eventForm.title.trim()}>
                {eventSaving ? "Criando..." : "Criar Evento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Full-month calendar grid ───────────────────────────── */}
        <div className="bg-surface-low rounded-3xl border border-surface-mid mb-6 overflow-hidden">
          {/* Month header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-mid">
            <button onClick={prevMonth} className="p-1.5 rounded-xl hover:bg-surface-mid transition-colors">
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <h2 className="font-semibold text-foreground capitalize">
              {MONTHS_PT[viewMonth]} {viewYear}
            </h2>
            <button onClick={nextMonth} className="p-1.5 rounded-xl hover:bg-surface-mid transition-colors">
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Week day labels */}
          <div className="grid grid-cols-7 border-b border-surface-mid">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center py-2 text-[10px] font-semibold text-muted-foreground uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="min-h-[48px] border-r border-b border-surface-mid last:border-r-0" />;
              const dayMeetings = meetingsForDay(day);
              const isSelected = day === selectedDay && viewMonth === now.getMonth() && viewYear === now.getFullYear()
                ? selectedDay === day
                : day === selectedDay;
              const isTodayCell = isToday(day);
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={"min-h-[48px] flex flex-col items-center justify-start pt-1.5 pb-1 border-r border-b border-surface-mid last:border-r-0 transition-colors relative " +
                    (isSelected ? "bg-primary/10" : "hover:bg-surface-mid")}
                >
                  <span className={"w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold " +
                    (isTodayCell ? "bg-primary text-background" : isSelected ? "text-primary" : "text-foreground")}>
                    {day}
                  </span>
                  {dayMeetings.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayMeetings.slice(0, 3).map((m, i) => (
                        <div key={i} className={"w-1 h-1 rounded-full " + (m.kind === "event" ? "bg-purple-400" : "bg-primary")} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Day meetings & events ───────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            {selectedDay} de {MONTHS_PT[viewMonth]}
          </h2>
          <span className="text-xs text-muted-foreground">
            {selectedDayMeetings.filter(m => m.kind !== "event").length} reunião(ões) · {selectedDayMeetings.filter(m => m.kind === "event").length} evento(s)
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-surface-low rounded-2xl p-4 border border-surface-mid flex gap-3">
                <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0 bg-surface-high" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2 bg-surface-high" />
                  <Skeleton className="h-3 w-1/3 bg-surface-high" />
                </div>
              </div>
            ))}
          </div>
        ) : selectedDayMeetings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma reunião ou evento neste dia</p>
            {canCreate && (
              <div className="flex gap-2 justify-center mt-3">
                <Button onClick={() => { setEventForm(p => ({ ...p, date: dayStr(selectedDay) })); setEventOpen(true); }}
                  variant="outline" className="rounded-2xl border-surface-high text-foreground text-sm">
                  <Plus className="w-4 h-4 mr-1.5" />Criar Evento
                </Button>
                <Button onClick={() => { setForm(p => ({ ...p, date: dayStr(selectedDay) })); setCreateOpen(true); }}
                  className="rounded-2xl bg-primary hover:bg-primary/80 text-background text-sm">
                  <Plus className="w-4 h-4 mr-2" />Criar Reunião
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDayMeetings.map(m => (
              <div key={m.id} className={"bg-surface-low rounded-3xl p-4 border hover:bg-surface-mid transition-colors " + (m.kind === "event" ? "border-purple-500/30" : "border-surface-mid")}>
                <div className="flex items-start gap-4">
                  <div className="text-center min-w-[52px]">
                    {m.kind === "event" ? (
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto">
                        <CalendarDays className="w-5 h-5 text-purple-400" />
                      </div>
                    ) : (
                      <>
                        <p className="text-base font-bold text-primary">{m.time}</p>
                        <p className="text-xs text-muted-foreground">{m.duration}</p>
                      </>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground text-sm">{m.title}</h3>
                      {m.kind === "event" ? (
                        <Badge className="text-xs bg-purple-500/20 text-purple-400">{m.category ?? "Evento"}</Badge>
                      ) : (
                        <Badge className={"text-xs " + (m.type === "video" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400")}>
                          {m.type === "video" ? "Vídeo" : "Presencial"}
                        </Badge>
                      )}
                    </div>
                    {m.description && <p className="text-xs text-muted-foreground mb-1">{m.description}</p>}
                    {m.product && <p className="text-xs text-muted-foreground mb-1">{m.product}</p>}
                    {(m.participantNames?.length ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{m.participantNames?.join(", ")}</span>
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
