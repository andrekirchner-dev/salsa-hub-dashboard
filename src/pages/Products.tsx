import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Package, Loader2, ArrowRight, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  collection, query, where, getDocs, addDoc, doc, getDoc,
  serverTimestamp, orderBy,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/integrations/firebase/client";

interface Product {
  id: string;
  name: string;
  description?: string;
  status: string;
  productCode?: string;
}

function generateProductCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const part = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part(4)}-${part(4)}`;
}

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"choose" | "create" | "join">("choose");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const user = getAuth().currentUser;
    if (!user) return;

    const profileSnap = await getDoc(doc(db, "profiles", user.uid));
    setCurrentUserRole(profileSnap.data()?.role || "");

    const [ownedSnap, accessSnap] = await Promise.all([
      getDocs(query(collection(db, "products"), orderBy("name"))),
      getDocs(query(collection(db, "productAccess"), where("userId", "==", user.uid))),
    ]);

    const owned: Product[] = ownedSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name,
      description: d.data().description,
      status: d.data().status,
      productCode: d.data().productCode,
    }));

    const accessIds = accessSnap.docs.map((d) => d.data().productId);
    const ownedIds = new Set(owned.map((p) => p.id));
    const extraProducts: Product[] = [];

    for (const pid of accessIds) {
      if (!ownedIds.has(pid)) {
        const pSnap = await getDoc(doc(db, "products", pid));
        if (pSnap.exists()) {
          extraProducts.push({
            id: pSnap.id,
            name: pSnap.data().name,
            description: pSnap.data().description,
            status: pSnap.data().status,
            productCode: pSnap.data().productCode,
          });
        }
      }
    }

    setProducts([...owned, ...extraProducts]);
    setLoading(false);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const openDialog = () => {
    setDialogMode("choose");
    setDialogOpen(true);
    setJoinError("");
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const user = getAuth().currentUser;
    const code = generateProductCode();
    await addDoc(collection(db, "products"), {
      name: newName.trim(),
      description: newDesc.trim() || null,
      status: "ativo",
      productCode: code,
      createdBy: user?.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setNewName(""); setNewDesc(""); setSaving(false); setDialogOpen(false);
    loadProducts();
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setSaving(true);
    setJoinError("");
    const user = getAuth().currentUser;
    if (!user) return;

    const q = query(collection(db, "products"), where("productCode", "==", code));
    const snap = await getDocs(q);

    if (snap.empty) {
      setJoinError("Código inválido. Verifique e tente novamente.");
      setSaving(false);
      return;
    }

    const product = snap.docs[0];
    const accessQ = query(
      collection(db, "productAccess"),
      where("productId", "==", product.id),
      where("userId", "==", user.uid)
    );
    const accessSnap = await getDocs(accessQ);

    if (!accessSnap.empty) {
      setJoinError("Você já tem acesso a este produto.");
      setSaving(false);
      return;
    }

    await addDoc(collection(db, "productAccess"), {
      productId: product.id,
      userId: user.uid,
      accessLevel: "view",
      grantedAt: serverTimestamp(),
    });

    setJoinCode(""); setSaving(false); setDialogOpen(false);
    loadProducts();
  };

  const canCreate = ["CEO", "CFO", "CMO", "COO", "Diretor", "Gerente"].includes(currentUserRole);
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Produtos</h1>
          <p className="text-xs text-muted-foreground">Gerencie os produtos da equipe</p>
        </div>
        <Button onClick={openDialog} size="sm" className="bg-primary text-background rounded-2xl font-semibold gap-1">
          <Plus className="w-4 h-4" />Novo Produto
        </Button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto..." className="pl-10 bg-surface-low border-surface-mid rounded-2xl h-11" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-low border border-surface-mid rounded-3xl p-10 text-center">
          <Package className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {products.length === 0 ? "Nenhum produto ainda." : "Nenhum produto encontrado."}
          </p>
          {canCreate && <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Produto" para começar.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((product) => (
            <button key={product.id} onClick={() => navigate(`/products/${product.id}`)}
              className="w-full bg-surface-low border border-surface-mid rounded-3xl p-4 text-left hover:bg-surface-mid active:scale-[0.98] transition-all flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{product.name}</p>
                {product.description && <p className="text-xs text-muted-foreground truncate">{product.description}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className={`text-xs rounded-full border ${product.status === "ativo" ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-surface-high text-muted-foreground"}`}>
                  {product.status}
                </Badge>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface-low border-surface-mid rounded-3xl mx-4 max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "choose" ? "Novo Produto" : dialogMode === "create" ? "Criar Produto" : "Entrar com Código"}
            </DialogTitle>
          </DialogHeader>

          {dialogMode === "choose" && (
            <div className="space-y-3 mt-2">
              <button onClick={() => setDialogMode("create")}
                className="w-full p-4 rounded-2xl bg-surface-mid border border-surface-high hover:border-primary/50 transition-colors text-left flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Criar novo produto</p>
                  <p className="text-xs text-muted-foreground">Inicie um produto do zero</p>
                </div>
              </button>
              <button onClick={() => setDialogMode("join")}
                className="w-full p-4 rounded-2xl bg-surface-mid border border-surface-high hover:border-primary/50 transition-colors text-left flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Hash className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Entrar com código</p>
                  <p className="text-xs text-muted-foreground">Acesse um produto de outra equipe</p>
                </div>
              </button>
            </div>
          )}

          {dialogMode === "create" && (
            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nome do produto</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: App Mobile" className="bg-surface-mid border-surface-high rounded-2xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Descrição (opcional)</Label>
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Breve descrição" className="bg-surface-mid border-surface-high rounded-2xl" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setDialogMode("choose")} className="flex-1 rounded-2xl">Voltar</Button>
                <Button onClick={handleCreate} disabled={saving || !newName} className="flex-1 bg-primary text-background rounded-2xl font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
                </Button>
              </div>
            </div>
          )}

          {dialogMode === "join" && (
            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Código do produto</Label>
                <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Ex: ABCD-EFGH"
                  maxLength={9} className="bg-surface-mid border-surface-high rounded-2xl font-mono tracking-widest" />
                {joinError && <p className="text-xs text-red-400">{joinError}</p>}
              </div>
              <p className="text-xs text-muted-foreground">Solicite o código ao responsável pelo produto.</p>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => { setDialogMode("choose"); setJoinError(""); }} className="flex-1 rounded-2xl">Voltar</Button>
                <Button onClick={handleJoin} disabled={saving || !joinCode} className="flex-1 bg-primary text-background rounded-2xl font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
