import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User as UserIcon, Phone, Key, LogOut } from "lucide-react";

interface Props {
  user: User;
  onComplete: () => void;
}

export default function SetupProfile({ user, onComplete }: Props) {
  const [name, setName] = useState(user.user_metadata?.full_name || "");
  const [phone, setPhone] = useState("");
  const [cargoCode, setCargoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !cargoCode.trim()) {
      setError("Preencha todos os campos.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Informe um telefone válido.");
      return;
    }

    setLoading(true);
    setError(null);

    const code = cargoCode.trim().toUpperCase();

    const { data: validCode, error: codeError } = await supabase
      .from("cargo_codes")
      .select("role, used")
      .eq("code", code)
      .maybeSingle();

    if (codeError || !validCode) {
      setError("Código de cargo inválido. Solicite um código à equipe ADM.");
      setLoading(false);
      return;
    }

    if (validCode.used) {
      setError("Este código já foi utilizado. Solicite um novo código.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      name: name.trim(),
      phone: phone.trim(),
      cargo_code: code,
      role: validCode.role,
      email: user.email,
      avatar_url: user.user_metadata?.avatar_url || null,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      setError("Erro ao salvar perfil. Tente novamente.");
      setLoading(false);
      return;
    }

    await supabase
      .from("cargo_codes")
      .update({ used: true, used_by: user.id })
      .eq("code", code);

    onComplete();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt={name}
              className="w-16 h-16 mx-auto rounded-full mb-3 border-2 border-primary/40"
            />
          ) : (
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-3 border-2 border-primary/40">
              <UserIcon className="w-8 h-8 text-primary" />
            </div>
          )}
          <h2 className="text-xl font-bold text-foreground">Complete seu perfil</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Olá,{" "}
            <span className="text-primary font-medium">
              {user.user_metadata?.full_name?.split(" ")[0] || ""}
            </span>
            ! Precisamos de mais algumas informações.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-low border border-surface-mid rounded-3xl p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Nome completo
            </Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="pl-10 bg-surface-mid border-surface-high rounded-2xl h-11"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Telefone / WhatsApp
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="pl-10 bg-surface-mid border-surface-high rounded-2xl h-11"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Código do cargo
            </Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={cargoCode}
                onChange={(e) =>
                  setCargoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))
                }
                placeholder="Ex: CEO1-2024"
                maxLength={12}
                className="pl-10 bg-surface-mid border-surface-high rounded-2xl h-11 font-mono tracking-widest uppercase"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Solicite este código à equipe ADM do SalsaHub.
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-background font-semibold rounded-2xl h-12 mt-2 hover:bg-primary/90"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" />
                <span>Verificando...</span>
              </div>
            ) : (
              "Entrar no Dashboard"
            )}
          </Button>
        </form>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <LogOut className="w-4 h-4" />
          Sair e usar outra conta
        </button>
      </div>
    </div>
  );
}
