import { useState, useEffect } from "react";
import { Search, Phone, Mail, Briefcase, Plus, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { auth, db } from "@/integrations/firebase/client";
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";

interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  department: string;
}

export default function Contacts() {
  const uid = auth.currentUser?.uid ?? "";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("Todos");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: "", role: "", email: "", phone: "", department: "" });

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "contacts"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Contact)));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const departments = ["Todos", ...Array.from(new Set(contacts.map(m => m.department).filter(Boolean)))];

  const filtered = contacts.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || (m.role ?? "").toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "Todos" || m.department === deptFilter;
    return matchSearch && matchDept;
  });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await addDoc(collection(db, "users", uid, "contacts"), {
      ...form,
      createdAt: serverTimestamp(),
    });
    setForm({ name: "", role: "", email: "", phone: "", department: "" });
    setSaving(false);
    setAddOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Equipe</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
              <UserPlus className="w-4 h-4 mr-2" />Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-surface-low border-surface-mid">
            <DialogHeader><DialogTitle>Adicionar Contato</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nome completo *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
              <Input placeholder="Cargo (ex: Designer)" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
              <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
              <Input placeholder="Telefone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
              <Input placeholder="Departamento (ex: Design)" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} className="bg-surface-mid border-0 rounded-xl text-sm" />
              <Button className="w-full rounded-xl bg-primary hover:bg-primary/80" onClick={handleAdd} disabled={saving || !form.name.trim()}>
                {saving ? "Salvando..." : "Adicionar Contato"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar membro..." className="pl-9 bg-surface-low border-0 rounded-xl" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {departments.map(d => (
            <button
              key={d}
              onClick={() => setDeptFilter(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${deptFilter === d ? "bg-primary text-primary-foreground" : "bg-surface-low text-muted-foreground hover:text-foreground"}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando contatos...</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Plus className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-foreground mb-1">Nenhum contato ainda</p>
          <p className="text-xs mb-4">Adicione os membros da sua equipe.</p>
          <Button onClick={() => setAddOpen(true)} className="rounded-2xl bg-primary hover:bg-primary/80 text-background">
            <UserPlus className="w-4 h-4 mr-2" />Adicionar Contato
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => (
            <div key={m.id} className="bg-surface-low rounded-3xl p-6 space-y-4 hover:bg-surface-mid transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold">
                  {m.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <h3 className="font-semibold">{m.name}</h3>
                  <p className="text-xs text-muted-foreground">{m.role}</p>
                </div>
              </div>
              <div className="space-y-2">
                {m.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{m.email}</span>
                  </div>
                )}
                {m.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{m.phone}</span>
                  </div>
                )}
                {m.department && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="w-4 h-4 flex-shrink-0" />
                    <span>{m.department}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && contacts.length > 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhum resultado para "{search}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
