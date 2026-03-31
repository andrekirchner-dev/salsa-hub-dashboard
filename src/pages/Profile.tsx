import { useState } from "react";
import { ArrowLeft, User, Mail, Phone, Save, LogOut, Bell, Moon, Globe, Lock, ChevronRight, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: "André Pereira",
    email: "andre@salsahub.com",
    phone: "+55 11 99999-0000",
  });

  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: true,
    language: "Português",
    twoFactor: false,
  });

  const settingsSections = [
    {
      title: "Preferências",
      items: [
        {
          icon: Bell,
          label: "Notificações",
          description: "Receber alertas de tarefas e mensagens",
          type: "toggle",
          key: "notifications",
        },
        {
          icon: Moon,
          label: "Modo Escuro",
          description: "Interface com fundo escuro",
          type: "toggle",
          key: "darkMode",
        },
        {
          icon: Globe,
          label: "Idioma",
          description: settings.language,
          type: "nav",
          key: "language",
        },
      ],
    },
    {
      title: "Segurança",
      items: [
        {
          icon: Lock,
          label: "Alterar Senha",
          description: "Última alteração há 30 dias",
          type: "nav",
          key: "password",
        },
        {
          icon: Shield,
          label: "Autenticação em 2 Fatores",
          description: settings.twoFactor ? "Ativado" : "Desativado",
          type: "toggle",
          key: "twoFactor",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-surface-mid transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground font-sans">Meu Perfil</h1>
        </div>

        <div className="bg-surface-low rounded-3xl p-6 border border-surface-mid mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {profile.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
              <Badge className="bg-primary/20 text-primary text-xs mt-1">Gerente</Badge>
              <p className="text-xs text-muted-foreground mt-1">Salsa Digital</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Nome completo
              </label>
              <Input
                value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                className="bg-surface-mid border-0 rounded-2xl text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Email
              </label>
              <Input
                value={profile.email}
                onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                className="bg-surface-mid border-0 rounded-2xl text-sm"
                type="email"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                Telefone
              </label>
              <Input
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                className="bg-surface-mid border-0 rounded-2xl text-sm"
                type="tel"
              />
            </div>
          </div>

          <Button className="w-full mt-4 rounded-2xl bg-primary hover:bg-primary/80 text-background">
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
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

        <button className="w-full flex items-center justify-center gap-2 p-4 rounded-3xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sair da Conta</span>
        </button>
      </div>
    </div>
  );
}
