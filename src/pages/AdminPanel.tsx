import { useState, useEffect } from "react";
import {
  Shield, Building2, Users, Plus, Trash2, Edit2, Check, X, Mail,
  Key, Copy, RefreshCw, Lock, Eye, EyeOff, ArrowLeft, ToggleLeft, ToggleRight,
  UserCheck, AlertTriangle, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth, db } from "@/integrations/firebase/client";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, getDocs, getDoc, setDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { writeAuditLog } from "@/lib/auditLog";

// ── Constants ─────────────────────────────────────────────────────────────────
const ADMIN_EMAILS = ["kirchner.andre@gmail.com", "lucas.xaviercr97@gmail.com"];

// SHA-256 via Web Crypto API (built-in, zero dependencies)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Company { id: string; name: string; plan: string; members: number; createdAt: any; status: "Ativa" | "Inativa"; }
interface UserRequest { id: string; name: string; email: string; company: string; requestedRole: string; status: "Pendente" | "Aprovado" | "Rejeitado"; }
interface AppUser { id: string; name: string; email: string; role: string; createdAt?: any; }
interface RoleCode {
  id: string;
  code: string;
  role: string;
  maxUses: number;
  usedCount: number;
  active: boolean;
  createdAt: any;
  expiresAt?: any;
  note?: string;
}

function isCodeExpired(code: RoleCode): boolean {
  if (!code.expiresAt) return false;
  const d = code.expiresAt.toDate ? code.expiresAt.toDate() : new Date(code.expiresAt);
  return d < new Date();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const allRoles = ["CEO", "CFO", "CMO", "COO", "Gerente", "Coordenador", "Designer", "Analista", "Técnico", "Assistente", "Desenvolvedor", "Estagiário"];

const getRoleBadgeColor = (role: string) => {
  if (["CEO", "CFO", "CMO", "COO"].includes(role)) return "bg-primary/20 text-primary";
  if (["Gerente", "Coordenador"].includes(role)) return "bg-purple-500/20 text-purple-400";
  if (["Designer", "Desenvolvedor"].includes(role)) return "bg-blue-500/20 text-blue-400";
  return "bg-gray-500/20 text-gray-400";
};

function generateCode(role: string): string {
  const prefix = role.slice(0, 3).toUpperCase();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${suffix}`;
}

// ── PIN Lock Screen ───────────────────────────────────────────────────────────
// PINs são armazenados como hashes SHA-256 em Firestore (adminConfig/pins),
// coleção somente legível por app owners. Nenhum PIN em plaintext no código.
function PinLockScreen({ onUnlock, userEmail }: { onUnlock: () => void; userEmail: string }) {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [pinState, setPinState] = useState<"loading" | "setup" | "verify" | "denied">("loading");
  const [storedHash, setStoredHash] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [setupError, setSetupError] = useState("");
  const [settingUp, setSettingUp] = useState(false);

  // Carrega o hash do PIN do Firestore ao montar
  useEffect(() => {
    getDoc(doc(db, "adminConfig", "pins"))
      .then(snap => {
        if (snap.exists()) {
          const hash = snap.data()?.[userEmail];
          if (hash) {
            setStoredHash(hash);
            setPinState("verify");
          } else {
            setPinState("setup"); // Admin existe mas ainda não definiu PIN
          }
        } else {
          setPinState("setup"); // Primeiro acesso - documento não criado ainda
        }
      })
      .catch(() => setPinState("denied")); // Permissão negada = não é admin
  }, [userEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storedHash || !pin.trim()) return;
    const inputHash = await hashPin(pin.trim());
    if (inputHash === storedHash) {
      onUnlock();
    } else {
      setError(true);
      setShaking(true);
      setPin("");
      setTimeout(() => setShaking(false), 500);
    }
  };

  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError("");
    if (newPin.length < 4) { setSetupError("PIN deve ter ao menos 4 caracteres."); return; }
    if (newPin !== confirmPin) { setSetupError("Os PINs não coincidem."); return; }
    setSettingUp(true);
    try {
      const hash = await hashPin(newPin);
      // Preserva hashes de outros admins no mesmo documento
      const existing = await getDoc(doc(db, "adminConfig", "pins"));
      const currentData = existing.exists() ? existing.data() : {};
      await setDoc(doc(db, "adminConfig", "pins"), { ...currentData, [userEmail]: hash });
      setStoredHash(hash);
      setPinState("verify");
      setNewPin(""); setConfirmPin("");
    } catch {
      setSetupError("Erro ao salvar PIN. Verifique sua conexão e tente novamente.");
    } finally {
      setSettingUp(false);
    }
  };

  const shakeClass = shaking ? "animate-[shake_0.4s_ease-in-out]" : "";

  // ── Estados de carregamento e negação ──
  if (pinState === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (pinState === "denied") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <AlertTriangle className="w-9 h-9 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
        <p className="text-sm text-muted-foreground mb-6">Sua conta não tem permissão para acessar esta área.</p>
        <Button onClick={() => navigate(-1)} className="rounded-2xl">Voltar</Button>
      </div>
    );
  }

  // ── Setup do PIN (primeiro acesso ou redefinição) ──
  if (pinState === "setup") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 rounded-xl hover:bg-surface-mid transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Key className="w-9 h-9 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground text-center mb-2 font-sans">Criar PIN de Acesso</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Defina um PIN seguro. Ele será armazenado criptografado — nem o servidor conhece o valor.
          </p>
          <form onSubmit={handleSetupPin} className="space-y-4">
            {setupError && (
              <p className="text-sm text-red-400 text-center flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />{setupError}
              </p>
            )}
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={newPin}
                onChange={e => { setNewPin(e.target.value); setSetupError(""); }}
                placeholder="Novo PIN (mín. 4 caracteres)..."
                className="bg-surface-mid border-0 rounded-2xl text-base py-4 pr-12 text-center tracking-widest"
                autoFocus autoComplete="new-password"
              />
              <button type="button" onClick={() => setShow(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Input
              type={show ? "text" : "password"}
              value={confirmPin}
              onChange={e => { setConfirmPin(e.target.value); setSetupError(""); }}
              placeholder="Confirmar PIN..."
              className="bg-surface-mid border-0 rounded-2xl text-base py-4 text-center tracking-widest"
              autoComplete="new-password"
            />
            <Button type="submit" disabled={!newPin.trim() || !confirmPin.trim() || settingUp}
              className="w-full rounded-2xl bg-primary hover:bg-primary/80 text-background py-3 text-base font-semibold">
              {settingUp ? "Salvando..." : <><Shield className="w-4 h-4 mr-2" />Criar PIN</>}
            </Button>
          </form>
        </div>
        <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-8px)}80%{transform:translateX(4px)}}`}</style>
      </div>
    );
  }

  // ── Verificação do PIN (fluxo normal) ──
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 rounded-xl hover:bg-surface-mid transition-colors">
        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
      </button>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Lock className="w-9 h-9 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground text-center mb-2 font-sans">Área Administrativa</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Digite o PIN para acessar o painel de controle
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={`relative transition-all ${shakeClass}`}>
            <Input
              type={show ? "text" : "password"}
              value={pin}
              onChange={e => { setPin(e.target.value); setError(false); }}
              placeholder="Digite o PIN..."
              className={`bg-surface-mid border-0 rounded-2xl text-base py-4 pr-12 text-center tracking-widest ${error ? "ring-2 ring-red-500/50" : ""}`}
              autoFocus autoComplete="off"
            />
            <button type="button" onClick={() => setShow(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-400 text-center flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />PIN incorreto. Tente novamente.
            </p>
          )}
          <Button type="submit" disabled={!pin.trim()}
            className="w-full rounded-2xl bg-primary hover:bg-primary/80 text-background py-3 text-base font-semibold">
            <Shield className="w-4 h-4 mr-2" />Acessar Painel
          </Button>
          <button type="button"
            onClick={() => { setPinState("setup"); setPin(""); setError(false); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground text-center mt-2 transition-colors">
            Esqueci o PIN / Redefinir
          </button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-6 opacity-50">
          Acesso restrito ao administrador do sistema
        </p>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-8px)}80%{transform:translateX(4px)}}`}</style>
    </div>
  );
}

// ── Role Code Card ─────────────────────────────────────────────────────────────
function RoleCodeCard({ code, onDelete, onToggle, onCopy }: {
  code: RoleCode;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  onCopy: (code: string) => void;
}) {
  return (
    <div className={`bg-surface-low rounded-2xl p-4 border transition-colors ${code.active ? "border-surface-mid" : "border-surface-mid opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <code className="text-sm font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg tracking-wider">
              {code.code}
            </code>
            <Badge className={getRoleBadgeColor(code.role)}>{code.role}</Badge>
            <Badge className={code.active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
              {code.active ? "Ativo" : "Inativo"}
            </Badge>
            {isCodeExpired(code) && (
              <Badge className="bg-red-500/20 text-red-400">Expirado</Badge>
            )}
          </div>
          {code.note && <p className="text-xs text-muted-foreground mb-2">{code.note}</p>}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              {code.usedCount}/{code.maxUses === 0 ? "∞" : code.maxUses} usos
            </span>
            {code.expiresAt && (() => {
              const d = code.expiresAt.toDate ? code.expiresAt.toDate() : new Date(code.expiresAt);
              return <span>Expira: {d.toLocaleDateString("pt-BR")}</span>;
            })()}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onCopy(code.code)}
            className="w-8 h-8 rounded-xl bg-surface-mid hover:bg-surface-high flex items-center justify-center transition-colors"
            title="Copiar código"
          >
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => onToggle(code.id, !code.active)}
            className="w-8 h-8 rounded-xl bg-surface-mid hover:bg-surface-high flex items-center justify-center transition-colors"
            title={code.active ? "Desativar" : "Ativar"}
          >
            {code.active
              ? <ToggleRight className="w-4 h-4 text-primary" />
              : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button
            onClick={() => onDelete(code.id)}
            className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
            title="Excluir código"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const navigate = useNavigate();
  const currentUser = auth.currentUser;
  const uid = currentUser?.uid ?? "";
  const userEmail = currentUser?.email ?? "";

  const [unlocked, setUnlocked] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [roleCodes, setRoleCodes] = useState<RoleCode[]>([]);
  const [newCompany, setNewCompany] = useState({ name: "", plan: "Pro" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // New code form
  const [newCodeRole, setNewCodeRole] = useState("Analista");
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(1);
  const [newCodeNote, setNewCodeNote] = useState("");
  const [newCodeDialogOpen, setNewCodeDialogOpen] = useState(false);

  // If user is not the owner, redirect
  useEffect(() => {
    if (userEmail && !ADMIN_EMAILS.includes(userEmail)) {
      navigate("/", { replace: true });
    }
  }, [userEmail, navigate]);

  // Load data
  useEffect(() => {
    if (!uid || !unlocked) return;

    // Admin-specific collections
    const unsubCompanies = onSnapshot(
      query(collection(db, "admin", uid, "companies"), orderBy("createdAt", "desc")),
      snap => setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company)))
    );
    const unsubRequests = onSnapshot(
      query(collection(db, "admin", uid, "requests"), orderBy("createdAt", "desc")),
      snap => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRequest)))
    );

    // All app users from profiles collection
    const unsubUsers = onSnapshot(
      collection(db, "profiles"),
      snap => setAppUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser)))
    );

    // Role codes (global)
    const unsubCodes = onSnapshot(
      query(collection(db, "roleCodes"), orderBy("createdAt", "desc")),
      snap => setRoleCodes(snap.docs.map(d => ({ id: d.id, ...d.data() } as RoleCode)))
    );

    return () => { unsubCompanies(); unsubRequests(); unsubUsers(); unsubCodes(); };
  }, [uid, unlocked]);

  if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) return null;
  if (!unlocked) return <PinLockScreen onUnlock={() => setUnlocked(true)} userEmail={userEmail} />;

  const pendingCount = requests.filter(r => r.status === "Pendente").length;
  const activeCodesCount = roleCodes.filter(c => c.active).length;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    const req = requests.find(r => r.id === id);
    await updateDoc(doc(db, "admin", uid, "requests", id), { status: "Aprovado" });
    await writeAuditLog("user.approve", id, { requestedRole: req?.requestedRole, email: req?.email });
  };
  const handleReject = async (id: string) => {
    const req = requests.find(r => r.id === id);
    await updateDoc(doc(db, "admin", uid, "requests", id), { status: "Rejeitado" });
    await writeAuditLog("user.reject", id, { email: req?.email });
  };

  const handleCreateCompany = async () => {
    if (!newCompany.name.trim()) return;
    setSaving(true);
    await addDoc(collection(db, "admin", uid, "companies"), {
      name: newCompany.name.trim(), plan: newCompany.plan,
      members: 0, status: "Ativa", createdAt: serverTimestamp(),
    });
    setNewCompany({ name: "", plan: "Pro" });
    setSaving(false);
  };

  const handleCreateCode = async () => {
    if (!newCodeRole) return;
    setSaving(true);
    const code = generateCode(newCodeRole);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // expira em 7 dias
    const ref = await addDoc(collection(db, "roleCodes"), {
      code,
      role: newCodeRole,
      maxUses: newCodeMaxUses,
      usedCount: 0,
      active: true,
      note: newCodeNote.trim(),
      createdBy: uid,
      createdAt: serverTimestamp(),
      expiresAt,
    });
    await writeAuditLog("code.create", ref.id, { code, role: newCodeRole, maxUses: newCodeMaxUses });
    setNewCodeRole("Analista");
    setNewCodeMaxUses(1);
    setNewCodeNote("");
    setNewCodeDialogOpen(false);
    setSaving(false);
  };

  const handleDeleteCode = async (id: string) => {
    const c = roleCodes.find(rc => rc.id === id);
    await deleteDoc(doc(db, "roleCodes", id));
    await writeAuditLog("code.delete", id, { code: c?.code, role: c?.role });
  };

  const handleToggleCode = async (id: string, active: boolean) => {
    await updateDoc(doc(db, "roleCodes", id), { active });
    await writeAuditLog("code.toggle", id, { active });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDeleteUser = async (userId: string) => {
    const u = appUsers.find(u => u.id === userId);
    await updateDoc(doc(db, "profiles", userId), { status: "inactive" });
    await writeAuditLog("user.deactivate", userId, { name: u?.name, email: u?.email, role: u?.role });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-surface-mid transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-sans">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">Gerencie usuários, cargos e o sistema</p>
          </div>
          <div className="ml-auto">
            <Badge className="bg-green-500/20 text-green-400 text-xs flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Admin ativo
            </Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Empresas", value: companies.length, icon: Building2 },
            { label: "Usuários", value: appUsers.length, icon: Users },
            { label: "Solicitações", value: pendingCount, highlight: pendingCount > 0, icon: Mail },
            { label: "Códigos Ativos", value: activeCodesCount, icon: Key },
          ].map(s => (
            <div key={s.label} className="bg-surface-low rounded-3xl p-4 border border-surface-mid">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={"text-2xl font-bold " + (s.highlight ? "text-red-400" : "text-foreground")}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="codes" className="w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            <TabsList asChild>
              <div className="contents">
                {[
                  { value: "codes",     label: "Códigos de Cargo", icon: Key,       badge: activeCodesCount },
                  { value: "users",     label: "Usuários",         icon: Users,     badge: appUsers.length },
                  { value: "requests",  label: "Solicitações",     icon: Mail,      badge: pendingCount },
                  { value: "companies", label: "Empresas",         icon: Building2, badge: 0 },
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="bg-surface-low border border-surface-mid rounded-2xl py-3 data-[state=active]:bg-primary data-[state=active]:text-background data-[state=active]:border-primary flex items-center gap-2 justify-center"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium hidden md:inline">{tab.label}</span>
                      {tab.badge > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">{tab.badge}</span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </div>
            </TabsList>
          </div>

          {/* ── CÓDIGOS DE CARGO ── */}
          <TabsContent value="codes" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-foreground">Códigos de Cargo</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Crie códigos para liberar novos usuários com cargos específicos</p>
              </div>
              <Dialog open={newCodeDialogOpen} onOpenChange={setNewCodeDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
                    <Plus className="w-4 h-4 mr-2" />Novo Código
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-surface-low border-surface-mid">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-primary" />
                      Criar Código de Cargo
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Cargo</label>
                      <select
                        value={newCodeRole}
                        onChange={e => setNewCodeRole(e.target.value)}
                        className="w-full bg-surface-mid border-0 rounded-xl p-2.5 text-foreground text-sm"
                      >
                        {allRoles.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Máximo de usos (0 = ilimitado)</label>
                      <Input
                        type="number"
                        min={0}
                        value={newCodeMaxUses}
                        onChange={e => setNewCodeMaxUses(Number(e.target.value))}
                        className="bg-surface-mid border-0 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Nota (opcional)</label>
                      <Input
                        placeholder="Ex: para novo designer da equipe..."
                        value={newCodeNote}
                        onChange={e => setNewCodeNote(e.target.value)}
                        className="bg-surface-mid border-0 rounded-xl text-sm"
                      />
                    </div>
                    <div className="bg-surface-mid rounded-2xl p-3 border border-surface-high">
                      <p className="text-xs text-muted-foreground mb-1">Pré-visualização do código:</p>
                      <code className="text-sm font-mono font-bold text-primary tracking-widest">
                        {generateCode(newCodeRole)}
                      </code>
                      <p className="text-[10px] text-muted-foreground mt-0.5">(código gerado automaticamente ao criar)</p>
                    </div>
                    <Button
                      className="w-full rounded-xl bg-primary hover:bg-primary/80"
                      onClick={handleCreateCode}
                      disabled={saving}
                    >
                      {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
                      Gerar Código
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Copied toast */}
            {copied && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                <Check className="w-4 h-4" />
                Código <code className="font-mono font-bold">{copied}</code> copiado!
              </div>
            )}

            {roleCodes.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Key className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum código criado ainda.</p>
                <p className="text-xs mt-1">Crie códigos para liberar novos usuários.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Active codes */}
                {roleCodes.filter(c => c.active).length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ativos</p>
                    {roleCodes.filter(c => c.active).map(code => (
                      <RoleCodeCard
                        key={code.id}
                        code={code}
                        onDelete={handleDeleteCode}
                        onToggle={handleToggleCode}
                        onCopy={handleCopyCode}
                      />
                    ))}
                  </>
                )}
                {/* Inactive codes */}
                {roleCodes.filter(c => !c.active).length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4">Inativos</p>
                    {roleCodes.filter(c => !c.active).map(code => (
                      <RoleCodeCard
                        key={code.id}
                        code={code}
                        onDelete={handleDeleteCode}
                        onToggle={handleToggleCode}
                        onCopy={handleCopyCode}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── USUÁRIOS ── */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Todos os Usuários do App</h3>
              <Badge className="bg-surface-mid text-muted-foreground">{appUsers.length} usuários</Badge>
            </div>
            {appUsers.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum usuário cadastrado ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appUsers.map(user => (
                  <div key={user.id} className="bg-surface-low rounded-2xl p-4 border border-surface-mid group hover:bg-surface-mid transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-xs flex-shrink-0">
                          {(user.name ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm">{user.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email ?? "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={"text-xs " + getRoleBadgeColor(user.role ?? "")}>{user.role ?? "Sem cargo"}</Badge>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-all"
                          title="Remover usuário"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── SOLICITAÇÕES ── */}
          <TabsContent value="requests" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Solicitações via Email</h3>
              <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">{pendingCount} pendentes</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Cargos C-Level (CEO, CFO, CMO, COO) são aprovados exclusivamente pelo administrador.</p>
            {requests.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma solicitação pendente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(req => (
                  <div key={req.id} className="bg-surface-low rounded-2xl p-4 border border-surface-mid">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-medium text-foreground text-sm">{req.name}</p>
                          <Badge className="bg-primary/20 text-primary text-xs">{req.requestedRole}</Badge>
                          <Badge className={"text-xs " + (req.status === "Pendente" ? "bg-yellow-500/20 text-yellow-400" : req.status === "Aprovado" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                            {req.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{req.email} — {req.company}</p>
                      </div>
                      {req.status === "Pendente" && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="icon" className="h-8 w-8 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400" onClick={() => handleApprove(req.id)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" className="h-8 w-8 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400" onClick={() => handleReject(req.id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── EMPRESAS ── */}
          <TabsContent value="companies" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Empresas Cadastradas</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
                    <Plus className="w-4 h-4 mr-2" />Nova Empresa
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-surface-low border-surface-mid">
                  <DialogHeader><DialogTitle>Criar Empresa</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Nome da empresa" value={newCompany.name} onChange={e => setNewCompany(p => ({ ...p, name: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
                    <select value={newCompany.plan} onChange={e => setNewCompany(p => ({ ...p, plan: e.target.value }))} className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                      <option>Basic</option><option>Pro</option><option>Enterprise</option>
                    </select>
                    <Button className="w-full rounded-xl bg-primary hover:bg-primary/80" onClick={handleCreateCompany} disabled={saving || !newCompany.name.trim()}>
                      {saving ? "Criando..." : "Criar Empresa"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {companies.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma empresa cadastrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {companies.map(company => (
                  <div key={company.id} className="bg-surface-low rounded-2xl p-4 border border-surface-mid hover:bg-surface-mid transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.members} membros — Plano {company.plan}</p>
                        </div>
                      </div>
                      <Badge className={"text-xs " + (company.status === "Ativa" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400")}>
                        {company.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
