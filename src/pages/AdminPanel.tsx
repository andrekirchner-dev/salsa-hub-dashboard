import { useState, useEffect } from "react";
import { Shield, Building2, Users, Plus, Trash2, Edit2, Check, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth, db } from "@/integrations/firebase/client";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp,
} from "firebase/firestore";

interface Company { id: string; name: string; plan: string; members: number; createdAt: any; status: "Ativa" | "Inativa"; }
interface UserRequest { id: string; name: string; email: string; company: string; requestedRole: string; status: "Pendente" | "Aprovado" | "Rejeitado"; }
interface AdminUser { id: string; name: string; email: string; company: string; role: string; status: "Ativo" | "Inativo"; }

const roles = ["CEO", "CFO", "CMO", "COO", "Gerente", "Coordenador", "Analista", "Tecnico", "Assistente"];

const getRoleBadgeColor = (role: string) => {
  if (["CEO", "CFO", "CMO", "COO"].includes(role)) return "bg-primary/20 text-primary";
  if (["Gerente", "Coordenador"].includes(role)) return "bg-purple-500/20 text-purple-400";
  return "bg-blue-500/20 text-blue-400";
};

export default function AdminPanel() {
  const uid = auth.currentUser?.uid ?? "";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newCompany, setNewCompany] = useState({ name: "", plan: "Pro" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uid) return;
    // Companies (global admin collection)
    const unsubCompanies = onSnapshot(
      query(collection(db, "admin", uid, "companies"), orderBy("createdAt", "desc")),
      snap => setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company)))
    );
    const unsubRequests = onSnapshot(
      query(collection(db, "admin", uid, "requests"), orderBy("createdAt", "desc")),
      snap => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRequest)))
    );
    const unsubUsers = onSnapshot(
      query(collection(db, "admin", uid, "users"), orderBy("name", "asc")),
      snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminUser)))
    );
    return () => { unsubCompanies(); unsubRequests(); unsubUsers(); };
  }, [uid]);

  const pendingCount = requests.filter(r => r.status === "Pendente").length;

  const handleApprove = async (id: string) => {
    await updateDoc(doc(db, "admin", uid, "requests", id), { status: "Aprovado" });
  };
  const handleReject = async (id: string) => {
    await updateDoc(doc(db, "admin", uid, "requests", id), { status: "Rejeitado" });
  };

  const handleCreateCompany = async () => {
    if (!newCompany.name.trim()) return;
    setSaving(true);
    await addDoc(collection(db, "admin", uid, "companies"), {
      name: newCompany.name.trim(),
      plan: newCompany.plan,
      members: 0,
      status: "Ativa",
      createdAt: serverTimestamp(),
    });
    setNewCompany({ name: "", plan: "Pro" });
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-sans">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">Gerencie empresas, usuários e cargos</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Empresas", value: companies.length },
            { label: "Usuários", value: users.length },
            { label: "Solicitações", value: pendingCount, highlight: true },
            { label: "Planos Ativos", value: companies.filter(c => c.status === "Ativa").length },
          ].map(s => (
            <div key={s.label} className="bg-surface-low rounded-3xl p-4 border border-surface-mid">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={"text-2xl font-bold " + (s.highlight ? "text-primary" : "text-foreground")}>{s.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="requests" className="w-full">
          <div className="grid grid-cols-3 gap-2 mb-6">
            <TabsList asChild>
              <div className="contents">
                <TabsTrigger value="requests" className="bg-surface-low border border-surface-mid rounded-2xl py-3 data-[state=active]:bg-primary data-[state=active]:text-background data-[state=active]:border-primary flex items-center gap-2 justify-center">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm font-medium">Solicitações</span>
                  {pendingCount > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">{pendingCount}</span>}
                </TabsTrigger>
                <TabsTrigger value="companies" className="bg-surface-low border border-surface-mid rounded-2xl py-3 data-[state=active]:bg-primary data-[state=active]:text-background data-[state=active]:border-primary flex items-center gap-2 justify-center">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Empresas</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="bg-surface-low border border-surface-mid rounded-2xl py-3 data-[state=active]:bg-primary data-[state=active]:text-background data-[state=active]:border-primary flex items-center gap-2 justify-center">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Usuários</span>
                </TabsTrigger>
              </div>
            </TabsList>
          </div>

          <TabsContent value="requests" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Solicitações via Email</h3>
              <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">{pendingCount} pendentes</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Cargos como CEO, CFO, CMO e COO são criados exclusivamente por solicitação via email ao administrador.</p>
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
                          <Badge className={"text-xs " + (req.status === "Pendente" ? "bg-yellow-500/20 text-yellow-400" : req.status === "Aprovado" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>{req.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{req.email} — {req.company}</p>
                      </div>
                      {req.status === "Pendente" && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="icon" className="h-8 w-8 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400" onClick={() => handleApprove(req.id)}><Check className="w-4 h-4" /></Button>
                          <Button size="icon" className="h-8 w-8 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400" onClick={() => handleReject(req.id)}><X className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="companies" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Empresas Cadastradas</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-2xl bg-primary hover:bg-primary/80 text-background"><Plus className="w-4 h-4 mr-2" />Nova Empresa</Button>
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
                        <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5 text-primary" /></div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.members} membros — Plano {company.plan}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <Badge className={"text-xs " + (company.status === "Ativa" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400")}>{company.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <h3 className="font-semibold text-foreground mb-2">Gerenciar Usuários e Cargos</h3>
            <p className="text-xs text-muted-foreground mb-4">Cargos C-Level só podem ser atribuídos após aprovação de solicitação por email.</p>
            {users.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum usuário gerenciado ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map(user => (
                  <div key={user.id} className="bg-surface-low rounded-2xl p-4 border border-surface-mid">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-xs flex-shrink-0">
                          {user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email} — {user.company}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={"text-xs " + getRoleBadgeColor(user.role)}>{user.role}</Badge>
                      </div>
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
