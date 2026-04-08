import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Package, Megaphone, CalendarDays, Users,
  MessageCircle, User, ChevronLeft, ListTodo, Shield,
} from "lucide-react";
import { Link } from "react-router-dom";
import { auth } from "@/integrations/firebase/client";

const OWNER_EMAIL = "kirchner.andre@gmail.com";

const navItems = [
  { title: "Dashboard",  url: "/",          icon: LayoutDashboard },
  { title: "Chat",       url: "/chat",       icon: MessageCircle },
  { title: "Produtos",   url: "/products",   icon: Package },
  { title: "Tarefas",    url: "/tasks",      icon: ListTodo },
  { title: "Marketing",  url: "/marketing",  icon: Megaphone },
  { title: "Calendário", url: "/calendar",   icon: CalendarDays },
  { title: "Equipe",     url: "/team",       icon: Users },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const isOwner = auth.currentUser?.email === OWNER_EMAIL;

  return (
    <Sidebar className="bg-surface-low border-r border-surface-mid">
      <SidebarHeader className="border-b border-surface-mid">
        <div className="flex items-center justify-between px-2 py-4">
          <Link to="/" className="flex items-center gap-2 font-sans font-bold text-lg text-primary hover:opacity-80">
            <img src="/parsley.png" alt="SalsaHub" className="w-6 h-6" />
            {state === "expanded" && "SalsaHub"}
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <nav className="space-y-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.url}
                to={item.url}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-surface-mid hover:text-foreground transition-colors"
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {state === "expanded" && <span className="text-sm font-medium">{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </SidebarContent>

      <SidebarFooter className="border-t border-surface-mid space-y-1 pb-2">
        {/* Admin button — only for owner */}
        {isOwner && (
          <Link
            to="/admin"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-primary hover:bg-primary/10 transition-colors"
            title="Área Administrativa"
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {state === "expanded" && (
              <span className="text-sm font-semibold">Admin</span>
            )}
          </Link>
        )}

        {/* Profile */}
        <Link
          to="/profile"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-surface-mid hover:text-foreground transition-colors"
        >
          <User className="w-5 h-5 flex-shrink-0" />
          {state === "expanded" && <span className="text-sm font-medium">Perfil</span>}
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
