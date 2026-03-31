import { LayoutDashboard, MessageCircle, Package, Users, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const items = [
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Chat", url: "/chat", icon: MessageCircle },
  { title: "Produtos", url: "/products", icon: Package },
  { title: "Equipe", url: "/team", icon: Users },
  { title: "Perfil", url: "/profile", icon: User },
];

export function MobileNav() {
  const location = useLocation();
  const isActive = (url: string) =>
    url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-low/95 backdrop-blur-lg md:hidden border-t border-surface-mid"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const active = isActive(item.url);
          return (
            <Link
              key={item.url}
              to={item.url}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
