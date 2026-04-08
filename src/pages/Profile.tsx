import { useState, useEffect, useRef } from "react";
import { ArrowLeft, User, Mail, Phone, Save, LogOut, Bell, Moon, Globe, Lock, ChevronRight, Shield, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "@/integrations/firebase/client";
import { signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "profiles", uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setName(d.name ?? currentUser?.displayName ?? "");
        setPhone(d.phone ?? "");
        setRole(d.role ?? "");
        setCompany(d.company ?? "");
        if (d.avatarUrl) setAvatarUrl(d.avatarUrl);
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
