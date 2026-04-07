import { useState, useEffect } from "react";
import { ArrowLeft, Megaphone, TrendingUp, Users, Target, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { auth, db } from "@/integrations/firebase/client";
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";

interface Campaign {
  id: string;
  name: string;
  product: string;
  status: "Ativa" | "Planejada" | "Concluida";
  leads: number;
  goal: number;
  budget: string;
}

const statusColor = (s: string) => {
  if (s === "Ativa") return "bg-primary/10 text-primary";
  if (s === "Concluida") return "bg-blue-500/10 text-blue-400";
  return "bg-yellow-500/10 text-yellow-400";
};

export default function Marketing() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid ?? "";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState("");
  const [newProduct, setNewProduct] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [newStatus, setNewStatus] = useState<Campaign["status"]>("Planejada");

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "campaigns"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const totalLeads = campaigns.reduce((a, c) => a + (c.leads ?? 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === "Ativa").length;
  const avgConversion = campaigns.length > 0
    ? Math.round((campaigns.reduce((a, c) => a + ((c.leads ?? 0) / Math.max(c.goal ?? 1, 1)), 0) / campaigns.length) * 100)
    : 0;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await addDoc(collection(db, "users", uid, "campaigns"), {
      name: newName.trim(),
      product: newProduct.trim(),
      status: newStatus,
      leads: 0,
      goal: parseInt(newGoal) || 0,
      budget: newBudget.trim(),
      createdAt: serverTimestamp(),
    });
    setNewName(""); setNewProduct(""); setNewGoal(""); setNewBudget(""); setNewStatus("Planejada");
    setSaving(false);
    setAddOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-mid transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground font-sans flex-1">Marketing e Campanhas</h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
                <Plus className="w-4 h-4 mr-2" />Nova
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-surface-low border-surface-mid">
              <DialogHeader><DialogTitle>Nova Campanha</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nome da campanha" value={newName} onChange={e => setNewName(e.target.value)} className="bg-surface-mid border-0 rounded-xl text-sm" />
                <Input placeholder="Produto vinculado" value={newProduct} onChange={e => setNewProduct(e.target.value)} className="bg-surface-mid border-0 rounded-xl text-sm" />
                <Input placeholder="Meta de leads (ex: 500)" type="number" value={newGoal} onChange={e => setNewGoal(e.target.value)} className="bg-surface-mid border-0 rounded-xl text-sm" />
                <Input placeholder="Orçamento (ex: R$ 2.000)" value={newBudget} onChange={e => setNewBudget(e.target.value)} className="bg-surface-mid border-0 rounded-xl text-sm" />
                <select value={newStatus} onChange={e => setNewStatus(e.target.value as any)} className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                  <option value="Planejada">Planejada</option>
                  <option value="Ativa">Ativa</option>
                  <option value="Concluida">Concluída</option>
                </select>
                <Button className="w-full rounded-xl bg-primary hover:bg-primary/80" onClick={handleAdd} disabled={saving || !newName.trim()}>
                  {saving ? "Salvando..." : "Criar Campanha"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Campanhas Ativas", value: activeCampaigns, icon: Megaphone, color: "text-primary", bg: "bg-primary/15" },
            { label: "Total de Leads", value: totalLeads.toLocaleString(), icon: Users, color: "text-blue-400", bg: "bg-blue-500/15" },
            { label: "Total Campanhas", value: campaigns.length, icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/15" },
            { label: "Taxa de Conversão", value: avgConversion + "%", icon: Target, color: "text-yellow-400", bg: "bg-yellow-500/15" },
          ].map(s => (
            <div key={s.label} className="bg-surface-low rounded-3xl p-4 border border-surface-mid">
              <div className={"w-8 h-8 rounded-2xl " + s.bg + " flex items-center justify-center mb-2"}>
                <s.icon className={"w-4 h-4 " + s.color} />
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Campaigns list */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Carregando campanhas...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma campanha ainda</p>
            <p className="text-xs mb-4">Crie sua primeira campanha de marketing.</p>
            <Button onClick={() => setAddOpen(true)} className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
              <Plus className="w-4 h-4 mr-2" />Criar Campanha
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const pct = Math.min(100, Math.round(((c.leads ?? 0) / Math.max(c.goal ?? 1, 1)) * 100));
              return (
                <div key={c.id} className="bg-surface-low rounded-3xl p-5 border border-surface-mid hover:bg-surface-mid transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm mb-0.5 truncate">{c.name}</h3>
                      {c.product && <p className="text-xs text-muted-foreground truncate">{c.product}</p>}
                    </div>
                    <span className={"text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 " + statusColor(c.status)}>
                      {c.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Leads</p>
                      <p className="font-bold text-foreground text-sm">{(c.leads ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Meta</p>
                      <p className="font-bold text-foreground text-sm">{(c.goal ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Orçamento</p>
                      <p className="font-bold text-primary text-sm">{c.budget || "—"}</p>
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
        )}
      </div>
    </div>
  );
}
