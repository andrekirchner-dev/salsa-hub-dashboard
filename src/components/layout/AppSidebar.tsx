import {
  LayoutDashboard, Package, Megaphone, CalendarDays,
  Users, MessageCircle, Bell, User, ChevronLeft,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Produtos", url: "/products", icon: Package },
  { title: "Marketing", url: "/marketing", icon: Megaphone },
  { title: "Calendário", url: "/calendar", icon: CalendarDays },
  { title: "Equipe", url: "/contacts", icon: Users },
  { title: "Chat", url: "/chat", icon: MessageCircle },
  { title: "Notificações", url: "/notifications", icon: Bell },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex items-center gap-3 px-4 py-5">
        <img src="/parsley.png" alt="Salsa Hub" className="w-8 h-8" />
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-foreground">
            Salsa Hub
          </span>
        )}
        {!collapsed && (
          <button onClick={toggleSidebar} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="rounded-xl h-10">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-surface-mid transition-colors"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="rounded-xl h-10">
              <NavLink
                to="/profile"
                className="hover:bg-surface-mid transition-colors"
                activeClassName="bg-primary/10 text-primary font-semibold"
              >
                <User className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="ml-3">Perfil</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
