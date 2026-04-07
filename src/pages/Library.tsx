import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, ExternalLink, Search, Loader2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  collection, doc, getDoc, getDocs, addDoc, deleteDoc,
  query, orderBy, where, serverTimestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/integrations/firebase/client";

interface Tool {
  id: string;
  name: string;
  toolFunction: string;
  type: string;
  url: string;
  addedByName?: string;
}

const TOOL_TYPES = ["App", "Site", "IA", "Extensão", "API", "Plugin", "Outro"];
const LIBRARY_ADMIN_ROLES = ["CEO", "CFO", "CMO", "COO", "Diretor", "Coordenador"];

export default function Library() {
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // New tool form
  const [newName, setNewName] = useState("");
  const [newFunction, setNewFunction] = useState("");
  const [newType, setNewType] = useState("Site");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const canAdd = LIBRARY_ADMIN_ROLES.includes(userRole);

  const loadTools = useCallback(async () => {
    setLoading(true);
    const snap = await getDocs(
      query(
        collection(db, "toolsLibrary"),
        where("validated", "==", true),
        orderBy("name")
      )
    );

    const toolsData: Tool[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      let addedByName = "—";
      if (data.addedBy) {
        const profileSnap = await getDoc(doc(db, "profiles", data.addedBy));
        addedByName = profileSnap.data()?.name || "—";
      }
      toolsData.push({
        id: d.id,
        name: data.name,
        toolFunction: data.toolFunction || data.function || "",
        type: data.type,
        url: data.url,
        addedByName,
      });
    }
    setTools(toolsData);
    setLoading(false);
  }, []);

  useEffect(() => {
    const user = getAuth().currentUser;
    if (user) {
      setCurrentUserId(user.uid);
      getDoc(doc(db, "profiles", user.uid)).then((snap) => {
        setUserRole(snap.data()?.role || "");
      });
    }
    loadTools();
  }, [loadTools]);

  const handleAdd = async () => {
    if (!newName.trim() || !newFunction.trim() || !newUrl.trim()) return;
    setSaving(true);
    const url = newUrl.trim().startsWith("http")
      ? newUrl.trim()
      : `https://${newUrl.trim()}`;

    await addDoc(collection(db, "toolsLibrary"), {
      name: newName.trim(),
      toolFunction: newFunction.trim(),
      type: newType,
      url,
      addedBy: currentUserId,
      validated: true,
      createdAt: serverTimestamp(),
    });

    setNewName("");
    setNewFunction("");
    setNewType("Site");
    setNewUrl("");
    setSaving(false);
    setDialogOpen(false);
    loadTools();
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "toolsLibrary", id));
    loadTools();
  };

  const filtered = tools.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.toolFunction.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "Todos" || t.type === filterType;
    return matchSearch && matchType;
  });

  const allTypes = ["Todos", ...TOOL_TYPES];

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-2xl bg-surface-low border border-surface-mid flex items-center justify-center hover:bg-surface-mid transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Biblioteca de Ferramentas</h1>
          <p className="text-xs text-muted-foreground">Ferramentas validadas pela equipe SalsaHub</p>
        </div>
        {canAdd && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-background rounded-2xl font-semibold gap-1">
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-surface-low border-surface-mid rounded-3xl mx-4 max-w-sm">
              <DialogHeader>
                <DialogTitle>Nova Ferramenta</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nome</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Figma, ChatGPT..."
                    className="bg-surface-mid border-surface-high rounded-2xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Função</Label>
                  <Input
                    value={newFunction}
                    onChange={(e) => setNewFunction(e.target.value)}
                    placeholder="Ex: Design de interfaces"
                    className="bg-surface-mid border-surface-high rounded-2xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Tipo</Label>
                  <div className="flex flex-wrap gap-2">
                    {TOOL_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setNewType(t)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          newType === t
                            ? "bg-primary text-background"
                            : "bg-surface-mid text-muted-foreground hover:bg-surface-high"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Link / URL</Label>
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-surface-mid border-surface-high rounded-2xl"
                    inputMode="url"
                  />
                </div>
                <Button
                  onClick={handleAdd}
                  disabled={saving || !newName || !newFunction || !newUrl}
                  className="w-full bg-primary text-background rounded-2xl font-semibold"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Ferramenta"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ferramenta..."
          className="pl-10 bg-surface-low border-surface-mid rounded-2xl h-11"
        />
      </div>

      {/* Type filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {allTypes.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterType === t
                ? "bg-primary text-background"
                : "bg-surface-low border border-surface-mid text-muted-foreground hover:bg-surface-mid"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-low border border-surface-mid rounded-3xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {tools.length === 0
              ? "Nenhuma ferramenta adicionada ainda."
              : "Nenhuma ferramenta encontrada."}
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-0 bg-surface-mid px-4 py-2.5 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
              <span>Nome</span>
              <span>Função</span>
              <span className="text-center">Tipo</span>
              <span className="text-center">Link</span>
            </div>
            {filtered.map((tool, i) => (
              <div
                key={tool.id}
                className={`grid grid-cols-[1fr_1fr_auto_auto] gap-0 items-center px-4 py-3 ${
                  i !== filtered.length - 1 ? "border-b border-surface-mid" : ""
                } hover:bg-surface-mid/40 transition-colors group`}
              >
                <span className="text-sm font-medium text-foreground truncate pr-2">{tool.name}</span>
                <span className="text-xs text-muted-foreground truncate pr-2">{tool.toolFunction}</span>
                <Badge
                  variant="outline"
                  className="text-xs border-surface-high text-muted-foreground rounded-full mx-auto w-fit"
                >
                  {tool.type}
                </Badge>
                <div className="flex items-center gap-1 pl-2">
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-xl bg-surface-mid hover:bg-primary/20 flex items-center justify-center transition-colors"
                    title="Acessar ferramenta"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  </a>
                  {canAdd && (
                    <button
                      onClick={() => handleDelete(tool.id)}
                      className="w-8 h-8 rounded-xl bg-transparent hover:bg-red-500/10 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                      title="Remover ferramenta"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-3">
          {filtered.length} {filtered.length === 1 ? "ferramenta" : "ferramentas"} encontradas
        </p>
      )}
    </div>
  );
}
