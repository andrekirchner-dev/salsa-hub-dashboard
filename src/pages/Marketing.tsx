import { ArrowLeft, Megaphone, TrendingUp, Users, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

const campaigns = [
  { name: "Black Friday Salsa", product: "Loja Salsa Store", status: "Ativa", leads: 1240, goal: 2000, budget: "R$ 5.000" },
  { name: "Lancamento App Delivery", product: "App Salsa Delivery", status: "Planejada", leads: 0, goal: 500, budget: "R$ 3.000" },
  { name: "Curso Marketing - Pre-venda", product: "Curso Marketing Digital", status: "Ativa", leads: 380, goal: 1000, budget: "R$ 2.500" },
  { name: "Landing Page Promocional", product: "Landing Salsa Pro", status: "Concluida", leads: 890, goal: 800, budget: "R$ 1.200" },
];

const statusColor = (s: string) => {
  if (s === "Ativa") return "bg-primary/10 text-primary";
  if (s === "Concluida") return "bg-blue-500/10 text-blue-400";
  return "bg-yellow-500/10 text-yellow-400";
};

export default function Marketing() {
  const navigate = useNavigate();
  const totalLeads = campaigns.reduce((a, c) => a + c.leads, 0);
  const activeCampaigns = campaigns.filter(c => c.status === "Ativa").length;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-surface-mid transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground font-sans">Marketing e Campanhas</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-surface-low rounded-3xl p-4 border border-surface-mid">
            <div className="w-8 h-8 rounded-2xl bg-primary/15 flex items-center justify-center mb-2">
              <Megaphone className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground">{activeCampaigns}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Campanhas Ativas</p>
          </div>
          <div className="bg-surface-low rounded-3xl p-4 border border-surface-mid">
            <div className="w-8 h-8 rounded-2xl bg-blue-500/15 flex items-center justify-center mb-2">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xl font-bold text-foreground">{totalLeads.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total de Leads</p>
          </div>
          <div className="bg-surface-low rounded-3xl p-4 border border-surface-mid">
            <div className="w-8 h-8 rounded-2xl bg-purple-500/15 flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-xl font-bold text-foreground">{campaigns.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Campanhas</p>
          </div>
          <div className="bg-surface-low rounded-3xl p-4 border border-surface-mid">
            <div className="w-8 h-8 rounded-2xl bg-yellow-500/15 flex items-center justify-center mb-2">
              <Target className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {Math.round((campaigns.reduce((a, c) => a + (c.leads / c.goal), 0) / campaigns.length) * 100)}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Taxa de Conversao</p>
          </div>
        </div>

        <div className="space-y-3">
          {campaigns.map((c, i) => {
            const pct = Math.min(100, Math.round((c.leads / c.goal) * 100));
            return (
              <div key={i} className="bg-surface-low rounded-3xl p-5 border border-surface-mid hover:bg-surface-mid transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm mb-0.5 truncate">{c.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{c.product}</p>
                  </div>
                  <span className={"text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 " + statusColor(c.status)}>
                    {c.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Leads</p>
                    <p className="font-bold text-foreground text-sm">{c.leads.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Meta</p>
                    <p className="font-bold text-foreground text-sm">{c.goal.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Orcamento</p>
                    <p className="font-bold text-primary text-sm">{c.budget}</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">Progresso</span>
                    <span className="text-xs font-medium text-primary">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5 bg-surface-mid" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
