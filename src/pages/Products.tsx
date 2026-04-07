import { useState, useEffect } from "react";
import { Package, Plus, Search, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auth, db } from "@/integrations/firebase/client";
import {
  collection, onSnapshot, addDoc, serverTimestamp, query, orderBy,
} from "firebase/firestore";

const productTypes = ["Todos", "App / SaaS", "Infoproduto", "E-commerce", "Landing Page"];
const statusTypes = ["Todos", "Em desenvolvimento", "Lançado", "Pausado"];

interface Product {
  id: string;
  name: string;
  type: string;
  progress: number;
  status: string;
}

const getStatusColor = (status: string) => {
  if (status === "Lançado") return "bg-green-500/20 text-green-400";
  if (status === "Pausado") return "bg-gray-500/20 text-gray-400";
  return "bg-yellow-500/20 text-yellow-400";
};

export default function Products() {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [addOpen, setAddOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "Todos" || p.type === typeFilter;
    const matchStatus = statusFilter === "Todos" || p.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const handleAdd = async () => {
    if (!newName.trim() || !newType || !newStatus) return;
    setSaving(true);
    await addDoc(collection(db, "users", uid, "products"), {
      name: newName.trim(),
      type: newType,
      status: newStatus,
      progress: 0,
      createdAt: serverTimestamp(),
    });
    setNewName("");
    setNewType("");
    setNewStatus("");
    setSaving(false);
    setAddOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground font-sans">Produtos</h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
                <Plus className="w-4 h-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-surface-low border-surface-mid">
              <DialogHeader>
                <DialogTitle>Novo Produto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Nome do Produto</Label>
                  <Input
                    placeholder="ex: App Delivery"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="bg-surface-mid border-0 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Tipo</Label>
                  <Select onValueChange={setNewType} value={newType}>
                    <SelectTrigger className="bg-surface-mid border-0 rounded-xl text-sm">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {productTypes.slice(1).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Status</Label>
                  <Select onValueChange={setNewStatus} value={newStatus}>
                    <SelectTrigger className="bg-surface-mid border-0 rounded-xl text-sm">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusTypes.slice(1).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full rounded-xl bg-primary hover:bg-primary/80"
                  onClick={handleAdd}
                  disabled={saving || !newName.trim() || !newType || !newStatus}
                >
                  {saving ? "Criando..." : "Criar Produto"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-surface-low border border-surface-mid rounded-2xl text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex gap-2">
            {statusTypes.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-2xl text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-background"
                    : "bg-surface-mid text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Carregando produtos...</p>
          </div>
        ) : filtered.length === 0 && products.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground mb-1">Nenhum produto ainda</p>
            <p className="text-xs mb-4">Crie seu primeiro produto para começar a acompanhar o progresso.</p>
            <Button onClick={() => setAddOpen(true)} className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Produto
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map(product => (
                <button
                  key={product.id}
                  onClick={() => navigate(`/products/${product.id}`)}
                  className="bg-surface-low rounded-3xl p-5 border border-surface-mid hover:bg-surface-mid active:scale-[0.98] transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <Badge className={`text-xs ${getStatusColor(product.status)}`}>
                      {product.status}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-foreground mb-1">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{product.type}</p>

                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">Progresso</span>
                      <span className="text-xs font-medium text-primary">{product.progress ?? 0}%</span>
                    </div>
                    <Progress value={product.progress ?? 0} className="h-1.5 bg-surface-mid" />
                  </div>
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum produto encontrado</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
