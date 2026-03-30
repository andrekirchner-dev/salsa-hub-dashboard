import { useState } from "react";
import { Package, Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const productTypes = ["Todos", "App / SaaS", "Infoproduto", "E-commerce", "Landing Page"];
const statusTypes = ["Todos", "Em desenvolvimento", "Lançado", "Pausado"];

interface Product {
  id: string;
  name: string;
  type: string;
  progress: number;
  status: string;
  team: string[];
}

const initialProducts: Product[] = [
  { id: "1", name: "App Salsa Delivery", type: "App / SaaS", progress: 72, status: "Em desenvolvimento", team: ["Ana", "Carlos"] },
  { id: "2", name: "Curso Marketing Digital", type: "Infoproduto", progress: 45, status: "Em desenvolvimento", team: ["Maria"] },
  { id: "3", name: "Loja Salsa Store", type: "E-commerce", progress: 90, status: "Lançado", team: ["João", "Ana"] },
  { id: "4", name: "Landing Salsa Pro", type: "Landing Page", progress: 100, status: "Lançado", team: ["Carlos"] },
  { id: "5", name: "App Gestão Interna", type: "App / SaaS", progress: 20, status: "Em desenvolvimento", team: ["Pedro", "Maria"] },
  { id: "6", name: "Ebook Vendas Online", type: "Infoproduto", progress: 0, status: "Pausado", team: ["João"] },
];

export default function Products() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [products, setProducts] = useState(initialProducts);
  const [newProduct, setNewProduct] = useState({ name: "", type: "App / SaaS" });
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "Todos" || p.type === typeFilter;
    const matchStatus = statusFilter === "Todos" || p.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const addProduct = () => {
    if (!newProduct.name) return;
    setProducts([...products, {
      id: String(Date.now()),
      name: newProduct.name,
      type: newProduct.type,
      progress: 0,
      status: "Em desenvolvimento",
      team: [],
    }]);
    setNewProduct({ name: "", type: "App / SaaS" });
    setDialogOpen(false);
  };

  const statusColor = (s: string) => {
    if (s === "Lançado") return "bg-primary/10 text-primary";
    if (s === "Pausado") return "bg-destructive/10 text-destructive";
    return "bg-warning/10 text-warning";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full gap-2">
              <Plus className="w-4 h-4" /> Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-surface-mid border-0 rounded-3xl">
            <DialogHeader>
              <DialogTitle>Adicionar Produto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nome do Produto</Label>
                <Input
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="bg-surface-low border-0 rounded-xl mt-1"
                  placeholder="Ex: App Salsa..."
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={newProduct.type} onValueChange={(v) => setNewProduct({ ...newProduct, type: v })}>
                  <SelectTrigger className="bg-surface-low border-0 rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-high border-0 rounded-xl">
                    {productTypes.filter(t => t !== "Todos").map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addProduct} className="w-full rounded-full">Criar Produto</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produtos..."
            className="pl-9 bg-surface-low border-0 rounded-xl"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {productTypes.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typeFilter === t ? "bg-primary text-primary-foreground" : "bg-surface-low text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <Link key={p.id} to={`/products/${p.id}`} className="block">
            <div className="bg-surface-low rounded-3xl p-6 hover:bg-surface-mid transition-colors space-y-4 h-full">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-surface-mid flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <span className={`text-xs px-3 py-1 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{p.type}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso</span>
                  <span>{p.progress}%</span>
                </div>
                <Progress value={p.progress} className="h-1.5 bg-surface-mid" />
              </div>
              {p.team.length > 0 && (
                <div className="flex gap-1">
                  {p.team.map(m => (
                    <span key={m} className="w-7 h-7 rounded-full bg-surface-high flex items-center justify-center text-xs font-medium">
                      {m[0]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
