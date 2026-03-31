import { useState } from "react";
import { Shield, Building2, Users, Plus, Trash2, Edit2, Check, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Company { id: number; name: string; plan: string; members: number; createdAt: string; status: "Ativa" | "Inativa"; }
interface UserRequest { id: number; name: string; email: string; company: string; requestedRole: string; requestedAt: string; status: "Pendente" | "Aprovado" | "Rejeitado"; }
interface AdminUser { id: number; name: string; email: string; company: string; role: string; status: "Ativo" | "Inativo"; }

const mockCompanies: Company[] = [
  { id: 1, name: "Salsa Digital", plan: "Enterprise", members: 12, createdAt: "Jan 2024", status: "Ativa" },
  { id: 2, name: "Agencia Parceira X", plan: "Pro", members: 6, createdAt: "Feb 2024", status: "Ativa" },
  { id: 3, name: "StartupY", plan: "Basic", members: 3, createdAt: "Mar 2024", status: "Inativa" },
];

const mockRequests: UserRequest[] = [
  { id: 1, name: "Joao Santos", email: "joao@empresa.com", company: "TechCorp", requestedRole: "CEO", requestedAt: "30 Mar 2026", status: "Pendente" },
  { id: 2, name: "Fernanda Lima", email: "fernanda@startup.com", company: "StartupY", requestedRole: "CFO", requestedAt: "29 Mar 2026", status: "Pendente" },
  { id: 3, name: "Ricardo Mendes", email: "ricardo@agencia.com", company: "Agencia Parceira X", requestedRole: "CMO", requestedAt: "28 Mar 2026", status: "Aprovado" },
];

const mockUsers: AdminUser[] = [
  { id: 1, name: "Andre Pereira", email: "andre@salsahub.com", company: "Salsa Digital", role: "CEO", status: "Ativo" },
  { id: 2, name: "Mariana Silva", email: "mariana@salsahub.com", company: "Salsa Digital", role: "CMO", status: "Ativo" },
  { id: 3, name: "Carlos Mendes", email: "carlos@agencia.com", company: "Agencia Parceira X", role: "COO", status: "Ativo" },
  { id: 4, name: "Ana Costa", email: "ana@salsahub.com", company: "Salsa Digital", role: "Gerente", status: "Ativo" },
];

const roles = ["CEO", "CFO", "CMO", "COO", "Gerente", "Coordenador", "Analista", "Tecnico", "Assistente"];

const getRoleBadgeColor = (role: string) => {
  if (["CEO", "CFO", "CMO", "COO"].includes(role)) return "bg-primary/20 text-primary";
  if (["Gerente", "Coordenador"].includes(role)) return "bg-purple-500/20 text-purple-400";
  return "bg-blue-500/20 text-blue-400";
};

export default function AdminPanel() {
  const [requests, setRequests] = useState<UserRequest[]>(mockRequests);
  const [newCompany, setNewCompany] = useState({ name: "", plan: "Pro" });
  const pendingCount = requests.filter(r => r.status === "Pendente").length;

  const handleApprove = (id: number) => setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "Aprovado" } : r));
  const handleReject = (id: number) => setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "Rejeitado" } : r));

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-sans">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">Gerencie empresas, usuarios e cargos</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Empresas", value: mockCompanies.length, color: "text-foreground" },
            { label: "Usuarios", value: mockUsers.length, color: "text-foreground" },
            { label: "Solicitacoes", value: pendingCount, color: "text-primary" },
            { label: "Planos Ativos", value: mockCompanies.filter(c => c.status === "Ativa").length, color: "text-foreground" },
          ].map(s => (
            <div key={s.label} className="bg-surface-low rounded-3xl p-4 border border-surface-mid">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={"text-2xl font-bold " + s.color}>{s.value}</p>
            </div>
          ))}
        </div>
        <Tabs defaultValue="requests" className="w-full">
          <div className="grid grid-cols-3 gap-2 mb-6">
            <TabsList asChild>
              <div className="contents">
                <TabsTrigger value="requests" className="bg-surface-low border border-surface-mid rounded-2xl py-3 data-[state=active]:bg-primary data-[state=active]:text-background data-[state=active]:border-primary flex items-center gap-2 justify-center">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm font-medium">Solicitacoes</span>
                  {pendingCount > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">{pendingCount}</span>}
                </TabsTrigger>
                <TabsTrigger value="companies" className="bg-surface-low border border-surface-mid rounded-2xl py-3 data-[state=active]:bg-primary data-[state=active]:text-background data-[state=active]:border-primary flex items-center gap-2 justify-center">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Empresas</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="bg-surface-low border border-surface-mid rounded-2xl py-3 data-[state=active]:bg-primary data-[state=active]:text-background data-[state=active]:border-primary flex items-center gap-2 justify-center">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Usuarios</span>
                </TabsTrigger>
              </div>
            </TabsList>
          </div>

          <TabsContent value="requests" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Solicitacoes via Email</h3>
              <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">{pendingCount} pendentes</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Cargos como CEO, CFO, CMO e COO sao criados exclusivamente por solicitacao via email ao administrador.</p>
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
                      <p className="text-xs text-muted-foreground">{req.email} - {req.company} - {req.requestedAt}</p>
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
                    <Input placeholder="Nome da empresa" value={newCompany.name} onChange={e => setNewCompany(p => ({...p, name: e.target.value}))} className="bg-surface-mid border-0 rounded-xl text-sm" />
                    <select value={newCompany.plan} onChange={e => setNewCompany(p => ({...p, plan: e.target.value}))} className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                      <option>Basic</option><option>Pro</option><option>Enterprise</option>
                    </select>
                    <Button className="w-full rounded-xl bg-primary hover:bg-primary/80">Criar Empresa</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-3">
              {mockCompanies.map(company => (
                <div key={company.id} className="bg-surface-low rounded-2xl p-4 border border-surface-mid hover:bg-surface-mid transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5 text-primary" /></div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.members} membros - Plano {company.plan} - {company.createdAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <Badge className={"text-xs " + (company.status === "Ativa" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400")}>{company.status}</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Edit2 className="w-4 h-4 text-muted-foreground" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <h3 className="font-semibold text-foreground mb-2">Gerenciar Usuarios e Cargos</h3>
            <p className="text-xs text-muted-foreground mb-4">Cargos C-Level so podem ser atribuidos apos aprovacao de solicitacao por email.</p>
            <div className="space-y-3">
              {mockUsers.map(user => (
                <div key={user.id} className="bg-surface-low rounded-2xl p-4 border border-surface-mid">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-xs flex-shrink-0">
                        {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email} - {user.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={"text-xs " + getRoleBadgeColor(user.role)}>{user.role}</Badge>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Edit2 className="w-4 h-4 text-muted-foreground" /></Button>
                        </DialogTrigger>
                        <DialogContent className="bg-surface-low border-surface-mid">
                          <DialogHeader><DialogTitle>Editar Cargo - {user.name}</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            <select defaultValue={user.role} className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                              {roles.map(r => <option key={r}>{r}</option>)}
                            </select>
                            <select defaultValue={user.company} className="w-full bg-surface-mid border-0 rounded-xl p-2 text-foreground text-sm">
                              {mockCompanies.map(c => <option key={c.id}>{c.name}</option>)}
                            </select>
                            <p className="text-xs text-yellow-400 bg-yellow-500/10 rounded-xl p-3">Cargos C-Level so podem ser atribuidos apos aprovacao de solicitacao via email.</p>
                            <Button className="w-full rounded-xl bg-primary hover:bg-primary/80">Salvar</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
