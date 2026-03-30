import { useState } from "react";
import { User, Mail, Phone, Briefcase, Save, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function Profile() {
  const [profile, setProfile] = useState({
    name: "Admin Salsa",
    email: "admin@salsahub.com",
    phone: "+55 11 99999-0000",
    role: "Gerente de Projetos",
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <h1 className="text-2xl font-bold">Meu Perfil</h1>

      <div className="bg-surface-low rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <span className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl font-bold">
            {profile.name.split(" ").map(n => n[0]).join("")}
          </span>
          <div>
            <h2 className="text-xl font-bold">{profile.name}</h2>
            <p className="text-sm text-muted-foreground">{profile.role}</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <Label className="text-xs text-muted-foreground">Nome Completo</Label>
            <Input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="bg-surface-mid border-0 rounded-xl mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="bg-surface-mid border-0 rounded-xl mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Telefone</Label>
            <Input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="bg-surface-mid border-0 rounded-xl mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cargo</Label>
            <Input
              value={profile.role}
              onChange={(e) => setProfile({ ...profile, role: e.target.value })}
              className="bg-surface-mid border-0 rounded-xl mt-1"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <Button className="rounded-full gap-2 flex-1">
            <Save className="w-4 h-4" /> Salvar Alterações
          </Button>
          <Button variant="ghost" className="rounded-full gap-2 text-destructive hover:text-destructive">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </div>

      {/* Projects */}
      <div className="bg-surface-low rounded-3xl p-6">
        <h2 className="font-semibold mb-4">Projetos Vinculados</h2>
        <div className="space-y-2">
          {["App Salsa Delivery", "Loja Salsa Store", "Curso Marketing Digital"].map(p => (
            <div key={p} className="flex items-center gap-3 bg-surface-mid rounded-xl p-3">
              <Briefcase className="w-4 h-4 text-primary" />
              <span className="text-sm">{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
