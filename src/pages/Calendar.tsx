import { useState } from "react";
import { ArrowLeft, CalendarDays, Clock, Users, Video, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CAN_CREATE_MEETING = ["CEO", "CFO", "CMO", "COO", "Gerente", "Coordenador"];
const USER_ROLE = "Gerente";

const meetings = [
  { title: "Standup Diario", time: "09:00", duration: "15 min", participants: ["Ana", "Carlos", "Pedro"], type: "video", product: "App Salsa Delivery" },
  { title: "Review de Design", time: "11:00", duration: "1h", participants: ["Ana", "Maria"], type: "video", product: "Curso Marketing Digital" },
  { title: "Sprint Planning", time: "14:00", duration: "2h", participants: ["Carlos", "Pedro", "Joao"], type: "presencial", product: "Loja Salsa Store" },
  { title: "1:1 com Maria", time: "16:30", duration: "30 min", participants: ["Maria"], type: "video", product: null },
];

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const currentDay = new Date().getDay();

const allMembers = ["Andre", "Mariana", "Carlos", "Ana", "Pedro", "Joao", "Maria"];
const allTeams = ["Equipe Design", "Equipe Dev", "Equipe Marketing", "Equipe Vendas"];
export default function Calendar() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [meetingType, setMeetingType] = useState<"membros" | "equipe">("membros");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const canCreate = CAN_CREATE_MEETING.includes(USER_ROLE);

  const toggleMember = (m: string) =>
    setSelectedMembers(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const toggleTeam = (t: string) =>
    setSelectedTeams(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-surface-mid transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground font-sans flex-1">Calendario</h1>
          {canCreate && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Reuniao
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface-low border-surface-mid max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Reuniao</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Titulo</label>
                    <Input placeholder="ex: Sprint Planning" className="bg-surface-mid border-0 rounded-xl text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-2">Data</label>
                      <Input type="date" className="bg-surface-mid border-0 rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground block mb-2">Horario</label>
                      <Input type="time" className="bg-surface-mid border-0 rounded-xl text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Duracao</label>
                    <select className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                      <option>15 min</option>
                      <option>30 min</option>
                      <option>1h</option>
                      <option>2h</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Tipo</label>
                    <select className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                      <option>Video</option>
                      <option>Presencial</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Adicionar Participantes</label>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setMeetingType("membros")}
                        className={"flex-1 py-2 rounded-xl text-xs font-medium transition-colors " + (meetingType === "membros" ? "bg-primary text-background" : "bg-surface-mid text-muted-foreground")}
                      >
                        Membros
                      </button>
                      <button
                        onClick={() => setMeetingType("equipe")}
                        className={"flex-1 py-2 rounded-xl text-xs font-medium transition-colors " + (meetingType === "equipe" ? "bg-primary text-background" : "bg-surface-mid text-muted-foreground")}
                      >
                        Equipe Inteira
                      </button>
                    </div>

                    {meetingType === "membros" ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {allMembers.map(m => (
                          <label key={m} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-mid cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedMembers.includes(m)}
                              onChange={() => toggleMember(m)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-foreground">{m}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {allTeams.map(t => (
                          <label key={t} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-mid cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTeams.includes(t)}
                              onChange={() => toggleTeam(t)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-foreground">{t}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {(selectedMembers.length > 0 || selectedTeams.length > 0) && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMembers.map(m => (
                        <span key={m} className="flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded-full text-xs">
                          {m}
                          <button onClick={() => toggleMember(m)}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                      {selectedTeams.map(t => (
                        <span key={t} className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                          {t}
                          <button onClick={() => toggleTeam(t)}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}

                  <Button className="w-full rounded-xl bg-primary hover:bg-primary/80" onClick={() => setCreateOpen(false)}>
                    Criar Reuniao
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="bg-surface-low rounded-3xl p-4 border border-surface-mid mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {weekDays.map((day, i) => {
              const isToday = i === (currentDay === 0 ? 6 : currentDay - 1);
              return (
                <div
                  key={day}
                  className={"flex flex-col items-center p-3 rounded-2xl min-w-[52px] " + (isToday ? "bg-primary text-background" : "hover:bg-surface-mid")}
                >
                  <span className={"text-xs font-medium " + (isToday ? "text-background" : "text-muted-foreground")}>{day}</span>
                  <span className={"text-lg font-bold mt-1 " + (isToday ? "text-background" : "text-foreground")}>
                    {28 + i}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Reunioes de Hoje</h2>
          <span className="text-xs text-muted-foreground">{meetings.length} reunioes</span>
        </div>

        <div className="space-y-3">
          {meetings.map((m, i) => (
            <div key={i} className="bg-surface-low rounded-3xl p-4 border border-surface-mid hover:bg-surface-mid transition-colors">
              <div className="flex items-start gap-4">
                <div className="text-center min-w-[48px]">
                  <p className="text-lg font-bold text-primary">{m.time}</p>
                  <p className="text-xs text-muted-foreground">{m.duration}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground text-sm truncate">{m.title}</h3>
                    <Badge className={"text-xs " + (m.type === "video" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400")}>
                      {m.type === "video" ? "Video" : "Presencial"}
                    </Badge>
                  </div>
                  {m.product && <p className="text-xs text-muted-foreground mb-2">{m.product}</p>}
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{m.participants.join(", ")}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
