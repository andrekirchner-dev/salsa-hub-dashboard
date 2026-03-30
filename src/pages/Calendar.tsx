import { CalendarDays, Clock, Users, Video } from "lucide-react";

const meetings = [
  { title: "Standup Diário", time: "09:00", duration: "15 min", participants: ["Ana", "Carlos", "Pedro"], type: "video", product: "App Salsa Delivery" },
  { title: "Review de Design", time: "11:00", duration: "1h", participants: ["Ana", "Maria"], type: "video", product: "Curso Marketing Digital" },
  { title: "Sprint Planning", time: "14:00", duration: "2h", participants: ["Carlos", "Pedro", "João"], type: "presencial", product: "Loja Salsa Store" },
  { title: "1:1 com Maria", time: "16:30", duration: "30 min", participants: ["Maria"], type: "video", product: null },
];

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const currentDay = new Date().getDay();

export default function Calendar() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      <h1 className="text-2xl font-bold">Calendário</h1>

      {/* Mini week view */}
      <div className="bg-surface-low rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Esta Semana</h2>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((d, i) => {
            const isToday = i === (currentDay === 0 ? 6 : currentDay - 1);
            return (
              <div key={d} className={`text-center py-3 rounded-2xl transition-colors ${
                isToday ? "bg-primary text-primary-foreground" : "bg-surface-mid text-muted-foreground"
              }`}>
                <p className="text-xs font-medium">{d}</p>
                <p className="text-lg font-bold mt-1">{25 + i}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's meetings */}
      <div>
        <h2 className="font-semibold text-lg mb-4">Reuniões de Hoje</h2>
        <div className="space-y-3">
          {meetings.map((m, i) => (
            <div key={i} className="bg-surface-low rounded-2xl p-5 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface-mid flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{m.title}</h3>
                  {m.type === "video" && <Video className="w-4 h-4 text-info" />}
                </div>
                <p className="text-sm text-muted-foreground">{m.time} · {m.duration}</p>
                {m.product && <p className="text-xs text-primary mt-1">{m.product}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{m.participants.join(", ")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
