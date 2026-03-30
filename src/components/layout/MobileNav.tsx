import { LayoutDashboard, MessageCircle, Package, Users, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const items = [
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Chat", url: "/chat", icon: MessageCircle },
  { title: "Produtos", url: "/products", icon: Package },
  { title: "Equipe", url: "/contacts", icon: Users },
  { title: "Perfil", url: "/profile", icon: User },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-low/95 backdrop-blur-lg md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/"}
            className="flex flex-col items-center gap-1 text-muted-foreground transition-colors px-3 py-1"
            activeClassName="text-primary"
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
