import { useState } from "react";
import { Search, Phone, Mail, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";

const teamMembers = [
  { name: "Ana Silva", role: "UI/UX Designer", email: "ana@salsahub.com", phone: "+55 11 99999-0001", projects: ["App Salsa Delivery", "Loja Salsa Store"], department: "Design" },
  { name: "Carlos Lima", role: "Full-Stack Developer", email: "carlos@salsahub.com", phone: "+55 11 99999-0002", projects: ["App Salsa Delivery", "Landing Salsa Pro"], department: "Engenharia" },
  { name: "Maria Costa", role: "Product Manager", email: "maria@salsahub.com", phone: "+55 11 99999-0003", projects: ["Curso Marketing Digital", "App Gestão Interna"], department: "Produto" },
  { name: "Pedro Santos", role: "Project Manager", email: "pedro@salsahub.com", phone: "+55 11 99999-0004", projects: ["App Salsa Delivery", "App Gestão Interna"], department: "Produto" },
  { name: "João Oliveira", role: "Marketing Specialist", email: "joao@salsahub.com", phone: "+55 11 99999-0005", projects: ["Loja Salsa Store", "Ebook Vendas Online"], department: "Marketing" },
  { name: "Luana Ferreira", role: "Content Creator", email: "luana@salsahub.com", phone: "+55 11 99999-0006", projects: ["Curso Marketing Digital"], department: "Marketing" },
  { name: "Rafael Mendes", role: "Backend Developer", email: "rafael@salsahub.com", phone: "+55 11 99999-0007", projects: ["App Salsa Delivery"], department: "Engenharia" },
  { name: "Beatriz Nunes", role: "Data Analyst", email: "beatriz@salsahub.com", phone: "+55 11 99999-0008", projects: ["Loja Salsa Store"], department: "Dados" },
];

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("Todos");

  const departments = ["Todos", ...Array.from(new Set(teamMembers.map(m => m.department)))];

  const filtered = teamMembers.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.role.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "Todos" || m.department === deptFilter;
    return matchSearch && matchDept;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      <h1 className="text-2xl font-bold">Equipe</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar membro..."
            className="pl-9 bg-surface-low border-0 rounded-xl"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {departments.map(d => (
            <button
              key={d}
              onClick={() => setDeptFilter(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                deptFilter === d ? "bg-primary text-primary-foreground" : "bg-surface-low text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(m => (
          <div key={m.name} className="bg-surface-low rounded-3xl p-6 space-y-4 hover:bg-surface-mid transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold">
                {m.name.split(" ").map(n => n[0]).join("")}
              </span>
              <div>
                <h3 className="font-semibold">{m.name}</h3>
                <p className="text-xs text-muted-foreground">{m.role}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="truncate">{m.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{m.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="w-4 h-4" />
                <span>{m.department}</span>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              {m.projects.map(p => (
                <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
