import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: integrate with Supabase auth
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src="/parsley.png" alt="Salsa Hub" className="w-14 h-14 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Salsa Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? "Entre na sua conta" : "Crie sua conta"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-surface-low border-0 rounded-xl mt-1"
                placeholder="Seu nome"
              />
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-surface-low border-0 rounded-xl mt-1"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-surface-low border-0 rounded-xl mt-1"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full rounded-full">
            {isLogin ? "Entrar" : "Criar Conta"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline font-medium">
            {isLogin ? "Cadastre-se" : "Entrar"}
          </button>
        </p>
      </div>
    </div>
  );
}
