import { Megaphone, TrendingUp, Users, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const campaigns = [
  { name: "Black Friday Salsa", product: "Loja Salsa Store", status: "Ativa", leads: 1240, goal: 2000, budget: "R$ 5.000" },
  { name: "Lançamento App Delivery", product: "App Salsa Delivery", status: "Planejada", leads: 0, goal: 500, budget: "R$ 3.000" },
  { name: "Curso Marketing - Pré-venda", product: "Curso Marketing Digital", status: "Ativa", leads: 380, goal: 1000, budget: "R$ 2.500" },
  { name: "Landing Page Promocional", product: "Landing Salsa Pro", status: "Concluída", leads: 890, goal: 800, budget: "R$ 1.200" },
];

const statusColor = (s: string) => {
  if (s === "Ativa") return "bg-primary/10 text-primary";
  if (s === "Concluída") return "bg-info/10 text-info";
  return "bg-warning/10 text-warning";
};

export default function Marketing() {
  const totalLeads = campaigns.reduce((a, c) => a + c.leads, 0);
  const activeCampaigns = campaigns.filter(c => c.status === "Ativa").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      <h1 className="text-2xl font-bold">Marketing & Campanhas</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: totalLeads.toLocaleString(), icon: Users, color: "text-primary" },
          { label: "Campanhas Ativas", value: String(activeCampaigns), icon: Megaphone, color: "text-warning" },
          { label: "Taxa de Conversão", value: "3.2%", icon: TrendingUp, color: "text-info" },
          { label: "Meta do Mês", value: "67%", icon: Target, color: "text-primary" },
        ].map(s => (
          <div key={s.label} className="bg-surface-low rounded-2xl p-5 space-y-2">
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {campaigns.map(c => (
          <div key={c.name} className="bg-surface-low rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-xs text-muted-foreground">{c.product}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full ${statusColor(c.status)}`}>{c.status}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{c.leads} leads</span>
                  <span>Meta: {c.goal}</span>
                </div>
                <Progress value={(c.leads / c.goal) * 100} className="h-1.5 bg-surface-mid" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{c.budget}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
