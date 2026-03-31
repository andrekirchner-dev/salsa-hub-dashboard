import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface NotificationsDrawerProps {
  open: boolean;
  onClose: () => void;
}

const mockNotifications = [
  { id: 1, type: "success", title: "Campanha aprovada", description: "Sua campanha App Delivery foi aprovada", timestamp: "há 5 min", unread: true },
  { id: 2, type: "warning", title: "Prazo próximo", description: "Reunião com equipe design em 2 horas", timestamp: "há 2h", unread: true },
  { id: 3, type: "alert", title: "Ação necessária", description: "Landing page aguardando sua aprovação", timestamp: "há 5h", unread: false },
  { id: 4, type: "success", title: "Arquivo enviado", description: "Novo briefing adicionado ao Salsa Store", timestamp: "ontem", unread: false },
  { id: 5, type: "warning", title: "Atualização disponível", description: "Nova versão da identidade visual", timestamp: "2 dias atrás", unread: false },
];

const getDot = (t: string) => t === "success" ? "bg-green-500" : t === "warning" ? "bg-yellow-500" : "bg-red-500";

export function NotificationsDrawer({ open, onClose }: NotificationsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-96 bg-surface-low border-0">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-foreground">Notificações</SheetTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">Marcar tudo como lido</Button>
          </div>
        </SheetHeader>
        <div className="space-y-2">
          {mockNotifications.map((n) => (
            <div key={n.id} className={`p-4 rounded-2xl ${n.unread ? "bg-surface-mid" : "bg-background"} hover:bg-surface-high`}>
              <div className="flex gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${getDot(n.type)}`} />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{n.title}</h4>
                    {n.unread && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{n.description}</p>
                  <span className="text-xs text-muted-foreground/60 mt-2 block">{n.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-6 border-t border-surface-mid">
          <Link to="/notifications" onClick={onClose} className="block text-center text-sm text-primary hover:text-primary/80 font-medium">
            Ver todas as notificações
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
