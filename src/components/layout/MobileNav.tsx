import { Home, MessageCircle, Package, Users, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function MobileNav() {
  const location = useLocation();
  const isActive = (url: string) =>
    url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface-low/95 backdrop-blur-lg md:hidden border-t border-surface-mid"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-16 px-2">

        {/* Produtos */}
        <Link
          to="/products"
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-colors min-w-[48px] ${
            isActive("/products") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] font-medium">Produtos</span>
        </Link>

        {/* Chat */}
        <Link
          to="/chat"
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-colors min-w-[48px] ${
            isActive("/chat") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-[10px] font-medium">Chat</span>
        </Link>

        {/* Center Home Button — stays inside the nav bar */}
        <Link
          to="/"
          className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/30 transition-transform active:scale-95 flex-shrink-0"
        >
          <img src="/parsley.png" alt="SalsaHub" className="w-7 h-7 object-contain" />
        </Link>

        {/* Equipe */}
        <Link
          to="/team"
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-colors min-w-[48px] ${
            isActive("/team") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">Equipe</span>
        </Link>

        {/* Perfil */}
        <Link
          to="/profile"
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-colors min-w-[48px] ${
            isActive("/profile") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Perfil</span>
        </Link>

      </div>
    </nav>
  );
}
