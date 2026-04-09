import { useState, useEffect, useRef } from "react";
import { ArrowLeft, User, Mail, Phone, Save, LogOut, Bell, Moon, Globe, Lock, ChevronRight, Shield, Camera, Package, ArchiveRestore, Trash2, ChevronDown, Building, Hash, MapPin, Link2, Copy, Check, Key, Plus, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "@/integrations/firebase/client";
import { signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc, deleteDoc, setDoc, addDoc, getDocs, collection, query, where, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";

const ROLE_COLOR: Record<string, string> = {
  CEO: "bg-primary/20 text-primary",
  CFO: "bg-primary/20 text-primary",
  CMO: "bg-primary/20 text-primary",
  COO: "bg-primary/20 text-primary",
  Gerente: "bg-purple-500/20 text-purple-400",
  Coordenador: "bg-purple-500/20 text-purple-400",
};

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = auth.currentUser;
  const uid = currentUser?.uid ?? "";
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(currentUser?.displayName ?? "");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.photoURL ?? "");
  const [avatarProgress, setAvatarProgress] = useState<number | null>(null);

  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: true,
    twoFactor: false,
  });

  // CEO company data
  const [companyName, setCompanyName] = useState("");
  const [companyCNPJ, setCompanyCNPJ] = useState("");
  const [companyCategory, setCompanyCategory] = useState("");
  const [companySite, setCompanySite] = useState("");
  const [companyPhone2, setCompanyPhone2] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companySaving, setCompanySaving] = useState(false);

  // CEO linkCode generator
  interface OwnedProduct { id: string; name: string; }
  const [ownedProducts, setOwnedProducts] = useState<OwnedProduct[]>([]);
  const [linkCodeDialogOpen, setLinkCodeDialogOpen] = useState(false);
  const [linkCodeProduct, setLinkCodeProduct] = useState("");
  const [linkCodeMaxUses, setLinkCodeMaxUses] = useState(1);
  const [generatedLinkCode, setGeneratedLinkCode] = useState<string | null>(null);
  const [linkCodeSaving, setLinkCodeSaving] = useState(false);
  const [linkCodeCopied, setLinkCodeCopied] = useState(false);

  // Archived products
  interface ArchivedProduct { id: string; name: string; type: string; status: string; }
  const [archivedProducts, setArchivedProducts] = useState<ArchivedProduct[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "users", uid, "products"),
      where("archived", "==", true),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, snap => {
      setArchivedProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as ArchivedProduct)));
    });
    return unsub;
  }, [uid]);

  const handleUnarchive = async (productId: string) => {
    await updateDoc(doc(db, "users", uid, "products", productId), { archived: false });
    toast({ title: "Produto desarquivado!", description: "Agora visível na lista de produtos." });
  };

  const handleDeleteArchivedProduct = async (productId: string) => {
    setDeletingId(productId);
    await deleteDoc(doc(db, "users", uid, "products", productId));
    setDeletingId(null);
  };

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "profiles", uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        const loadedRole = d.role ?? "";
        setName(d.name ?? currentUser?.displayName ?? "");
        setPhone(d.phone ?? "");
        setRole(loadedRole);
        setCompany(d.company ?? "");
        if (d.avatarUrl) setAvatarUrl(d.avatarUrl);

        // CEO: load company doc + owned products
        if (loadedRole === "CEO") {
          getDoc(doc(db, "users", uid, "company", "profile")).then(cSnap => {
            if (cSnap.exists()) {
              const c = cSnap.data();
              setCompanyName(c.name ?? "");
              setCompanyCNPJ(c.cnpj ?? "");
              setCompanyCategory(c.category ?? "");
              setCompanySite(c.site ?? "");
              setCompanyPhone2(c.phone ?? "");
              setCompanyAddress(c.address ?? "");
            }
          });
          getDocs(query(collection(db, "users", uid, "products"), where("archived", "==", false))).then(snap => {
            setOwnedProducts(snap.docs.map(d => ({ id: d.id, name: d.data().name ?? d.id })));
          }).catch(() => {
            getDocs(collection(db, "users", uid, "products")).then(snap => {
              setOwnedProducts(snap.docs.filter(d => !d.data().archived).map(d => ({ id: d.id, name: d.data().name ?? d.id })));
            });
          });
        }
      }
    });
  }, [uid]);

  const handleSave = async () => {
    if (!uid) return;
    setSaving(true);
    const username = name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._]/g, "");
    await updateDoc(doc(db, "profiles", uid), {
      name: name.trim(),
      username,
      phone: phone.trim(),
    });
    setSaving(false);
    toast({ title: "Perfil atualizado!", description: "Suas informações foram salvas." });
  };

  const handleAvatarChange = (files: FileList | null) => {
    if (!files || files.length === 0 || !uid) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Selecione uma imagem (JPG, PNG, WebP).", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O avatar deve ter no máximo 5MB.", variant: "destructive" });
      return;
    }

    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageRef = ref(storage, `avatars/${uid}/${Date.now()}_${sanitized}`);
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
    setAvatarProgress(0);

    task.on(
      "state_changed",
      snap => setAvatarProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => {
        setAvatarProgress(null);
        toast({ title: "Erro no upload", description: "Tente novamente.", variant: "destructive" });
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setAvatarUrl(url);
        setAvatarProgress(null);
        // Save to Firestore profile and Firebase Auth
        await Promise.all([
          updateDoc(doc(db, "profiles", uid), { avatarUrl: url }),
          updateProfile(currentUser!, { photoURL: url }),
        ]);
        toast({ title: "Avatar atualizado!", description: "Nova foto de perfil salva." });
        if (avatarInputRef.current) avatarInputRef.current.value = "";
      },
    );
  };

  const handleSaveCompany = async () => {
    if (!uid) return;
    setCompanySaving(true);
    await setDoc(doc(db, "users", uid, "company", "profile"), {
      name: companyName.trim(),
      cnpj: companyCNPJ.trim(),
      category: companyCategory.trim(),
      site: companySite.trim(),
      phone: companyPhone2.trim(),
      address: companyAddress.trim(),
      updatedAt: serverTimestamp(),
    });
    setCompanySaving(false);
    toast({ title: "Empresa atualizada!", description: "Perfil da empresa salvo." });
  };

  const handleGenerateLinkCode = async () => {
    if (!linkCodeProduct || linkCodeSaving) return;
    setLinkCodeSaving(true);
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";
    for (let i = 0; i < 8; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    const code = `LINK-${suffix}`;
    await addDoc(collection(db, "linkCodes"), {
      code,
      productId: linkCodeProduct,
      ownerUid: uid,
      maxUses: linkCodeMaxUses,
      usedCount: 0,
      active: true,
      createdAt: serverTimestamp(),
    });
    setGeneratedLinkCode(code);
    setLinkCodeSaving(false);
  };

  const handleCopyLinkCode = () => {
    if (!generatedLinkCode) return;
    navigator.clipboard.writeText(generatedLinkCode).catch(() => {});
    setLinkCodeCopied(true);
    setTimeout(() => setLinkCodeCopied(false), 2000);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/auth", { replace: true });
  };

  const settingsSections = [
    {
      title: "Preferências",
      items: [
        { icon: Bell, label: "Notificações", description: "Receber alertas de tarefas e mensagens", type: "toggle", key: "notifications" },
        { icon: Moon, label: "Modo Escuro", description: "Interface com fundo escuro", type: "toggle", key: "darkMode" },
        { icon: Globe, label: "Idioma", description: "Português", type: "nav", key: "language" },
      ],
    },
    {
      title: "Segurança",
      items: [
        { icon: Lock, label: "Alterar Senha", description: "Login via Google OAuth — sem senha", type: "nav", key: "password" },
        { icon: Shield, label: "Autenticação em 2 Fatores", description: settings.twoFactor ? "Ativado" : "Desativado", type: "toggle", key: "twoFactor" },
      ],
    },
  ];

  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const roleColor = ROLE_COLOR[role] ?? "bg-blue-500/20 text-blue-400";

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-mid transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground font-sans">Meu Perfil</h1>
        </div>

        <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid mb-4">
          <div className="flex items-center gap-4 mb-6">

            {/* Avatar com botão de upload */}
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl font-bold">
                  {initials}
                </div>
              )}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarProgress !== null}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-background flex items-center justify-center shadow-md hover:bg-primary/80 transition-colors disabled:opacity-50"
                title="Alterar foto"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleAvatarChange(e.target.files)}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground">{name}</h2>
              {role && <Badge className={"text-xs mt-1 " + roleColor}>{role}</Badge>}
              {company && <p className="text-xs text-muted-foreground mt-1">{company}</p>}
              {avatarProgress !== null && (
                <div className="mt-2 space-y-1">
                  <Progress value={avatarProgress} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground">Enviando avatar... {avatarProgress}%</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Nome completo
              </label>
              <Input value={name} onChange={e => setName(e.target.value)} className="bg-surface-mid border-0 rounded-2xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </label>
              <Input value={currentUser?.email ?? ""} readOnly className="bg-surface-mid border-0 rounded-2xl text-sm opacity-60 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Telefone
              </label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-surface-mid border-0 rounded-2xl text-sm" type="tel" placeholder="+55 11 99999-0000" />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full mt-4 rounded-2xl bg-primary hover:bg-primary/80 text-background">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>

        {/* CEO: Perfil da Empresa */}
        {role === "CEO" && (
          <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid mb-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Perfil da Empresa</h3>
              </div>
              <button
                onClick={() => { setLinkCodeDialogOpen(p => !p); setGeneratedLinkCode(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
              >
                <Key className="w-3.5 h-3.5" />Novo Código
              </button>
            </div>

            {/* LinkCode generator panel */}
            {linkCodeDialogOpen && (
              <div className="mb-5 p-4 rounded-2xl border border-surface-high bg-surface-mid/50 space-y-3">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-primary" />Gerar Código de Vinculação
                </p>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Produto</label>
                  <select value={linkCodeProduct} onChange={e => { setLinkCodeProduct(e.target.value); setGeneratedLinkCode(null); }}
                    className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                    <option value="">Selecionar produto...</option>
                    {ownedProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Usos máximos</label>
                  <input type="number" min={1} max={50} value={linkCodeMaxUses}
                    onChange={e => setLinkCodeMaxUses(Number(e.target.value))}
                    className="w-full bg-surface-mid rounded-xl p-2 text-foreground text-sm border-0 outline-none focus:ring-1 focus:ring-primary/40" />
                </div>
                {generatedLinkCode ? (
                  <div className="space-y-2">
                    <div className="bg-surface-mid rounded-xl p-3 text-center border border-primary/30">
                      <code className="text-base font-mono font-bold text-primary tracking-widest">{generatedLinkCode}</code>
                    </div>
                    <button onClick={handleCopyLinkCode}
                      className={"w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors " +
                        (linkCodeCopied ? "bg-green-500/20 text-green-400" : "bg-surface-high hover:bg-surface-mid text-foreground")}>
                      {linkCodeCopied ? <><Check className="w-3.5 h-3.5" />Copiado!</> : <><Copy className="w-3.5 h-3.5" />Copiar Código</>}
                    </button>
                    <button onClick={() => { setGeneratedLinkCode(null); setLinkCodeProduct(""); }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                      <Plus className="w-3 h-3" />Gerar outro
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateLinkCode}
                    disabled={!linkCodeProduct || linkCodeSaving}
                    className="w-full py-2 rounded-xl bg-primary hover:bg-primary/80 text-background text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {linkCodeSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gerar Código"}
                  </button>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" /> Nome da Empresa
                  </label>
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                    placeholder="Ex: SalsaHub Ltda." className="w-full bg-surface-mid border-0 rounded-2xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" /> CNPJ
                  </label>
                  <input value={companyCNPJ} onChange={e => setCompanyCNPJ(e.target.value)}
                    placeholder="00.000.000/0000-00" className="w-full bg-surface-mid border-0 rounded-2xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Categoria</label>
                  <input value={companyCategory} onChange={e => setCompanyCategory(e.target.value)}
                    placeholder="Ex: SaaS, E-commerce, Educação..." className="w-full bg-surface-mid border-0 rounded-2xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Site
                  </label>
                  <input value={companySite} onChange={e => setCompanySite(e.target.value)}
                    placeholder="https://suaempresa.com.br" className="w-full bg-surface-mid border-0 rounded-2xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Telefone Comercial
                  </label>
                  <input value={companyPhone2} onChange={e => setCompanyPhone2(e.target.value)}
                    placeholder="+55 11 3000-0000" className="w-full bg-surface-mid border-0 rounded-2xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Endereço
                  </label>
                  <input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)}
                    placeholder="Rua, Cidade, Estado" className="w-full bg-surface-mid border-0 rounded-2xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40" />
                </div>
              </div>
              <Button onClick={handleSaveCompany} disabled={companySaving} className="w-full rounded-2xl bg-primary hover:bg-primary/80 text-background">
                <Save className="w-4 h-4 mr-2" />
                {companySaving ? "Salvando..." : "Salvar Empresa"}
              </Button>
            </div>
          </div>
        )}

        {settingsSections.map(section => (
          <div key={section.title} className="bg-surface-low rounded-3xl border border-surface-mid mb-4 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{section.title}</p>
            </div>
            <div>
              {section.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className={"flex items-center gap-3 px-5 py-3.5 hover:bg-surface-mid transition-colors cursor-pointer " + (idx < section.items.length - 1 ? "border-b border-surface-mid" : "")}
                  >
                    <div className="w-8 h-8 rounded-xl bg-surface-mid flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    {item.type === "toggle" ? (
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                        className={"w-11 h-6 rounded-full transition-colors flex-shrink-0 relative " + (settings[item.key as keyof typeof settings] ? "bg-primary" : "bg-surface-high")}
                      >
                        <span className={"absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all " + (settings[item.key as keyof typeof settings] ? "left-5" : "left-0.5")} />
                      </button>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Archived Products */}
        <div className="bg-surface-low rounded-3xl border border-surface-mid mb-4 overflow-hidden">
          <button
            onClick={() => setShowArchived(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-mid transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface-mid flex items-center justify-center">
                <Package className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Produtos Arquivados</p>
                <p className="text-xs text-muted-foreground">{archivedProducts.length} produto{archivedProducts.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <ChevronDown className={"w-4 h-4 text-muted-foreground transition-transform " + (showArchived ? "rotate-180" : "")} />
          </button>
          {showArchived && (
            <div className="border-t border-surface-mid">
              {archivedProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum produto arquivado.</p>
              ) : (
                archivedProducts.map((p, idx) => (
                  <div
                    key={p.id}
                    className={"flex items-center gap-3 px-5 py-3.5 " + (idx < archivedProducts.length - 1 ? "border-b border-surface-mid" : "")}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.type} · {p.status}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleUnarchive(p.id)}
                        title="Desarquivar"
                        className="w-8 h-8 rounded-xl bg-surface-mid hover:bg-primary/20 flex items-center justify-center transition-colors"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5 text-primary" />
                      </button>
                      <button
                        onClick={() => handleDeleteArchivedProduct(p.id)}
                        title="Apagar permanentemente"
                        disabled={deletingId === p.id}
                        className="w-8 h-8 rounded-xl bg-surface-mid hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-3xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sair da Conta</span>
        </button>
      </div>
    </div>
  );
}
