import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center px-4 md:px-6 shrink-0">
            <SidebarTrigger className="hidden md:flex text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <div className="md:hidden flex items-center gap-2">
              <img src="/parsley.png" alt="Salsa Hub" className="w-7 h-7" />
              <span className="font-bold text-foreground">Salsa Hub</span>
            </div>
          </header>
          <main className="flex-1 overflow-auto pb-20 md:pb-0 px-4 md:px-6">
            <Outlet />
          </main>
        </div>
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
