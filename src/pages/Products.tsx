import { useState, useEffect } from "react";
import { Package, Plus, Search, Link2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auth, db } from "@/integrations/firebase/client";
import {
  collection, onSnapshot, addDoc, setDoc, updateDoc, getDoc, getDocs,
  serverTimestamp, query, orderBy, where, doc, runTransaction,
} from "firebase/firestore";

// shared product reference stored when another user adds you to their product
interface SharedProduct extends Product { ownerUid: string; isShared: true; }

const productTypes = [
  "Todos", "App", "SaaS", "Infoproduto", "E-commerce", "Landing Page",
  "Rede Social", "IA-Book", "E-Book", "Revista Digital", "Dashboard",
  "Comunidade", "Curso",
];
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
  const userName = auth.currentUser?.displayName ?? "Usuário";

  const [products, setProducts] = useState<Product[]>([]);
  const [sharedProducts, setSharedProducts] = useState<SharedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [addOpen, setAddOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // CEO: Vincular Produto
  const [vincularOpen, setVincularOpen] = useState(false);
  const [linkCodeInput, setLinkCodeInput] = useState("");
  const [vincularLoading, setVincularLoading] = useState(false);
  const [vincularError, setVincularError] = useState("");

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "profiles", uid)).then(snap => {
      if (snap.exists()) setUserRole(snap.data()?.role ?? "");
    });
    const q = query(collection(db, "users", uid, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  // Load products shared with this user by others
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "sharedProducts"), orderBy("addedAt", "desc"));
    return onSnapshot(q, snap => {
      setSharedProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as SharedProduct)));
    });
  }, [uid]);

  const filterFn = (p: Product) => {
    if ((p as any).archived) return false;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "Todos" || p.type === typeFilter;
    const matchStatus = statusFilter === "Todos" || p.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  };
  const filtered = products.filter(filterFn);
  const filteredShared = sharedProducts.filter(filterFn);

  const handleVincular = async () => {
    const code = linkCodeInput.trim().toUpperCase();
    if (!code || vincularLoading) return;
    setVincularLoading(true);
    setVincularError("");
    try {
      // Pré-validação: localizar o documento do código
      const codesSnap = await getDocs(
        query(collection(db, "linkCodes"), where("code", "==", code), where("active", "==", true))
      );
      if (codesSnap.empty) { setVincularError("Código não encontrado ou inativo."); return; }
      const codeDocRef = codesSnap.docs[0].ref;
      const codeData = codesSnap.docs[0].data();
      if (codeData.ownerUid === uid) { setVincularError("Você não pode vincular seu próprio produto."); return; }

      // Pré-validar produto antes da transação (leitura barata fora da tx)
      const productSnap = await getDoc(doc(db, "users", codeData.ownerUid, "products", codeData.productId));
      if (!productSnap.exists()) { setVincularError("Produto referenciado não encontrado."); return; }
      const productData = productSnap.data();

      // runTransaction garante atomicidade: verifica limite E incrementa em uma
      // única operação — elimina a race condition onde múltiplos usuários
      // poderiam usar o mesmo código simultaneamente.
      await runTransaction(db, async (tx) => {
        const freshCode = await tx.get(codeDocRef);
        if (!freshCode.exists() || !freshCode.data().active) {
          throw new Error("Código inválido ou inativo.");
        }
        const fresh = freshCode.data();
        if (fresh.usedCount >= fresh.maxUses) {
          throw new Error("Este código já atingiu o limite de usos.");
        }
        // Incremento atômico dentro da transação
        tx.update(codeDocRef, { usedCount: fresh.usedCount + 1 });
        // Vincula o produto ao usuário atual
        tx.set(doc(db, "users", uid, "products", codeData.productId), {
          ...productData,
          isLinked: true,
          linkedFromUid: codeData.ownerUid,
          linkedCode: code,
          linkedAt: serverTimestamp(),
          progress: productData.progress ?? 0,
          createdAt: productData.createdAt ?? serverTimestamp(),
        });
      });

      // Notifica o criador do produto (fora da transação, sem impacto no atomismo)
      await addDoc(collection(db, "users", codeData.ownerUid, "notifications"), {
        type: "product",
        title: "Produto vinculado!",
        description: `${userName} vinculou "${productData.name}" usando seu código de acesso.`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setLinkCodeInput("");
      setVincularOpen(false);
    } catch (e: any) {
      setVincularError(e?.message ?? "Erro ao vincular produto. Tente novamente.");
    } finally {
      setVincularLoading(false);
    }
  };

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
        <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground font-sans">Produtos</h1>
          <div className="flex gap-2">
            {userRole === "CEO" && (
              <Button onClick={() => { setVincularOpen(true); setVincularError(""); setLinkCodeInput(""); }}
                variant="outline" className="rounded-2xl border-surface-high text-foreground text-sm">
                <Link2 className="w-4 h-4 mr-2" />Vincular Produto
              </Button>
            )}
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
        </div>

        {/* Vincular Produto Dialog */}
        <Dialog open={vincularOpen} onOpenChange={v => { setVincularOpen(v); if (!v) { setLinkCodeInput(""); setVincularError(""); } }}>
          <DialogContent className="bg-surface-low border-surface-mid">
            <DialogHeader><DialogTitle>Vincular Produto Parceiro</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground -mt-2">
              Insira o código de vinculação fornecido pelo parceiro para adicionar o produto à sua lista.
            </p>
            <div className="space-y-3">
              <Input
                placeholder="Ex: LINK-ABCD1234"
                value={linkCodeInput}
                onChange={e => { setLinkCodeInput(e.target.value.toUpperCase()); setVincularError(""); }}
                className="bg-surface-mid border-0 rounded-xl text-sm font-mono tracking-widest"
              />
              {vincularError && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{vincularError}</p>
              )}
              <Button
                className="w-full rounded-xl bg-primary hover:bg-primary/80"
                onClick={handleVincular}
                disabled={vincularLoading || !linkCodeInput.trim()}
              >
                {vincularLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Vinculando...</> : "Vincular Produto"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-surface-low rounded-3xl p-5 border border-surface-mid space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-2/3 bg-surface-high" />
                    <Skeleton className="h-4 w-1/3 bg-surface-high" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full bg-surface-high" />
                </div>
                <Skeleton className="h-2 w-full rounded-full bg-surface-high" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16 bg-surface-high" />
                  <Skeleton className="h-3 w-8 bg-surface-high" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 && filteredShared.length === 0 && products.length === 0 ? (
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
              {[...filtered, ...filteredShared].map(product => {
                const isShared = !!(product as SharedProduct).isShared;
                return (
                  <button
                    key={product.id}
                    onClick={() => navigate(`/products/${product.id}`, isShared ? { state: { ownerUid: (product as SharedProduct).ownerUid } } : undefined)}
                    className="bg-surface-low rounded-3xl p-5 border border-surface-mid hover:bg-surface-mid active:scale-[0.98] transition-all text-left"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {isShared && <Badge className="text-xs bg-blue-500/20 text-blue-400">Parceiro</Badge>}
                        {(product as any).isLinked && <Badge className="text-xs bg-purple-500/20 text-purple-400">Vinculado</Badge>}
                        <Badge className={`text-xs ${getStatusColor(product.status)}`}>{product.status}</Badge>
                      </div>
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
                );
              })}
            </div>

            {filtered.length === 0 && filteredShared.length === 0 && (
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
